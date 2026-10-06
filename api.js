// API BASE URL
// If the frontend is opened from the Express server (port 5000), use the same origin.
// If Live Server is used (for example port 5504), connect to the backend on port 5000.
const API_BASE = (window.location.port === '5000') ? '' : 'http://localhost:5000';
