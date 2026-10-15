const express = require("express");
const router = express.Router();
const { sql } = require("../db");

/* ============================================================
   1. GET CURRENT QUICK SERVE STATUS
   Uses the active branch database pool from req.pool
============================================================ */
router.get("/quickserve", async (req, res) => {
  try {
    const pool = req.pool;
    if (!pool) {
      return res.status(400).json({ success: false, message: "Database connection not available" });
    }

    // Ensure the EnableQuickServe column exists in the current database's AppSettings
    try {
      await pool.request().query(`
        IF NOT EXISTS (
          SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'AppSettings' AND COLUMN_NAME = 'EnableQuickServe'
        )
        BEGIN
          ALTER TABLE dbo.AppSettings ADD EnableQuickServe BIT NOT NULL DEFAULT 0;
        END
      `);
    } catch (colErr) {
      console.warn("Column ensure check warning:", colErr.message);
    }

    const result = await pool.request().query(`
      SELECT TOP 1
        Id,
        EnableQuickServe,
        ShopName
      FROM dbo.AppSettings
    `);

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "AppSettings record not found in the selected database"
      });
    }

    const row = result.recordset[0];
    const isEnabled = row.EnableQuickServe ? 1 : 0;

    return res.status(200).json({
      success: true,
      id: row.Id,
      enableQuickServe: isEnabled,
      shopName: row.ShopName || null
    });
  } catch (err) {
    console.error("GET QUICK SERVE ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Quick Serve status",
      error: err.message
    });
  }
});

/* ============================================================
   HELPER: UPDATE QUICK SERVE IN DATABASE
============================================================ */
async function updateQuickServeStatus(pool, targetValue, targetId) {
  try {
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'AppSettings' AND COLUMN_NAME = 'EnableQuickServe'
      )
      BEGIN
        ALTER TABLE dbo.AppSettings ADD EnableQuickServe BIT NOT NULL DEFAULT 0;
      END
    `);
  } catch (colErr) {
    console.warn("Column ensure check warning:", colErr.message);
  }

  const request = pool.request()
    .input("enableQuickServe", sql.Bit, targetValue);

  let query = `
    UPDATE dbo.AppSettings
    SET EnableQuickServe = @enableQuickServe
  `;

  if (targetId) {
    request.input("id", sql.Int, targetId);
    query += ` WHERE Id = @id`;
  } else {
    query += ` WHERE Id = (SELECT TOP 1 Id FROM dbo.AppSettings)`;
  }

  const result = await request.query(query);
  return result;
}

/* ============================================================
   2. UPDATE QUICK SERVE (PUT /api/quickserve)
   Accepts: { enableQuickServe: 0 | 1 | true | false, id?: number }
============================================================ */
router.put("/quickserve", async (req, res) => {
  try {
    const pool = req.pool;
    if (!pool) {
      return res.status(400).json({ success: false, message: "Database connection not available" });
    }

    const rawVal = req.body.enableQuickServe !== undefined
      ? req.body.enableQuickServe
      : req.body.enabled;

    if (rawVal === undefined || rawVal === null) {
      return res.status(400).json({
        success: false,
        message: "enableQuickServe is required (must be 0 or 1)"
      });
    }

    // Strict validation: must be 0, 1, true, false, "0", "1", "true", "false"
    let val;
    if (rawVal === 1 || rawVal === "1" || rawVal === true || rawVal === "true") {
      val = 1;
    } else if (rawVal === 0 || rawVal === "0" || rawVal === false || rawVal === "false") {
      val = 0;
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid value. enableQuickServe must be 0 or 1"
      });
    }

    const targetId = req.body.id ? parseInt(req.body.id, 10) : undefined;
    const result = await updateQuickServeStatus(pool, val, targetId);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "AppSettings record not found to update"
      });
    }

    return res.status(200).json({
      success: true,
      message: `Quick Serve ${val === 1 ? "enabled" : "disabled"} successfully`,
      enableQuickServe: val
    });
  } catch (err) {
    console.error("UPDATE QUICK SERVE ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update Quick Serve status",
      error: err.message
    });
  }
});

/* ============================================================
   3. ENABLE QUICK SERVE (POST /api/quickserve/enable)
============================================================ */
router.post("/quickserve/enable", async (req, res) => {
  try {
    const pool = req.pool;
    if (!pool) {
      return res.status(400).json({ success: false, message: "Database connection not available" });
    }

    const targetId = req.body?.id ? parseInt(req.body.id, 10) : undefined;
    const result = await updateQuickServeStatus(pool, 1, targetId);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "AppSettings record not found to update"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Quick Serve enabled successfully",
      enableQuickServe: 1
    });
  } catch (err) {
    console.error("ENABLE QUICK SERVE ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to enable Quick Serve",
      error: err.message
    });
  }
});

/* ============================================================
   4. DISABLE QUICK SERVE (POST /api/quickserve/disable)
============================================================ */
router.post("/quickserve/disable", async (req, res) => {
  try {
    const pool = req.pool;
    if (!pool) {
      return res.status(400).json({ success: false, message: "Database connection not available" });
    }

    const targetId = req.body?.id ? parseInt(req.body.id, 10) : undefined;
    const result = await updateQuickServeStatus(pool, 0, targetId);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "AppSettings record not found to update"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Quick Serve disabled successfully",
      enableQuickServe: 0
    });
  } catch (err) {
    console.error("DISABLE QUICK SERVE ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to disable Quick Serve",
      error: err.message
    });
  }
});

module.exports = router;
