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

window.appMode = 'batches';

window.currentBars = [];
window.currentFamilies = [];
window.currentFFamilies = [];
window.batchesData = {};
window.familiesData = {};

window.listsBatches = { events: '', active: '', history: '', count: 0 };
window.listsFamilies = { events: '', active: '', history: '', count: 0 };

window.setAppMode = (mode) => {
    window.appMode = mode;
    document.querySelectorAll('.mode-tab').forEach(el => {
        el.classList.toggle('active', el.dataset.mode === mode);
    });
    
    document.getElementById('form-batches-fields').style.display = mode === 'batches' ? 'block' : 'none';
    document.getElementById('form-families-fields').style.display = mode === 'families' ? 'block' : 'none';
    
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    if(mode === 'batches') {
        document.getElementById('input-date').value = new Date(Date.now() - tzoffset).toISOString().slice(0, 10);
    } else {
        document.getElementById('input-family-date').value = new Date(Date.now() - tzoffset).toISOString().slice(0, 10);
    }
    
    window.renderDOM();
};

window.addBarTag = (isFamily = false) => {
    const input = document.getElementById(isFamily ? 'input-family-val' : 'input-bar-val');
    const val = input.value.trim();
    if (val) {
        if (isFamily && !window.currentFamilies.includes(val)) window.currentFamilies.push(val);
        if (!isFamily && !window.currentBars.includes(val)) window.currentBars.push(val);
        window.renderTags();
    }
    input.value = '';
    input.focus();
};

window.addFFamilyTag = () => {
    const input = document.getElementById('input-f-family-val');
    const val = input.value.trim();
    if (val && !window.currentFFamilies.includes(val)) {
        window.currentFFamilies.push(val);
        window.renderTags();
    }
    input.value = '';
    input.focus();
};

window.removeTag = (type, val) => {
    if (type === 'bar') window.currentBars = window.currentBars.filter(b => b !== val);
    else if (type === 'family') window.currentFamilies = window.currentFamilies.filter(f => f !== val);
    else if (type === 'ffamily') window.currentFFamilies = window.currentFFamilies.filter(f => f !== val);
    window.renderTags();
};

window.renderTags = () => {
    document.getElementById('bar-tags-container').innerHTML = window.currentBars.map(b => `<span class="badge-del badge-bar" onclick="window.removeTag('bar','${b}')">${b} ✕</span>`).join('');
    document.getElementById('family-tags-container').innerHTML = window.currentFamilies.map(f => `<span class="badge-del badge-family" onclick="window.removeTag('family','${f}')">${f} ✕</span>`).join('');
    document.getElementById('f-family-tags-container').innerHTML = window.currentFFamilies.map(f => `<span class="badge-del badge-family" onclick="window.removeTag('ffamily','${f}')">${f} ✕</span>`).join('');
};

document.getElementById('input-bar-val').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); window.addBarTag(false); } });
document.getElementById('input-family-val').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); window.addBarTag(true); } });
document.getElementById('input-f-family-val').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); window.addFFamilyTag(); } });

document.getElementById('add-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = e.target.dataset.editId;
    
    try {
        if (window.appMode === 'batches') {
            const graftDate = new Date(document.getElementById('input-date').value);
            const hatch = new Date(graftDate);
            hatch.setDate(hatch.getDate() + 11);
            const select = new Date(graftDate);
            select.setDate(select.getDate() + 9);

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

            if (editId) {
                updateDoc(doc(db, "batches", editId), data);
            } else {
                data.createdAt = Date.now();
                data.crossedBars = [];
                data.crossedFamilies = [];
                addDoc(collection(db, "batches"), data);
            }
        } else {
            const dateStr = document.getElementById('input-family-date').value;
            const [y, m, d] = dateStr.split('-');
            const selectedDate = new Date(y, m - 1, d);
            const createdAt = isNaN(selectedDate.getTime()) ? Date.now() : selectedDate.getTime();
            
            const data = {
                families: window.currentFFamilies,
                comment: document.getElementById('input-comment').value,
                status: 'active'
            };

            if (editId) {
                const existing = window.familiesData[editId];
                if(existing) {
                    data.createdAt = createdAt;
                    data.history = existing.history || [];
                    
                    if (data.history.length > 0) {
                        const lastCheck = data.history[data.history.length - 1];
                        data.nextCheckTimestamp = lastCheck + 864000000;
                    } else {
                        data.nextCheckTimestamp = createdAt + 864000000;
                    }
                }
                updateDoc(doc(db, "families", editId), data);
            } else {
                data.createdAt = createdAt;
                data.nextCheckTimestamp = createdAt + 864000000;
                data.history = [];
                addDoc(collection(db, "families"), data);
            }
        }

        window.cancelEdit();
        closeSheet();

    } catch (err) {
        console.error(err);
    }
});

