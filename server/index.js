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

// ---- YOUTUBE LOOKUP ----
const YOUTUBE_CHANNEL_HANDLE = 'princechapelbytheseaamechu4598';
let cachedChannelId = null;

async function getChannelId() {
  if (cachedChannelId) return cachedChannelId;
  const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${YOUTUBE_CHANNEL_HANDLE}&key=${process.env.YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.items && data.items.length > 0) {
    cachedChannelId = data.items[0].id;
    return cachedChannelId;
  }
  throw new Error('Channel not found');
}

app.get('/api/youtube/find', requireAuth, async (req, res) => {
  try {
    const { date } = req.query; // expects YYYY-MM-DD
    if (!date) return res.status(400).json({ error: 'date required' });
    if (!process.env.YOUTUBE_API_KEY) return res.status(500).json({ error: 'YOUTUBE_API_KEY not configured' });

    const channelId = await getChannelId();
    const key = process.env.YOUTUBE_API_KEY;

    // Search with a ±4 day window — for live streams, publishedAt is when the
    // broadcast was scheduled/created, which may be days before the actual stream.
    const center = new Date(date + 'T12:00:00Z');
    const after  = new Date(center.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();
    const before = new Date(center.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&publishedAfter=${after}&publishedBefore=${before}&order=date&maxResults=10&key=${key}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.items || searchData.items.length === 0) {
      return res.json({ url: null, message: 'No videos found near this date' });
    }

    // Fetch liveStreamingDetails to get the actual broadcast start time
    const videoIds = searchData.items.map(item => item.id.videoId).join(',');
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoIds}&key=${key}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    // Match by actualStartTime (real broadcast date) first, then fall back to publishedAt
    let bestMatch = null;
    for (const video of (detailsData.items || [])) {
      const actualStart = video.liveStreamingDetails?.actualStartTime;
      const publishedAt = video.snippet?.publishedAt;
      const actualDate   = actualStart  ? actualStart.slice(0, 10)  : null;
      const publishedDate = publishedAt ? publishedAt.slice(0, 10) : null;

      if (actualDate === date) { bestMatch = video; break; }
      if (publishedDate === date && !bestMatch) bestMatch = video;
    }

    // If still no exact match, return the closest result
    if (!bestMatch && detailsData.items?.length > 0) bestMatch = detailsData.items[0];

    if (bestMatch) {
      res.json({
        url: `https://www.youtube.com/watch?v=${bestMatch.id}`,
        title: bestMatch.snippet.title,
        thumbnail: bestMatch.snippet.thumbnails?.default?.url
      });
    } else {
      res.json({ url: null, message: 'No video found for ' + date });
    }
  } catch (e) {
    console.error('YouTube lookup error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ---- START ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Prince Chapel server running on port ${PORT}`);
});
