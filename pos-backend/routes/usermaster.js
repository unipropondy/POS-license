const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db");
const { v4: uuidv4 } = require("uuid");

/* ===============================
   🔥 PASSWORD ENCODE FUNCTION
================================*/
const encodePassword = (input) => {
  const original = (input || "").toString();
  const encoded = Buffer.from(original).toString("base64");
  return encoded;
};

/* ===============================
   GET ALL USERS
================================*/
router.get("/usermaster", async (req, res) => {
  try {
    const pool = req.pool;

    const result = await pool.request().query(`
      SELECT
        UserId,
        UserCode,
        UserName,
        UserGroupid AS UserGroupId,
        FromDate,
        ToDate,
        CreatedBy,
        CreatedOn
      FROM dbo.UserMaster
    `);

    res.json(result.recordset);

  } catch (err) {
    console.error("GET USER ERROR:", err.message);
    res.status(500).send(err.message);
  }
});

/* ===============================
   GET SINGLE USER
================================*/
router.get("/usermaster/:code", async (req, res) => {
  try {
    const pool = req.pool;

    const result = await pool.request()
      .input("code", sql.VarChar, req.params.code)
      .query(`
        SELECT
          UserId,
          UserCode,
          UserName,
          UserPassword,
          UserGroupid AS UserGroupId,  
          FirstName,
          LastName,
          FullName,
          NickName,
          IdentificationNo,
          CardNumber,
          FromDate,
          ToDate,
          isWaiter,
          IsDisabled,
          CreatedBy,
          CreatedOn
        FROM UserMaster
        WHERE UserCode = @code
      `);

    res.json(result.recordset[0]);

  } catch (err) {
    console.error("GET SINGLE USER ERROR:", err.message);
    res.status(500).send(err.message);
  }
});

