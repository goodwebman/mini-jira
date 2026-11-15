import { Client } from '@neondatabase/serverless';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDatabase } from '../src/db/client.js';

const { transaction } = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock('drizzle-orm/neon-serverless', () => ({
  drizzle: () => ({ transaction }),
}));

describe('database transaction connections', () => {
  const clients: Client[] = [];
  const database = createDatabase('postgresql://test:test@localhost/test');

  beforeEach(() => {
    clients.length = 0;
    transaction.mockReset();
    vi.spyOn(Client.prototype, 'connect').mockImplementation(function (
      this: Client,
    ) {
      clients.push(this);
    });
    vi.spyOn(Client.prototype, 'end').mockReturnValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns the transaction result and closes its connection', async () => {
    transaction.mockImplementation(async (fn) => fn({}));

    await expect(database.withTx(async () => 'committed')).resolves.toBe(
      'committed',
    );
    expect(clients).toHaveLength(1);
    expect(Client.prototype.end).toHaveBeenCalledOnce();
  });

  it('handles a transport error without throwing from the event emitter and allows another transaction', async () => {
    const error = new Error('WebSocket disconnected');
    transaction.mockImplementationOnce(async () => {
      clients[0]!.emit('error', error);
      throw error;
    });

    await expect(database.withTx(async () => {})).rejects.toBe(error);
    expect(console.error).toHaveBeenCalledWith(
      'Database connection error:',
      error,
    );
    expect(Client.prototype.end).toHaveBeenCalledOnce();

    transaction.mockImplementationOnce(async (fn) => fn({}));
    await expect(database.withTx(async () => 'recovered')).resolves.toBe(
      'recovered',
    );
    expect(clients).toHaveLength(2);
    expect(clients[0]).not.toBe(clients[1]);
    expect(Client.prototype.end).toHaveBeenCalledTimes(2);
  });

  it('closes the connection when connecting fails', async () => {
    const error = new Error('connection refused');
    vi.mocked(Client.prototype.connect).mockImplementationOnce(() => {
      throw error;
    });

    await expect(database.withTx(async () => {})).rejects.toBe(error);
    expect(transaction).not.toHaveBeenCalled();
    expect(Client.prototype.end).toHaveBeenCalledOnce();
  });
});
