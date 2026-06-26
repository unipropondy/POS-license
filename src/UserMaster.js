import React, { useState, useEffect } from "react";
import "./usermaster.css";
import axios from "axios";
import { BASE_URL } from "./config/api";

export default function UserMaster({ dbName }) {

  const [users, setUsers] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [userGroups, setUserGroups] = useState([]);
  const [search, setSearch] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.UserId || null;

  const emptyForm = {
    UserId: "", UserCode: "", UserName: "", UserPassword: "",
    UserGroupId: "", FirstName: "", LastName: "", FullName: "",
    NickName: "", IdentificationNo: "", CardNumber: "",
    FromDate: "", ToDate: "", isWaiter: false, IsDisabled: false
  };

  const [form, setForm] = useState(emptyForm);
  const API = `${BASE_URL}/api/usermaster`;

  useEffect(() => {
    fetchUsers();
    fetchUserGroups();
  }, []);

  const generateUserCode = () => {
    const timePart = Date.now().toString().slice(-7);
    const randomPart = Math.floor(Math.random() * 900 + 100);
    return `USR${timePart}${randomPart}`;
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(API, { headers: { 'x-db-name': dbName } });
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.log(err); }
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

  const saveUser = async () => {
    const userCode = form.UserCode || generateUserCode();
    if (!form.UserName) { alert("User Name is required"); return; }
    try {
      const payload = {
        ...form, UserCode: userCode,
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
        FromDate: d.FromDate ? d.FromDate.split('T')[0] : "",
        ToDate: d.ToDate ? d.ToDate.split('T')[0] : "",
        isWaiter: d.isWaiter == 1, IsDisabled: d.IsDisabled == 1
      });
      setEditIndex(index); setShowModal(true);
    } catch (err) { console.log(err); }
  };

  const handleChangeDB = () => {
    localStorage.removeItem('selected_db');
    window.location.href = '/';
  };

  const fmt = (date) => date ? new Date(date).toLocaleDateString('en-GB') : null;

  const filtered = users.filter(u =>
    u.UserCode?.toLowerCase().includes(search.toLowerCase()) ||
    u.UserName?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = users.filter(u => !u.IsDisabled).length;
  const waiterCount = users.filter(u => u.isWaiter).length;

  return (
    <div className="um-container">
      {/* NAVBAR */}
      <nav className="um-navbar">
        <div className="um-nav-brand">
        </div>
        <div className="um-nav-right">
          <div className="um-db-badge">
            <div className="um-db-dot" />
            <span className="um-db-label">DB</span>
            <span className="um-db-name">{dbName || "UNKNOWN"}</span>
          </div>
          <button className="um-change-btn" onClick={handleChangeDB}>CHANGE</button>
          <button className="um-add-btn" onClick={() => {
            setForm({ ...emptyForm, UserCode: generateUserCode() });
            setEditIndex(null); setShowModal(true);
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            New User
          </button>
        </div>
      </nav>

      {/* STATS */}
      <div className="um-stats">
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
      </div>

      {/* TABLE */}
      <div className="um-table-section">
        <div className="um-table-card">
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
                <th>From Date</th>
                <th>To Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6">
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
        </div>
      </div>

      {/* MODAL */}
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
    </div>
  );
}
