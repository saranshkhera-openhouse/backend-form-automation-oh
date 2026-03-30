// Deal Terms PDF (Form 4) - HTML template

function fmtDate(d){if(!d)return '—';const dt=new Date(d);const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return `${String(dt.getDate()).padStart(2,'0')} ${m[dt.getMonth()]} ${dt.getFullYear()}`}
function fmtAmt(v){if(!v||isNaN(v))return '—';const n=Number(v);if(n>=10000000)return '₹ '+(n/10000000).toFixed(2)+' Crores';if(n>=100000)return '₹ '+(n/100000).toFixed(2)+' Lakhs';return '₹ '+n.toLocaleString('en-IN')}
function fmtPG(v){if(!v||isNaN(v))return '—';const n=Number(v);if(n>=10000000){const x=Math.floor(n/10000)/1000;return '₹ '+x.toFixed(3)+' Crores'}if(n>=100000){const x=Math.floor(n/100)/1000;return '₹ '+x.toFixed(3)+' Lakhs'}return '₹ '+n.toLocaleString('en-IN')}
function fmtCurrency(v){if(!v||isNaN(v))return '—';return '₹ '+Number(v).toLocaleString('en-IN')}
function fmtLakhs(v){if(!v)return '—';const n=Number(v);if(n>=100)return '₹ '+(n/100).toFixed(2)+' Crores';return '₹ '+n+' Lakhs'}
function esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}
function pill(val,type){return val?`<span class="pill ${type}">${esc(val)}</span>`:'—'}
function fval(v,cls=''){if(!v||v==='null')return `<div class="f-value empty">—</div>`;return `<div class="f-value ${cls}">${esc(String(v))}</div>`}

function parseDocs(raw){
  if(!raw) return [];
  if(Array.isArray(raw)) return raw.map(s=>typeof s==='string'?s.trim():s);
  if(typeof raw==='string'){
    try{
      const parsed=JSON.parse(raw);
      if(Array.isArray(parsed)) return parsed.map(s=>typeof s==='string'?s.trim():s);
      return [];
    }catch(e){return []}
  }
  return [];
}

