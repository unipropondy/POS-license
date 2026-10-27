import React, { useState, useEffect } from "react";
import "./usermaster.css";
import axios from "axios";
import { BASE_URL } from "./config/api";

export default function UserMaster({ dbName, onDbChange }) {

  // ─── TAB STATE ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("username"); // "username" | "companycode" | "quickserve"

  // ─── USER NAME TAB STATE ────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [userGroups, setUserGroups] = useState([]);
  const [search, setSearch] = useState("");

  // ─── COMPANY CODE TAB STATE ─────────────────────────────────────────────────
  const [branches, setBranches] = useState([]);
  const [branchSearch, setBranchSearch] = useState("");
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchError, setBranchError] = useState(null);
  
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editBranchIndex, setEditBranchIndex] = useState(null);
  const emptyBranchForm = { BranchCode: "", DatabaseName: "", OriginalBranchCode: "" };
  const [branchForm, setBranchForm] = useState(emptyBranchForm);

  // ─── QUICK SERVE TAB STATE ──────────────────────────────────────────────────
  const [quickServeEnabled, setQuickServeEnabled] = useState(false);
  const [quickServeLoading, setQuickServeLoading] = useState(false);
  const [quickServeSaving, setQuickServeSaving] = useState(false);
  const [quickServeMessage, setQuickServeMessage] = useState(null);
  const [quickServeDetails, setQuickServeDetails] = useState(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.UserId || null;

  const emptyForm = {
    UserId: "", UserCode: "", UserName: "", UserPassword: "",
    UserGroupId: "", FirstName: "", LastName: "", FullName: "",
    NickName: "", IdentificationNo: "", CardNumber: "",
    AllowedLogins: 1,
    FromDate: "", ToDate: "", isWaiter: false, IsDisabled: false
  };

  const [form, setForm] = useState(emptyForm);
  const API = `${BASE_URL}/api/usermaster`;
  const BRANCH_API = `${BASE_URL}/api/branchdatabasemaster`;
  const QUICKSERVE_API = `${BASE_URL}/api/quickserve`;

  const [usersLoading, setUsersLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchUserGroups();
    fetchQuickServe();
  }, [dbName]);

  // Fetch branches when Company Code tab is activated for the first time
  useEffect(() => {
    if (activeTab === "companycode" && branches.length === 0) {
      fetchBranches();
    }
    if (activeTab === "quickserve") {
      fetchQuickServe();
    }
  }, [activeTab]);

  // ─── USER NAME TAB FUNCTIONS ────────────────────────────────────────────────
  const generateUserCode = () => {
    const timePart = Date.now().toString().slice(-7);
    const randomPart = Math.floor(Math.random() * 900 + 100);
    return `USR${timePart}${randomPart}`;
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    setDbError(null);
    try {
      const res = await axios.get(API, { headers: { 'x-db-name': dbName } });
      setUsers(Array.isArray(res.data) ? res.data : []);
      setDbError(null);
    } catch (err) {
      console.error("Fetch users error:", err);
      localStorage.removeItem('selected_db');
      const errMsg = err.response?.data?.message || err.message || "Failed to connect to database.";
      const errDetails = err.response?.data?.error || "";
      setDbError({
        databaseName: dbName,
        message: errMsg,
        details: errDetails
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchUserGroups = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/usergroupmaster`, { headers: { 'x-db-name': dbName } });
      setUserGroups(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.log(err); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleBranchChange = (e) => {
    const { name, value } = e.target;
    setBranchForm(prev => ({ ...prev, [name]: value }));
  };

  const saveUser = async () => {
    const userCode = form.UserCode || generateUserCode();
    if (!form.UserName) { alert("User Name is required"); return; }
    try {
      const payload = {
        ...form, UserCode: userCode,
        AllowedLogins: form.AllowedLogins !== undefined && form.AllowedLogins !== '' ? parseInt(form.AllowedLogins, 10) : 1,
        isWaiter: form.isWaiter ? 1 : 0,
        IsDisabled: form.IsDisabled ? 1 : 0,
        CreatedBy: userId || "SYSTEM"
      };
      await axios.post(API, payload, { headers: { 'x-db-name': dbName } });
      alert(editIndex !== null ? "User Updated ✅" : "User Saved ✅");
      setForm(emptyForm); setShowModal(false); setEditIndex(null);
      fetchUsers();
    } catch (err) { console.log(err); alert("Failed to save user."); }
  };

  const deleteUser = async (code) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await axios.delete(`${API}/${code}`, { headers: { 'x-db-name': dbName } });
      fetchUsers();
    } catch (err) { console.log(err); }
  };

  const openEdit = async (user, index) => {
    try {
      const res = await axios.get(`${API}/${user.UserCode}`, { headers: { 'x-db-name': dbName } });
      const d = res.data;
      setForm({
        UserId: d.UserId || "", UserCode: d.UserCode || "",
        UserName: d.UserName || "", UserPassword: d.UserPassword || "",
        UserGroupId: d.UserGroupId || "", FirstName: d.FirstName || "",
        LastName: d.LastName || "", FullName: d.FullName || "",
        NickName: d.NickName || "", IdentificationNo: d.IdentificationNo || "",
        CardNumber: d.CardNumber || "",
        AllowedLogins: d.AllowedLogins !== undefined && d.AllowedLogins !== null ? d.AllowedLogins : 1,
        FromDate: d.FromDate ? d.FromDate.split('T')[0] : "",
        ToDate: d.ToDate ? d.ToDate.split('T')[0] : "",
        isWaiter: d.isWaiter == 1, IsDisabled: d.IsDisabled == 1
      });
      setEditIndex(index); setShowModal(true);
    } catch (err) { console.log(err); }
  };

  const handleChangeDB = () => {
    localStorage.removeItem('selected_db');
    if (typeof onDbChange === 'function') {
      onDbChange();
    } else {
      window.location.href = '/';
    }
  };

  const fmt = (date) => date ? new Date(date).toLocaleDateString('en-GB') : null;

  const filtered = users.filter(u =>
    u.UserCode?.toLowerCase().includes(search.toLowerCase()) ||
    u.UserName?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = users.filter(u => !u.IsDisabled).length;
  const waiterCount = users.filter(u => u.isWaiter).length;

  // ─── COMPANY CODE TAB FUNCTIONS ─────────────────────────────────────────────
  const fetchBranches = async () => {
    setBranchLoading(true);
    setBranchError(null);
    try {
      // BranchDatabaseMaster lives in the UNIPRO DB; backend uses fixed pool
      const res = await axios.get(BRANCH_API, { headers: { 'x-db-name': dbName } });
      setBranches(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setBranchError("Failed to load company codes. Please try again.");
    } finally {
      setBranchLoading(false);
    }
  };

  const saveBranch = async () => {
    if (!branchForm.BranchCode || !branchForm.DatabaseName) {
      alert("Branch Code and Database Name are required");
      return;
    }
    try {
      if (editBranchIndex !== null) {
        // Use OriginalBranchCode for the URL to find the record, and send the new BranchCode in the body
        await axios.put(`${BRANCH_API}/${branchForm.OriginalBranchCode}`, branchForm, { headers: { 'x-db-name': dbName } });
        alert("Company Code Updated ✅");
      } else {
        await axios.post(BRANCH_API, branchForm, { headers: { 'x-db-name': dbName } });
        alert("Company Code Saved ✅");
      }
      setBranchForm(emptyBranchForm);
      setShowBranchModal(false);
      setEditBranchIndex(null);
      fetchBranches();
    } catch (err) {
      console.log(err);
      alert("Failed to save company code.");
    }
  };

  const deleteBranch = async (code) => {
    if (!window.confirm("Delete this company code?")) return;
    try {
      await axios.delete(`${BRANCH_API}/${code}`, { headers: { 'x-db-name': dbName } });
      fetchBranches();
    } catch (err) {
      console.log(err);
    }
  };

  const openEditBranch = (branch, index) => {
    setBranchForm({
      OriginalBranchCode: branch.BranchCode,
      BranchCode: branch.BranchCode || "",
      DatabaseName: branch.DatabaseName || ""
    });
    setEditBranchIndex(index);
    setShowBranchModal(true);
  };

  const filteredBranches = branches.filter(b =>
    b.BranchCode?.toLowerCase().includes(branchSearch.toLowerCase()) ||
    b.DatabaseName?.toLowerCase().includes(branchSearch.toLowerCase())
  );

  // ─── QUICK SERVE TAB FUNCTIONS ──────────────────────────────────────────────
  const fetchQuickServe = async () => {
    setQuickServeLoading(true);
    try {
      const res = await axios.get(QUICKSERVE_API, {
        headers: { 'x-db-name': dbName },
        params: { db: dbName }
      });
      if (res.data && res.data.success) {
        setQuickServeEnabled(res.data.enableQuickServe === 1);
        setQuickServeDetails({ id: res.data.id, shopName: res.data.shopName });
      }
    } catch (err) {
      console.error("Failed to fetch Quick Serve status:", err);
      if (activeTab === "quickserve") {
        setQuickServeMessage({
          type: "error",
          text: err.response?.data?.message || err.message || "Failed to load Quick Serve settings from database."
        });
      }
    } finally {
      setQuickServeLoading(false);
    }
  };

  const handleToggleQuickServe = async () => {
    if (quickServeSaving || quickServeLoading) return;
    const previousState = quickServeEnabled;
    const nextState = !quickServeEnabled;
    const targetValue = nextState ? 1 : 0;

    // Optimistic update
    setQuickServeEnabled(nextState);
    setQuickServeSaving(true);
    setQuickServeMessage(null);

    try {
      const res = await axios.put(
        QUICKSERVE_API,
        { enableQuickServe: targetValue, id: quickServeDetails?.id },
        {
          headers: { 'x-db-name': dbName },
          params: { db: dbName }
        }
      );

      if (res.data && res.data.success) {
        setQuickServeMessage({
          type: "success",
          text: `Quick Serve ${nextState ? "ON / Enabled (1)" : "OFF / Disabled (0)"} successfully saved to database (${dbName || "default"}).`
        });
      } else {
        throw new Error(res.data?.message || "Failed to update Quick Serve status");
      }
    } catch (err) {
      console.error("Error updating Quick Serve:", err);
      // Restore previous state on error
      setQuickServeEnabled(previousState);
      setQuickServeMessage({
        type: "error",
        text: err.response?.data?.message || err.message || "Failed to update Quick Serve in database. Restored previous state."
      });
    } finally {
      setQuickServeSaving(false);
    }
  };

  return (
    <div className="um-container">
      {/* NAVBAR */}
      <nav className="um-navbar">
        <div className="um-nav-brand">
          <div className="um-nav-icon">🛡️</div>
          <div className="um-nav-title">POS License Master</div>
        </div>
        <div className="um-nav-right">
          <div className="um-db-badge" style={{ borderColor: dbError ? '#ef4444' : undefined }}>
            <div className="um-db-dot" style={{ background: dbError ? '#ef4444' : undefined, boxShadow: dbError ? '0 0 8px rgba(239,68,68,0.8)' : undefined }} />
            <span className="um-db-label">DB</span>
            <span className="um-db-name" style={{ color: dbError ? '#f87171' : undefined }}>{dbName || "UNKNOWN"}</span>
          </div>
          <button className="um-change-btn" onClick={handleChangeDB}>CHANGE</button>
          {!dbError && activeTab === "username" && (
            <button className="um-add-btn" onClick={() => {
              setForm({ ...emptyForm, UserCode: generateUserCode() });
              setEditIndex(null); setShowModal(true);
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              New User
            </button>
          )}
          {!dbError && activeTab === "companycode" && (
            <button className="um-add-btn" onClick={() => {
              setBranchForm(emptyBranchForm);
              setEditBranchIndex(null); setShowBranchModal(true);
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              New Company Code
            </button>
          )}
          {!dbError && activeTab === "quickserve" && (
            <button
              className="um-refresh-btn"
              onClick={fetchQuickServe}
              disabled={quickServeLoading || quickServeSaving}
              title="Refresh Quick Serve status from database"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className={quickServeLoading ? "um-spin" : ""}
              >
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Refresh Status
            </button>
          )}
        </div>
      </nav>

      {/* ERROR VIEW (Shown if database is unknown or misspelled) */}
      {dbError ? (
        <div className="um-db-error-card">
          <div className="um-db-error-icon">⚠️</div>
          <div className="um-db-error-badge">Database Connection Failed</div>
          <h2 className="um-db-error-title">
            Cannot reach database <code>{dbError.databaseName || dbName}</code>
          </h2>
          <p className="um-db-error-desc">
            {dbError.message || `Database "${dbError.databaseName || dbName}" does not exist on SQL Server. Please verify the spelling or select a valid branch below.`}
          </p>

          {branches && branches.length > 0 && (
            <div className="um-db-error-branches">
              <div className="um-db-error-branches-title">Or switch to an active branch:</div>
              <div className="um-db-error-chips">
                {branches.map((b) => (
                  <button
                    key={b.DatabaseName}
                    type="button"
                    className="um-db-error-chip"
                    onClick={() => {
                      if (typeof onDbChange === "function") {
                        onDbChange(b.DatabaseName);
                      } else {
                        localStorage.setItem("selected_db", b.DatabaseName);
                        window.location.href = window.location.pathname;
                      }
                    }}
                  >
                    <span className="um-db-error-chip-code">{b.BranchCode}</span>
                    <span className="um-db-error-chip-name">{b.DatabaseName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="um-db-error-actions">
            <button className="um-db-change-btn" onClick={handleChangeDB}>
              🏢 Back to Database Selection
            </button>
            <button className="um-db-retry-btn" onClick={fetchUsers}>
              🔄 Retry Connection
            </button>
          </div>
        </div>
      ) : (
        <>
      <div className="um-stats">
        {activeTab === "username" ? (
          <>
            <div className="um-stat-card">
              <div className="um-stat-icon purple">👥</div>
              <div>
                <div className="um-stat-value">{users.length}</div>
                <div className="um-stat-label">Total Users</div>
              </div>
            </div>
            <div className="um-stat-card">
              <div className="um-stat-icon green">✅</div>
              <div>
                <div className="um-stat-value">{activeCount}</div>
                <div className="um-stat-label">Active Users</div>
              </div>
            </div>
            <div className="um-stat-card">
              <div className="um-stat-icon gold">🍽️</div>
              <div>
                <div className="um-stat-value">{waiterCount}</div>
                <div className="um-stat-label">Waiters</div>
              </div>
            </div>
          </>
        ) : activeTab === "companycode" ? (
          <>
            <div className="um-stat-card">
              <div className="um-stat-icon purple">🏢</div>
              <div>
                <div className="um-stat-value">{branches.length}</div>
                <div className="um-stat-label">Total Companies</div>
              </div>
            </div>
            <div className="um-stat-card">
              <div className="um-stat-icon green">✅</div>
              <div>
                <div className="um-stat-value">{branches.length}</div>
                <div className="um-stat-label">Active Companies</div>
              </div>
            </div>
            <div className="um-stat-card">
              <div className="um-stat-icon gold">🗄️</div>
              <div>
                <div className="um-stat-value">{filteredBranches.length}</div>
                <div className="um-stat-label">Filtered Results</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="um-stat-card">
              <div className={`um-stat-icon ${quickServeEnabled ? "green" : "gold"}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3.5 13.5H11.5L10.5 22L20.5 10.5H12.5L13 2Z" />
                </svg>
              </div>
              <div>
                <div className="um-stat-value" style={{ fontSize: "18px" }}>
                  {quickServeLoading ? "Checking..." : (quickServeEnabled ? "ON / Enabled" : "OFF / Disabled")}
                </div>
                <div className="um-stat-label">Quick Serve Status</div>
              </div>
            </div>
            <div className="um-stat-card">
              <div className="um-stat-icon purple">🗄️</div>
              <div>
                <div className="um-stat-value" style={{ fontSize: "18px" }}>{dbName || "Default"}</div>
                <div className="um-stat-label">Connected Database</div>
              </div>
            </div>
            <div className="um-stat-card">
              <div className="um-stat-icon gold">⚙️</div>
              <div>
                <div className="um-stat-value" style={{ fontSize: "18px" }}>AppSettings</div>
                <div className="um-stat-label">EnableQuickServe Column</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* TABLE SECTION */}
      <div className="um-table-section">
        <div className="um-table-card">

          {/* ── TABS ── */}
          <div className="um-tabs">
            <button
              className={`um-tab${activeTab === "username" ? " um-tab-active" : ""}`}
              onClick={() => setActiveTab("username")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
              User Name
            </button>
            <button
              className={`um-tab${activeTab === "companycode" ? " um-tab-active" : ""}`}
              onClick={() => setActiveTab("companycode")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              Company Code
            </button>
            <button
              className={`um-tab${activeTab === "quickserve" ? " um-tab-active" : ""}`}
              onClick={() => setActiveTab("quickserve")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Quick Serve
            </button>
          </div>

          {/* ── USER NAME TAB CONTENT ── */}
          {activeTab === "username" && (
            <>
              <div className="um-table-header">
                <div className="um-table-title">
                  All Users
                  <span className="um-user-count">{filtered.length}</span>
                </div>
                <div className="um-search-box">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  <input
                    className="um-search-input"
                    placeholder="Search users..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <table className="um-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>User Code</th>
                    <th>User Name</th>
                    <th>Allowed Logins</th>
                    <th>From Date</th>
                    <th>To Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan="7">
                        <div className="um-table-loading">
                          <div className="um-table-spinner" />
                          <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
                            Loading data from database [{dbName}]...
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <div className="um-empty">
                          <div className="um-empty-icon">👤</div>
                          <div className="um-empty-text">No users found</div>
                          <div className="um-empty-sub">Click "New User" to add your first user</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((u, i) => (
                      <tr key={u.UserId}>
                        <td style={{ color: 'var(--text-dim)', fontSize: '12px', width: '48px' }}>{i + 1}</td>
                        <td><span className="um-code-chip">{u.UserCode}</span></td>
                        <td><span className="um-username">{u.UserName}</span></td>
                        <td>
                          <span className="um-logins-pill" title={`${u.AllowedLogins ?? 1} session(s) allowed`}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <span>Allowed:</span>
                            <span className="um-logins-count">{u.AllowedLogins ?? 1}</span>
                          </span>
                        </td>
                        <td>
                          {fmt(u.FromDate)
                            ? <span className="um-date-pill">📅 {fmt(u.FromDate)}</span>
                            : <span className="um-date-pill empty">—</span>}
                        </td>
                        <td>
                          {fmt(u.ToDate)
                            ? <span className="um-date-pill">📅 {fmt(u.ToDate)}</span>
                            : <span className="um-date-pill empty">—</span>}
                        </td>
                        <td>
                          <div className="um-actions">
                            <button className="um-edit-btn" onClick={() => openEdit(u, i)}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              Edit
                            </button>
                            <button className="um-del-btn" onClick={() => deleteUser(u.UserCode)}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}

          {/* ── COMPANY CODE TAB CONTENT ── */}
          {activeTab === "companycode" && (
            <>
              <div className="um-table-header">
                <div className="um-table-title">
                  Company Codes
                  <span className="um-user-count">{filteredBranches.length}</span>
                </div>
                <div className="um-search-box">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  <input
                    className="um-search-input"
                    placeholder="Search company codes..."
                    value={branchSearch}
                    onChange={e => setBranchSearch(e.target.value)}
                  />
                </div>
              </div>

              <table className="um-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Branch Code</th>
                    <th>Database Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branchLoading ? (
                    <tr>
                      <td colSpan="4">
                        <div className="um-empty">
                          <div className="um-empty-icon um-spin">⏳</div>
                          <div className="um-empty-text">Loading company codes...</div>
                        </div>
                      </td>
                    </tr>
                  ) : branchError ? (
                    <tr>
                      <td colSpan="4">
                        <div className="um-empty">
                          <div className="um-empty-icon">⚠️</div>
                          <div className="um-empty-text">{branchError}</div>
                          <button className="um-save-btn" style={{ marginTop: 12 }} onClick={fetchBranches}>
                            Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredBranches.length === 0 ? (
                    <tr>
                      <td colSpan="4">
                        <div className="um-empty">
                          <div className="um-empty-icon">🏢</div>
                          <div className="um-empty-text">No company codes found</div>
                          <div className="um-empty-sub">
                            {branchSearch ? "Try a different search term." : "No records in BranchDatabaseMaster."}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBranches.map((b, i) => (
                      <tr key={b.BranchCode}>
                        <td style={{ color: 'var(--text-dim)', fontSize: '12px', width: '48px' }}>{i + 1}</td>
                        <td><span className="um-code-chip">{b.BranchCode}</span></td>
                        <td><span className="um-username">{b.DatabaseName}</span></td>
                        <td>
                          <div className="um-actions">
                            <button className="um-edit-btn" onClick={() => openEditBranch(b, i)}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              Edit
                            </button>
                            <button className="um-del-btn" onClick={() => deleteBranch(b.BranchCode)}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}

          {/* ── QUICK SERVE TAB CONTENT ── */}
          {activeTab === "quickserve" && (
            <div className="qs-wrapper">
              {/* Feedback alert message */}
              {quickServeMessage && (
                <div className={`qs-alert ${quickServeMessage.type}`}>
                  <span>{quickServeMessage.text}</span>
                  <button className="qs-alert-close" onClick={() => setQuickServeMessage(null)}>×</button>
                </div>
              )}

              {/* Master Control Banner */}
              <div className={`qs-master-card ${quickServeEnabled ? "is-active" : ""}`}>
                <div className="qs-master-left">
                  <div className={`qs-master-icon ${quickServeEnabled ? "active" : ""}`}>
                    {quickServeEnabled ? (
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="qsBoltActive" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="100%" stopColor="#FFF7ED" />
                          </linearGradient>
                          <filter id="qsBoltShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.22)" />
                          </filter>
                        </defs>
                        <path
                          d="M13 2L3.5 13.5H11.5L10.5 22L20.5 10.5H12.5L13 2Z"
                          fill="url(#qsBoltActive)"
                          stroke="#FFFFFF"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter="url(#qsBoltShadow)"
                        />
                      </svg>
                    ) : (
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M13 2L3.5 13.5H11.5L10.5 22L20.5 10.5H12.5L13 2Z"
                          fill="#94a3b8"
                          stroke="#64748b"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="qs-master-details">
                    <div className="qs-header-row">
                      <h2 className="qs-main-title">Quick Serve Express Mode</h2>
                      <span className={`qs-status-pill ${quickServeEnabled ? "online" : "offline"}`}>
                        <span className="qs-status-pulse" />
                        {quickServeEnabled ? "Active & Online" : "Currently Disabled"}
                      </span>
                    </div>
                    <p className="qs-main-desc">
                      Accelerate counter operations by bypassing table selection and summary review screens.
                      When enabled, orders are directly processed for immediate payment and dispatched instantly to kitchen and receipt printers.
                    </p>
                  </div>
                </div>

                <div className="qs-master-right">
                  <div className="qs-switch-container">
                    <span className={`qs-switch-state-text ${quickServeEnabled ? "on" : "off"}`}>
                      {quickServeEnabled ? "ON" : "OFF"}
                    </span>
                    <label className="qs-switch-large" title={`Click to turn Quick Serve ${quickServeEnabled ? "OFF" : "ON"}`}>
                      <input
                        type="checkbox"
                        role="switch"
                        checked={quickServeEnabled}
                        onChange={handleToggleQuickServe}
                        disabled={quickServeSaving || quickServeLoading}
                      />
                      <span className="qs-slider-large" />
                    </label>
                  </div>

                  <button
                    className={`qs-action-btn ${quickServeEnabled ? "turn-off" : "turn-on"}`}
                    onClick={handleToggleQuickServe}
                    disabled={quickServeSaving || quickServeLoading}
                  >
                    {quickServeSaving
                      ? "Saving..."
                      : quickServeEnabled
                      ? "Turn OFF Quick Serve"
                      : "Turn ON Quick Serve"}
                  </button>
                </div>
              </div>

              {/* Capabilities & Information Row */}
              <div className="qs-features-row">
                <div className="qs-feature-card">
                  <div className="qs-feature-icon-badge">⚡</div>
                  <h3 className="qs-feature-title">Express Checkout</h3>
                  <p className="qs-feature-desc">
                    Skips unnecessary popups and table allocation. Cashiers complete transactions with 1-tap tender for faster customer turnaround.
                  </p>
                  <span className="qs-feature-tag">Speed Optimized</span>
                </div>

                <div className="qs-feature-card">
                  <div className="qs-feature-icon-badge">🍳</div>
                  <h3 className="qs-feature-title">Instant KOT Dispatch</h3>
                  <p className="qs-feature-desc">
                    Tickets are routed automatically to Kitchen Display Screens (KDS) and counter prep printers without cashier holding delays.
                  </p>
                  <span className="qs-feature-tag">Zero Waiting</span>
                </div>

                <div className="qs-feature-card">
                  <div className="qs-feature-icon-badge">🏢</div>
                  <h3 className="qs-feature-title">Store Scope</h3>
                  <p className="qs-feature-desc">
                    Configuration applies across all POS terminals and cash registers connected to database <strong>{dbName || "default"}</strong>.
                  </p>
                  <span className="qs-feature-tag">{dbName || "Default Database"}</span>
                </div>
              </div>

              {/* Synchronized Database Details Bar */}
              <div className="qs-sync-bar">
                <div className="qs-sync-left">
                  <div className="qs-sync-item">
                    <span>🗄️ Database:</span>
                    <span className="qs-sync-code">{dbName || "DEFAULT"}</span>
                  </div>
                  <div className="qs-sync-item">
                    <span>📋 Table:</span>
                    <span className="qs-sync-code">dbo.AppSettings</span>
                  </div>
                  <div className="qs-sync-item">
                    <span>🏷️ Column:</span>
                    <span className="qs-sync-code">EnableQuickServe ({quickServeEnabled ? "1" : "0"})</span>
                  </div>
                </div>

                <div className="qs-sync-right">
                  <span>● Real-time SQL Sync Active</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      </>
      )}

      {/* MODAL (User Name tab only) */}
      {showModal && (
        <div className="um-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="um-modal">
            <div className="um-modal-header">
              <div className="um-modal-title-wrap">
                <div className="um-modal-icon">{editIndex !== null ? "✏️" : "➕"}</div>
                <div>
                  <div className="um-modal-title">{editIndex !== null ? "Edit User" : "Add New User"}</div>
                  <div className="um-modal-sub">{editIndex !== null ? "Update user information" : "Fill in the details to create a new user"}</div>
                </div>
              </div>
              <button className="um-close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            {/* Account Info */}
            <div className="um-modal-section">
              <div className="um-section-label">Account Information</div>
            </div>
            <div className="um-form-grid">
              {[
                ["User Code", "UserCode", "text", true],
                ["User Name", "UserName", "text", false],
                ["Password", "UserPassword", "password", false],
              ].map(([label, name, type, ro]) => (
                <div className="um-field" key={name}>
                  <label className="um-label">{label}</label>
                  <input
                    className={`um-input${ro && editIndex === null ? " readonly" : ""}`}
                    name={name} type={type} value={form[name]}
                    onChange={handleChange}
                    readOnly={ro && editIndex === null}
                  />
                </div>
              ))}
              <div className="um-field">
                <label className="um-label">User Group</label>
                <select className="um-select" name="UserGroupId" value={form.UserGroupId} onChange={handleChange}>
                  <option value="">Select Group</option>
                  {userGroups.map((g, i) => (
                    <option key={i} value={g.UserGroupId}>{g.UserGroupName}</option>
                  ))}
                </select>
              </div>

              {/* Allowed Logins */}
              <div className="um-field full">
                <label className="um-label">
                  Allowed Logins (Simultaneous Devices / Sessions)
                </label>
                <div className="um-number-stepper-wrap">
                  <div className="um-stepper-controls">
                    <button
                      type="button"
                      className="um-stepper-btn"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        AllowedLogins: Math.max(1, (parseInt(prev.AllowedLogins, 10) || 1) - 1)
                      }))}
                      disabled={Number(form.AllowedLogins) <= 1}
                      title="Decrease logins"
                    >
                      −
                    </button>
                    <input
                      className="um-input um-stepper-input"
                      name="AllowedLogins"
                      type="number"
                      min="1"
                      max="99"
                      value={form.AllowedLogins}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="um-stepper-btn"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        AllowedLogins: (parseInt(prev.AllowedLogins, 10) || 1) + 1
                      }))}
                      title="Increase logins"
                    >
                      +
                    </button>

                    {/* Quick Choose Number Pills */}
                    <div className="um-quick-pills" style={{ marginLeft: '10px' }}>
                      <span className="um-quick-pills-label">Quick select:</span>
                      {[1, 2, 3, 5, 10].map(num => (
                        <button
                          key={num}
                          type="button"
                          className={`um-preset-pill ${parseInt(form.AllowedLogins, 10) === num ? "active" : ""}`}
                          onClick={() => setForm(prev => ({ ...prev, AllowedLogins: num }))}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Info */}
            <div className="um-modal-section" style={{ marginTop: 20 }}>
              <div className="um-section-label">Personal Information</div>
            </div>
            <div className="um-form-grid">
              {[
                ["First Name", "FirstName", "text"],
                ["Last Name", "LastName", "text"],
                ["Full Name", "FullName", "text"],
                ["Nick Name", "NickName", "text"],
                ["Identification No", "IdentificationNo", "text"],
                ["Card Number", "CardNumber", "text"],
              ].map(([label, name, type]) => (
                <div className="um-field" key={name}>
                  <label className="um-label">{label}</label>
                  <input className="um-input" name={name} type={type} value={form[name]} onChange={handleChange} />
                </div>
              ))}
            </div>

            {/* Validity */}
            <div className="um-modal-section" style={{ marginTop: 20 }}>
              <div className="um-section-label">Validity Period</div>
            </div>
            <div className="um-form-grid">
              <div className="um-field">
                <label className="um-label">From Date</label>
                <input className="um-input" name="FromDate" type="date" value={form.FromDate} onChange={handleChange} />
              </div>
              <div className="um-field">
                <label className="um-label">To Date</label>
                <input className="um-input" name="ToDate" type="date" value={form.ToDate} onChange={handleChange} />
              </div>
            </div>

            {/* Flags */}
            <div className="um-checkbox-row">
              <label className="um-check-label">
                <input type="checkbox" name="isWaiter" checked={form.isWaiter} onChange={handleChange} />
                🍽️ Is Waiter
              </label>
              <label className="um-check-label">
                <input type="checkbox" name="IsDisabled" checked={form.IsDisabled} onChange={handleChange} />
                🚫 Is Disabled
              </label>
            </div>

            <div className="um-modal-footer">
              <button className="um-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="um-save-btn" onClick={saveUser}>
                {editIndex !== null ? "Update User" : "Save User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL (Company Code tab only) */}
      {showBranchModal && (
        <div className="um-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowBranchModal(false); }}>
          <div className="um-modal" style={{ maxWidth: '500px' }}>
            <div className="um-modal-header">
              <div className="um-modal-title-wrap">
                <div className="um-modal-icon">{editBranchIndex !== null ? "✏️" : "➕"}</div>
                <div>
                  <div className="um-modal-title">{editBranchIndex !== null ? "Edit Company Code" : "Add New Company Code"}</div>
                  <div className="um-modal-sub">{editBranchIndex !== null ? "Update company details" : "Fill in the details to create a new company code"}</div>
                </div>
              </div>
              <button className="um-close-btn" onClick={() => setShowBranchModal(false)}>×</button>
            </div>

            <div className="um-modal-section">
              <div className="um-section-label">Company Information</div>
            </div>
            <div className="um-form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div className="um-field">
                <label className="um-label">Branch Code</label>
                <input
                  className="um-input"
                  name="BranchCode" type="text" value={branchForm.BranchCode}
                  onChange={handleBranchChange}
                />
              </div>
              <div className="um-field">
                <label className="um-label">Database Name</label>
                <input
                  className="um-input"
                  name="DatabaseName" type="text" value={branchForm.DatabaseName}
                  onChange={handleBranchChange}
                />
              </div>
            </div>

            <div className="um-modal-footer">
              <button className="um-cancel-btn" onClick={() => setShowBranchModal(false)}>Cancel</button>
              <button className="um-save-btn" onClick={saveBranch}>
                {editBranchIndex !== null ? "Update Company Code" : "Save Company Code"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
