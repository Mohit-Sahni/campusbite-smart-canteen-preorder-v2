const menuItems = [
  {name:"Veg Burger", price:50, icon:"🍔"},
  {name:"Cheese Burger", price:70, icon:"🍔"},
  {name:"Pizza", price:90, icon:"🍕"},
  {name:"Veg Sandwich", price:45, icon:"🥪"},
  {name:"Masala Dosa", price:60, icon:"🥞"},
  {name:"Idli Sambar", price:40, icon:"🍚"},
  {name:"Veg Noodles", price:70, icon:"🍜"},
  {name:"Fried Rice", price:80, icon:"🍚"},
  {name:"Paneer Roll", price:65, icon:"🌯"},
  {name:"Samosa", price:20, icon:"🥟"},
  {name:"French Fries", price:45, icon:"🍟"},
  {name:"Cold Coffee", price:50, icon:"🥤"},
  {name:"Lemon Juice", price:30, icon:"🍋"},
  {name:"Tea", price:15, icon:"☕"}
];

let cart = [];

// LOGIN DATA: use the logged-in student's details automatically
const savedName = localStorage.getItem('studentName');
const savedStudentId = localStorage.getItem('studentId');
const savedEmail = localStorage.getItem('studentEmail');

if (!savedName || !savedStudentId) {
  alert('Please login first to place a canteen order.');
  window.location.href = 'login.html';
}

function showMenu() {
  const menu = document.getElementById('menu');
  menu.innerHTML = menuItems.map((item, i) => `
    <div class="food-card">
      <h2>${item.icon}</h2>
      <h3>${item.name}</h3>
      <p class="price">₹${item.price}</p>
      <button onclick="addToCart(${i})">Add</button>
    </div>
  `).join('');
}

function addToCart(i) {
  cart.push(menuItems[i]);
  showCart();
}

function showCart() {
  const box = document.getElementById('cartItems');
  if (cart.length === 0) {
    box.innerHTML = 'No items selected.';
  } else {
    box.innerHTML = cart.map((x, i) => `${i + 1}. ${x.name} - ₹${x.price}`).join('<br>');
  }

  document.getElementById('total').innerText = cart.reduce((sum, x) => sum + x.price, 0);
}

async function placeOrder() {
  const name = savedName;
  const studentId = savedStudentId;
  const message = document.getElementById('message');

  if (!name || !studentId || !savedEmail || cart.length === 0) {
    message.innerText = 'Select at least one food item.';
    return;
  }

  const items = cart.map(x => ({name: x.name, price: x.price}));
  const total = items.reduce((sum, x) => sum + x.price, 0);

  try {
    const response = await fetch(API_BASE + '/api/orders', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({studentName: name, studentId, studentEmail: savedEmail, items, total})
    });

    const data = await response.json();

    if (!response.ok) {
      message.innerText = data.message || 'Order failed.';
      return;
    }

    message.innerText = data.message + ' Token Number: ' + data.tokenNumber + ' | Pickup: ' + data.pickupDate + ' • ' + data.pickupSlot;
    cart = [];
    showCart();
  } catch (error) {
    message.innerText = 'Backend not running. Start the server first.';
  }
}

showMenu();
showCart();
