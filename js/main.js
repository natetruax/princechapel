// ============================================================
// CONFIGURATION
// ============================================================
// Google email addresses approved as admins — for reference/error messaging
const ADMIN_EMAILS = [
  'natetruax20@gmail.com',
  'melanie.lanae@gmail.com',
  'alicia.sims621@gmail.com',
  'nazarethgurl94@gmail.com'
];
// ============================================================

let currentUser = null;

// ---- AUTH ----
async function initAuth() {
  const res = await fetch('/api/auth/me');
  const data = await res.json();
  if (data.email) handleSession(data);
  // Check for login error in URL params
  const params = new URLSearchParams(window.location.search);
  if (params.get('login_error') === 'unauthorized') {
    openLoginModal();
    showLoginError('Your Google account is not an approved admin.');
  }
}

function handleSession(user) {
  currentUser = user;
  document.getElementById('admin-toggle').style.display = 'flex';
  closeLoginModal();
  showToast('Signed in — tap the admin button to continue');
}

function handleSignOut() {
  currentUser = null;
  document.getElementById('admin-toggle').style.display = 'none';
}

function signInWithGoogle() {
  window.location.href = '/api/auth/google';
}

async function signOut() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.reload();
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function openLoginModal() {
  document.getElementById('login-modal').style.display = 'flex';
  document.getElementById('login-error').style.display = 'none';
}

function closeLoginModal() {
  document.getElementById('login-modal').style.display = 'none';
}

// Secret keyboard shortcut: Shift + A triggers login prompt (invisible to visitors)
document.addEventListener('keydown', e => {
  if (e.shiftKey && e.key === 'A' && !currentUser) openLoginModal();
});

// Secret mobile trigger: tap footer logo 5 times quickly
let footerTapCount = 0, footerTapTimer;
document.getElementById('footer-brand-tap').addEventListener('click', () => {
  footerTapCount++;
  clearTimeout(footerTapTimer);
  footerTapTimer = setTimeout(() => { footerTapCount = 0; }, 2000);
  if (footerTapCount >= 5) {
    footerTapCount = 0;
    if (!currentUser) openLoginModal();
    else openAdmin();
  }
});

// ---- DATA STORE (default sample data — replaced by API once loaded) ----
const store = {
  heroPhotos: [],
  aboutSections: [],
  calendarUrl: '',
  about: {
    name:         'Prince Chapel African Methodist Episcopal Church by the Sea — a congregation rooted in over 100 years of faith, service, and community in La Jolla, California.',
    vision:       '',
    mission:      '',
    motto:        '',
    calendar_url: '',
    service_name: 'Worship Service',
    service_time: '9:00 AM',
    address:      'Prince Chapel AME\nLa Jolla, CA',
    phone:        '',
    email:        '',
    office_hours: 'By appointment'
  },
  events: [
    { month:'APR', day:'6',  title:'Palm Sunday Service',    time:'9:00 AM', description:'A special service to begin Holy Week together.' },
    { month:'APR', day:'13', title:'Easter Sunrise Service', time:'6:30 AM', description:'Celebrate the resurrection with our community.' },
    { month:'APR', day:'20', title:'Spring Fellowship Dinner',time:'1:00 PM', description:'Family meal after worship. All are welcome!' }
  ],
  staff: [
    { name:'Rev. Dr. Smith',  initials:'RS', role:'Senior Pastor',   bio:'Leading Prince Chapel with faith and dedication.' },
    { name:'Deacon Jones',    initials:'DJ', role:'Head Deacon',      bio:'Serving the congregation for over 20 years.' },
    { name:'Sis. Williams',   initials:'SW', role:'Choir Director',   bio:'Bringing joyful music to every worship service.' }
  ],
  sermons: [
    { title:'Walking in His Grace',    date:'March 16, 2025', speaker:'Rev. Dr. Smith', url:'' },
    { title:'The Power of Community',  date:'March 9, 2025',  speaker:'Rev. Dr. Smith', url:'' }
  ],
  galleryPhotos: [],
  galleryAlbums: []
};

// ---- DATA LOAD & SAVE ----
async function loadData() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) return;
    const data = await res.json();
    if (data.events      && data.events.length)       store.events       = data.events;
    if (data.staff       && data.staff.length)        store.staff        = data.staff;
    if (data.sermons     && data.sermons.length) {
      store.sermons = data.sermons.sort((a, b) => toDateValue(b.date).localeCompare(toDateValue(a.date)));
    }
    if (data.about && data.about.id) {
      Object.assign(store.about, data.about);
      store.calendarUrl = store.about.calendar_url || '';
      applyContactToPage();
    }
    if (data.heroPhotos    && data.heroPhotos.length)    store.heroPhotos    = data.heroPhotos;
    if (data.galleryPhotos && data.galleryPhotos.length) store.galleryPhotos = data.galleryPhotos;
    if (data.galleryAlbums && data.galleryAlbums.length) store.galleryAlbums = data.galleryAlbums;
    if (data.aboutSections) store.aboutSections = data.aboutSections;
    renderEvents();
    renderStaff();
    renderSermons();
    initSlideshow();
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  checkLiveStream();
}

