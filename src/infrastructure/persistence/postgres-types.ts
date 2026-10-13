export interface PostgresQueryResult<Row> {
  rows: Row[];
  rowCount: number | null;
}

export interface PostgresQueryable {
  query<Row = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ): Promise<PostgresQueryResult<Row>>;
}

export interface PostgresClient extends PostgresQueryable {
  release(): void;
}

export interface PostgresPool {
  connect(): Promise<PostgresClient>;
}
