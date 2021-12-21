export class ClickhouseStorage {
  private tableCreated = false;

  private readonly clickhouse;

  private readonly database;

  private readonly tableName;

  private readonly columnName;

  constructor({ clickhouse, tableName = 'clickhouse_meta', columnName = 'name' }) {
    if (!clickhouse) {
      throw new Error('Please provide clickhouse instance');
    }

    this.clickhouse = clickhouse;
    this.tableName = tableName;
    this.columnName = columnName;
    this.database = clickhouse?.opts?.database;
  }

  async logMigration(migrationName: string): Promise<void> {
    await this.createTable();
    await this.insertLog(migrationName, 'executed');
  }

  async unlogMigration(migrationName: string): Promise<void> {
    await this.createTable();
    await this.insertLog(migrationName, 'pending');
  }

  async executed(): Promise<string[]> {
    await this.createTable();

    const migrations = await this.clickhouse.query(
      `SELECT * FROM ${this.database}.${this.tableName} WHERE (name, version) IN (
          SELECT name, max(version)
          FROM ${this.database}.${this.tableName}
          GROUP BY name
      ) and status = 'executed'
      ORDER BY ${(this.columnName)} ASC
      `,
    ).toPromise();
    return migrations.map(({ name }) => name);
  }

  async createTable(): Promise<void> {
    if (this.tableCreated) {
      return;
    }

    await this.clickhouse.query(`
      CREATE TABLE IF NOT EXISTS ${this.database}.${this.tableName}
      (
        ${(this.columnName)} TEXT NOT NULL,
        status ENUM('executed' = 1, 'pending' = 2),
        version UInt8
      )
      ENGINE = ReplacingMergeTree(version)
      ORDER BY ${(this.columnName)}
      `).toPromise();

    this.tableCreated = true;
  }

  async insertLog(migrationName: string, status: 'executed' | 'pending'): Promise<void> {
    const [{ maxVersion }]: any = await this.clickhouse.query(
      `SELECT MAX(version) as maxVersion FROM ${this.database}.${this.tableName} WHERE name = '${migrationName}'`,
    ).toPromise();

    const migration = {
      name: migrationName,
      status,
      version: maxVersion + 1,
    };

    await this.clickhouse.insert(
      `INSERT INTO ${this.database}.${this.tableName} (${Object.keys(migration).join(', ')})`, migration,
    ).toPromise();
  }
}