async function checkLiveStream() {
  try {
    const data = await fetch('/api/youtube/live').then(r => r.json());
    const btn   = document.getElementById('watch-sundays-btn');
    const label = document.getElementById('watch-sundays-label');
    if (!btn || !label) return;
    if (data.live && data.url) {
      btn.href = data.url;
      label.innerHTML = '<span class="live-dot"></span> Live Now';
      btn.classList.add('s-yt-btn--live');
    }
  } catch (e) { /* fail silently */ }
}

async function saveEvents() {
  renderEvents();
  store.about.calendar_url = store.calendarUrl;
  const eventsRes = await fetch('/api/save/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: store.events })
  });
  if (!eventsRes.ok) { alert('Save failed'); return; }
  const aboutRes = await fetch('/api/save/about', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(store.about)
  });
  if (!aboutRes.ok) { alert('Calendar URL save failed'); return; }
  showToast();
}

async function saveStaff() {
  renderStaff();
  const res = await fetch('/api/save/staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staff: store.staff })
  });
  if (!res.ok) { alert('Save failed'); return; }
  showToast();
}

async function saveSermons() {
  renderSermons();
  const res = await fetch('/api/save/sermons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sermons: store.sermons })
  });
  if (!res.ok) { alert('Save failed'); return; }
  showToast();
}

// ---- ADMIN PANEL ----
function openAdmin() {
  if (!currentUser) { openLoginModal(); return; }
  document.getElementById('admin-panel').classList.add('open');
  document.getElementById('admin-cal-url').value  = store.calendarUrl || '';
  document.getElementById('svc2-name').value       = store.about.service_name || '';
  document.getElementById('svc2-time').value       = store.about.service_time || '';
  document.getElementById('admin-address').value   = store.about.address      || '';
  document.getElementById('admin-phone').value     = store.about.phone        || '';
  document.getElementById('admin-email').value     = store.about.email        || '';
  document.getElementById('admin-office').value    = store.about.office_hours || '';
  renderAdminEvents();
  renderAdminStaff();
  renderAdminSermons();
  renderAdminAbout();
  renderAdminHeroPhotos();
  renderAdminGallery();
}

function closeAdmin() {
  document.getElementById('admin-panel').classList.remove('open');
}

function switchTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (msg) t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => { t.classList.remove('show'); t.textContent = 'Changes saved!'; }, 2500);
}

// ---- SERVICES ----
function applyContactToPage() {
  const a = store.about;
  if (a.service_name) document.getElementById('display-service-2-name').textContent = a.service_name;
  if (a.service_time) document.getElementById('display-service-2-time').textContent = a.service_time;
  if (a.address)      document.getElementById('display-address').innerHTML = a.address.replace(/\n/g,'<br>');
  if (a.phone)        { document.getElementById('display-phone').textContent = a.phone; document.getElementById('display-phone').href = 'tel:'+a.phone; }
  const emailRow = document.getElementById('contact-email-row');
  if (a.email) {
    document.getElementById('display-email').textContent = a.email;
    document.getElementById('display-email').href = 'mailto:' + a.email;
    emailRow.style.display = '';
  } else {
    emailRow.style.display = 'none';
  }
  if (a.office_hours) document.getElementById('display-office-hours').textContent = a.office_hours;
}

async function saveServices() {
  store.about.service_name = document.getElementById('svc2-name').value;
  store.about.service_time = document.getElementById('svc2-time').value;
  store.about.address      = document.getElementById('admin-address').value;
  store.about.phone        = document.getElementById('admin-phone').value;
  store.about.email        = document.getElementById('admin-email').value;
  store.about.office_hours = document.getElementById('admin-office').value;
  applyContactToPage();
  const res = await fetch('/api/save/about', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(store.about)
  });
  res.ok ? showToast() : alert('Save failed');
}

// ---- EVENTS ----
const DAY_ABBR = { monday:'MON', tuesday:'TUE', wednesday:'WED', thursday:'THU', friday:'FRI', saturday:'SAT', sunday:'SUN' };
function abbrevDay(val) {
  const key = val.trim().toLowerCase();
  return DAY_ABBR[key] || val.toUpperCase();
}

function renderEvents() {
  document.getElementById('events-display').innerHTML = store.events.map(e => {
    const dateBox = e.recurring
      ? `<div class="event-date-box recurring"><div class="month">Every</div><div class="day">${abbrevDay(e.recurring)}</div></div>`
      : `<div class="event-date-box"><div class="month">${e.month}</div><div class="day">${e.day}</div></div>`;
    return `
    <div class="event-card">
      ${dateBox}
      <div class="event-info">
        <h3>${e.title}</h3>
        <div class="time">${e.time}</div>
        <p>${e.description}</p>
      </div>
    </div>`;
  }).join('');
}