onSnapshot(query(collection(db, "batches"), orderBy("expectedHatchTimestamp", "asc")), (snapshot) => {
    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const tomorrow = today + 86400000;
    const archiveLimit = 172800000;

    let events = '', active = '', history = '', count = 0;

    snapshot.forEach(docSnap => {
        const d = docSnap.data();
        const id = docSnap.id;
        window.batchesData[id] = d;

        const isEffHistory = d.status === 'history' || (d.status === 'active' && now > (d.expectedHatchTimestamp + archiveLimit));
        const html = buildBatchCard(id, { ...d, status: isEffHistory ? 'history' : d.status }, today, tomorrow);

        if (isEffHistory) {
            history += html;
        } else {
            active += html;
            const hT = new Date(d.expectedHatchTimestamp).setHours(0, 0, 0, 0);
            const sT = new Date(d.selectionDateTimestamp).setHours(0, 0, 0, 0);
            if (hT <= tomorrow || sT <= tomorrow) {
                events += buildBatchCard(id, { ...d, status: d.status }, today, tomorrow, true);
                count++;
            }
        }
    });

    window.listsBatches = { events, active, history, count };
    if(window.appMode === 'batches') window.renderDOM();
});

onSnapshot(query(collection(db, "families"), orderBy("nextCheckTimestamp", "asc")), (snapshot) => {
    const today = new Date().setHours(0, 0, 0, 0);
    const tomorrow = today + 86400000;

    let events = '', active = '', history = '', count = 0;

    snapshot.forEach(docSnap => {
        const d = docSnap.data();
        const id = docSnap.id;
        window.familiesData[id] = d;

        const html = buildFamilyCard(id, d, today, tomorrow, false);

        if (d.status === 'history') {
            history += html;
        } else {
            active += html;
            const nT = new Date(d.nextCheckTimestamp).setHours(0, 0, 0, 0);
            if (nT <= tomorrow) {
                events += buildFamilyCard(id, d, today, tomorrow, true);
                count++;
            }
        }
    });

    window.listsFamilies = { events, active, history, count };
    if(window.appMode === 'families') window.renderDOM();
});

window.renderDOM = () => {
    const lists = window.appMode === 'batches' ? window.listsBatches : window.listsFamilies;
    
    const evEl = document.getElementById('events-list');
    const acEl = document.getElementById('active-list');
    const hiEl = document.getElementById('history-list');
    const devEl = document.getElementById('d-events-list');
    const dacEl = document.getElementById('d-active-list');
    const dhiEl = document.getElementById('d-history-list');
    
    const emptyEv = `<div class="empty-state"><div class="empty-state-icon">🌿</div><div class="empty-state-text">Термінових подій немає</div></div>`;
    const emptyAc = `<div class="empty-state"><div class="empty-state-icon">🍯</div><div class="empty-state-text">Активних записів немає</div></div>`;
    const emptyHi = `<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">Архів порожній</div></div>`;

    const evHtml = lists.events || emptyEv;
    const acHtml = lists.active || emptyAc;
    const hiHtml = lists.history || emptyHi;

    if (evEl) evEl.innerHTML = evHtml;
    if (acEl) acEl.innerHTML = acHtml;
    if (hiEl) hiEl.innerHTML = hiHtml;
    if (devEl) devEl.innerHTML = evHtml;
    if (dacEl) dacEl.innerHTML = acHtml;
    if (dhiEl) dhiEl.innerHTML = hiHtml;

    const dot = document.getElementById('events-dot');
    if (dot) dot.classList.toggle('visible', lists.count > 0);
    const badge = document.getElementById('desktop-events-badge');
    if (badge) {
        badge.textContent = lists.count || '';
        badge.classList.toggle('visible', lists.count > 0);
    }
};

