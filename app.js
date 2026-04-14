import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, onSnapshot, orderBy, serverTimestamp, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB7C-GHyn0RsNBek4wmkzMzD_IAbim0DpU",
    authDomain: "pixel-7c9f0.firebaseapp.com",
    projectId: "pixel-7c9f0",
    storageBucket: "pixel-7c9f0.firebasestorage.app",
    messagingSenderId: "1016081455742",
    appId: "1:1016081455742:web:8b6d312cfecd8d8467d62f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let confirmationResult;
let currentChatId = null;

// --- Инициализация ReCaptcha ---
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {'size': 'invisible'});

// --- Авторизация ---
document.getElementById('btn-send-otp').onclick = async () => {
    const phone = document.getElementById('phone').value;
    confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
    document.getElementById('otp-box').style.display = 'block';
};

document.getElementById('btn-verify-otp').onclick = async () => {
    const code = document.getElementById('otp-code').value;
    const result = await confirmationResult.confirm(code);
    loginSuccess(result.user);
};

function loginSuccess(user) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'flex';
    document.getElementById('my-phone').innerText = user.phoneNumber;
    loadChats();
}

// --- Поиск (Поиск по @username людей и чатов) ---
document.getElementById('search-input').oninput = async (e) => {
    const val = e.target.value.toLowerCase();
    if (val.length < 2) return loadChats();

    const q = query(collection(db, "rooms"), where("username", "==", val.replace('@','')));
    const snap = await getDocs(q);
    renderList(snap);
};

// --- Создание групп и каналов ---
async function createRoom(type) {
    const name = prompt("Введите название:");
    const userHandle = prompt("Введите @юзернейм для поиска (без @):").toLowerCase();
    if (!name || !userHandle) return;

    await addDoc(collection(db, "rooms"), {
        name,
        type,
        username: userHandle,
        creator: auth.currentUser.uid,
        members: [auth.currentUser.uid],
        timestamp: serverTimestamp()
    });
}

document.getElementById('btn-create-group').onclick = () => createRoom('group');
document.getElementById('btn-create-channel').onclick = () => createRoom('channel');

// --- Работа с чатами ---
function loadChats(filter = 'all') {
    const q = query(collection(db, "rooms"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snap) => renderList(snap, filter));
}

function renderList(snap, filter = 'all') {
    const list = document.getElementById('chat-list');
    list.innerHTML = "";
    snap.forEach(d => {
        const data = d.data();
        if (filter !== 'all' && data.type !== filter) return;
        
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.innerHTML = `<strong>${data.name}</strong> <small>@${data.username}</small>`;
        div.onclick = () => openChat(d.id, data);
        list.appendChild(div);
    });
}

async function openChat(id, data) {
    currentChatId = id;
    document.getElementById('active-title').innerText = data.name;
    document.getElementById('input-area').style.display = 'flex';
    
    // Показываем кнопку добавления только для групп
    document.getElementById('btn-add-member').style.display = (data.type === 'group') ? 'block' : 'none';
    
    const q = query(collection(db, `rooms/${id}/messages`), orderBy("timestamp", "asc"));
    onSnapshot(q, (snap) => {
        const area = document.getElementById('messages-area');
        area.innerHTML = "";
        snap.forEach(doc => {
            const m = doc.data();
            const isMe = m.uid === auth.currentUser.uid;
            area.innerHTML += `<div class="msg ${isMe ? 'me' : 'other'}">${m.text}</div>`;
        });
        area.scrollTop = area.scrollHeight;
    });
}

// --- Добавление участника по номеру телефона (или ID) ---
document.getElementById('btn-add-member').onclick = async () => {
    const targetPhone = prompt("Введите номер телефона пользователя:");
    if (!targetPhone) return;
    
    // В реальности нужно сначала найти пользователя в коллекции users
    // Но для примера просто добавляем строку
    await updateDoc(doc(db, "rooms", currentChatId), {
        members: arrayUnion(targetPhone)
    });
    alert("Добавлен!");
};

// --- Отправка сообщений ---
document.getElementById('btn-send').onclick = async () => {
    const text = document.getElementById('message-input').value;
    if (!text.trim()) return;

    await addDoc(collection(db, `rooms/${currentChatId}/messages`), {
        text,
        uid: auth.currentUser.uid,
        timestamp: serverTimestamp()
    });
    document.getElementById('message-input').value = "";
};

// --- Управление интерфейсом ---
document.querySelector('.menu-trigger').onclick = () => {
    document.getElementById('side-menu').classList.add('active');
    document.querySelector('.overlay').classList.add('active');
};
document.querySelector('.overlay').onclick = () => {
    document.getElementById('side-menu').classList.remove('active');
    document.querySelector('.overlay').classList.remove('active');
};
document.getElementById('btn-toggle-theme').onclick = () => {
    const theme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', theme);
};
