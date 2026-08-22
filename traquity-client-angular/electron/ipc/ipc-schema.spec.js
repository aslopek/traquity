const {beforeEach, describe, expect, it} = require('@jest/globals');
const {
  aiDownloadKeySchema,
  authVerifyPasswordSchema,
  backendStartPasswordSchema,
  configurationChangesSchema,
  databasePathSchema,
  javaSettingSchema,
  MAXIMUM_PASSWORD_LENGTH,
  MAXIMUM_PATH_LENGTH
} = require('./ipc-schema.js');
const {MAXIMUM_SIGNATURE_LENGTH} = require('../security/signature-bounds.js');

describe('ipc schemas', () => {
  describe('passwords', () => {
    /** @type {string} */
    let password;

    beforeEach(() => {
      password = 'hunter2';
    });

    it('accepts a password on both channels that take one', () => {
      expect(backendStartPasswordSchema.safeParse(password).success).toBe(true);
      expect(authVerifyPasswordSchema.safeParse(password).success).toBe(true);
    });

    it('accepts one of exactly the maximum length', () => {
      password = 'x'.repeat(MAXIMUM_PASSWORD_LENGTH);

      expect(backendStartPasswordSchema.safeParse(password).success).toBe(true);
      expect(authVerifyPasswordSchema.safeParse(password).success).toBe(true);
    });

    it('refuses one byte more than the maximum length', () => {
      password = 'x'.repeat(MAXIMUM_PASSWORD_LENGTH + 1);

      expect(backendStartPasswordSchema.safeParse(password).success).toBe(false);
      expect(authVerifyPasswordSchema.safeParse(password).success).toBe(false);
    });

    it('accepts an empty password, which is how a passwordless database is opened', () => {
      password = '';

      expect(backendStartPasswordSchema.safeParse(password).success).toBe(true);
      expect(authVerifyPasswordSchema.safeParse(password).success).toBe(true);
    });
  });

  describe('paths', () => {
    /** @type {string} */
    let databasePath;

    beforeEach(() => {
      databasePath = 'C:\\Users\\x\\traquity';
    });

    it('accepts a database path and a java setting', () => {
      expect(databasePathSchema.safeParse(databasePath).success).toBe(true);
      expect(javaSettingSchema.safeParse(databasePath).success).toBe(true);
    });

    it('refuses one longer than the maximum length', () => {
      databasePath = 'C:\\'.padEnd(MAXIMUM_PATH_LENGTH + 1, 'x');

      expect(databasePathSchema.safeParse(databasePath).success).toBe(false);
      expect(javaSettingSchema.safeParse(databasePath).success).toBe(false);
    });

    it('refuses an empty one', () => {
      databasePath = '';

      expect(databasePathSchema.safeParse(databasePath).success).toBe(false);
      expect(javaSettingSchema.safeParse(databasePath).success).toBe(false);
    });

    it('accepts null as a java setting, which means the PATH candidate', () => {
      expect(javaSettingSchema.safeParse(null).success).toBe(true);
    });
  });

  describe('configuration changes', () => {
    /** @type {{databasePath: string, javaPath: string | null, javaSignature: string | null}} */
    let changes;

    beforeEach(() => {
      changes = {
        databasePath: 'C:\\Users\\x\\traquity',
        javaPath: 'C:\\jdk\\bin\\java.exe',
        javaSignature: 'c2lnbmF0dXJl'
      };
    });

    it('accepts a complete set of changes', () => {
      expect(configurationChangesSchema.safeParse(changes).success).toBe(true);
    });

    it('refuses a java path longer than the maximum length', () => {
      changes.javaPath = 'C:\\'.padEnd(MAXIMUM_PATH_LENGTH + 1, 'x');

      expect(configurationChangesSchema.safeParse(changes).success).toBe(false);
    });

    it('refuses a signature longer than the maximum length', () => {
      changes.javaSignature = 'a'.repeat(MAXIMUM_SIGNATURE_LENGTH + 4);

      expect(configurationChangesSchema.safeParse(changes).success).toBe(false);
    });

    it('refuses a signature that is not base64', () => {
      changes.javaSignature = 'not base64!';

      expect(configurationChangesSchema.safeParse(changes).success).toBe(false);
    });

    it('refuses an unknown key', () => {
      expect(configurationChangesSchema.safeParse({...changes, somethingElse: 'value'}).success).toBe(false);
    });
  });

  describe('ai download key', () => {
    it('accepts a catalogue key', () => {
      expect(aiDownloadKeySchema.safeParse('qwen-4b').success).toBe(true);
    });

    it('refuses an empty string', () => {
      expect(aiDownloadKeySchema.safeParse('').success).toBe(false);
    });

    it('refuses one longer than the maximum length', () => {
      expect(aiDownloadKeySchema.safeParse('x'.repeat(65)).success).toBe(false);
    });
  });
});
