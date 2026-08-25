/**
 * Generates dist/traquity/browser/assets/third-party-licenses.json — the data source for the third-party section
 * of the About dialog.
 *
 * Sources (all automatic, no manually maintained lists):
 *  1. dist/traquity/3rdpartylicenses.txt — written by `ng build`; contains name, license id and the verbatim
 *     license text (incl. copyright header) of every package that actually ends up in the shipped Angular bundle.
 *  2. The Electron shell packages that are distributed outside the Angular bundle: the `electron` runtime itself, and
 *     every `dependencies` entry of package.json with its own production closure, optional dependencies included —
 *     the main process's own runtime closure, which electron-packager keeps in the package.
 *  3. Every package a stylesheet pulls in — angular.json's `styles` entries and the `@use`/`@import`/`url()`
 *     specifiers in src/. These reach the shipped app as *assets* (fonts, images) rather than as bundled
 *     JavaScript, which is why neither source above sees them: a font contributes nothing to a JS chunk, so it
 *     never appears in 3rdpartylicenses.txt, and it needs no `dependencies` entry to be built in. Scanning the
 *     stylesheets is what makes the attribution follow from the import itself — the act that puts the file into the
 *     release is the same act that puts its license into the About dialog, whichever dependency block it sits in.
 *
 * Run via `npm run licenses:generate` (part of `npm run build`, after `ng build`).
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const bundleLicensesPath = path.join(projectRoot, 'dist', 'traquity', '3rdpartylicenses.txt');
const nodeModulesPath = path.join(projectRoot, 'node_modules');
const sourcePath = path.join(projectRoot, 'src');
const angularJsonPath = path.join(projectRoot, 'angular.json');
const outputPath = path.join(projectRoot, 'dist', 'traquity', 'browser', 'assets', 'third-party-licenses.json');
const ownPackageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));

/** @typedef {{name: string, traverse: boolean, optional?: boolean}} ShellPackageEntry */

/** @typedef {{dependencies?: Record<string, string>, optionalDependencies?: Record<string, string>}} DependencyManifest */

// packages shipped by the Electron shell outside the Angular bundle. `traverse` follows the production dependency
// closure. electron is a leaf: its npm dependencies are install-time tooling only — the shipped runtime binary is
// covered by the electron LICENSE plus the packaged LICENSES.chromium.html (see addRuntimeNotes).
const shellPackageRoots = [
  {name: 'electron', traverse: false},
  // Everything the main process requires at runtime is a `dependencies` entry (devDependencies are pruned out of the
  // package) and is kept in the asar by electron-packager. Reading that block instead of naming the packages here is
  // what makes the report impossible to forget: a runtime dependency added later shows up in it, and in
  // `licenses:check`, without anyone remembering this file.
  ...Object.keys(ownPackageJson.dependencies ?? {}).map(name => ({name, traverse: true}))
];

// A package carrying a prebuilt native binary splits it across one optional dependency per platform, of which npm
// installs only those the machine matches - so the closure below covers exactly the binaries this build ships, and
// an optional dependency npm skipped is skipped here too instead of failing the run.
/**
 * @param {DependencyManifest} packageJson
 * @returns {ShellPackageEntry[]}
 */
function collectEntries(packageJson) {
  return [
    ...Object.keys(packageJson.dependencies ?? {}).map(name => ({name, traverse: true, optional: false})),
    ...Object.keys(packageJson.optionalDependencies ?? {}).map(name => ({name, traverse: true, optional: true}))
  ];
}

// The rule the bundle file draws between two records, matched only where it trails a record: anchored at the end of
// the block and without the `m` flag, so a rule *inside* a license text is never mistaken for it.
/** @type {RegExp} */
const trailingSeparator = /\n-{10,}\s*$/;

/** @type {string[]} */
const licenseFileNames = ['LICENSE', 'LICENSE.txt', 'LICENSE.md', 'LICENCE', 'LICENSE-MIT.txt', 'LICENSE-MIT', 'LICENSE.MIT'];

/** @type {string[]} */
const noticeFileNames = ['NOTICE', 'NOTICE.txt', 'NOTICE.md'];

