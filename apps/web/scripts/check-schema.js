const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({
    host: '172.26.80.1', port: 3333, user: 'root', password: '123456', database: 'jhcisdb'
  });
  
  const [chronic] = await conn.query("SHOW TABLES LIKE '%chronic%'");
  console.log('=== CHRONIC TABLES ===');
  chronic.forEach(t => console.log(Object.values(t)[0]));
  
  const [drug] = await conn.query("SHOW TABLES LIKE '%drug%'");
  console.log('\n=== DRUG TABLES ===');
  drug.forEach(t => console.log(Object.values(t)[0]));
  
  const [lab] = await conn.query("SHOW TABLES LIKE '%lab%'");
  console.log('\n=== LAB TABLES ===');
  lab.forEach(t => console.log(Object.values(t)[0]));

  const [pc] = await conn.query("DESCRIBE personchronic");
  console.log('\n=== personchronic COLUMNS ===');
  pc.forEach(r => console.log(r.Field, '-', r.Type));

  const [pcn] = await conn.query("SELECT COUNT(*) as c FROM personchronic");
  console.log('\npersonchronic count:', pcn[0].c);

  const [pcs] = await conn.query("SELECT * FROM personchronic LIMIT 2");
  console.log('\n=== personchronic SAMPLE ===');
  console.log(JSON.stringify(pcs, null, 2));
  
  await conn.end();
})();
