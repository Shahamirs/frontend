// app.js
const DB_NAME = 'ProfileDB';
const STORE_NAME = 'profiles';
const PROFILE_ID = new URLSearchParams(location.search).get('id') || 'unknown';
const API_URL = `https://unitlink-backend.onrender.com/api/profile/${PROFILE_ID}`;

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

async function getCached() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return await store.get(PROFILE_ID);
}

function render(data) {
  document.getElementById('name').textContent = data.name ?? 'Неизвестно';
  document.getElementById('surname').textContent = data.surname ?? 'Неизвестно';
  document.getElementById('blood_type').textContent = data.blood_type ?? 'Не указана';
  document.getElementById('allergies').textContent = data.allergies ?? 'Не указаны';
  document.getElementById('contraindications').textContent = data.contraindications ?? 'Не указаны';

  const ul = document.getElementById('contacts');
  ul.innerHTML = '';
  (data.contacts || []).forEach(c => {
    const li = document.createElement('li');
    li.textContent = `${c.type}: ${c.value}`;
    ul.appendChild(li);
  });
}

// Основной поток
(async () => {
  let data = null;

  // 1. Онлайн
  if (navigator.onLine) {
    try {
      const r = await fetch(API_URL, { cache: 'no-cache' });
      if (r.ok) {
        data = await r.json();
        const db = await openDB();
        await db.transaction(STORE_NAME, 'readwrite')
                .objectStore(STORE_NAME)
                .put({ ...data, id: PROFILE_ID });
      }
    } catch (e) { /* игнорируем */ }
  }

  // 2. Кэш
  if (!data) {
    data = await getCached();
  }

  // 3. Заглушка
  if (!data) {
    data = {
      name: 'Неизвестно',
      surname: 'Неизвестно',
      blood_type: 'Не указана',
      allergies: 'Не указаны',
      contraindications: 'Не указаны',
      contacts: []
    };
  }

  render(data);
})();