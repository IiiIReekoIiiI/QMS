import { PostgresPool, PostgresQueryable } from './postgres-types';

export async function withPostgresTransaction<Result>(
  pool: PostgresPool,
  operation: (connection: PostgresQueryable) => Promise<Result>
): Promise<Result> {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    const result = await operation(client);

    await client.query('COMMIT');
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          'The PostgreSQL transaction failed and could not be rolled back.'
        );
      }
    }

    throw error;
  } finally {
    client.release();
  }
}
