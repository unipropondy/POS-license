import React, { useEffect, useState, useCallback } from "react";
import "./pos-kds.css";

import { BASE_URL } from "./config/api";

export default function PosKds({ dbName }) {
  const [orders, setOrders] = useState([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readyItems, setReadyItems] = useState(new Set());
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);

  const handleReadyClick = (orderId) => {
    setConfirmingOrderId(orderId);
  };

  const confirmReady = async (orderId) => {
    console.log("Clicked YES:", orderId);

    if (!orderId) {
      console.log("orderId is NULL ❌");
      return;
    }

    try {
      const headers = { 
        'Content-Type': 'application/json',
        'x-db-name': dbName
      };

      const response = await fetch(`${BASE_URL}/mark-ready`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ orderId }),
      });

      console.log("Response status:", response.status);

      const data = await response.json();
      console.log("Response data:", data);

      if (response.ok) {
        setOrders(prev => prev.filter(o => o.orderId !== orderId));
        setConfirmingOrderId(null);
      } else {
        console.error(data.message);
      }

    } catch (err) {
      console.error('Error confirming ready:', err);
    }
  };
  const cancelReady = () => {
    setConfirmingOrderId(null);
  };

  const toggleItemReady = (orderId, idx) => {
    const key = `${orderId}-${idx}`;
    setReadyItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const fetchOrders = useCallback(async () => {
    try {
      const headers = { 'x-db-name': dbName };
      const res = await fetch(`${BASE_URL}/kds-today`, { headers });
      const data = await res.json();
      setOrders(groupOrders(data));
    } catch (err) {
      console.log("Error fetching orders:", err);
    }
  }, [dbName]);

  useEffect(() => {
    fetchOrders();
    const timer = setInterval(() => setNow(new Date()), 1000);
    const refresh = setInterval(fetchOrders, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(refresh);
    };
  }, [fetchOrders]);

  const groupOrders = (data) => {
    const grouped = {};
    data.forEach((item) => {
      if (!grouped[item.OrderId]) {
        grouped[item.OrderId] = {
          orderId: item.OrderId,
          tableNo: item.Tableno,
          orderNumber: item.OrderNumber,
          orderTime: item.OrderDateTime,
          isTakeAway: item.IsTakeAway,
          section: item.SectionName, // Fallback if not provided
          items: [],
        };
      }
      grouped[item.OrderId].items.push({
        dish: item.DishName,
        qty: item.Quantity,
        modifier: item.ModifierDescription,
        remark: item.Remarks,
      });
    });
    return Object.values(grouped);
  };

  const getTime = (time) => {
    let diff = now.getTime() - new Date(time).getTime();
    if (diff < 0) diff = 0;
    let totalSec = Math.floor(diff / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return {
      text: `${min}:${sec.toString().padStart(2, "0")}`,
      min,
    };
  };

  const getStatus = (min) => {
    if (min <= 15) return { color: "var(--fresh)", label: "ON TRACK", class: "fresh" };
    if (min <= 30) return { color: "var(--running)", label: "RUNNING LONG", class: "running" };
    return { color: "var(--overdue)", label: "OVERDUE", class: "overdue" };
  };

  const getSummary = () => {
    let fresh = 0, running = 0, overdue = 0;
    orders.forEach(o => {
      const t = getTime(o.orderTime).min;
      if (t <= 15) fresh++;
      else if (t <= 30) running++;
      else overdue++;
    });
    return { fresh, running, overdue };
  };

  const summary = getSummary();

  const handleChangeDB = () => {
    localStorage.removeItem('selected_db');
    window.location.search = ''; // Trigger selector
  };

  return (
    <div className="kds-container">
      {/* HEADER */}
      <header className="top-header">

        <div className="title-area">
          <div className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><path d="M6 1v3M10 1v3M14 1v3" /></svg>
          </div>
          <h1>
            KDS 
            <span className="db-badge-container">
              <span className="db-badge">{dbName}</span>
              <button className="db-change-btn" onClick={handleChangeDB}>Change</button>
            </span>
          </h1>
        </div>

        <div className="order-count">
          <span className="order-badge">{orders.length}</span>
          <span>orders</span>
        </div>
      </header>

      {/* SUMMARY BAR */}
      {/* <section className="summary-bar">
        <div className="summary-item">
          <span className="dot fresh"></span>
          <span>{summary.fresh}</span>
          <span style={{ color: '#999' }}>0-15m Fresh</span>
        </div>
        <div className="summary-item">
          <span className="dot running"></span>
          <span>{summary.running}</span>
          <span style={{ color: '#999' }}>15-30m Running Long</span>
        </div>
        <div className="summary-item">
          <span className="dot overdue"></span>
          <span>{summary.overdue}</span>
          <span style={{ color: '#999' }}>30m+ Overdue</span>
        </div>
      </section> */}

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        <div className="grid-wrapper">
          <div className="grid">
            {orders.map((order) => {
              const time = getTime(order.orderTime);
              const status = getStatus(time.min);

              return (
                <article
                  key={order.orderId}
                  className="card"
                  style={{ borderTopColor: status.color }}
                >
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">{order.section} • Table {order.tableNo}</h2>
                      <p className="order-id">#{order.orderNumber}</p>
                    </div>
                  </div>

                  {/* <div className="kitchen-label">THAI KITCHEN</div> */}

                  <div className="item-list">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="item-row" onClick={() => toggleItemReady(order.orderId, idx)}>
                        <div className="item-qty">{item.qty}x</div>
                        <div className="item-info">
                          <div className="item-name">
                            {item.dish}
                          </div>
                          {item.modifier && <div className="item-modifier">{item.modifier}</div>}
                          {item.remark && <div className="item-remark">• {item.remark}</div>}
                          {(order.isTakeAway === 1 || item.isNew) && (
                            <div className="badge-row">
                              {order.isTakeAway === 1 && (
                                <span className="badge takeaway">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                                  TAKEAWAY
                                </span>
                              )}
                              {time.min <= 2 && (
                                <span className="badge new">NEW</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="item-radio">
                          <div className={`switch-toggle ${readyItems.has(`${order.orderId}-${idx}`) ? 'on' : 'off'}`}>
                            <div className="switch-handle" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="ready-btn-container">
                    <button className="ready-btn" onClick={() => handleReadyClick(order.orderId)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      Ready to Serve
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* SIDE NAVIGATION */}
        {/* <aside className="side-nav">
          <button className="nav-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
          </button>
          <button className="nav-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </button>
        </aside> */}
      </main>

      {confirmingOrderId && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h3>Complete Order?</h3>
            <p>Are you sure this order is ready to serve?</p>
            <div className="confirm-actions">
              {/* <button className="confirm-btn yes" onClick={() => confirmReady(confirmingOrderId)}>YES</button> */}
              <button className="confirm-btn yes" onClick={() => confirmingOrderId && confirmReady(confirmingOrderId)}>YES</button>
              <button className="confirm-btn no" onClick={cancelReady}>NO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

