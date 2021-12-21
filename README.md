# umzug-clickhouse-storage

Clickhouse storage for umzug

Usage:
```javascript
const clickhouseConfig = new ClickHouse({
	url: 'http://localhost',
	port: 8123,
	debug: false,
	basicAuth: null,
	isUseGzip: false,
	format: "json", // "json" || "csv" || "tsv"
	raw: false,
	config: {
		session_id                              : 'session_id if neeed',
		session_timeout                         : 60,
		output_format_json_quote_64bit_integers : 0,
		enable_http_compression                 : 0,
		database                                : 'my_database_name',
	},
	
	// This object merge with request params (see request lib docs)
	reqParams: {
		...
	}
});

const clickhouseClient = new ClickHouse(clickhouseConfig);

const getRawSqlClient = () => ({
  query: async (sql: string) => clickhouseClient.query(sql).toPromise(),
  database,
});

const migrator = new Umzug({
  migrations: {
    params: [
      getRawSqlClient(),
    ],
    path: 'src/migrations',
    pattern: /\.js$/,
  },
  logger: console, 
  storage: new ClickhouseStorage({ clickhouse: clickhouseClient, tableName: 'clickhouse_meta', columnName: 'name' }),
```
**ClickhouseStorage params**

* clickhouse - Clickhouse instance
* tableName - name for storage migration list (default clickhouse_meta)
* columnName - name of column that contains migration's filename (default name)