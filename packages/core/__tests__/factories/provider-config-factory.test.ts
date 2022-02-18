const path = require('path');
const rewire = require('rewire');

let providerConfigFactory = require('../../src/factories/provider-config-factory');

afterEach(() => {
  jest.resetModules();
  jest.dontMock('../../src/factories/provider-config-factory');
  jest.dontMock('fs');
});

describe('configExistS3', () => {
  beforeEach(() => {
    providerConfigFactory = rewire(path.join(__dirname, '../../dist/factories/provider-config-factory'));
    providerConfigFactory.__set__(
      'configPathsS3',
      jest.fn().mockReturnValue({
        configurationPath: '/path/to/config',
        credentialPath: '/path/to/credential',
      }),
    );
  });

  describe('in case of config file exists', () => {
    beforeEach(() => {
      providerConfigFactory.__set__(
        'fileExists',
        jest.fn().mockReturnValue(true),
      );
    });

    it('return true', () => {
      expect(providerConfigFactory.configExistS3()).toBe(true);
    });
  });

  describe("in case of config file dosn't exists", () => {
    beforeEach(() => {
      providerConfigFactory.__set__(
        'fileExists',
        jest.fn().mockReturnValue(false),
      );
    });

    it('return false', () => {
      expect(providerConfigFactory.configExistS3()).toBe(false);
    });
  });
});

describe('unlinkConfigS3', () => {
  const fs = require('fs');
  const unlinkSyncMock = jest.spyOn(fs, 'unlinkSync').mockReturnValue(undefined);

  beforeEach(() => {
    providerConfigFactory = rewire(path.join(__dirname, '../../dist/factories/provider-config-factory'));
    providerConfigFactory.__set__(
      'configPathsS3',
      jest.fn().mockReturnValue({
        configurationPath: '/path/to/config',
        credentialPath: '/path/to/credential',
      }),
    );
  });

  describe('in case of config file exists', () => {
    beforeEach(() => {
      providerConfigFactory.__set__(
        'fileExists',
        jest.fn().mockReturnValue(true),
      );
    });

    it('return undefined, and call "unlinkSync" method', () => {
      expect(providerConfigFactory.unlinkConfigS3()).toBe(undefined);
      expect(unlinkSyncMock).toBeCalled();
    });
  });
});
