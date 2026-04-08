// Gmail API email sender with Puppeteer PDF generation
const { google } = require('googleapis');
const puppeteer = require('puppeteer');

// Generate real PDF buffer from HTML using Puppeteer
async function htmlToPdf(html) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
    const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '12mm', right: '12mm' }
    });
    // CRITICAL: Puppeteer returns Uint8Array, must convert to proper Node Buffer
    return Buffer.from(pdfUint8);
  } finally {
    if (browser) await browser.close();
  }
}

// Split base64 into 76-char lines (MIME requirement)
function chunkBase64(base64str) {
  const lines = [];
  for (let i = 0; i < base64str.length; i += 76) {
    lines.push(base64str.substring(i, i + 76));
  }
  return lines.join('\r\n');
}

// Build RFC 2822 MIME email with PDF attachment
function buildMimeEmail({ from, to, cc, subject, bodyHtml, pdfBuffer, pdfFilename }) {
  const boundary = 'boundary_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
  const pdfBase64 = chunkBase64(Buffer.from(pdfBuffer).toString('base64'));

  const encodedSubject = '=?UTF-8?B?' + Buffer.from(subject, 'utf-8').toString('base64') + '?=';

  const mime = [
    'MIME-Version: 1.0',
    `From: ${from}`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: ${encodedSubject}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    bodyHtml,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${pdfFilename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${pdfFilename}"`,
    '',
    pdfBase64,
    '',
    `--${boundary}--`,
    ''
  ].filter(line => line !== null).join('\r\n');

  // Gmail API needs URL-safe base64
  return Buffer.from(mime, 'utf-8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Send email via Gmail API using user's OAuth tokens
async function sendTokenRequestEmail({ accessToken, refreshToken, fromEmail, property, pdfHtml }) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Generate PDF
  console.log('Generating PDF via Puppeteer...');
  const pdfBuffer = await htmlToPdf(pdfHtml);
  console.log(`PDF generated: ${pdfBuffer.length} bytes, isBuffer: ${Buffer.isBuffer(pdfBuffer)}`);

  // Verify PDF starts with %PDF
  const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
  console.log(`PDF header: ${pdfHeader}`);
  if (!pdfHeader.startsWith('%PDF')) {
    throw new Error('Generated file is not a valid PDF');
  }

  const p = property;
  const ownerName = p.owner_broker_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Owner';
  const tower = p.tower_no || '';
  const unit = p.unit_no || '';
  const society = p.society_name || 'Property';
  const tokenAmt = p.token_amount_requested ? '₹ ' + Number(p.token_amount_requested).toLocaleString('en-IN') : '';

  const subject = `${p.uid} - Token Request | ${tower}${tower && unit ? ' -' : ''}${unit} ${society} | ${ownerName}`.replace(/\s+/g, ' ').trim();

  const senderName = fromEmail.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const bodyHtml = `<html><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.8">
<p>Greetings of the day!</p>
<p>Dear Accounts Team,</p>
<p>Kindly process the token payment of <strong>${tokenAmt}</strong> for <strong>${tower}${tower && unit ? ' -' : ''}${unit} ${society}</strong>. PFA the deal terms.</p>
<p>Rahool Sureka, please approve the same.</p>
${p.cheque_image_url ? `<p style="margin-top:16px"><strong>Cancelled Cheque Link:</strong> <a href="${p.cheque_image_url}" target="_blank" style="color:#1a73e8;text-decoration:underline">Click here to view cheque</a></p>` : ''}
${p.owner_pan_url ? `<p><strong>PAN Card:</strong> <a href="${p.owner_pan_url}" target="_blank" style="color:#1a73e8;text-decoration:underline">Click here to view</a></p>` : ''}
${p.owner_aadhaar_front_url ? `<p><strong>Aadhaar Card Front:</strong> <a href="${p.owner_aadhaar_front_url}" target="_blank" style="color:#1a73e8;text-decoration:underline">Click here to view</a></p>` : ''}
${p.owner_aadhaar_back_url ? `<p><strong>Aadhaar Card Back:</strong> <a href="${p.owner_aadhaar_back_url}" target="_blank" style="color:#1a73e8;text-decoration:underline">Click here to view</a></p>` : ''}
${p.owner_property_doc_url ? `<p><strong>Property Ownership Document:</strong> <a href="${p.owner_property_doc_url}" target="_blank" style="color:#1a73e8;text-decoration:underline">Click here to view</a></p>` : ''}<br>
<p>Regards,<br><strong>${senderName}</strong></p>
</body></html>`;

  const pdfFilename = `Token_Request_${p.uid || 'receipt'}.pdf`;

  console.log('Building MIME email...');
  const raw = buildMimeEmail({
    from: fromEmail,
    to: 'accounts@openhouse.in, rahool@openhouse.in',
    cc: 'supply@openhouse.in, akash.teotia@openhouse.in',
    subject,
    bodyHtml,
    pdfBuffer,
    pdfFilename
  });

  console.log(`MIME raw length: ${raw.length} chars. Sending via Gmail API...`);
  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw }
  });

  console.log(`Email sent! messageId: ${result.data.id}`);
  return { messageId: result.data.id, threadId: result.data.threadId };
}

