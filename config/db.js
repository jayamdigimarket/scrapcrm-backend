const mysql = require('mysql2/promise');

// Railway auto-injects these when MySQL service is in same project
const pool = mysql.createPool({
  host:     process.env.MYSQLHOST     || process.env.DB_HOST     || 'localhost',
  port:     process.env.MYSQLPORT     || process.env.DB_PORT     || 3306,
  user:     process.env.MYSQLUSER     || process.env.DB_USER     || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME     || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+05:30',
  ssl: process.env.MYSQLHOST ? { rejectUnauthorized: false } : false,
});

pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected to:', process.env.MYSQLHOST || 'localhost');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('Host:', process.env.MYSQLHOST || process.env.DB_HOST);
    console.error('DB:', process.env.MYSQLDATABASE || process.env.DB_NAME);
  });

module.exports = pool;
