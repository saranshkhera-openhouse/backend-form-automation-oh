// ── Openhouse Forms v3 — Shared Utilities ──
const API = window.location.origin;

// ══════════════════════ TOAST ══════════════════════
function toast(msg, type='ok', ms=4000) {
  document.querySelectorAll('.toast').forEach(t=>t.remove());
  const el=document.createElement('div'); el.className=`toast ${type}`; el.textContent=msg;
  document.body.appendChild(el);
  setTimeout(()=>{el.style.transition='opacity .3s';el.style.opacity='0';setTimeout(()=>el.remove(),300)},ms);
}

// ══════════════════════ SELECTS / RADIOS / PILLS ══════════════════════
function fillSelect(sel, items, ph='Select...') {
  sel.innerHTML=`<option value="">${ph}</option>`;
  items.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;sel.appendChild(o)});
}
function fillRadios(c, name, vals, req=false) {
  c.innerHTML=''; vals.forEach(v=>{c.innerHTML+=`<label><input type="radio" name="${name}" value="${v}" ${req?'required':''}><span>${v}</span></label>`});
}
function fillPills(c, name, vals) {
  c.innerHTML=''; vals.forEach(v=>{c.innerHTML+=`<label><input type="checkbox" name="${name}" value="${v}"><span>${v}</span></label>`});
}
function getCheckedJSON(name) { return JSON.stringify([...document.querySelectorAll(`input[name="${name}"]:checked`)].map(c=>c.value)); }
function getRadio(name) { const c=document.querySelector(`input[name="${name}"]:checked`); return c?c.value:''; }

// ══════════════════════ SEARCHABLE DROPDOWN ══════════════════════
function makeSearchable(sel) {
  const wrap=document.createElement('div'); wrap.className='search-dd';
  sel.parentNode.insertBefore(wrap,sel); sel.style.display='none'; wrap.appendChild(sel);
  const inp=document.createElement('input'); inp.type='text'; inp.className='search-dd-input';
  inp.placeholder=sel.options[0]?.text||'Search...'; inp.autocomplete='off'; wrap.appendChild(inp);
  const list=document.createElement('div'); list.className='search-dd-list'; wrap.appendChild(list);
  let items=[], open=false;
  function refresh(){items=[];for(let i=1;i<sel.options.length;i++)items.push(sel.options[i].value)}
  function render(f=''){const q=f.toLowerCase();const m=q?items.filter(v=>v.toLowerCase().includes(q)):items;
    list.innerHTML='';if(!m.length){list.innerHTML='<div class="search-dd-empty">No results</div>';return}
    m.forEach(v=>{const d=document.createElement('div');d.className='search-dd-item';d.textContent=v;
      d.addEventListener('mousedown',e=>{e.preventDefault();pick(v)});list.appendChild(d)})}
  function pick(v){sel.value=v;inp.value=v;close();sel.dispatchEvent(new Event('change',{bubbles:true}))}
  function show(){if(sel.disabled)return;refresh();render(inp.value);list.style.display='block';open=true}
  function close(){list.style.display='none';open=false}
  inp.addEventListener('focus',show);
  inp.addEventListener('input',()=>{if(!open)show();render(inp.value)});
  inp.addEventListener('blur',()=>setTimeout(close,150));
  new MutationObserver(()=>{inp.value='';sel.value='';inp.placeholder=sel.options[0]?.text||'Search...';inp.disabled=sel.disabled}).observe(sel,{childList:true,attributes:true});
  return {pick,refresh};
}

// ══════════════════════ CASCADE: City → Society → Locality ══════════════════════
async function loadCities(sel){try{const r=await fetch(`${API}/api/config/cities`);fillSelect(sel,await r.json(),'Select City')}catch(e){toast('Failed to load cities','err')}}
async function loadSocieties(city,socSel,locSel){socSel.innerHTML='<option value="">Loading...</option>';socSel.disabled=true;if(locSel){locSel.innerHTML='<option value="">Select society first</option>';locSel.disabled=true}
  if(!city){socSel.innerHTML='<option value="">Select city first</option>';return}
  try{const r=await fetch(`${API}/api/config/societies?city=${encodeURIComponent(city)}`);fillSelect(socSel,await r.json(),'Search society...');socSel.disabled=false}catch(e){toast('Failed','err')}}
