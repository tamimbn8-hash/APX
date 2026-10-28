/**
 * APX┃Velro — Admin Dashboard Logic
 * Pure Vanilla JavaScript • Dynamic Data • Hierarchy Enforcement
 */

let currentUser = null;
let membersCache = [];
let selectedMember = null;

const ROLE_RANKS = {
  'Owner': 100,
  'Founder': 80,
  'Head Admin': 60,
  'Admin': 40,
  'Moderator': 20,
  'Member': 0
};

document.addEventListener('DOMContentLoaded', () => {
  initAdminAuth();
  initTabs();
  initSearch();
  initModals();
  initSettingsForm();
});

// ── 1. AUTH & INITIALIZATION ─────────────────────────────────
async function initAdminAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();

    if (!data.success || !data.user) {
      window.location.href = '/api/auth/discord';
      return;
    }

    currentUser = data.user;

    // Check permissions
    if (!currentUser.permissions || !currentUser.permissions.includes('admin_access')) {
      alert('تم رفض الوصول: ليس لديك صلاحية لدخول لوحة الإدارة.');
      window.location.href = '/';
      return;
    }

    // Populate user pill
    const avatarEl = document.getElementById('adminAvatar');
    const nameEl = document.getElementById('adminDisplayName');
    const roleBadgeEl = document.getElementById('adminRoleBadge');

    if (avatarEl) avatarEl.src = currentUser.avatar || 'assets/images/tamim.png';
    if (nameEl) nameEl.textContent = currentUser.display_name || currentUser.username;
    if (roleBadgeEl) {
      roleBadgeEl.textContent = currentUser.role;
      roleBadgeEl.className = `role-badge ${currentUser.role.replace(' ', '-')}`;
    }

    // Load initial data
    loadOverview();
    loadMembers();
    loadActivity();
    loadSiteSettings();

    // Logout button
    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (confirm('هل أنت متأكد من رغبتك بتسجيل الخروج؟')) {
          await fetch('/api/auth/logout', { method: 'POST' });
          window.location.href = '/';
        }
      });
    }

  } catch (err) {
    console.error('Failed to init admin auth:', err);
  }
}

// ── 2. TABS SWITCHING ─────────────────────────────────────────
function initTabs() {
  const tabs = document.querySelectorAll('.admin-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      switchAdminTab(target);
    });
  });
}

function switchAdminTab(tabName) {
  const tabs = document.querySelectorAll('.admin-tab-btn');
  const views = document.querySelectorAll('.admin-view');

  tabs.forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
  });

  views.forEach(v => {
    v.classList.toggle('active', v.id === `tab-${tabName}`);
  });

  if (tabName === 'members') loadMembers();
  if (tabName === 'activity') loadActivity();
  if (tabName === 'overview') loadOverview();
}

// ── 3. OVERVIEW DASHBOARD ─────────────────────────────────────
async function loadOverview() {
  try {
    const res = await fetch('/api/admin/overview');
    const data = await res.json();
    if (!data.success) return;

    const { stats, growth, recentActivity } = data;

    document.getElementById('statTotalMembers').textContent = stats.totalMembers;
    document.getElementById('statActiveMembers').textContent = stats.activeMembers;
    document.getElementById('statNewMembers').textContent = stats.newMembers;
    document.getElementById('statAdminCount').textContent = stats.adminCount;
    document.getElementById('statTotalLogins').textContent = stats.totalLogins;

    renderGrowthChart(growth);
    renderRecentActivity(recentActivity);
  } catch (err) {
    console.error('Failed to load overview:', err);
  }
}

