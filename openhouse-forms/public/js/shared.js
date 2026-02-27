// ── Openhouse v4 — Shared Utilities ──
const API=window.location.origin;

// ══════ TOAST ══════
function toast(msg,type='ok',ms=3500){document.querySelectorAll('.toast').forEach(t=>t.remove());
  const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=msg;document.body.appendChild(el);
  setTimeout(()=>{el.style.transition='opacity .3s';el.style.opacity='0';setTimeout(()=>el.remove(),300)},ms)}

// ══════ SELECTS / RADIOS / PILLS ══════
function fillSelect(sel,items,ph='Select...'){sel.innerHTML=`<option value="">${ph}</option>`;items.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;sel.appendChild(o)})}
function fillNumSelect(sel,min,max,ph='Select'){sel.innerHTML=`<option value="">${ph}</option>`;for(let i=min;i<=max;i++){const o=document.createElement('option');o.value=i;o.textContent=i;sel.appendChild(o)}}
function fillRadios(c,name,vals,req=false){c.innerHTML='';vals.forEach(v=>{c.innerHTML+=`<label><input type="radio" name="${name}" value="${v}" ${req?'required':''}><span>${v}</span></label>`})}
function fillPills(c,name,vals){c.innerHTML='';vals.forEach(v=>{c.innerHTML+=`<label><input type="checkbox" name="${name}" value="${v}"><span>${v}</span></label>`})}
function getCheckedJSON(name){return JSON.stringify([...document.querySelectorAll(`input[name="${name}"]:checked`)].map(c=>c.value))}
function getRadio(name){const c=document.querySelector(`input[name="${name}"]:checked`);return c?c.value:''}

// ══════ SEARCHABLE DROPDOWN ══════
function makeSearchable(sel){
  const wrap=document.createElement('div');wrap.className='sdd';sel.parentNode.insertBefore(wrap,sel);sel.style.display='none';wrap.appendChild(sel);
  const inp=document.createElement('input');inp.type='text';inp.className='sdd-in';inp.placeholder=sel.options[0]?.text||'Search...';inp.autocomplete='off';wrap.appendChild(inp);
  const list=document.createElement('div');list.className='sdd-list';wrap.appendChild(list);
  let items=[],open=false;
  function refresh(){items=[];for(let i=1;i<sel.options.length;i++)items.push(sel.options[i].value)}
  function render(f=''){const q=f.toLowerCase();const m=q?items.filter(v=>v.toLowerCase().includes(q)):items;
    list.innerHTML='';if(!m.length){list.innerHTML='<div class="sdd-empty">No results</div>';return}
    m.forEach(v=>{const d=document.createElement('div');d.className='sdd-item';d.textContent=v;d.addEventListener('mousedown',e=>{e.preventDefault();pick(v)});list.appendChild(d)})}
  function pick(v){sel.value=v;inp.value=v;close();sel.dispatchEvent(new Event('change',{bubbles:true}))}
  function show(){if(sel.disabled)return;refresh();render(inp.value);list.style.display='block';open=true}
  function close(){list.style.display='none';open=false}
  inp.addEventListener('focus',show);inp.addEventListener('input',()=>{if(!open)show();render(inp.value)});
  inp.addEventListener('blur',()=>setTimeout(close,150));
  new MutationObserver(()=>{inp.value='';sel.value='';inp.placeholder=sel.options[0]?.text||'Search...';inp.disabled=sel.disabled}).observe(sel,{childList:true,attributes:true});
  return{pick,refresh};
}

// ══════ MULTI-SELECT DROPDOWN ══════
function makeMultiSelect(container,name,options){
  const selected=new Set();
  container.innerHTML=`<div class="msel"><div class="msel-trigger" tabindex="0"><span class="msel-ph">Select documents...</span></div>
    <div class="msel-drop"><input type="text" class="msel-search" placeholder="Search..."><div class="msel-opts"></div></div></div>`;
  const trigger=container.querySelector('.msel-trigger'),drop=container.querySelector('.msel-drop'),optsEl=container.querySelector('.msel-opts'),search=container.querySelector('.msel-search');
  function renderOpts(q=''){optsEl.innerHTML='';options.filter(o=>o.toLowerCase().includes(q.toLowerCase())).forEach(o=>{
    optsEl.innerHTML+=`<label class="msel-opt"><input type="checkbox" value="${o}" ${selected.has(o)?'checked':''}><span>${o}</span></label>`});
    optsEl.querySelectorAll('input').forEach(cb=>{cb.addEventListener('change',()=>{if(cb.checked)selected.add(cb.value);else selected.delete(cb.value);renderTrigger()})});
  }
  function renderTrigger(){const ph=container.querySelector('.msel-ph');if(selected.size===0){trigger.innerHTML='<span class="msel-ph">Select documents...</span>';return}
    trigger.innerHTML='';selected.forEach(v=>{const t=document.createElement('span');t.className='msel-tag';t.innerHTML=`${v.length>25?v.substring(0,25)+'...':v} <span class="x">×</span>`;
      t.querySelector('.x').addEventListener('click',e=>{e.stopPropagation();selected.delete(v);renderTrigger();renderOpts(search.value)});trigger.appendChild(t)})}
  trigger.addEventListener('click',()=>{drop.classList.toggle('open');if(drop.classList.contains('open')){search.focus();renderOpts(search.value)}});
  search.addEventListener('input',()=>renderOpts(search.value));
  document.addEventListener('click',e=>{if(!container.contains(e.target))drop.classList.remove('open')});
  renderOpts();
  return{getSelected:()=>JSON.stringify([...selected]),setSelected(arr){arr.forEach(v=>{if(options.includes(v))selected.add(v)});renderTrigger();renderOpts()}};
}

