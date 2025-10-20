const DB_NAME = 'ProfileDB';
const DB_VERSION = 1;
const STORE_NAME = 'profiles';
const PROFILE_ID = new URLSearchParams(window.location.search).get('id') || '12345';
const API_URL = `https://unitlink-backend.onrender.com/api/profile/${PROFILE_ID}`;

function renderProfile(data) {
    try {
        document.getElementById('name').textContent = data.name || 'N/A';
        document.getElementById('surname').textContent = data.surname || 'N/A';
        document.getElementById('blood_type').textContent = data.blood_type || 'N/A';
        document.getElementById('allergies').textContent = data.allergies || 'N/A';
        document.getElementById('contraindications').textContent = data.contraindications || 'N/A';
        const contactsList = document.getElementById('contacts');
        contactsList.innerHTML = '';
        (data.contacts || []).forEach(contact => {
            const li = document.createElement('li');
            li.textContent = `${contact.type}: ${contact.value}`;
            contactsList.appendChild(li);
        });
    } catch (error) {
        console.error('Error rendering profile:', error);
        document.body.innerHTML = '<p>Ошибка отображения профиля. Попробуйте позже.</p>';
    }
}

function openDB() {
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
    return new Promise((resolve, reject) => {
        try {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(PROFILE_ID);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
}

async function saveProfile(db, data) {
    try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ ...data, id: PROFILE_ID });
        return tx.complete;
    } catch (error) {
        console.error('Error saving profile to IndexedDB:', error);
    }
}

async function loadProfile() {
    const db = await openDB().catch(error => {
        console.error('Error opening IndexedDB:', error);
        document.body.innerHTML = '<p>Ошибка базы данных. Попробуйте позже.</p>';
        return null;
    });
    if (!db) return;

    let data;
    if (navigator.onLine) {
        try {
            const response = await fetch(API_URL, {
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            if (response.ok) {
                data = await response.json();
                await saveProfile(db, data);
                console.log('Profile fetched and cached');
            } else {
                console.error('Failed to fetch profile:', response.status);
            }
        } catch (error) {
            console.log('No internet, trying cache:', error);
        }
    }

    if (!data) {
        try {
            data = await getCachedProfile(db);
            if (data) {
                renderProfile(data);
            } else {
                document.body.innerHTML = '<p>Нет данных для оффлайн-доступа. Подключитесь к интернету.</p>';
            }
        } catch (error) {
            console.error('Error loading cached profile:', error);
            document.body.innerHTML = '<p>Ошибка загрузки данных. Попробуйте позже.</p>';
        }
    } else {
        renderProfile(data);
    }
}

loadProfile();

window.addEventListener('online', () => {
    loadProfile();
});