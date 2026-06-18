// localStorage-based storage (no server needed)
const STORAGE_KEY_REQUESTS = 'nap_requests';
const STORAGE_KEY_EMAILS   = 'nap_emails';

function loadRequests() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY_REQUESTS) || '[]');
}
function saveRequests(data) {
  localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(data));
}
function loadEmails() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY_EMAILS) || '[]');
}
function saveEmails(data) {
  localStorage.setItem(STORAGE_KEY_EMAILS, JSON.stringify(data));
}
function nextId(arr) {
  return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
}
function getCurrentDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}
function resourceTypeLabel(type) {
  return type === 'network_folder' ? 'Сетевая папка' : 'Сетевой ресурс';
}

// ── Role switching ──────────────────────────────────────────────
document.querySelectorAll('.role-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`panel-${btn.dataset.role}`).classList.add('active');
    renderAll();
  });
});

// ── Form submit ─────────────────────────────────────────────────
document.getElementById('requestForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const fullName    = document.getElementById('fullName').value.trim();
  const department  = document.getElementById('department').value.trim();
  const resourceType = document.getElementById('resourceType').value;
  const resourceName = document.getElementById('resourceName').value.trim();
  const permissions  = document.getElementById('permissions').value;

  if (!fullName || !department || !resourceName) {
    showNotification('Заполните все обязательные поля', 'error');
    return;
  }

  const requests = loadRequests();
  const emails   = loadEmails();
  const createdDate = getCurrentDate();
  const id = nextId(requests);

  const newRequest = { id, fullName, department, resourceType, resourceName, permissions,
    status: 'в обработке', createdDate, securityApprovedDate: null, itManagerApprovedDate: null };
  requests.unshift(newRequest);
  saveRequests(requests);

  const emailId = nextId(emails);
  emails.unshift({
    id: emailId,
    recipient: 'Офицер по ИБ',
    toEmail: 'security@company.ru',
    subject: `Новая заявка на доступ: ${fullName}`,
    pending: 1, approved: null, completed: 0,
    requestId: id, createdDate
  });
  saveEmails(emails);

  document.getElementById('requestForm').reset();
  showNotification('Заявка успешно подана!', 'success');
  renderAll();
});

// ── Render ──────────────────────────────────────────────────────
function renderAll() {
  const requests = loadRequests();
  const emails   = loadEmails();
  renderUserRequests(requests);
  renderSecurityInbox(emails, requests);
  renderSecurityHistory(requests);
  renderItInbox(emails, requests);
  renderItHistory(emails, requests);
}

function renderUserRequests(requests) {
  const el = document.getElementById('userRequests');
  if (!requests.length) { el.innerHTML = emptyState('Заявок пока нет'); return; }
  el.innerHTML = requests.map(r => `
    <div class="request-item">
      <div class="request-item-header">
        <div class="request-meta">
          <span class="request-num">Заявка № ${r.id}</span>
          <span class="request-name">${esc(r.fullName)}</span>
        </div>
        ${statusBadge(r.status)}
      </div>
      <div class="request-item-body">
        <div class="request-detail"><span class="request-detail-label">Тип ресурса:</span><span class="request-detail-value">${resourceTypeLabel(r.resourceType)}</span></div>
        <div class="request-detail"><span class="request-detail-label">Ресурс / путь:</span><span class="request-detail-value">${esc(r.resourceName)}</span></div>
        <div class="request-detail"><span class="request-detail-label">Права доступа:</span><span class="request-detail-value">${esc(r.permissions)}</span></div>
        <div class="request-detail"><span class="request-detail-label">Подразделение:</span><span class="request-detail-value">${esc(r.department)}</span></div>
        <div class="request-detail"><span class="request-detail-label">Дата подачи:</span><span class="request-detail-value">${esc(r.createdDate)}</span></div>
      </div>
    </div>`).join('');
}

function renderSecurityInbox(emails, requests) {
  const el = document.getElementById('securityInbox');
  const badge = document.getElementById('securityBadge');
  const pending = emails.filter(e => e.recipient === 'Офицер по ИБ' && e.pending === 1);
  if (!pending.length) { el.innerHTML = emptyState('Нет входящих заявок'); badge.classList.add('hidden'); return; }
  badge.textContent = pending.length; badge.classList.remove('hidden');
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
    </div>`).join('');
}

function renderSecurityHistory(requests) {
  const el = document.getElementById('securityHistory');
  if (!requests.length) { el.innerHTML = emptyState('Заявок пока нет'); return; }
  el.innerHTML = requests.map(r => `
    <div class="request-item">
      <div class="request-item-header">
        <div class="request-meta">
          <span class="request-num">Заявка № ${r.id}</span>
          <span class="request-name">${esc(r.fullName)}</span>
        </div>
        ${statusBadge(r.status)}
      </div>
      <div class="request-item-body">
        <div class="request-detail"><span class="request-detail-label">Подразделение:</span><span class="request-detail-value">${esc(r.department)}</span></div>
        <div class="request-detail"><span class="request-detail-label">Ресурс / путь:</span><span class="request-detail-value">${esc(r.resourceName)}</span></div>
        <div class="request-detail"><span class="request-detail-label">Права доступа:</span><span class="request-detail-value">${esc(r.permissions)}</span></div>
        <div class="request-detail"><span class="request-detail-label">Дата подачи:</span><span class="request-detail-value">${esc(r.createdDate)}</span></div>
      </div>
    </div>`).join('');
}

function renderItInbox(emails, requests) {
  const el = document.getElementById('itInbox');
  const badge = document.getElementById('itBadge');
  const pending = emails.filter(e => e.recipient === 'Менеджер ИТ' && e.pending === 1 && e.completed === 0);
  if (!pending.length) { el.innerHTML = emptyState('Нет заявок к исполнению'); badge.classList.add('hidden'); return; }
  badge.textContent = pending.length; badge.classList.remove('hidden');
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
    </div>`).join('');
}

