// === КОНСТАНТЫ ===
const ADMIN_KEY = 'MAX-REAPER-777';
const STORAGE_USERS = 'maxhub_users';
const STORAGE_CURRENT = 'maxhub_current_user';
const STORAGE_NEWS = 'maxhub_news';
const STORAGE_FARM = 'maxhub_farm_data';
const STORAGE_CLANS = 'maxhub_clans';

// === СОСТОЯНИЕ ===
let users = [];
let currentUser = null;
let news = [];
let clans = [];
let farmerData = {};
let autoFarmInterval = null;
let tempImages = { clan: null, admin: null };
let tempNewClanAvatar = null;
let pendingAvatar = null;
let miniGameState = { stage: 'idle', countdownInterval: null };

// Безопасная загрузка из localStorage
function safeLoad(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    console.warn(`Ошибка загрузки ${key}:`, e);
    return fallback;
  }
}

users = safeLoad(STORAGE_USERS, []);
news = safeLoad(STORAGE_NEWS, []);
clans = safeLoad(STORAGE_CLANS, []);
farmerData = safeLoad(STORAGE_FARM, {});

// === ДОСТИЖЕНИЯ (37) ===
const ACHIEVEMENTS = [
  { id: 'first_steps', icon: '🎉', name: 'Первые шаги', desc: 'Зарегистрируйся в MAX HUB', check: () => true },
  { id: 'clan_member', icon: '🏴', name: 'Член клана', desc: 'Вступи в клан', check: u => u.clan && u.clan !== 'Выбери клан' },
  { id: 'raider', icon: '⚔️', name: 'Рейдер', desc: 'Роль рейдера', check: u => u.role === 'Рейдер' },
  { id: 'anti', icon: '🛡️', name: 'Страж порядка', desc: 'Роль антирейдера', check: u => u.role === 'Антирейдер' },
  { id: 'observer', icon: '👁️', name: 'Наблюдатель', desc: 'Роль наблюдателя', check: u => u.role === 'Наблюдатель' },
  { id: 'verified', icon: '✅', name: 'Верифицирован', desc: 'Получи зелёную галочку', check: u => u.verified },
  { id: 'dev', icon: '💻', name: 'Разработчик', desc: 'Получи статус DEV', check: u => u.dev },
  { id: 'admin', icon: '⚡', name: 'Администратор', desc: 'Роль админа', check: u => u.role === 'Админ' },
  { id: 'avatar', icon: '🎨', name: 'Стилист', desc: 'Установи аватарку', check: u => !!u.avatar },
  { id: 'bio', icon: '📝', name: 'Рассказчик', desc: 'Описание профиля (20+ символов)', check: u => (u.description || '').length >= 20 },
  { id: 'like1', icon: '❤️', name: 'Симпатизант', desc: 'Первый лайк', check: u => st(u).likes >= 1 },
  { id: 'like10', icon: '💖', name: 'Доброе сердце', desc: '10 лайков', check: u => st(u).likes >= 10 },
  { id: 'comment1', icon: '💬', name: 'Собеседник', desc: 'Первый комментарий', check: u => st(u).comments >= 1 },
  { id: 'comment5', icon: '🗣️', name: 'Болтун', desc: '5 комментариев', check: u => st(u).comments >= 5 },
  { id: 'comment25', icon: '🎙️', name: 'Оратор', desc: '25 комментариев', check: u => st(u).comments >= 25 },
  { id: 'news1', icon: '✍️', name: 'Журналист', desc: 'Опубликуй новость', check: u => st(u).news >= 1 },
  { id: 'news5', icon: '📰', name: 'Новостник', desc: '5 новостей', check: u => st(u).news >= 5 },
  { id: 'photo', icon: '📷', name: 'Фотограф', desc: 'Фото к посту', check: u => st(u).photoNews >= 1 },
  { id: 'friend1', icon: '🤝', name: 'Дружелюбный', desc: 'Первый друг', check: u => (u.friends || []).length >= 1 },
  { id: 'friend5', icon: '👥', name: 'Компания', desc: '5 друзей', check: u => (u.friends || []).length >= 5 },
  { id: 'sub1', icon: '🔔', name: 'Подписчик', desc: 'Подпишись на клан', check: u => (u.subscribedClans || []).length >= 1 },
  { id: 'sub5', icon: '📚', name: 'Коллекционер', desc: '5 подписок', check: u => (u.subscribedClans || []).length >= 5 },
  { id: 'plant1', icon: '🌱', name: 'Садовод', desc: 'Посади траву', check: u => st(u).plants >= 1 },
  { id: 'plant3', icon: '🌾', name: 'Агроном', desc: '3 посадки', check: u => st(u).plants >= 3 },
  { id: 'harvest1', icon: '🌿', name: 'Жнец', desc: 'Собери урожай', check: u => st(u).harvests >= 1 },
  { id: 'deliver1', icon: '📦', name: 'Курьер', desc: 'Заверши перевозку', check: u => st(u).deliveries >= 1 },
  { id: 'deliver3', icon: '🚚', name: 'Дальнобойщик', desc: '3 перевозки', check: u => st(u).deliveries >= 3 },
  { id: 'rep10', icon: '🚜', name: 'Фермер', desc: '10 репутации фарма', check: (u, ctx) => (ctx.farmerData[u.clan] || 0) >= 10 },
  { id: 'rep50', icon: '🏆', name: 'Магнат', desc: '50 репутации фарма', check: (u, ctx) => (ctx.farmerData[u.clan] || 0) >= 50 },
  { id: 'farm5', icon: '⏱️', name: 'Упорный', desc: '5 запусков авто-фарма', check: u => st(u).farmStarts >= 5 },
  { id: 'night', icon: '🌙', name: 'Полночник', desc: 'Вход с 00:00 до 05:00', check: u => st(u).nightLogin },
  { id: 'early', icon: '☀️', name: 'Ранняя пташка', desc: 'Вход с 05:00 до 08:00', check: u => st(u).earlyLogin },
  { id: 'login3', icon: '🔁', name: 'Постоянный', desc: '3 входа в хаб', check: u => st(u).logins >= 3 },
  { id: 'login10', icon: '🏠', name: 'Свой человек', desc: '10 входов', check: u => st(u).logins >= 10 },
  { id: 'ach10', icon: '🎯', name: 'Целеустремлённый', desc: 'Открой 10 достижений', check: (u, ctx) => ctx.count >= 10, meta: true },
  { id: 'ach20', icon: '👑', name: 'Легенда', desc: 'Открой 20 достижений', check: (u, ctx) => ctx.count >= 20, meta: true },
  { id: 'ach_all', icon: '💎', name: 'Перфекционист', desc: 'Открой все достижения', check: (u, ctx) => ctx.count >= ctx.total, meta: true },
];

function st(u) {
  return Object.assign(
    { comments: 0, likes: 0, news: 0, photoNews: 0, plants: 0, harvests: 0, deliveries: 0, farmStarts: 0, logins: 0, nightLogin: false, earlyLogin: false },
    u.stats || {}
  );
}

function getUnlocked(u) {
  const ctx = { farmerData, clans, news, users, total: ACHIEVEMENTS.filter(a => !a.meta).length };
  const base = ACHIEVEMENTS.filter(a => !a.meta).filter(a => {
    try { return a.check(u, ctx); } catch (e) { return false; }
  });
  ctx.count = base.length;
  const meta = ACHIEVEMENTS.filter(a => a.meta).filter(a => {
    try { return a.check(u, ctx); } catch (e) { return false; }
  });
  return [...base, ...meta].map(a => a.id);
}

let lastAchSnapshot = null;

