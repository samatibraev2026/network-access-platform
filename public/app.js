const API = 'http://localhost:3000/api';

let currentRole = 'user';
let allRequests = [];
let allEmails = [];
let refreshInterval = null;

// ── Role switching ──────────────────────────────────────────────
document.querySelectorAll('.role-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentRole = btn.dataset.role;
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`panel-${currentRole}`).classList.add('active');
    renderAll();
  });
});

// ── Form submit ─────────────────────────────────────────────────
document.getElementById('requestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.getElementById('fullName').value.trim();
  const department = document.getElementById('department').value.trim();
  const resourceType = document.getElementById('resourceType').value;
  const resourceName = document.getElementById('resourceName').value.trim();
  const permissions = document.getElementById('permissions').value;

  if (!fullName || !department || !resourceName) {
    showNotification('Заполните все обязательные поля', 'error');
    return;
  }

  try {
    const res = await fetch(`${API}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, department, resourceType, resourceName, permissions })
    });
    if (!res.ok) throw new Error('Ошибка при создании заявки');
    document.getElementById('requestForm').reset();
    showNotification('Заявка успешно подана!', 'success');
    await loadData();
    renderAll();
  } catch (err) {
    showNotification(err.message, 'error');
  }
});

// ── Load data ───────────────────────────────────────────────────
async function loadData() {
  try {
    const [reqRes, emailRes] = await Promise.all([
      fetch(`${API}/requests`),
      fetch(`${API}/emails`)
    ]);
    allRequests = await reqRes.json();
    allEmails = await emailRes.json();
  } catch (err) {
    console.error('Ошибка загрузки данных:', err);
  }
}

function renderAll() {
  renderUserRequests();
  renderSecurityInbox();
  renderSecurityHistory();
  renderItInbox();
  renderItHistory();
}

// ── User panel ──────────────────────────────────────────────────
function renderUserRequests() {
  const el = document.getElementById('userRequests');
  if (!allRequests.length) {
    el.innerHTML = emptyState('Заявок пока нет');
    return;
  }
  el.innerHTML = allRequests.map(r => `
    <div class="request-item">
      <div class="request-item-header">
        <div class="request-meta">
          <span class="request-num">Заявка № ${r.id}</span>
          <span class="request-name">${esc(r.fullName)}</span>
        </div>
        ${statusBadge(r.status)}
      </div>
      <div class="request-item-body">
        <div class="request-detail">
          <span class="request-detail-label">Тип ресурса:</span>
          <span class="request-detail-value">${resourceTypeLabel(r.resourceType)}</span>
        </div>
        <div class="request-detail">
          <span class="request-detail-label">Ресурс / путь:</span>
          <span class="request-detail-value">${esc(r.resourceName)}</span>
        </div>
        <div class="request-detail">
          <span class="request-detail-label">Права доступа:</span>
          <span class="request-detail-value">${esc(r.permissions)}</span>
        </div>
        <div class="request-detail">
          <span class="request-detail-label">Подразделение:</span>
          <span class="request-detail-value">${esc(r.department)}</span>
        </div>
        <div class="request-detail">
          <span class="request-detail-label">Дата подачи:</span>
          <span class="request-detail-value">${esc(r.createdDate)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Security panel ──────────────────────────────────────────────
function renderSecurityInbox() {
  const el = document.getElementById('securityInbox');
  const badge = document.getElementById('securityBadge');
  const pending = allEmails.filter(e => e.recipient === 'Офицер по ИБ' && e.pending === 1);

  if (!pending.length) {
    el.innerHTML = emptyState('Нет входящих заявок');
    badge.classList.add('hidden');
    return;
  }

  badge.textContent = pending.length;
  badge.classList.remove('hidden');

  el.innerHTML = pending.map(email => `
    <div class="email-item">
      <div class="email-item-header">
        <div style="display:flex;gap:.6rem;align-items:flex-start;">
          <i class="fas fa-exclamation-triangle email-icon"></i>
          <div>
            <div class="email-subject">${esc(email.subject)}</div>
            <div class="email-to">${esc(email.toEmail)}</div>
          </div>
        </div>
        <span class="status-badge status-pending"><i class="fas fa-clock"></i> Ожидает согласования</span>
      </div>
      <div class="email-actions">
        <button class="btn btn-outline btn-sm" onclick="openModal('security', ${email.id})">
          <i class="fas fa-eye"></i> Открыть
        </button>
      </div>
    </div>
  `).join('');
}

function renderSecurityHistory() {
  const el = document.getElementById('securityHistory');
  if (!allRequests.length) {
    el.innerHTML = emptyState('Заявок пока нет');
    return;
  }
  el.innerHTML = allRequests.map(r => `
    <div class="request-item">
      <div class="request-item-header">
        <div class="request-meta">
          <span class="request-num">Заявка № ${r.id}</span>
          <span class="request-name">${esc(r.fullName)}</span>
        </div>
        ${statusBadge(r.status)}
      </div>
      <div class="request-item-body">
        <div class="request-detail">
          <span class="request-detail-label">Подразделение:</span>
          <span class="request-detail-value">${esc(r.department)}</span>
        </div>
        <div class="request-detail">
          <span class="request-detail-label">Ресурс / путь:</span>
          <span class="request-detail-value">${esc(r.resourceName)}</span>
        </div>
        <div class="request-detail">
          <span class="request-detail-label">Права доступа:</span>
          <span class="request-detail-value">${esc(r.permissions)}</span>
        </div>
        <div class="request-detail">
          <span class="request-detail-label">Дата подачи:</span>
          <span class="request-detail-value">${esc(r.createdDate)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ── IT Manager panel ────────────────────────────────────────────
function renderItInbox() {
  const el = document.getElementById('itInbox');
  const badge = document.getElementById('itBadge');
  const pending = allEmails.filter(e => e.recipient === 'Менеджер ИТ' && e.pending === 1 && e.completed === 0);

  if (!pending.length) {
    el.innerHTML = emptyState('Нет заявок к исполнению');
    badge.classList.add('hidden');
    return;
  }

  badge.textContent = pending.length;
  badge.classList.remove('hidden');

  el.innerHTML = pending.map(email => `
    <div class="email-item">
      <div class="email-item-header">
        <div style="display:flex;gap:.6rem;align-items:flex-start;">
          <i class="fas fa-info-circle email-icon approved"></i>
          <div>
            <div class="email-subject">${esc(email.subject)}</div>
            <div class="email-to">${esc(email.toEmail)}</div>
          </div>
        </div>
        <span class="status-badge status-inwork"><i class="fas fa-spinner"></i> В работе</span>
      </div>
      <div class="email-actions">
        <button class="btn btn-outline btn-sm" onclick="openModal('itmanager', ${email.id})">
          <i class="fas fa-eye"></i> Открыть
        </button>
      </div>
    </div>
  `).join('');
}

function renderItHistory() {
  const el = document.getElementById('itHistory');
  const completed = allEmails.filter(e => e.recipient === 'Менеджер ИТ' && e.completed === 1);

  if (!completed.length) {
    el.innerHTML = emptyState('Исполненных заявок нет');
    return;
  }

  el.innerHTML = completed.map(email => {
    const request = allRequests.find(r => r.id === email.requestId);
    return `
    <div class="request-item">
      <div class="request-item-header">
        <div class="request-meta">
          <span class="request-num">Заявка № ${email.requestId}</span>
          ${request ? `<span class="request-name">${esc(request.fullName)}</span>` : ''}
        </div>
        <span class="status-badge status-completed"><i class="fas fa-check"></i> Исполнено</span>
      </div>
      ${request ? `
      <div class="request-item-body">
        <div class="request-detail">
          <span class="request-detail-label">Подразделение:</span>
          <span class="request-detail-value">${esc(request.department)}</span>
        </div>
        <div class="request-detail">
          <span class="request-detail-label">Ресурс / путь:</span>
          <span class="request-detail-value">${esc(request.resourceName)}</span>
        </div>
        <div class="request-detail">
          <span class="request-detail-label">Права доступа:</span>
          <span class="request-detail-value">${esc(request.permissions)}</span>
        </div>
        <div class="request-detail">
          <span class="request-detail-label">Дата исполнения:</span>
          <span class="request-detail-value">${esc(request.itManagerApprovedDate || '—')}</span>
        </div>
      </div>` : ''}
    </div>`;
  }).join('');
}

// ── Modal ───────────────────────────────────────────────────────
function openModal(role, emailId) {
  const email = allEmails.find(e => e.id === emailId);
  if (!email) return;
  const request = allRequests.find(r => r.id === email.requestId);

  let actionsHtml = '';
  if (role === 'security') {
    actionsHtml = `
      <button class="btn btn-success" onclick="approveRequest(${emailId}, true)">
        <i class="fas fa-check"></i> Согласовать
      </button>
      <button class="btn btn-danger" onclick="approveRequest(${emailId}, false)">
        <i class="fas fa-times"></i> Отклонить
      </button>`;
  } else if (role === 'itmanager') {
    actionsHtml = `
      <button class="btn btn-success" onclick="completeRequest(${emailId})">
        <i class="fas fa-clipboard-check"></i> Отметить как исполнено
      </button>`;
  }

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-title"><i class="fas fa-file-alt" style="color:var(--primary);margin-right:.5rem;"></i>Заявка № ${email.requestId}</div>
    <div class="modal-fields">
      ${request ? `
      <div class="modal-field">
        <span class="modal-field-label">ФИО</span>
        <span class="modal-field-value">${esc(request.fullName)}</span>
      </div>
      <div class="modal-field">
        <span class="modal-field-label">Подразделение</span>
        <span class="modal-field-value">${esc(request.department)}</span>
      </div>
      <div class="modal-field">
        <span class="modal-field-label">Тип ресурса</span>
        <span class="modal-field-value">${resourceTypeLabel(request.resourceType)}</span>
      </div>
      <div class="modal-field">
        <span class="modal-field-label">Ресурс / путь</span>
        <span class="modal-field-value">${esc(request.resourceName)}</span>
      </div>
      <div class="modal-field">
        <span class="modal-field-label">Требуемые права доступа</span>
        <span class="modal-field-value">${esc(request.permissions)}</span>
      </div>
      <div class="modal-field">
        <span class="modal-field-label">Дата подачи</span>
        <span class="modal-field-value">${esc(request.createdDate)}</span>
      </div>
      ${request.securityApprovedDate ? `
      <div class="modal-field">
        <span class="modal-field-label">Дата согласования</span>
        <span class="modal-field-value">${esc(request.securityApprovedDate)}</span>
      </div>` : ''}
      ` : `<div class="modal-field"><span class="modal-field-value">${esc(email.body)}</span></div>`}
    </div>
    ${actionsHtml ? `<div class="modal-actions">${actionsHtml}</div>` : ''}
  `;

  document.getElementById('modal').classList.remove('hidden');
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal')) closeModal();
});
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

async function approveRequest(emailId, approve) {
  try {
    const res = await fetch(`${API}/emails/${emailId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve })
    });
    if (!res.ok) throw new Error('Ошибка при обработке заявки');
    closeModal();
    showNotification(approve ? 'Заявка согласована!' : 'Заявка отклонена', approve ? 'success' : 'error');
    await loadData();
    renderAll();
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

async function completeRequest(emailId) {
  try {
    const res = await fetch(`${API}/emails/${emailId}/complete`, { method: 'POST' });
    if (!res.ok) throw new Error('Ошибка при исполнении заявки');
    closeModal();
    showNotification('Заявка отмечена как исполненная!', 'success');
    await loadData();
    renderAll();
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// ── Helpers ─────────────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    'в обработке': `<span class="status-badge status-pending"><i class="fas fa-clock"></i> в обработке</span>`,
    'согласовано':  `<span class="status-badge status-approved"><i class="fas fa-check-circle"></i> согласовано</span>`,
    'отказано':     `<span class="status-badge status-rejected"><i class="fas fa-times-circle"></i> отказано</span>`
  };
  return map[status] || `<span class="status-badge">${esc(status)}</span>`;
}

function resourceTypeLabel(type) {
  return type === 'network_folder' ? 'Сетевая папка' : 'Сетевой ресурс';
}

function emptyState(text) {
  return `<p class="empty-state"><i class="fas fa-inbox"></i>${text}</p>`;
}

function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showNotification(msg, type = 'success') {
  const el = document.getElementById('notification');
  el.className = `notification ${type}`;
  el.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3500);
}

// ── Init ─────────────────────────────────────────────────────────
(async function init() {
  await loadData();
  renderAll();
  refreshInterval = setInterval(async () => {
    await loadData();
    renderAll();
  }, 5000);
})();
