const {describe, expect, it} = require('@jest/globals');
const {authVerifyPasswordSchema, backendStartPasswordSchema, configurationChangesSchema} = require('./ipc-schema.js');

describe('ipc schemas', () => {
  it('accepts an empty password on both channels that take one, which is how a passwordless database is opened', () => {
    expect(backendStartPasswordSchema.safeParse('').success).toBe(true);
    expect(authVerifyPasswordSchema.safeParse('').success).toBe(true);
  });

  it('refuses a password containing a line feed on both channels that take one', () => {
    expect(backendStartPasswordSchema.safeParse('secret\nmore').success).toBe(false);
    expect(authVerifyPasswordSchema.safeParse('secret\nmore').success).toBe(false);
  });

  it('accepts a password containing a carriage return on both channels that take one', () => {
    expect(backendStartPasswordSchema.safeParse('secret\rmore').success).toBe(true);
    expect(authVerifyPasswordSchema.safeParse('secret\rmore').success).toBe(true);
  });

  it('refuses a java signature that is not base64', () => {
    const changes = {databasePath: 'C:\\Users\\x\\traquity', javaPath: 'C:\\jdk\\bin\\java.exe', javaSignature: 'not base64!'};

    expect(configurationChangesSchema.safeParse(changes).error?.issues).toEqual([
      expect.objectContaining({path: ['javaSignature']})
    ]);
  });
});
