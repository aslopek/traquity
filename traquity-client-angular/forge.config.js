const path = require('path');
const fs = require('fs');
const {rimrafSync} = require('rimraf')
const {FusesPlugin} = require('@electron-forge/plugin-fuses');
const {FuseV1Options, FuseVersion} = require('@electron/fuses');

// What ends up inside app.asar. electron-packager copies the whole package directory unless told otherwise, which
// would ship the Angular sources, every spec, the build tooling and a second copy of backend.jar (it is already
// delivered as an extraResource). Hence an allowlist rather than a list of exclusions: a file added later ships only
// if it lands somewhere named here, instead of shipping by default and being noticed by nobody.
const packagedPaths = [
    '/package.json',            // Electron resolves the "main" entry point through it
    '/electron',                // the main process
    '/dist/traquity/browser', // the built Angular app that electron/main.js loads
    '/node_modules'             // production dependency closure - electron-packager prunes the devDependencies itself
];

// Carve-outs within the paths above. The spec-only files are the point of the exercise: electron/testing/base64-of.js
// requires `expect`, a devDependency that gets pruned away, so shipping it would put test code that cannot even load
// into the product - and suggest a test library belongs to it.
const unpackagedPaths = [
    /\.spec\.js$/,
    /^\/electron\/testing($|\/)/,
    /^\/electron\/.*\.md$/,
    // electron-packager drops these itself only while `ignore` is a list of patterns; a function replaces its
    // defaults instead of extending them, so what is still relevant of them has to be restated here
    /^\/node_modules\/\.bin($|\/)/,
    // Font binaries under node_modules are build-time input, not runtime files: `ng build` copies the ones the
    // stylesheets actually reference into dist/traquity/browser/media/ and rewrites the URLs to point there, so a
    // copy in the asar is the same glyphs a second time. It is also the *whole* package rather than the used part -
    // every weight, every subset, and for material-symbols the rounded and sharp styles this app never renders.
    // What stays is the text: LICENSE, NOTICE and package.json are kept, so the packaged app carries the licenses of
    // the fonts it ships next to them.
    /^\/node_modules\/.*\.(woff2?|ttf|otf|eot)$/,
    // The same glyphs in a second format. Chromium reads the `src` list left to right and every fontsource
    // stylesheet lists woff2 first, so the woff behind it is never requested by this app's only renderer.
    /^\/dist\/traquity\/browser\/media\/.*\.woff$/
];

/**
 * Paths arrive relative to this directory, POSIX-separated and with a leading slash; the directory itself arrives as
 * an empty string. A directory has to survive for anything below it to be visited at all - that is the third clause.
 *
 * @param {string} filePath
 * @returns {boolean}
 */
function isPackaged(filePath) {
    if (unpackagedPaths.some(unpackagedPath => unpackagedPath.test(filePath))) {
        return false;
    }
    return packagedPaths.some(packagedPath => filePath === packagedPath
      || filePath.startsWith(`${packagedPath}/`)
      || packagedPath.startsWith(`${filePath}/`));
}

module.exports = {
    hooks: {
        generateAssets: async (_config, _buildPath, _electronVersion, _platform, _arch) => {
            const fileName = `traquity-server-spring-${require('./package.json').version}.jar`;
            const backendSrc = path.join(__dirname, '..', 'traquity-server-spring', 'target', fileName);
            const resources = path.join(__dirname, 'resources');

          // the ai:confirm/ai:getState handlers hash this exact resource, so it has to be the same bytes as the
            // template AiNoticeComponent compiles from - copying the original html to rule out any drifting
          const aiNoticeSrc = path.join(__dirname, 'src', 'settings', 'ai', 'ai-notice', 'ai-notice.component.html');

            rimrafSync(resources);
            fs.mkdirSync(resources);
          fs.cpSync(backendSrc, path.join(resources, 'backend.jar'));
          fs.cpSync(aiNoticeSrc, path.join(resources, 'ai-notice.component.html'));
        }
    },
    packagerConfig: {
        asar: true,
        icon: 'src/assets/icon',
        ...(process.platform === 'linux' ? {executableName: 'traquity'} : {}),
      extraResource: ['resources/backend.jar', 'resources/ai-notice.component.html'],
        ignore: filePath => !isPackaged(filePath)
    },
    rebuildConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                setupIcon: 'src/assets/icon.ico'
            },
        },
        {
            name: '@electron-forge/maker-zip',
            platforms: ['darwin'],
        },
        {
            name: '@electron-forge/maker-deb',
            config: {
                options: {
                    name: 'traquity',
                    productName: 'TraQuity',
                    bin: 'traquity'
                }
            },
        },
        {
            name: '@electron-forge/maker-rpm',
            config: {
                options: {
                    name: 'traquity',
                    productName: 'TraQuity',
                    bin: 'traquity'
                }
            },
        },
    ],
    plugins: [
        {
            name: '@electron-forge/plugin-auto-unpack-natives',
            config: {},
        },
        // Electron's own binary accepts several ways of being told to run something other than this app, all of them
        // enabled by default and none of them reachable through anything the main process decides. A fuse is flipped
        // into the packaged binary itself, which is what puts them out of reach: every hardening in electron/ - the
        // preload boundary, the IPC schemas, the bounded java probe - is bypassed outright by a
        // `NODE_OPTIONS=--require` or an `ELECTRON_RUN_AS_NODE=1` that this process never gets to see.
        new FusesPlugin({
            version: FuseVersion.V1,
            // `ELECTRON_RUN_AS_NODE=1 TraQuity.exe evil.js` would otherwise turn the shipped binary into a plain
            // Node interpreter, with this app's own signature/installation on it
            [FuseV1Options.RunAsNode]: false,
            // `NODE_OPTIONS=--require=evil.js` is code loaded into the *main* process, before main.js runs at all
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            // `--inspect`/`--inspect-brk` attaches a debugger with full Node privileges to the same process
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            // the app is loaded from app.asar and from nowhere else. Electron otherwise prefers an unpacked `app`
            // directory next to it, so dropping one there replaces the whole main process without touching a byte of
            // what was packaged
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
            // cookies at rest are encrypted with the OS keychain rather than the fixed fallback key kept around for
            // reading what an older version wrote
            [FuseV1Options.EnableCookieEncryption]: true
            // deliberately not set: `GrantFileProtocolExtraPrivileges` - this app's own document *is* a `file:` URL
            // (window/main-window.js), so the privileges it revokes are ones the renderer needs.
        })
    ],
};
