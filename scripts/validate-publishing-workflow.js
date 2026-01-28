#!/usr/bin/env node

/**
 * Publishing Workflow Validation Script
 *
 * This script validates the complete publishing workflow for the Additional Context Menus extension.
 * It checks all components required for dual publishing to VS Code Marketplace and Open VSX Registry,
 * as well as automatic GitHub release creation.
 *
 * Requirements: 1.1, 1.2, 6.1
 *
 * Usage:
 *   node scripts/validate-publishing-workflow.js [--full]
 *
 *   --full: Run full validation including registry API checks (requires internet)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EXTENSION_ID = 'VijayGangatharan.additional-context-menus';
const PUBLISHER = 'VijayGangatharan';
const EXTENSION_NAME = 'additional-context-menus';

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log(`═══════════════════════════════════════════════════════════`, 'cyan');
  log(`  ${title}`, 'cyan');
  log(`═══════════════════════════════════════════════════════════`, 'cyan');
}

function logResult(check, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${check}`, color);
  if (details) {
    log(`   ${details}`, 'reset');
  }
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Make HTTPS GET request
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      let data = '';
      response.on('data', (chunk) => (data += chunk));
      response.on('end', () => {
        try {
          resolve({ status: response.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: response.statusCode, data: data });
        }
      });
    });
    request.on('error', reject);
    request.setTimeout(15000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Validation results tracker
 */
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  checks: [],
};

function recordResult(name, passed, details = '') {
  results.checks.push({ name, passed, details });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
  logResult(name, passed, details);
}

function recordWarning(name, details = '') {
  results.warnings++;
  logWarning(`${name}: ${details}`);
}

// ============================================================================
// VALIDATION CHECKS
// ============================================================================

/**
 * 1. Validate package.json configuration
 */
function validatePackageJson() {
  logSection('1. Package.json Configuration');

  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) {
    recordResult('package.json exists', false, 'File not found');
    return null;
  }
  recordResult('package.json exists', true);

  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  // Required fields for both registries
  const requiredFields = [
    'name',
    'displayName',
    'description',
    'version',
    'publisher',
    'license',
    'repository',
    'icon',
  ];

  for (const field of requiredFields) {
    const hasField = pkg[field] !== undefined;
    recordResult(
      `Has required field: ${field}`,
      hasField,
      hasField
        ? `Value: ${typeof pkg[field] === 'object' ? JSON.stringify(pkg[field]).substring(0, 50) : pkg[field]}`
        : 'Missing',
    );
  }

  // Check publisher matches expected
  recordResult(
    'Publisher is correct',
    pkg.publisher === PUBLISHER,
    `Expected: ${PUBLISHER}, Got: ${pkg.publisher}`,
  );

  // Check license is MIT (compatible with Open VSX)
  recordResult('License is MIT', pkg.license === 'MIT', `License: ${pkg.license}`);

  // Check publishing scripts exist
  const hasPublishScript = pkg.scripts?.publish !== undefined;
  const hasMarketplaceScript = pkg.scripts?.['publish:marketplace'] !== undefined;
  const hasOvsxScript = pkg.scripts?.['publish:ovsx'] !== undefined;

  recordResult('Has publish script', hasPublishScript, pkg.scripts?.publish || 'Missing');
  recordResult(
    'Has publish:marketplace script',
    hasMarketplaceScript,
    pkg.scripts?.['publish:marketplace'] || 'Missing',
  );
  recordResult(
    'Has publish:ovsx script',
    hasOvsxScript,
    pkg.scripts?.['publish:ovsx'] || 'Missing',
  );

  // Check ovsx is in devDependencies
  const hasOvsx = pkg.devDependencies?.ovsx !== undefined;
  recordResult(
    'Has ovsx in devDependencies',
    hasOvsx,
    hasOvsx ? `Version: ${pkg.devDependencies.ovsx}` : 'Missing - run: npm install -D ovsx',
  );

  return pkg;
}

/**
 * 2. Validate CI/CD workflow configuration
 */
