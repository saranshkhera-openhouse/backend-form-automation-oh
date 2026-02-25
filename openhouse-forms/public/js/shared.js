// ── Openhouse Forms: Shared Utilities ──

const API = window.location.origin;

// ══════════════════════════════════════
// TOAST
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
// SEARCHABLE DROPDOWN
// ══════════════════════════════════════
// Wraps a <select> to show a filterable list on mobile/desktop.
// Usage: makeSearchable(selectElement)

function makeSearchable(sel) {
  // Create wrapper
  const wrap = document.createElement('div');
  wrap.className = 'search-dd';
  sel.parentNode.insertBefore(wrap, sel);

  // Hidden select (keeps form value)
  sel.style.display = 'none';
  wrap.appendChild(sel);

  // Visible input
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.placeholder = sel.options[0]?.text || 'Search...';
  inp.className = 'search-dd-input';
  inp.autocomplete = 'off';
  wrap.appendChild(inp);

  // Dropdown list
  const list = document.createElement('div');
  list.className = 'search-dd-list';
  wrap.appendChild(list);

  let items = [];
  let open = false;

  function refresh() {
    items = [];
    for (let i = 1; i < sel.options.length; i++) {
      items.push(sel.options[i].value);
    }
  }

  function render(filter = '') {
    const f = filter.toLowerCase();
    const matches = f ? items.filter(v => v.toLowerCase().includes(f)) : items;
    list.innerHTML = '';
    if (matches.length === 0) {
      list.innerHTML = '<div class="search-dd-empty">No results</div>';
    } else {
      matches.forEach(v => {
        const div = document.createElement('div');
        div.className = 'search-dd-item';
        div.textContent = v;
        div.addEventListener('mousedown', (e) => {
          e.preventDefault(); // prevent blur before click
          select(v);
        });
        list.appendChild(div);
      });
    }
  }

  function select(v) {
    sel.value = v;
    inp.value = v;
    close();
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function show() {
    if (sel.disabled) return;
    refresh();
    render(inp.value);
    list.style.display = 'block';
    open = true;
  }

  function close() {
    list.style.display = 'none';
    open = false;
  }

  inp.addEventListener('focus', show);
  inp.addEventListener('input', () => {
    if (!open) show();
    render(inp.value);
  });
  inp.addEventListener('blur', () => setTimeout(close, 150));

  // Sync when select is updated externally (cascade)
  const observer = new MutationObserver(() => {
    inp.value = '';
    sel.value = '';
    inp.placeholder = sel.options[0]?.text || 'Search...';
    inp.disabled = sel.disabled;
  });
  observer.observe(sel, { childList: true, attributes: true });

  // If select gets disabled, disable input too
  Object.defineProperty(inp, '_syncDisabled', {
    get: () => sel.disabled,
  });

  return { select, refresh };
}

// ══════════════════════════════════════
// CASCADING: City → Society → Locality
// ══════════════════════════════════════
async function loadCities(citySelect) {
  try {
    const res = await fetch(`${API}/api/config/cities`);
    const cities = await res.json();
    fillSelect(citySelect, cities, 'Select City');
  } catch (e) { toast('Failed to load cities', 'err'); }
}

async function loadSocieties(city, societySelect, localitySelect) {
  societySelect.innerHTML = '<option value="">Loading...</option>';
  societySelect.disabled = true;
  if (localitySelect) {
    localitySelect.innerHTML = '<option value="">Select society first</option>';
    localitySelect.disabled = true;
  }
  if (!city) {
    societySelect.innerHTML = '<option value="">Select city first</option>';
    return;
  }
  try {
    const res = await fetch(`${API}/api/config/societies?city=${encodeURIComponent(city)}`);
    const societies = await res.json();
    fillSelect(societySelect, societies, 'Search society...');
    societySelect.disabled = false;
  } catch (e) { toast('Failed to load societies', 'err'); }
}

async function loadLocalities(city, society, localitySelect) {
  localitySelect.innerHTML = '<option value="">Loading...</option>';
  localitySelect.disabled = true;
  if (!city || !society) {
    localitySelect.innerHTML = '<option value="">Select society first</option>';
    return;
  }
  try {
    const res = await fetch(`${API}/api/config/localities?city=${encodeURIComponent(city)}&society=${encodeURIComponent(society)}`);
    const localities = await res.json();
    fillSelect(localitySelect, localities, 'Select Locality');
    localitySelect.disabled = false;
    if (localities.length === 1) localitySelect.value = localities[0];
  } catch (e) { toast('Failed to load localities', 'err'); }
}

function setupCascade(cityEl, societyEl, localityEl) {
  cityEl.addEventListener('change', () => {
    loadSocieties(cityEl.value, societyEl, localityEl);
  });
  societyEl.addEventListener('change', () => {
    loadLocalities(cityEl.value, societyEl.value, localityEl);
  });
}

// ══════════════════════════════════════
// MULTI-SELECT / RADIO
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
// STEPPER
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
// SUBMIT WITH LOADING
// ══════════════════════════════════════
async function submitBtn(btn, fn) {
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Submitting...';
  try { await fn(); }
  catch (e) { toast(e.message || 'Submission failed', 'err'); }
  finally { btn.disabled = false; btn.innerHTML = orig; }
}
