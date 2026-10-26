const sql = require("mssql");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();

// ✅ POOL CACHE
const pools = new Map();

// Helper to strip accidental quotes from env values
const cleanEnv = (val) => {
  if (val === undefined || val === null) return "";
  return String(val).replace(/^["']|["']$/g, "").trim();
};

// ✅ DYNAMIC CONNECTION FUNCTION
const getPool = async (dbname) => {
  if (!dbname) throw new Error("Database name is required");

  const cleanDbName = cleanEnv(dbname) || cleanEnv(process.env.DB_NAME) || "UNIPRO";

  if (pools.has(cleanDbName)) {
    const existing = pools.get(cleanDbName);
    if (existing.connected) return existing;
    pools.delete(cleanDbName);
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

  try {
    const pool = new sql.ConnectionPool({
      user,
      password,
      server,
      port,
      database: cleanDbName,
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
      console.error(`⚠️ SQL Pool Error [${cleanDbName}]:`, err.message);
      pools.delete(cleanDbName);
    });

    await pool.connect();
    console.log(`✅ SQL Connected : ${cleanDbName}`);
    pools.set(cleanDbName, pool);
    return pool;

  } catch (err) {
    console.error(`❌ DB Connection Failed [${cleanDbName}]:`, err.message);
    pools.delete(cleanDbName);
    throw err;
  }
};

module.exports = {
  sql,
  getPool
};