function renderAdminEvents() {
  document.getElementById('events-admin-list').innerHTML = store.events.map((e,i) => `
    <div class="event-entry">
      <button class="entry-remove" onclick="removeEvent(${i})">Remove</button>
      <div class="form-row">
        <div class="form-group"><label>Title</label><input type="text" value="${e.title}" onchange="store.events[${i}].title=this.value"></div>
        <div class="form-group"><label>Time</label><input type="text" value="${e.time}" onchange="store.events[${i}].time=this.value"></div>
      </div>
      <div class="form-group">
        <label>Recurring (e.g. Wednesday, Sunday — leave blank for a one-time event)</label>
        <input type="text" value="${e.recurring||''}" placeholder="e.g. Wednesday" onchange="store.events[${i}].recurring=this.value;toggleEventDateFields(this,${i})">
      </div>
      <div class="form-row event-date-fields" id="event-date-fields-${i}" style="${e.recurring?'opacity:0.35;pointer-events:none;':''}">
        <div class="form-group"><label>Month (e.g. APR)</label><input type="text" value="${e.month}" onchange="store.events[${i}].month=this.value" maxlength="3"></div>
        <div class="form-group"><label>Day</label><input type="text" value="${e.day}" onchange="store.events[${i}].day=this.value" maxlength="2"></div>
      </div>
      <div class="form-group"><label>Description</label><textarea onchange="store.events[${i}].description=this.value">${e.description}</textarea></div>
    </div>`).join('');
}

function addEventEntry() { store.events.push({month:'---',day:'1',title:'New Event',time:'10:00 AM',description:'',recurring:''}); renderAdminEvents(); }
function toggleEventDateFields(input, i) {
  const row = document.getElementById('event-date-fields-'+i);
  if (input.value.trim()) { row.style.opacity='0.35'; row.style.pointerEvents='none'; }
  else { row.style.opacity=''; row.style.pointerEvents=''; }
}
function removeEvent(i)   { store.events.splice(i,1); renderAdminEvents(); }

function openCalendarModal() {
  const modal    = document.getElementById('calendar-modal');
  const iframe   = document.getElementById('cal-iframe');
  const noUrl    = document.getElementById('cal-no-url');
  const openLink = document.getElementById('cal-open-link');
  if (store.calendarUrl) {
    iframe.src = store.calendarUrl;
    iframe.style.display = '';
    noUrl.style.display = 'none';
    const calPageUrl = store.calendarUrl.replace('embedded=true', 'embedded=false').replace('/embed/', '/');
    openLink.href = calPageUrl;
  } else {
    iframe.src = '';
    iframe.style.display = 'none';
    noUrl.style.display = '';
    openLink.href = '';
  }
  modal.style.display = 'flex';
}
function closeCalendarModal() {
  document.getElementById('calendar-modal').style.display = 'none';
  document.getElementById('cal-iframe').src = '';
}

// ---- STAFF ----
function renderStaff() {
  document.getElementById('staff-display').innerHTML = store.staff.map((s,i) => {
    const avatarHtml = s.photo
      ? `<img src="${s.photo}" alt="${s.name}" class="staff-avatar-img">`
      : `<span class="staff-avatar-initials">${s.initials}</span>`;
    return `
    <div class="staff-card" onclick="openStaffModal(${i})" style="cursor:pointer;">
      <div class="staff-avatar">${avatarHtml}</div>
      <div class="staff-info">
        <h3>${s.name}</h3>
        <div class="role">${s.role}</div>
      </div>
    </div>`;
  }).join('');
}

function openStaffModal(i) {
  const s = store.staff[i];
  const modal = document.getElementById('staff-modal');
  const photoEl = document.getElementById('staff-modal-photo');
  const initialsEl = document.getElementById('staff-modal-initials');
  if (s.photo) {
    photoEl.src = s.photo;
    photoEl.alt = s.name;
    photoEl.style.display = 'block';
    initialsEl.style.display = 'none';
  } else {
    photoEl.style.display = 'none';
    initialsEl.textContent = s.initials;
    initialsEl.style.display = 'flex';
  }
  document.getElementById('staff-modal-name').textContent = s.name;
  document.getElementById('staff-modal-role').textContent = s.role;
  document.getElementById('staff-modal-bio').innerHTML = s.bio;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeStaffModal() {
  document.getElementById('staff-modal').style.display = 'none';
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeStaffModal(); closeAboutModal(); } });

let staffBioEditors = [];

function renderAdminStaff() {
  staffBioEditors = [];
  document.getElementById('staff-admin-list').innerHTML = store.staff.map((s,i) => `
    <div class="event-entry">
      <button class="entry-remove" onclick="removeStaff(${i})">Remove</button>
      <div class="form-row">
        <div class="form-group"><label>Full Name</label><input type="text" value="${s.name}" onchange="store.staff[${i}].name=this.value"></div>
        <div class="form-group"><label>Initials (fallback)</label><input type="text" value="${s.initials||''}" onchange="store.staff[${i}].initials=this.value" maxlength="2"></div>
      </div>
      <div class="form-group">
        <label>Photo</label>
        <div class="photo-upload-row">
          ${s.photo ? `<img src="${s.photo}" class="photo-preview">` : ''}
          <div class="photo-upload-actions">
            <input type="file" accept="image/*" id="photo-file-${i}" style="display:none" onchange="uploadStaffPhoto(${i}, this)">
            <button class="upload-photo-btn" onclick="document.getElementById('photo-file-${i}').click()">${s.photo ? 'Replace Photo' : 'Upload Photo'}</button>
            ${s.photo ? `<button class="upload-photo-btn" style="background:#fee;border-color:#fcc;color:#c33;" onclick="removeStaffPhoto(${i})">Remove Photo</button>` : ''}
            <span class="upload-status" id="upload-status-${i}"></span>
          </div>
        </div>
      </div>
      <div class="form-group"><label>Title / Role</label><input type="text" value="${s.role}" onchange="store.staff[${i}].role=this.value"></div>
      <div class="form-group"><label>Short Bio</label><div id="staff-bio-editor-${i}" class="rich-editor"></div></div>
    </div>`).join('');

  store.staff.forEach((s, i) => {
    const q = new Quill(`#staff-bio-editor-${i}`, { theme: 'snow', formats: richFormats, modules: { toolbar: richToolbar } });
    q.root.innerHTML = s.bio || '';
    q.on('text-change', () => { store.staff[i].bio = q.root.innerHTML; });
    staffBioEditors[i] = q;
  });
}

