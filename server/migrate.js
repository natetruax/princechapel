// One-time migration: pulls all data from Supabase and inserts into local SQLite
// Usage: node migrate.js

const db = require('./db');

const SUPABASE_URL     = 'https://suisumcbjgrpbwbxvedo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PEYoViM0hul26oFvD7Wcow_FjJEFHqA';

async function fetchTable(table, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function migrate() {
  console.log('Starting migration from Supabase → SQLite...\n');

  // ---- EVENTS ----
  const events = await fetchTable('events', 'order=sort_order');
  db.prepare('DELETE FROM events').run();
  const insertEvent = db.prepare(
    'INSERT INTO events (title, time, month, day, recurring, description, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  db.transaction(() => {
    events.forEach((e, i) => {
      insertEvent.run(e.title||'', e.time||'', e.month||'', e.day||'', e.recurring||'', e.description||'', e.sort_order ?? i);
    });
  })();
  console.log(`✓ Events:         ${events.length} rows`);

  // ---- STAFF ----
  const staff = await fetchTable('staff', 'order=sort_order');
  db.prepare('DELETE FROM staff').run();
  const insertStaff = db.prepare(
    'INSERT INTO staff (name, initials, photo, role, bio, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  );
  db.transaction(() => {
    staff.forEach((s, i) => {
      insertStaff.run(s.name||'', s.initials||'', s.photo||'', s.role||'', s.bio||'', s.sort_order ?? i);
    });
  })();
  console.log(`✓ Staff:          ${staff.length} rows`);

  // ---- SERMONS ----
  const sermons = await fetchTable('sermons');
  db.prepare('DELETE FROM sermons').run();
  const insertSermon = db.prepare(
    'INSERT INTO sermons (title, date, speaker, url) VALUES (?, ?, ?, ?)'
  );
  db.transaction(() => {
    sermons.forEach(s => {
      insertSermon.run(s.title||'', s.date||'', s.speaker||'', s.url||'');
    });
  })();
  console.log(`✓ Sermons:        ${sermons.length} rows`);

  // ---- ABOUT ----
  const about = await fetchTable('about', 'limit=1');
  if (about.length) {
    const a = about[0];
    db.prepare(`
      UPDATE about SET
        name         = ?, vision       = ?, mission      = ?, motto        = ?,
        calendar_url = ?, service_name = ?, service_time = ?, address      = ?,
        phone        = ?, email        = ?, office_hours = ?
      WHERE id = 1
    `).run(
      a.name||'', a.vision||'', a.mission||'', a.motto||'',
      a.calendar_url||'', a.service_name||'', a.service_time||'', a.address||'',
      a.phone||'', a.email||'', a.office_hours||''
    );
    console.log(`✓ About:          1 row`);
  } else {
    console.log(`- About:          no data in Supabase, skipping`);
  }

  // ---- HERO PHOTOS ----
  const heroPhotos = await fetchTable('hero_photos', 'order=sort_order');
  db.prepare('DELETE FROM hero_photos').run();
  const insertHero = db.prepare('INSERT INTO hero_photos (url, sort_order) VALUES (?, ?)');
  db.transaction(() => {
    heroPhotos.forEach((p, i) => {
      insertHero.run(p.url||'', p.sort_order ?? i);
    });
  })();
  console.log(`✓ Hero photos:    ${heroPhotos.length} rows`);

  // ---- GALLERY PHOTOS ----
  const galleryPhotos = await fetchTable('gallery_photos', 'order=sort_order');
  db.prepare('DELETE FROM gallery_photos').run();
  const insertGallery = db.prepare('INSERT INTO gallery_photos (url, caption, sort_order) VALUES (?, ?, ?)');
  db.transaction(() => {
    galleryPhotos.forEach((p, i) => {
      insertGallery.run(p.url||'', p.caption||'', p.sort_order ?? i);
    });
  })();
  console.log(`✓ Gallery photos: ${galleryPhotos.length} rows`);

  console.log('\nMigration complete.');
}

migrate().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
