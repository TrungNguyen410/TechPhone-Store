const { assertTransactionTopology } = require('../src/config/database');

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
});
