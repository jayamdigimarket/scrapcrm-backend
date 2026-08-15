const mysql = require('mysql2/promise');

// Auto-detect environment: Railway vs Local
const isRailway = !!process.env.MYSQLHOST || !!process.env.RAILWAY_ENVIRONMENT;

const pool = mysql.createPool(isRailway ? {
  // Railway MySQL
  host:     process.env.DB_HOST     || process.env.MYSQLHOST     || 'mysql.railway.internal',
  port:     parseInt(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user:     process.env.DB_USER     || process.env.MYSQLUSER     || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'iOLvBYtzTWGeCXtNNJfmcLNqwiAJJMoe',
  database: process.env.DB_NAME     || process.env.MYSQLDATABASE || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
} : {
  // Local MySQL
  host:     'localhost',
  port:     3306,
  user:     'root',
  password: 'root',  // your local MySQL password (leave empty if none)
  database: 'scrapcrm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+05:30',
});

pool.getConnection()
  .then(conn => {
    const env = isRailway ? 'Railway' : 'Local';
    console.log(`✅ MySQL connected [${env}]:`, isRailway ? (process.env.DB_HOST || 'mysql.railway.internal') : 'localhost/scrapcrm');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('Host:', isRailway ? process.env.DB_HOST : 'localhost');
  });

module.exports = pool;