// Send Deal Terms email to seller with PDF attachment
async function sendDealTermsEmail({ accessToken, refreshToken, fromEmail, property, pdfHtml, signatoryName, signatoryPhone }) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  console.log('Generating Deal Terms PDF via Puppeteer...');
  const pdfBuffer = await htmlToPdf(pdfHtml);
  console.log(`PDF generated: ${pdfBuffer.length} bytes`);

  const p = property;
  const sellerName = p.owner_broker_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Seller';
  const tower = p.tower_no || '';
  const unit = p.unit_no || '';
  const society = p.society_name || 'Property';
  const propRef = [tower, unit].filter(Boolean).join(' ') + (tower || unit ? ' - ' : '') + society;
  const tokenAmt = p.deal_token_amount || p.token_amount_requested;
  const tokenAmtFmt = tokenAmt ? 'INR ' + Number(tokenAmt).toLocaleString('en-IN') + '/-' : 'INR [Token Amount]';
  const neftRef = p.deal_neft_reference || '[Transaction Reference No.]';

  const subject = `${p.uid} - Openhouse Offer | ${propRef} | ${sellerName}`;

  const bodyHtml = `<html><body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.8">
<p>Dear <strong>${sellerName}</strong>,</p>
<p>Greetings from <strong>Openhouse</strong>!</p>
<p>We are pleased to extend a formal offer for ${propRef}.</p>
<p>As a token of our commitment, we have transferred ${tokenAmtFmt} via NEFT, bearing Reference No. ${neftRef}, as an advance token towards this transaction. Further to our discussion, we have <strong>ATTACHED THE AGREED DEAL TERMS</strong> for your reference. <strong>Please review the document carefully.</strong></p>
<p>Kindly upload the required documents using the link - <a href="https://openhouse.in/login/" style="color:#1a73e8">Seller Dashboard</a></p>
<p>Login using your mobile number <strong>${p.contact_no||'[Owner Mobile No]'}</strong> &amp; OTP</p>
<p>Next Steps:-<br>
1. Document due diligence within 2 working days<br>
2. AMA signing<br>
3. Property Handover</p>
<p>Should you have any questions or require any clarification regarding the above, please do not hesitate to reach out to us. We are here to assist you at every step.</p>
<p>Warm regards<br>
${signatoryName}<br>
${signatoryPhone ? signatoryPhone + '<br>' : ''}Website - <a href="https://www.openhouse.in" style="color:#1a73e8">www.openhouse.in</a></p>
</body></html>`;

  const pdfFilename = `Deal_Terms_${p.uid || 'receipt'}.pdf`;

  // Build recipient list
  const toList = [p.owner_email].filter(Boolean);
  const ccList = ['supply@openhouse.in', 'akash.teotia@openhouse.in', 'accounts@openhouse.in', p.co_owner_email, p.third_owner_email, p.broker_email].filter(Boolean);

  console.log('Building MIME email with PDF attachment...');
  const raw = buildMimeEmail({
    from: fromEmail,
    to: toList.join(', '),
    cc: ccList.length ? ccList.join(', ') : null,
    subject,
    bodyHtml,
    pdfBuffer,
    pdfFilename
  });

  const result = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  console.log(`Deal Terms email sent! messageId: ${result.data.id}`);
  return { messageId: result.data.id, threadId: result.data.threadId };
}

