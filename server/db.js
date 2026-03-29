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
    sort_order INTEGER DEFAULT 0
  );
`);

db.prepare('INSERT OR IGNORE INTO about (id) VALUES (1)').run();

module.exports = db;
