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
enableIndexedDbPersistence(db).catch(() => {});

// Управление тегами в форме
window.currentBars = [];
window.currentFamilies = [];

window.addBarTag = () => {
    const input = document.getElementById('input-bar-val');
    const val = input.value.trim();
    if(val && !window.currentBars.includes(val)) { window.currentBars.push(val); renderTags(); }
    input.value = ''; input.focus();
};
window.addFamilyTag = () => {
    const input = document.getElementById('input-family-val');
    const val = input.value.trim();
    if(val && !window.currentFamilies.includes(val)) { window.currentFamilies.push(val); renderTags(); }
    input.value = ''; input.focus();
};
window.removeTag = (type, val) => {
    if(type === 'bar') window.currentBars = window.currentBars.filter(b => b !== val);
    else window.currentFamilies = window.currentFamilies.filter(f => f !== val);
    renderTags();
};

function renderTags() {
    document.getElementById('bar-tags-container').innerHTML = window.currentBars.map(b => `<span class="badge-del badge-bar" onclick="window.removeTag('bar','${b}')">${b} ✖</span>`).join('');
    document.getElementById('family-tags-container').innerHTML = window.currentFamilies.map(f => `<span class="badge-del badge-family" onclick="window.removeTag('family','${f}')">${f} ✖</span>`).join('');
}

window.batchesData = {};

// СОХРАНЕНИЕ
document.getElementById('add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = e.target.dataset.editId;
    const graftDate = new Date(document.getElementById('input-date').value);
    
    const hatch = new Date(graftDate); hatch.setDate(hatch.getDate() + 11);
    const select = new Date(graftDate); select.setDate(select.getDate() + 9);

    const data = {
        lineage: document.getElementById('input-lineage').value,
        families: window.currentFamilies,
        bars: window.currentBars,
        pieces: document.getElementById('input-pieces').value || "",
        comment: document.getElementById('input-comment').value,
        graftDateStr: document.getElementById('input-date').value,
        expectedHatchTimestamp: hatch.getTime(),
        selectionDateTimestamp: select.getTime(),
        status: 'active'
    };

    try {
        if(editId) {
            await updateDoc(doc(db, "batches", editId), data);
            window.cancelEdit();
        } else {
            data.createdAt = Date.now();
            data.crossedBars = []; data.crossedFamilies = [];
            await addDoc(collection(db, "batches"), data);
            e.target.reset();
            document.getElementById('input-date').valueAsDate = new Date();
            document.getElementById('input-lineage').value = 'B-';
            window.currentBars = []; window.currentFamilies = []; renderTags();
            alert("✅ Сохранено");
        }
    } catch (err) { alert("Ошибка!"); }
});

// МОНИТОРИНГ И АВТО-АРХИВ
onSnapshot(query(collection(db, "batches"), orderBy("expectedHatchTimestamp", "asc")), (snapshot) => {
    const lists = { events: '', active: '', history: '' };
    const now = Date.now();
    const today = new Date().setHours(0,0,0,0);
    const tomorrow = today + 86400000;
    const archiveLimit = 2 * 24 * 60 * 60 * 1000; // 2 дня в мс

    snapshot.forEach(docSnap => {
        const d = docSnap.data();
        const id = docSnap.id;
        window.batchesData[id] = d;

        // --- ЛОГИКА АВТО-АРХИВА ---
        if (d.status === 'active' && now > (d.expectedHatchTimestamp + archiveLimit)) {
            updateDoc(doc(db, "batches", id), { status: 'history' });
            return;
        }

        const hatchTime = new Date(d.expectedHatchTimestamp).setHours(0,0,0,0);
        const selectTime = new Date(d.selectionDateTimestamp).setHours(0,0,0,0);

        const buildTags = (arr, crossed, type, colorClass) => {
            return (arr || []).map(val => {
                const isCr = (crossed || []).includes(val);
                return `<button class="btn-tag ${colorClass} ${isCr ? 'crossed' : ''}" onclick="window.toggleCross('${id}','${type}','${val}',${isCr})">${val}</button>`;
            }).join('');
        };

        const html = `
            <div class="card ${d.status === 'history' ? 'history' : ''}">
                <h3>${d.lineage}</h3>
                <p><strong>Семьи:</strong> ${buildTags(d.families, d.crossedFamilies, 'Families', 'family-btn')}</p>
                <p><strong>Планки:</strong> ${buildTags(d.bars, d.crossedBars, 'Bars', 'bar-btn')}</p>
                <p>📦 Кол-во: ${d.pieces ? `<strong>${d.pieces} шт.</strong>` : `<strong style="color: var(--danger);">надо ввести!</strong>`}</p>
                <p>🔍 Отбор: ${new Date(d.selectionDateTimestamp).toLocaleDateString('ru-RU')}</p>
                <p style="font-size: 1.1rem; color: ${hatchTime <= today ? 'var(--danger)' : 'inherit'}">
                    🐣 <strong>Выход: ${new Date(d.expectedHatchTimestamp).toLocaleDateString('ru-RU')}</strong>
                </p>
                ${d.comment ? `<p style="font-size:0.8rem; background:#fffde7; padding:5px;">${d.comment}</p>` : ''}
                <div class="card-actions">
                    <button class="btn-action btn-edit" onclick="window.editBatch('${id}')">ИЗМЕНИТЬ</button>
                    <button class="btn-action btn-danger" onclick="window.deleteBatch('${id}')">УДАЛИТЬ</button>
                </div>
            </div>
        `;

        if (d.status === 'history') lists.history += html;
        else {
            lists.active += html;
            if (hatchTime <= tomorrow || selectTime <= tomorrow) lists.events += html.replace('card ', 'card alert ');
        }
    });

    document.getElementById('events-list').innerHTML = lists.events || '<p>Событий нет</p>';
    document.getElementById('active-list').innerHTML = lists.active || '';
    document.getElementById('history-list').innerHTML = lists.history || '';
});

window.toggleCross = async (id, type, val, isCr) => {
    const field = isCr ? `crossed${type}` : `crossed${type}`;
    await updateDoc(doc(db, "batches", id), { [isCr ? `crossed${type}` : `crossed${type}`]: isCr ? arrayRemove(val) : arrayUnion(val) });
};

window.deleteBatch = id => confirm("Удалить навсегда?") && deleteDoc(doc(db, "batches", id));

window.editBatch = id => {
    const d = window.batchesData[id];
    switchTab('add', document.querySelectorAll('.nav-btn')[1]);
    document.getElementById('input-date').value = d.graftDateStr;
    document.getElementById('input-lineage').value = d.lineage;
    document.getElementById('input-pieces').value = d.pieces;
    document.getElementById('input-comment').value = d.comment;
    window.currentBars = [...(d.bars || [])];
    window.currentFamilies = [...(d.families || [])];
    renderTags();
    document.getElementById('main-form-card').classList.add('edit-mode');
    document.getElementById('form-title').innerText = "✏️ Изменение";
    document.getElementById('submit-btn').innerText = "СОХРАНИТЬ";
    document.getElementById('cancel-edit-btn').style.display = 'block';
    document.getElementById('add-form').dataset.editId = id;
};

window.cancelEdit = () => {
    document.getElementById('add-form').reset();
    delete document.getElementById('add-form').dataset.editId;
    window.currentBars = []; window.currentFamilies = []; renderTags();
    document.getElementById('main-form-card').classList.remove('edit-mode');
    document.getElementById('form-title').innerText = "Новая партия";
    document.getElementById('submit-btn').innerText = "СОХРАНИТЬ";
    document.getElementById('cancel-edit-btn').style.display = 'none';
};