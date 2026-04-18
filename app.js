import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import {
    getFirestore, collection, addDoc, onSnapshot, query, orderBy,
    updateDoc, doc, enableIndexedDbPersistence, deleteDoc, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

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

// ═══════════════════════════════════════════════════
// TAG MANAGEMENT
// ═══════════════════════════════════════════════════
window.currentBars = [];
window.currentFamilies = [];

window.addBarTag = () => {
    const input = document.getElementById('input-bar-val');
    const val = input.value.trim();
    if (val && !window.currentBars.includes(val)) {
        window.currentBars.push(val);
        renderTags();
    }
    input.value = '';
    input.focus();
};

window.addFamilyTag = () => {
    const input = document.getElementById('input-family-val');
    const val = input.value.trim();
    if (val && !window.currentFamilies.includes(val)) {
        window.currentFamilies.push(val);
        renderTags();
    }
    input.value = '';
    input.focus();
};

window.removeTag = (type, val) => {
    if (type === 'bar') window.currentBars = window.currentBars.filter(b => b !== val);
    else window.currentFamilies = window.currentFamilies.filter(f => f !== val);
    renderTags();
};

function renderTags() {
    document.getElementById('bar-tags-container').innerHTML =
        window.currentBars.map(b =>
            `<span class="badge-del badge-bar" onclick="window.removeTag('bar','${b}')">${b} ✕</span>`
        ).join('');
    document.getElementById('family-tags-container').innerHTML =
        window.currentFamilies.map(f =>
            `<span class="badge-del badge-family" onclick="window.removeTag('family','${f}')">${f} ✕</span>`
        ).join('');
}

// Enter key support in tag inputs
document.getElementById('input-bar-val').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); window.addBarTag(); }
});
document.getElementById('input-family-val').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); window.addFamilyTag(); }
});

window.batchesData = {};

// ═══════════════════════════════════════════════════
// FORM SUBMIT
// ═══════════════════════════════════════════════════
document.getElementById('add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = e.target.dataset.editId;
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

    try {
        if (editId) {
            await updateDoc(doc(db, "batches", editId), data);
            window.cancelEdit();
            closeSheet();
            showToast('✅ Изменения сохранены');
        } else {
            data.createdAt = Date.now();
            data.crossedBars = [];
            data.crossedFamilies = [];
            await addDoc(collection(db, "batches"), data);
            e.target.reset();
            document.getElementById('input-date').valueAsDate = new Date();
            document.getElementById('input-lineage').value = 'B-';
            window.currentBars = [];
            window.currentFamilies = [];
            renderTags();
            closeSheet();
            showToast('🐝 Партия добавлена');
        }
    } catch (err) {
        showToast('❌ Ошибка сохранения', 'error');
    }
});

// ═══════════════════════════════════════════════════
// SNAPSHOT & RENDER (BUG FIX: no DOM thrashing, no auto-archive loop)
// ═══════════════════════════════════════════════════

// Track which IDs have already been auto-archived to prevent infinite loop
const autoArchivedSet = new Set();

onSnapshot(
    query(collection(db, "batches"), orderBy("expectedHatchTimestamp", "asc")),
    (snapshot) => {
        const now = Date.now();
        const today = new Date().setHours(0, 0, 0, 0);
        const tomorrow = today + 86400000;
        const archiveLimit = 2 * 24 * 60 * 60 * 1000;

        // Collect IDs needing auto-archive — do it OUTSIDE render to avoid feedback loop
        const toArchive = [];

        const lists = { events: '', active: '', history: '' };

        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            const id = docSnap.id;
            window.batchesData[id] = d;

            // Auto-archive check — only queue once per document
            if (
                d.status === 'active' &&
                now > (d.expectedHatchTimestamp + archiveLimit) &&
                !autoArchivedSet.has(id)
            ) {
                autoArchivedSet.add(id);
                toArchive.push(id);
                // Render as history immediately (don't skip)
                lists.history += buildCard(id, { ...d, status: 'history' }, today, tomorrow);
                return;
            }

            const html = buildCard(id, d, today, tomorrow);

            if (d.status === 'history') {
                lists.history += html;
            } else {
                lists.active += html;
                const hatchTime = new Date(d.expectedHatchTimestamp).setHours(0, 0, 0, 0);
                const selectTime = new Date(d.selectionDateTimestamp).setHours(0, 0, 0, 0);
                if (hatchTime <= tomorrow || selectTime <= tomorrow) {
                    lists.events += buildCard(id, d, today, tomorrow, true);
                }
            }
        });

        // Update DOM — single pass, write to both mobile and desktop containers
        const emptyEv = emptyState('🌿', 'Термінових подій немає');
        const emptyAc = emptyState('🍯', 'Активних партій немає');
        const emptyHi = emptyState('📦', 'Архів порожній');

        const evHtml = lists.events || emptyEv;
        const acHtml = lists.active || emptyAc;
        const hiHtml = lists.history || emptyHi;

        // Mobile
        const evEl = document.getElementById('events-list');
        const acEl = document.getElementById('active-list');
        const hiEl = document.getElementById('history-list');
        if (evEl) evEl.innerHTML = evHtml;
        if (acEl) acEl.innerHTML = acHtml;
        if (hiEl) hiEl.innerHTML = hiHtml;

        // Desktop
        const devEl = document.getElementById('d-events-list');
        const dacEl = document.getElementById('d-active-list');
        const dhiEl = document.getElementById('d-history-list');
        if (devEl) devEl.innerHTML = evHtml;
        if (dacEl) dacEl.innerHTML = acHtml;
        if (dhiEl) dhiEl.innerHTML = hiHtml;

        // Events dot/badge
        const dot = document.getElementById('events-dot');
        if (dot) dot.classList.toggle('visible', lists.events !== '');
        const badge = document.getElementById('desktop-events-badge');
        if (badge) {
            const count = (lists.events.match(/class="card/g) || []).length;
            badge.textContent = count || '';
            badge.classList.toggle('visible', lists.events !== '');
        }

        // Fire archive updates after render (async, won't trigger extra onSnapshot loops due to Set guard)
        toArchive.forEach(id => {
            updateDoc(doc(db, "batches", id), { status: 'history' });
        });
    }
);