// Compress an image file client-side before uploading.
// maxDim: longest edge in px. quality: JPEG quality 0–1.
function compressImage(file, maxDim = 1920, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) { height = Math.round(height * maxDim / width); width = maxDim; }
        else                 { width  = Math.round(width  * maxDim / height); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function uploadStaffPhoto(i, input) {
  const file = input.files[0];
  if (!file) return;
  const statusEl = document.getElementById('upload-status-' + i);
  statusEl.textContent = 'Compressing…';
  statusEl.className = 'upload-status uploading';
  try {
    const blob = await compressImage(file, 800, 0.85);
    statusEl.textContent = 'Uploading…';
    const formData = new FormData();
    formData.append('file', blob, file.name.replace(/\.[^.]+$/, '.jpg'));
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed');
    const { url } = await res.json();
    store.staff[i].photo = url;
    statusEl.textContent = 'Uploaded!';
    statusEl.className = 'upload-status success';
    renderAdminStaff();
  } catch (e) {
    statusEl.textContent = 'Upload failed: ' + e.message;
    statusEl.className = 'upload-status error';
  }
}

function addStaffEntry() { store.staff.push({name:'New Member',initials:'NM',photo:'',role:'Title',bio:''}); renderAdminStaff(); }
function removeStaff(i)  { store.staff.splice(i,1); renderAdminStaff(); }
function removeStaffPhoto(i) { store.staff[i].photo = ''; renderAdminStaff(); }

// ---- SERMONS ----
const SERMONS_VISIBLE = 4;

// Normalize any stored date string to YYYY-MM-DD for reliable sorting/parsing.
// Handles both "March 16, 2025" (legacy) and "2025-03-16" (new) formats.
function toDateValue(dateStr) {
  if (!dateStr) return '';
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toISOString().slice(0, 10);
}

// Format YYYY-MM-DD (or legacy text) as "March 16, 2025" for display.
function formatSermonDate(dateStr) {
  const iso = toDateValue(dateStr);
  if (!iso) return dateStr || '';
  // Parse as local date to avoid timezone-shifting the day
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function sermonCardHTML(s) {
  const hasLink = s.url && s.url.trim() !== '';
  return `
  <div class="sermon-card">
    <div class="sermon-meta">
      <span class="sermon-date">${formatSermonDate(s.date)}</span>
      <span class="sermon-speaker">${s.speaker}</span>
    </div>
    <h3 class="sermon-title">${s.title}</h3>
    ${s.scripture ? `<div class="sermon-scripture">&#9753; ${s.scripture}</div>` : ''}
    ${hasLink
      ? `<a href="${s.url}" target="_blank" class="sermon-listen-btn">&#9654; Watch</a>`
      : `<span class="sermon-no-link">Recording coming soon</span>`}
  </div>`;
}

function renderSermons() {
  const recent = store.sermons.slice(0, SERMONS_VISIBLE);
  document.getElementById('sermons-display').innerHTML = recent.map(sermonCardHTML).join('');
  const wrap = document.getElementById('sermons-archive-link-wrap');
  if (wrap) wrap.style.display = store.sermons.length > SERMONS_VISIBLE ? 'block' : 'none';
}

function openSermonArchive() {
  const archived = store.sermons.slice(SERMONS_VISIBLE);
  if (!archived.length) return;

  // Group by year then month using normalized ISO dates
  const groups = {};
  archived.forEach(s => {
    const iso = toDateValue(s.date);
    const d = iso ? new Date(iso + 'T00:00:00') : null;
    const year = d ? d.getFullYear() : 'Unknown';
    const month = d ? d.toLocaleString('default', { month: 'long' }) : 'Unknown';
    const monthNum = d ? d.getMonth() : -1;
    if (!groups[year]) groups[year] = {};
    if (!groups[year][month]) groups[year][month] = { order: monthNum, items: [] };
    groups[year][month].items.push(s);
  });

  // Render newest year first
  const years = Object.keys(groups).sort((a, b) => b - a);
  const html = years.map(year => {
    const months = Object.keys(groups[year]).sort((a, b) => {
      return groups[year][b].order - groups[year][a].order;
    });
    const monthsHTML = months.map(month => {
      const cards = groups[year][month].items.map(sermonCardHTML).join('');
      return `<div class="archive-month-group">
        <h4 class="archive-month-label">${month}</h4>
        <div class="archive-cards">${cards}</div>
      </div>`;
    }).join('');
    return `<div class="archive-year-group">
      <h3 class="archive-year-label">${year}</h3>
      ${monthsHTML}
    </div>`;
  }).join('');

  document.getElementById('sermon-archive-content').innerHTML = html;
  document.getElementById('sermon-archive-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeSermonArchive() {
  document.getElementById('sermon-archive-modal').style.display = 'none';
  document.body.style.overflow = '';
}

function renderAdminSermons() {
  document.getElementById('sermons-admin-list').innerHTML = store.sermons.map((s,i) => `
    <div class="event-entry">
      <button class="entry-remove" onclick="removeSermon(${i})">Remove</button>
      <div class="form-row">
        <div class="form-group"><label>Sermon Title</label><input type="text" value="${s.title}" onchange="store.sermons[${i}].title=this.value"></div>
        <div class="form-group"><label>Date</label><input type="date" value="${toDateValue(s.date)}" onchange="store.sermons[${i}].date=this.value"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Speaker</label><input type="text" value="${s.speaker}" onchange="store.sermons[${i}].speaker=this.value"></div>
        <div class="form-group"><label>Scripture Reference</label><input type="text" value="${s.scripture||''}" onchange="store.sermons[${i}].scripture=this.value" placeholder="e.g. John 3:16"></div>
      </div>
      <div class="form-group">
        <label>YouTube / Podcast URL</label>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <input type="url" id="sermon-url-${i}" value="${s.url}" onchange="store.sermons[${i}].url=this.value" placeholder="https://..." style="flex:1;">
          <button type="button" class="btn-find-yt" onclick="findYouTubeVideo(${i})" title="Search YouTube for a video on this sermon's date">&#128269; Find on YouTube</button>
        </div>
        <div id="yt-status-${i}" style="font-size:0.78rem;margin-top:0.3rem;min-height:1.2em;color:var(--clay);"></div>
      </div>
    </div>`).join('');
}

async function findYouTubeVideo(i) {
  const sermon = store.sermons[i];
  const date = toDateValue(sermon.date);
  const statusEl = document.getElementById('yt-status-' + i);
  const urlInput = document.getElementById('sermon-url-' + i);

  if (!date) { statusEl.textContent = 'Set a date first.'; return; }

  statusEl.textContent = 'Searching YouTube...';
  try {
    const res = await fetch('/api/youtube/find?date=' + date);
    const data = await res.json();
    if (data.url) {
      store.sermons[i].url = data.url;
      urlInput.value = data.url;
      statusEl.style.color = 'var(--clay)';
      statusEl.textContent = '\u2713 Found: ' + data.title;
    } else {
      statusEl.style.color = '#999';
      statusEl.textContent = 'No video found for ' + date + '.';
    }
  } catch (e) {
    statusEl.style.color = '#c00';
    statusEl.textContent = 'Error: ' + e.message;
  }
}

function addSermonEntry() { store.sermons.push({title:'New Sermon',date:'',speaker:'',url:''}); renderAdminSermons(); }
function removeSermon(i)  { store.sermons.splice(i,1); renderAdminSermons(); }

// ---- ABOUT SECTIONS ----
let aboutSectionEditors = [];

function renderAdminAbout() {
  const list = document.getElementById('about-sections-admin-list');
  aboutSectionEditors = [];
  list.innerHTML = store.aboutSections.map((s, i) => `
    <div class="event-entry">
      <button class="entry-remove" onclick="removeAboutSection(${i})">Remove</button>
      <div class="form-group">
        <label>Section Title</label>
        <input type="text" value="${s.title || ''}" onchange="store.aboutSections[${i}].title=this.value" placeholder="e.g. Our Vision">
      </div>
      <div class="form-group">
        <label>Content</label>
        <div id="about-section-editor-${i}" class="rich-editor"></div>
      </div>
      <div class="form-group">
        <label>Photo (optional)</label>
        <div class="photo-upload-row">
          ${s.photo ? `<img src="${s.photo}" style="width:120px;height:80px;object-fit:cover;border-radius:6px;flex-shrink:0;">` : ''}
          <div class="photo-upload-actions">
            <input type="file" accept="image/*" id="about-section-file-${i}" style="display:none" onchange="uploadAboutSectionPhoto(${i}, this)">
            <button class="upload-photo-btn" onclick="document.getElementById('about-section-file-${i}').click()">${s.photo ? 'Replace Photo' : 'Add Photo'}</button>
            ${s.photo ? `<button class="upload-photo-btn" style="background:#fee;border-color:#fcc;color:#c33;" onclick="removeAboutSectionPhoto(${i})">Remove Photo</button>` : ''}
            <span class="upload-status" id="about-section-status-${i}"></span>
          </div>
        </div>
      </div>
    </div>`).join('');

  store.aboutSections.forEach((s, i) => {
    const editor = new Quill(`#about-section-editor-${i}`, { theme: 'snow', formats: richFormats, modules: { toolbar: richToolbar } });
    editor.root.innerHTML = s.content || '';
    aboutSectionEditors.push(editor);
  });
}

