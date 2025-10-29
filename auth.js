// auth.js
const DB_NAME = 'ProfileDB';
const STORE_NAME = 'profiles';
let token = null, userId = null, profileId = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function cacheProfile(db, data, id) {
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.objectStore(STORE_NAME).put({ ...data, id });
  await tx.done;
  console.log('Profile cached →', id);
}

// Регистрация
function register() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  if (!username || !password) return alert('Заполните все поля');

  fetch('https://unitlink-backend.onrender.com/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(r => r.ok ? r.json() : Promise.reject('Регистрация не удалась'))
  .then(() => login(username, password))
  .catch(e => alert(e));
}

// Вход
function login(username = document.getElementById('username').value, password = document.getElementById('password').value) {
  fetch('https://unitlink-backend.onrender.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
  })
  .then(r => r.ok ? r.json() : Promise.reject('Неверный логин/пароль'))
  .then(async res => {
    token = res.access_token;
    userId = res.user_id;
    profileId = userId;
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('profile-form').style.display = 'block';
    await loadMyProfile();
  })
  .catch(e => alert(e));
}

// Загрузка профиля + кэширование
async function loadMyProfile() {
  const res = await fetch('https://unitlink-backend.onrender.com/api/my-profile', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const profile = await res.json();

  document.getElementById('profile-name').value = profile.name || '';
  document.getElementById('profile-surname').value = profile.surname || '';
  document.getElementById('profile-blood_type').value = profile.blood_type || '';
  document.getElementById('profile-allergies').value = profile.allergies || '';
  document.getElementById('profile-contraindications').value = profile.contraindications || '';

  const container = document.getElementById('contacts-container');
  container.innerHTML = '<h3>Контакты</h3>';
  profile.contacts.forEach(c => addContactField(c.type, c.value));
  container.appendChild(document.createElement('button')).outerHTML = '<button onclick="addContactField()">Добавить контакт</button>';

  // Кэшируем профиль сразу
  const db = await openDB();
  await cacheProfile(db, profile, profileId);
}

// Добавить контакт
function addContactField(type = '', value = '') {
  const container = document.getElementById('contacts-container');
  const div = document.createElement('div');
  div.className = 'contact-field';
  div.innerHTML = `
    <input type="text" class="contact-type" value="${type}" placeholder="Тип контакта">
    <input type="text" class="contact-value" value="${value}" placeholder="Значение">
  `;
  container.insertBefore(div, container.lastElementChild);
}

// Сохранить профиль
async function saveProfile() {
  const profile = {
    name: document.getElementById('profile-name').value,
    surname: document.getElementById('profile-surname').value,
    blood_type: document.getElementById('profile-blood_type').value,
    allergies: document.getElementById('profile-allergies').value,
    contraindications: document.getElementById('profile-contraindications').value,
    contacts: Array.from(document.querySelectorAll('.contact-type')).map((t, i) => ({
      type: t.value,
      value: document.querySelectorAll('.contact-value')[i].value
    })).filter(c => c.type && c.value),
    last_updated: new Date().toISOString()
  };

  if (!profile.name || !profile.surname || !profile.blood_type) {
    return alert('Заполните обязательные поля');
  }

  await fetch(`https://unitlink-backend.onrender.com/api/profile/${profileId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(profile)
  });

  const db = await openDB();
  await cacheProfile(db, profile, profileId);
  alert('Профиль сохранён');
}

// Поделиться
function shareLink() {
  const link = `https://frontend-five-silk-24.vercel.app/profile.html?id=${profileId}`;
  navigator.clipboard.writeText(link).then(() => alert('Ссылка скопирована: ' + link));
}

// Глобальные функции
window.register = register;
window.login = login;
window.addContactField = addContactField;
window.saveProfile = saveProfile;
window.shareLink = shareLink;