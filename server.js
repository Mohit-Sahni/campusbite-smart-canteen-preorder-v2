const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

// NODE/EXPRESS CONCEPT: import project middleware and a separate Express Router.
const requestLogger = require('./middleware/logger');
const canteenRoutes = require('./routes/canteenRoutes');

const app = express();

// Middleware: read JSON data and allow frontend requests
app.use(express.json());
app.use(cors());

// EXPRESS MIDDLEWARE CONCEPT: log every request before routing.
app.use(requestLogger);

// EXPRESS ROUTING CONCEPT: mount extra canteen routes under /api/canteen.
app.use('/api/canteen', canteenRoutes);

// Serve the frontend directly from Express so the project can run without Live Server.
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// MongoDB connection
// Start Express immediately so the frontend can always reach the backend.
// Mongoose will keep trying to reconnect if MongoDB starts a little later.
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_canteen', {
  serverSelectionTimeoutMS: 3000
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection pending:', err.message));

mongoose.connection.on('connected', () => console.log('MongoDB connection ready'));
mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected - waiting to reconnect...'));
mongoose.connection.on('error', err => console.log('MongoDB error:', err.message));

const User = require('./models/User');
const Order = require('./models/Order');

// EMAIL CONNECTION: Gmail App Password is stored only in .env
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function emailReady() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS && !process.env.EMAIL_PASS.includes('PASTE_'));
}