function addAboutSection() {
  store.aboutSections.push({ title: 'New Section', content: '', photo: '' });
  renderAdminAbout();
}

function removeAboutSection(i) {
  store.aboutSections.splice(i, 1);
  renderAdminAbout();
}

function removeAboutSectionPhoto(i) {
  store.aboutSections[i].photo = '';
  renderAdminAbout();
}

async function uploadAboutSectionPhoto(i, input) {
  const file = input.files[0];
  if (!file) return;
  const statusEl = document.getElementById('about-section-status-' + i);
  statusEl.textContent = 'Compressing…'; statusEl.className = 'upload-status uploading';
  try {
    const blob = await compressImage(file, 1200, 0.85);
    statusEl.textContent = 'Uploading…';
    const formData = new FormData();
    formData.append('file', blob, file.name.replace(/\.[^.]+$/, '.jpg'));
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed');
    const { url } = await res.json();
    store.aboutSections[i].photo = url;
    statusEl.textContent = 'Uploaded!'; statusEl.className = 'upload-status success';
    renderAdminAbout();
  } catch (e) {
    statusEl.textContent = 'Failed: ' + e.message; statusEl.className = 'upload-status error';
  }
}

async function saveAbout() {
  aboutSectionEditors.forEach((editor, i) => {
    if (store.aboutSections[i]) store.aboutSections[i].content = editor.root.innerHTML;
  });
  const res = await fetch('/api/save/about-sections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections: store.aboutSections })
  });
  res.ok ? showToast() : alert('Save failed');
}

