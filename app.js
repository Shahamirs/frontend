const DB_NAME = 'ProfileDB';
const DB_VERSION = 1;
const STORE_NAME = 'profiles';
const PROFILE_ID = new URLSearchParams(window.location.search).get('id') || '12345';
const API_URL = `https://unitlink-backend.onrender.com/api/profile/${PROFILE_ID}`

function renderProfile(data) {
    document.getElementById('name').textContent = data.name;
    document.getElementById('surname').textContent = data.surname;
    document.getElementById('blood_type').textContent = data.blood_type;
    document.getElementById('allergies').textContent = data.allergies;
    document.getElementById('contraindications').textContent = data.contraindications;
    const contactsList = document.getElementById('contacts');
    contactsList.innerHTML = '';
    data.contacts.forEach(contact => {
        const li = document.createElement('li');
        li.textContent = `${contact.type}: ${contact.value}`;
        contactsList.appendChild(li);
    });
}

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = e => {
            const db = e.target.result;
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        };
        request.onsuccess = e => resolve(e.target.result);
        request.onerror = e => reject(e.target.error);
    });
}

async function getCachedProfile(db) {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return store.get(PROFILE_ID);
}

async function saveProfile(db, data) {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ ...data, id: PROFILE_ID });
    return tx.complete;
}

async function loadProfile() {
    const db = await openDB();
    let data;

    if (navigator.onLine) {
        try {
            const response = await fetch(API_URL);
            if (response.ok) {
                data = await response.json();
                await saveProfile(db, data);
            }
        } catch (error) {
            console.log('No internet, using cache');
        }
    }

    if (!data) {
        const request = await getCachedProfile(db);
        request.onsuccess = () => {
            data = request.result;
            if (data) renderProfile(data);
            else document.body.innerHTML = '<p>Нет данных для оффлайн-доступа. Подключитесь к интернету.</p>';
        };
    } else {
        renderProfile(data);
    }
}

loadProfile();

window.addEventListener('online', () => {
    loadProfile();
});