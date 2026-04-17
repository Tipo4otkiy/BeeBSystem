import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, enableIndexedDbPersistence, deleteDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAjBLxsRZxlspqdLHgeJfaf9hcj1EKdP4U",
  authDomain: "beebsystem.firebaseapp.com",
  projectId: "beebsystem",
  storageBucket: "beebsystem.firebasestorage.app",
  messagingSenderId: "77644666521",
  appId: "1:77644666521:web:9eee51791efb10f7e60a08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(err => console.error("Офлайн ошибка:", err.code));

// --- ЛОГИКА ВВОДА ПЛАНОК (ТЕГИ) ---
window.currentBars = [];
window.addBar = () => {
    const input = document.getElementById('input-bar-add');
    const val = input.value.trim();
    if(val && !window.currentBars.includes(val)) {
        window.currentBars.push(val);
        renderBarTags();
    }
    input.value = '';
    input.focus();
};
window.removeBar = (val) => {
    window.currentBars = window.currentBars.filter(b => b !== val);
    renderBarTags();
};
function renderBarTags() {
    const container = document.getElementById('bar-tags-container');
    container.innerHTML = window.currentBars.map(b => 
        `<span class="badge badge-del" onclick="window.removeBar('${b}')">${b} ✖</span>`
    ).join('');
}

// Глобальное хранилище данных для редактирования
window.batchesData = {};

// --- ОБРАБОТКА ФОРМЫ (ДОБАВЛЕНИЕ ИЛИ РЕДАКТИРОВАНИЕ) ---
document.getElementById('add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(window.currentBars.length === 0) {
        alert("Добавь хотя бы одну планку!");
        return;
    }

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;

    const data = {
        lineage: document.getElementById('input-lineage').value,
        family: parseInt(document.getElementById('input-family').value),
        bars: window.currentBars, // Теперь сохраняем как массив
        pieces: parseInt(document.getElementById('input-pieces').value),
        comment: document.getElementById('input-comment').value,
        graftDateStr: document.getElementById('input-date').value,
        status: 'active'
    };

    const hatch = new Date(data.graftDateStr);
    hatch.setDate(hatch.getDate() + 11);
    data.expectedHatchTimestamp = hatch.getTime();

    const editId = e.target.dataset.editId; // Проверяем, это редактирование или новая запись

    try {
        if(editId) {
            await updateDoc(doc(db, "batches", editId), data);
            window.cancelEdit();
        } else {
            data.createdAt = Date.now();
            data.crossedBars = [];
            await addDoc(collection(db, "batches"), data);
            
            e.target.reset();
            document.getElementById('input-date').valueAsDate = new Date();
            document.getElementById('input-lineage').value = 'B-';
            window.currentBars = [];
            renderBarTags();
            
            // Вместо перехода просто показываем уведомление
            alert("✅ Партия успешно добавлена в журнал!"); 
        }
    } catch (err) {
        alert("Ошибка! Проверь консоль.");
        console.error(err);
    } finally {
        btn.disabled = false;
    }
});