// ---- HISTORY MODAL ----
function openHistoryModal() {
  document.getElementById('history-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeHistoryModal() {
  document.getElementById('history-modal').style.display = 'none';
  document.body.style.overflow = '';
}

// ---- ABOUT MODAL ----
function openAboutModal() {
  const body = document.getElementById('about-sections-body');
  body.innerHTML = store.aboutSections.map(s => `
    <div class="about-modal-section${s.photo ? ' has-photo' : ''}">
      ${s.photo ? `<img class="about-section-photo" src="${s.photo}" alt="${s.title}">` : ''}
      <div class="about-section-text">
        <h3>${s.title}</h3>
        <div>${s.content}</div>
      </div>
    </div>`).join('');
  document.getElementById('about-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeAboutModal() {
  document.getElementById('about-modal').style.display = 'none';
  document.body.style.overflow = '';
}

// ---- HERO SLIDESHOW ----
let slideshowTimer = null;
let currentSlide = 0;

function initSlideshow() {
  clearInterval(slideshowTimer);
  currentSlide = 0;

  const photos = store.heroPhotos.filter(p => p.url);

  // About box
  const aboutContainer = document.getElementById('about-slideshow');
  const placeholder = document.getElementById('about-visual-placeholder');
  aboutContainer.innerHTML = '';
  if (photos.length) {
    placeholder.style.display = 'none';
    photos.forEach((p, i) => {
      const div = document.createElement('div');
      div.className = 'about-slide' + (i === 0 ? ' active' : '');
      div.style.backgroundImage = `url('${p.url}')`;
      aboutContainer.appendChild(div);
    });
  } else {
    placeholder.style.display = 'flex';
  }

  if (photos.length > 1) {
    slideshowTimer = setInterval(advanceSlide, 5000);
  }
}

function advanceSlide() {
  const slides = document.querySelectorAll('.about-slide');
  if (!slides.length) return;
  slides[currentSlide].classList.remove('active');
  currentSlide = (currentSlide + 1) % slides.length;
  slides[currentSlide].classList.add('active');
}

// ---- HERO PHOTOS ADMIN ----
function renderAdminHeroPhotos() {
  const n = store.heroPhotos.length;
  document.getElementById('photos-admin-list').innerHTML = n
    ? store.heroPhotos.map((p, i) => `
    <div class="event-entry" style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
      <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0;">
        <button class="reorder-btn" onclick="moveHeroPhoto(${i},-1)" ${i===0?'disabled':''}>▲</button>
        <button class="reorder-btn" onclick="moveHeroPhoto(${i}, 1)" ${i===n-1?'disabled':''}>▼</button>
      </div>
      <button class="entry-remove" onclick="removeHeroPhoto(${i})" style="position:static;">Remove</button>
      ${p.url ? `<img src="${p.url}" style="width:80px;height:52px;object-fit:cover;border-radius:4px;flex-shrink:0;">` : ''}
      <div style="flex:1;min-width:200px;">
        <div class="photo-upload-actions">
          <input type="file" accept="image/*" id="hero-photo-file-${i}" style="display:none" onchange="uploadHeroPhoto(${i}, this)">
          <button class="upload-photo-btn" onclick="document.getElementById('hero-photo-file-${i}').click()">Replace Photo</button>
          <span class="upload-status" id="hero-upload-status-${i}"></span>
        </div>
      </div>
    </div>`).join('')
    : '<p style="color:var(--text-light);font-size:0.88rem;">No photos yet. Add one below.</p>';
}

function moveHeroPhoto(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= store.heroPhotos.length) return;
  [store.heroPhotos[i], store.heroPhotos[j]] = [store.heroPhotos[j], store.heroPhotos[i]];
  renderAdminHeroPhotos();
}

async function uploadHeroPhoto(i, input) {
  const file = input.files[0];
  if (!file) return;
  const statusEl = document.getElementById('hero-upload-status-' + i);
  statusEl.textContent = 'Compressing…';
  statusEl.className = 'upload-status uploading';
  try {
    const blob = await compressImage(file, 1920, 0.82);
    statusEl.textContent = 'Uploading…';
    const formData = new FormData();
    formData.append('file', blob, file.name.replace(/\.[^.]+$/, '.jpg'));
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed');
    const { url } = await res.json();
    store.heroPhotos[i].url = url;
    statusEl.textContent = 'Uploaded!';
    statusEl.className = 'upload-status success';
    renderAdminHeroPhotos();
    initSlideshow();
  } catch (e) {
    statusEl.textContent = 'Failed: ' + e.message;
    statusEl.className = 'upload-status error';
  }
}

function addHeroPhoto() {
  store.heroPhotos.push({ url: '' });
  // Immediately trigger upload for the new entry
  renderAdminHeroPhotos();
  setTimeout(() => document.getElementById(`hero-photo-file-${store.heroPhotos.length - 1}`)?.click(), 100);
}

function removeHeroPhoto(i) { store.heroPhotos.splice(i, 1); renderAdminHeroPhotos(); initSlideshow(); }

async function saveHeroPhotos() {
  const res = await fetch('/api/save/hero-photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photos: store.heroPhotos.filter(p => p.url) })
  });
  if (!res.ok) { alert('Save failed'); return; }
  showToast();
}

