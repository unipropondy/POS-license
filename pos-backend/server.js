require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { sql, poolPromise, getPool } = require("./db");

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

console.log("ENV CHECK 👉", process.env.DB_SERVER);

// ================= DYNAMIC DB MIDDLEWARE =================
app.use(async (req, res, next) => {
  try {
    const dbName = req.headers["x-db-name"] || process.env.DB_NAME;

    if (!dbName) {
      return res.status(400).json({ success: false, message: "Database name required" });
    }

    req.pool = await getPool(dbName);
    next();
  } catch (err) {
    console.error("❌ DB Middleware Error:", err);
    res.status(500).json({ success: false, message: "Database connection failed", error: err.message });
  }
});

// ================= STATIC FILES & API ROOT =================
const path = require("path");
app.use(express.static(path.join(__dirname, "../build")));

app.get("/api-status", (req, res) => {
  res.status(200).send("API Running 🚀");
});

// ================= USER MASTER ROUTES ================= //
const usermasterRoutes = require("./routes/usermaster");
app.use("/api", usermasterRoutes);

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



// ================= 404 / REACT ROUTER =================
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({
      success: false,
      message: "Route not found"
    });
  } else {
    res.sendFile(path.join(__dirname, "../build", "index.html"));
  }
});

// ================= PORT =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});