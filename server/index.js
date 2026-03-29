require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('./db');

const app = express();

const ADMIN_EMAILS = [
  'natetruax20@gmail.com',
  'melanie.lanae@gmail.com',
  'alicia.sims621@gmail.com',
  'nazarethgurl94@gmail.com'
];

// ---- UPLOADS DIR ----
const UPLOADS_DIR = '/var/www/princechapel/uploads';
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ---- MULTER ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  }
});
const upload = multer({ storage });

// ---- MIDDLEWARE ----
app.use(express.json());
app.use(cookieParser());

// ---- AUTH MIDDLEWARE ----
function requireAuth(req, res, next) {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

// ---- GOOGLE OAUTH ----
const oauthClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://church.itbynate.com/api/auth/callback'
);

app.get('/api/auth/google', (req, res) => {
  const url = oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile']
  });
  res.redirect(url);
});

app.get('/api/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauthClient.getToken(code);
    oauthClient.setCredentials(tokens);
    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;

    if (!ADMIN_EMAILS.includes(email)) {
      return res.redirect('/?login_error=unauthorized');
    }

    const token = jwt.sign({ email, name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.redirect('/');
  } catch (e) {
    console.error('Auth callback error:', e);
    res.redirect('/?login_error=unauthorized');
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('session');
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.session;
  if (!token) return res.json({ user: null });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ email: payload.email, name: payload.name });
  } catch (e) {
    res.json({ user: null });
  }
});

// ---- DATA ENDPOINTS ----

app.get('/api/data', (req, res) => {
  try {
    const events = db.prepare('SELECT * FROM events ORDER BY sort_order').all();
    const staff = db.prepare('SELECT * FROM staff ORDER BY sort_order').all();
    const sermons = db.prepare('SELECT * FROM sermons').all();
    const aboutRow = db.prepare('SELECT * FROM about WHERE id = 1').get();
    const heroPhotos = db.prepare('SELECT * FROM hero_photos ORDER BY sort_order').all();
    const galleryPhotos = db.prepare('SELECT * FROM gallery_photos ORDER BY sort_order').all();

    res.json({
      events,
      staff,
      sermons,
      about: aboutRow || {},
      heroPhotos,
      galleryPhotos
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/save/events', requireAuth, (req, res) => {
  try {
    const { events } = req.body;
    db.prepare('DELETE FROM events').run();
    const insert = db.prepare(
      'INSERT INTO events (title, time, month, day, recurring, description, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const insertMany = db.transaction((rows) => {
      rows.forEach((e, i) => {
        insert.run(e.title || '', e.time || '', e.month || '', e.day || '', e.recurring || '', e.description || '', i);
      });
    });
    insertMany(events || []);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/save/staff', requireAuth, (req, res) => {
  try {
    const { staff } = req.body;
    db.prepare('DELETE FROM staff').run();
    const insert = db.prepare(
      'INSERT INTO staff (name, initials, photo, role, bio, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertMany = db.transaction((rows) => {
      rows.forEach((s, i) => {
        insert.run(s.name || '', s.initials || '', s.photo || '', s.role || '', s.bio || '', i);
      });
    });
    insertMany(staff || []);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/save/sermons', requireAuth, (req, res) => {
  try {
    const { sermons } = req.body;
    db.prepare('DELETE FROM sermons').run();
    const insert = db.prepare(
      'INSERT INTO sermons (title, date, speaker, url, scripture) VALUES (?, ?, ?, ?, ?)'
    );
    const insertMany = db.transaction((rows) => {
      rows.forEach((s) => {
        insert.run(s.title || '', s.date || '', s.speaker || '', s.url || '', s.scripture || '');
      });
    });
    insertMany(sermons || []);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/save/about', requireAuth, (req, res) => {
  try {
    const body = req.body;
    db.prepare(`
      UPDATE about SET
        name         = COALESCE(?, name),
        vision       = COALESCE(?, vision),
        mission      = COALESCE(?, mission),
        motto        = COALESCE(?, motto),
        calendar_url = COALESCE(?, calendar_url),
        service_name = COALESCE(?, service_name),
        service_time = COALESCE(?, service_time),
        address      = COALESCE(?, address),
        phone        = COALESCE(?, phone),
        email        = COALESCE(?, email),
        office_hours = COALESCE(?, office_hours)
      WHERE id = 1
    `).run(
      body.name         !== undefined ? body.name         : null,
      body.vision       !== undefined ? body.vision       : null,
      body.mission      !== undefined ? body.mission      : null,
      body.motto        !== undefined ? body.motto        : null,
      body.calendar_url !== undefined ? body.calendar_url : null,
      body.service_name !== undefined ? body.service_name : null,
      body.service_time !== undefined ? body.service_time : null,
      body.address      !== undefined ? body.address      : null,
      body.phone        !== undefined ? body.phone        : null,
      body.email        !== undefined ? body.email        : null,
      body.office_hours !== undefined ? body.office_hours : null
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/save/hero-photos', requireAuth, (req, res) => {
  try {
    const { photos } = req.body;
    db.prepare('DELETE FROM hero_photos').run();
    const insert = db.prepare('INSERT INTO hero_photos (url, sort_order) VALUES (?, ?)');
    const insertMany = db.transaction((rows) => {
      rows.forEach((p, i) => {
        insert.run(p.url || '', i);
      });
    });
    insertMany(photos || []);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/save/gallery', requireAuth, (req, res) => {
  try {
    const { photos } = req.body;
    db.prepare('DELETE FROM gallery_photos').run();
    const insert = db.prepare('INSERT INTO gallery_photos (url, caption, sort_order) VALUES (?, ?, ?)');
    const insertMany = db.transaction((rows) => {
      rows.forEach((p, i) => {
        insert.run(p.url || '', p.caption || '', i);
      });
    });
    insertMany(photos || []);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: '/uploads/' + req.file.filename });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- START ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Prince Chapel server running on port ${PORT}`);
});
