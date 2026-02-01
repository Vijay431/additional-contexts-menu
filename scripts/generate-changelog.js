const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf-8', ...options }).trim();
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return '';
  }
}

function getPreviousTag(currentTag) {
  const previousTag = exec(`git describe --tags --abbrev=0 ${currentTag}^`);
  return previousTag || '';
}

function getCommitsBetweenTags(fromTag, toTag) {
  const range = fromTag ? `${fromTag}..${toTag}` : toTag;
  const commits = exec(`git log ${range} --pretty=format:"%h|%s|%an"`);
  return commits ? commits.split('\n') : [];
}

function parseCommit(commit) {
  const [hash, message, author] = commit.split('|');

  const typeMatch = message.match(/^(\w+)(!)?:(.*)/);
  if (typeMatch) {
    const [, type, breaking, title] = typeMatch;
    return { hash, type: type.toLowerCase(), breaking: !!breaking, title: title.trim(), author };
  }

  return { hash, type: 'other', title: message.trim(), author };
}

function groupCommitsByType(commits) {
  const groups = {
    feat: [],
    fix: [],
    chore: [],
    docs: [],
    refactor: [],
    test: [],
    style: [],
    perf: [],
    ci: [],
    build: [],
    revert: [],
    other: [],
  };

  for (const commit of commits) {
    const parsed = parseCommit(commit);
    if (groups[parsed.type]) {
      groups[parsed.type].push(parsed);
    } else {
      groups.other.push(parsed);
    }
  }

  return groups;
}

function generateMarkdown(groups, version, previousTag) {
  const sections = [];

  sections.push(`## Release ${version}`);
  sections.push('');

  if (previousTag) {
    sections.push(
      `*Full changelog:* https://github.com/Vijay431/additional-contexts-menu/compare/${previousTag}...v${version}`,
    );
    sections.push('');
  }

  const typeLabels = {
    feat: '### 🎉 Features',
    fix: '### 🐛 Bug Fixes',
    chore: '### 🔧 Chores',
    docs: '### 📚 Documentation',
    refactor: '### ♻️ Refactoring',
    test: '### ✅ Tests',
    style: '### 💄 Styles',
    perf: '### ⚡ Performance',
    ci: '### 👷 Continuous Integration',
    build: '### 📦 Build',
    revert: '### ⏪ Reverts',
    other: '### 📝 Other Changes',
  };

  const typeEmoji = {
    feat: '✨',
    fix: '🐛',
    chore: '🔧',
    docs: '📚',
    refactor: '♻️',
    test: '✅',
    style: '💄',
    perf: '⚡',
    ci: '👷',
    build: '📦',
    revert: '⏪',
    other: '📝',
  };

  let hasContent = false;

  for (const [type, commits] of Object.entries(groups)) {
    if (commits.length === 0) continue;

    hasContent = true;
    sections.push(typeLabels[type] || `### ${type.toUpperCase()}`);
    sections.push('');

    for (const commit of commits) {
      const icon = typeEmoji[type] || '•';
      const breakingNote = commit.breaking ? ' ⚠️ **BREAKING**' : '';
      sections.push(`- ${icon} ${commit.title} (${commit.hash})${breakingNote}`);
    }

    sections.push('');
  }

  if (!hasContent) {
    sections.push('No changes in this release.');
    sections.push('');
  }

  return sections.join('\n');
}

function main() {
  const currentTag = process.argv[2];

  if (!currentTag) {
    console.error('Usage: node generate-changelog.js <tag>');
    console.error('Example: node generate-changelog.js v2.1.0');
    process.exit(1);
  }

  console.log(`Generating changelog for tag: ${currentTag}`);

  const previousTag = getPreviousTag(currentTag);
  console.log(`Previous tag: ${previousTag || 'None (first release)'}`);

  const commits = getCommitsBetweenTags(previousTag, currentTag);
  console.log(`Found ${commits.length} commits`);

  const groups = groupCommitsByType(commits);

  const version = currentTag.startsWith('v') ? currentTag.slice(1) : currentTag;
  const markdown = generateMarkdown(groups, version, previousTag);

  console.log('\n' + '='.repeat(80));
  console.log('GENERATED CHANGELOG');
  console.log('='.repeat(80) + '\n');
  console.log(markdown);

  const outputFile = path.join(process.cwd(), 'CHANGELOG_RELEASE.md');
  fs.writeFileSync(outputFile, markdown);
  console.log(`\nChangelog saved to: ${outputFile}`);
}