function renderGrowthChart(growth) {
  if (!growth || !growth.length) return;
  const svg = document.getElementById('growthSvgChart');
  const area = document.getElementById('chartAreaPath');
  const line = document.getElementById('chartLinePath');
  const points = document.getElementById('chartPoints');
  if (!svg || !area || !line || !points) return;

  const w = 500;
  const h = 200;
  const padX = 30;
  const padY = 30;

  const counts = growth.map(g => g.count);
  const min = Math.min(...counts, 0);
  const max = Math.max(...counts, 5);

  const getX = (idx) => padX + (idx / (growth.length - 1)) * (w - padX * 2);
  const getY = (val) => h - padY - ((val - min) / (max - min || 1)) * (h - padY * 2);

  let pathD = '';
  let areaD = `M ${getX(0)} ${h - padY}`;
  let ptsHtml = '';

  growth.forEach((pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.count);
    if (idx === 0) {
      pathD += `M ${x} ${y}`;
      areaD += ` L ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
      areaD += ` L ${x} ${y}`;
    }
    ptsHtml += `
      <circle cx="${x}" cy="${y}" r="4" fill="#5865F2" stroke="#fff" stroke-width="2"/>
      <text x="${x}" y="${h - 8}" fill="#9AA3B2" font-size="10" text-anchor="middle">${pt.date.slice(5)}</text>
      <text x="${x}" y="${y - 10}" fill="#fff" font-size="10" font-weight="700" text-anchor="middle">${pt.count}</text>
    `;
  });

  areaD += ` L ${getX(growth.length - 1)} ${h - padY} Z`;

  line.setAttribute('d', pathD);
  area.setAttribute('d', areaD);
  points.innerHTML = ptsHtml;
}

function renderRecentActivity(logs) {
  const container = document.getElementById('overviewActivityList');
  if (!container) return;

  if (!logs || !logs.length) {
    container.innerHTML = '<div class="loading-state">لا توجد عمليات مسجلة حديثاً</div>';
    return;
  }

  container.innerHTML = logs.slice(0, 5).map(log => `
    <div class="activity-item">
      <div class="activity-icon">⚡</div>
      <div class="activity-text-box">
        <div class="activity-desc">${escapeHtml(log.description)}</div>
        <div class="activity-time">${formatDate(log.timestamp)}</div>
      </div>
    </div>
  `).join('');
}

// ── 4. MEMBERS MANAGEMENT ─────────────────────────────────────
async function loadMembers(query = '') {
  const tbody = document.getElementById('membersTableBody');
  if (!tbody) return;

  try {
    const res = await fetch(`/api/admin/members?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data.success) return;

    membersCache = data.members;
    renderMembersTable(membersCache);
  } catch (err) {
    console.error('Failed to load members:', err);
    tbody.innerHTML = '<tr><td colspan="7" class="loading-state">حدث خطأ أثناء تحميل الأعضاء.</td></tr>';
  }
}

function renderMembersTable(members) {
  const tbody = document.getElementById('membersTableBody');
  if (!tbody) return;

  if (!members || !members.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-state">لم يتم العثور على أي عضو يطابق البحث.</td></tr>';
    return;
  }

  tbody.innerHTML = members.map(m => {
    const roleClass = m.role.replace(' ', '-');
    const isSelf = currentUser && String(currentUser.discord_id) === String(m.discord_id);
    const canChange = currentUser && currentUser.permissions?.includes('change_roles') && !isSelf;

    return `
      <tr data-id="${m.discord_id}">
        <td>
          <div class="member-cell">
            <img src="${m.avatar || 'assets/images/tamim.png'}" alt="${escapeHtml(m.username)}" class="member-avatar" onerror="this.src='assets/images/tamim.png'">
            <div class="member-names">
              <span class="member-display">${escapeHtml(m.display_name)} ${isSelf ? '<small style="color:#5865F2;">(أنت)</small>' : ''}</span>
              <span class="member-handle">@${escapeHtml(m.username)}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="discord-id-pill">${m.discord_id}</span>
        </td>
        <td>
          <span class="role-badge ${roleClass}">${m.role}</span>
        </td>
        <td>
          <span class="member-days-chip">📅 ${m.member_days} يوم</span>
        </td>
        <td style="color:var(--text-secondary); font-size:0.8rem;">
          ${formatDate(m.joined_at, false)}
        </td>
        <td style="color:var(--text-muted); font-size:0.8rem;">
          ${formatDate(m.last_activity)}
        </td>
        <td>
          <div class="table-actions">
            <button class="btn btn-secondary btn-xs" onclick="openProfileModal('${m.discord_id}')">الملف</button>
            ${canChange ? `<button class="btn btn-primary btn-xs" onclick="openRoleModal('${m.discord_id}')">الرتبة</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function initSearch() {
  const input = document.getElementById('memberSearchInput');
  if (!input) return;

  let debounceTimer;
  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      loadMembers(e.target.value.trim());
    }, 300);
  });
}