// ══════ CASCADE ══════
async function loadCities(sel){try{const r=await fetch(`${API}/api/config/cities`);fillSelect(sel,await r.json(),'Select City')}catch(e){toast('Failed to load cities','err')}}
async function loadSocieties(city,socSel,locSel){socSel.innerHTML='<option value="">Loading...</option>';socSel.disabled=true;if(locSel){locSel.innerHTML='<option value="">Select society first</option>';locSel.disabled=true}
  if(!city){socSel.innerHTML='<option value="">Select city first</option>';return}
  try{const r=await fetch(`${API}/api/config/societies?city=${encodeURIComponent(city)}`);fillSelect(socSel,await r.json(),'Search society...');socSel.disabled=false}catch(e){toast('Failed','err')}}
async function loadLocalities(city,soc,locSel){locSel.innerHTML='<option value="">Loading...</option>';locSel.disabled=true;
  if(!city||!soc){locSel.innerHTML='<option value="">Select society first</option>';return}
  try{const r=await fetch(`${API}/api/config/localities?city=${encodeURIComponent(city)}&society=${encodeURIComponent(soc)}`);const l=await r.json();fillSelect(locSel,l,'Select Locality');locSel.disabled=false;if(l.length===1)locSel.value=l[0]}catch(e){toast('Failed','err')}}
function setupCascade(cityEl,socEl,locEl){cityEl.addEventListener('change',()=>loadSocieties(cityEl.value,socEl,locEl));socEl.addEventListener('change',()=>loadLocalities(cityEl.value,socEl.value,locEl))}

// ══════ STEPPER + PROGRESS ══════
function makeStepper(total,progEl){
  let cur=1;
  function update(p){document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));
    const pg=document.getElementById(`p${p}`);if(pg)pg.classList.add('active');
    document.querySelectorAll('.step').forEach((s,i)=>{s.classList.remove('active','done');if(i+1===p)s.classList.add('active');else if(i+1<p)s.classList.add('done')});
    document.querySelectorAll('.step-line').forEach((l,i)=>l.classList.toggle('done',i+1<p));
    if(progEl){const pct=Math.round(((p-1)/(total-1))*100);progEl.querySelector('.prog-fill').style.width=pct+'%';progEl.querySelector('.prog-lbl').textContent=pct+'% complete'}
    cur=p;window.scrollTo({top:0,behavior:'smooth'})}
  return{show(p){update(p)},next(){if(cur<total)update(cur+1);return cur},prev(){if(cur>1)update(cur-1)},get current(){return cur}};
}

// ══════ VALIDATION ══════
function validatePage(pid){const pg=document.getElementById(pid);if(!pg)return true;let ok=true;pg.querySelectorAll('.fg.invalid').forEach(f=>f.classList.remove('invalid'));
  pg.querySelectorAll('[required]').forEach(el=>{const fg=el.closest('.fg');if(!fg)return;
    if(el.type==='radio'){if(!pg.querySelector(`input[name="${el.name}"]:checked`)&&fg.querySelector(`input[name="${el.name}"]`)===el){fg.classList.add('invalid');ok=false}}
    else if(!el.value.trim()){fg.classList.add('invalid');ok=false}});
  if(!ok)toast('Fill all required fields','err');return ok}
function validateForm(fid){const form=document.getElementById(fid);if(!form)return{valid:true,missing:[]};const miss=[];
  form.querySelectorAll('.fg.invalid').forEach(f=>f.classList.remove('invalid'));
  form.querySelectorAll('[required]').forEach(el=>{const fg=el.closest('.fg');if(!fg)return;
    if(el.type==='radio'){if(!form.querySelector(`input[name="${el.name}"]:checked`)){fg.classList.add('invalid');const l=fg.querySelector('label');if(l)miss.push(l.textContent.replace('*','').trim())}}
    else if(!el.value.trim()){fg.classList.add('invalid');const l=fg.querySelector('label');if(l)miss.push(l.textContent.replace('*','').trim())}});
  return{valid:miss.length===0,missing:miss}}