function emptyState(icon, text) {
    return `<div class="empty-state"><div class="empty-state-icon">${icon}</div><div class="empty-state-text">${text}</div></div>`;
}

function buildCard(id, d, today, tomorrow, isAlert = false) {
    const hatchTime = new Date(d.expectedHatchTimestamp).setHours(0, 0, 0, 0);
    const selectTime = new Date(d.selectionDateTimestamp).setHours(0, 0, 0, 0);
    const isHistory = d.status === 'history';

    const hatchOverdue = hatchTime <= today;
    const selectSoon = selectTime <= tomorrow;

    const safeId = id.replace(/'/g, "\\'");

    const buildTags = (arr, crossed, type, colorClass) =>
        (arr || []).map(val => {
            const isCr = (crossed || []).includes(val);
            const safeVal = val.replace(/'/g, "\\'");
            return `<button class="btn-tag ${colorClass}${isCr ? ' crossed' : ''}" onclick="window.toggleCross('${safeId}','${type}','${safeVal}',${isCr})">${val}</button>`;
        }).join('');

    const familyTags = buildTags(d.families, d.crossedFamilies, 'Families', 'family-btn');
    const barTags = buildTags(d.bars, d.crossedBars, 'Bars', 'bar-btn');

    const hatchDateStr = new Date(d.expectedHatchTimestamp).toLocaleDateString('ru-RU');
    const selectDateStr = new Date(d.selectionDateTimestamp).toLocaleDateString('ru-RU');

    const piecesHtml = d.pieces
        ? `<span class="card-pieces">📦 ${d.pieces} шт.</span>`
        : `<span class="card-pieces missing">📦 не указано!</span>`;

    const commentHtml = d.comment
        ? `<div class="card-comment">💬 ${d.comment}</div>`
        : '';

    const actionsHtml = isHistory ? '' : `
        <div class="card-actions">
            <button class="btn-action btn-edit" onclick="window.editBatch('${safeId}')">✏️ Изменить</button>
            <button class="btn-action btn-danger" onclick="window.deleteBatch('${safeId}')">🗑 Удалить</button>
        </div>`;

    const cardClass = isAlert ? 'card alert' : (isHistory ? 'card history' : 'card');

    return `
    <div class="${cardClass}">
        <div class="card-accent"></div>
        <div class="card-body">
            <div class="card-name">${d.lineage}</div>
            ${familyTags ? `<div class="card-row"><span class="card-row-label">Семьи</span><div class="card-row-val tags-wrap">${familyTags}</div></div>` : ''}
            ${barTags ? `<div class="card-row"><span class="card-row-label">Планки</span><div class="card-row-val tags-wrap">${barTags}</div></div>` : ''}
            <div class="card-row"><span class="card-row-label">Кол-во</span><div class="card-row-val">${piecesHtml}</div></div>
            <div class="card-dates">
                <div class="date-chip${selectSoon && !isHistory ? ' soon' : ''}">
                    <div class="date-chip-label">🔍 Отбор</div>
                    <div class="date-chip-val">${selectDateStr}</div>
                </div>
                <div class="date-chip${hatchOverdue && !isHistory ? ' overdue' : ''}">
                    <div class="date-chip-label">🐣 Выход</div>
                    <div class="date-chip-val">${hatchDateStr}</div>
                </div>
            </div>
            ${commentHtml}
            ${actionsHtml}
        </div>
    </div>`;
}

// ═══════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════

// BUG FIX: was using same expression for both branches
window.toggleCross = async (id, type, val, isCrossed) => {
    const field = `crossed${type}`;
    await updateDoc(doc(db, "batches", id), {
        [field]: isCrossed ? arrayRemove(val) : arrayUnion(val)
    });
};

window.deleteBatch = id => {
    if (confirm("Удалить навсегда?")) {
        deleteDoc(doc(db, "batches", id));
        showToast('🗑 Удалено');
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
    renderTags();

    document.getElementById('sheet-title').textContent = '✏️ Изменение партии';
    document.getElementById('submit-btn').textContent = 'СОХРАНИТЬ';
    document.getElementById('cancel-edit-btn').style.display = 'block';
    document.getElementById('form-actions').classList.add('has-cancel');
    document.getElementById('add-form').dataset.editId = id;

    openSheet(true);
};

window.cancelEdit = () => {
    document.getElementById('add-form').reset();
    delete document.getElementById('add-form').dataset.editId;
    window.currentBars = [];
    window.currentFamilies = [];
    renderTags();
    document.getElementById('sheet-title').textContent = '🐝 Новая партия';
    document.getElementById('submit-btn').textContent = 'СОХРАНИТЬ';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    document.getElementById('form-actions').classList.remove('has-cancel');
    document.getElementById('input-date').valueAsDate = new Date();
    document.getElementById('input-lineage').value = 'B-';
};
