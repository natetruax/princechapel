// ============================================================
// CONFIGURATION — fill these in after Supabase setup
// ============================================================
const SUPABASE_URL     = 'https://suisumcbjgrpbwbxvedo.supabase.co';       // e.g. https://xyzabc.supabase.co
const SUPABASE_ANON_KEY = 'sb_publishable_PEYoViM0hul26oFvD7Wcow_FjJEFHqA'; // Supabase > Settings > API > anon key

// Google email addresses approved as admins — add as many as needed
const ADMIN_EMAILS = [
  'natetruax20@gmail.com',
  'melanie.lanae@gmail.com'
];
// ============================================================

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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

// ---- DATA STORE (default sample data — replaced by Supabase once configured) ----
const store = {
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
  const [eventsRes, staffRes, sermonsRes] = await Promise.all([
    supabaseClient.from('events').select('*').order('sort_order'),
    supabaseClient.from('staff').select('*').order('sort_order'),
    supabaseClient.from('sermons').select('*').order('date', { ascending: false })
  ]);
  if (eventsRes.data && eventsRes.data.length)  store.events  = eventsRes.data;
  if (staffRes.data  && staffRes.data.length)   store.staff   = staffRes.data;
  if (sermonsRes.data && sermonsRes.data.length) store.sermons = sermonsRes.data;
  renderEvents();
  renderStaff();
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

function showToast() {
  const t = document.getElementById('toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
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
  document.getElementById('staff-display').innerHTML = store.staff.map(s => `
    <div class="staff-card">
      <div class="staff-avatar">${s.initials}</div>
      <div class="staff-info">
        <h3>${s.name}</h3>
        <div class="role">${s.role}</div>
        <p>${s.bio}</p>
      </div>
    </div>`).join('');
}

function renderAdminStaff() {
  document.getElementById('staff-admin-list').innerHTML = store.staff.map((s,i) => `
    <div class="event-entry">
      <button class="entry-remove" onclick="removeStaff(${i})">Remove</button>
      <div class="form-row">
        <div class="form-group"><label>Full Name</label><input type="text" value="${s.name}" onchange="store.staff[${i}].name=this.value"></div>
        <div class="form-group"><label>Initials (avatar)</label><input type="text" value="${s.initials}" onchange="store.staff[${i}].initials=this.value" maxlength="2"></div>
      </div>
      <div class="form-group"><label>Title / Role</label><input type="text" value="${s.role}" onchange="store.staff[${i}].role=this.value"></div>
      <div class="form-group"><label>Short Bio</label><textarea onchange="store.staff[${i}].bio=this.value">${s.bio}</textarea></div>
    </div>`).join('');
}

function addStaffEntry() { store.staff.push({name:'New Member',initials:'NM',role:'Title',bio:''}); renderAdminStaff(); }
function removeStaff(i)  { store.staff.splice(i,1); renderAdminStaff(); }
function saveStaff()     { renderStaff(); saveStaffToSupabase(); }

// ---- SERMONS ----
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
function saveSermons()    { saveSermonsToSupabase(); }

// ---- GIVE ----
function selectAmount(btn) {
  document.querySelectorAll('.give-amount').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// Close panels on backdrop click
document.getElementById('admin-panel').addEventListener('click', function(e) { if(e.target===this) closeAdmin(); });
document.getElementById('login-modal').addEventListener('click', function(e) { if(e.target===this) closeLoginModal(); });

// Init
initAuth();
loadFromSupabase();
renderEvents();
renderStaff();