// ══════ IMAGE UPLOAD (Cloudinary) ══════
function initImageUpload(zoneId,previewsId,max=10){
  const zone=document.getElementById(zoneId),previews=document.getElementById(previewsId),urls=[];let cfg=null;
  fetch(`${API}/api/config/cloudinary`).then(r=>r.json()).then(c=>cfg=c).catch(()=>{});
  const fi=document.createElement('input');fi.type='file';fi.accept='image/*';fi.multiple=true;fi.setAttribute('capture','environment');
  zone.addEventListener('click',()=>fi.click());
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover')});
  zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragover');handleFiles(e.dataTransfer.files)});
  fi.addEventListener('change',()=>{handleFiles(fi.files);fi.value=''});
  async function handleFiles(files){if(!cfg||!cfg.cloudName||!cfg.uploadPreset){toast('Cloudinary not configured','warn');return}for(const f of files){if(urls.length>=max){toast(`Max ${max} images`,'warn');break}await uploadOne(f)}}
  async function uploadOne(file){const ld=document.createElement('div');ld.className='img-uploading';ld.innerHTML='<span class="spin"></span> Uploading...';previews.appendChild(ld);
    try{const fd=new FormData();fd.append('file',file);fd.append('upload_preset',cfg.uploadPreset);
      const r=await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,{method:'POST',body:fd});if(!r.ok)throw new Error();
      const d=await r.json();urls.push(d.secure_url);addThumb(d.secure_url)}catch(e){toast('Upload failed','err')}finally{ld.remove()}}
  function addThumb(url){const d=document.createElement('div');d.className='img-thumb';
    d.innerHTML=`<img src="${url}"><button type="button" class="rm">✕</button>`;
    d.querySelector('.rm').addEventListener('click',()=>{const i=urls.indexOf(url);if(i>-1)urls.splice(i,1);d.remove()});previews.appendChild(d)}
  return{getUrls:()=>JSON.stringify(urls),setUrls(arr){arr.forEach(u=>{urls.push(u);addThumb(u)})}};
}

// ══════ SINGLE IMAGE UPLOAD (compass, cheque) ══════
function initSingleUpload(btnId,previewId,urlInputId){
  let cfg=null,currentUrl='';
  fetch(`${API}/api/config/cloudinary`).then(r=>r.json()).then(c=>cfg=c).catch(()=>{});
  const btn=document.getElementById(btnId),prev=document.getElementById(previewId),urlInp=document.getElementById(urlInputId);
  const fi=document.createElement('input');fi.type='file';fi.accept='image/*';fi.setAttribute('capture','environment');
  btn.addEventListener('click',()=>fi.click());
  fi.addEventListener('change',async()=>{if(!fi.files.length)return;if(!cfg||!cfg.cloudName){toast('Cloudinary not configured','warn');return}
    btn.textContent='Uploading...';btn.disabled=true;
    try{const fd=new FormData();fd.append('file',fi.files[0]);fd.append('upload_preset',cfg.uploadPreset);
      const r=await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,{method:'POST',body:fd});if(!r.ok)throw new Error();
      const d=await r.json();currentUrl=d.secure_url;urlInp.value=currentUrl;
      prev.querySelector('img').src=currentUrl;prev.classList.add('show');toast('Uploaded!','ok')}
    catch(e){toast('Upload failed','err')}finally{btn.textContent='📷 Upload';btn.disabled=false;fi.value=''}});
  return{getUrl:()=>currentUrl,setUrl(u){if(u){currentUrl=u;urlInp.value=u;prev.querySelector('img').src=u;prev.classList.add('show')}}};
}

// ══════ CHEQUE OCR ══════
async function ocrCheque(imageUrl){
  try{const r=await fetch(`${API}/api/ocr/cheque`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageUrl})});
    const d=await r.json();if(!r.ok)throw new Error(d.error);return d}catch(e){toast('OCR failed: '+e.message,'err');return{extracted:false,bank_name:'',account_number:'',ifsc_code:''}}
}

// ══════ DOUBLE-TAP EDIT ══════
function enableDoubleTapEdit(container){let lastTap=0;
  container.querySelectorAll('.pre').forEach(inp=>{
    inp.addEventListener('touchend',()=>{const now=Date.now();if(now-lastTap<300){makeEditable(inp)}lastTap=now});
    inp.addEventListener('dblclick',()=>makeEditable(inp))});
  function makeEditable(inp){inp.readOnly=false;inp.classList.remove('pre');inp.classList.add('editable-field','editing');inp.focus();
    inp.addEventListener('blur',()=>{inp.readOnly=true;inp.classList.add('pre');inp.classList.remove('editing')},{once:true})}
}

// ══════ SUBMIT BUTTON ══════
async function submitBtn(btn,fn){const o=btn.innerHTML;btn.disabled=true;btn.innerHTML='<span class="spin"></span> ...';try{await fn()}catch(e){toast(e.message||'Failed','err')}finally{btn.disabled=false;btn.innerHTML=o}}

// ══════ N/A TOGGLE ══════
function toggleNA(fieldId,label='N/A'){const inp=document.getElementById(fieldId),cb=document.getElementById(fieldId+'_na');
  if(cb.checked){inp.value='';inp.disabled=true;inp.placeholder=label;inp.dataset.na='1'}else{inp.disabled=false;inp.placeholder='₹';inp.dataset.na=''}}