// ── 5. ROLE MODAL & HIERARCHY SAFEGUARDS ──────────────────────
function initModals() {
  // Role Modal
  const roleModal = document.getElementById('roleModal');
  const closeRoleBtn = document.getElementById('closeRoleModalBtn');
  const cancelRoleBtn = document.getElementById('cancelRoleModalBtn');
  const confirmRoleBtn = document.getElementById('confirmChangeRoleBtn');

  const closeRole = () => { if (roleModal) roleModal.style.display = 'none'; };
  if (closeRoleBtn) closeRoleBtn.addEventListener('click', closeRole);
  if (cancelRoleBtn) cancelRoleBtn.addEventListener('click', closeRole);

  if (confirmRoleBtn) {
    confirmRoleBtn.addEventListener('click', async () => {
      if (!selectedMember) return;
      const select = document.getElementById('newRoleSelect');
      const newRole = select.value;

      if (newRole === selectedMember.role) {
        alert('العضو يملك هذه الرتبة بالفعل.');
        return;
      }

      if (!confirm(`هل أنت متأكد من تغيير رتبة ${selectedMember.display_name} إلى [${newRole}]؟`)) {
        return;
      }

      confirmRoleBtn.disabled = true;
      confirmRoleBtn.textContent = 'جاري التحديث...';

      try {
        const res = await fetch(`/api/admin/members/${selectedMember.discord_id}/role`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole })
        });
        const data = await res.json();

        if (data.success) {
          alert(`✅ تم تغيير رتبة ${selectedMember.display_name} بنجاح إلى ${newRole}`);
          closeRole();
          loadMembers();
          loadOverview();
        } else {
          alert('❌ خطأ: ' + (data.error || 'فشلت العملية'));
        }
      } catch (err) {
        alert('حدث خطأ في الاتصال بالخادم');
      } finally {
        confirmRoleBtn.disabled = false;
        confirmRoleBtn.textContent = 'تأكيد تغيير الرتبة';
      }
    });
  }

  // Profile Modal
  const profileModal = document.getElementById('profileModal');
  const closeProfileBtn = document.getElementById('closeProfileBtn');
  const closeProfileX = document.getElementById('closeProfileModalBtn');
  const closeProf = () => { if (profileModal) profileModal.style.display = 'none'; };
  if (closeProfileBtn) closeProfileBtn.addEventListener('click', closeProf);
  if (closeProfileX) closeProfileX.addEventListener('click', closeProf);
}

window.openRoleModal = function(discordId) {
  const member = membersCache.find(m => String(m.discord_id) === String(discordId));
  if (!member) return;
  selectedMember = member;

  const modal = document.getElementById('roleModal');
  const avatar = document.getElementById('modalUserAvatar');
  const name = document.getElementById('modalUserName');
  const role = document.getElementById('modalCurrentRole');
  const select = document.getElementById('newRoleSelect');

  if (avatar) avatar.src = member.avatar || 'assets/images/tamim.png';
  if (name) name.textContent = `${member.display_name} (@${member.username})`;
  if (role) {
    role.textContent = `الرتبة الحالية: ${member.role}`;
    role.className = `role-badge ${member.role.replace(' ', '-')}`;
  }

  // Filter selectable roles based on actor's rank
  const actorRank = ROLE_RANKS[currentUser?.role] || 0;
  const isOwner = currentUser?.role === 'Owner';

  Array.from(select.options).forEach(opt => {
    const optRank = ROLE_RANKS[opt.value] || 0;
    if (isOwner) {
      opt.disabled = false;
    } else {
      // Cannot promote to equal or higher rank
      opt.disabled = optRank >= actorRank;
    }
  });

  select.value = member.role;
  if (modal) modal.style.display = 'flex';
};

