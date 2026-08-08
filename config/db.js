const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'mysql.railway.internal',
  port:     parseInt(process.env.DB_PORT)     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || 'iOLvBYtzTWGeCXtNNJfmcLNqwiAJJMoe',
  database: process.env.DB_NAME     || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+05:30',
});

pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected to:', process.env.DB_HOST || 'mysql.railway.internal');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('Host:', process.env.DB_HOST);
    console.error('DB:', process.env.DB_NAME);
  });

module.exports = pool;
