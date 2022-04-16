const { ListCommand } = require('../../src/commands/list');

describe('ListCommand', () => {
  describe('list', () => {
    const targetBucketUrl = new URL('gs://sample.com/bucket');
    const storageServiceClientMock = {
      listFiles: jest.fn().mockReturnValue(['']),
    };

    it('return undefined', async() => {
      const listCommand = new ListCommand();
      await expect(listCommand.list(storageServiceClientMock, targetBucketUrl)).resolves.toBe(undefined);
    });
  });

  describe('addListOptions', () => {
    it('call addOption()', () => {
      const listCommand = new ListCommand();
      const addOptionMock = jest.fn().mockReturnValue(listCommand);
      listCommand.addOption = addOptionMock;
      listCommand.addListOptions();
      expect(addOptionMock).toBeCalled();
    });
  });

  describe('setListAction', () => {
    it('call action()', () => {
      const listCommand = new ListCommand();
      const actionMock = jest.fn().mockReturnValue(listCommand);
      listCommand.action = actionMock;
      listCommand.setListAction();
      expect(actionMock).toBeCalled();
    });
  });
});
