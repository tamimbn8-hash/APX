/**
 * APX┃Velro — Database Layer
 * Atomic JSON-backed persistent store with in-memory caching
 */

const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Default initial state
const INITIAL_DATA = {
  users: [
    {
      discord_id: '108108108108108108',
      username: '08_1_',
      display_name: 'Tamim',
      avatar: 'assets/images/tamim.png',
      avatar_hash: 'default',
      role: 'Owner',
      joined_at: '2026-10-20T16:53:44.000Z',
      last_login: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      login_count: 42,
      widget_settings: {
        enabled: true,
        position: 'bottom-right',
        sound: true,
        pet_type: 'neon_dragon'
      }
    }
  ],
  sessions: {},
  activity_logs: [
    {
      id: 'act_init_01',
      timestamp: '2026-10-20T16:53:44.000Z',
      actor_id: '108108108108108108',
      actor_name: '08_1_',
      action_type: 'SYSTEM',
      description: 'تم تأسيس مجتمع APX┃Velro وتعيين 08_1_ كـ Owner للنظام',
      target_id: '108108108108108108',
      target_name: '08_1_'
    }
  ],
  site_settings: {
    team_section_visibility: 'public', // 'public' | 'private'
    owner_username: '08_1_',
    owner_discord_id: '108108108108108108'
  }
};

let cache = null;

function ensureDbExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    cache = JSON.parse(JSON.stringify(INITIAL_DATA));
  }
}

function loadDb() {
  if (cache) return cache;
  ensureDbExists();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    cache = JSON.parse(raw);
  } catch (err) {
    console.error('[DB] Failed to read db.json, using defaults:', err);
    cache = JSON.parse(JSON.stringify(INITIAL_DATA));
  }
  return cache;
}