/** @type {string} canonical MIT license without copyright */
const MIT = `MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

/**
 * The canonical text of an SPDX license id without copyright
 * @type {Record<string, string>}
 */
const SPDX_LICENSE_TEMPLATES = {
  MIT: MIT
};

// The About dialog renders a license text in a `<pre>`, which does not wrap, so a generated paragraph is hard-wrapped
// here to the width the license texts above already use.
const noteWidth = 118;

/**
 * @param {string} text
 * @returns {string}
 */
function hardWrap(text) {
  /** @type {string[]} */
  const lines = [];
  /** @type {string} */
  let line = '';
  for (const word of text.split(' ')) {
    if (line.length === 0) {
      line = word;
    } else if (line.length + 1 + word.length <= noteWidth) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  lines.push(line);
  return lines.join('\n');
}

/** @typedef {{license: string, author?: string | {name: string}}} PackageAuthorAndLicense */

/**
 * States, above a canonical license text, that the package supplied none of its own and what it did supply instead —
 * so a reader can tell an attribution the package made from one this script assembled out of its metadata. A
 * declared author is reported as exactly that, since naming an author is not the same act as claiming a copyright.
 * @param {string} name
 * @param {PackageAuthorAndLicense} packageJson
 * @returns {string}
 */
function provenanceNoteFor(name, packageJson) {
  /** @type {string | undefined} */
  const author = typeof packageJson.author === 'string' ? packageJson.author : packageJson.author?.name;
  const declared = author === undefined
    ? `Its package.json declares the license ${packageJson.license}.`
    : `Its package.json declares the license ${packageJson.license} and names ${author} as author.`;
  const reason = author === undefined
    ? 'the package names no copyright holder'
    : 'a declared author is not a copyright notice';
  return hardWrap(`${name} ships no license file of its own. ${declared} The canonical text of ${packageJson.license} `
    + `follows; it carries no copyright line, because ${reason}.`);
}

/**
 * The license text to attribute a package with: its own license file when it ships one, otherwise the canonical text
 * of the SPDX id its package.json declares, for the identifiers SPDX_LICENSE_TEMPLATES carries, under a note saying
 * so. Neither present is left to the missingTexts check in main() to catch.
 * @param {string} name
 * @param {string} packageDirectory
 * @param {PackageAuthorAndLicense} packageJson
 * @returns {string | null}
 */
function licenseTextFor(name, packageDirectory, packageJson) {
  const fileText = readFirstExistingFile(packageDirectory, licenseFileNames);
  if (fileText !== null) {
    return fileText;
  }
  const template = SPDX_LICENSE_TEMPLATES[packageJson.license];
  if (template === undefined) {
    return null;
  }
  return `${provenanceNoteFor(name, packageJson)}\n\n${template}`;
}

const stylesheetExtensions = ['.scss', '.css'];

// @use 'package' or @use "package"
const usePattern = /@use\s+['"]([^'"]+)['"]/g;

// @import 'package' or @import "package"
const importPattern = /@import\s+['"]([^'"]+)['"]/g;

// url('path'), url("path"), or url(path)
const urlPattern = /url\(\s*['"]?([^'")]+?)['"]?\s*\)/g;

/** @type {RegExp[]} */
const stylesheetReferencePatterns = [usePattern, importPattern, urlPattern];

function fail(message) {
  console.error(`[third-party-licenses] ${message}`);
  process.exit(1);
}

function readPackageJson(packageName) {
  const packageJsonPath = path.join(nodeModulesPath, ...packageName.split('/'), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
}

/**
 * The first of `fileNames` the directory holds, compared case-insensitively and in the order given, so the most
 * specific name wins.
 * @param {string} directory
 * @param {string[]} fileNames
 * @returns {string | null}
 */
function readFirstExistingFile(directory, fileNames) {
  if (!fs.existsSync(directory)) {
    return null;
  }

  /** @type {string[]} */
  const presentNames = fs.readdirSync(directory, {withFileTypes: true})
    .filter(entry => !entry.isDirectory())
    .map(entry => entry.name);

  for (const fileName of fileNames) {
    const match = presentNames.find(presentName => presentName.toLowerCase() === fileName.toLowerCase());
    if (match !== undefined) {
      return fs.readFileSync(path.join(directory, match), 'utf-8');
    }
  }
  return null;
}

function parseBundleLicenses() {
  if (!fs.existsSync(bundleLicensesPath)) {
    fail(`${bundleLicensesPath} not found — run "ng build" first (the file is generated by the Angular build).`);
  }

  const content = fs.readFileSync(bundleLicensesPath, 'utf-8');
  const packagesByName = new Map();

  // A record runs from its own `Package:` line to the next one. Splitting on the rule the file draws between records
  // is what this must not do: a license text may draw a rule of its own, and the OFL draws one of 59 dashes above and
  // below its title where the file's own separator is 80. Splitting on any dash run therefore cut every OFL text off
  // at "This license is copied below" and dropped the remainder - it landed in blocks carrying no `Package:` line,
  // which the loop then skipped as noise.
  const headers = [...content.matchAll(/^Package: (.+)$/gm)];
  for (const [index, header] of headers.entries()) {
    const name = header[1].trim();
    if (packagesByName.has(name)) {
      continue; // duplicate record (same package bundled into several chunks) — the license text is identical
    }

    const blockStart = header.index + header[0].length;
    const blockEnd = index + 1 < headers.length ? headers[index + 1].index : content.length;
    const block = content.slice(blockStart, blockEnd);

    const licenseMatch = block.match(/^License: "?(.*?)"?$/m);
    const bundleLicenseText = block
      .replace(/^License: .+$/m, '')
      .replace(trailingSeparator, '')
      .trim();

    // The package's own LICENSE file is preferred over the text the build re-emitted: it is the canonical copy, it is
    // what the licenses actually require to be reproduced, and it cannot be truncated by however this file is parsed.
    // The bundle text stays as the fallback for a package that ships none.
    // The NOTICE is read here for the same reason - the bundle file never carries one, and Apache-2.0 §4(d) requires
    // the NOTICE of a package that ships one to be reproduced in the distribution.
    const packageDirectory = path.join(nodeModulesPath, ...name.split('/'));
    const packageExists = fs.existsSync(packageDirectory);
    const fileLicenseText = packageExists ? readFirstExistingFile(packageDirectory, licenseFileNames) : null;

    packagesByName.set(name, {
      name,
      version: readPackageJson(name)?.version ?? 'unknown',
      license: licenseMatch ? licenseMatch[1] : null,
      licenseText: fileLicenseText ?? (bundleLicenseText.length > 0 ? bundleLicenseText : null),
      noticeText: packageExists ? readFirstExistingFile(packageDirectory, noticeFileNames) : null,
      source: 'angular-bundle'
    });
  }

  if (packagesByName.size === 0) {
    fail(`${bundleLicensesPath} contained no parsable package blocks — the Angular output format may have changed.`);
  }
  return packagesByName;
}

function collectShellPackages(packagesByName) {
  const queue = [...shellPackageRoots];
  const visited = new Set();

  while (queue.length > 0) {
    const {name, traverse, optional} = queue.shift();
    if (visited.has(name)) {
      continue;
    }
    visited.add(name);

    const packageJson = readPackageJson(name);
    if (packageJson === null) {
      if (optional) {
        continue;
      }
      fail(`Shell package "${name}" not found in node_modules — run "npm install" first.`);
    }

    const packageDirectory = path.join(nodeModulesPath, ...name.split('/'));
    if (!packagesByName.has(name)) {
      packagesByName.set(name, {
        name,
        version: packageJson.version,
        license: packageJson.license ?? null,
        licenseText: licenseTextFor(name, packageDirectory, packageJson),
        noticeText: readFirstExistingFile(packageDirectory, noticeFileNames),
        source: 'electron-shell'
      });
    }

    if (traverse) {
      queue.push(...collectEntries(packageJson));
    }
  }
}

/**
 * The package a stylesheet specifier refers to, or null when it refers to something that is not a package: a relative
 * or absolute path, a data/remote URL, or one of this project's own files (angular.json lists those workspace-
 * relative, e.g. `src/styles.scss`, which is spelled exactly like a package subpath and is told apart from one by
 * being there).
 */
function packageNameOf(specifier) {
  if (isLocalPathOrReference(specifier) || isUrlOrProtocol(specifier)) {
    return null;
  }
  if (fs.existsSync(path.join(projectRoot, specifier))) {
    return null;
  }
  const segments = specifier.split('/');
  const name = specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
  return name.length > 0 ? name : null;
}

// Checks if the specifier starts with special path characters: ., ~, /, or #
function isLocalPathOrReference(specifier) {
  const pathPrefixRegex = /^[.~/#]/;
  return pathPrefixRegex.test(specifier);
}

// Checks for a valid URL protocol scheme (e.g., http:, https:, data:, file:)
function isUrlOrProtocol(specifier) {
  const urlProtocolRegex = /^[a-z][a-z0-9+.-]*:/i;
  return urlProtocolRegex.test(specifier);
}

function stylesheetSpecifiers() {
  const specifiers = new Set();

  // angular.json's `styles` - a global stylesheet is listed there rather than imported from anywhere in src/
  const angularJson = JSON.parse(fs.readFileSync(angularJsonPath, 'utf-8'));
  for (const project of Object.values(angularJson.projects ?? {})) {
    for (const style of project.architect?.build?.options?.styles ?? []) {
      specifiers.add(typeof style === 'string' ? style : style.input);
    }
  }

  // every stylesheet in src/, including the component-level ones: a `url()` in any of them ships an asset too
  const entries = fs.readdirSync(sourcePath, {recursive: true, withFileTypes: true});
  for (const entry of entries) {
    if (!entry.isFile() || !stylesheetExtensions.includes(path.extname(entry.name))) {
      continue;
    }
    const content = fs.readFileSync(path.join(entry.parentPath, entry.name), 'utf-8');
    for (const pattern of stylesheetReferencePatterns) {
      for (const match of content.matchAll(pattern)) {
        specifiers.add(match[1]);
      }
    }
  }

  return specifiers;
}

function collectStylesheetPackages(packagesByName) {
  const names = new Set();
  for (const specifier of stylesheetSpecifiers()) {
    const name = packageNameOf(specifier);
    if (name !== null) {
      names.add(name);
    }
  }

  for (const name of names) {
    if (packagesByName.has(name)) {
      continue;
    }

    const packageJson = readPackageJson(name);
    if (packageJson === null) {
      fail(`Stylesheet package "${name}" not found in node_modules — run "npm install" first.`);
    }

    const packageDirectory = path.join(nodeModulesPath, ...name.split('/'));
    packagesByName.set(name, {
      name,
      version: packageJson.version,
      license: packageJson.license ?? null,
      licenseText: licenseTextFor(name, packageDirectory, packageJson),
      noticeText: readFirstExistingFile(packageDirectory, noticeFileNames),
      source: 'stylesheet-asset'
    });
  }
}

function addRuntimeNotes(packagesByName) {
  packagesByName.set('Electron runtime components (Chromium, Node.js)', {
    name: 'Electron runtime components (Chromium, Node.js)',
    version: readPackageJson('electron')?.version ?? 'unknown',
    license: 'multiple (see packaged notice files)',
    licenseText: 'The packaged desktop application ships the files LICENSE and LICENSES.chromium.html next to the executable. '
      + 'They contain the complete license and attribution notices for Chromium, Node.js and all further third-party '
      + 'components bundled inside the Electron runtime.',
    noticeText: null,
    source: 'runtime-note'
  });
}

function main() {
  const packagesByName = parseBundleLicenses();
  collectShellPackages(packagesByName);
  collectStylesheetPackages(packagesByName);
  addRuntimeNotes(packagesByName);

  const packages = [...packagesByName.values()].sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
  const missingTexts = packages.filter(entry => entry.licenseText === null).map(entry => entry.name);
  if (missingTexts.length > 0) {
    fail(`No license text found for: ${missingTexts.join(', ')} — attribution would be incomplete.`);
  }

  if (!fs.existsSync(path.dirname(outputPath))) {
    fail(`${path.dirname(outputPath)} not found — run "ng build" first (the assets folder is created by the Angular build).`);
  }

  const output = JSON.stringify({generatedAt: new Date().toISOString(), packages}, null, 2);
  fs.writeFileSync(outputPath, output);
  console.log(`[third-party-licenses] wrote ${packages.length} packages to ${outputPath}`);
}

main();
