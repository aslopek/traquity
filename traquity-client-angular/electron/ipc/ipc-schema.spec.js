const {beforeEach, describe, expect, it} = require('@jest/globals');
const {
  aiExtractionRequestSchema,
  aiModelKeySchema,
  authVerifyPasswordSchema,
  backendStartPasswordSchema,
  configurationChangesSchema,
  databasePathSchema,
  javaSettingSchema,
  MAXIMUM_AI_DOCUMENT_LENGTH,
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

  describe('ai model key', () => {
    it('accepts a catalogue key', () => {
      expect(aiModelKeySchema.safeParse('model-a').success).toBe(true);
    });

    it('refuses an empty string', () => {
      expect(aiModelKeySchema.safeParse('').success).toBe(false);
    });

    it('refuses one longer than the maximum length', () => {
      expect(aiModelKeySchema.safeParse('x'.repeat(65)).success).toBe(false);
    });
  });

  describe('ai extraction request', () => {
    /** @type {{document: string, currency: string, modelKey: string}} */
    let request;

    beforeEach(() => {
      request = {
        document: 'Wertpapierabrechnung Kauf\nStück 0,55814 ACME INC\nKurswert 1.700,00 EUR',
        currency: 'EUR',
        modelKey: 'model-a'
      };
    });

    it('accepts a complete request', () => {
      expect(aiExtractionRequestSchema.safeParse(request).success).toBe(true);
    });

    it('accepts a document of exactly the maximum length', () => {
      request.document = 'x'.repeat(MAXIMUM_AI_DOCUMENT_LENGTH);

      expect(aiExtractionRequestSchema.safeParse(request).success).toBe(true);
    });

    it('refuses a document one code unit longer than the maximum length', () => {
      request.document = 'x'.repeat(MAXIMUM_AI_DOCUMENT_LENGTH + 1);

      expect(aiExtractionRequestSchema.safeParse(request).success).toBe(false);
    });

    it('counts a character outside the basic plane as the two code units it occupies', () => {
      request.document = '\u{1F600}'.repeat(MAXIMUM_AI_DOCUMENT_LENGTH / 2 + 1);

      expect(aiExtractionRequestSchema.safeParse(request).success).toBe(false);
    });

    it('refuses an empty document', () => {
      request.document = '';

      expect(aiExtractionRequestSchema.safeParse(request).success).toBe(false);
    });

    it('refuses a lower-case currency code', () => {
      request.currency = 'eur';

      expect(aiExtractionRequestSchema.safeParse(request).success).toBe(false);
    });

    it('refuses a currency code that is not three letters long', () => {
      request.currency = 'EURO';

      expect(aiExtractionRequestSchema.safeParse(request).success).toBe(false);
    });

    it('refuses a currency code carrying a digit', () => {
      request.currency = 'EU1';

      expect(aiExtractionRequestSchema.safeParse(request).success).toBe(false);
    });

    it('refuses an empty model key', () => {
      request.modelKey = '';

      expect(aiExtractionRequestSchema.safeParse(request).success).toBe(false);
    });

    it('refuses an unknown key', () => {
      expect(aiExtractionRequestSchema.safeParse({...request, somethingElse: 'value'}).success).toBe(false);
    });
  });
});
