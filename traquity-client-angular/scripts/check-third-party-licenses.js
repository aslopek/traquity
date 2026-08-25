/**
 * Validates dist/traquity/browser/assets/third-party-licenses.json (see generate-third-party-licenses.js) against
 * an allowlist of permissive SPDX license ids. Run via `npm run licenses:check`, after `npm run build`.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const licensesPath = path.join(projectRoot, 'dist', 'traquity', 'browser', 'assets', 'third-party-licenses.json');

/**
 * Contains SPDX license identifiers
 * @type {string[]}
 */
const ALLOWED_LICENSES = [
  'MIT',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'Unlicense',
  'OFL-1.1',
];

/**
 * SPDX license identifier expressions, each a choice of licenses where every option is itself in ALLOWED_LICENSES.
 * @type {string[]}
 */
const ALLOWED_EXPRESSIONS = [
  '(BSD-2-Clause OR MIT OR Apache-2.0)',
  '(MIT OR CC0-1.0)'
];

function fail(message) {
  console.error(`[check-third-party-licenses] ${message}`);
  process.exit(1);
}

function isAllowed(license) {
  return ALLOWED_LICENSES.includes(license) || ALLOWED_EXPRESSIONS.includes(license);
}

function main() {
  if (!fs.existsSync(licensesPath)) {
    fail(`${licensesPath} not found — run "npm run build" first.`);
  }

  const {packages} = JSON.parse(fs.readFileSync(licensesPath, 'utf-8'));
  const offenders = packages
    .filter(entry => entry.source !== 'runtime-note')
    .filter(entry => !isAllowed(entry.license));

  if (offenders.length > 0) {
    console.error('[check-third-party-licenses] disallowed licenses found:');
    for (const entry of offenders) {
      console.error(`  ${entry.name}: ${entry.license}`);
    }
    process.exit(1);
  }

  console.log(`[check-third-party-licenses] all ${packages.length} packages have an allowed license.`);
}

main();
