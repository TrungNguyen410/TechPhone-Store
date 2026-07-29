const mockConnectDB = jest.fn().mockResolvedValue();
const mockDisconnectDB = jest.fn().mockResolvedValue();
const mockHash = jest.fn().mockResolvedValue('hashed-password');
const mockAccessory = { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() };
const mockUser = { deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() };

jest.mock('../src/config/database', () => ({ connectDB: mockConnectDB, disconnectDB: mockDisconnectDB }));
jest.mock('bcrypt', () => ({ hash: mockHash }));
jest.mock('../src/models/Accessory', () => mockAccessory);
jest.mock('../src/models/Banner', () => ({ deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() }));
jest.mock('../src/models/Brand', () => ({ deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() }));
jest.mock('../src/models/Category', () => ({ deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() }));
jest.mock('../src/models/Contact', () => ({ deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() }));
jest.mock('../src/models/Order', () => ({ deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() }));
jest.mock('../src/models/OrderItem', () => ({ deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() }));
jest.mock('../src/models/Product', () => ({ deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() }));
jest.mock('../src/models/RefreshToken', () => ({ deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() }));
jest.mock('../src/models/Review', () => ({ deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() }));
jest.mock('../src/models/Setting', () => ({ deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() }));
jest.mock('../src/models/User', () => mockUser);
jest.mock('../src/models/Voucher', () => ({ deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() }));
jest.mock('../src/models/VerificationCode', () => ({ deleteMany: jest.fn().mockResolvedValue(), insertMany: jest.fn().mockResolvedValue() }));

describe('seed startup safety', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSeedPassword = process.env.SEED_DEMO_PASSWORD;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.NODE_ENV = 'production';
    process.env.SEED_DEMO_PASSWORD = '123456';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalSeedPassword === undefined) delete process.env.SEED_DEMO_PASSWORD;
    else process.env.SEED_DEMO_PASSWORD = originalSeedPassword;
    jest.restoreAllMocks();
  });

  it('rejects invalid production credentials before connecting, deleting, or writing seed data', async () => {
    let resolveExit;
    const exited = new Promise((resolve) => { resolveExit = resolve; });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(process, 'exit').mockImplementation((code) => resolveExit(code));

    require('../src/seed/seed');
    await expect(exited).resolves.toBe(1);

    expect(mockConnectDB).not.toHaveBeenCalled();
    expect(mockAccessory.deleteMany).not.toHaveBeenCalled();
    expect(mockUser.insertMany).not.toHaveBeenCalled();
    expect(mockHash).not.toHaveBeenCalled();
  });
});
