// Generates Invoice HTML for Pending Security Deposit (Form 5)

function fmtDate(d){if(!d)return '—';const dt=new Date(d);const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return `${String(dt.getDate()).padStart(2,'0')} ${m[dt.getMonth()]} ${dt.getFullYear()}`}
function fmtCur(v){if(!v)return '—';return '₹ '+Number(v).toLocaleString('en-IN')}
function esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'):''}

function generateInvoiceHTML(p){
  const today=fmtDate(new Date());
  const ownerName=p.owner_broker_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||'—';
  const tokenAmt=Number(p.deal_token_amount||0);
  const remainAmt=Number(p.remaining_amount||0);
  const total=tokenAmt+remainAmt;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice — ${esc(p.uid)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--ink:#1a1510;--muted:#7a6f63;--border:#ddd6cc;--bg:#faf8f5;--cream:#f4f0ea;--gold:#b8985a;--gold-light:#e8d9b5;--green:#2d5a3d;--green-light:#e8f2ec;--white:#fff}
  body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ink);padding:24px 20px 40px;font-size:12px}
  .page{max-width:680px;margin:0 auto}
  .print-bar{text-align:center;margin-bottom:16px}
  .print-bar button{font-family:'DM Sans',sans-serif;padding:8px 24px;border:1.5px solid var(--border);border-radius:8px;background:var(--white);cursor:pointer;font-size:12px;font-weight:500}

  /* Header */
  .inv-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;margin-bottom:14px;border-bottom:2px solid var(--ink)}
  .inv-brand{display:flex;align-items:center;gap:10px}
  .inv-logo{width:36px;height:36px;background:var(--ink);border-radius:8px;display:grid;place-items:center}
  .inv-logo svg{width:18px;height:18px;fill:var(--gold)}
  .inv-co{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:500}
  .inv-addr{font-size:10px;color:var(--muted);margin-top:3px;line-height:1.5;max-width:300px}
  .inv-title-block{text-align:right}
  .inv-title{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:var(--ink);letter-spacing:.02em}
  .inv-meta{font-size:10px;color:var(--muted);margin-top:4px;line-height:1.8}
  .inv-meta strong{color:var(--ink);font-weight:600}

  /* Parties */
  .inv-parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:14px 0;padding:14px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
  .inv-party-label{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:500;margin-bottom:6px}
  .inv-party-name{font-size:14px;font-weight:600;margin-bottom:2px}
  .inv-party-detail{font-size:11px;color:var(--muted);line-height:1.6}

  /* Table */
  .inv-table{width:100%;border-collapse:collapse;margin:14px 0}
  .inv-table thead{background:var(--ink)}
  .inv-table th{color:var(--white);font-size:9px;letter-spacing:.1em;text-transform:uppercase;font-weight:500;padding:10px 12px;text-align:left}
  .inv-table th:last-child{text-align:right}
  .inv-table td{padding:10px 12px;font-size:12px;border-bottom:1px solid var(--border);vertical-align:top}
  .inv-table td:last-child{text-align:right;font-weight:600;font-family:'Cormorant Garamond',serif;font-size:15px}
  .inv-table tr:nth-child(even){background:#faf8f5}
  .inv-table .mono{font-family:'Courier New',monospace;font-size:10px;color:var(--muted)}

  /* Totals */
  .inv-totals{display:flex;justify-content:flex-end;margin-top:6px}
  .inv-totals-box{width:280px}
  .inv-totals-row{display:flex;justify-content:space-between;padding:6px 0;font-size:12px}
  .inv-totals-row.total{border-top:2px solid var(--ink);padding-top:10px;margin-top:6px}
  .inv-totals-row.total .tl{font-size:13px;font-weight:700}
  .inv-totals-row.total .tv{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600}
  .tl{color:var(--muted);font-weight:500}.tv{font-weight:600}

  /* Bank Details */
  .inv-bank{background:var(--cream);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-top:14px}
  .inv-bank-title{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:500;margin-bottom:8px}
  .inv-bank-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
  .inv-bank-item .bl{font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:2px}
  .inv-bank-item .bv{font-size:12px;font-weight:500}
  .inv-bank-item .bv.mono{font-family:'Courier New',monospace;font-size:11px;letter-spacing:.04em}

  /* Footer */
  .inv-footer{margin-top:20px;padding-top:12px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-end}
  .inv-footer-left{font-size:9.5px;color:var(--muted);line-height:1.6}
  .inv-footer-right{text-align:right;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}

  /* Status pill */
  .inv-status{display:inline-block;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:600;background:var(--green-light);color:var(--green)}

  @media print{
    body{background:white;padding:12px 16px 20px}
    .page{max-width:100%}
    .print-bar{display:none!important}
    .inv-table thead,.inv-bank,.inv-status{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{margin:0.5cm 0.8cm;size:A4}
  }
</style>
</head>
<body>
<div class="page">
  <div class="print-bar"><button onclick="window.print()">Print / Save as PDF</button></div>

  <!-- Header -->
  <div class="inv-header">
    <div>
      <div class="inv-brand">
        <div class="inv-logo"><svg viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V21H3V9.5z"/></svg></div>
        <span class="inv-co">Openhouse</span>
      </div>
      <div class="inv-addr">Avano Technologies Private Limited<br>VentureX, Unit No. 202 &amp; 202A, Silverton Tower,<br>Sector 50, Golf Course Extension Road, Gurugram 122018</div>
    </div>
    <div class="inv-title-block">
      <div class="inv-title">INVOICE</div>
      <div class="inv-meta">
        <strong>Date:</strong> ${today}<br>
        <strong>Invoice No.:</strong> INV-${esc(p.uid)}<br>
        <strong>UID:</strong> ${esc(p.uid)}
      </div>
    </div>
  </div>

  <!-- Parties -->
  <div class="inv-parties">
    <div>
      <div class="inv-party-label">Billed To</div>
      <div class="inv-party-name">${esc(ownerName)}</div>
      <div class="inv-party-detail">
        ${esc(p.contact_no||'')}<br>
        ${esc(p.society_name||'')}${p.tower_no?', Tower '+esc(p.tower_no):''}${p.unit_no?', Unit '+esc(p.unit_no):''}<br>
        ${esc(p.city||'')}
      </div>
    </div>
    <div>
      <div class="inv-party-label">Property</div>
      <div class="inv-party-name">${esc(p.society_name||'—')}</div>
      <div class="inv-party-detail">
        ${p.configuration?esc(p.configuration):''} ${p.area_sqft?'| '+p.area_sqft+' sqft':''}${p.floor?' | Floor '+p.floor:''}<br>
        ${p.registry_status?'Registry: '+esc(p.registry_status):''}
      </div>
    </div>
  </div>

  <!-- Line Items Table -->
  <table class="inv-table">
    <thead><tr><th>Description</th><th>NEFT Reference</th><th>Transfer Date</th><th>Amount</th></tr></thead>
    <tbody>
      <tr>
        <td><strong>Token Amount</strong><br><span class="mono">${p.deal_bank_name?'via '+esc(p.deal_bank_name):''}</span></td>
        <td><span class="mono">${esc(p.deal_neft_reference||'—')}</span></td>
        <td>${fmtDate(p.deal_transfer_date)}</td>
        <td>${fmtCur(p.deal_token_amount)}</td>
      </tr>
      <tr>
        <td><strong>Security Deposit</strong><br><span class="mono">${p.bank_name?'via '+esc(p.bank_name):''}</span></td>
        <td><span class="mono">${esc(p.neft_reference||'—')}</span></td>
        <td>${fmtDate(p.token_transfer_date)}</td>
        <td>${fmtCur(p.remaining_amount)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Totals -->
  <div class="inv-totals">
    <div class="inv-totals-box">
      <div class="inv-totals-row"><span class="tl">Token Amount</span><span class="tv">${fmtCur(p.deal_token_amount)}</span></div>
      <div class="inv-totals-row"><span class="tl">Security Deposit</span><span class="tv">${fmtCur(p.remaining_amount)}</span></div>
      <div class="inv-totals-row total"><span class="tl">Total Received</span><span class="tv">${fmtCur(total)}</span></div>
    </div>
  </div>

  <!-- Status -->
  <div style="text-align:center;margin-top:16px">
    <span class="inv-status">PAID — Both payments received</span>
  </div>

  <!-- Footer -->
  <div class="inv-footer">
    <div class="inv-footer-left">
      <strong>Avano Technologies Private Limited</strong><br>
      CIN: U68200HR2024PTC123116
    </div>
    <div class="inv-footer-right">Security Deposit Invoice<br>Openhouse.in</div>
  </div>
</div>
</body>
</html>`;
}

module.exports = { generateInvoiceHTML };
