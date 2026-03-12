// Gmail API email sender with Puppeteer PDF generation
const { google } = require('googleapis');
const puppeteer = require('puppeteer');

async function htmlToPdf(html) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '12mm', right: '12mm' }
    });
    return pdfBuffer;
  } finally {
    if (browser) await browser.close();
  }
}

function chunkBase64(base64str) {
  const lines = [];
  for (let i = 0; i < base64str.length; i += 76) {
    lines.push(base64str.substring(i, i + 76));
  }
  return lines.join('\r\n');
}

function buildMimeEmail({ from, to, cc, subject, bodyHtml, pdfBuffer, pdfFilename }) {
  const boundary = 'boundary_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
  const pdfBase64 = chunkBase64(pdfBuffer.toString('base64'));

  const parts = [];
  parts.push(`From: ${from}`);
  parts.push(`To: ${to}`);
  if (cc) parts.push(`Cc: ${cc}`);
  parts.push(`Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`);
  parts.push('MIME-Version: 1.0');
  parts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  parts.push('');
  parts.push(`--${boundary}`);
  parts.push('Content-Type: text/html; charset="UTF-8"');
  parts.push('Content-Transfer-Encoding: 7bit');
  parts.push('');
  parts.push(bodyHtml);
  parts.push('');
  parts.push(`--${boundary}`);
  parts.push(`Content-Type: application/pdf; name="${pdfFilename}"`);
  parts.push('Content-Transfer-Encoding: base64');
  parts.push(`Content-Disposition: attachment; filename="${pdfFilename}"`);
  parts.push('');
  parts.push(pdfBase64);
  parts.push('');
  parts.push(`--${boundary}--`);

  const rawEmail = parts.join('\r\n');
  return Buffer.from(rawEmail).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

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

  console.log('Generating PDF...');
  const pdfBuffer = await htmlToPdf(pdfHtml);
  console.log(`PDF generated: ${pdfBuffer.length} bytes`);

  const p = property;
  const ownerFirst = p.first_name || (p.owner_broker_name || '').split(' ')[0] || 'Owner';
  const subject = `Token request for ${p.society_name || 'Property'} | ${ownerFirst} ${p.tower_no || ''} ${p.unit_no || ''}`.trim();
  const senderName = fromEmail.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const bodyHtml = `<html><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.6">
<p>Hi Rahool,</p>
<p>Kindly approve the token for the below mentioned property.</p>
<p>Please find the major details of the transaction below:</p>
<table style="border-collapse:collapse;margin:16px 0;font-size:13px">
  <tr><td style="padding:4px 16px 4px 0;color:#666">UID</td><td style="padding:4px 0;font-weight:600">${p.uid || ''}</td></tr>
  <tr><td style="padding:4px 16px 4px 0;color:#666">Society</td><td style="padding:4px 0;font-weight:600">${p.society_name || ''}</td></tr>
  <tr><td style="padding:4px 16px 4px 0;color:#666">Unit / Tower</td><td style="padding:4px 0;font-weight:600">${p.unit_no || ''} / ${p.tower_no || ''}</td></tr>
  <tr><td style="padding:4px 16px 4px 0;color:#666">Config</td><td style="padding:4px 0;font-weight:600">${p.configuration || ''}</td></tr>
  <tr><td style="padding:4px 16px 4px 0;color:#666">Owner</td><td style="padding:4px 0;font-weight:600">${p.owner_broker_name || ''}</td></tr>
  <tr><td style="padding:4px 16px 4px 0;color:#666">Token Amount</td><td style="padding:4px 0;font-weight:600">${p.token_amount_requested ? 'Rs. ' + Number(p.token_amount_requested).toLocaleString('en-IN') : ''}</td></tr>
  <tr><td style="padding:4px 16px 4px 0;color:#666">GSP</td><td style="padding:4px 0;font-weight:600">${p.guaranteed_sale_price ? 'Rs. ' + p.guaranteed_sale_price + ' Lakhs' : ''}</td></tr>
</table>
<p>Token Request PDF is attached for your reference.</p>
<br>
<p>Regards,<br><strong>${senderName}</strong></p>
</body></html>`;

  const pdfFilename = `Token_Request_${p.uid || 'receipt'}.pdf`;

  console.log('Building MIME email...');
  const raw = buildMimeEmail({
    from: fromEmail,
    to: 'saransh.khera@openhouse.in',
    cc: 'sahaj.dureja@openhouse.in',
    subject,
    bodyHtml,
    pdfBuffer,
    pdfFilename
  });

  console.log('Sending via Gmail API...');
  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw }
  });

  console.log(`Email sent! messageId: ${result.data.id}`);
  return { messageId: result.data.id, threadId: result.data.threadId };
}

module.exports = { sendTokenRequestEmail, htmlToPdf };