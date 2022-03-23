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

describe('createConfigS3', () => {
  const configPathObject = {
    configurationPath: '/path/to/config',
    credentialPath: '/path/to/credential',
  };
  const fs = require('fs');
  const writeFileSyncMock = jest.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

  beforeEach(() => {
    providerConfigFactory = rewire(path.join(__dirname, '../../dist/factories/provider-config-factory'));
    providerConfigFactory.__set__(
      'configPathsS3',
      jest.fn().mockReturnValue(configPathObject),
    );
  });

  describe('in case of required options are specified', () => {
    const options = {
      awsRegion: 'region',
      awsAccessKeyId: 'accessKeyId',
      awsSecretAccessKey: 'secretAccessKey',
    };

    it('return object which have "configurationPath" and "credentialPath", and call "writeFileSync" method with config data from option', () => {
      expect(providerConfigFactory.createConfigS3(options)).toEqual(configPathObject);
      expect(writeFileSyncMock).toHaveBeenNthCalledWith(
        1,
        configPathObject.configurationPath,
        expect.stringContaining(options.awsRegion),
      );
      expect(writeFileSyncMock).toHaveBeenNthCalledWith(
        2,
        configPathObject.credentialPath,
        expect.stringContaining(options.awsAccessKeyId),
      );
      expect(writeFileSyncMock).toHaveBeenNthCalledWith(
        2,
        configPathObject.credentialPath,
        expect.stringContaining(options.awsSecretAccessKey),
      );
    });
  });
});
