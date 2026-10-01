const express = require("express");
const router = express.Router();
const { sql, getPool } = require("../db");

/* ===============================
   GET ALL BRANCH DATABASE RECORDS
   Always queries the UNIPRO database
================================*/
router.get("/branchdatabasemaster", async (req, res) => {
  try {
    // BranchDatabaseMaster lives in the UNIPRO master database
    const pool = await getPool("UNIPRO");

    const result = await pool.request().query(`
      SELECT
        BranchCode,
        DatabaseName
      FROM dbo.BranchDatabaseMaster
      ORDER BY BranchCode
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("GET BRANCHDATABASEMASTER ERROR:", err.message);
    res.status(500).send(err.message);
  }
});

module.exports = router;