function validateWorkflow() {
  logSection('2. CI/CD Workflow Configuration');

  const workflowPath = path.join(process.cwd(), '.github/workflows/ci.yml');
  if (!fs.existsSync(workflowPath)) {
    recordResult('CI workflow exists', false, 'File not found at .github/workflows/ci.yml');
    return;
  }
  recordResult('CI workflow exists', true);

  const workflow = fs.readFileSync(workflowPath, 'utf8');

  // Check for Open VSX publishing step
  const hasOvsxPublish = workflow.includes('publish:ovsx') || workflow.includes('ovsx publish');
  recordResult('Workflow includes Open VSX publishing', hasOvsxPublish);

  // Check for marketplace publishing step
  const hasMarketplacePublish =
    workflow.includes('publish:marketplace') || workflow.includes('vsce publish');
  recordResult('Workflow includes Marketplace publishing', hasMarketplacePublish);

  // Check for OVSX_PAT secret usage
  const usesOvsxPat = workflow.includes('OVSX_PAT');
  recordResult('Workflow uses OVSX_PAT secret', usesOvsxPat);

  // Check for continue-on-error for Open VSX
  const hasContinueOnError = workflow.includes('continue-on-error: true');
  recordResult(
    'Has continue-on-error for graceful failure',
    hasContinueOnError,
    'Ensures marketplace publishing continues if Open VSX fails',
  );

  // Check for GitHub release creation
  const hasReleaseCreation =
    workflow.includes('gh release create') || workflow.includes('create-release');
  recordResult('Workflow creates GitHub releases', hasReleaseCreation);

  // Check for VSIX artifact upload
  const hasArtifactUpload = workflow.includes('upload-artifact');
  recordResult('Workflow uploads VSIX artifact', hasArtifactUpload);

  // Check for verification step
  const hasVerification = workflow.includes('verify-publications');
  recordResult('Workflow includes publication verification', hasVerification);
}

/**
 * 3. Validate publishing scripts
 */
function validatePublishingScripts() {
  logSection('3. Publishing Scripts');

  const scripts = [
    { name: 'publish-ovsx-with-retry.js', required: true },
    { name: 'manual-publish-ovsx.js', required: true },
    { name: 'verify-publications.js', required: true },
    { name: 'verify-auth.js', required: false },
  ];

  for (const script of scripts) {
    const scriptPath = path.join(process.cwd(), 'scripts', script.name);
    const exists = fs.existsSync(scriptPath);
    recordResult(
      `Script exists: ${script.name}`,
      exists || !script.required,
      exists ? 'Found' : script.required ? 'Missing (required)' : 'Missing (optional)',
    );
  }
}

/**
 * 4. Validate documentation
 */
function validateDocumentation() {
  logSection('4. Documentation');

  // Check README has Open VSX installation instructions
  const readmePath = path.join(process.cwd(), 'README.md');
  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, 'utf8');

    recordResult('README mentions Open VSX', readme.includes('Open VSX'));
    recordResult('README has VSCodium instructions', readme.includes('VSCodium'));
    recordResult('README has Gitpod instructions', readme.includes('Gitpod'));
    recordResult('README has Open VSX badge', readme.includes('open-vsx.org'));
  } else {
    recordResult('README.md exists', false);
  }

  // Check CONTRIBUTING.md has dual publishing docs
  const contributingPath = path.join(process.cwd(), 'CONTRIBUTING.md');
  if (fs.existsSync(contributingPath)) {
    const contributing = fs.readFileSync(contributingPath, 'utf8');

    recordResult(
      'CONTRIBUTING mentions dual publishing',
      contributing.includes('Dual Publishing') || contributing.includes('Open VSX'),
    );
    recordResult(
      'CONTRIBUTING has troubleshooting section',
      contributing.includes('Troubleshooting'),
    );
  } else {
    recordResult('CONTRIBUTING.md exists', false);
  }

  // Check Open VSX setup guide exists
  const setupGuidePath = path.join(process.cwd(), 'docs/open-vsx-setup.md');
  recordResult('Open VSX setup guide exists', fs.existsSync(setupGuidePath));
}

/**
 * 5. Validate local environment
 */
function validateLocalEnvironment() {
  logSection('5. Local Environment');

  // Check Node.js version
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    recordResult('Node.js version', majorVersion >= 16, `Version: ${nodeVersion}`);
  } catch {
    recordResult('Node.js installed', false);
  }

  // Check npm version
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    recordResult('npm installed', true, `Version: ${npmVersion}`);
  } catch {
    recordResult('npm installed', false);
  }

  // Check if vsce is available
  try {
    execSync('npx vsce --version', { encoding: 'utf8', stdio: 'pipe' });
    recordResult('vsce CLI available', true);
  } catch {
    recordResult('vsce CLI available', false, 'Run: npm install');
  }

  // Check if ovsx is available
  try {
    execSync('npx ovsx --version', { encoding: 'utf8', stdio: 'pipe' });
    recordResult('ovsx CLI available', true);
  } catch {
    recordResult('ovsx CLI available', false, 'Run: npm install');
  }

  // Check OVSX_PAT environment variable (for local testing)
  const hasOvsxPat = process.env.OVSX_PAT !== undefined;
  if (hasOvsxPat) {
    recordResult('OVSX_PAT environment variable set', true, 'Token available for local testing');
  } else {
    recordWarning('OVSX_PAT not set', 'Set for local testing: export OVSX_PAT=your_token');
  }
}

/**
 * 6. Check Open VSX Registry (requires internet)
 */