function renderItHistory(emails, requests) {
  const el = document.getElementById('itHistory');
  const completed = emails.filter(e => e.recipient === 'Менеджер ИТ' && e.completed === 1);
  if (!completed.length) { el.innerHTML = emptyState('Исполненных заявок нет'); return; }
  el.innerHTML = completed.map(email => {
    const r = requests.find(x => x.id === email.requestId);
    return `
    <div class="request-item">
      <div class="request-item-header">
        <div class="request-meta">
          <span class="request-num">Заявка № ${email.requestId}</span>
          ${r ? `<span class="request-name">${esc(r.fullName)}</span>` : ''}
        </div>
        <span class="status-badge status-completed"><i class="fas fa-check"></i> Исполнено</span>
      </div>
      ${r ? `<div class="request-item-body">
        <div class="request-detail"><span class="request-detail-label">Подразделение:</span><span class="request-detail-value">${esc(r.department)}</span></div>
        <div class="request-detail"><span class="request-detail-label">Ресурс / путь:</span><span class="request-detail-value">${esc(r.resourceName)}</span></div>
        <div class="request-detail"><span class="request-detail-label">Права доступа:</span><span class="request-detail-value">${esc(r.permissions)}</span></div>
        <div class="request-detail"><span class="request-detail-label">Дата исполнения:</span><span class="request-detail-value">${esc(r.itManagerApprovedDate || '—')}</span></div>
      </div>` : ''}
    </div>`;
  }).join('');
}

// ── Modal ───────────────────────────────────────────────────────
function openModal(role, emailId) {
  const emails   = loadEmails();
  const requests = loadRequests();
  const email  = emails.find(e => e.id === emailId);
  if (!email) return;
  const request = requests.find(r => r.id === email.requestId);

  let actionsHtml = '';
  if (role === 'security') {
    actionsHtml = `
      <button class="btn btn-success" onclick="approveRequest(${emailId}, true)"><i class="fas fa-check"></i> Согласовать</button>
      <button class="btn btn-danger"  onclick="approveRequest(${emailId}, false)"><i class="fas fa-times"></i> Отклонить</button>`;
  } else if (role === 'itmanager') {
    actionsHtml = `
      <button class="btn btn-success" onclick="completeRequest(${emailId})"><i class="fas fa-clipboard-check"></i> Отметить как исполнено</button>`;
  }

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-title"><i class="fas fa-file-alt" style="color:var(--primary);margin-right:.5rem;"></i>Заявка № ${email.requestId}</div>
    <div class="modal-fields">
      ${request ? `
      <div class="modal-field"><span class="modal-field-label">ФИО</span><span class="modal-field-value">${esc(request.fullName)}</span></div>
      <div class="modal-field"><span class="modal-field-label">Подразделение</span><span class="modal-field-value">${esc(request.department)}</span></div>
      <div class="modal-field"><span class="modal-field-label">Тип ресурса</span><span class="modal-field-value">${resourceTypeLabel(request.resourceType)}</span></div>
      <div class="modal-field"><span class="modal-field-label">Ресурс / путь</span><span class="modal-field-value">${esc(request.resourceName)}</span></div>
      <div class="modal-field"><span class="modal-field-label">Требуемые права</span><span class="modal-field-value">${esc(request.permissions)}</span></div>
      <div class="modal-field"><span class="modal-field-label">Дата подачи</span><span class="modal-field-value">${esc(request.createdDate)}</span></div>
      ${request.securityApprovedDate ? `<div class="modal-field"><span class="modal-field-label">Дата согласования</span><span class="modal-field-value">${esc(request.securityApprovedDate)}</span></div>` : ''}
      ` : ''}
    </div>
    ${actionsHtml ? `<div class="modal-actions">${actionsHtml}</div>` : ''}`;

  document.getElementById('modal').classList.remove('hidden');
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

function approveRequest(emailId, approve) {
  const emails   = loadEmails();
  const requests = loadRequests();
  const email    = emails.find(e => e.id === emailId);
  if (!email) return;

  const approvalDate = getCurrentDate();
  const reqIdx = requests.findIndex(r => r.id === email.requestId);

  if (approve) {
    requests[reqIdx].status = 'согласовано';
    requests[reqIdx].securityApprovedDate = approvalDate;
    email.pending  = 0;
    email.approved = 1;

    const newEmailId = nextId(emails);
    const r = requests[reqIdx];
    emails.unshift({
      id: newEmailId,
      recipient: 'Менеджер ИТ',
      toEmail: 'itmanager@company.ru',
      subject: `Согласована заявка на доступ: ${r.fullName}`,
      pending: 1, approved: null, completed: 0,
      requestId: r.id, createdDate: approvalDate
    });
    showNotification('Заявка согласована!', 'success');
  } else {
    requests[reqIdx].status = 'отказано';
    email.pending  = 0;
    email.approved = 0;
    showNotification('Заявка отклонена', 'error');
  }

  saveRequests(requests);
  saveEmails(emails);
  closeModal();
  renderAll();
}

function completeRequest(emailId) {
  const emails   = loadEmails();
  const requests = loadRequests();
  const email    = emails.find(e => e.id === emailId);
  if (!email) return;

  const completionDate = getCurrentDate();
  const reqIdx = requests.findIndex(r => r.id === email.requestId);
  requests[reqIdx].itManagerApprovedDate = completionDate;
  email.pending   = 0;
  email.completed = 1;

  saveRequests(requests);
  saveEmails(emails);
  closeModal();
  showNotification('Заявка отмечена как исполненная!', 'success');
  renderAll();
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

renderAll();
