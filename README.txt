SMART CANTEEN PRE-ORDER SYSTEM

RUN BACKEND:
1. Open PowerShell in this backend folder.
2. Run: npm install
3. Run: npm start
4. Keep the terminal open.
5. Expected: Server running at http://localhost:5000

QUICK BACKEND CHECK:
Open http://localhost:5000/api/health in a browser.
It should show JSON with status: Backend running.

MONGODB:
Start MongoDB before placing orders. The backend starts even if MongoDB takes a few seconds to connect.
Database: smart_canteen

GMAIL:
Edit backend/.env:
EMAIL_USER=your Gmail address
EMAIL_PASS=your Gmail App Password (not normal Gmail password)

STUDENT FLOW:
Register -> Login -> Menu -> Place Order -> Order receipt email -> My Orders

ADMIN LOGIN:
Email: admin@gmail.com
Password: admin123

FRONTEND:
Open frontend/index.html with VS Code Live Server.
