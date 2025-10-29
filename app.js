// app.js (полный файл)
const DB_NAME = 'ProfileDB';
const DB_VERSION = 1;
const STORE_NAME = 'profiles';
const PROFILE_ID = new URLSearchParams(window.location.search).get('id') || '12345';
const API_URL = `https://unitlink-backend.onrender.com/api/profile/${PROFILE_ID}`;

function renderProfile(data) {
    console.log('Rendering profile:', data);
    document.getElementById('name').textContent = data.name || 'Неизвестно';
    document.getElementById('surname').textContent = data.surname || 'Неизвестно';
    document.getElementById('blood_type').textContent = data.blood_type || 'Не указана';
    document.getElementById('allergies').textContent = data.allergies || 'Не указаны';
    document.getElementById('contraindications').textContent = data.contraindications || 'Не указаны';
    const contactsList = document.getElementById('contacts');
    contactsList.innerHTML = '';
    (data.contacts || []).forEach(contact => {
        const li = document.createElement('li');
        li.textContent = `${contact.type}: ${contact.value}`;
        contactsList.appendChild(li);
    });
}

function openDB() {
    console.log('Opening IndexedDB');
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = e => resolve(e.target.result);
        request.onerror = e => reject(e.target.error);
    });
}

async function getCachedProfile(db) {
    console.log(`Getting cached profile for id: ${PROFILE_ID}`);
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(PROFILE_ID);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveProfile(db, data) {
    console.log(`Saving profile to IndexedDB for id: ${PROFILE_ID}`);
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ ...data, id: PROFILE_ID });
    return tx.complete;
}

async function loadProfile() {
    const db = await openDB().catch(error => {
        console.error('Error opening IndexedDB:', error);
        return null;
    });
    if (!db) {
        renderProfile({ name: 'Ошибка', surname: 'Ошибка', blood_type: 'Ошибка', allergies: 'Ошибка', contraindications: 'Ошибка', contacts: [] });
        return;
    }

    let data;
    if (navigator.onLine) {
        try {
            console.log('Fetching profile from API');
            const response = await fetch(API_URL);
            if (response.ok) {
                data = await response.json();
                await saveProfile(db, data);
                console.log('Profile fetched and cached');
            } else {
                console.error('API error:', response.status);
            }
        } catch (error) {
            console.log('Network error, using cache:', error);
        }
    }

    if (!data) {
        try {
            data = await getCachedProfile(db);
            if (data) {
                console.log('Using cached profile');
                renderProfile(data);
            } else {
                console.log('No cached data, showing fallback');
                renderProfile({
                    name: 'Неизвестно',
                    surname: 'Неизвестно',
                    blood_type: 'Не указана',
                    allergies: 'Не указаны',
                    contraindications: 'Не указаны',
                    contacts: []
                });
            }
        } catch (error) {
            console.error('IndexedDB error:', error);
            renderProfile({ name: 'Ошибка', surname: 'Ошибка', blood_type: 'Ошибка', allergies: 'Ошибка', contraindications: 'Ошибка', contacts: [] });
        }
    } else {
        renderProfile(data);
    }
}

loadProfile();

window.addEventListener('online', () => {
    console.log('Online, reloading profile');
    loadProfile();
});