function generateReceiptHTML(p, mode='deal', baseUrl=''){
  const today=fmtDate(new Date());
  const rawOwner=p.owner_broker_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||'—';
  const ownerName=p.co_owner?rawOwner+' & '+p.co_owner:rawOwner;
  const firstName=p.first_name||rawOwner.split(' ')[0]||'Owner';
  const logoUrl=baseUrl?baseUrl+'/images/logo.png':'/images/logo.png';

  const allDocs=['Allotment Letter issued by the Builder','Possession Letter/Certificate by the Builder','Builder Buyer Agreement','Conveyance Deed/Sale Deed/Registry'];
  const selectedDocs=parseDocs(p.documents_available);
  const missingDocs=allDocs.filter(d=>!selectedDocs.includes(d));
  const availDocs=allDocs.filter(d=>selectedDocs.includes(d));

  const hasNEFT=mode==='deal'?!!p.deal_neft_reference:!!(p.bank_account_number&&p.neft_reference);
  const neftBank=mode==='deal'?(p.deal_bank_name||''):(p.bank_name||'');
  const neftRef=mode==='deal'?(p.deal_neft_reference||''):(p.neft_reference||'');
  const neftDate=mode==='deal'?p.deal_transfer_date:p.token_transfer_date;
  const hdDate=p.key_handover_date?fmtDate(p.key_handover_date):'';

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--ink:#1a1510;--muted:#7a6f63;--border:#ddd6cc;--bg:#faf8f5;--cream:#f4f0ea;--gold:#b8985a;--gold-light:#e8d9b5;--green:#2d5a3d;--green-light:#e8f2ec;--white:#fff;--red-light:#fdecea;--red:#b33a2e}
  body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ink);font-size:11.5px;line-height:1.4}
  
  /* Page Layout */
  .page-container { width: 100%; }
  .page-wrapper { 
    width: 210mm; 
    min-height: 296mm; 
    margin: 0 auto; 
    padding: 15mm; 
    background: white;
    display: flex;
    flex-direction: column;
    page-break-after: always;
  }
  
  .content-body { flex: 1; } /* Pushes footer to bottom */
  
  .header{display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;margin-bottom:12px;border-bottom:1.5px solid var(--border)}
  .brand-name{font-size:20px;font-weight:600;letter-spacing:.04em}
  .receipt-tag{font-size:9.5px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
  
  .greeting-strip{background:var(--ink);border-radius:8px;padding:16px 20px;margin-bottom:15px;display:flex;align-items:center;justify-content:space-between;gap:12px}
  .greeting-left .hi{font-size:19px;color:var(--white)}
  .greeting-left .sub{font-size:10.5px;color:rgba(255,255,255,.6);margin-top:3px}
  
  .section-label{font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;margin:18px 0 8px;display:flex;align-items:center;gap:8px}
  .section-label::after{content:'';flex:1;height:1px;background:var(--border)}
  
  .field-grid{display:grid;gap:8px;margin-bottom:8px}
  .field-grid.col2{grid-template-columns:1fr 1fr}
  .field-grid.col3{grid-template-columns:1fr 1fr 1fr}
  .field-grid.col4{grid-template-columns:1fr 1fr 1fr 1fr}
  
  .field{background:var(--white);border:1px solid var(--border);border-radius:5px;padding:10px 14px; display:flex; flex-direction:column; justify-content:center; min-height:45px}
  .field .f-label{font-size:8px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
  .field .f-value{font-size:11.5px;font-weight:500;color:var(--ink)}
  
  .token-strip{background:var(--green-light);border:1.5px solid #b8d9c4;border-radius:7px;padding:12px 16px;display:flex;align-items:center;gap:12px;margin-top:10px}
  .doc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .doc-item{background:var(--white);border:1px solid var(--border);border-radius:5px;padding:10px 12px;display:flex;align-items:center;gap:8px}
  
  .terms-wrap{background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:24px}
  .terms-list li{margin-bottom:12px; font-size:12px; line-height:1.6}

  .footer{margin-top:30px;padding-top:15px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-end}
  .footer-cin{font-size:9.5px;color:var(--muted);max-width:70%}
  .footer-note{font-size:8.5px;color:var(--muted);text-align:right;text-transform:uppercase}

  @media print {
    body { background: none; }
    .page-wrapper { margin: 0; border: none; height: 100vh; }
    .print-bar { display: none; }
  }
</style>
</head>
<body>
  <div class="print-bar" style="text-align:center; padding: 20px;"><button onclick="window.print()" style="padding: 10px 20px; cursor:pointer;">Print / Save as PDF</button></div>
  
  <div class="page-container">
    <div class="page-wrapper">
      <div class="content-body">
        <div class="header">
          <div class="brand"><img src="${logoUrl}" alt="Logo" style="height:36px"></div>
          <div class="header-right"><div class="receipt-tag">Token Payment Receipt</div><div class="receipt-date">Generated: ${today}</div></div>
        </div>

        <div class="greeting-strip">
          <div class="greeting-left"><div class="hi">Hello, <strong>${esc(firstName)}</strong></div><div class="sub">Here are the agreed deal terms for your property.</div></div>
          ${p.guaranteed_sale_price?`<div style="text-align:right"><div class="receipt-tag" style="color:var(--gold-light)">Guaranteed Price</div><div style="font-size:22px; color:white; font-weight:600">${fmtLakhs(p.guaranteed_sale_price)}</div></div>`:''}
        </div>

        <div class="section-label">Seller & Property Details</div>
        <div class="field-grid col2">
          <div class="field"><div class="f-label">Owner Name</div><div class="f-value">${esc(ownerName)}</div></div>
          <div class="field"><div class="f-label">Contact</div>${fval(p.contact_no)}</div>
        </div>
        <div class="field-grid col4">
          <div class="field"><div class="f-label">City</div>${fval(p.city)}</div>
          <div class="field"><div class="f-label">Society</div>${fval(p.society_name)}</div>
          <div class="field"><div class="f-label">Tower/Unit</div><div class="f-value">${esc(p.tower_no)} / ${esc(p.unit_no)}</div></div>
          <div class="field"><div class="f-label">Config</div>${fval(p.configuration)}</div>
        </div>

        <div class="section-label">Financial Terms</div>
        <div class="field-grid col2">
          <div class="field"><div class="f-label">Token Amount Paid</div><div class="f-value" style="font-size:16px; color:var(--green)">${fmtAmt(p.deal_token_amount||p.token_amount_requested)}</div></div>
          <div class="field"><div class="f-label">Registry Status</div><div class="f-value">${p.registry_status?pill(p.registry_status,'gold'):'—'}</div></div>
        </div>
        
        ${(p.initial_period||p.grace_period)?`
        <div class="field-grid col2">
          <div class="field"><div class="f-label">Initial Period</div><div class="f-value">${p.initial_period || '—'} Days</div></div>
          <div class="field"><div class="f-label">Grace Period</div><div class="f-value">${p.grace_period || '—'} Days</div></div>
        </div>`:''}

        <div class="section-label">Documents Verified</div>
        <div class="doc-grid">
          ${availDocs.slice(0,4).map(d=>`<div class="doc-item"><div style="color:var(--green)">✔</div>${esc(d.substring(0,30))}...</div>`).join('')}
        </div>

        <div class="section-label">Transaction Summary</div>
        ${hasNEFT?`
        <div class="token-strip">
          <div style="flex:1">
            <div style="font-weight:600; color:var(--green)">Bank Transfer Successful</div>
            <div style="font-size:10px; color:var(--muted)">Ref: ${esc(neftRef)} | ${esc(neftBank)}</div>
          </div>
          <div style="text-align:right">
            <div class="f-label">Date</div>
            <div style="font-weight:600">${fmtDate(neftDate)}</div>
          </div>
        </div>`:''}
      </div>

      <div class="footer">
        <div class="footer-cin"><strong>Avano Technologies Private Limited</strong><br>Unit No. 202, Silverton Tower, Sector 50, Gurugram 122018</div>
        <div class="footer-note">Page 1 of 2</div>
      </div>
    </div>

    <div class="page-wrapper">
      <div class="content-body">
        <div class="section-label">Detailed Terms & Conditions</div>
        <div class="terms-wrap">
          <ul class="terms-list">
            <li>Should any discrepancies arise during document verification, Openhouse reserves the right to withhold execution. The token will be refunded in full.</li>
            <li>Society NOC charges are the sole responsibility of the seller and must be settled during transfer.</li>
            <li>Openhouse will install a smart lock for digital access at no cost to facilitate property visits.</li>
            <li>All payments are subject to realization and verification of bank records.</li>
          </ul>
        </div>
      </div>
      <div class="footer">
        <div class="footer-cin"><strong>Avano Technologies Private Limited</strong><br>CIN: U68200HR2024PTC123116</div>
        <div class="footer-note">Page 2 of 2<br>www.openhouse.in</div>
      </div>
    </div>
  </div>
</body></html>`;
}

module.exports = { generateReceiptHTML };