function saveDb() {
  if (!cache) return;
  ensureDbExists();
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(cache, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

// ── ROLES HIERARCHY & PERMISSIONS ─────────────────────────────
const ROLE_RANKS = {
  'Owner': 100,
  'Founder': 80,
  'Head Admin': 60,
  'Admin': 40,
  'Moderator': 20,
  'Member': 0
};

const ROLE_PERMISSIONS = {
  'Owner': [
    'view_members', 'manage_members', 'change_roles',
    'manage_content', 'manage_services', 'manage_designs',
    'view_analytics', 'manage_settings', 'admin_access', 'audit_logs'
  ],
  'Founder': [
    'view_members', 'manage_members', 'change_roles',
    'manage_content', 'manage_services', 'manage_designs',
    'view_analytics', 'admin_access', 'audit_logs'
  ],
  'Head Admin': [
    'view_members', 'manage_members', 'change_roles',
    'manage_content', 'view_analytics', 'admin_access'
  ],
  'Admin': [
    'view_members', 'manage_content', 'view_analytics', 'admin_access'
  ],
  'Moderator': [
    'view_members', 'manage_content', 'admin_access'
  ],
  'Member': []
};

// ── MEMBER DAYS CALCULATION ───────────────────────────────────
function calculateMemberDays(joinedAt) {
  if (!joinedAt) return 1;
  const joinedDate = new Date(joinedAt);
  const now = new Date();
  const diffTime = Math.abs(now - joinedDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

// ── USER QUERIES & MUTATIONS ──────────────────────────────────
function findUserByDiscordId(discordId) {
  const db = loadDb();
  return db.users.find(u => String(u.discord_id) === String(discordId)) || null;
}

function findUserByUsername(username) {
  const db = loadDb();
  return db.users.find(u => u.username.toLowerCase() === String(username).toLowerCase()) || null;
}

function getAllUsers() {
  const db = loadDb();
  return db.users.map(u => ({
    ...u,
    member_days: calculateMemberDays(u.joined_at)
  }));
}

function upsertDiscordUser(profile) {
  const db = loadDb();
  const now = new Date().toISOString();
  let user = db.users.find(u => String(u.discord_id) === String(profile.id));

  const isOwnerCandidate = 
    (profile.username && profile.username.toLowerCase() === '08_1_') ||
    String(profile.id) === String(db.site_settings.owner_discord_id);

  if (user) {
    // SYNC: Update username, display name, avatar if changed
    user.username = profile.username || user.username;
    user.display_name = profile.global_name || profile.display_name || user.username;
    if (profile.avatar) {
      user.avatar = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256`;
      user.avatar_hash = profile.avatar;
    }
    user.last_login = now;
    user.last_activity = now;
    user.login_count = (user.login_count || 1) + 1;

    if (isOwnerCandidate) {
      user.role = 'Owner';
      db.site_settings.owner_discord_id = String(profile.id);
    }
  } else {
    // NEW MEMBER
    const role = isOwnerCandidate ? 'Owner' : 'Member';
    if (isOwnerCandidate) {
      db.site_settings.owner_discord_id = String(profile.id);
    }

    user = {
      discord_id: String(profile.id),
      username: profile.username || `user_${profile.id.slice(-4)}`,
      display_name: profile.global_name || profile.display_name || profile.username || 'Member',
      avatar: profile.avatar 
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256` 
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(profile.id.slice(-1) || '0', 10) % 5}.png`,
      avatar_hash: profile.avatar || 'default',
      role: role,
      joined_at: now,
      last_login: now,
      last_activity: now,
      login_count: 1,
      widget_settings: {
        enabled: true,
        position: 'bottom-right',
        sound: true,
        pet_type: 'cyber_familiar'
      }
    };
    db.users.push(user);

    logActivity({
      actor_id: user.discord_id,
      actor_name: user.username,
      action_type: 'MEMBER_JOIN',
      description: `انضم العضو الجديد ${user.display_name} (@${user.username}) إلى الموقع`,
      target_id: user.discord_id,
      target_name: user.username
    });
  }

  saveDb();
  return {
    ...user,
    member_days: calculateMemberDays(user.joined_at),
    permissions: ROLE_PERMISSIONS[user.role] || []
  };
}

// ── SESSIONS ──────────────────────────────────────────────────
function createSession(discordId) {
  const db = loadDb();
  const token = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  db.sessions[token] = {
    discord_id: String(discordId),
    expires_at: expiresAt
  };
  saveDb();
  return token;
}

function getSessionUser(token) {
  if (!token) return null;
  const db = loadDb();
  const session = db.sessions[token];
  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    delete db.sessions[token];
    saveDb();
    return null;
  }

  const user = findUserByDiscordId(session.discord_id);
  if (!user) return null;

  // Refresh last activity
  user.last_activity = new Date().toISOString();
  saveDb();

  return {
    ...user,
    member_days: calculateMemberDays(user.joined_at),
    permissions: ROLE_PERMISSIONS[user.role] || []
  };
}

function destroySession(token) {
  if (!token) return;
  const db = loadDb();
  if (db.sessions[token]) {
    delete db.sessions[token];
    saveDb();
  }
}

// ── ROLE MANAGEMENT & HIERARCHY SECURITY ───────────────────────
function changeUserRole(actorUser, targetDiscordId, newRole) {
  const db = loadDb();

  if (!actorUser) {
    throw new Error('يجب تسجيل الدخول أولاً');
  }

  const actorPerms = ROLE_PERMISSIONS[actorUser.role] || [];
  if (!actorPerms.includes('change_roles')) {
    throw new Error('ليست لديك صلاحية تغيير الرتب');
  }

  const target = db.users.find(u => String(u.discord_id) === String(targetDiscordId));
  if (!target) {
    throw new Error('العضو المستهدف غير موجود');
  }

  // 1. Cannot change own role
  if (String(actorUser.discord_id) === String(target.discord_id)) {
    throw new Error('لا يمكنك تغيير رتبة نفسك');
  }

  // 2. Validate role existence
  if (!ROLE_RANKS.hasOwnProperty(newRole)) {
    throw new Error('الرتبة المحددة غير صالحة');
  }

  const actorRank = ROLE_RANKS[actorUser.role] || 0;
  const targetCurrentRank = ROLE_RANKS[target.role] || 0;
  const newRoleRank = ROLE_RANKS[newRole] || 0;

  // 3. Cannot modify someone with equal or higher rank (unless Owner)
  if (actorUser.role !== 'Owner') {
    if (targetCurrentRank >= actorRank) {
      throw new Error('لا يمكنك تعديل رتبة شخص يملك رتبة مساوية أو أعلى من رتبتك');
    }
    // 4. Cannot assign a role equal to or higher than own rank
    if (newRoleRank >= actorRank) {
      throw new Error('لا يمكنك ترقية عضو إلى رتبة مساوية أو أعلى من رتبتك');
    }
  }

  // 5. Cannot demote or change Owner
  if (target.role === 'Owner' && actorUser.role !== 'Owner') {
    throw new Error('لا يمكن تعديل رتبة الـ Owner إطلاقاً');
  }

  const oldRole = target.role;
  target.role = newRole;
  saveDb();

  logActivity({
    actor_id: actorUser.discord_id,
    actor_name: actorUser.username,
    action_type: 'ROLE_CHANGE',
    description: `قام ${actorUser.username} بتغيير رتبة ${target.display_name} من ${oldRole} إلى ${newRole}`,
    target_id: target.discord_id,
    target_name: target.username
  });

  return target;
}

// ── ACTIVITY AUDIT LOGS ───────────────────────────────────────
function logActivity(entry) {
  const db = loadDb();
  const logItem = {
    id: 'act_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    ...entry
  };
  db.activity_logs.unshift(logItem);
  if (db.activity_logs.length > 200) {
    db.activity_logs = db.activity_logs.slice(0, 200);
  }
  saveDb();
  return logItem;
}

function getActivityLogs(limit = 50) {
  const db = loadDb();
  return db.activity_logs.slice(0, limit);
}

// ── WIDGET SETTINGS ───────────────────────────────────────────
function updateWidgetSettings(discordId, settings) {
  const db = loadDb();
  const user = db.users.find(u => String(u.discord_id) === String(discordId));
  if (!user) return null;

  user.widget_settings = {
    ...user.widget_settings,
    ...settings
  };
  saveDb();
  return user.widget_settings;
}

// ── SITE SETTINGS ─────────────────────────────────────────────
function getSiteSettings() {
  const db = loadDb();
  return db.site_settings;
}

function updateSiteSettings(actorUser, newSettings) {
  if (!actorUser || (actorUser.role !== 'Owner' && actorUser.role !== 'Founder')) {
    throw new Error('غير مصرح لك بتعديل إعدادات الموقع');
  }
  const db = loadDb();
  db.site_settings = {
    ...db.site_settings,
    ...newSettings
  };
  saveDb();
  return db.site_settings;
}

module.exports = {
  loadDb,
  ROLE_RANKS,
  ROLE_PERMISSIONS,
  calculateMemberDays,
  findUserByDiscordId,
  findUserByUsername,
  getAllUsers,
  upsertDiscordUser,
  createSession,
  getSessionUser,
  destroySession,
  changeUserRole,
  logActivity,
  getActivityLogs,
  updateWidgetSettings,
  getSiteSettings,
  updateSiteSettings
};
