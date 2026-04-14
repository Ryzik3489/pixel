// --- Смена юзернейма (@username) ---
async function updateMyUsername(newUsername) {
    const user = auth.currentUser;
    const cleanUsername = newUsername.toLowerCase().replace('@', '');
    
    // Проверяем, не занят ли юзернейм
    const q = query(collection(db, "users"), where("username", "==", cleanUsername));
    const snap = await getDocs(q);
    
    if (snap.empty) {
        await setDoc(doc(db, "users", user.uid), { username: cleanUsername }, { merge: true });
        alert("Юзернейм успешно изменен!");
    } else {
        alert("Этот юзернейм уже занят!");
    }
}

// --- Добавление в группу (вызывать из заголовка чата) ---
async function inviteToGroup(roomId) {
    const targetUsername = prompt("Введите @username пользователя для добавления:");
    if (!targetUsername) return;

    // Ищем пользователя по юзернейму
    const q = query(collection(db, "users"), where("username", "==", targetUsername.replace('@','')));
    const snap = await getDocs(q);

    if (!snap.empty) {
        const userId = snap.docs[0].id;
        await updateDoc(doc(db, "rooms", roomId), {
            members: arrayUnion(userId)
        });
        alert("Пользователь добавлен!");
    } else {
        alert("Пользователь не найден.");
    }
}

// --- Реакции на сообщения ---
async function addReaction(msgId, emoji) {
    const msgRef = doc(db, `rooms/${currentChatId}/messages`, msgId);
    await updateDoc(msgRef, {
        [`reactions.${emoji}`]: increment(1)
    });
}