// --- РЕНДЕРИНГ ДАННЫХ ---
onSnapshot(query(collection(db, "batches"), orderBy("expectedHatchTimestamp", "asc")), (snapshot) => {
    const lists = { events: '', active: '', history: '' };
    const today = new Date().setHours(0,0,0,0);
    const tomorrow = today + 86400000;
    
    window.batchesData = {}; // Обновляем локальный кэш данных

    snapshot.forEach(docSnap => {
        const d = docSnap.data();
        const id = docSnap.id;
        window.batchesData[id] = d; // Сохраняем для функции "Изменить"

        const hatchDate = new Date(d.expectedHatchTimestamp);
        const hatchTime = new Date(d.expectedHatchTimestamp).setHours(0,0,0,0);

        // Генерация кликабельных планок
        // (Поддержка старых данных, где планки были строкой)
        let barsArray = Array.isArray(d.bars) ? d.bars : (d.bars ? d.bars.split(',').map(s=>s.trim()) : []);
        let crossedArray = d.crossedBars || [];
        
        let barsHtml = barsArray.map(b => {
            const isCrossed = crossedArray.includes(b);
            return `<button class="bar-btn ${isCrossed ? 'crossed' : ''}" onclick="window.toggleCrossBar('${id}', '${b}', ${isCrossed})">${b}</button>`;
        }).join('');

        const html = `
            <div class="card ${d.status === 'history' ? 'history' : ''}">
                <div>
                    <h3>
                        ${d.lineage} 
                        <span class="badge">Семья №${d.family}</span>
                    </h3>
                    <p style="margin: 10px 0;"><strong>Планки:</strong> ${barsHtml}</p>
                    <p>📦 <strong>${d.pieces} шт.</strong></p>
                    <p>📅 Прививка: ${new Date(d.graftDateStr).toLocaleDateString('ru-RU')}</p>
                    <p style="font-size: 1.1rem; color: ${hatchTime <= today ? 'var(--danger)' : 'inherit'}">
                        🐣 <strong>Выход: ${hatchDate.toLocaleDateString('ru-RU')}</strong>
                    </p>
                    ${d.comment ? `<p>📝 <em style="color:#666">${d.comment}</em></p>` : ''}
                </div>
                <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                    ${d.status === 'active' ? `
                        <button class="btn-action btn-success" onclick="window.markHatched('${id}')">В ИСТОРИЮ</button>
                        <button class="btn-action btn-outline" onclick="window.editBatch('${id}')">✏️</button>
                    ` : ''}
                    <button class="btn-action btn-danger" onclick="window.deleteBatch('${id}')">🗑️</button>
                </div>
            </div>
        `;

        if (d.status === 'history') lists.history += html;
        else {
            lists.active += html;
            if (hatchTime <= tomorrow) lists.events += html.replace('card ', 'card alert ');
        }
    });

    document.getElementById('events-list').innerHTML = lists.events || '<p>На ближайшие 2 дня событий нет.</p>';
    document.getElementById('active-list').innerHTML = lists.active || '<p>Нет активных закладок.</p>';
    document.getElementById('history-list').innerHTML = lists.history || '<p>Архив пуст.</p>';
});

// --- ГЛОБАЛЬНЫЕ ФУНКЦИИ УПРАВЛЕНИЯ КАРТОЧКАМИ ---

// Зачеркнуть/Отменить зачеркивание планки
window.toggleCrossBar = async (id, barNumber, isCrossed) => {
    const ref = doc(db, "batches", id);
    if (isCrossed) {
        await updateDoc(ref, { crossedBars: arrayRemove(barNumber) });
    } else {
        await updateDoc(ref, { crossedBars: arrayUnion(barNumber) });
    }
};

// В историю
window.markHatched = id => confirm("Перенести в архив?") && updateDoc(doc(db, "batches", id), { status: 'history' });

// Удалить полностью
window.deleteBatch = async id => {
    if(confirm("Удалить запись навсегда? Это действие нельзя отменить.")) {
        await deleteDoc(doc(db, "batches", id));
    }
};

// Редактировать (заполняет форму)
window.editBatch = id => {
    const d = window.batchesData[id];
    if(!d) return;

    document.querySelectorAll('.nav-btn')[1].click(); // Переход на вкладку Записи
    
    document.getElementById('input-date').value = d.graftDateStr;
    document.getElementById('input-lineage').value = d.lineage;
    document.getElementById('input-family').value = d.family;
    document.getElementById('input-pieces').value = d.pieces;
    document.getElementById('input-comment').value = d.comment || '';
    
    // Восстанавливаем планки
    window.currentBars = Array.isArray(d.bars) ? [...d.bars] : (d.bars ? d.bars.split(',').map(s=>s.trim()) : []);
    renderBarTags();

    // Меняем визуал формы
    const formCard = document.getElementById('main-form-card');
    formCard.classList.add('edit-mode');
    document.getElementById('form-title').innerText = "✏️ Редактирование";
    document.getElementById('submit-btn').innerText = "СОХРАНИТЬ ИЗМЕНЕНИЯ";
    document.getElementById('cancel-edit-btn').style.display = 'block';
    
    // Привязываем ID к форме
    document.getElementById('add-form').dataset.editId = id;
    window.scrollTo(0, 0);
};

// Отмена редактирования
window.cancelEdit = () => {
    const form = document.getElementById('add-form');
    delete form.dataset.editId;
    form.reset();
    document.getElementById('input-date').valueAsDate = new Date();
    document.getElementById('input-lineage').value = 'B-';
    window.currentBars = [];
    renderBarTags();

    document.getElementById('main-form-card').classList.remove('edit-mode');
    document.getElementById('form-title').innerText = "Новая партия";
    document.getElementById('submit-btn').innerText = "ДОБАВИТЬ В ЖУРНАЛ";
    document.getElementById('cancel-edit-btn').style.display = 'none';
};