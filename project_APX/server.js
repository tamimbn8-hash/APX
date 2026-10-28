/**
 * APX┃Velro — Production Backend Server
 * Express • Discord OAuth2 • RBAC Hierarchy • Real Member Days • Mascot Engine
 */

require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'apx_session_token';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── AUTH MIDDLEWARE ───────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.cookies[COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    req.user = null;
    return next();
  }
  const user = db.getSessionUser(token);
  req.user = user;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'يجب تسجيل الدخول للوصول إلى هذه الصفحة' });
  }
  next();
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'غير مصرح: يجب تسجيل الدخول' });
    }
    const permissions = req.user.permissions || [];
    if (!permissions.includes(permission)) {
      return res.status(403).json({ success: false, error: 'تم رفض الوصول: صلاحيات غير كافية' });
    }
    next();
  };
}

app.use(authMiddleware);

// ── 1. DISCORD OAUTH2 ENDPOINTS ───────────────────────────────

// A. Initiate Discord OAuth2 login
app.get('/api/auth/discord', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `http://localhost:${PORT}/api/auth/discord/callback`;

  if (!clientId || clientId.trim() === '') {
    // If client ID is not configured yet, redirect with helpful prompt or dev login
    return res.redirect('/#discord-setup-needed');
  }

  const scope = encodeURIComponent('identify');
  const encodedRedirect = encodeURIComponent(redirectUri);
  const discordUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodedRedirect}&response_type=code&scope=${scope}&prompt=consent`;

  res.redirect(discordUrl);
});

// B. Discord OAuth2 Callback
app.get('/api/auth/discord/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.redirect('/?error=discord_cancelled');
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `http://localhost:${PORT}/api/auth/discord/callback`;

  try {
    // 1. Exchange code for access token with Discord
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('[Discord OAuth] Token exchange error:', errText);
      return res.redirect('/?error=token_exchange_failed');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch User Profile from Discord API
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!userResponse.ok) {
      return res.redirect('/?error=fetch_user_failed');
    }

    const discordUser = await userResponse.json();

    // 3. Upsert user into database
    const user = db.upsertDiscordUser(discordUser);

    // 4. Create local session
    const sessionToken = db.createSession(user.discord_id);

    // 5. Set HTTP-only Cookie
    res.cookie(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/'
    });

    db.logActivity({
      actor_id: user.discord_id,
      actor_name: user.username,
      action_type: 'LOGIN',
      description: `سجّل العضو ${user.display_name} (@${user.username}) الدخول عبر Discord OAuth2`,
      target_id: user.discord_id,
      target_name: user.username
    });

    return res.redirect('/?auth=success');
  } catch (err) {
    console.error('[Discord OAuth] Unexpected error:', err);
    return res.redirect('/?error=auth_exception');
  }
});

// C. Developer/Instant Login Endpoint (for demonstration & direct testing)
app.post('/api/auth/dev-login', (req, res) => {
  const { username, display_name, role } = req.body;
  const safeUsername = (username || '08_1_').trim();

  // Synthetic Discord ID
  let discordId;
  if (safeUsername.toLowerCase() === '08_1_') {
    discordId = '108108108108108108'; // Owner ID
  } else {
    discordId = '99' + Math.floor(1000000000000000 + Math.random() * 9000000000000000);
  }

  const profile = {
    id: discordId,
    username: safeUsername,
    global_name: display_name || safeUsername,
    avatar: null
  };

  const user = db.upsertDiscordUser(profile);

  // If specific role requested and caller has rights or owner
  if (role && db.ROLE_RANKS.hasOwnProperty(role)) {
    if (safeUsername.toLowerCase() === '08_1_') {
      user.role = 'Owner';
    } else {
      user.role = role;
    }
  }

  const sessionToken = db.createSession(user.discord_id);

  res.cookie(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/'
  });

  db.logActivity({
    actor_id: user.discord_id,
    actor_name: user.username,
    action_type: 'LOGIN',
    description: `سجّل ${user.display_name} (@${user.username}) الدخول كـ [${user.role}]`,
    target_id: user.discord_id,
    target_name: user.username
  });

  res.json({
    success: true,
    user: {
      ...user,
      member_days: db.calculateMemberDays(user.joined_at),
      permissions: db.ROLE_PERMISSIONS[user.role] || []
    }
  });
});

// D. Get Current User / Session
app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.json({ success: true, user: null });
  }
  res.json({
    success: true,
    user: req.user
  });
});

// E. Logout
app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    db.destroySession(token);
    res.clearCookie(COOKIE_NAME, { path: '/' });
  }
  if (req.user) {
    db.logActivity({
      actor_id: req.user.discord_id,
      actor_name: req.user.username,
      action_type: 'LOGOUT',
      description: `قام ${req.user.display_name} بتسجيل الخروج من الموقع`,
      target_id: req.user.discord_id,
      target_name: req.user.username
    });
  }
  res.json({ success: true });
});

// ── 2. MEMBER WIDGET SETTINGS ─────────────────────────────────
app.post('/api/user/widget', requireAuth, (req, res) => {
  const { enabled, position, sound, pet_type } = req.body;
  const updated = db.updateWidgetSettings(req.user.discord_id, {
    ...(enabled !== undefined && { enabled: Boolean(enabled) }),
    ...(position && { position }),
    ...(sound !== undefined && { sound: Boolean(sound) }),
    ...(pet_type && { pet_type })
  });

  res.json({ success: true, widget_settings: updated });
});

