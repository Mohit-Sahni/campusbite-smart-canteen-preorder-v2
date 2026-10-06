// MY ORDERS: automatically load orders for the logged-in student
const studentId = localStorage.getItem('studentId');
const ordersBox = document.getElementById('orders');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

function countdownText(order) {
  if (!order.pickupStart) return 'Pickup slot assigned';
  const start = new Date(order.pickupStart).getTime();
  const end = order.pickupEnd ? new Date(order.pickupEnd).getTime() : start;
  const now = Date.now();
  if (now < start) {
    const diff = start - now;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `Starts in ${mins}m ${secs}s`;
  }
  if (now <= end) return '🟢 Pickup slot is LIVE now';
  return 'Pickup slot completed';
}

function renderOrders(data) {
  if (!Array.isArray(data) || data.length === 0) {
    ordersBox.innerHTML = '<div class="order-card"><p>No orders found.</p></div>';
    return;
  }

  ordersBox.innerHTML = data.map(order => `
    <div class="order-card">
      <h3>🎫 Token: ${escapeHtml(order.tokenNumber)}</h3>
      <p><b>Student:</b> ${escapeHtml(order.studentName)}</p>
      <p><b>Items:</b> ${order.items.map(i => escapeHtml(i.name)).join(', ')}</p>
      <p><b>Total:</b> ₹${escapeHtml(order.total)}</p>
      <p><b>Status:</b> <span class="live-status">${escapeHtml(order.status || 'Placed')}</span></p>
      <p><b>Pickup Date:</b> ${escapeHtml(order.pickupDate || 'Will be assigned')}</p>
      <p><b>Pickup Slot:</b> ${escapeHtml(order.pickupSlot || 'Will be assigned')}</p>
      <p><b>Live Pickup:</b> <span class="pickup-countdown" data-start="${escapeHtml(order.pickupStart || '')}" data-end="${escapeHtml(order.pickupEnd || '')}">${countdownText(order)}</span></p>
    </div>
  `).join('');
}

async function loadOrders() {
  if (!studentId) {
    ordersBox.innerHTML = '<div class="order-card"><p>Please login first.</p></div>';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/orders/student/${encodeURIComponent(studentId)}`);
    const data = await response.json();
    if (!response.ok) throw new Error('Unable to load orders');
    renderOrders(data);
  } catch (error) {
    ordersBox.innerHTML = '<div class="order-card"><p>Backend not running.</p></div>';
  }
}

// REAL-TIME CONCEPT: receive instant order/status updates from Express SSE.
function connectLiveOrders() {
  if (!studentId || !window.EventSource) return;

  const source = new EventSource(`${API_BASE}/api/orders/stream/${encodeURIComponent(studentId)}`);
  source.addEventListener('order-update', () => loadOrders());
  source.onerror = () => {
    // Browser will automatically try to reconnect to the SSE endpoint.
  };
}

function updateCountdowns() {
  document.querySelectorAll('.pickup-countdown').forEach(el => {
    const start = el.dataset.start;
    const end = el.dataset.end;
    if (!start) return;
    const now = Date.now();
    const startMs = new Date(start).getTime();
    const endMs = end ? new Date(end).getTime() : startMs;
    if (now < startMs) {
      const diff = startMs - now;
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      el.textContent = `Starts in ${mins}m ${secs}s`;
    } else if (now <= endMs) {
      el.textContent = '🟢 Pickup slot is LIVE now';
    } else {
      el.textContent = 'Pickup slot completed';
    }
  });
}

loadOrders();
connectLiveOrders();
setInterval(updateCountdowns, 1000);
// Fallback refresh keeps the page updated if SSE is unavailable.
setInterval(loadOrders, 30000);