window.openProfileModal = function(discordId) {
  const member = membersCache.find(m => String(m.discord_id) === String(discordId));
  if (!member) return;

  const body = document.getElementById('profileModalBody');
  const modal = document.getElementById('profileModal');
  if (!body || !modal) return;

  body.innerHTML = `
    <div class="modal-user-summary">
      <img src="${member.avatar || 'assets/images/tamim.png'}" alt="" class="modal-avatar" onerror="this.src='assets/images/tamim.png'">
      <div>
        <h4>${escapeHtml(member.display_name)}</h4>
        <span style="color:var(--text-muted);font-size:0.85rem;">@${escapeHtml(member.username)}</span>
        <div style="margin-top:6px;">
          <span class="role-badge ${member.role.replace(' ', '-')}">${member.role}</span>
        </div>
      </div>
    </div>

    <div class="profile-grid">
      <div class="profile-field">
        <span class="profile-field-label">Discord User ID</span>
        <span class="profile-field-value">${member.discord_id}</span>
      </div>
      <div class="profile-field">
        <span class="profile-field-label">أيام العضوية الحقيقية</span>
        <span class="profile-field-value" style="color:#00D2FF;">🌟 ${member.member_days} يوم في المجتمع</span>
      </div>
      <div class="profile-field">
        <span class="profile-field-label">تاريخ أول انضمام</span>
        <span class="profile-field-value">${formatDate(member.joined_at, false)}</span>
      </div>
      <div class="profile-field">
        <span class="profile-field-label">عدد مرات تسجيل الدخول</span>
        <span class="profile-field-value">${member.login_count || 1} مرات</span>
      </div>
      <div class="profile-field">
        <span class="profile-field-label">آخر تسجيل دخول</span>
        <span class="profile-field-value">${formatDate(member.last_login)}</span>
      </div>
      <div class="profile-field">
        <span class="profile-field-label">آخر نشاط بالموقع</span>
        <span class="profile-field-value">${formatDate(member.last_activity)}</span>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
};

// ── 6. AUDIT ACTIVITY LOGS ────────────────────────────────────
async function loadActivity() {
  const tbody = document.getElementById('fullActivityTableBody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/admin/activity');
    const data = await res.json();
    if (!data.success) return;

    if (!data.logs || !data.logs.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading-state">لا توجد نشاطات مسجلة بعد.</td></tr>';
      return;
    }

    tbody.innerHTML = data.logs.map(log => `
      <tr>
        <td style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-muted);">${formatDate(log.timestamp)}</td>
        <td><strong>@${escapeHtml(log.actor_name || 'System')}</strong></td>
        <td><span class="admin-badge-subtle">${log.action_type}</span></td>
        <td style="color:#fff;">${escapeHtml(log.description)}</td>
        <td style="color:var(--text-secondary);font-size:0.85rem;">${escapeHtml(log.target_name || '--')}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load activity:', err);
  }
}

// ── 7. SITE SETTINGS ──────────────────────────────────────────
async function loadSiteSettings() {
  try {
    const res = await fetch('/api/admin/settings');
    const data = await res.json();
    if (!data.success) return;

    const select = document.getElementById('teamVisibilitySelect');
    if (select && data.settings?.team_section_visibility) {
      select.value = data.settings.team_section_visibility;
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function initSettingsForm() {
  const btn = document.getElementById('saveSiteSettingsBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const select = document.getElementById('teamVisibilitySelect');
    const team_section_visibility = select.value;

    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_section_visibility })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ تم حفظ إعدادات الموقع بنجاح');
      } else {
        alert('❌ خطأ: ' + (data.error || 'فشل الحفظ'));
      }
    } catch (err) {
      alert('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      btn.disabled = false;
      btn.textContent = 'حفظ التغييرات';
    }
  });

  const refreshActBtn = document.getElementById('refreshActivityBtn');
  if (refreshActBtn) {
    refreshActBtn.addEventListener('click', loadActivity);
  }
}

// ── UTILITIES ────────────────────────────────────────────────
function formatDate(isoStr, includeTime = true) {
  if (!isoStr) return '--';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;

  const datePart = d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  if (!includeTime) return datePart;

  const timePart = d.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `${datePart} ${timePart}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
