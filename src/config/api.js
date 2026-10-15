// Detect if frontend is running on local machine
const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1");

export const BASE_URL =
  process.env.REACT_APP_API_URL ||
  (isLocal
    ? "http://localhost:5000"
    : "https://pos-license-production.up.railway.app");

export default BASE_URL;