// Send welcome email after account creation
async function sendWelcomeEmail(user) {
  if (!emailReady()) return false;

  await transporter.sendMail({
    from: `CampusBite Smart Canteen <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'CampusBite - Account Created Successfully',
    text: `Hello ${user.name},\n\nYour Smart Canteen account has been created successfully.\n\nStudent ID: ${user.studentId}\nEmail: ${user.email}\n\nYou can now login and place your canteen pre-orders.\n\nRegards,\nCampusBite Smart Canteen`
  });

  return true;
}

// Send the complete order receipt to the SAME email used for student login.
// The email includes token, ordered food, total, pickup DATE and pickup TIME SLOT.
async function sendOrderEmail(order, user) {
  const recipient = order.studentEmail || user?.email;
  if (!emailReady() || !recipient) return false;

  const itemLines = order.items.map(item => `${item.name} - Rs.${item.price}`).join('\n');
  const prettyDate = order.pickupDate ? new Date(`${order.pickupDate}T00:00:00+05:30`).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata'
  }) : 'Not assigned';

  const htmlItems = order.items.map(item =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${item.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">Rs.${item.price}</td></tr>`
  ).join('');

  await transporter.sendMail({
    from: `CampusBite Smart Canteen <${process.env.EMAIL_USER}>`,
    to: recipient,
    subject: `CampusBite Order Confirmed - Token #${order.tokenNumber} | Pickup ${prettyDate}`,
    text: `Hello ${order.studentName},\n\nYour Smart Canteen order has been placed successfully.\n\nTOKEN NUMBER: ${order.tokenNumber}\nSTUDENT ID: ${order.studentId}\n\nORDER DETAILS\n${itemLines}\n\nTOTAL AMOUNT: Rs.${order.total}\nORDER STATUS: ${order.status}\n\nPICKUP DATE: ${prettyDate}\nPICKUP TIME SLOT: ${order.pickupSlot}\n\nPlease collect your order during the pickup slot using Token #${order.tokenNumber}.\n\nThank you,\nCampusBite Smart Canteen`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
        <div style="background:#f47b20;color:white;padding:20px">
          <h2 style="margin:0">CampusBite Smart Canteen</h2>
          <p style="margin:6px 0 0">Order Confirmation & Pickup Details</p>
        </div>
        <div style="padding:22px">
          <p>Hello <b>${order.studentName}</b>,</p>
          <p>Your order has been placed successfully.</p>
          <div style="background:#fff4e8;border-radius:10px;padding:15px;margin:16px 0">
            <p><b>🎫 Token Number:</b> ${order.tokenNumber}</p>
            <p><b>Student ID:</b> ${order.studentId}</p>
            <p><b>Order Status:</b> ${order.status}</p>
          </div>
          <h3>🍔 Order Details</h3>
          <table style="width:100%;border-collapse:collapse"><tbody>${htmlItems}</tbody></table>
          <p style="font-size:18px"><b>Total Amount: Rs.${order.total}</b></p>
          <div style="background:#eaf8ee;border-radius:10px;padding:15px;margin-top:18px">
            <h3 style="margin-top:0">📅 Pickup Details</h3>
            <p><b>Pickup Date:</b> ${prettyDate}</p>
            <p><b>Pickup Time Slot:</b> ${order.pickupSlot}</p>
          </div>
          <p style="margin-top:20px">Please collect your order during the pickup slot using <b>Token #${order.tokenNumber}</b>.</p>
          <p>Thank you,<br><b>CampusBite Smart Canteen</b></p>
        </div>
      </div>`
  });

  return true;
}

// Send status update to the same login email, including pickup date and time.
async function sendStatusEmail(order) {
  if (!emailReady() || !order.studentEmail) return false;

  const prettyDate = order.pickupDate ? new Date(`${order.pickupDate}T00:00:00+05:30`).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata'
  }) : 'Not assigned';

  await transporter.sendMail({
    from: `CampusBite Smart Canteen <${process.env.EMAIL_USER}>`,
    to: order.studentEmail,
    subject: `CampusBite Order #${order.tokenNumber} - ${order.status}`,
    text: `Hello ${order.studentName},\n\nYour Smart Canteen order status is now: ${order.status}.\n\nToken Number: ${order.tokenNumber}\nPickup Date: ${prettyDate}\nPickup Time Slot: ${order.pickupSlot}\nTotal: Rs.${order.total}\n\nThank you,\nCampusBite Smart Canteen`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #eee;border-radius:12px;padding:22px"><h2>CampusBite Order Update</h2><p>Hello <b>${order.studentName}</b>,</p><p>Your order status is now <b>${order.status}</b>.</p><p><b>Token:</b> ${order.tokenNumber}</p><p><b>Pickup Date:</b> ${prettyDate}</p><p><b>Pickup Time Slot:</b> ${order.pickupSlot}</p><p><b>Total:</b> Rs.${order.total}</p></div>`
  });

  return true;
}

// REAL-TIME CONCEPT: Server-Sent Events clients for student order updates.
const orderStreamClients = new Map();

function addOrderStreamClient(studentId, response) {
  if (!orderStreamClients.has(studentId)) orderStreamClients.set(studentId, new Set());
  orderStreamClients.get(studentId).add(response);
}

function removeOrderStreamClient(studentId, response) {
  const clients = orderStreamClients.get(studentId);
  if (!clients) return;
  clients.delete(response);
  if (clients.size === 0) orderStreamClients.delete(studentId);
}

function broadcastStudentOrderUpdate(studentId, order) {
  const clients = orderStreamClients.get(studentId);
  if (!clients) return;

  const payload = JSON.stringify({
    tokenNumber: order.tokenNumber,
    status: order.status,
    pickupDate: order.pickupDate,
    pickupSlot: order.pickupSlot
  });

  for (const client of clients) {
    client.write(`event: order-update\ndata: ${payload}\n\n`);
  }
}

// ROUTING: register a student
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, studentId, email, password } = req.body;

    // Validation: required fields, email format and password length
    if (!name || !studentId || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email' });
    }
    if (await User.findOne({ $or: [{ email }, { studentId }] })) {
      return res.status(409).json({ message: 'Email or Student ID already registered' });
    }

    const user = await User.create({ name, studentId, email, password, role: 'student' });

    let emailSent = false;
    try { emailSent = await sendWelcomeEmail(user); }
    catch (e) { console.log('Welcome email error:', e.message); }

    res.status(201).json({
      message: emailSent
        ? 'Account created successfully. Welcome email sent.'
        : 'Account created successfully. Add your Gmail App Password in backend/.env to enable email.',
      redirect: 'login.html'
    });
  } catch (e) {
    console.log('Register error:', e.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ROUTING: student login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email, password, role: 'student' });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    res.json({
      message: 'Login successful',
      redirect: 'menu.html',
      user: { name: user.name, studentId: user.studentId, email: user.email }
    });
  } catch (e) {
    console.log('Login error:', e.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ROUTING: fixed classroom/demo admin login
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Admin email and password are required' });
    }

    if (email !== 'admin@gmail.com' || password !== 'admin123') {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    res.json({ message: 'Admin login successful', redirect: 'admin.html', admin: { email } });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// REAL-TIME PICKUP SLOT: creates the next available 15-minute slot using IST.
function getPickupDetails() {
  const now = new Date();
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(now).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));

  const currentIST = new Date(Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  ));

  const roundedMinutes = Math.ceil(currentIST.getUTCMinutes() / 15) * 15;
  const pickupStartUTC = new Date(currentIST);
  pickupStartUTC.setUTCSeconds(0, 0);
  pickupStartUTC.setUTCMinutes(roundedMinutes + 15);

  const pickupEndUTC = new Date(pickupStartUTC);
  pickupEndUTC.setUTCMinutes(pickupStartUTC.getUTCMinutes() + 15);

  const formatTime = date => date.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
  });
  const formatDate = date => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // IST is UTC+05:30, so convert the IST wall-clock time to a real UTC timestamp.
  const toRealUTC = date => new Date(date.getTime() - (5 * 60 + 30) * 60 * 1000);
  const pickupStart = toRealUTC(pickupStartUTC);
  const pickupEnd = toRealUTC(pickupEndUTC);

  return {
    pickupDate: formatDate(pickupStart),
    pickupSlot: `${formatTime(pickupStart)} - ${formatTime(pickupEnd)}`,
    pickupStart: pickupStart.toISOString(),
    pickupEnd: pickupEnd.toISOString()
  };
}

