const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf-8', ...options }).trim();
  } catch {
    return '';
  }
}

function getPreviousTag(currentTag) {
  return exec(`git describe --tags --abbrev=0 ${currentTag}^`) || '';
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
    feat: [], fix: [], chore: [], docs: [], refactor: [],
    test: [], style: [], perf: [], ci: [], build: [], revert: [], other: [],
  };
  for (const commit of commits) {
    const parsed = parseCommit(commit);
    (groups[parsed.type] ?? groups.other).push(parsed);
  }
  return groups;
}

function generateMarkdown(groups, version, previousTag) {
  const date = new Date().toISOString().slice(0, 10);
  const lines = [`## [${version}] - ${date}`, ''];

  if (previousTag) {
    lines.push(`*Full changelog:* https://github.com/Vijay431/additional-contexts-menu/compare/${previousTag}...v${version}`, '');
  }

  const typeLabels = {
    feat:     '### 🎉 Features',
    fix:      '### 🐛 Bug Fixes',
    chore:    '### 🔧 Chores',
    docs:     '### 📚 Documentation',
    refactor: '### ♻️ Refactoring',
    test:     '### ✅ Tests',
    style:    '### 💄 Styles',
    perf:     '### ⚡ Performance',
    ci:       '### 👷 CI',
    build:    '### 📦 Build',
    revert:   '### ⏪ Reverts',
    other:    '### 📝 Other Changes',
  };

  const typeEmoji = {
    feat: '✨', fix: '🐛', chore: '🔧', docs: '📚', refactor: '♻️',
    test: '✅', style: '💄', perf: '⚡', ci: '👷', build: '📦', revert: '⏪', other: '📝',
  };

  let hasContent = false;
  for (const [type, commits] of Object.entries(groups)) {
    if (commits.length === 0) continue;
    hasContent = true;
    lines.push(typeLabels[type] || `### ${type.toUpperCase()}`, '');
    for (const commit of commits) {
      const breaking = commit.breaking ? ' ⚠️ **BREAKING**' : '';
      lines.push(`- ${typeEmoji[type] || '•'} ${commit.title} (${commit.hash})${breaking}`);
    }
    lines.push('');
  }

  if (!hasContent) {
    lines.push('No changes in this release.', '');
  }

  return lines.join('\n');
}

function main() {
  const currentTag = process.argv[2];
  if (!currentTag) {
    console.error('Usage: node generate-changelog.js <tag>');
    process.exit(1);
  }

  const previousTag = getPreviousTag(currentTag);
  const commits = getCommitsBetweenTags(previousTag, currentTag);
  console.log(`Found ${commits.length} commits between ${previousTag || 'beginning'} and ${currentTag}`);

  const version = currentTag.startsWith('v') ? currentTag.slice(1) : currentTag;
  const markdown = generateMarkdown(groupCommitsByType(commits), version, previousTag);

  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  const existing = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf-8') : '';

  // Prepend after the header lines (title + keep-a-changelog lines)
  const headerEnd = existing.indexOf('\n## ');
  if (headerEnd !== -1) {
    const header = existing.slice(0, headerEnd);
    const rest = existing.slice(headerEnd);
    fs.writeFileSync(changelogPath, `${header}\n\n${markdown}\n${rest.trimStart()}`);
  } else {
    fs.writeFileSync(changelogPath, markdown + '\n' + existing);
  }

  console.log(`Changelog prepended to: ${changelogPath}`);
}

main();