/* ===============================
   INSERT OR UPDATE
================================*/
router.post("/usermaster", async (req, res) => {
  try {
    const pool = req.pool;

    const {
      UserId,
      UserCode, UserName, UserPassword,
      UserGroupId, FirstName, LastName, FullName, NickName,
      IdentificationNo, CardNumber, isWaiter, IsDisabled,
      FromDate, ToDate,
      CreatedBy
    } = req.body;

    // 🔥 PASSWORD ENCODE - only encode plain text passwords
    // If password looks like it's already Base64 encoded (from DB), don't re-encode
    const isAlreadyEncoded = (str) => {
      if (!str) return false;
      try {
        return Buffer.from(str, 'base64').toString('base64') === str;
      } catch { return false; }
    };
    const finalPassword = isAlreadyEncoded(UserPassword) ? UserPassword : encodePassword(UserPassword);

    // 🔥 CREATED INFO (from frontend)
    const createdBy = CreatedBy || "SYSTEM";
    const createdOn = new Date();

    const cleanUserId = (UserId && UserId.length === 36) ? UserId : null;
    const cleanGroupId = (UserGroupId && UserGroupId.length === 36) ? UserGroupId : null;

    /* ======================
       UPDATE
    ======================*/
    if (cleanUserId) {
      await pool.request()
        .input("UserId", sql.UniqueIdentifier, cleanUserId)
        .input("UserCode", sql.VarChar(100), UserCode)
        .input("UserName", sql.VarChar(200), UserName)
        .input("UserPassword", sql.VarChar(500), finalPassword)
        .input("UserGroupid", sql.UniqueIdentifier, cleanGroupId)
        .input("FirstName", sql.VarChar(200), FirstName || null)
        .input("LastName", sql.VarChar(200), LastName || null)
        .input("FullName", sql.VarChar(300), FullName || null)
        .input("NickName", sql.VarChar(200), NickName || null)
        .input("IdentificationNo", sql.VarChar(100), IdentificationNo || null)
        .input("CardNumber", sql.VarChar(100), CardNumber || null)
        .input("isWaiter", sql.Bit, isWaiter ? 1 : 0)
        .input("IsDisabled", sql.Bit, IsDisabled ? 1 : 0)
        .input("FromDate", sql.DateTime, FromDate ? new Date(FromDate) : null)
        .input("ToDate", sql.DateTime, ToDate ? new Date(ToDate) : null)
        .query(`
          UPDATE UserMaster SET
            UserCode=@UserCode,
            UserName=@UserName,
            UserPassword=@UserPassword,
            UserGroupid=@UserGroupid,
            FirstName=@FirstName,
            LastName=@LastName,
            FullName=@FullName,
            NickName=@NickName,
            IdentificationNo=@IdentificationNo,
            CardNumber=@CardNumber,
            isWaiter=@isWaiter,
            IsDisabled=@IsDisabled,
            FromDate=@FromDate,
            ToDate=@ToDate
          WHERE UserId=@UserId
        `);

      return res.json({ message: "User Updated" });
    }

    /* ======================
       INSERT
    ======================*/
    if (!UserName) {
      return res.status(400).json({ message: "UserName is required" });
    }

    const generateUserCode = () => {
      const timePart = Date.now().toString().slice(-7);
      const randomPart = Math.floor(Math.random() * 900 + 100);
      return `USR${timePart}${randomPart}`;
    };

    let finalUserCode = UserCode && UserCode.trim() ? UserCode.trim() : generateUserCode();

    let existingUser = await pool.request()
      .input("UserCode", sql.VarChar(50), finalUserCode)
      .query(`SELECT UserId FROM UserMaster WHERE UserCode = @UserCode`);

    while (existingUser.recordset.length) {
      finalUserCode = generateUserCode();
      existingUser = await pool.request()
        .input("UserCode", sql.VarChar(100), finalUserCode)
        .query(`SELECT UserId FROM UserMaster WHERE UserCode = @UserCode`);
    }

    await pool.request()
      .input("UserId", sql.UniqueIdentifier, uuidv4())
      .input("UserCode", sql.VarChar(100), finalUserCode)
      .input("UserName", sql.VarChar(200), UserName)
      .input("UserPassword", sql.VarChar(500), finalPassword)
      .input("UserGroupid", sql.UniqueIdentifier, cleanGroupId)
      .input("FirstName", sql.VarChar(200), FirstName || null)
      .input("LastName", sql.VarChar(200), LastName || null)
      .input("FullName", sql.VarChar(300), FullName || null)
      .input("NickName", sql.VarChar(200), NickName || null)
      .input("IdentificationNo", sql.VarChar(100), IdentificationNo || null)
      .input("CardNumber", sql.VarChar(100), CardNumber || null)
      .input("isWaiter", sql.Bit, isWaiter ? 1 : 0)
      .input("IsDisabled", sql.Bit, IsDisabled ? 1 : 0)
      .input("CreatedBy", sql.VarChar(200), createdBy)
      .input("CreatedOn", sql.DateTime, new Date())
      .input("FromDate", sql.DateTime, FromDate ? new Date(FromDate) : null)
      .input("ToDate", sql.DateTime, ToDate ? new Date(ToDate) : null)
      .query(`
        INSERT INTO UserMaster
        (
          UserId,UserCode,UserName,UserPassword,UserGroupid,
          FirstName,LastName,FullName,NickName,
          IdentificationNo,CardNumber,isWaiter,IsDisabled,
          FromDate,ToDate,
          CreatedBy,CreatedOn
        )
        VALUES
        (
          @UserId,@UserCode,@UserName,@UserPassword,@UserGroupid,
          @FirstName,@LastName,@FullName,@NickName,
          @IdentificationNo,@CardNumber,@isWaiter,@IsDisabled,
          @FromDate,@ToDate,
          @CreatedBy,GETDATE()
        )
      `);

    res.json({ message: "User Created" });

  } catch (err) {
    console.error("SAVE USER ERROR:", err.message);
    res.status(500).send(err.message);
  }
});

/* ===============================
   DELETE USER
================================*/
router.delete("/usermaster/:code", async (req, res) => {
  try {
    const pool = req.pool;

    await pool.request()
      .input("code", sql.VarChar, req.params.code)
      .query(`DELETE FROM UserMaster WHERE UserCode = @code`);

    res.json({ message: "User Deleted" });

  } catch (err) {
    console.error("DELETE USER ERROR:", err.message);
    res.status(500).send(err.message);
  }
});


router.get("/usergroupmaster", async (req, res) => {
  try {
    const pool = req.pool;

    const result = await pool.request().query(`
      SELECT
        UserGroupId,
        UserGroupCode,
        UserGroupName
      FROM UserGroupMaster
      ORDER BY UserGroupCode
    `);

    res.json(result.recordset);

  } catch (err) {
    console.error("GET USERGROUP ERROR:", err.message);
    res.status(500).send(err.message);
  }
});

module.exports = router;
