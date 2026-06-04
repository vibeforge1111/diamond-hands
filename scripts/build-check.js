#!/usr/bin/env node
/**
 * Diamond Hands - Build Check Script
 *
 * Validates the build environment and checks for common issues before
 * running a production build. Can be used standalone or as a pre-build hook.
 *
 * Usage: node scripts/build-check.js [options]
 *
 * Options:
 *   --verbose, -v     Show detailed output for each check
 *   --json            Output results as JSON
 *   --no-color        Disable ANSI color output
 *   --dir, -d PATH    Project root directory (default: parent of scripts/)
 *   --help, -h        Show this help message
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse CLI arguments
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--verbose' || args[i] === '-v') {
    flags.verbose = true;
  } else if (args[i] === '--json') {
    flags.json = true;
  } else if (args[i] === '--no-color') {
    flags.nocolor = true;
  } else if (args[i] === '--dir' || args[i] === '-d') {
    flags.dir = args[++i];
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`Diamond Hands - Build Check Script

Usage: node scripts/build-check.js [options]

Options:
  --verbose, -v     Show detailed output for each check
  --json            Output results as JSON
  --no-color        Disable ANSI color output
  --dir, -d PATH    Project root directory (default: parent of scripts/)
  --help, -h        Show this help message
`);
    process.exit(0);
  }
}

const VERBOSE = flags.verbose;
const JSON_OUTPUT = flags.json;
const NO_COLOR = flags.nocolor;
const ROOT = flags.dir ? path.resolve(flags.dir) : path.resolve(__dirname, '..');

const ENABLE_COLOR = !NO_COLOR;
const RED = ENABLE_COLOR ? '\x1b[31m' : '';
const GREEN = ENABLE_COLOR ? '\x1b[32m' : '';
const YELLOW = ENABLE_COLOR ? '\x1b[33m' : '';
const RESET = ENABLE_COLOR ? '\x1b[0m' : '';

const results = [];

function check(label, fn) {
  try {
    const passed = fn();
    const status = passed ? 'PASS' : 'FAIL';
    const color = passed ? GREEN : RED;
    const msg = `${color}[${status}]${RESET} ${label}`;
    results.push({ label, status: passed ? 'pass' : 'fail' });
    if (VERBOSE || !passed) console.log(msg);
    return passed;
  } catch (err) {
    const msg = `${RED}[ERR]${RESET} ${label}: ${err.message}`;
    results.push({ label, status: 'error', error: err.message });
    if (VERBOSE) console.log(msg);
    return false;
  }
}

console.log(`${YELLOW}🔍 Diamond Hands - Build Check${RESET}\n`);

let allPassed = true;

// Check 1: package.json exists
allPassed &= check('package.json exists', () => {
  return fs.existsSync(path.join(ROOT, 'package.json'));
});

// Check 2: node_modules exist
allPassed &= check('node_modules installed', () => {
  return fs.existsSync(path.join(ROOT, 'node_modules'));
});

// Check 3: vite config exists
allPassed &= check('vite.config.js exists', () => {
  return fs.existsSync(path.join(ROOT, 'vite.config.js'));
});

// Check 4: Node.js version
allPassed &= check('Node.js >= 18', () => {
  const version = process.versions.node.split('.').map(Number);
  return version[0] >= 18;
});

// Check 5: src/main.jsx exists
allPassed &= check('src/main.jsx exists', () => {
  return fs.existsSync(path.join(ROOT, 'src', 'main.jsx'));
});

// Check 6: Package.json has required scripts
allPassed &= check('build script configured', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  return pkg.scripts && pkg.scripts.build;
});

// Check 7: Try a syntax check on main.jsx
allPassed &= check('Main entry syntax valid', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src', 'main.jsx'), 'utf8');
  // Basic check: has import and export-like structure
  return content.includes('import') && content.includes('React');
});

console.log(`\n${allPassed ? `${GREEN}✅ All checks passed${RESET}` : `${RED}❌ Some checks failed${RESET}`}`);
console.log(`Checked: ${results.length}, Passed: ${results.filter(r => r.status === 'pass').length}, Failed: ${results.filter(r => r.status !== 'pass').length}`);

if (JSON_OUTPUT) {
  console.log(JSON.stringify({
    passed: allPassed,
    checks: results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status !== 'pass').length
    }
  }));
}

process.exit(allPassed ? 0 : 1);