function buildBatchCard(id, d, today, tomorrow, isAlert = false) {
    const hatchTime = new Date(d.expectedHatchTimestamp).setHours(0, 0, 0, 0);
    const selectTime = new Date(d.selectionDateTimestamp).setHours(0, 0, 0, 0);
    const isHistory = d.status === 'history';
    const safeId = id.replace(/'/g, "\\'");

    let selectClass = '', hatchClass = '';
    if (!isHistory) {
        if (selectTime - today < 0) selectClass = 'overdue';
        else if (selectTime - today === 0) selectClass = 'today';
        else if (selectTime - today === 86400000) selectClass = 'soon';

        if (hatchTime - today < 0) hatchClass = 'overdue';
        else if (hatchTime - today === 0) hatchClass = 'today';
        else if (hatchTime - today === 86400000) hatchClass = 'soon';
    }

    const buildTags = (arr, crossed, type, colorClass) => (arr || []).map(val => {
        const isCr = (crossed || []).includes(val);
        const safeVal = val.replace(/'/g, "\\'");
        return `<button class="btn-tag ${colorClass}${isCr ? ' crossed' : ''}" onclick="window.toggleCross('${safeId}','${type}','${safeVal}',${isCr})">${val}</button>`;
    }).join('');

    const piecesHtml = d.pieces ? `<span class="card-pieces">📦 ${d.pieces} шт.</span>` : `<span class="card-pieces missing">📦 не указано!</span>`;
    const cardClass = isAlert ? 'card alert' : (isHistory ? 'card history' : 'card');

    return `
    <div class="${cardClass}">
        <div class="card-accent"></div>
        <div class="card-body">
            <div class="card-name">${d.lineage}</div>
            ${d.families && d.families.length ? `<div class="card-row"><span class="card-row-label">Семьи</span><div class="card-row-val tags-wrap">${buildTags(d.families, d.crossedFamilies, 'Families', 'family-btn')}</div></div>` : ''}
            ${d.bars && d.bars.length ? `<div class="card-row"><span class="card-row-label">Планки</span><div class="card-row-val tags-wrap">${buildTags(d.bars, d.crossedBars, 'Bars', 'bar-btn')}</div></div>` : ''}
            <div class="card-row"><span class="card-row-label">Кол-во</span><div class="card-row-val">${piecesHtml}</div></div>
            <div class="card-dates">
                <div class="date-chip ${selectClass}"><div class="date-chip-label">🔍 Отбор</div><div class="date-chip-val">${new Date(d.selectionDateTimestamp).toLocaleDateString('ru-RU')}</div></div>
                <div class="date-chip ${hatchClass}"><div class="date-chip-label">🐣 Выход</div><div class="date-chip-val">${new Date(d.expectedHatchTimestamp).toLocaleDateString('ru-RU')}</div></div>
            </div>
            ${d.comment ? `<div class="card-comment">💬 ${d.comment}</div>` : ''}
            <div class="card-actions">
                ${isHistory ? `<button class="btn-action btn-danger" onclick="window.deleteItem('batches', '${safeId}')">🗑 Удалить</button>` : `<button class="btn-action btn-edit" onclick="window.editBatch('${safeId}')">✏️ Изменить</button>`}
            </div>
        </div>
    </div>`;
}

function buildFamilyCard(id, d, today, tomorrow, isAlert = false) {
    const isHistory = d.status === 'history';
    const nextT = new Date(d.nextCheckTimestamp).setHours(0, 0, 0, 0);
    const safeId = id.replace(/'/g, "\\'");

    let nClass = '';
    let showRenew = false;
    
    if (!isHistory) {
        if (nextT - today < 0) { nClass = 'overdue'; showRenew = true; }
        else if (nextT - today === 0) { nClass = 'today'; showRenew = true; }
        else if (nextT - today === 86400000) { nClass = 'soon'; showRenew = true; }
    }

    const tagsHtml = (d.families || []).map(val => `<button class="btn-tag family-btn" onclick="event.stopPropagation()">${val}</button>`).join('');
    const histHtml = (d.history || []).map(t => `<div class="history-item">✅ Перевірено: ${new Date(t).toLocaleDateString('ru-RU')}</div>`).join('');
    const historyBlock = `<div class="family-history" id="history-${safeId}"><div class="history-item">🌱 Створено: ${new Date(d.createdAt).toLocaleDateString('ru-RU')}</div>${histHtml}</div>`;
    const cardClass = isAlert ? 'card alert' : (isHistory ? 'card history' : 'card');

    return `
    <div class="${cardClass}" onclick="window.toggleFamilyHistory(event, '${safeId}')" style="cursor: pointer;">
        <div class="card-accent"></div>
        <div class="card-body">
            <div class="card-name">Сім'ї: ${(d.families || []).join(', ')}</div>
            ${tagsHtml ? `<div class="card-row"><div class="card-row-val tags-wrap">${tagsHtml}</div></div>` : ''}
            <div class="card-dates single">
                <div class="date-chip ${nClass}"><div class="date-chip-label">🔍 Наступна перевірка</div><div class="date-chip-val">${new Date(d.nextCheckTimestamp).toLocaleDateString('ru-RU')}</div></div>
            </div>
            ${d.comment ? `<div class="card-comment">💬 ${d.comment}</div>` : ''}
            ${historyBlock}
            <div class="card-actions">
                ${isHistory ? `<button class="btn-action btn-danger" onclick="event.stopPropagation(); window.deleteItem('families', '${safeId}')">🗑 Удалить</button>` : `
                ${showRenew ? `<button class="btn-action btn-success" onclick="event.stopPropagation(); window.renewFamily('${safeId}')">⏳ Продлить</button>` : ''}
                <button class="btn-action btn-edit" onclick="event.stopPropagation(); window.editFamily('${safeId}')">✏️ Изменить</button>`}
            </div>
        </div>
    </div>`;
}

window.toggleCross = async (id, type, val, isCrossed) => {
    await updateDoc(doc(db, "batches", id), { [`crossed${type}`]: isCrossed ? arrayRemove(val) : arrayUnion(val) });
};

window.toggleFamilyHistory = (e, id) => {
    if (e && e.target.closest('button')) return;
    const el = document.getElementById(`history-${id}`);
    if(el) el.classList.toggle('show');
};

window.renewFamily = async (id) => {
    const f = window.familiesData[id];
    if (!f) return;
    const now = Date.now();
    await updateDoc(doc(db, "families", id), { history: [...(f.history || []), now], nextCheckTimestamp: now + 864000000 });
};

window.deleteItem = (col, id) => {
    if (confirm("Удалить навсегда?")) deleteDoc(doc(db, col, id));
};

window.deleteFromEdit = () => {
    const id = document.getElementById('add-form').dataset.editId;
    const col = document.getElementById('add-form').dataset.editCollection;
    if (id && col) {
        window.deleteItem(col, id);
        window.cancelEdit();
        closeSheet();
    }
};

window.editBatch = id => {
    const d = window.batchesData[id];
    document.getElementById('input-date').value = d.graftDateStr;
    document.getElementById('input-lineage').value = d.lineage;
    document.getElementById('input-pieces').value = d.pieces;
    document.getElementById('input-comment').value = d.comment || '';
    window.currentBars = [...(d.bars || [])];
    window.currentFamilies = [...(d.families || [])];
    window.renderTags();

    document.getElementById('sheet-title').textContent = '✏️ Редагування партії';
    document.getElementById('add-form').dataset.editId = id;
    document.getElementById('add-form').dataset.editCollection = 'batches';
    
    document.getElementById('cancel-edit-btn').style.display = 'block';
    document.getElementById('delete-edit-btn').style.display = 'block';
    document.getElementById('form-actions').classList.add('is-editing');
    
    openSheet(true);
};

window.editFamily = id => {
    const d = window.familiesData[id];
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    document.getElementById('input-family-date').value = new Date(d.createdAt - tzoffset).toISOString().slice(0, 10);
    document.getElementById('input-comment').value = d.comment || '';
    window.currentFFamilies = [...(d.families || [])];
    window.renderTags();

    document.getElementById('sheet-title').textContent = '✏️ Редагування сім\'ї';
    document.getElementById('add-form').dataset.editId = id;
    document.getElementById('add-form').dataset.editCollection = 'families';
    
    document.getElementById('cancel-edit-btn').style.display = 'block';
    document.getElementById('delete-edit-btn').style.display = 'block';
    document.getElementById('form-actions').classList.add('is-editing');
    
    openSheet(true);
};

window.cancelEdit = () => {
    document.getElementById('add-form').reset();
    delete document.getElementById('add-form').dataset.editId;
    delete document.getElementById('add-form').dataset.editCollection;
    
    window.currentBars = [];
    window.currentFamilies = [];
    window.currentFFamilies = [];
    window.renderTags();
    
    document.getElementById('sheet-title').textContent = window.appMode === 'batches' ? '📖 Нова партія' : '🏠 Нова перевірка сім\'ї';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    document.getElementById('delete-edit-btn').style.display = 'none';
    document.getElementById('form-actions').classList.remove('is-editing');
    
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    document.getElementById('input-date').value = new Date(Date.now() - tzoffset).toISOString().slice(0, 10);
    document.getElementById('input-family-date').value = new Date(Date.now() - tzoffset).toISOString().slice(0, 10);
    document.getElementById('input-lineage').value = 'B-';
};