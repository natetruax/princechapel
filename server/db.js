const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT,
    time        TEXT,
    month       TEXT,
    day         TEXT,
    recurring   TEXT,
    description TEXT,
    sort_order  INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS staff (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT,
    initials   TEXT,
    photo      TEXT,
    role       TEXT,
    bio        TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sermons (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT,
    date       TEXT,
    speaker    TEXT,
    url        TEXT,
    scripture  TEXT
  );

  CREATE TABLE IF NOT EXISTS about (
    id           INTEGER PRIMARY KEY,
    name         TEXT,
    vision       TEXT,
    mission      TEXT,
    motto        TEXT,
    calendar_url TEXT,
    service_name TEXT,
    service_time TEXT,
    address      TEXT,
    phone        TEXT,
    email        TEXT,
    office_hours TEXT
  );

  CREATE TABLE IF NOT EXISTS hero_photos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    url        TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS gallery_photos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    url        TEXT,
    caption    TEXT,
    album      TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS gallery_albums (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT UNIQUE,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS about_sections (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT,
    content    TEXT DEFAULT '',
    photo      TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS admins (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL
  );
`);

db.prepare('INSERT OR IGNORE INTO about (id) VALUES (1)').run();

// Live migrations
try { db.exec(`ALTER TABLE gallery_photos ADD COLUMN album TEXT DEFAULT ''`); } catch(e) {}

// Migrate existing about fields into about_sections if table is empty
const sectionCount = db.prepare('SELECT COUNT(*) as n FROM about_sections').get();
if (sectionCount.n === 0) {
  const aboutRow = db.prepare('SELECT * FROM about WHERE id = 1').get() || {};
  const ins = db.prepare('INSERT INTO about_sections (title, content, sort_order) VALUES (?, ?, ?)');
  [
    ['Our Name',            aboutRow.name    || ''],
    ['Our Vision',          aboutRow.vision  || ''],
    ['Our Mission Statement', aboutRow.mission || ''],
    ['Our Motto',           aboutRow.motto   || ''],
  ].forEach(([title, content], i) => ins.run(title, content, i));
}

// Seed admins from ADMIN_EMAILS env var (comma-separated) if table is empty
const adminCount = db.prepare('SELECT COUNT(*) as n FROM admins').get();
if (adminCount.n === 0 && process.env.ADMIN_EMAILS) {
  const insertAdmin = db.prepare('INSERT OR IGNORE INTO admins (email) VALUES (?)');
  process.env.ADMIN_EMAILS.split(',').map(e => e.trim()).filter(Boolean).forEach(e => insertAdmin.run(e));
}

// Seed default albums
const seedAlbums = [
  'Sunday Service',
  'Young Peoples Department',
  'Community Events',
  'Men of Prince',
  'Womens Missionary Society',
  'Lay Organization'
];
const insertAlbum = db.prepare('INSERT OR IGNORE INTO gallery_albums (name, sort_order) VALUES (?, ?)');
seedAlbums.forEach((name, i) => insertAlbum.run(name, i));

module.exports = db;
