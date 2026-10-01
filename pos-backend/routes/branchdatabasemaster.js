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

/* ===============================
   GET SINGLE BRANCH DATABASE RECORD
================================*/
router.get("/branchdatabasemaster/:branchCode", async (req, res) => {
  try {
    const pool = await getPool("UNIPRO");
    const result = await pool.request()
      .input("BranchCode", sql.VarChar, req.params.branchCode)
      .query(`
        SELECT
          BranchCode,
          DatabaseName
        FROM dbo.BranchDatabaseMaster
        WHERE BranchCode = @BranchCode
      `);
    if (result.recordset.length === 0) {
      return res.status(404).send("Branch not found");
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("GET SINGLE BRANCH ERROR:", err.message);
    res.status(500).send(err.message);
  }
});

/* ===============================
   CREATE NEW BRANCH DATABASE RECORD
================================*/
router.post("/branchdatabasemaster", async (req, res) => {
  const { BranchCode, DatabaseName } = req.body;
  if (!BranchCode || !DatabaseName) {
    return res.status(400).send("BranchCode and DatabaseName are required");
  }
  try {
    const pool = await getPool("UNIPRO");
    await pool.request()
      .input("BranchCode", sql.VarChar, BranchCode)
      .input("DatabaseName", sql.VarChar, DatabaseName)
      .query(`
        INSERT INTO dbo.BranchDatabaseMaster (BranchCode, DatabaseName)
        VALUES (@BranchCode, @DatabaseName)
      `);
    res.status(201).send("Created successfully");
  } catch (err) {
    console.error("CREATE BRANCH ERROR:", err.message);
    res.status(500).send(err.message);
  }
});

/* ===============================
   UPDATE BRANCH DATABASE RECORD
================================*/
router.put("/branchdatabasemaster/:branchCode", async (req, res) => {
  const { BranchCode, DatabaseName } = req.body;
  if (!DatabaseName) {
    return res.status(400).send("DatabaseName is required");
  }
  try {
    const pool = await getPool("UNIPRO");
    const result = await pool.request()
      .input("OldBranchCode", sql.VarChar, req.params.branchCode)
      .input("NewBranchCode", sql.VarChar, BranchCode || req.params.branchCode)
      .input("DatabaseName", sql.VarChar, DatabaseName)
      .query(`
        UPDATE dbo.BranchDatabaseMaster
        SET BranchCode = @NewBranchCode, DatabaseName = @DatabaseName
        WHERE BranchCode = @OldBranchCode
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).send("Branch not found");
    }
    res.send("Updated successfully");
  } catch (err) {
    console.error("UPDATE BRANCH ERROR:", err.message);
    res.status(500).send(err.message);
  }
});

/* ===============================
   DELETE BRANCH DATABASE RECORD
================================*/
router.delete("/branchdatabasemaster/:branchCode", async (req, res) => {
  try {
    const pool = await getPool("UNIPRO");
    const result = await pool.request()
      .input("BranchCode", sql.VarChar, req.params.branchCode)
      .query(`
        DELETE FROM dbo.BranchDatabaseMaster
        WHERE BranchCode = @BranchCode
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).send("Branch not found");
    }
    res.send("Deleted successfully");
  } catch (err) {
    console.error("DELETE BRANCH ERROR:", err.message);
    res.status(500).send(err.message);
  }
});

module.exports = router;
