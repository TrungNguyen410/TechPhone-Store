const { assertTransactionTopology, connectDB } = require('../src/config/database');

describe('database transaction topology', () => {
  it('fails fast with a clear message for a standalone MongoDB server', () => {
    expect(() => assertTransactionTopology({ ok: 1 })).toThrow(
      /replica set or sharded cluster is required/i,
    );
  });

  it('accepts replica-set and sharded MongoDB topologies', () => {
    expect(() => assertTransactionTopology({ setName: 'rs0' })).not.toThrow();
    expect(() => assertTransactionTopology({ msg: 'isdbgrid' })).not.toThrow();
  });

  it('disconnects before propagating an unsupported topology error', async () => {
    const client = {
      set: jest.fn(),
      connect: jest.fn().mockResolvedValue(),
      disconnect: jest.fn().mockResolvedValue(),
      connection: {
        db: {
          admin: () => ({
            command: jest.fn().mockResolvedValue({ ok: 1 }),
          }),
        },
      },
    };

    await expect(connectDB('mongodb://standalone.test/store', client)).rejects.toThrow(
      /replica set or sharded cluster is required/i,
    );
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });
});
