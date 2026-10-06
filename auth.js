const API = API_BASE;

// REGISTER: create account and then move to Login page
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = document.getElementById('message');
    const data = {
      name: document.getElementById('name').value.trim(),
      studentId: document.getElementById('studentId').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value
    };

    try {
      const response = await fetch(API + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      message.innerText = result.message || 'Registration completed.';

      if (response.ok) {
        // Save student details for the next page
        localStorage.setItem('studentName', data.name);
        localStorage.setItem('studentId', data.studentId);
        localStorage.setItem('studentEmail', data.email);

        // Give the user a moment to read the success message
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1000);
      }
    } catch (error) {
      message.innerText = 'Backend not running. Start the server first.';
    }
  });
}

// LOGIN: verify account and then move to Menu page
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = document.getElementById('message');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const response = await fetch(API + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();
      message.innerText = result.message || 'Login completed.';

      if (response.ok) {
        localStorage.setItem('studentName', result.user.name);
        localStorage.setItem('studentId', result.user.studentId);
        localStorage.setItem('studentEmail', result.user.email);
        localStorage.removeItem('adminLoggedIn');

        setTimeout(() => {
          window.location.href = result.redirect || 'menu.html';
        }, 500);
      }
    } catch (error) {
      message.innerText = 'Backend not running. Start the server first.';
    }
  });
}

// ADMIN LOGIN
const adminForm = document.getElementById('adminForm');
if (adminForm) {
  adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = document.getElementById('adminMessage');
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    try {
      const response = await fetch(API + '/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();
      message.innerText = result.message || 'Login completed.';

      if (response.ok) {
        localStorage.setItem('adminLoggedIn', 'true');
        setTimeout(() => {
          window.location.href = result.redirect || 'admin.html';
        }, 500);
      }
    } catch (error) {
      message.innerText = 'Backend not running. Start the server first.';
    }
  });
}
