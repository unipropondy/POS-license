const sql = require("mssql");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();

// ✅ POOL CACHE (Stores active ConnectionPool or in-flight connection promise)
const poolCache = new Map();

// Helper to strip accidental quotes from env values
const cleanEnv = (val) => {
  if (val === undefined || val === null) return "";
  return String(val).replace(/^["']|["']$/g, "").trim();
};

// ✅ DYNAMIC CONNECTION FUNCTION (With Promise deduplication)
const getPool = async (dbname) => {
  if (!dbname) throw new Error("Database name is required");

  const cleanDbName = cleanEnv(dbname) || cleanEnv(process.env.DB_NAME) || "UNIPRO";

  // If already connecting or connected, reuse the exact same promise/pool
  if (poolCache.has(cleanDbName)) {
    try {
      const pool = await poolCache.get(cleanDbName);
      if (pool && pool.connected) {
        return pool;
      }
      poolCache.delete(cleanDbName);
    } catch (err) {
      poolCache.delete(cleanDbName);
    }
  }

  const user = cleanEnv(process.env.DB_USER);
  const password = cleanEnv(process.env.DB_PASS);
  const server = cleanEnv(process.env.DB_SERVER);
  const port = Number(cleanEnv(process.env.DB_PORT));

  if (!server || !user || !password || !port) {
    const missing = [];
    if (!server) missing.push("DB_SERVER");
    if (!user) missing.push("DB_USER");
    if (!password) missing.push("DB_PASS");
    if (!port) missing.push("DB_PORT");
    throw new Error(`Missing required database environment variables: ${missing.join(", ")}`);
  }

  // Deduplicate connection: cache the in-flight connection promise
  const connectPromise = (async () => {
    const pool = new sql.ConnectionPool({
      user,
      password,
      server,
      port,
      database: cleanDbName,
      connectionTimeout: 15000, // Faster failure if DB doesn't exist
      requestTimeout: 60000,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 60000
      }
    });

    pool.on("error", (err) => {
      console.error(`⚠️ SQL Pool Error [${cleanDbName}]:`, err.message);
      poolCache.delete(cleanDbName);
    });

    await pool.connect();
    console.log(`✅ SQL Connected : ${cleanDbName}`);
    return pool;
  })();

  poolCache.set(cleanDbName, connectPromise);

  try {
    return await connectPromise;
  } catch (err) {
    console.error(`❌ DB Connection Failed [${cleanDbName}]:`, err.message);
    poolCache.delete(cleanDbName);
    throw err;
  }
};

module.exports = {
  sql,
  getPool
};