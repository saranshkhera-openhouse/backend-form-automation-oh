// ── Openhouse Forms: Shared Utilities ──

const API = window.location.origin;

// ══════════════════════════════════════
// TOAST NOTIFICATIONS
// ══════════════════════════════════════
function toast(msg, type = 'ok', ms = 4000) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, ms);
}

// ══════════════════════════════════════
// DROPDOWN HELPERS
// ══════════════════════════════════════
function fillSelect(sel, items, placeholder = 'Select...') {
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o); });
}

function fillRadios(container, name, values, required = false) {
  container.innerHTML = '';
  values.forEach(v => {
    container.innerHTML += `<label><input type="radio" name="${name}" value="${v}" ${required ? 'required' : ''}><span>${v}</span></label>`;
  });
}

function fillPills(container, name, values) {
  container.innerHTML = '';
  values.forEach(v => {
    container.innerHTML += `<label><input type="checkbox" name="${name}" value="${v}"><span>${v}</span></label>`;
  });
}

// ══════════════════════════════════════
// CASCADING DROPDOWNS: City → Locality → Society
// ══════════════════════════════════════
async function loadCities(citySelect) {
  try {
    const res = await fetch(`${API}/api/config/cities`);
    const cities = await res.json();
    fillSelect(citySelect, cities, 'Select City');
  } catch (e) {
    toast('Failed to load cities', 'err');
  }
}

async function loadLocalities(city, localitySelect, societySelect) {
  localitySelect.innerHTML = '<option value="">Loading...</option>';
  localitySelect.disabled = true;
  if (societySelect) {
    societySelect.innerHTML = '<option value="">Select locality first</option>';
    societySelect.disabled = true;
  }

  if (!city) {
    localitySelect.innerHTML = '<option value="">Select city first</option>';
    return;
  }

  try {
    const res = await fetch(`${API}/api/config/localities?city=${encodeURIComponent(city)}`);
    const localities = await res.json();
    fillSelect(localitySelect, localities, 'Select Locality');
    localitySelect.disabled = false;
  } catch (e) {
    toast('Failed to load localities', 'err');
  }
}

async function loadSocieties(city, locality, societySelect) {
  societySelect.innerHTML = '<option value="">Loading...</option>';
  societySelect.disabled = true;

  if (!city || !locality) {
    societySelect.innerHTML = '<option value="">Select locality first</option>';
    return;
  }

  try {
    const res = await fetch(`${API}/api/config/societies?city=${encodeURIComponent(city)}&locality=${encodeURIComponent(locality)}`);
    const societies = await res.json();
    fillSelect(societySelect, societies, 'Select Society');
    societySelect.disabled = false;

    // Auto-select if only one society
    if (societies.length === 1) {
      societySelect.value = societies[0];
    }
  } catch (e) {
    toast('Failed to load societies', 'err');
  }
}

// Wire up cascade: pass the 3 select elements
function setupCascade(cityEl, localityEl, societyEl) {
  cityEl.addEventListener('change', () => {
    loadLocalities(cityEl.value, localityEl, societyEl);
  });
  localityEl.addEventListener('change', () => {
    loadSocieties(cityEl.value, localityEl.value, societyEl);
  });
}

// ══════════════════════════════════════
// MULTI-SELECT / RADIO HELPERS
// ══════════════════════════════════════
function getCheckedJSON(name) {
  const checked = document.querySelectorAll(`input[name="${name}"]:checked`);
  return JSON.stringify(Array.from(checked).map(c => c.value));
}

function getRadio(name) {
  const c = document.querySelector(`input[name="${name}"]:checked`);
  return c ? c.value : '';
}

// ══════════════════════════════════════
// STEPPER (multi-page navigation)
// ══════════════════════════════════════
function makeStepper(total) {
  let cur = 1;

  function show(p) {
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    const page = document.getElementById(`p${p}`);
    if (page) page.classList.add('active');

    document.querySelectorAll('.step').forEach((s, i) => {
      s.classList.remove('active', 'done');
      if (i + 1 === p) s.classList.add('active');
      else if (i + 1 < p) s.classList.add('done');
    });

    document.querySelectorAll('.step-line').forEach((l, i) => {
      l.classList.toggle('done', i + 1 < p);
    });

    cur = p;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return {
    show,
    next() { if (cur < total) show(cur + 1); },
    prev() { if (cur > 1) show(cur - 1); },
    get current() { return cur; },
  };
}

// ══════════════════════════════════════
// SUBMIT WITH LOADING STATE
// ══════════════════════════════════════
async function submitBtn(btn, fn) {
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Submitting...';
  try { await fn(); }
  catch (e) { toast(e.message || 'Submission failed', 'err'); }
  finally { btn.disabled = false; btn.innerHTML = orig; }
}
