const sql = require("mssql");

require("dotenv").config();


// ✅ POOL CACHE
const pools = new Map();

// ✅ DYNAMIC CONNECTION FUNCTION
const getPool = async (dbname) => {
  if (!dbname) throw new Error("Database name is required");
  if (pools.has(dbname)) return pools.get(dbname);

  try {
    const pool = await new sql.ConnectionPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      server: process.env.DB_SERVER,
      port: Number(process.env.DB_PORT),
      database: dbname,
      requestTimeout: 120000,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    }).connect();

    console.log(`✅ SQL Connected : ${dbname}`);
    pools.set(dbname, pool);
    return pool;

  } catch (err) {
    console.error(`❌ DB Connection Failed [${dbname}]:`, err);
    throw err;
  }
};


// ✅ DEFAULT POOL PROMISE
const poolPromise = getPool(process.env.DB_NAME || 'UNIPRO');

module.exports = {
  sql,
  getPool,
  poolPromise
};