async function loadLocalities(city,soc,locSel){locSel.innerHTML='<option value="">Loading...</option>';locSel.disabled=true;
  if(!city||!soc){locSel.innerHTML='<option value="">Select society first</option>';return}
  try{const r=await fetch(`${API}/api/config/localities?city=${encodeURIComponent(city)}&society=${encodeURIComponent(soc)}`);const l=await r.json();fillSelect(locSel,l,'Select Locality');locSel.disabled=false;if(l.length===1)locSel.value=l[0]}catch(e){toast('Failed','err')}}
function setupCascade(cityEl,socEl,locEl){
  cityEl.addEventListener('change',()=>loadSocieties(cityEl.value,socEl,locEl));
  socEl.addEventListener('change',()=>loadLocalities(cityEl.value,socEl.value,locEl));
}

// ══════════════════════ STEPPER + PROGRESS ══════════════════════
function makeStepper(total, progressEl) {
  let cur=1;
  function update(p){
    document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));
    const pg=document.getElementById(`p${p}`);if(pg)pg.classList.add('active');
    document.querySelectorAll('.step').forEach((s,i)=>{s.classList.remove('active','done');if(i+1===p)s.classList.add('active');else if(i+1<p)s.classList.add('done')});
    document.querySelectorAll('.step-line').forEach((l,i)=>l.classList.toggle('done',i+1<p));
    if(progressEl){const pct=Math.round(((p-1)/(total-1))*100);progressEl.querySelector('.progress-fill').style.width=pct+'%';progressEl.querySelector('.progress-label').textContent=pct+'% complete'}
    cur=p;window.scrollTo({top:0,behavior:'smooth'});
  }
  return {
    show(p){update(p)},
    next(){if(cur<total)update(cur+1);return cur},
    prev(){if(cur>1)update(cur-1)},
    get current(){return cur},
  };
}

// ══════════════════════ VALIDATION ══════════════════════
function validatePage(pageId) {
  const page = document.getElementById(pageId);
  if (!page) return true;
  let valid = true;
  // Clear previous
  page.querySelectorAll('.fg.invalid').forEach(fg => fg.classList.remove('invalid'));
  // Check required inputs/selects
  page.querySelectorAll('[required]').forEach(el => {
    const fg = el.closest('.fg');
    if (!fg) return;
    let empty = false;
    if (el.type === 'radio') {
      // Check if any radio in this group is checked
      const name = el.name;
      if (!page.querySelector(`input[name="${name}"]:checked`)) empty = true;
      // Only flag once per group
      if (empty && fg.querySelector(`input[name="${name}"]`) === el) {
        fg.classList.add('invalid');
        valid = false;
      }
    } else if (!el.value.trim()) {
      fg.classList.add('invalid');
      valid = false;
    }
  });
  if (!valid) toast('Please fill all required fields on this page', 'err');
  return valid;
}

function validateForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return { valid: true, missing: [] };
  const missing = [];
  form.querySelectorAll('.fg.invalid').forEach(fg => fg.classList.remove('invalid'));
  form.querySelectorAll('[required]').forEach(el => {
    const fg = el.closest('.fg');
    if (!fg) return;
    if (el.type === 'radio') {
      if (!form.querySelector(`input[name="${el.name}"]:checked`)) {
        fg.classList.add('invalid');
        const lbl = fg.querySelector('label');
        if (lbl) missing.push(lbl.textContent.replace('*','').trim());
      }
    } else if (!el.value.trim()) {
      fg.classList.add('invalid');
      const lbl = fg.querySelector('label');
      if (lbl) missing.push(lbl.textContent.replace('*','').trim());
    }
  });
  return { valid: missing.length === 0, missing };
}