// Keep older MongoDB orders compatible: assign pickup details if they were created before this feature.
async function ensurePickupDetails(order) {
  if (order.pickupDate && order.pickupSlot && order.pickupStart && order.pickupEnd) return order;
  const pickup = getPickupDetails();
  order.pickupDate = pickup.pickupDate;
  order.pickupSlot = pickup.pickupSlot;
  order.pickupStart = pickup.pickupStart;
  order.pickupEnd = pickup.pickupEnd;
  await order.save();
  return order;
}

// ROUTING: create canteen order
app.post('/api/orders', async (req, res) => {
  try {
    const { studentName, studentId, studentEmail, items, total } = req.body;

    // Validation: student details, login email and at least one food item are required.
    if (!studentName || !studentId || !studentEmail || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Student details, login email and food items are required' });
    }

    // Confirm that the email belongs to the logged-in student account.
    const user = await User.findOne({ email: studentEmail, studentId, role: 'student' });
    if (!user) return res.status(401).json({ message: 'Login session is invalid. Please login again.' });

    // Get the next numeric token number
    const last = await Order.findOne({ tokenNumber: { $type: 'number' } }).sort({ tokenNumber: -1 });
    const tokenNumber = last ? Number(last.tokenNumber) + 1 : 1;

    const pickup = getPickupDetails();
    const order = await Order.create({
      studentName,
      studentId,
      studentEmail: user.email,
      items,
      total: Number(total),
      tokenNumber,
      pickupDate: pickup.pickupDate,
      pickupSlot: pickup.pickupSlot,
      pickupStart: pickup.pickupStart,
      pickupEnd: pickup.pickupEnd
    });

    let emailSent = false;
    try { emailSent = await sendOrderEmail(order, user); }
    catch (e) { console.log('Order email error:', e.message); }

    // Push the new order immediately to an open My Orders page.
    broadcastStudentOrderUpdate(studentId, order);

    res.status(201).json({
      message: emailSent
        ? 'Order placed successfully. Bill sent to your login email.'
        : 'Order placed successfully. Add your Gmail App Password in backend/.env to enable email.',
      tokenNumber: order.tokenNumber,
      pickupDate: order.pickupDate,
      pickupSlot: order.pickupSlot,
      pickupStart: order.pickupStart,
      pickupEnd: order.pickupEnd,
      emailSent,
      emailTo: order.studentEmail
    });
  } catch (e) {
    console.log('Order error:', e.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// REAL-TIME ROUTING: open a Server-Sent Events stream for the logged-in student.
app.get('/api/orders/stream/:studentId', (req, res) => {
  const studentId = req.params.studentId;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Live order connection active' })}\n\n`);

  addOrderStreamClient(studentId, res);
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeOrderStreamClient(studentId, res);
  });
});

// ROUTING: get orders by student ID
app.get('/api/orders/student/:studentId', async (req, res) => {
  try {
    const orders = await Order.find({ studentId: req.params.studentId }).sort({ createdAt: -1 });

    // Backward compatibility: older orders may not have pickup/email fields.
    // Add pickup details in memory so the API never fails because of an old document.
    for (const order of orders) {
      if (!order.pickupDate || !order.pickupSlot || !order.pickupStart || !order.pickupEnd) {
        const pickup = getPickupDetails();
        order.pickupDate = pickup.pickupDate;
        order.pickupSlot = pickup.pickupSlot;
        order.pickupStart = pickup.pickupStart;
        order.pickupEnd = pickup.pickupEnd;
      }
    }

    res.json(orders);
  } catch (e) {
    console.error('Get student orders error:', e);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

// ADMIN ROUTING: view all orders
app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    for (const order of orders) {
      if (!order.pickupDate || !order.pickupSlot || !order.pickupStart || !order.pickupEnd) {
        const pickup = getPickupDetails();
        order.pickupDate = pickup.pickupDate;
        order.pickupSlot = pickup.pickupSlot;
        order.pickupStart = pickup.pickupStart;
        order.pickupEnd = pickup.pickupEnd;
      }
    }
    res.json(orders);
  } catch (e) {
    console.error('Get admin orders error:', e);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

// ADMIN ROUTING: update order status and notify the student by email + live stream.
app.put('/api/admin/orders/:id/status', async (req, res) => {
  try {
    const allowed = ['Placed', 'Preparing', 'Ready', 'Completed'];
    const { status } = req.body;
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid order status' });

    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    let emailSent = false;
    try { emailSent = await sendStatusEmail(order); }
    catch (e) { console.log('Status email error:', e.message); }

    // Immediately notify the student's My Orders page.
    broadcastStudentOrderUpdate(order.studentId, order);

    res.json({ message: emailSent ? 'Order status updated and email sent' : 'Order status updated', order, emailSent });
  } catch (e) {
    console.log('Status error:', e.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Frontend entry point. Open http://localhost:5000 to use the project directly.
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Health check: useful for quickly testing Node + Express from the browser.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Backend running',
    service: 'Smart Canteen API',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'connecting'
  });
});

const PORT = Number(process.env.PORT) || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Close the old Node server and run npm start again.`);
  } else {
    console.error('Server error:', error.message);
  }
});