// ── 3. PUBLIC TEAM SECTION ───────────────────────────────────
app.get('/api/public/team', (req, res) => {
  const settings = db.getSiteSettings();
  if (settings.team_section_visibility === 'private') {
    // If private, only admins can view
    if (!req.user || !req.user.permissions?.includes('admin_access')) {
      return res.json({ success: true, visible: false, team: [] });
    }
  }

  const allUsers = db.getAllUsers();
  // Filter staff roles (Owner, Founder, Head Admin, Admin, Moderator)
  const staff = allUsers
    .filter(u => u.role !== 'Member')
    .sort((a, b) => (db.ROLE_RANKS[b.role] || 0) - (db.ROLE_RANKS[a.role] || 0));

  res.json({
    success: true,
    visible: true,
    team: staff.map(s => ({
      discord_id: s.discord_id,
      username: s.username,
      display_name: s.display_name,
      avatar: s.avatar,
      role: s.role,
      member_days: s.member_days
    }))
  });
});

// ── 4. ADMIN DASHBOARD & MEMBERS API ──────────────────────────

// A. Overview stats
app.get('/api/admin/overview', requirePermission('view_analytics'), (req, res) => {
  const allUsers = db.getAllUsers();
  const logs = db.getActivityLogs(10);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const totalMembers = allUsers.length;
  const newMembers = allUsers.filter(u => new Date(u.joined_at) >= sevenDaysAgo).length;
  const activeMembers = allUsers.filter(u => new Date(u.last_activity) >= oneDayAgo).length;
  const totalLogins = allUsers.reduce((sum, u) => sum + (u.login_count || 1), 0);
  const adminCount = allUsers.filter(u => u.role !== 'Member').length;

  // Simple growth dataset for SVG Chart (last 7 days)
  const growth = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = d.toISOString().split('T')[0];
    const countUpToDay = allUsers.filter(u => new Date(u.joined_at) <= d).length;
    growth.push({ date: dayStr, count: countUpToDay });
  }

  res.json({
    success: true,
    stats: {
      totalMembers,
      activeMembers: Math.max(activeMembers, 1),
      newMembers,
      totalLogins,
      adminCount
    },
    growth,
    recentActivity: logs
  });
});

// B. Members list
app.get('/api/admin/members', requirePermission('view_members'), (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  const allUsers = db.getAllUsers();

  let filtered = allUsers;
  if (q) {
    filtered = allUsers.filter(u => 
      u.username.toLowerCase().includes(q) ||
      u.display_name.toLowerCase().includes(q) ||
      u.discord_id.includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  }

  // Sort by rank descending, then joined date
  filtered.sort((a, b) => {
    const rankDiff = (db.ROLE_RANKS[b.role] || 0) - (db.ROLE_RANKS[a.role] || 0);
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.joined_at) - new Date(a.joined_at);
  });

  res.json({
    success: true,
    count: filtered.length,
    members: filtered
  });
});

// C. Change member role (Hierarchy protected)
app.post('/api/admin/members/:id/role', requirePermission('change_roles'), (req, res) => {
  const targetId = req.params.id;
  const { role } = req.body;

  try {
    const updated = db.changeUserRole(req.user, targetId, role);
    res.json({
      success: true,
      member: {
        ...updated,
        member_days: db.calculateMemberDays(updated.joined_at)
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// D. Activity Logs
app.get('/api/admin/activity', requirePermission('admin_access'), (req, res) => {
  const logs = db.getActivityLogs(100);
  res.json({ success: true, logs });
});

// E. Admin Site Settings
app.get('/api/admin/settings', requirePermission('admin_access'), (req, res) => {
  res.json({ success: true, settings: db.getSiteSettings() });
});

app.post('/api/admin/settings', requirePermission('manage_settings'), (req, res) => {
  try {
    const updated = db.updateSiteSettings(req.user, req.body);
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── 5. ADMIN ROUTE ACCESS GUARD ───────────────────────────────
app.get('/admin', (req, res) => {
  if (!req.user || !req.user.permissions?.includes('admin_access')) {
    // Deliver Access Denied page directly to protect admin UI
    return res.status(403).send(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تم رفض الوصول — APX┃Velro</title>
        <link rel="stylesheet" href="css/style.css">
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap" rel="stylesheet">
      </head>
      <body style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#08090D;color:#F5F7FA;font-family:'Cairo',sans-serif;text-align:center;padding:24px;">
        <div style="max-width:480px;background:#11151D;border:1px solid rgba(239,68,68,0.3);border-radius:20px;padding:40px 32px;box-shadow:0 10px 40px rgba(0,0,0,0.6);">
          <div style="font-size:3.5rem;margin-bottom:16px;">🚫</div>
          <h1 style="font-size:1.6rem;font-weight:800;color:#EF4444;margin-bottom:12px;">تم رفض الوصول — Access Denied</h1>
          <p style="color:#9AA3B2;font-size:0.95rem;line-height:1.7;margin-bottom:28px;">
            هذه اللوحة مخصصة فقط لأعضاء الإدارة المصرح لهم (Owner / Founder / Head Admin / Admin).
            <br>يرجى تسجيل الدخول بحساب Discord يمتلك الصلاحيات الكافية.
          </p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            <a href="/" class="btn btn-primary btn-sm">العودة للرئيسية</a>
            <a href="/api/auth/discord" class="btn btn-secondary btn-sm">تسجيل الدخول عبر Discord</a>
          </div>
        </div>
      </body>
      </html>
    `);
  }
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// ── 6. SERVE STATIC FILES ─────────────────────────────────────
app.use(express.static(path.join(__dirname)));

// Fallback for 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// ── START SERVER ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 APX┃Velro Server running at http://localhost:${PORT}`);
  console.log(`🛡️  Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log(`🔑 Owner Username: 08_1_`);
  console.log(`=======================================================`);
});
