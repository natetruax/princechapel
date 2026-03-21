// ============================================================
// CONFIGURATION — fill these in after Supabase setup
// ============================================================
const SUPABASE_URL     = 'https://suisumcbjgrpbwbxvedo.supabase.co';       // e.g. https://xyzabc.supabase.co
const SUPABASE_ANON_KEY = 'sb_publishable_PEYoViM0hul26oFvD7Wcow_FjJEFHqA'; // Supabase > Settings > API > anon key

// Google email addresses approved as admins — add as many as needed
const ADMIN_EMAILS = [
  'natetruax20@gmail.com',
  'melanie.lanae@gmail.com',
];
// ============================================================

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { flowType: 'pkce' }
});
let currentUser = null;

// ---- AUTH ----
async function initAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) handleSession(session);
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session) handleSession(session);
    else handleSignOut();
  });
}

function handleSession(session) {
  const email = session.user.email;
  if (ADMIN_EMAILS.includes(email)) {
    currentUser = session.user;
    document.getElementById('admin-toggle').style.display = 'flex';
    closeLoginModal();
    showToast('Signed in — tap the admin button to continue');
  } else {
    supabaseClient.auth.signOut();
    showLoginError('Your Google account (' + email + ') is not an approved admin. Please contact the church office.');
  }
}

function handleSignOut() {
  currentUser = null;
  document.getElementById('admin-toggle').style.display = 'none';
}

async function signInWithGoogle() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
  if (error) showLoginError(error.message);
}

async function signOut() {
  await supabaseClient.auth.signOut();
  closeAdmin();
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

// ---- DATA STORE (default sample data — replaced by Supabase once configured) ----
const store = {
  heroPhotos: [],
  about: {
    name:    'Prince Chapel African Methodist Episcopal Church by the Sea — a congregation rooted in over 100 years of faith, service, and community in La Jolla, California.',
    vision:  '',
    mission: '',
    motto:   ''
  },
  events: [
    { month:'APR', day:'6',  title:'Palm Sunday Service',    time:'9:00 AM', desc:'A special service to begin Holy Week together.' },
    { month:'APR', day:'13', title:'Easter Sunrise Service', time:'6:30 AM', desc:'Celebrate the resurrection with our community.' },
    { month:'APR', day:'20', title:'Spring Fellowship Dinner',time:'1:00 PM', desc:'Family meal after worship. All are welcome!' }
  ],
  staff: [
    { name:'Rev. Dr. Smith',  initials:'RS', role:'Senior Pastor',   bio:'Leading Prince Chapel with faith and dedication.' },
    { name:'Deacon Jones',    initials:'DJ', role:'Head Deacon',      bio:'Serving the congregation for over 20 years.' },
    { name:'Sis. Williams',   initials:'SW', role:'Choir Director',   bio:'Bringing joyful music to every worship service.' }
  ],
  sermons: [
    { title:'Walking in His Grace',    date:'March 16, 2025', speaker:'Rev. Dr. Smith', url:'' },
    { title:'The Power of Community',  date:'March 9, 2025',  speaker:'Rev. Dr. Smith', url:'' }
  ]
};

// ---- SUPABASE DATA LOAD & SAVE ----
// Once your tables are created (see setup guide), these pull live data from Supabase.
async function loadFromSupabase() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') return;
  const [eventsRes, staffRes, sermonsRes, aboutRes, photosRes] = await Promise.all([
    supabaseClient.from('events').select('*').order('sort_order'),
    supabaseClient.from('staff').select('*').order('sort_order'),
    supabaseClient.from('sermons').select('*').order('date', { ascending: false }),
    supabaseClient.from('about').select('*').limit(1),
    supabaseClient.from('hero_photos').select('*').order('sort_order')
  ]);
  if (eventsRes.data && eventsRes.data.length)  store.events     = eventsRes.data;
  if (staffRes.data  && staffRes.data.length)   store.staff      = staffRes.data;
  if (sermonsRes.data && sermonsRes.data.length) store.sermons   = sermonsRes.data;
  if (aboutRes.data  && aboutRes.data.length)   Object.assign(store.about, aboutRes.data[0]);
  if (photosRes.data && photosRes.data.length)  store.heroPhotos = photosRes.data;
  renderEvents();
  renderStaff();
  renderSermons();
  initSlideshow();
}

