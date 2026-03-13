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
    'Content-Transfer-Encoding: quoted-printable',
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

  const subject = `TESTING Token Request ${tower}${tower && unit ? ' -' : ''}${unit} ${society} | ${ownerName}`.replace(/\s+/g, ' ').trim();

  const senderName = fromEmail.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const bodyHtml = `<html><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.8">
<p>Greetings of the day!</p>
<p>Dear Accounts Team,</p>
<p>Kindly process the token payment of <strong>${tokenAmt}</strong> for <strong>${tower}${tower && unit ? ' -' : ''}${unit} ${society}</strong>. PFA the deal terms.</p>
<br>
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

module.exports = { sendTokenRequestEmail, htmlToPdf };