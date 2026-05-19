const mysql = require('mysql2/promise');
const fs = require('fs');

async function main() {
  const conn = await mysql.createConnection({
    host: '172.26.80.1',
    port: 3333,
    user: 'root',
    password: '123456',
    database: 'geohealth_jhcis',
  });

  // Get all tables
  const [tables] = await conn.execute("SHOW TABLES");
  const lines = [];

  for (const row of tables) {
    const table = Object.values(row)[0];
    
    // Get CREATE TABLE
    const [createResult] = await conn.execute(`SHOW CREATE TABLE \`${table}\``);
    const createSQL = Object.values(createResult[0])[1];
    lines.push(`DROP TABLE IF EXISTS \`${table}\`;`);
    lines.push(`${createSQL};`);

    // Get data
    const [rows] = await conn.execute(`SELECT * FROM \`${table}\``);
    for (const row of rows) {
      const cols = Object.keys(row).map(k => `\`${k}\``).join(', ');
      const vals = Object.values(row).map(v => {
        if (v === null) return 'NULL';
        if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
        if (typeof v === 'number') return v;
        return `'${String(v).replace(/'/g, "''")}'`;
      }).join(', ');
      lines.push(`INSERT INTO \`${table}\` (${cols}) VALUES (${vals});`);
    }
  }

  await conn.end();

  const sql = lines.join('\n') + '\n';
  fs.writeFileSync('/home/suphot/geohealth-jhcis/docker-entrypoint-initdb.d/01-import-data.sql', sql);
  console.log(`✅ Exported ${lines.length} SQL statements to docker-entrypoint-initdb.d/01-import-data.sql`);
  console.log(`   File size: ${(sql.length / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(e => { console.error(e); process.exit(1); });
