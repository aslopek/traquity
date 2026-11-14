import type {Config} from 'jest';

// Specs run west of UTC, where a `YYYY-MM-DD` date parsed as midnight UTC falls on the local day before. Set here, since jest's
// workers inherit it, while a spec's own `process.env` is a copy the date functions never read.
process.env['TZ'] = 'America/New_York';

const config: Config = {
  displayName: 'angular',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      // merged onto tsconfig.json by ts-jest; only `module` needs overriding for jest's CJS loader
      tsconfig: {module: 'commonjs'}
    }],
    // @ngrx and ngx-echarts ship ESM-only (Angular Package Format); transpile their import/export
    // syntax to CommonJS so jest's CJS module loader can require() them like everything else.
    '^.+\\.m?js$': ['babel-jest', {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {node: 'current'}
          }
        ]
      ]
    }]
  },
  transformIgnorePatterns: ['node_modules/(?!(@ngrx|@angular|ngx-echarts)/)']
};

export default config;