main();

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf-8', ...options }).trim();
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return '';
  }
}

function getPreviousTag(currentTag) {
  const previousTag = exec(`git describe --tags --abbrev=0 ${currentTag}^`);
  return previousTag || '';
}

function getCommitsBetweenTags(fromTag, toTag) {
  const range = fromTag ? `${fromTag}..${toTag}` : toTag;
  const commits = exec(`git log ${range} --pretty=format:"%h|%s|%an"`);
  return commits ? commits.split('\n') : [];
}

function parseCommit(commit) {
  const [hash, message, author] = commit.split('|');

  const typeMatch = message.match(/^(\w+)(!)?:(.*)/);
  if (typeMatch) {
    const [, type, breaking, title] = typeMatch;
    return { hash, type: type.toLowerCase(), breaking: !!breaking, title: title.trim(), author };
  }

  return { hash, type: 'other', title: message.trim(), author };
}

function groupCommitsByType(commits) {
  const groups = {
    feat: [],
    fix: [],
    chore: [],
    docs: [],
    refactor: [],
    test: [],
    style: [],
    perf: [],
    ci: [],
    build: [],
    revert: [],
    other: [],
  };

  commits.forEach((commit) => {
    const parsed = parseCommit(commit);
    if (groups[parsed.type]) {
      groups[parsed.type].push(parsed);
    } else {
      groups.other.push(parsed);
    }
  });

  return groups;
}

function generateMarkdown(groups, version, previousTag) {
  const sections = [];

  sections.push(`## Release ${version}`);
  sections.push('');

  if (previousTag) {
    sections.push(
      `*Full changelog:* https://github.com/Vijay431/additional-contexts-menu/compare/${previousTag}...v${version}`,
    );
    sections.push('');
  }

  const typeLabels = {
    feat: '### 🎉 Features',
    fix: '### 🐛 Bug Fixes',
    chore: '### 🔧 Chores',
    docs: '### 📚 Documentation',
    refactor: '### ♻️ Refactoring',
    test: '### ✅ Tests',
    style: '### 💄 Styles',
    perf: '### ⚡ Performance',
    ci: '### 👷 Continuous Integration',
    build: '### 📦 Build',
    revert: '### ⏪ Reverts',
    other: '### 📝 Other Changes',
  };

  const typeEmoji = {
    feat: '✨',
    fix: '🐛',
    chore: '🔧',
    docs: '📚',
    refactor: '♻️',
    test: '✅',
    style: '💄',
    perf: '⚡',
    ci: '👷',
    build: '📦',
    revert: '⏪',
    other: '📝',
  };

  let hasContent = false;

  Object.entries(groups).forEach(([type, commits]) => {
    if (commits.length === 0) return;

    hasContent = true;
    sections.push(typeLabels[type] || `### ${type.toUpperCase()}`);
    sections.push('');

    commits.forEach((commit) => {
      const icon = typeEmoji[type] || '•';
      const breakingNote = commit.breaking ? ' ⚠️ **BREAKING**' : '';
      sections.push(`- ${icon} ${commit.title} (${commit.hash})${breakingNote}`);
    });

    sections.push('');
  });

  if (!hasContent) {
    sections.push('No changes in this release.');
    sections.push('');
  }

  return sections.join('\n');
}

function main() {
  const currentTag = process.argv[2];

  if (!currentTag) {
    console.error('Usage: node generate-changelog.js <tag>');
    console.error('Example: node generate-changelog.js v2.1.0');
    process.exit(1);
  }

  console.log(`Generating changelog for tag: ${currentTag}`);

  const previousTag = getPreviousTag(currentTag);
  console.log(`Previous tag: ${previousTag || 'None (first release)'}`);

  const commits = getCommitsBetweenTags(previousTag, currentTag);
  console.log(`Found ${commits.length} commits`);

  const groups = groupCommitsByType(commits);

  const version = currentTag.startsWith('v') ? currentTag.slice(1) : currentTag;
  const markdown = generateMarkdown(groups, version, previousTag);

  console.log('\n' + '='.repeat(80));
  console.log('GENERATED CHANGELOG');
  console.log('='.repeat(80) + '\n');
  console.log(markdown);

  const outputFile = path.join(process.cwd(), 'CHANGELOG_RELEASE.md');
  fs.writeFileSync(outputFile, markdown);
  console.log(`\nChangelog saved to: ${outputFile}`);
}

main();