// Build simple HTML email (no attachment)
function buildSimpleMimeEmail({ from, to, cc, subject, bodyHtml }) {
  const encodedSubject = '=?UTF-8?B?' + Buffer.from(subject, 'utf-8').toString('base64') + '?=';
  const mime = [
    'MIME-Version: 1.0',
    `From: ${from}`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: ${encodedSubject}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    bodyHtml
  ].filter(line => line !== null).join('\r\n');
  return Buffer.from(mime, 'utf-8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Send CP Bill email via Gmail API
async function sendCPBillEmail({ accessToken, refreshToken, fromEmail, senderName, property }) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const p = property;
  const addr = [p.unit_no, p.tower_no, p.society_name, p.locality, p.city].filter(Boolean).join(', ');
  const amaStatus = p.cp_ama_signed_url ? 'Signed (attached below)' : 'Not signed yet';

  const photoLinks = [];
  if(p.cp_aadhaar_front_url) photoLinks.push(`<li><a href="${p.cp_aadhaar_front_url}" target="_blank">Aadhaar Card Front</a></li>`);
  if(p.cp_aadhaar_back_url) photoLinks.push(`<li><a href="${p.cp_aadhaar_back_url}" target="_blank">Aadhaar Card Back</a></li>`);
  if(p.cp_pan_card_url) photoLinks.push(`<li><a href="${p.cp_pan_card_url}" target="_blank">PAN Card</a></li>`);
  if(p.cp_cancelled_cheque_url) photoLinks.push(`<li><a href="${p.cp_cancelled_cheque_url}" target="_blank">Cancelled Cheque</a></li>`);
  if(p.cp_ama_signed_url) photoLinks.push(`<li><a href="${p.cp_ama_signed_url}" target="_blank">AMA Signed (PDF)</a></li>`);

  const subject = `${p.uid} - CP Bill Generation | ${addr}`;
  const bodyHtml = `<html><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.8">
<p>Hi Accounts Team,</p>
<p>Kindly prepare the CP bill for the below mentioned property:</p>
<table style="border-collapse:collapse;font-size:14px;line-height:2">
  <tr><td style="padding:2px 12px 2px 0;font-weight:bold;white-space:nowrap">Deal Type:</td><td>${p.deal_type||'—'}</td></tr>
  <tr><td style="padding:2px 12px 2px 0;font-weight:bold;white-space:nowrap">CP Name:</td><td>${p.cp_name||'—'}</td></tr>
  <tr><td style="padding:2px 12px 2px 0;font-weight:bold;white-space:nowrap">CP Firm:</td><td>${p.cp_firm||'—'}</td></tr>
  <tr><td style="padding:2px 12px 2px 0;font-weight:bold;white-space:nowrap">Mobile Number:</td><td>${p.cp_phone||'—'}</td></tr>
  <tr><td style="padding:2px 12px 2px 0;font-weight:bold;white-space:nowrap">Email ID:</td><td>${p.cp_email||'—'}</td></tr>
  <tr><td style="padding:2px 12px 2px 0;font-weight:bold;white-space:nowrap">Property Address:</td><td>${addr}</td></tr>
  <tr><td style="padding:2px 12px 2px 0;font-weight:bold;white-space:nowrap">OH Acquired Model:</td><td>${p.oh_acquired_model||'—'}</td></tr>
  <tr><td style="padding:2px 12px 2px 0;font-weight:bold;white-space:nowrap">Agreed Brokerage:</td><td>${p.agreed_brokerage||'—'}%</td></tr>
  <tr><td style="padding:2px 12px 2px 0;font-weight:bold;white-space:nowrap">AMA Status:</td><td>${amaStatus}</td></tr>
  <tr><td style="padding:2px 12px 2px 0;font-weight:bold;white-space:nowrap">Deal Value:</td><td>${p.deal_value||'—'}</td></tr>
  <tr><td style="padding:2px 12px 2px 0;font-weight:bold;white-space:nowrap">Total Brokerage:</td><td>${p.total_brokerage_amount?'₹'+Number(p.total_brokerage_amount).toLocaleString('en-IN'):'—'}</td></tr>
  <tr><td style="padding:2px 12px 2px 0;font-weight:bold;white-space:nowrap">To be Released Now:</td><td>${p.to_be_released_now?'₹'+Number(p.to_be_released_now).toLocaleString('en-IN'):'—'}</td></tr>
  <tr><td style="padding:2px 12px 2px 0;font-weight:bold;white-space:nowrap">Incentive for Visit:</td><td>${p.incentive_visit?'₹'+Number(p.incentive_visit).toLocaleString('en-IN'):'—'}</td></tr>
  <tr><td style="padding:2px 12px 2px 0;font-weight:bold;white-space:nowrap">Incentive for Owner Meeting:</td><td>${p.incentive_owner_meeting?'₹'+Number(p.incentive_owner_meeting).toLocaleString('en-IN'):'—'}</td></tr>
  <tr><td style="padding:2px 12px 2px 0;font-weight:bold;white-space:nowrap">Total Amount:</td><td>${p.total_cp_amount?'₹'+Number(p.total_cp_amount).toLocaleString('en-IN'):'—'}</td></tr>
</table>
${photoLinks.length?`<p style="margin-top:16px"><strong>Attached Documents:</strong></p><ul style="line-height:2">${photoLinks.join('')}</ul>`:''}
<p style="margin-top:16px">Prashant Singh, kindly approve the same.</p>
<p>Best,<br><strong>${senderName}</strong></p>
</body></html>`;

  const raw = buildSimpleMimeEmail({
    from: fromEmail,
    to: 'prashant@openhouse.in',
    cc: 'supply@openhouse.in,',
    subject,
    bodyHtml
  });

  const result = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  console.log(`CP Bill email sent! messageId: ${result.data.id}`);
  return { messageId: result.data.id, threadId: result.data.threadId };
}

async function sendPendingAmountEmail({ accessToken, refreshToken, fromEmail, senderName, property, owner1_name, owner1_amount, owner2_name, owner2_amount }) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const p = property;
  const addr = [p.unit_no, p.tower_no, p.society_name, p.locality, p.city].filter(Boolean).join(', ');
  const amaDate = p.ama_date ? new Date(p.ama_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const ownerName = owner1_name || p.owner_broker_name || 'Owner';

  let amountLines = `<ul style="line-height:2;font-size:14px">
    <li><strong>${ownerName}:</strong> INR ${Number(owner1_amount||0).toLocaleString('en-IN')}</li>`;
  if (owner2_name && owner2_amount) {
    amountLines += `<li><strong>${owner2_name}:</strong> INR ${Number(owner2_amount).toLocaleString('en-IN')}</li>`;
  }
  amountLines += `</ul>`;

  const subject = `${p.uid} - AMA Acknowledgement & Pending Amount Request | ${addr}`;
  const bodyHtml = `<html><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.8">
<p>Dear <strong>${ownerName}</strong>,</p>
<p>Congratulations on the successful execution of the Asset Management Agreement dated <strong>${amaDate}</strong>.</p>
<p>Please find the link to executed copy of the agreement for your reference. Kindly acknowledge receipt of this document by replying to this thread. Upon receiving your acknowledgement, the Accounts Team will release the remaining amount as follows:</p>
<p><strong>Property:</strong> ${addr}</p>
${amountLines}
<p>Hi Accounts Team, please do the needful.</p>
${p.cheque_image_url ? `<p><strong>Cancelled Cheque Link:</strong> <a href="${p.cheque_image_url}" style="color:#1a73e8">Click here to view cheque</a></p>` : ''}
${p.signed_ama_url ? `<p><strong>AMA Link:</strong> <a href="${p.signed_ama_url}" style="color:#1a73e8">Click here to view AMA</a></p>` : ''}
<p>Regards,<br><strong>${senderName}</strong></p>
</body></html>`;

  const toList = [p.owner_email, p.co_owner_email, 'saranshkhera5@gmail.com'].filter(Boolean);
  const ccList = ['ashish@openhouse.in', p.third_owner_email].filter(Boolean);

  const raw = buildSimpleMimeEmail({
    from: fromEmail,
    to: toList.join(', '),
    cc: ccList.length ? ccList.join(', ') : '',
    subject,
    bodyHtml
  });

  const result = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  console.log(`Pending amount email sent! messageId: ${result.data.id}`);
  return { messageId: result.data.id, threadId: result.data.threadId };
}

async function sendKeyHandoverEmail({ accessToken, refreshToken, fromEmail, senderName, property }) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const p = property;
  const addr = [p.unit_no, p.tower_no, p.society_name, p.locality, p.city].filter(Boolean).join(', ');
  const sellerName = p.owner_broker_name || 'Seller';
  const hdDate = p.key_handover_date ? new Date(p.key_handover_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const subject = `${p.uid} - Key Handover Acknowledgement | ${addr}`;
  const bodyHtml = `<html><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.8">
<p>Dear <strong>${sellerName}</strong>,</p>
<p>I am writing to confirm that OpenHouse has collected the keys for your property <strong>${addr}</strong> on <strong>${hdDate}</strong>. Consequently, the timeline of the agreement will commence from <strong>${hdDate}</strong>.</p>
<p>Regards,<br><strong>${senderName}</strong></p>
</body></html>`;

  const toList = [p.owner_email].filter(Boolean);
  const ccList = ['saranshkhera5@gmail.com', p.co_owner_email, p.third_owner_email, p.broker_email].filter(Boolean);

  const raw = buildSimpleMimeEmail({
    from: fromEmail,
    to: toList.join(', '),
    cc: ccList.length ? ccList.join(', ') : null,
    subject,
    bodyHtml
  });

  const result = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  console.log(`Key handover email sent! messageId: ${result.data.id}`);
  return { messageId: result.data.id, threadId: result.data.threadId };
}

// Send offer email to property owner with PDF attachment
module.exports = { sendTokenRequestEmail, sendDealTermsEmail, sendCPBillEmail, sendPendingAmountEmail, sendKeyHandoverEmail, htmlToPdf };