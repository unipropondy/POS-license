const sql = require("mssql");

require("dotenv").config();


// ✅ POOL CACHE
const pools = new Map();

// ✅ DYNAMIC CONNECTION FUNCTION
const getPool = async (dbname) => {
  if (!dbname) throw new Error("Database name is required");
  if (pools.has(dbname)) {
    const existing = pools.get(dbname);
    if (existing.connected) return existing;
    pools.delete(dbname);
  }

  try {
    const pool = new sql.ConnectionPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      server: process.env.DB_SERVER,
      port: Number(process.env.DB_PORT),
      database: dbname,
      connectionTimeout: 30000,
      requestTimeout: 120000,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    });

    pool.on("error", (err) => {
      console.error(`⚠️ SQL Pool Error [${dbname}]:`, err.message);
      pools.delete(dbname);
    });

    await pool.connect();
    console.log(`✅ SQL Connected : ${dbname}`);
    pools.set(dbname, pool);
    return pool;

  } catch (err) {
    console.error(`❌ DB Connection Failed [${dbname}]:`, err.message);
    pools.delete(dbname);
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