function snapshotAch() {
  lastAchSnapshot = currentUser ? getUnlocked(currentUser) : null;
}

function checkAchToast() {
  if (!currentUser || !lastAchSnapshot) return;
  const now = getUnlocked(currentUser);
  const fresh = now.filter(id => !lastAchSnapshot.includes(id));
  lastAchSnapshot = now;
  fresh.forEach(id => {
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (a) showToast(`Достижение: ${a.icon} ${a.name}!`, 'ach');
  });
}

// === УТИЛИТЫ ===
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'success') {
  const old = document.querySelector('.toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✓' : type === 'ach' ? '🏅' : '✕';
  toast.innerHTML = `${icon} ${esc(message)}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function avatarInner(a, fallback) {
  if (a && String(a).startsWith('data:')) return `<img class="avatar-img" src="${a}" alt="">`;
  return esc(a || fallback || '?');
}

function clanAvatarInner(c) {
  if (c.avatar && String(c.avatar).startsWith('data:')) return `<img src="${c.avatar}" alt="">`;
  return esc(c.logo);
}

function verifiedTick(u) {
  return u && u.verified ? '<i class="verified-tick">✓</i>' : '';
}

function devBadge(u) {
  return u && u.dev ? '<i class="dev-badge">&lt;/&gt; DEV</i>' : '';
}

function processImage(file, maxDim, mime, quality, cb) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Можно только изображения!', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      if (mime === 'image/png') {
        const min = Math.min(img.width, img.height);
        canvas.width = maxDim;
        canvas.height = maxDim;
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        canvas.getContext('2d').drawImage(img, sx, sy, min, min, 0, 0, maxDim, maxDim);
      } else {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      cb(canvas.toDataURL(mime, quality));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// === СОХРАНЕНИЕ ===
function saveUsers() { localStorage.setItem(STORAGE_USERS, JSON.stringify(users)); }
function saveNews() { localStorage.setItem(STORAGE_NEWS, JSON.stringify(news)); }
function saveClans() { localStorage.setItem(STORAGE_CLANS, JSON.stringify(clans)); }
function saveFarmData() { localStorage.setItem(STORAGE_FARM, JSON.stringify(farmerData)); }

function saveCurrentUser() {
  if (currentUser) localStorage.setItem(STORAGE_CURRENT, currentUser.username);
  else localStorage.removeItem(STORAGE_CURRENT);
}

function syncCurrentUser() {
  if (!currentUser) return;
  const i = users.findIndex(u => u.username === currentUser.username);
  if (i !== -1) users[i] = currentUser;
  saveUsers();
}

function bumpStat(key, amount = 1) {
  if (!currentUser) return;
  if (!currentUser.stats) currentUser.stats = {};
  currentUser.stats[key] = (currentUser.stats[key] || 0) + amount;
  syncCurrentUser();
}

function trackLogin(u) {
  if (!u) return;
  if (!u.stats) u.stats = {};
  u.stats.logins = (u.stats.logins || 0) + 1;
  const h = new Date().getHours();
  if (h >= 0 && h < 5) u.stats.nightLogin = true;
  if (h >= 5 && h < 8) u.stats.earlyLogin = true;
  const i = users.findIndex(x => x.username === u.username);
  if (i !== -1) users[i] = u;
  saveUsers();
}

// === ДЕЛЕГИРОВАННЫЕ КНОПКИ АДМИНКИ ===
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const a = btn.dataset.action;
  const un = btn.dataset.user;
  if (a === 'verify') toggleVerifyUser(un);
  else if (a === 'dev') toggleDevUser(un);
  else if (a === 'delete') deleteUser(un);
});

// === ВКЛАДКИ ===
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  moveIndicator();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function moveIndicator() {
  const btn = document.querySelector('.nav-tab.active');
  const ind = document.getElementById('navIndicator');
  if (btn && ind) {
    ind.style.left = btn.offsetLeft + 'px';
    ind.style.width = btn.offsetWidth + 'px';
  }
}

window.addEventListener('resize', moveIndicator);

// === ИНИЦИАЛИЗАЦИЯ ===
function init() {
  if (clans.length === 0) {
    clans = [
      { name: 'UOTB', type: 'raider', logo: 'U', rep: 80, password: '', avatar: '' },
      { name: 'NullPoint', type: 'raider', logo: 'N', rep: 75, password: '', avatar: '' },
      { name: 'KR', type: 'raider', logo: 'K', rep: 74, password: '', avatar: '' },
      { name: 'RTK', type: 'raider', logo: 'R', rep: 70, password: '', avatar: '' },
      { name: 'Fair Empire', type: 'raider', logo: 'F', rep: 64, password: '', avatar: '' },
      { name: 'VSK', type: 'raider', logo: 'V', rep: 63, password: '', avatar: '' },
      { name: 'Армия Нубов', type: 'raider', logo: 'А', rep: 60, password: '', avatar: '' },
      { name: 'KR ANTI RAIDERS', type: 'anti', logo: 'K', rep: 0, password: '', avatar: '' },
      { name: 'Триумф', type: 'anti', logo: 'Т', rep: 0, password: '', avatar: '' },
      { name: 'ЦПР', type: 'anti', logo: 'Ц', rep: 0, password: '', avatar: '' },
      { name: 'Локальный дурдом', type: 'anti', logo: 'Л', rep: 0, password: '', avatar: '' },
      { name: 'F.T.A.J.', type: 'anti', logo: 'F', rep: 0, password: '', avatar: '' },
      { name: 'ГОК', type: 'anti', logo: 'Г', rep: 0, password: '', avatar: '' },
      { name: 'SSAR', type: 'anti', logo: 'S', rep: 0, password: '', avatar: '' },
    ];
    saveClans();
  }

  if (news.length === 0) {
    news = [{ id: 1, title: 'ВЫШЕЛ РЕЛИЗ', text: 'Официальный релиз MAX HUB состоялся. Все системы работают.', date: '20.08.2026', clan: null, likes: 0, likedBy: [], shares: 0, comments: [] }];
    saveNews();
  }

  // Миграции
  users.forEach(u => {
    if (!u.username) u.username = (u.nickname || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '') + '_' + Math.floor(Math.random() * 1000);
    if (u.description === undefined) u.description = '';
    if (u.avatar === undefined) u.avatar = '';
    if (u.verified === undefined) u.verified = false;
    if (u.dev === undefined) u.dev = false;
    if (!u.subscribedClans) u.subscribedClans = [];
    if (!u.friends) u.friends = [];
    if (!u.stats) u.stats = {};
  });

  clans.forEach(c => { if (c.avatar === undefined) c.avatar = ''; });

  news.forEach((n, i) => {
    if (!n.id) n.id = Date.now() + i;
    if (n.likes == null) n.likes = 0;
    if (!n.likedBy) n.likedBy = [];
    if (n.shares == null) n.shares = 0;
    if (!n.comments) n.comments = [];
  });

  saveUsers(); saveNews(); saveClans();

  const storedCurrent = localStorage.getItem(STORAGE_CURRENT);
  if (storedCurrent) {
    currentUser = users.find(u => u.username === storedCurrent) || null;
    if (currentUser) trackLogin(currentUser);
  }

  populateClanSelects();
  renderAll();
  updateUI();
  createHeroParticles();
  snapshotAch();
  setTimeout(moveIndicator, 100);
}

function createHeroParticles() {
  const container = document.getElementById('heroParticles');
  if (!container || container.children.length) return;
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'hero-particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = Math.random() * 100 + '%';
    p.style.animationDelay = Math.random() * 5 + 's';
    container.appendChild(p);
  }
}

function renderAll() {
  renderClans();
  renderStories();
  renderNews();
  renderCommunities();
  renderUsersList();
  updateFarmerTop();
  updateHeroStats();
  renderAdminUsers();
}

function updateHeroStats() {
  const el = (id) => document.getElementById(id);
  if (el('statClans')) el('statClans').textContent = clans.length;
  if (el('statNews')) el('statNews').textContent = news.length;
  if (el('statUsers')) el('statUsers').textContent = users.length;
}

// === КЛАНЫ ===
function renderClans() {
  const raiders = clans.filter(c => c.type === 'raider').sort((a, b) => b.rep - a.rep);

  document.getElementById('topRaidersGrid').innerHTML = raiders.slice(0, 4).map((c, i) =>
    `<div class="top-raider-card" style="animation-delay:${i * 0.08}s" onclick="openClanModal('${esc(c.name)}')">
      <div class="tr-logo">${clanAvatarInner(c)}</div>
      <div class="tr-rank">#${i + 1}</div>
      <div class="tr-name">${esc(c.name)}</div>
      <div class="tr-score">${c.rep}</div>
    </div>`
  ).join('');

  document.getElementById('clanContainer').innerHTML = raiders.map((c, i) =>
    `<div class="clan-card" style="animation-delay:${i * 0.04}s" onclick="openClanModal('${esc(c.name)}')">
      <div class="c-logo">${clanAvatarInner(c)}</div>
      <div class="c-name">${esc(c.name)}</div>
      <div class="c-desc">Реп: ${c.rep}${c.password ? ' 🔒' : ''}</div>
    </div>`
  ).join('');

  document.getElementById('antiGrid').innerHTML = clans.filter(c => c.type === 'anti').map((c, i) =>
    `<div class="anti-card" style="animation-delay:${i * 0.04}s" onclick="openClanModal('${esc(c.name)}')">
      <div class="a-logo">${clanAvatarInner(c)}</div>
      <div class="a-name">${esc(c.name)}</div>
      <div class="a-desc">Активен${c.password ? ' 🔒' : ''}</div>
    </div>`
  ).join('');
}

function populateClanSelects() {
  const opts = '<option>Выбери клан</option>' + clans.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
  const clanOpts = '<option>Выбери клан</option>' + clans.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');

  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  set('regClanSelect', opts);
  set('clanSelect', opts);
  set('deleteClanSelect', clanOpts);
  set('clanAvatarSelect', clanOpts);
}

// === ИСТОРИИ ===
function renderStories() {
  const row = document.getElementById('storiesRow');
  let html = '';
  if (currentUser) {
    html += `<div class="story" onclick="openOwnProfile()">
      <div class="story-ring"><div class="story-avatar">${avatarInner(currentUser.avatar, currentUser.nickname.charAt(0).toUpperCase())}</div></div>
      <div class="story-name">${esc(currentUser.nickname)}</div>
    </div>`;
  }
  html += clans.map((c, i) =>
    `<div class="story" onclick="openClanModal('${esc(c.name)}')">
      <div class="story-ring" style="animation-delay:${i * 0.05}s"><div class="story-avatar">${clanAvatarInner(c)}</div></div>
      <div class="story-name">${esc(c.name)}</div>
    </div>`
  ).join('');
  row.innerHTML = html;
}

// === ЛЕНТА + КОММЕНТАРИИ ===
function renderNews() {
  const container = document.getElementById('newsContainer');
  if (!news.length) {
    container.innerHTML = '<div class="glass-card"><p>Новостей пока нет.</p></div>';
    return;
  }

  container.innerHTML = news.map((item, idx) => {
    const clan = item.clan ? clans.find(c => c.name === item.clan) : null;
    const aInner = clan ? clanAvatarInner(clan) : '⚡';
    const aName = clan ? esc(clan.name) : 'MAX HUB';
    const aClick = clan ? `openClanModal('${esc(clan.name)}')` : `openPageModal()`;
    const author = item.authorUsername ? users.find(u => u.username === item.authorUsername) : null;
    const liked = currentUser && item.likedBy.includes(currentUser.username);
    const img = item.image ? `<img class="post-image" src="${item.image}" alt="">` : '';
    const cCount = (item.comments || []).length;

    return `<article class="post-card" style="animation-delay:${Math.min(idx, 5) * 0.06}s">
      <div class="post-header">
        <div class="post-avatar" onclick="${aClick}">${aInner}</div>
        <div class="post-author-wrap">
          <div class="post-author" onclick="${aClick}">${aName}</div>
          ${author ? `<div class="post-author-sub" onclick="openUserModal('${esc(author.username)}')">✏️ ${esc(author.nickname)} ${verifiedTick(author)} ${devBadge(author)}</div>` : ''}
          <div class="post-date">${esc(item.date)}</div>
        </div>
      </div>
      <div class="post-body">
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.text)}</p>
      </div>
      ${img}
      <div class="post-actions">
        <button class="post-action like ${liked ? 'liked' : ''}" onclick="toggleLike(${item.id})">♥ <span>${item.likes}</span></button>
        <button class="post-action" onclick="toggleComments(${item.id})">💬 <span>${cCount}</span></button>
        <button class="post-action" onclick="sharePost(${item.id})">↪ <span>${item.shares}</span></button>
      </div>
      <div class="post-comments" id="comments-${item.id}" style="display:none">
        <div class="comments-list" id="commentsList-${item.id}">${commentsHtml(item)}</div>
        ${currentUser ? `<div class="comment-form">
          <div class="comment-avatar">${avatarInner(currentUser.avatar, currentUser.nickname.charAt(0).toUpperCase())}</div>
          <input class="comment-input" id="commentInput-${item.id}" placeholder="Написать комментарий..." onkeydown="if(event.key==='Enter')addComment(${item.id})">
          <button class="comment-send" onclick="addComment(${item.id})">➤</button>
        </div>` : '<div class="comments-empty">Войдите, чтобы писать комментарии</div>'}
      </div>
    </article>`;
  }).join('');
}

function commentsHtml(item) {
  if (!item.comments || !item.comments.length) return '<div class="comments-empty">Нет комментариев. Будь первым!</div>';
  return item.comments.map(c =>
    `<div class="comment-item">
      <div class="comment-avatar" onclick="openUserModal('${esc(c.username)}')">${avatarInner(c.avatar, (c.nickname || '?').charAt(0).toUpperCase())}</div>
      <div class="comment-bubble">
        <div class="comment-author" onclick="openUserModal('${esc(c.username)}')">${esc(c.nickname)} ${c.verified ? verifiedTick(c) : ''} ${c.dev ? devBadge(c) : ''}</div>
        <div class="comment-text">${esc(c.text)}</div>
        <div class="comment-date">${esc(c.date)}</div>
      </div>
    </div>`
  ).join('');
}

function toggleComments(id) {
  const el = document.getElementById('comments-' + id);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function addComment(id) {
  if (!currentUser) { showToast('Войдите, чтобы комментировать!', 'error'); return; }
  const input = document.getElementById('commentInput-' + id);
  const text = (input ? input.value : '').trim();
  if (!text) { showToast('Пустой комментарий!', 'error'); return; }

  const item = news.find(n => n.id === id);
  if (!item) return;
  if (!item.comments) item.comments = [];

  item.comments.push({
    username: currentUser.username,
    nickname: currentUser.nickname,
    avatar: currentUser.avatar,
    verified: currentUser.verified,
    dev: currentUser.dev,
    text,
    date: new Date().toLocaleDateString('ru-RU') + ' ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  });

  saveNews();
  bumpStat('comments');
  snapshotAch();
  renderNews();
  renderUsersList();

  const el = document.getElementById('comments-' + id);
  if (el) el.style.display = 'block';
  const list = document.getElementById('commentsList-' + id);
  if (list) list.scrollTop = list.scrollHeight;
  checkAchToast();
}

function toggleLike(id) {
  if (!currentUser) { showToast('Войдите, чтобы ставить лайки!', 'error'); return; }
  const item = news.find(n => n.id === id);
  if (!item) return;

  const i = item.likedBy.indexOf(currentUser.username);
  if (i === -1) {
    item.likedBy.push(currentUser.username);
    item.likes++;
    bumpStat('likes');
  } else {
    item.likedBy.splice(i, 1);
    item.likes = Math.max(0, item.likes - 1);
  }

  saveNews();
  snapshotAch();
  renderNews();
  checkAchToast();
}

function sharePost(id) {
  const item = news.find(n => n.id === id);
  if (!item) return;
  item.shares++;
  saveNews();
  renderNews();
  showToast('Запись опубликована!');
}

// === СООБЩЕСТВА ===
function renderCommunities() {
  const container = document.getElementById('communityContainer');
  if (!currentUser) {
    container.innerHTML = '<div class="glass-card"><p>Войдите, чтобы подписываться.</p></div>';
    return;
  }

  const subscribed = currentUser.subscribedClans || [];
  container.innerHTML = clans.map(clan => {
    const isSub = subscribed.includes(clan.name);
    const last = news.find(n => n.clan === clan.name);
    return `<div class="community-card">
      <div class="comm-info">
        <div class="comm-logo">${clanAvatarInner(clan)}</div>
        <div>
          <div class="comm-name">${esc(clan.name)}</div>
          <div class="comm-last-news">${last ? esc(last.title) : 'Новостей пока нет'}</div>
        </div>
      </div>
      <button class="subscribe-btn ${isSub ? 'subscribed' : ''}" onclick="toggleSubscription('${esc(clan.name)}')">${isSub ? '✓ Подписан' : '+ Подписаться'}</button>
    </div>`;
  }).join('');
}

function toggleSubscription(clanName) {
  if (!currentUser) return;
  let sub = currentUser.subscribedClans || [];
  if (sub.includes(clanName)) {
    currentUser.subscribedClans = sub.filter(c => c !== clanName);
    showToast(`Отписка от ${clanName}`);
  } else {
    sub.push(clanName);
    currentUser.subscribedClans = sub;
    showToast(`Подписка на ${clanName}!`);
  }
  syncCurrentUser();
  snapshotAch();
  renderCommunities();
  checkAchToast();
}

// === ПОЛЬЗОВАТЕЛИ / ДРУЗЬЯ ===
function renderUsersList() {
  const c = document.getElementById('usersContainer');
  if (!c) return;
  if (!users.length) {
    c.innerHTML = '<div class="glass-card"><p>Пока нет пользователей.</p></div>';
    return;
  }

  c.innerHTML = users.map(u => {
    const self = currentUser && currentUser.username === u.username;
    const isFriend = currentUser && (currentUser.friends || []).includes(u.username);
    let btn = '';
    if (currentUser) {
      btn = self ? '<span class="friend-self">Это вы</span>'
        : isFriend ? `<button class="subscribe-btn subscribed" onclick="removeFriend('${esc(u.username)}')">✓ В друзьях</button>`
        : `<button class="subscribe-btn" onclick="addFriend('${esc(u.username)}')">🤝 Добавить</button>`;
    }
    return `<div class="community-card">
      <div class="comm-info">
        <div class="comm-logo round">${avatarInner(u.avatar, u.nickname.charAt(0).toUpperCase())}</div>
        <div>
          <div class="comm-name" style="cursor:pointer" onclick="openUserModal('${esc(u.username)}')">${esc(u.nickname)} ${verifiedTick(u)} ${devBadge(u)}</div>
          <div class="comm-last-news">@${esc(u.username)} • ${esc(u.role)}</div>
        </div>
      </div>${btn}
    </div>`;
  }).join('');
}

function addFriend(username) {
  if (!currentUser) { showToast('Войдите!', 'error'); return; }
  if (username === currentUser.username) return;
  if (!currentUser.friends) currentUser.friends = [];
  if (currentUser.friends.includes(username)) { showToast('Уже в друзьях!'); return; }

  currentUser.friends.push(username);
  syncCurrentUser();
  snapshotAch();
  renderUsersList();
  const f = users.find(u => u.username === username);
  showToast(`${f ? f.nickname : 'Пользователь'} добавлен в друзья!`);
  checkAchToast();
}

function removeFriend(username) {
  if (!currentUser) return;
  currentUser.friends = (currentUser.friends || []).filter(f => f !== username);
  syncCurrentUser();
  renderUsersList();
  showToast('Удалено из друзей');
  if (document.getElementById('profileModal').classList.contains('open')) openUserModal(username);
}

// === МОДАЛКА ПРОФИЛЯ ===
function openModal() { document.getElementById('profileModal').classList.add('open'); }
function closeProfileModal() { document.getElementById('profileModal').classList.remove('open'); }

function achievementsHtml(u) {
  const unlocked = getUnlocked(u);
  return `<div class="ach-section">
    <div class="ach-header"><span>🏅 Достижения</span><span class="ach-count">${unlocked.length} / ${ACHIEVEMENTS.length}</span></div>
    <div class="ach-grid">
      ${ACHIEVEMENTS.map(a => {
        const has = unlocked.includes(a.id);
        return `<div class="ach-item ${has ? 'unlocked' : 'locked'}" title="${esc(a.desc)}">
          <span class="ach-icon">${a.icon}</span>
          <span class="ach-name">${esc(a.name)}</span>
          ${has ? '' : '<span class="ach-lock">🔒</span>'}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function friendsHtml(u) {
  const friends = (u.friends || []).map(un => users.find(x => x.username === un)).filter(Boolean);
  if (!friends.length) return '';
  return `<div class="friends-section">
    <div class="friends-title">🤝 Друзья (${friends.length})</div>
    <div class="friends-chips">
      ${friends.map(f => `<div class="friend-chip" onclick="openUserModal('${esc(f.username)}')">
        <div class="f-avatar">${avatarInner(f.avatar, f.nickname.charAt(0).toUpperCase())}</div>
        ${esc(f.nickname)}
      </div>`).join('')}
    </div>
  </div>`;
}

function openOwnProfile() {
  if (!currentUser) return;
  pendingAvatar = null;
  const u = currentUser;

  document.getElementById('profileModalBody').innerHTML = `<div class="modal-profile">
    <div class="profile-avatar-big">${avatarInner(u.avatar, u.nickname.charAt(0).toUpperCase())}</div>
    ${u.verified ? '<div class="profile-verified-badge">✓ Верифицирован</div>' : ''}
    ${u.dev ? '<div class="profile-dev-badge">&lt;/&gt; Разработчик</div>' : ''}
    <div class="profile-name">${esc(u.nickname)} ${verifiedTick(u)} ${devBadge(u)}</div>
    <div class="profile-username">@${esc(u.username)}</div>
    <div class="profile-desc">${esc(u.description) || 'Описание не указано'}</div>
    <div class="profile-info-grid">
      <div class="profile-info-item"><span class="profile-info-label">Роль</span><span class="profile-info-value">${esc(u.role)}</span></div>
      <div class="profile-info-item"><span class="profile-info-label">Клан</span><span class="profile-info-value">${esc(u.clan || 'Не выбран')}</span></div>
    </div>
    <div class="game-controls">
      <button class="btn btn-glass-primary btn-sm" onclick="showEditForm()">✏️ Редактировать</button>
      <button class="btn btn-glass btn-sm btn-danger" onclick="closeProfileModal(); logoutUser();">Выйти</button>
    </div>
    ${friendsHtml(u)}
    ${achievementsHtml(u)}
    <div id="editFormWrap"></div>
  </div>`;
  openModal();
}

function openUserModal(username) {
  const u = users.find(x => x.username === username);
  if (!u) return;
  const self = currentUser && currentUser.username === username;
  const isFriend = currentUser && (currentUser.friends || []).includes(username);

  let friendBtn = '';
  if (currentUser && !self) {
    friendBtn = isFriend
      ? `<button class="btn btn-glass btn-sm" onclick="removeFriend('${esc(u.username)}')">✓ В друзьях</button>`
      : `<button class="btn btn-glass-primary btn-sm" onclick="addFriend('${esc(u.username)}')">🤝 Добавить в друзья</button>`;
  }

  document.getElementById('profileModalBody').innerHTML = `<div class="modal-profile">
    <div class="profile-avatar-big">${avatarInner(u.avatar, u.nickname.charAt(0).toUpperCase())}</div>
    ${u.verified ? '<div class="profile-verified-badge">✓ Верифицирован</div>' : ''}
    ${u.dev ? '<div class="profile-dev-badge">&lt;/&gt; Разработчик</div>' : ''}
    <div class="profile-name">${esc(u.nickname)} ${verifiedTick(u)} ${devBadge(u)}</div>
    <div class="profile-username">@${esc(u.username)}</div>
    <div class="profile-desc">${esc(u.description) || 'Описание не указано'}</div>
    <div class="profile-info-grid">
      <div class="profile-info-item"><span class="profile-info-label">Роль</span><span class="profile-info-value">${esc(u.role)}</span></div>
      <div class="profile-info-item"><span class="profile-info-label">Клан</span><span class="profile-info-value">${esc(u.clan || 'Не выбран')}</span></div>
    </div>
    <div class="game-controls">${friendBtn}</div>
    ${friendsHtml(u)}
    ${achievementsHtml(u)}
  </div>`;
  openModal();
}

function openClanModal(name) {
  const c = clans.find(x => x.name === name);
  if (!c) return;
  const clanNews = news.filter(n => n.clan === name).slice(0, 3);

  document.getElementById('profileModalBody').innerHTML = `<div class="modal-profile">
    <div class="profile-avatar-big" style="font-family:'JetBrains Mono',monospace;">${clanAvatarInner(c)}</div>
    <div class="profile-name">${esc(c.name)}</div>
    <div class="profile-username">${c.type === 'raider' ? '⚔ Рейдеры' : '🛡 Антирейдеры'}${c.password ? ' • 🔒 Закрытый' : ''}</div>
    <div class="profile-info-grid">
      <div class="profile-info-item"><span class="profile-info-label">Репутация</span><span class="profile-info-value">${c.rep}</span></div>
      <div class="profile-info-item"><span class="profile-info-label">Новостей</span><span class="profile-info-value">${news.filter(n => n.clan === name).length}</span></div>
    </div>
    ${clanNews.length ? `<div style="text-align:left;margin-top:10px;">${clanNews.map(n =>
      `<div style="padding:8px;border-bottom:1px solid var(--glass-border);">
        <strong style="font-size:12px;color:#fff;">${esc(n.title)}</strong><br>
        <small style="color:var(--text-dim);">${esc(n.date)}</small>
      </div>`).join('')}</div>` : ''}
  </div>`;
  openModal();
}

function openPageModal() {
  document.getElementById('profileModalBody').innerHTML = `<div class="modal-profile">
    <div class="profile-avatar-big">⚡</div>
    <div class="profile-name">MAX HUB</div>
    <div class="profile-username">REAPER NETWORK</div>
    <div class="profile-desc">Независимый проект. Собираем данные о кланах и антирейдерах.</div>
  </div>`;
  openModal();
}

// === РЕДАКТИРОВАНИЕ ПРОФИЛЯ ===
function showEditForm() {
  pendingAvatar = null;
  const u = currentUser;

  document.getElementById('editFormWrap').innerHTML = `<div class="profile-edit-form">
    <h3>Редактирование</h3>
    <div class="reg-field"><label>Никнейм</label>
      <input type="text" class="reg-input" id="editNickname" value="${esc(u.nickname)}">
    </div>
    <div class="reg-field"><label>Аватарка (PNG или эмодзи)</label>
      <div class="avatar-edit-row">
        <div class="avatar-preview" id="editAvatarPreview">${avatarInner(u.avatar, u.nickname.charAt(0).toUpperCase())}</div>
        <div style="flex:1">
          <label class="attach-btn">📷 Загрузить PNG
            <input type="file" accept="image/png,image/jpeg,image/*" hidden onchange="handleAvatarUpload(this)">
          </label>
        </div>
      </div>
      <input type="text" class="reg-input" id="editAvatarEmoji" placeholder="Или эмодзи..." maxlength="2">
      <div class="avatar-suggestions">
        <span onclick="pickAvatar('😎')">😎</span>
        <span onclick="pickAvatar('🔥')">🔥</span>
        <span onclick="pickAvatar('⚡')">⚡</span>
        <span onclick="pickAvatar('💀')">💀</span>
        <span onclick="pickAvatar('🎮')">🎮</span>
        <span onclick="pickAvatar('👾')">👾</span>
        <span onclick="pickAvatar('🐺')">🐺</span>
        <span onclick="pickAvatar('💎')">💎</span>
      </div>
    </div>
    <div class="reg-field"><label>Описание</label>
      <textarea class="reg-textarea" id="editDescription" maxlength="200" placeholder="О себе...">${esc(u.description)}</textarea>
    </div>
    <div class="game-controls">
      <button class="btn btn-glass-primary btn-sm" onclick="saveProfile()">💾 Сохранить</button>
      <button class="btn btn-glass btn-sm" onclick="openOwnProfile()">Отмена</button>
    </div>
  </div>`;
}

function handleAvatarUpload(input) {
  const file = input.files[0];
  input.value = '';
  processImage(file, 128, 'image/png', 0.9, data => {
    pendingAvatar = data;
    const prev = document.getElementById('editAvatarPreview');
    if (prev) prev.innerHTML = `<img src="${data}">`;
    showToast('Аватарка загружена!');
  });
}

function pickAvatar(emoji) {
  pendingAvatar = emoji;
  const prev = document.getElementById('editAvatarPreview');
  if (prev) prev.textContent = emoji;
}

function saveProfile() {
  const nick = document.getElementById('editNickname').value.trim();
  const emoji = document.getElementById('editAvatarEmoji').value.trim();
  const desc = document.getElementById('editDescription').value.trim();

  if (!nick) { showToast('Никнейм не может быть пустым!', 'error'); return; }

  currentUser.nickname = nick;
  currentUser.description = desc;
  if (pendingAvatar) currentUser.avatar = pendingAvatar;
  else if (emoji) currentUser.avatar = emoji;

  syncCurrentUser();
  snapshotAch();
  renderAll();
  updateUI();
  openOwnProfile();
  showToast('Профиль обновлён!');
  checkAchToast();
}

// === UI ===
function updateUI() {
  const topMenu = document.getElementById('topMenu');
  const mainApp = document.getElementById('mainApp');
  const regSection = document.getElementById('regSection');
  const bottomNav = document.getElementById('bottomNav');

  if (currentUser) {
    topMenu.style.display = 'flex';
    mainApp.style.display = 'block';
    bottomNav.style.display = 'flex';
    regSection.style.display = 'none';

    document.getElementById('userInfo').innerHTML = `
      <div class="user-profile-btn" onclick="openOwnProfile()">
        <div class="user-avatar-small">${avatarInner(currentUser.avatar, currentUser.nickname.charAt(0).toUpperCase())}</div>
        <span class="user-nick-small">${esc(currentUser.nickname)} ${verifiedTick(currentUser)} ${devBadge(currentUser)}</span>
      </div>
      <button class="logout-btn" onclick="logoutUser()">Выйти</button>`;

    document.getElementById('newsFormSection').style.display =
      (currentUser.clan && currentUser.clan !== 'Выбери клан') ? 'block' : 'none';

    const isAdmin = sessionStorage.getItem('adminActivated') === 'true' || currentUser.role === 'Админ';
    document.getElementById('adminPanel').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('adminActivation').style.display = isAdmin ? 'none' : 'block';

    const clanSelect = document.getElementById('clanSelect');
    if (currentUser.clan && currentUser.clan !== 'Выбери клан') {
      clanSelect.value = currentUser.clan;
      selectClan();
    }
  } else {
    topMenu.style.display = 'none';
    mainApp.style.display = 'none';
    bottomNav.style.display = 'none';
    regSection.style.display = 'block';
    document.getElementById('userInfo').innerHTML = '';
  }

  renderAll();
  setTimeout(moveIndicator, 50);
}

// === РЕГИСТРАЦИЯ ===
function regSelectClan() {
  const sel = document.getElementById('regClanSelect');
  const clan = clans.find(c => c.name === sel.value);
  document.getElementById('regClanPasswordWrap').style.display = (clan && clan.password) ? 'block' : 'none';
}

function registerUser() {
  const nickname = document.getElementById('nickname').value.trim();
  const username = document.getElementById('username').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const password = document.getElementById('regPassword').value;
  const role = document.getElementById('role').value;
  const clan = document.getElementById('regClanSelect').value;

  if (!nickname || !username || !password || role === 'Выбери роль' || clan === 'Выбери клан') {
    showToast('Заполните все поля!', 'error');
    return;
  }
  if (username.length < 3) { showToast('Юзернейм минимум 3 символа!', 'error'); return; }
  if (password.length < 4) { showToast('Пароль минимум 4 символа!', 'error'); return; }
  if (nickname.toLowerCase() === 'администратор') { showToast('Имя зарезервировано!', 'error'); return; }
  if (users.some(u => u.username === username)) { showToast('Юзернейм занят!', 'error'); return; }

  const clanObj = clans.find(c => c.name === clan);
  if (clanObj && clanObj.password && document.getElementById('regClanPassword').value.trim() !== clanObj.password) {
    showToast('Неверный пароль клана!', 'error');
    return;
  }

  let user = users.find(u => u.nickname === nickname);
  if (user) {
    user.role = role;
    user.clan = clan;
    user.password = password;
    showToast('Данные обновлены!');
  } else {
    user = { nickname, username, password, role, clan, description: '', avatar: '', verified: false, dev: false, subscribedClans: [], friends: [], stats: {} };
    users.push(user);
    showToast('Регистрация успешна!');
  }

  currentUser = user;
  trackLogin(user);
  saveUsers();
  saveCurrentUser();
  snapshotAch();
  switchTab('tabFeed');
  updateUI();
  checkAchToast();
}

// === ВХОД ===
function toggleLogin() {
  const w = document.getElementById('loginWrap');
  w.style.display = w.style.display === 'none' ? 'block' : 'none';
}

function loginUser() {
  const nickname = document.getElementById('loginNickname').value.trim();
  const username = document.getElementById('loginUsername').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const password = document.getElementById('loginPassword').value;

  if (!nickname || !username || !password) { showToast('Заполните все поля!', 'error'); return; }

  const user = users.find(u => u.username === username && u.nickname.toLowerCase() === nickname.toLowerCase());
  if (!user) { showToast('Пользователь не найден или данные не совпадают!', 'error'); return; }

  if (user.password) {
    if (user.password !== password) { showToast('Неверный пароль!', 'error'); return; }
  } else {
    user.password = password;
    const i = users.findIndex(x => x.username === user.username);
    if (i !== -1) users[i] = user;
    saveUsers();
    showToast('Пароль установлен для аккаунта!');
  }

  currentUser = user;
  trackLogin(user);
  saveCurrentUser();
  snapshotAch();
  switchTab('tabFeed');
  updateUI();
  showToast(`Добро пожаловать, ${user.nickname}!`);
  checkAchToast();
}

function logoutUser() {
  currentUser = null;
  lastAchSnapshot = null;
  saveCurrentUser();
  stopFarm();
  sessionStorage.removeItem('adminActivated');
  closeProfileModal();
  updateUI();
  showToast('Вы вышли из аккаунта');
}

// === АДМИН ===
function checkKey(input) {
  return (input || '').trim().toUpperCase().replace(/\s+/g, '') === ADMIN_KEY.toUpperCase().replace(/\s+/g, '');
}

function toggleAdminLogin() {
  const w = document.getElementById('adminLoginWrap');
  w.style.display = w.style.display === 'none' ? 'block' : 'none';
}

function adminLogin() {
  if (checkKey(document.getElementById('adminKeyInput').value)) {
    let adminUser = users.find(u => u.username === 'admin_reaper');
    if (!adminUser) {
      adminUser = { nickname: 'Администратор', username: 'admin_reaper', role: 'Админ', clan: null, description: 'Главный админ MAX HUB', avatar: '⚡', verified: true, dev: true, subscribedClans: [], friends: [], stats: {} };
      users.push(adminUser);
      saveUsers();
    }
    currentUser = adminUser;
    trackLogin(adminUser);
    sessionStorage.setItem('adminActivated', 'true');
    saveCurrentUser();
    snapshotAch();
    switchTab('tabAdmin');
    updateUI();
    showToast('Добро пожаловать, Админ!');
  } else {
    showToast('Неверный ключ!', 'error');
  }
}

function checkAdminKeyMain() {
  if (checkKey(document.getElementById('adminKeyInputMain').value)) {
    sessionStorage.setItem('adminActivated', 'true');
    updateUI();
    showToast('Админ-панель активирована!');
  } else {
    showToast('Неверный ключ!', 'error');
  }
}

// === ФОТО ===
function handleNewsImage(input, kind) {
  const file = input.files[0];
  input.value = '';
  processImage(file, 700, 'image/jpeg', 0.75, data => {
    tempImages[kind] = data;
    document.getElementById(kind === 'clan' ? 'clanNewsPreview' : 'adminNewsPreview').innerHTML = `<img src="${data}">`;
  });
}

// === АВАТАРКИ КЛАНОВ ===
function handleNewClanAvatar(input) {
  const file = input.files[0];
  input.value = '';
  processImage(file, 128, 'image/png', 0.9, data => {
    tempNewClanAvatar = data;
    document.getElementById('newClanAvatarPreview').innerHTML = `<img src="${data}">`;
  });
}

function handleClanAvatarUpload(input) {
  const name = document.getElementById('clanAvatarSelect').value;
  const clan = clans.find(c => c.name === name);
  if (!clan) { showToast('Сначала выбери клан!', 'error'); return; }

  const file = input.files[0];
  input.value = '';
  processImage(file, 128, 'image/png', 0.9, data => {
    clan.avatar = data;
    saveClans();
    document.getElementById('clanAvatarPreview').innerHTML = `<img src="${data}">`;
    renderAll();
    showToast(`Аватарка клана ${clan.name} обновлена!`);
  });
}

// === НОВОСТИ ===
function addNews() {
  const title = document.getElementById('newsTitle').value.trim();
  const text = document.getElementById('newsText').value.trim();
  if (!title || !text) { showToast('Заполните поля!', 'error'); return; }

  news.unshift({ id: Date.now(), title, text, date: new Date().toLocaleDateString('ru-RU'), clan: null, image: tempImages.admin, likes: 0, likedBy: [], shares: 0, comments: [] });

  if (tempImages.admin) bumpStat('photoNews');
  bumpStat('news');
  tempImages.admin = null;
  document.getElementById('adminNewsPreview').innerHTML = '';

  saveNews();
  snapshotAch();
  renderNews();
  renderCommunities();
  updateHeroStats();

  document.getElementById('newsTitle').value = '';
  document.getElementById('newsText').value = '';
  showToast('Новость добавлена!');
  checkAchToast();
}

function addClanNews() {
  if (!currentUser || !currentUser.clan || currentUser.clan === 'Выбери клан') {
    showToast('Выберите клан!', 'error');
    return;
  }

  const title = document.getElementById('clanNewsTitle').value.trim();
  const text = document.getElementById('clanNewsText').value.trim();
  if (!title || !text) { showToast('Заполните заголовок и текст!', 'error'); return; }

  news.unshift({ id: Date.now(), title, text, date: new Date().toLocaleDateString('ru-RU'), clan: currentUser.clan, authorUsername: currentUser.username, image: tempImages.clan, likes: 0, likedBy: [], shares: 0, comments: [] });

  if (tempImages.clan) bumpStat('photoNews');
  bumpStat('news');
  tempImages.clan = null;
  document.getElementById('clanNewsPreview').innerHTML = '';

  saveNews();
  snapshotAch();
  renderNews();
  renderCommunities();
  updateHeroStats();

  document.getElementById('clanNewsTitle').value = '';
  document.getElementById('clanNewsText').value = '';
  showToast('Новость опубликована!');
  checkAchToast();
}

// === АДМИН: КЛАНЫ ===
function addClan() {
  const name = document.getElementById('clanName').value.trim();
  const logo = document.getElementById('clanLogo').value.trim() || name.charAt(0).toUpperCase();
  const rep = parseInt(document.getElementById('clanRep').value) || 0;
  const password = document.getElementById('newClanPassword').value.trim();
  const type = document.getElementById('clanType').value;

  if (!name) { showToast('Введите название!', 'error'); return; }
  if (clans.some(c => c.name.toLowerCase() === name.toLowerCase())) { showToast('Клан уже существует!', 'error'); return; }

  clans.push({ name, type, logo, rep, password, avatar: tempNewClanAvatar || '' });
  tempNewClanAvatar = null;
  document.getElementById('newClanAvatarPreview').innerHTML = '';

  saveClans();
  renderClans();
  populateClanSelects();
  renderCommunities();
  renderStories();
  updateHeroStats();

  document.getElementById('clanName').value = '';
  document.getElementById('clanLogo').value = '';
  document.getElementById('newClanPassword').value = '';
  showToast(`Клан "${name}" создан!`);
}

function deleteClan() {
  const name = document.getElementById('deleteClanSelect').value;
  if (name === 'Выбери клан') { showToast('Выберите клан!', 'error'); return; }

  clans = clans.filter(c => c.name !== name);
  saveClans();
  renderClans();
  populateClanSelects();
  renderCommunities();
  renderStories();
  updateHeroStats();
  showToast(`Клан "${name}" удалён`);
}

// === АДМИН: ЮЗЕРЫ ===
function renderAdminUsers() {
  const container = document.getElementById('adminUsersList');
  if (!container) return;
  if (!users.length) {
    container.innerHTML = '<p style="font-size:12px;color:var(--text-dim);padding:8px;">Нет юзеров</p>';
    return;
  }

  container.innerHTML = users.map(u =>
    `<div class="admin-user-item">
      <div class="admin-user-info">
        <div class="admin-user-avatar">${avatarInner(u.avatar, u.nickname.charAt(0).toUpperCase())}</div>
        <div>
          <div class="admin-user-name">${esc(u.nickname)} ${verifiedTick(u)} ${devBadge(u)}</div>
          <div class="admin-user-username">@${esc(u.username)} • ${esc(u.role)}</div>
        </div>
      </div>
      <div class="admin-user-actions">
        <button class="admin-user-btn ${u.verified ? 'active-verify' : ''}" data-action="verify" data-user="${esc(u.username)}" title="Галочка">✓</button>
        <button class="admin-user-btn dev-btn ${u.dev ? 'active-dev' : ''}" data-action="dev" data-user="${esc(u.username)}" title="DEV статус">💻</button>
        <button class="admin-user-btn delete-btn" data-action="delete" data-user="${esc(u.username)}" title="Удалить">🗑</button>
      </div>
    </div>`
  ).join('');
}

function toggleVerifyUser(username) {
  const u = users.find(x => x.username === username);
  if (!u) { showToast('Пользователь не найден!', 'error'); return; }

  u.verified = !u.verified;
  saveUsers();
  if (currentUser && currentUser.username === username) currentUser.verified = u.verified;

  snapshotAch();
  renderAdminUsers();
  renderNews();
  renderStories();
  renderUsersList();
  updateUI();
  showToast(u.verified ? `✅ ${u.nickname} верифицирован!` : `Галочка снята с ${u.nickname}`);
  checkAchToast();
}

function toggleDevUser(username) {
  const u = users.find(x => x.username === username);
  if (!u) { showToast('Пользователь не найден!', 'error'); return; }

  u.dev = !u.dev;
  saveUsers();
  if (currentUser && currentUser.username === username) currentUser.dev = u.dev;

  snapshotAch();
  renderAdminUsers();
  renderNews();
  renderStories();
  renderUsersList();
  updateUI();
  showToast(u.dev ? `💻 ${u.nickname} теперь разработчик!` : `DEV снят с ${u.nickname}`);
  checkAchToast();
}

function deleteUser(username) {
  if (!confirm('Удалить пользователя?')) return;
  users = users.filter(u => u.username !== username);
  saveUsers();
  if (currentUser && currentUser.username === username) logoutUser();
  renderAdminUsers();
  renderUsersList();
  updateHeroStats();
  showToast('Пользователь удалён');
}

function grantDev() {
  const username = document.getElementById('verifyUsername').value.trim().replace('@', '').toLowerCase();
  if (!username) { showToast('Введите юзернейм!', 'error'); return; }
  const u = users.find(x => x.username === username);
  if (!u) { showToast('Пользователь не найден!', 'error'); return; }

  u.dev = true;
  saveUsers();
  if (currentUser && currentUser.username === username) currentUser.dev = true;
  document.getElementById('verifyUsername').value = '';
  snapshotAch();
  renderAdminUsers();
  renderUsersList();
  renderNews();
  updateUI();
  showToast(`💻 ${u.nickname} — разработчик!`);
  checkAchToast();
}

function revokeDev() {
  const username = document.getElementById('verifyUsername').value.trim().replace('@', '').toLowerCase();
  if (!username) { showToast('Введите юзернейм!', 'error'); return; }
  const u = users.find(x => x.username === username);
  if (!u) { showToast('Пользователь не найден!', 'error'); return; }

  u.dev = false;
  saveUsers();
  if (currentUser && currentUser.username === username) currentUser.dev = false;
  document.getElementById('verifyUsername').value = '';
  renderAdminUsers();
  renderUsersList();
  renderNews();
  updateUI();
  showToast(`DEV снят с ${u.nickname}`);
}

function verifyUser() {
  const username = document.getElementById('verifyUsername').value.trim().replace('@', '').toLowerCase();
  if (!username) { showToast('Введите юзернейм!', 'error'); return; }
  const u = users.find(x => x.username === username);
  if (!u) { showToast('Пользователь не найден!', 'error'); return; }

  u.verified = true;
  saveUsers();
  if (currentUser && currentUser.username === username) currentUser.verified = true;
  document.getElementById('verifyUsername').value = '';
  snapshotAch();
  renderAdminUsers();
  renderNews();
  updateUI();
  showToast(`✅ ${u.nickname} верифицирован!`);
  checkAchToast();
}

function unverifyUser() {
  const username = document.getElementById('verifyUsername').value.trim().replace('@', '').toLowerCase();
  if (!username) { showToast('Введите юзернейм!', 'error'); return; }
  const u = users.find(x => x.username === username);
  if (!u) { showToast('Пользователь не найден!', 'error'); return; }

  u.verified = false;
  saveUsers();
  if (currentUser && currentUser.username === username) currentUser.verified = false;
  document.getElementById('verifyUsername').value = '';
  renderAdminUsers();
  renderNews();
  updateUI();
  showToast(`Галочка снята с ${u.nickname}`);
}

// === ФАРМ ===
function selectClan() {
  const select = document.getElementById('clanSelect');
  const selected = select.value;
  const clan = clans.find(c => c.name === selected);

  document.getElementById('clanPasswordWrap').style.display = (clan && clan.password) ? 'block' : 'none';

  if (selected === 'Выбери клан') {
    document.getElementById('selectedClan').textContent = '-';
    document.getElementById('currentRep').textContent = '0';
    document.getElementById('gameLog').innerHTML = '<div>▶ Выбери клан</div>';
    stopFarm();
  } else {
    document.getElementById('selectedClan').textContent = selected;
    document.getElementById('currentRep').textContent = farmerData[selected] ? farmerData[selected].toFixed(1) : '0';
    document.getElementById('gameLog').innerHTML = `<div>▶ Клан ${esc(selected)} выбран</div>`;
    stopFarm();
  }
}

function startFarm() {
  const clan = document.getElementById('clanSelect').value;
  if (clan === 'Выбери клан') { showToast('Выберите клан!', 'error'); return; }

  const clanObj = clans.find(c => c.name === clan);
  if (clanObj && clanObj.password && document.getElementById('clanPassword').value.trim() !== clanObj.password) {
    showToast('Неверный пароль клана!', 'error');
    return;
  }

  stopFarm();
  bumpStat('farmStarts');
  if (!farmerData[clan]) farmerData[clan] = 0;

  document.getElementById('gameLog').innerHTML = `<div>▶ Фарм ${esc(clan)} запущен</div>`;
  snapshotAch();

  autoFarmInterval = setInterval(() => {
    farmerData[clan] += 0.1;
    document.getElementById('currentRep').textContent = farmerData[clan].toFixed(1);
    document.getElementById('gameLog').innerHTML = `<div>▶ ${esc(clan)}: +0.1 (${farmerData[clan].toFixed(1)})</div>`;
    saveFarmData();
    updateFarmerTop();
  }, 3000);

  checkAchToast();
}

function stopFarm() {
  if (autoFarmInterval) {
    clearInterval(autoFarmInterval);
    autoFarmInterval = null;
    const log = document.getElementById('gameLog');
    if (log) log.innerHTML = '<div>▶ Фарм остановлен</div>';
  }
}

function updateFarmerTop() {
  const top = document.getElementById('farmerTop');
  const sorted = Object.entries(farmerData).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (!sorted.length) {
    top.innerHTML = '<div class="glass-card"><p>Пока нет фармеров</p></div>';
    return;
  }

  top.innerHTML = '<div class="glass-card">' + sorted.map(([clan, rep], i) =>
    `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--glass-border);">
      <span style="font-weight:600;">#${i + 1} ${esc(clan)}</span>
      <span style="color:var(--primary);font-family:'JetBrains Mono',monospace;font-weight:700;">${rep.toFixed(1)}</span>
    </div>`
  ).join('') + '</div>';
}

// === МИНИ-ИГРА ===
function plantWeed() {
  const clan = document.getElementById('clanSelect').value;
  if (clan === 'Выбери клан') { showToast('Выберите клан!', 'error'); return; }
  if (miniGameState.stage !== 'idle') { showToast('Трава уже растёт!', 'error'); return; }

  miniGameState.stage = 'growing';
  bumpStat('plants');
  snapshotAch();

  document.getElementById('gameStage').textContent = 'растёт...';
  document.getElementById('plantVisual').textContent = '🌱';
  document.getElementById('plantBtn').disabled = true;

  let secondsLeft = 3600;
  updateMiniGameTimer(`🌱 Растёт. Осталось: ${formatTime(secondsLeft)}`);
  checkAchToast();

  miniGameState.countdownInterval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(miniGameState.countdownInterval);
      miniGameState.stage = 'ready';
      document.getElementById('gameStage').textContent = 'готова к сбору';
      document.getElementById('plantVisual').textContent = '🌿';
      document.getElementById('harvestBtn').disabled = false;
      updateMiniGameTimer('✓ Выросла! Можно собирать.');
      showToast('Трава выросла!');
    } else {
      updateMiniGameTimer(`🌱 Растёт. Осталось: ${formatTime(secondsLeft)}`);
    }
  }, 1000);
}

function harvestWeed() {
  if (miniGameState.stage !== 'ready') return;
  miniGameState.stage = 'collected';
  bumpStat('harvests');
  snapshotAch();

  document.getElementById('gameStage').textContent = 'собрана';
  document.getElementById('plantVisual').textContent = '📦';
  document.getElementById('harvestBtn').disabled = true;
  document.getElementById('deliverBtn').disabled = false;
  updateMiniGameTimer('Собрана. Нажмите "Перевезти".');
  checkAchToast();
}

function deliverWeed() {
  if (miniGameState.stage !== 'collected') return;
  const clan = document.getElementById('clanSelect').value;
  if (clan === 'Выбери клан') { showToast('Выберите клан!', 'error'); return; }

  miniGameState.stage = 'delivering';
  document.getElementById('deliverBtn').disabled = true;
  document.getElementById('gameStage').textContent = 'перевозка...';
  document.getElementById('plantVisual').textContent = '🚚';

  let secondsLeft = 18000;
  updateMiniGameTimer(`📦 Перевозка. Осталось: ${formatTime(secondsLeft)}`);

  miniGameState.countdownInterval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(miniGameState.countdownInterval);
      farmerData[clan] = (farmerData[clan] || 0) + 1;
      saveFarmData();
      updateFarmerTop();
      bumpStat('deliveries');
      snapshotAch();

      document.getElementById('currentRep').textContent = farmerData[clan].toFixed(1);
      updateMiniGameTimer('✓ +1 репутации!');
      document.getElementById('plantVisual').textContent = '🌱';
      miniGameState.stage = 'idle';
      document.getElementById('gameStage').textContent = 'ожидание';
      document.getElementById('plantBtn').disabled = false;
      document.getElementById('harvestBtn').disabled = true;
      document.getElementById('deliverBtn').disabled = true;
      showToast('+1 репутации!');
      checkAchToast();
    } else {
      updateMiniGameTimer(`📦 Перевозка. Осталось: ${formatTime(secondsLeft)}`);
    }
  }, 1000);
}

function updateMiniGameTimer(t) {
  const el = document.getElementById('miniGameLog');
  if (el) el.textContent = t;
}

function formatTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

window.addEventListener('beforeunload', () => {
  if (autoFarmInterval) clearInterval(autoFarmInterval);
  if (miniGameState.countdownInterval) clearInterval(miniGameState.countdownInterval);
});

// Закрытие модалки по клику на оверлей
document.getElementById('profileModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeProfileModal();
});

// Закрытие по Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeProfileModal();
});

init();