async function checkOpenVSXRegistry(pkg) {
  logSection('6. Open VSX Registry Status');

  try {
    const url = `https://open-vsx.org/api/${PUBLISHER}/${EXTENSION_NAME}`;
    logInfo(`Checking: ${url}`);

    const response = await httpsGet(url);

    if (response.status === 200) {
      const ext = response.data;
      recordResult('Extension found on Open VSX', true, `Version: ${ext.version}`);

      // Compare versions
      if (pkg && ext.version === pkg.version) {
        recordResult('Version matches package.json', true, `Both: ${ext.version}`);
      } else if (pkg) {
        recordWarning('Version mismatch', `Open VSX: ${ext.version}, package.json: ${pkg.version}`);
      }

      // Check metadata
      recordResult('Has display name', !!ext.displayName, ext.displayName);
      recordResult('Has description', !!ext.description, ext.description?.substring(0, 50) + '...');

      logInfo(`Open VSX URL: https://open-vsx.org/extension/${PUBLISHER}/${EXTENSION_NAME}`);
    } else if (response.status === 404) {
      // Not yet published is OK for initial setup - just a warning
      logWarning('Extension not yet published to Open VSX');
      logInfo('This is expected if this is the first publish.');
      logInfo('Run the CI/CD pipeline or manually publish using: npm run publish:ovsx');
      recordWarning('Open VSX publication pending', 'Extension will be published on next release');
    } else {
      recordResult('Open VSX API accessible', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    recordResult('Open VSX Registry check', false, error.message);
  }
}

/**
 * 7. Check GitHub Releases
 */
async function checkGitHubReleases(pkg) {
  logSection('7. GitHub Releases Status');

  try {
    // Get repository info from package.json
    const repoUrl = pkg?.repository?.url || '';
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);

    if (!match) {
      recordResult('Repository URL valid', false, 'Could not parse GitHub repo from package.json');
      return;
    }

    const [, owner, repo] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

    logInfo(`Checking: ${apiUrl}`);

    const response = await httpsGet(apiUrl);

    if (response.status === 200) {
      const release = response.data;
      recordResult('GitHub releases exist', true, `Latest: ${release.tag_name}`);

      // Check if VSIX is attached
      const hasVsix = release.assets?.some((a) => a.name.endsWith('.vsix'));
      recordResult(
        'VSIX attached to release',
        hasVsix,
        hasVsix ? 'VSIX file available for download' : 'No VSIX file attached',
      );

      logInfo(`Release URL: ${release.html_url}`);
    } else if (response.status === 404) {
      logWarning('No GitHub releases found yet');
      logInfo('GitHub releases will be created automatically when publishing to master branch.');
      recordWarning('GitHub releases pending', 'Will be created on first publish to master');
    } else if (response.status === 403) {
      // Rate limiting is common for unauthenticated requests
      logWarning('GitHub API rate limited (403)');
      logInfo(
        'This is normal for unauthenticated requests. Releases will work in CI with GITHUB_TOKEN.',
      );
      recordWarning('GitHub API rate limited', 'Check releases manually or authenticate');
    } else {
      recordResult('GitHub API accessible', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    recordResult('GitHub releases check', false, error.message);
  }
}

/**
 * Print final summary
 */
function printSummary() {
  logSection('VALIDATION SUMMARY');

  const total = results.passed + results.failed;
  const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;

  log(`Total Checks: ${total}`, 'cyan');
  log(`  ✅ Passed: ${results.passed}`, 'green');
  log(`  ❌ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`  ⚠️  Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'green');
  log(`  Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : passRate >= 60 ? 'yellow' : 'red');

  console.log('');

  if (results.failed === 0) {
    log('🎉 All validation checks passed!', 'green');
    log('The publishing workflow is properly configured.', 'green');
  } else {
    log('⚠️  Some validation checks failed.', 'yellow');
    log('Please review the failed checks above and fix any issues.', 'yellow');
  }

  console.log('');
  log('Next Steps:', 'cyan');
  log('1. If all checks pass, the workflow is ready for publishing', 'reset');
  log('2. Push to master branch to trigger automatic dual publishing', 'reset');
  log('3. Verify extension appears on both registries after publishing', 'reset');
  log('4. Test installation in VSCodium/Gitpod to confirm functionality', 'reset');
}

/**
 * Main validation function
 */
async function main() {
  const fullValidation = process.argv.includes('--full');

  log('🔍 Publishing Workflow Validation', 'cyan');
  log('================================', 'cyan');
  log(`Mode: ${fullValidation ? 'Full (includes registry checks)' : 'Basic'}`, 'blue');

  // Run all validations
  const pkg = validatePackageJson();
  validateWorkflow();
  validatePublishingScripts();
  validateDocumentation();
  validateLocalEnvironment();

  // Registry checks (require internet)
  if (fullValidation) {
    await checkOpenVSXRegistry(pkg);
    await checkGitHubReleases(pkg);
  } else {
    logSection('6-7. Registry Checks (Skipped)');
    logInfo('Run with --full flag to check Open VSX and GitHub registries');
  }

  // Print summary
  printSummary();

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run validation
main().catch((error) => {
  console.error('Validation failed with error:', error);
  process.exit(1);
});