async function saveEventsToSupabase() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') { showToast(); return; }
  await supabaseClient.from('events').delete().neq('id', 0);
  const { error } = await supabaseClient.from('events').insert(store.events.map((e,i) => ({...e, sort_order:i})));
  error ? alert('Save failed: ' + error.message) : showToast();
}

async function saveStaffToSupabase() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') { showToast(); return; }
  await supabaseClient.from('staff').delete().neq('id', 0);
  const { error } = await supabaseClient.from('staff').insert(store.staff.map((s,i) => ({...s, sort_order:i})));
  error ? alert('Save failed: ' + error.message) : showToast();
}

async function saveSermonsToSupabase() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') { showToast(); return; }
  await supabaseClient.from('sermons').delete().neq('id', 0);
  const { error } = await supabaseClient.from('sermons').insert(store.sermons);
  error ? alert('Save failed: ' + error.message) : showToast();
}

// ---- ADMIN PANEL ----
function openAdmin() {
  if (!currentUser) { openLoginModal(); return; }
  document.getElementById('admin-panel').classList.add('open');
  renderAdminEvents();
  renderAdminStaff();
  renderAdminSermons();
  renderAdminAbout();
  renderAdminHeroPhotos();
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
function saveServices() {
  document.getElementById('display-service-2-name').textContent = document.getElementById('svc2-name').value;
  document.getElementById('display-service-2-time').textContent = document.getElementById('svc2-time').value;
  const addr = document.getElementById('admin-address').value;
  document.getElementById('display-address').innerHTML = addr.replace(/\n/g,'<br>');
  const ph = document.getElementById('admin-phone').value;
  if (ph) { document.getElementById('display-phone').textContent = ph; document.getElementById('display-phone').href = 'tel:'+ph; }
  const em = document.getElementById('admin-email').value;
  if (em) { document.getElementById('display-email').textContent = em; document.getElementById('display-email').href = 'mailto:'+em; }
  document.getElementById('display-office-hours').textContent = document.getElementById('admin-office').value;
  showToast();
}

// ---- EVENTS ----
function renderEvents() {
  document.getElementById('events-display').innerHTML = store.events.map(e => `
    <div class="event-card">
      <div class="event-date-box"><div class="month">${e.month}</div><div class="day">${e.day}</div></div>
      <div class="event-info">
        <h3>${e.title}</h3>
        <div class="time">${e.time}</div>
        <p>${e.desc}</p>
      </div>
    </div>`).join('');
}

function renderAdminEvents() {
  document.getElementById('events-admin-list').innerHTML = store.events.map((e,i) => `
    <div class="event-entry">
      <button class="entry-remove" onclick="removeEvent(${i})">Remove</button>
      <div class="form-row">
        <div class="form-group"><label>Title</label><input type="text" value="${e.title}" onchange="store.events[${i}].title=this.value"></div>
        <div class="form-group"><label>Time</label><input type="text" value="${e.time}" onchange="store.events[${i}].time=this.value"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Month (e.g. APR)</label><input type="text" value="${e.month}" onchange="store.events[${i}].month=this.value" maxlength="3"></div>
        <div class="form-group"><label>Day</label><input type="text" value="${e.day}" onchange="store.events[${i}].day=this.value" maxlength="2"></div>
      </div>
      <div class="form-group"><label>Description</label><textarea onchange="store.events[${i}].desc=this.value">${e.desc}</textarea></div>
    </div>`).join('');
}

function addEventEntry() { store.events.push({month:'---',day:'1',title:'New Event',time:'10:00 AM',desc:''}); renderAdminEvents(); }
function removeEvent(i)   { store.events.splice(i,1); renderAdminEvents(); }
function saveEvents()     { renderEvents(); saveEventsToSupabase(); }

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
            <button class="upload-photo-btn" onclick="document.getElementById('photo-file-${i}').click()">Upload Photo</button>
            <span class="upload-status" id="upload-status-${i}"></span>
          </div>
        </div>
      </div>
      <div class="form-group"><label>Title / Role</label><input type="text" value="${s.role}" onchange="store.staff[${i}].role=this.value"></div>
      <div class="form-group"><label>Short Bio</label><div id="staff-bio-editor-${i}" class="rich-editor"></div></div>
    </div>`).join('');
  store.staff.forEach((s, i) => {
    const q = new Quill(`#staff-bio-editor-${i}`, { theme: 'snow', modules: { toolbar: richToolbar } });
    q.root.innerHTML = s.bio || '';
    q.on('text-change', () => { store.staff[i].bio = q.root.innerHTML; });
    staffBioEditors[i] = q;
  });
}

