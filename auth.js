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
        await tx.complete;
        console.log(`Profile cached in IndexedDB with id: ${profileId}`);
    } catch (error) {
        console.error('Error caching profile to IndexedDB:', error);
    }
}

function register() {
    console.log('Register button clicked');
    const username = document.getElementById('username').value;
    const pwd = document.getElementById('password').value;
    if (!username || !pwd) {
        alert('Введите имя пользователя и пароль');
        return;
    }
    fetch('https://unitlink-backend.onrender.com/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pwd })
    })
        .then(response => {
            console.log('Register response status:', response.status);
            if (!response.ok) throw new Error(`Ошибка регистрации (статус ${response.status})`);
            return response.json();
        })
        .then(result => {
            console.log('Register successful, auto-login');
            login(username, pwd);
        })
        .catch(error => {
            console.error('Register error:', error);
            alert(error.message);
        });
}

function login() {
    console.log('Login button clicked');
    const username = document.getElementById('username').value;
    const pwd = document.getElementById('password').value;
    fetch('https://unitlink-backend.onrender.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(pwd)}`
    })
        .then(response => {
            console.log('Login response status:', response.status);
            if (!response.ok) throw new Error(`Ошибка входа (статус ${response.status})`);
            return response.json();
        })
        .then(result => {
            console.log('Login successful, loading profile');
            token = result.access_token;
            userId = result.user_id;
            profileId = userId;
            document.getElementById('auth-form').style.display = 'none';
            document.getElementById('profile-form').style.display = 'block';
            loadMyProfile();
        })
        .catch(error => {
            console.error('Login error:', error);
            alert(error.message);
        });
}

function loadMyProfile() {
    console.log('Loading my profile');
    fetch('https://unitlink-backend.onrender.com/api/my-profile', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => {
            console.log('Profile response status:', response.status);
            if (!response.ok) throw new Error(`Ошибка загрузки профиля (статус ${response.status})`);
            return response.json();
        })
        .then(async profile => {
            console.log('Profile loaded:', profile);
            document.getElementById('profile-name').value = profile.name || '';
            document.getElementById('profile-surname').value = profile.surname || '';
            document.getElementById('profile-blood_type').value = profile.blood_type || '';
            document.getElementById('profile-allergies').value = profile.allergies || '';
            document.getElementById('profile-contraindications').value = profile.contraindications || '';
            const container = document.getElementById('contacts-container');
            container.innerHTML = '<h3>Контакты</h3>';
            // Проверяем, что contacts существует и является массивом
            if (profile.contacts && Array.isArray(profile.contacts)) {
                profile.contacts.forEach(contact => addContactField(contact.type, contact.value));
            } else {
                console.log('No contacts found, adding empty field');
                addContactField();
            }
            container.appendChild(document.createElement('button')).outerHTML = '<button onclick="addContactField()">Добавить контакт</button>';
            // Кэшируем профиль
            const db = await openDB();
            await cacheProfile(db, profile, profileId);
        })
        .catch(error => {
            console.error('Load profile error:', error);
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
    console.log('Saving profile');
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
            console.log('Save response status:', response.status);
            if (!response.ok) throw new Error(`Ошибка сохранения (статус ${response.status})`);
            return response.json();
        })
        .then(async () => {
            alert('Профиль сохранён');
            const db = await openDB();
            await cacheProfile(db, profile, profileId);
            console.log('Profile saved and cached');
        })
        .catch(error => {
            console.error('Save profile error:', error);
            alert(error.message);
        });
}

function shareLink() {
    const link = `https://frontend-five-silk-24.vercel.app/profile.html?id=${profileId}`;
    navigator.clipboard.writeText(link).then(() => {
        alert('Ссылка скопирована: ' + link);
    });
}

// Глобальные функции
window.register = register;
window.login = login;
window.loadMyProfile = loadMyProfile;
window.addContactField = addContactField;
window.saveProfile = saveProfile;
window.shareLink = shareLink;