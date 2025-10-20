const DB_NAME = 'ProfileDB';
const DB_VERSION = 1;
const STORE_NAME = 'profiles';

let token = null;
let userId = null;
let profileId = null;

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

async function cacheProfile(db, data, profileId) {
    try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ ...data, id: profileId });
        return tx.complete;
    } catch (error) {
        console.error('Error caching profile to IndexedDB:', error);
    }
}

function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (!username || !password) {
        alert('Введите имя пользователя и пароль');
        return;
    }
    fetch('https://unitlink-backend.onrender.com/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
        .then(response => {
            if (!response.ok) throw new Error('Ошибка регистрации');
            return response.json();
        })
        .then(result => {
            login(username, password); // Автовход
        })
        .catch(error => {
            alert('Ошибка регистрации: ' + error.message);
            console.error('Register error:', error);
        });
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    fetch('https://unitlink-backend.onrender.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
    })
        .then(response => {
            if (!response.ok) throw new Error('Ошибка входа');
            return response.json();
        })
        .then(result => {
            token = result.access_token;
            userId = result.user_id;
            profileId = userId;
            document.getElementById('auth-form').style.display = 'none';
            document.getElementById('profile-form').style.display = 'block';
            loadMyProfile();
        })
        .catch(error => {
            alert('Ошибка входа: ' + error.message);
            console.error('Login error:', error);
        });
}

function loadMyProfile() {
    fetch('https://unitlink-backend.onrender.com/api/my-profile', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => {
            if (!response.ok) throw new Error('Ошибка загрузки профиля');
            return response.json();
        })
        .then(profile => {
            document.getElementById('profile-name').value = profile.name || '';
            document.getElementById('profile-surname').value = profile.surname || '';
            document.getElementById('profile-blood_type').value = profile.blood_type || '';
            document.getElementById('profile-allergies').value = profile.allergies || '';
            document.getElementById('profile-contraindications').value = profile.contraindications || '';
            const container = document.getElementById('contacts-container');
            container.innerHTML = '<h3>Контакты</h3>';
            profile.contacts.forEach(contact => {
                addContactField(contact.type, contact.value);
            });
            container.appendChild(document.createElement('button')).outerHTML = '<button onclick="addContactField()">Добавить контакт</button>';
        })
        .catch(error => {
            console.log('No profile yet or error:', error);
        });
}

function addContactField(type = '', value = '') {
    const container = document.getElementById('contacts-container');
    const div = document.createElement('div');
    div.className = 'contact-field';
    div.innerHTML = `
        <input type="text" class="contact-type" value="${type}" placeholder="Тип контакта (напр., Телефон)">
        <input type="text" class="contact-value" value="${value}" placeholder="Значение (напр., +123456789)">
    `;
    container.insertBefore(div, container.lastElementChild);
}

function saveProfile() {
    const profile = {
        name: document.getElementById('profile-name').value,
        surname: document.getElementById('profile-surname').value,
        blood_type: document.getElementById('profile-blood_type').value,
        allergies: document.getElementById('profile-allergies').value,
        contraindications: document.getElementById('profile-contraindications').value,
        contacts: Array.from(document.querySelectorAll('.contact-type')).map((typeInput, i) => ({
            type: typeInput.value,
            value: document.querySelectorAll('.contact-value')[i].value
        })).filter(c => c.type && c.value),
        last_updated: new Date().toISOString()
    };
    if (!profile.name || !profile.surname || !profile.blood_type) {
        alert('Заполните обязательные поля: Имя, Фамилия, Группа крови');
        return;
    }
    fetch(`https://unitlink-backend.onrender.com/api/profile/${profileId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
    })
        .then(response => {
            if (!response.ok) throw new Error('Ошибка сохранения');
            return response.json();
        })
        .then(async () => {
            alert('Профиль сохранён');
            const db = await openDB();
            await cacheProfile(db, profile, profileId);
            console.log('Profile cached in IndexedDB');
        })
        .catch(error => {
            alert('Ошибка сохранения: ' + error.message);
            console.error('Save profile error:', error);
        });
}

function shareLink() {
    const link = `https://frontend-five-silk-24.vercel.app/profile.html?id=${profileId}`;
    navigator.clipboard.writeText(link).then(() => {
        alert('Ссылка скопирована: ' + link);
    });
}

// Делаем функции глобальными
window.register = register;
window.login = login;
window.loadMyProfile = loadMyProfile;
window.addContactField = addContactField;
window.saveProfile = saveProfile;
window.shareLink = shareLink;