// ---- MOBILE NAV ----
function toggleMobileNav() {
  const menu = document.getElementById('nav-mobile-menu');
  const btn = document.querySelector('.nav-hamburger');
  menu.classList.toggle('open');
  btn.classList.toggle('open');
}
function closeMobileNav() {
  document.getElementById('nav-mobile-menu').classList.remove('open');
  document.querySelector('.nav-hamburger').classList.remove('open');
}

// Close panels on backdrop click
document.getElementById('admin-panel').addEventListener('click', function(e) { if(e.target===this) closeAdmin(); });
document.getElementById('login-modal').addEventListener('click', function(e) { if(e.target===this) closeLoginModal(); });

// ---- RICH TEXT EDITORS ----
const richToolbar = [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']];
const richFormats = ['bold', 'italic', 'underline', 'list'];

// ---- GALLERY ----
let activeGalleryAlbum = 'All';

function getFilteredGalleryPhotos() {
  const photos = store.galleryPhotos.filter(p => p.url);
  if (activeGalleryAlbum === 'All') return photos;
  return photos.filter(p => p.album === activeGalleryAlbum);
}

function renderGalleryTabs() {
  const tabsEl = document.getElementById('gallery-album-tabs');
  if (!tabsEl) return;
  const photos = store.galleryPhotos.filter(p => p.url);
  const usedAlbums = store.galleryAlbums.filter(a => photos.some(p => p.album === a.name));
  if (!usedAlbums.length) { tabsEl.style.display = 'none'; return; }
  tabsEl.style.display = '';
  const tabs = ['All', ...usedAlbums.map(a => a.name)];
  tabsEl.innerHTML = tabs.map(t =>
    `<button class="gallery-tab${t === activeGalleryAlbum ? ' active' : ''}" onclick="setGalleryAlbum('${t.replace(/'/g,"\\'")}')">` +
    `${t === 'All' ? 'All Photos' : t}</button>`
  ).join('');
}

function setGalleryAlbum(album) {
  activeGalleryAlbum = album;
  renderGalleryTabs();
  renderGallery();
}

function renderGallery() {
  const grid  = document.getElementById('gallery-grid');
  const empty = document.getElementById('gallery-no-photos');
  renderGalleryTabs();
  const photos = getFilteredGalleryPhotos();
  if (!photos.length) { grid.innerHTML = ''; empty.style.display = ''; return; }
  empty.style.display = 'none';
  grid.innerHTML = photos.map((p, i) => `
    <button class="gallery-thumb" onclick="openLightboxFiltered(${i})" style="background-image:url('${p.url}');background-size:cover;background-position:center;border:none;padding:0;">
      ${p.caption ? `<div class="gallery-thumb-caption">${p.caption}</div>` : ''}
    </button>`).join('');
}

function openGalleryModal() {
  activeGalleryAlbum = 'All';
  renderGallery();
  document.getElementById('gallery-modal').style.display = 'flex';
}
function closeGalleryModal() { document.getElementById('gallery-modal').style.display = 'none'; }

let lightboxIndex = 0;
function openLightboxFiltered(i) {
  const photos = getFilteredGalleryPhotos();
  lightboxIndex = i;
  document.getElementById('lightbox-img').src = photos[i].url;
  document.getElementById('lightbox-caption').textContent = photos[i].caption || '';
  document.getElementById('lightbox-prev').style.visibility = i > 0 ? '' : 'hidden';
  document.getElementById('lightbox-next').style.visibility = i < photos.length - 1 ? '' : 'hidden';
  document.getElementById('lightbox').style.display = 'flex';
}
function closeLightbox() {
  document.getElementById('lightbox').style.display = 'none';
  document.getElementById('lightbox-img').src = '';
}
function lightboxNav(dir) {
  const photos = getFilteredGalleryPhotos();
  const next = lightboxIndex + dir;
  if (next >= 0 && next < photos.length) openLightboxFiltered(next);
}
document.addEventListener('keydown', e => {
  if (document.getElementById('lightbox').style.display === 'flex') {
    if (e.key === 'ArrowLeft')  lightboxNav(-1);
    if (e.key === 'ArrowRight') lightboxNav(1);
    if (e.key === 'Escape')     closeLightbox();
  }
  if (document.getElementById('gallery-modal').style.display === 'flex' && e.key === 'Escape') closeGalleryModal();
});

function albumOptions(selected) {
  const none = `<option value=""${!selected ? ' selected' : ''}>— No Album —</option>`;
  return none + store.galleryAlbums.map(a =>
    `<option value="${a.name}"${a.name === selected ? ' selected' : ''}>${a.name}</option>`
  ).join('');
}

function renderAdminGalleryAlbums() {
  document.getElementById('gallery-albums-list').innerHTML = store.galleryAlbums.length
    ? store.galleryAlbums.map((a, i) => `
      <div class="album-entry">
        <input type="text" value="${a.name}" onchange="store.galleryAlbums[${i}].name=this.value;renderAdminGallery();" placeholder="Album name">
        <button class="entry-remove" onclick="removeGalleryAlbum(${i})" style="position:static;font-size:0.75rem;padding:0.3rem 0.6rem;">Remove</button>
      </div>`).join('')
    : '<p style="color:var(--text-light);font-size:0.88rem;">No albums yet.</p>';
}

function addGalleryAlbum() {
  store.galleryAlbums.push({ name: 'New Album', sort_order: store.galleryAlbums.length });
  renderAdminGalleryAlbums();
  renderAdminGallery();
}
function removeGalleryAlbum(i) {
  store.galleryAlbums.splice(i, 1);
  renderAdminGalleryAlbums();
  renderAdminGallery();
}

function renderAdminGallery() {
  renderAdminGalleryAlbums();
  document.getElementById('gallery-admin-list').innerHTML = store.galleryPhotos.length
    ? store.galleryPhotos.map((p, i) => `
      <div class="event-entry" style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
        <button class="entry-remove" onclick="removeGalleryPhoto(${i})" style="position:static;">Remove</button>
        ${p.url ? `<img src="${p.url}" style="width:80px;height:52px;object-fit:cover;border-radius:4px;flex-shrink:0;">` : ''}
        <div style="flex:1;min-width:200px;">
          <div class="photo-upload-actions">
            <input type="file" accept="image/*" id="gallery-file-${i}" style="display:none" onchange="uploadGalleryPhoto(${i}, this)">
            <button class="upload-photo-btn" onclick="document.getElementById('gallery-file-${i}').click()">${p.url ? 'Replace' : 'Upload Photo'}</button>
            <span class="upload-status" id="gallery-status-${i}"></span>
          </div>
          <input type="text" placeholder="Caption (optional)" value="${p.caption||''}" style="margin-top:0.5rem;width:100%;" onchange="store.galleryPhotos[${i}].caption=this.value">
          <select style="margin-top:0.4rem;width:100%;" onchange="store.galleryPhotos[${i}].album=this.value">${albumOptions(p.album||'')}</select>
        </div>
      </div>`).join('')
    : '<p style="color:var(--text-light);font-size:0.88rem;">No photos yet. Click below to add one.</p>';
}

async function uploadGalleryPhoto(i, input) {
  const file = input.files[0];
  if (!file) return;
  const statusEl = document.getElementById('gallery-status-' + i);
  statusEl.textContent = 'Compressing…'; statusEl.className = 'upload-status uploading';
  try {
    const blob = await compressImage(file, 1920, 0.82);
    statusEl.textContent = 'Uploading…';
    const formData = new FormData();
    formData.append('file', blob, file.name.replace(/\.[^.]+$/, '.jpg'));
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed');
    const { url } = await res.json();
    store.galleryPhotos[i].url = url;
    statusEl.textContent = 'Uploaded!'; statusEl.className = 'upload-status success';
    renderAdminGallery();
  } catch (e) {
    statusEl.textContent = 'Failed: ' + e.message; statusEl.className = 'upload-status error';
  }
}

function addGalleryPhoto() {
  store.galleryPhotos.push({ url: '', caption: '', album: '' });
  renderAdminGallery();
  setTimeout(() => document.getElementById(`gallery-file-${store.galleryPhotos.length - 1}`)?.click(), 100);
}
function removeGalleryPhoto(i) { store.galleryPhotos.splice(i, 1); renderAdminGallery(); }

async function saveGallery() {
  const [albumRes, photoRes] = await Promise.all([
    fetch('/api/save/gallery-albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ albums: store.galleryAlbums })
    }),
    fetch('/api/save/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos: store.galleryPhotos.filter(p => p.url) })
    })
  ]);
  if (!albumRes.ok || !photoRes.ok) { alert('Save failed'); return; }
  showToast();
}

// Init
initAuth();
loadData();
renderEvents();
renderStaff();
renderSermons();
