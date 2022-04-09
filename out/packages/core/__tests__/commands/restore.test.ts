let restore = require('../../src/commands/restore');

describe('RestoreCommand', () => {
  describe('restore', () => {
    const targetBucketUrl = new URL('gs://sample.com/bucket');
    const options = {
      backupfilePrefix: 'backup',
      deleteDivide: 1,
      deleteTargetDaysLeft: 1,
    };

    const storageServiceClientMock = {
      copyFile: jest.fn().mockReturnValue(['']),
    };
    const restoreDatabaseFuncMock = jest.fn().mockReturnValue({ stdout: '', stderr: '' });

    beforeEach(() => {
      jest.resetModules();
      jest.doMock('../../src/utils/tar', () => {
        const mock = jest.requireActual('../../src/utils/tar');
        mock.expandBZIP2 = jest.fn().mockReturnValue('');
        return mock;
      });
      restore = require('../../src/commands/restore');
    });
    afterEach(() => {
      jest.dontMock('../../src/utils/tar');
    });

    it('return undefined', async() => {
      const restoreCommand = new restore.RestoreCommand();
      await expect(restoreCommand.restore(storageServiceClientMock, restoreDatabaseFuncMock, targetBucketUrl, options)).resolves.toBe(undefined);
    });
  });

  describe('setRestoreArgument', () => {
    it('call argument()', () => {
      const restoreCommand = new restore.RestoreCommand();
      const argumentMock = jest.fn().mockReturnValue(restoreCommand);
      restoreCommand.argument = argumentMock;
      restoreCommand.setRestoreArgument();
      expect(argumentMock).toBeCalled();
    });
  });

  describe('addRestoreOptions', () => {
    it('call option()', () => {
      const restoreCommand = new restore.RestoreCommand();
      const optionMock = jest.fn().mockReturnValue(restoreCommand);
      restoreCommand.option = optionMock;
      restoreCommand.addRestoreOptions();
      expect(optionMock).toBeCalled();
    });
  });

  describe('setRestoreAction', () => {
    it('call action()', () => {
      const restoreCommand = new restore.RestoreCommand();
      const actionMock = jest.fn().mockReturnValue(restoreCommand);
      restoreCommand.action = actionMock;
      restoreCommand.setRestoreAction();
      expect(actionMock).toBeCalled();
    });
  });
});
