// ntchat/backend/__mocks__/bcryptjs.js
const bcryptjs = jest.createMockFromModule('bcryptjs');

bcryptjs.hash = jest.fn().mockResolvedValue('mockedHashedPassword');
bcryptjs.compare = jest.fn().mockResolvedValue(true);

module.exports = bcryptjs;
