const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { sql } = require("../db");

const uuidv4 = () => crypto.randomUUID();

/* ===============================
   🔥 PASSWORD ENCODE FUNCTION
================================*/
const encodePassword = (input) => {
  const original = (input || "").toString();
  const encoded = Buffer.from(original).toString("base64");
  return encoded;
};

const ensureAllowedLogins = async (pool) => {
  try {
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'UserMaster' AND COLUMN_NAME = 'AllowedLogins'
      )
      BEGIN
        ALTER TABLE dbo.UserMaster ADD AllowedLogins INT DEFAULT 1;
      END

      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'UserMaster' AND COLUMN_NAME = 'isWaiter'
      )
      BEGIN
        ALTER TABLE dbo.UserMaster ADD isWaiter BIT DEFAULT 0;
      END
    `);
  } catch (err) {
    // Ignore if column already exists or schema query fails
  }
};

/* ===============================
   GET ALL USERS
================================*/
router.get("/usermaster", async (req, res) => {
  try {
    const pool = req.pool;
    await ensureAllowedLogins(pool);

    const result = await pool.request().query(`
      SELECT
        UserId,
        UserCode,
        UserName,
        UserGroupid AS UserGroupId,
        ISNULL(AllowedLogins, 1) AS AllowedLogins,
        ISNULL(isWaiter, 0) AS isWaiter,
        ISNULL(IsDisabled, 0) AS IsDisabled,
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
    await ensureAllowedLogins(pool);

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
          ISNULL(AllowedLogins, 1) AS AllowedLogins,
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
    await ensureAllowedLogins(pool);

    const {
      UserId,
      UserCode, UserName, UserPassword,
      UserGroupId, FirstName, LastName, FullName, NickName,
      IdentificationNo, CardNumber, isWaiter, IsDisabled,
      AllowedLogins,
      FromDate, ToDate,
      CreatedBy
    } = req.body;

    // 🔥 PASSWORD ENCODE - only encode plain text passwords
    const isAlreadyEncoded = (str) => {
      if (!str) return false;
      try {
        return Buffer.from(str, 'base64').toString('base64') === str;
      } catch { return false; }
    };
    const finalPassword = isAlreadyEncoded(UserPassword) ? UserPassword : encodePassword(UserPassword);

    const parsedLogins = AllowedLogins !== undefined && AllowedLogins !== null && AllowedLogins !== '' ? parseInt(AllowedLogins, 10) : 1;
    const finalAllowedLogins = isNaN(parsedLogins) ? 1 : parsedLogins;

    // Inspect column types dynamically to prevent type mismatch (e.g. UniqueIdentifier vs VarChar)
    const colsResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'UserMaster'
    `);
    const cols = new Map(colsResult.recordset.map(c => [c.COLUMN_NAME.toLowerCase(), c]));
    const hasCol = (name) => cols.has(name.toLowerCase());
    const isGuid = (val) => typeof val === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

    // Resolve UserGroupId
    let groupVal = null;
    let groupType = sql.UniqueIdentifier;
    const groupCol = cols.get('usergroupid');
    if (groupCol) {
      const dt = groupCol.DATA_TYPE.toLowerCase();
      if (dt === 'uniqueidentifier') {
        groupType = sql.UniqueIdentifier;
        if (isGuid(UserGroupId)) {
          groupVal = UserGroupId;
        } else if (groupCol.IS_NULLABLE === 'YES') {
          groupVal = null;
        } else {
          groupVal = '00000000-0000-0000-0000-000000000000';
        }
      } else if (dt.includes('int')) {
        groupType = sql.Int;
        groupVal = UserGroupId ? parseInt(UserGroupId, 10) : null;
      } else {
        groupType = sql.VarChar(100);
        groupVal = UserGroupId || null;
      }
    }

    // Resolve CreatedBy (prevents: Conversion failed when converting from a character string to uniqueidentifier)
    let createdByVal = null;
    let createdByType = sql.UniqueIdentifier;
    const createdByCol = cols.get('createdby');
    if (createdByCol) {
      const dt = createdByCol.DATA_TYPE.toLowerCase();
      if (dt === 'uniqueidentifier') {
        createdByType = sql.UniqueIdentifier;
        if (isGuid(CreatedBy)) {
          createdByVal = CreatedBy;
        } else if (createdByCol.IS_NULLABLE === 'YES') {
          createdByVal = null;
        } else {
          createdByVal = '00000000-0000-0000-0000-000000000000';
        }
      } else {
        createdByType = sql.VarChar(200);
        createdByVal = CreatedBy || 'SYSTEM';
      }
    }

    const cleanUserId = isGuid(UserId) ? UserId : null;

    /* ======================
       UPDATE
    ======================*/
    if (cleanUserId) {
      const updateFields = [
        'UserCode=@UserCode',
        'UserName=@UserName',
        'UserPassword=@UserPassword'
      ];
      const reqBuilder = pool.request();
      reqBuilder.input('UserId', sql.UniqueIdentifier, cleanUserId);
      reqBuilder.input('UserCode', sql.VarChar(100), UserCode);
      reqBuilder.input('UserName', sql.VarChar(200), UserName);
      reqBuilder.input('UserPassword', sql.VarChar(500), finalPassword);

      if (hasCol('UserGroupid')) {
        updateFields.push('UserGroupid=@UserGroupid');
        reqBuilder.input('UserGroupid', groupType, groupVal);
      }
      if (hasCol('FirstName')) {
        updateFields.push('FirstName=@FirstName');
        reqBuilder.input('FirstName', sql.VarChar(200), FirstName || null);
      }
      if (hasCol('LastName')) {
        updateFields.push('LastName=@LastName');
        reqBuilder.input('LastName', sql.VarChar(200), LastName || null);
      }
      if (hasCol('FullName')) {
        updateFields.push('FullName=@FullName');
        reqBuilder.input('FullName', sql.VarChar(300), FullName || null);
      }
      if (hasCol('NickName')) {
        updateFields.push('NickName=@NickName');
        reqBuilder.input('NickName', sql.VarChar(200), NickName || null);
      }
      if (hasCol('IdentificationNo')) {
        updateFields.push('IdentificationNo=@IdentificationNo');
        reqBuilder.input('IdentificationNo', sql.VarChar(100), IdentificationNo || null);
      }
      if (hasCol('CardNumber')) {
        updateFields.push('CardNumber=@CardNumber');
        reqBuilder.input('CardNumber', sql.VarChar(100), CardNumber || null);
      }
      if (hasCol('AllowedLogins')) {
        updateFields.push('AllowedLogins=@AllowedLogins');
        reqBuilder.input('AllowedLogins', sql.Int, finalAllowedLogins);
      }
      if (hasCol('isWaiter')) {
        updateFields.push('isWaiter=@isWaiter');
        reqBuilder.input('isWaiter', sql.Bit, isWaiter ? 1 : 0);
      }
      if (hasCol('IsDisabled')) {
        updateFields.push('IsDisabled=@IsDisabled');
        reqBuilder.input('IsDisabled', sql.Bit, IsDisabled ? 1 : 0);
      }
      if (hasCol('FromDate')) {
        updateFields.push('FromDate=@FromDate');
        reqBuilder.input('FromDate', sql.DateTime, FromDate ? new Date(FromDate) : null);
      }
      if (hasCol('ToDate')) {
        updateFields.push('ToDate=@ToDate');
        reqBuilder.input('ToDate', sql.DateTime, ToDate ? new Date(ToDate) : null);
      }

      await reqBuilder.query(`
        UPDATE UserMaster SET
          ${updateFields.join(', ')}
        WHERE UserId=@UserId
      `);

      return res.json({ message: 'User Updated' });
    }

    /* ======================
       INSERT
    ======================*/
    if (!UserName) {
      return res.status(400).json({ message: 'UserName is required' });
    }

    const generateUserCode = () => {
      const timePart = Date.now().toString().slice(-7);
      const randomPart = Math.floor(Math.random() * 900 + 100);
      return `USR${timePart}${randomPart}`;
    };

    let finalUserCode = UserCode && UserCode.trim() ? UserCode.trim() : generateUserCode();

    let existingUser = await pool.request()
      .input('UserCode', sql.VarChar(50), finalUserCode)
      .query(`SELECT UserId FROM UserMaster WHERE UserCode = @UserCode`);

    while (existingUser.recordset.length) {
      finalUserCode = generateUserCode();
      existingUser = await pool.request()
        .input('UserCode', sql.VarChar(100), finalUserCode)
        .query(`SELECT UserId FROM UserMaster WHERE UserCode = @UserCode`);
    }

    const reqBuilder = pool.request();
    const insertCols = ['UserId', 'UserCode', 'UserName', 'UserPassword'];
    const insertVals = ['@UserId', '@UserCode', '@UserName', '@UserPassword'];

    reqBuilder.input('UserId', sql.UniqueIdentifier, uuidv4());
    reqBuilder.input('UserCode', sql.VarChar(100), finalUserCode);
    reqBuilder.input('UserName', sql.VarChar(200), UserName);
    reqBuilder.input('UserPassword', sql.VarChar(500), finalPassword);

    if (hasCol('UserGroupid')) {
      insertCols.push('UserGroupid');
      insertVals.push('@UserGroupid');
      reqBuilder.input('UserGroupid', groupType, groupVal);
    }
    if (hasCol('FirstName')) {
      insertCols.push('FirstName');
      insertVals.push('@FirstName');
      reqBuilder.input('FirstName', sql.VarChar(200), FirstName || null);
    }
    if (hasCol('LastName')) {
      insertCols.push('LastName');
      insertVals.push('@LastName');
      reqBuilder.input('LastName', sql.VarChar(200), LastName || null);
    }
    if (hasCol('FullName')) {
      insertCols.push('FullName');
      insertVals.push('@FullName');
      reqBuilder.input('FullName', sql.VarChar(300), FullName || null);
    }
    if (hasCol('NickName')) {
      insertCols.push('NickName');
      insertVals.push('@NickName');
      reqBuilder.input('NickName', sql.VarChar(200), NickName || null);
    }
    if (hasCol('IdentificationNo')) {
      insertCols.push('IdentificationNo');
      insertVals.push('@IdentificationNo');
      reqBuilder.input('IdentificationNo', sql.VarChar(100), IdentificationNo || null);
    }
    if (hasCol('CardNumber')) {
      insertCols.push('CardNumber');
      insertVals.push('@CardNumber');
      reqBuilder.input('CardNumber', sql.VarChar(100), CardNumber || null);
    }
    if (hasCol('AllowedLogins')) {
      insertCols.push('AllowedLogins');
      insertVals.push('@AllowedLogins');
      reqBuilder.input('AllowedLogins', sql.Int, finalAllowedLogins);
    }
    if (hasCol('isWaiter')) {
      insertCols.push('isWaiter');
      insertVals.push('@isWaiter');
      reqBuilder.input('isWaiter', sql.Bit, isWaiter ? 1 : 0);
    }
    if (hasCol('IsDisabled')) {
      insertCols.push('IsDisabled');
      insertVals.push('@IsDisabled');
      reqBuilder.input('IsDisabled', sql.Bit, IsDisabled ? 1 : 0);
    }
    if (hasCol('FromDate')) {
      insertCols.push('FromDate');
      insertVals.push('@FromDate');
      reqBuilder.input('FromDate', sql.DateTime, FromDate ? new Date(FromDate) : null);
    }
    if (hasCol('ToDate')) {
      insertCols.push('ToDate');
      insertVals.push('@ToDate');
      reqBuilder.input('ToDate', sql.DateTime, ToDate ? new Date(ToDate) : null);
    }
    if (hasCol('CreatedBy')) {
      insertCols.push('CreatedBy');
      insertVals.push('@CreatedBy');
      reqBuilder.input('CreatedBy', createdByType, createdByVal);
    }
    if (hasCol('CreatedOn')) {
      insertCols.push('CreatedOn');
      insertVals.push('GETDATE()');
    }

    await reqBuilder.query(`
      INSERT INTO UserMaster (${insertCols.join(', ')})
      VALUES (${insertVals.join(', ')})
    `);

    res.json({ message: 'User Created' });

  } catch (err) {
    console.error('SAVE USER ERROR:', err.message);
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