// ══════════════════════ IMAGE UPLOAD (Cloudinary) ══════════════════════
function initImageUpload(zoneId, previewsId, maxImages=10) {
  const zone=document.getElementById(zoneId);
  const previews=document.getElementById(previewsId);
  const urls=[];
  let cloudCfg=null;

  // Load cloudinary config
  fetch(`${API}/api/config/cloudinary`).then(r=>r.json()).then(c=>cloudCfg=c).catch(()=>{});

  // Hidden file input
  const fileInp=document.createElement('input');
  fileInp.type='file'; fileInp.accept='image/*'; fileInp.multiple=true;
  fileInp.setAttribute('capture','environment');

  zone.addEventListener('click',()=>fileInp.click());
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover')});
  zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragover');handleFiles(e.dataTransfer.files)});
  fileInp.addEventListener('change',()=>{handleFiles(fileInp.files);fileInp.value=''});

  async function handleFiles(files) {
    if(!cloudCfg||!cloudCfg.cloudName||!cloudCfg.uploadPreset){toast('Cloudinary not configured. Images stored locally.','warn');return}
    for(const file of files){
      if(urls.length>=maxImages){toast(`Max ${maxImages} images`,'warn');break}
      await uploadOne(file);
    }
  }

  async function uploadOne(file) {
    const loader=document.createElement('div');loader.className='img-uploading';
    loader.innerHTML='<span class="spin"></span> Uploading...';previews.appendChild(loader);
    try{
      const fd=new FormData();fd.append('file',file);fd.append('upload_preset',cloudCfg.uploadPreset);
      const r=await fetch(`https://api.cloudinary.com/v1_1/${cloudCfg.cloudName}/image/upload`,{method:'POST',body:fd});
      if(!r.ok)throw new Error('Upload failed');
      const data=await r.json();
      urls.push(data.secure_url);
      addThumb(data.secure_url);
    }catch(e){toast('Image upload failed','err')}
    finally{loader.remove()}
  }

  function addThumb(url) {
    const div=document.createElement('div');div.className='img-thumb';
    div.innerHTML=`<img src="${url}" alt=""><button type="button" class="remove" onclick="this.closest('.img-thumb').remove()">✕</button>`;
    div.querySelector('.remove').addEventListener('click',()=>{const i=urls.indexOf(url);if(i>-1)urls.splice(i,1)});
    previews.appendChild(div);
  }

  return { getUrls:()=>JSON.stringify(urls), setUrls(arr){arr.forEach(u=>{urls.push(u);addThumb(u)})} };
}

// ══════════════════════ DOUBLE-TAP EDIT ══════════════════════
function enableDoubleTapEdit(container) {
  let lastTap=0;
  container.querySelectorAll('.pre').forEach(inp=>{
    inp.addEventListener('touchend',e=>{
      const now=Date.now();
      if(now-lastTap<300){
        inp.readOnly=false;inp.classList.remove('pre');inp.classList.add('editable-field','editing');
        inp.focus();
        inp.addEventListener('blur',()=>{inp.readOnly=true;inp.classList.add('pre');inp.classList.remove('editing')},{once:true});
      }
      lastTap=now;
    });
    // Desktop: double-click
    inp.addEventListener('dblclick',()=>{
      inp.readOnly=false;inp.classList.remove('pre');inp.classList.add('editable-field','editing');inp.focus();
      inp.addEventListener('blur',()=>{inp.readOnly=true;inp.classList.add('pre');inp.classList.remove('editing')},{once:true});
    });
  });
}

// ══════════════════════ SUBMIT BUTTON ══════════════════════
async function submitBtn(btn,fn){const o=btn.innerHTML;btn.disabled=true;btn.innerHTML='<span class="spin"></span> Submitting...';try{await fn()}catch(e){toast(e.message||'Failed','err')}finally{btn.disabled=false;btn.innerHTML=o}}

// ══════════════════════ N/A TOGGLE ══════════════════════
function toggleNA(fieldId) {
  const inp=document.getElementById(fieldId), cb=document.getElementById(fieldId+'_na');
  if(cb.checked){inp.value='';inp.disabled=true;inp.placeholder='N/A';inp.dataset.na='1'}
  else{inp.disabled=false;inp.placeholder='e.g. 25000';inp.dataset.na=''}
}
