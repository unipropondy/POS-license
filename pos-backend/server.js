const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sql, getPool } = require("./db");

const app = express();

// ================= BULLETPROOF CORS MIDDLEWARE =================
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-db-name, Origin, Accept");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

app.use(express.json());

process.on("uncaughtException", (err) => {
  console.error("⚠️ Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unhandled Rejection:", reason?.message || reason);
});

console.log("ENV CHECK 👉", process.env.DB_SERVER);

// ================= HEALTH CHECK / ROOT (No DB required) =================
app.get("/api-status", (req, res) => {
  res.status(200).send("API Running 🚀");
});
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
app.get("/", (req, res) => {
  res.status(200).send("API Running 🚀");
});

// ================= DYNAMIC DB MIDDLEWARE =================
app.use(async (req, res, next) => {
  // BranchDatabaseMaster always queries the UNIPRO database directly
  if (req.path.startsWith("/api/branchdatabasemaster")) {
    return next();
  }

  const dbName = req.headers["x-db-name"] || req.query.db || process.env.DB_NAME || "UNIPRO";

  try {
    req.pool = await getPool(dbName);
    next();
  } catch (err) {
    console.error(`❌ DB Middleware Error for [${dbName}]:`, err.message);
    const isNotFound = err.message && (
      err.message.includes("Cannot open database") ||
      err.message.includes("does not exist") ||
      err.message.includes("Login failed") ||
      err.message.includes("login failed")
    );

    res.status(isNotFound ? 404 : 500).json({
      success: false,
      code: isNotFound ? "DB_NOT_FOUND" : "DB_CONNECTION_ERROR",
      database: dbName,
      message: isNotFound
        ? `Database "${dbName}" does not exist on the server or has a spelling mistake.`
        : `Could not connect to database "${dbName}".`,
      error: err.message
    });
  }
});

// ================= USER MASTER ROUTES ================= //
const usermasterRoutes = require("./routes/usermaster");
app.use("/api", usermasterRoutes);

// ================= BRANCH DATABASE MASTER ROUTES ================= //
const branchdatabasemasterRoutes = require("./routes/branchdatabasemaster");
app.use("/api", branchdatabasemasterRoutes);

// ================= QUICK SERVE ROUTES ================= //
const quickserveRoutes = require("./routes/quickserve");
app.use("/api", quickserveRoutes);

// ================= LOGIN ================= //
app.post("/api/login", async (req, res) => {
  try {
    let { username, password } = req.body;

    // ✅ Validation
    username = username?.trim();
    password = password?.trim();

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and Password are required"
      });
    }

    const pool = req.pool;
    const encodedPassword = Buffer.from(password).toString("base64");
    const result = await pool.request()
      .input("username", sql.VarChar(100), username)
      .input("password", sql.VarChar(500), encodedPassword)
      .query(`
        SELECT 
          UserId,
          UserCode,
          UserName,
          UserPassword,
          UserGroupid,
          Salutation,
          FirstName,
          LastName,
          FullName,
          NickName,
          IdentificationNo,
          IsDisabled,
          CreatedBy,
          CreatedOn,
          ModifiedBy,
          ModifiedOn,
          CardNumber,
          isWaiter,
          DailyVoidLimit,
          DailyCancelLimit,
          LastLogInDate,
          CurrentVoidAmount,
          CurrentCancelAmount 
        FROM USERMASTER
        WHERE UserName = @username 
        AND UserPassword = @password
      `);

    // ❌ Invalid credentials
    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password"
      });
    }

    const user = result.recordset[0];

    // ✅ Check if disabled
    if (user.IsDisabled) {
      return res.status(403).json({
        success: false,
        message: "Account is disabled"
      });
    }

    // ✅ Success
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        userId: user.UserId,
        userCode: user.UserCode,
        userName: user.UserName,
        fullName: user.FullName,
        userGroupId: user.UserGroupid,
        isWaiter: user.isWaiter,
        cardNumber: user.CardNumber
      }
    });

  } catch (err) {
    console.error("🔥 LOGIN ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message
    });
  }
});



// ================= 404 / FALLBACK =================
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({
      success: false,
      message: "Route not found"
    });
  } else {
    const buildPath = path.join(__dirname, "../build", "index.html");
    if (fs.existsSync(buildPath)) {
      res.sendFile(buildPath);
    } else {
      res.status(200).send("POS Backend API Running 🚀");
    }
  }
});

// ================= PORT =================
const cleanPort = String(process.env.PORT || "3000").replace(/['"]/g, "").trim();
const PORT = Number(cleanPort) || 3000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT} (0.0.0.0)`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use by another running process!`);
  } else {
    console.error("❌ Server error:", err);
  }
});