async function uploadStaffPhoto(i, input) {
  const file = input.files[0];
  if (!file) return;
  const statusEl = document.getElementById('upload-status-' + i);
  statusEl.textContent = 'Uploading…';
  statusEl.className = 'upload-status uploading';
  const ext = file.name.split('.').pop();
  const filename = `staff-${Date.now()}-${i}.${ext}`;
  const { error } = await supabaseClient.storage
    .from('staff-photos')
    .upload(filename, file, { contentType: file.type });
  if (error) {
    statusEl.textContent = 'Upload failed: ' + error.message;
    statusEl.className = 'upload-status error';
    return;
  }
  const { data: { publicUrl } } = supabaseClient.storage
    .from('staff-photos')
    .getPublicUrl(filename);
  store.staff[i].photo = publicUrl;
  statusEl.textContent = 'Uploaded!';
  statusEl.className = 'upload-status success';
  renderAdminStaff();
}

function addStaffEntry() { store.staff.push({name:'New Member',initials:'NM',photo:'',role:'Title',bio:''}); renderAdminStaff(); }
function removeStaff(i)  { store.staff.splice(i,1); renderAdminStaff(); }
function saveStaff()     { renderStaff(); saveStaffToSupabase(); }

// ---- SERMONS ----
function renderSermons() {
  document.getElementById('sermons-display').innerHTML = store.sermons.map(s => {
    const hasLink = s.url && s.url.trim() !== '';
    return `
    <div class="sermon-card">
      <div class="sermon-meta">
        <span class="sermon-date">${s.date}</span>
        <span class="sermon-speaker">${s.speaker}</span>
      </div>
      <h3 class="sermon-title">${s.title}</h3>
      ${hasLink
        ? `<a href="${s.url}" target="_blank" class="sermon-listen-btn">&#9654; Watch</a>`
        : `<span class="sermon-no-link">Recording coming soon</span>`}
    </div>`;
  }).join('');
}

function renderAdminSermons() {
  document.getElementById('sermons-admin-list').innerHTML = store.sermons.map((s,i) => `
    <div class="event-entry">
      <button class="entry-remove" onclick="removeSermon(${i})">Remove</button>
      <div class="form-row">
        <div class="form-group"><label>Sermon Title</label><input type="text" value="${s.title}" onchange="store.sermons[${i}].title=this.value"></div>
        <div class="form-group"><label>Date</label><input type="text" value="${s.date}" onchange="store.sermons[${i}].date=this.value"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Speaker</label><input type="text" value="${s.speaker}" onchange="store.sermons[${i}].speaker=this.value"></div>
        <div class="form-group"><label>YouTube / Podcast URL</label><input type="url" value="${s.url}" onchange="store.sermons[${i}].url=this.value" placeholder="https://..."></div>
      </div>
    </div>`).join('');
}

function addSermonEntry() { store.sermons.push({title:'New Sermon',date:'',speaker:'',url:''}); renderAdminSermons(); }
function removeSermon(i)  { store.sermons.splice(i,1); renderAdminSermons(); }
function saveSermons()    { renderSermons(); saveSermonsToSupabase(); }

// ---- ABOUT ----
function renderAdminAbout() {
  if (!quillAboutName) initAboutEditors();
  quillAboutName.root.innerHTML    = store.about.name    || '';
  quillAboutVision.root.innerHTML  = store.about.vision  || '';
  quillAboutMission.root.innerHTML = store.about.mission || '';
  quillAboutMotto.root.innerHTML   = store.about.motto   || '';
}

async function saveAbout() {
  if (quillAboutName) {
    store.about.name    = quillAboutName.root.innerHTML;
    store.about.vision  = quillAboutVision.root.innerHTML;
    store.about.mission = quillAboutMission.root.innerHTML;
    store.about.motto   = quillAboutMotto.root.innerHTML;
  }
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') { showToast(); return; }
  await supabaseClient.from('about').delete().neq('id', 0);
  const { error } = await supabaseClient.from('about').insert([store.about]);
  error ? alert('Save failed: ' + error.message) : showToast();
}

// ---- ABOUT MODAL ----
function openAboutModal() {
  document.getElementById('about-name').innerHTML    = store.about.name;
  document.getElementById('about-vision').innerHTML  = store.about.vision;
  document.getElementById('about-mission').innerHTML = store.about.mission;
  document.getElementById('about-motto').innerHTML   = store.about.motto;
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
  document.getElementById('photos-admin-list').innerHTML = store.heroPhotos.length
    ? store.heroPhotos.map((p, i) => `
    <div class="event-entry" style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
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

async function uploadHeroPhoto(i, input) {
  const file = input.files[0];
  if (!file) return;
  const statusEl = document.getElementById('hero-upload-status-' + i);
  statusEl.textContent = 'Uploading…';
  statusEl.className = 'upload-status uploading';
  const ext = file.name.split('.').pop();
  const filename = `hero-${Date.now()}-${i}.${ext}`;
  const { error } = await supabaseClient.storage.from('staff-photos').upload(filename, file, { contentType: file.type });
  if (error) { statusEl.textContent = 'Failed: ' + error.message; statusEl.className = 'upload-status error'; return; }
  const { data: { publicUrl } } = supabaseClient.storage.from('staff-photos').getPublicUrl(filename);
  store.heroPhotos[i].url = publicUrl;
  statusEl.textContent = 'Uploaded!';
  statusEl.className = 'upload-status success';
  renderAdminHeroPhotos();
  initSlideshow();
}

function addHeroPhoto() {
  store.heroPhotos.push({ url: '' });
  // Immediately trigger upload for the new entry
  renderAdminHeroPhotos();
  setTimeout(() => document.getElementById(`hero-photo-file-${store.heroPhotos.length - 1}`)?.click(), 100);
}

function removeHeroPhoto(i) { store.heroPhotos.splice(i, 1); renderAdminHeroPhotos(); initSlideshow(); }

async function saveHeroPhotos() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') { showToast(); return; }
  await supabaseClient.from('hero_photos').delete().neq('id', 0);
  const rows = store.heroPhotos.filter(p => p.url).map((p, i) => ({ url: p.url, sort_order: i }));
  const { error } = rows.length ? await supabaseClient.from('hero_photos').insert(rows) : { error: null };
  error ? alert('Save failed: ' + error.message) : showToast();
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
let quillAboutName, quillAboutVision, quillAboutMission, quillAboutMotto;

function initAboutEditors() {
  quillAboutName    = new Quill('#admin-about-name-editor',    { theme: 'snow', modules: { toolbar: richToolbar } });
  quillAboutVision  = new Quill('#admin-about-vision-editor',  { theme: 'snow', modules: { toolbar: richToolbar } });
  quillAboutMission = new Quill('#admin-about-mission-editor', { theme: 'snow', modules: { toolbar: richToolbar } });
  quillAboutMotto   = new Quill('#admin-about-motto-editor',   { theme: 'snow', modules: { toolbar: richToolbar } });
}

// Init
initAuth();
loadFromSupabase();
renderEvents();
renderStaff();
renderSermons();
