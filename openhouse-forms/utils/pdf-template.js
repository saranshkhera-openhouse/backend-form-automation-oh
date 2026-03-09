// Generates the Token Receipt HTML from property data
// Used by both Form 4 (Deal Terms) and Form 5 (Final)

function fmtDate(d){if(!d)return '—';const dt=new Date(d);const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return `${String(dt.getDate()).padStart(2,'0')} ${m[dt.getMonth()]} ${dt.getFullYear()}`}
function fmtCurrency(v,suffix=''){if(!v)return '—';const n=Number(v);if(isNaN(n))return '—';return '₹'+n.toLocaleString('en-IN')+suffix}
function fmtLakhs(v){if(!v)return '—';return '₹'+Number(v).toLocaleString('en-IN')+'L'}
function esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}
function pill(val,type){if(!val)return '<span class="pill gold">—</span>';return `<span class="pill ${type}">${esc(val)}</span>`}
function fval(v,cls=''){if(!v||v==='null'||v==='undefined')return `<div class="f-value empty">—</div>`;return `<div class="f-value ${cls}">${esc(v)}</div>`}

function generateReceiptHTML(p, mode='final'){
  const today=fmtDate(new Date());
  const ownerName=p.owner_broker_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||'—';
  const firstName=p.first_name||ownerName.split(' ')[0]||'Owner';
  const hasFinal=!!p.final_submitted_at;
  const hasNEFT=!!(p.bank_account_number&&p.neft_reference);

  // Documents
  const allDocs=['Allotment Letter issued by the Builder','Possession Letter/Certificate by the Builder','Builder Buyer Agreement','Conveyance Deed/Sale Deed/Registry','Other Documents'];
  let selectedDocs=[];
  try{selectedDocs=typeof p.documents_available==='string'?JSON.parse(p.documents_available):p.documents_available||[]}catch(e){}

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Token Payment Receipt – ${esc(p.uid)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink: #1a1510; --muted: #7a6f63; --border: #ddd6cc; --bg: #faf8f5;
    --cream: #f4f0ea; --gold: #b8985a; --gold-light: #e8d9b5;
    --green: #2d5a3d; --green-light: #e8f2ec; --white: #ffffff;
    --red-light: #fdecea; --red: #b33a2e;
  }
  body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--ink); padding: 24px 20px 40px; font-size: 12px; }
  .page { max-width: 680px; margin: 0 auto; }

  .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1.5px solid var(--border); }
  .brand { display: flex; align-items: center; gap: 8px; }
  .brand-logo { width: 30px; height: 30px; background: var(--ink); border-radius: 6px; display: grid; place-items: center; }
  .brand-logo svg { width: 16px; height: 16px; fill: var(--gold); }
  .brand-name { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 500; letter-spacing: 0.04em; }
  .header-right { text-align: right; }
  .receipt-tag { font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
  .receipt-date { font-size: 11px; color: var(--muted); margin-top: 2px; }

  .greeting-strip { background: var(--ink); border-radius: 10px; padding: 14px 20px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .greeting-left .hi { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 400; color: var(--white); }
  .greeting-left .sub { font-size: 10.5px; color: rgba(255,255,255,0.5); margin-top: 2px; font-weight: 300; }
  .price-block { text-align: right; }
  .price-label { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold-light); opacity: 0.7; margin-bottom: 2px; }
  .price-val { font-family: 'Cormorant Garamond', serif; font-size: 30px; font-weight: 500; color: var(--white); line-height: 1; }
  .price-sub { font-size: 10px; color: rgba(255,255,255,0.45); margin-top: 3px; }
  .guarantee-pill { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 8px 14px; text-align: center; flex-shrink: 0; }
  .guarantee-pill .gv { font-family: 'Cormorant Garamond', serif; font-size: 17px; font-weight: 500; color: var(--gold-light); }
  .guarantee-pill .gl { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-top: 1px; }

  .section-label { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); font-weight: 500; margin: 14px 0 8px; padding-left: 2px; display: flex; align-items: center; gap: 8px; }
  .section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  .field-grid { display: grid; gap: 6px; }
  .field-grid.col2 { grid-template-columns: 1fr 1fr; }
  .field-grid.col3 { grid-template-columns: 1fr 1fr 1fr; }
  .field-grid.col4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
  .field { background: var(--white); border: 1px solid var(--border); border-radius: 8px; padding: 9px 12px; }
  .field .f-label { font-size: 9px; letter-spacing: 0.09em; text-transform: uppercase; color: var(--muted); font-weight: 500; margin-bottom: 3px; }
  .field .f-value { font-size: 13px; font-weight: 500; color: var(--ink); line-height: 1.25; }
  .field .f-value.serif { font-family: 'Cormorant Garamond', serif; font-size: 16px; }
  .field .f-value.mono { font-family: 'Courier New', monospace; font-size: 11.5px; letter-spacing: 0.04em; }
  .field .f-value.empty { color: #bbb; font-weight: 300; font-size: 12px; font-style: italic; }

  .pill { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 10px; font-weight: 500; }
  .pill.green { background: var(--green-light); color: var(--green); }
  .pill.gold { background: #fef8ec; color: #8a6a1a; }
  .pill.red { background: var(--red-light); color: var(--red); }

  .token-strip { background: var(--green-light); border: 1.5px solid #b8d9c4; border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; gap: 12px; }
  .token-icon { width: 34px; height: 34px; background: var(--green); border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; }
  .token-icon svg { width: 16px; height: 16px; stroke: white; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
  .token-info { flex: 1; }
  .token-info .t-title { font-size: 12px; font-weight: 500; color: var(--green); }
  .token-info .t-ref { font-size: 11px; color: #4a7a5d; font-family: 'Courier New', monospace; margin-top: 1px; }
  .token-date { text-align: right; flex-shrink: 0; }
  .token-date .td-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.09em; color: #4a7a5d; }
  .token-date .td-val { font-family: 'Cormorant Garamond', serif; font-size: 15px; font-weight: 500; color: var(--green); margin-top: 1px; }

  .doc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .doc-item { background: var(--white); border: 1px solid var(--border); border-radius: 8px; padding: 9px 12px; display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 400; }
  .doc-item.missing { border-color: #f0c4c0; background: var(--red-light); color: var(--red); }
  .doc-box { width: 14px; height: 14px; border: 1.5px solid var(--border); border-radius: 3px; background: var(--cream); flex-shrink: 0; }
  .doc-box.checked { background: var(--green); border-color: var(--green); }

  .terms-wrap { background: var(--cream); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
  .terms-wrap h4 { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); font-weight: 500; margin-bottom: 10px; }
  .terms-list { list-style: none; display: flex; flex-direction: column; gap: 7px; }
  .terms-list li { display: flex; gap: 8px; font-size: 11px; color: #4a4035; line-height: 1.5; font-weight: 300; }
  .terms-list li::before { content: '—'; color: var(--gold); flex-shrink: 0; }

  .footer { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .footer-brand { font-family: 'Cormorant Garamond', serif; font-size: 13px; font-weight: 500; margin-bottom: 2px; }
  .footer-cin { font-size: 9.5px; color: var(--muted); font-weight: 300; line-height: 1.6; }
  .footer-note { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.09em; text-align: right; line-height: 1.7; flex-shrink: 0; }

  @media print {
    body { background: white; padding: 12px 16px 20px; font-size: 11px; }
    .page { max-width: 100%; }
    .field, .doc-item, .terms-wrap, .token-strip, .greeting-strip { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 0.5cm 0.8cm; size: A4; }
    .no-print { display: none !important; }
  }

  .print-bar { text-align: center; margin-bottom: 16px; }
  .print-bar button { font-family: 'DM Sans', sans-serif; padding: 8px 24px; border: 1.5px solid var(--border); border-radius: 8px; background: var(--white); cursor: pointer; font-size: 12px; font-weight: 500; }
  .print-bar button:hover { background: var(--cream); }
</style>
</head>
<body>
<div class="page">

  <div class="print-bar no-print"><button onclick="window.print()">🖨 Print / Save as PDF</button></div>

  <!-- HEADER -->
  <div class="header">
    <div class="brand">
      <div class="brand-logo"><svg viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V21H3V9.5z"/></svg></div>
      <span class="brand-name">Openhouse</span>
    </div>
    <div class="header-right">
      <div class="receipt-tag">${mode==='deal'?'Deal Terms Summary':'Token Payment Receipt'}</div>
      <div class="receipt-date">Generated: ${today}</div>
    </div>
  </div>

  <!-- GREETING + PRICE STRIP -->
  <div class="greeting-strip">
    <div class="greeting-left">
      <div class="hi">Hello, <strong>${esc(firstName)}</strong></div>
      <div class="sub">${mode==='deal'?'Here are the agreed deal terms for your property.':'Your token has been successfully received. Here is a summary of your deal.'}</div>
    </div>
    ${p.performance_guarantee?`<div class="guarantee-pill"><div class="gv">${fmtCurrency(p.performance_guarantee)}</div><div class="gl">Performance Guarantee</div></div>`:''}
    ${p.guaranteed_sale_price?`<div class="price-block"><div class="price-label">Guaranteed Sale Price</div><div class="price-val">${fmtLakhs(p.guaranteed_sale_price)}</div><div class="price-sub">INR Lakhs</div></div>`:''}
  </div>

  <!-- SELLER DETAILS -->
  <div class="section-label">Seller Details</div>
  <div class="field-grid col2">
    <div class="field"><div class="f-label">Owner Name</div><div class="f-value serif">${esc(ownerName)}</div></div>
    <div class="field"><div class="f-label">Contact</div>${fval(p.contact_no,'mono')}</div>
  </div>

  <!-- PROPERTY DETAILS -->
  <div class="section-label">Property Details</div>
  <div class="field-grid col4">
    <div class="field"><div class="f-label">City</div>${fval(p.city)}</div>
    <div class="field"><div class="f-label">Unit No.</div>${fval(p.unit_no)}</div>
    <div class="field"><div class="f-label">Floor</div>${fval(p.floor)}</div>
    <div class="field"><div class="f-label">Configuration</div>${fval(p.configuration)}</div>
  </div>
  <div class="field-grid col3" style="margin-top:6px;">
    <div class="field"><div class="f-label">Society</div><div class="f-value serif">${esc(p.society_name||'—')}</div></div>
    <div class="field"><div class="f-label">Tower</div>${fval(p.tower_no)}</div>
    <div class="field"><div class="f-label">Size (sqft)</div>${fval(p.area_sqft?Number(p.area_sqft).toLocaleString('en-IN'):null)}</div>
  </div>
  <div class="field-grid col2" style="margin-top:6px;">
    <div class="field"><div class="f-label">Registry Status</div><div class="f-value">${p.registry_status?pill(p.registry_status,p.registry_status==='Registered'?'green':'gold'):'<span class="f-value empty">—</span>'}</div></div>
    <div class="field"><div class="f-label">Occupancy Status</div><div class="f-value">${p.occupancy_status?pill(p.occupancy_status,p.occupancy_status==='Vacant'?'gold':p.occupancy_status==='Tenant'?'red':'green'):'<span class="f-value empty">—</span>'}</div></div>
  </div>

  <!-- DEAL TERMS -->
  <div class="section-label">Deal Terms</div>
  <div class="field-grid col2">
    <div class="field"><div class="f-label">Token ${mode==='deal'?'Amount':'Paid'} (₹)</div><div class="f-value serif">${fmtCurrency(mode==='deal'?p.deal_token_amount:p.deal_token_amount)}</div></div>
    <div class="field"><div class="f-label">Remaining Amount (₹)</div><div class="f-value serif">${p.remaining_amount?fmtCurrency(p.remaining_amount):'<span class="empty">—</span>'}</div></div>
  </div>
  <div class="field-grid col2" style="margin-top:6px;">
    <div class="field"><div class="f-label">Initial Period (Days)</div><div class="f-value serif">${p.initial_period||'—'}</div></div>
    <div class="field"><div class="f-label">Rent Payable (Initial)</div>${fval(p.rent_payable_initial_period==='N/A'?'No rent payable':p.rent_payable_initial_period?fmtCurrency(p.rent_payable_initial_period):null)}</div>
  </div>
  <div class="field-grid col2" style="margin-top:6px;">
    <div class="field"><div class="f-label">Grace Period (Days)</div><div class="f-value serif">${p.grace_period||'—'}</div></div>
    <div class="field"><div class="f-label">Rent Payable (Grace)</div>${fval(p.rent_payable_grace_period==='N/A'?'No rent payable':p.rent_payable_grace_period?fmtCurrency(p.rent_payable_grace_period):null)}</div>
  </div>

  <!-- LOAN DETAILS -->
  <div class="section-label">Loan Details</div>
  <div class="field-grid col4">
    <div class="field"><div class="f-label">Outstanding Loan</div>${fval(p.outstanding_loan?fmtCurrency(p.outstanding_loan):null)}</div>
    <div class="field"><div class="f-label">Bank (Loan)</div>${fval(p.bank_name_loan)}</div>
    <div class="field"><div class="f-label">Loan A/c No.</div>${fval(p.loan_account_number,'mono')}</div>
    <div class="field"><div class="f-label">Seller to Pay Loan?</div><div class="f-value">${p.loan_pay_willingness?pill(p.loan_pay_willingness,p.loan_pay_willingness==='Yes'?'green':'red'):'<span class="f-value empty">—</span>'}</div></div>
  </div>

  <!-- DOCUMENTS -->
  <div class="section-label">Document Confirmation</div>
  <div class="doc-grid">
    ${allDocs.map(doc=>{
      const has=selectedDocs.includes(doc);
      const shortName=doc.replace('issued by the Builder','').replace('/Certificate by the Builder','').replace('Conveyance Deed/Sale Deed/Registry','Conveyance Deed').trim();
      return `<div class="doc-item${has?'':' missing'}"><div class="doc-box${has?' checked':''}"></div>${esc(shortName)}</div>`;
    }).join('\n    ')}
  </div>

  <!-- SELLER BANK DETAILS -->
  <div class="section-label">Seller Bank Details</div>
  <div class="field-grid col3">
    <div class="field"><div class="f-label">Bank Name</div>${fval(p.cheque_bank_name||p.bank_name)}</div>
    <div class="field"><div class="f-label">Account Number</div>${fval(p.cheque_account_number||p.bank_account_number,'mono')}</div>
    <div class="field"><div class="f-label">IFSC Code</div>${fval(p.cheque_ifsc||p.ifsc_code,'mono')}</div>
  </div>

  <!-- TOKEN TRANSACTION (only if NEFT data exists) -->
  ${(mode==='deal'&&p.deal_neft_reference)||(mode==='final'&&hasNEFT)?`
  <div class="section-label">Token Transaction</div>
  <div class="token-strip">
    <div class="token-icon"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
    <div class="token-info">
      <div class="t-title">Token Paid — ${esc(mode==='deal'?(p.deal_bank_name||'Bank'):(p.bank_name||p.cheque_bank_name||'Bank'))}</div>
      <div class="t-ref">NEFT Ref: ${esc(mode==='deal'?p.deal_neft_reference:p.neft_reference)}</div>
    </div>
    <div class="token-date">
      <div class="td-label">Transfer Date</div>
      <div class="td-val">${fmtDate(mode==='deal'?p.deal_transfer_date:p.token_transfer_date)}</div>
    </div>
  </div>`:''}

  <!-- TERMS & CONDITIONS -->
  <div class="section-label">Terms &amp; Conditions</div>
  <div class="terms-wrap">
    <h4>Please read carefully</h4>
    <ul class="terms-list">
      <li>Should any discrepancies or unavailability of required documents arise during the document verification process, Openhouse reserves the right to withhold execution of the agreement. In such an event, the advance token paid will be refunded to Openhouse in full.</li>
      <li>All charges related to the Society NOC (No Objection Certificate) shall be the sole responsibility of the seller and must be settled at the time of ownership transfer.</li>
      <li>To facilitate maximum visits to your property, Openhouse will install a smart lock on your property for digital access at no cost to you.</li>
      <li>Openhouse is committed to facilitating a seamless, transparent, and mutually beneficial transaction. We look forward to partnering with you through every step of this process.</li>
    </ul>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>
      <div class="footer-brand">Avano Technologies Private Limited</div>
      <div class="footer-cin">CIN: U68200HR2024PTC123116 &nbsp;|&nbsp; VentureX, Unit No. 202 &amp; 202A, Silverton Tower, Sector 50, Golf Course Extension Road, Gurugram, Haryana 122018</div>
    </div>
    <div class="footer-note">${mode==='deal'?'Deal Terms':'Token Receipt'}<br>Openhouse.in</div>
  </div>

</div>
</body>
</html>`;
}

module.exports = { generateReceiptHTML };
