const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const BLUE = '#BDD7EE';
const BROWN = '#FCE4D6';
const LOGO_PATH = path.join(__dirname, '..', 'public', 'images', 'logo.png');

function generateTokenPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,
        size: 'A4',
        bufferPages: true,
        info: {
          Title: `Token Payment Receipt - ${data.uid}`,
          Author: 'Avano Technologies Private Limited',
        },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const pageW = doc.page.width;  // 595
      const pageH = doc.page.height; // 842
      const M = 36;
      const contentW = pageW - M * 2;
      const footerH = 52;
      const maxTableY = pageH - M - footerH; // bottom limit for table

      // ════════════════════════════════════════
      // PAGE 1 — Table
      // ════════════════════════════════════════

      let y = M;

      // Logo top-right
      const hasLogo = fs.existsSync(LOGO_PATH);
      if (hasLogo) {
        doc.image(LOGO_PATH, pageW - M - 72, M, { width: 72 });
      }

      // Title
      doc.font('Helvetica-Bold').fontSize(15).fill('#000000');
      const title = 'Token Payment Receipt';
      const tw = doc.widthOfString(title);
      const tx = (pageW - tw) / 2;
      y += hasLogo ? 10 : 0;
      doc.text(title, tx, y);
      doc.moveTo(tx, y + 18).lineTo(tx + tw, y + 18).lineWidth(0.8).stroke('#000000');
      y += 30;

      // Dear [Name],
      doc.font('Helvetica').fontSize(10).fill('#000000');
      doc.text('Dear ', M, y, { continued: true });
      doc.font('Helvetica-Bold').text(`${data.owner_broker_name || '—'},`);
      y += 16;

      doc.font('Helvetica').fontSize(10);
      doc.text('Please find the important details of the transaction below:', M, y);
      y += 18;

      // ── Build row data (conditionally skip N/A rent fields) ──
      const rows = [];
      const push = (label, value, color) => rows.push([label, value, color]);

      const safe = (v) => (v != null && v !== '' && String(v) !== 'null') ? String(v) : '';

      const fmtDate = (d) => {
        if (!d) return '';
        try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return String(d); }
      };

      // Blue section - Property
      push('City', data.city, BLUE);
      push('Society Name', data.society_name, BLUE);
      push('Owner Name', data.owner_broker_name, BLUE);
      push('Co-owner (if any)', data.co_owner, BLUE);
      push('Unit No.', data.unit_no, BLUE);
      push('Floor', data.floor, BLUE);
      push('Configuration', data.configuration, BLUE);
      push('Size (in sqft)', data.area_sqft, BLUE);
      push('Registry Status', data.registry_status, BLUE);
      push('Occupancy Status (Vacant/Tenant)', data.occupancy_status, BLUE);
      push('Inclusions, if any (AC, Furniture, Fixtures etc.)', data.inclusions, BLUE);

      // Brown section - Sale terms
      push('Guaranteed Sale Price (in INR Lakhs)', data.guaranteed_sale_price, BROWN);
      push('Performance Guarantee (in INR)', data.performance_guarantee, BROWN);
      push('Willingness to deal on Full Registry Value? (Y/N)', data.full_registry_willingness, BROWN);
      push('Initial Period (in Days)', data.initial_period, BROWN);
      push('Grace Period (in Days)', data.grace_period, BROWN);

      // Conditional: only include if NOT "N/A"
      const rpp = safe(data.rent_payable_period);
      if (rpp && rpp.toUpperCase() !== 'N/A') {
        push('Rent Payable During Period', rpp, BROWN);
      }
      const rpg = safe(data.rent_payable_grace_period);
      if (rpg && rpg.toUpperCase() !== 'N/A') {
        push('Rent Payable During Grace Period', rpg, BROWN);
      }

      // Blue section - Loan
      push('Outstanding Loan Amount (if any)', data.outstanding_loan, BLUE);
      push('Name of the Bank (with Loan A/c)', data.bank_name_loan, BLUE);
      push('Loan Account Number (LAN)', data.loan_account_number, BLUE);
      push('Willingness to pay Loan on his own? (Y/N)', data.loan_pay_willingness, BLUE);

      // Blue - Documents
      push('Seller confirms all required property papers are available? (Allotment Letter, BBA, Possession Letter, Conveyance Deed)', data.papers_available, BLUE);

      // Brown - Payment
      push('Bank A/C number', data.bank_account_number, BROWN);
      push('Bank Name', data.bank_name, BROWN);
      push('IFSC Code', data.ifsc_code, BROWN);
      push('Token Paid', data.token_paid, BROWN);
      push('Token Transfer Date', fmtDate(data.token_transfer_date), BROWN);
      push('NEFT Reference No.', data.neft_reference, BROWN);

      // Blue - Remarks
      push('Remarks (if any)', data.token_remarks, BLUE);

      // ── Calculate font size to fit everything on page 1 ──
      // Available space = maxTableY - current y
      const availH = maxTableY - y;
      const rowCount = rows.length;
      const padY = 4;

      // Target: each row ~ availH / rowCount
      // Font size that achieves ~14px row height = font 9, ~16px = font 10
      // Start with font 9.5 and check
      let fontSize = 9.5;
      const col1W = 210;
      const col2W = contentW - col1W;
      const padX = 5;

      // Measure total height at this font size
      function measureTotal(fs) {
        let total = 0;
        doc.font('Helvetica').fontSize(fs);
        for (const [label, value] of rows) {
          const lh = doc.heightOfString(label, { width: col1W - padX * 2 });
          const vh = doc.heightOfString(safe(value) || ' ', { width: col2W - padX * 2 });
          total += Math.max(lh, vh) + padY * 2;
        }
        return total;
      }

      // Auto-shrink font to fit
      let totalH = measureTotal(fontSize);
      while (totalH > availH && fontSize > 7) {
        fontSize -= 0.25;
        totalH = measureTotal(fontSize);
      }

      // ── Draw table ──
      for (const [label, value, color] of rows) {
        doc.font('Helvetica').fontSize(fontSize);
        const valStr = safe(value);
        const lh = doc.heightOfString(label, { width: col1W - padX * 2 });
        const vh = doc.heightOfString(valStr || ' ', { width: col2W - padX * 2 });
        const rowH = Math.max(lh, vh) + padY * 2;

        // Label cell background
        doc.save();
        doc.rect(M, y, col1W, rowH).fill(color);
        doc.rect(M + col1W, y, col2W, rowH).fill('#FFFFFF');
        doc.restore();

        // Borders
        doc.rect(M, y, col1W, rowH).lineWidth(0.4).stroke('#999999');
        doc.rect(M + col1W, y, col2W, rowH).lineWidth(0.4).stroke('#999999');

        // Text
        doc.fill('#000000').font('Helvetica').fontSize(fontSize);
        doc.text(label, M + padX, y + padY, { width: col1W - padX * 2 });
        doc.text(valStr, M + col1W + padX, y + padY, { width: col2W - padX * 2 });

        y += rowH;
      }

      // ════════════════════════════════════════
      // PAGE 2 — Terms and Conditions
      // ════════════════════════════════════════
      doc.addPage();
      y = M;

      // Heading
      doc.font('Helvetica-Bold').fontSize(14).fill('#000000');
      const tcTitle = 'Terms and Conditions';
      const tcW = doc.widthOfString(tcTitle);
      doc.text(tcTitle, M, y);
      doc.moveTo(M, y + 18).lineTo(M + tcW, y + 18).lineWidth(0.8).stroke('#000000');
      y += 36;

      // Numbered italic points
      const terms = [
        'Should any discrepancies/unavailability of required documents arise during the document verification process, Openhouse reserves the right to withhold execution of the agreement. In such an event, the advance token paid will be refunded to Openhouse in full.',
        'All charges related to the Society NOC (No Objection Certificate) shall be the sole responsibility of the seller and must be settled at the time of ownership transfer.',
        'To facilitate maximum visits to your property, Openhouse will install a smart lock on your property for digital access at no cost to you.',
        'Openhouse is committed to facilitating a seamless, transparent, and mutually beneficial transaction. We look forward to partnering with you through every step of this process.',
      ];

      doc.font('Helvetica-Oblique').fontSize(11);
      const numIndent = 20;

      terms.forEach((term, i) => {
        const num = `${i + 1}. `;
        doc.font('Helvetica-Oblique').fontSize(11).fill('#000000');

        // Number
        doc.text(num, M, y, { continued: false });

        // Term text indented
        const termH = doc.heightOfString(term, { width: contentW - numIndent });
        doc.text(term, M + numIndent, y, { width: contentW - numIndent });
        y += termH + 16;
      });

      // ════════════════════════════════════════
      // FOOTER — every page
      // ════════════════════════════════════════
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        const fy = pageH - M - footerH + 8;

        doc.moveTo(M, fy).lineTo(pageW - M, fy).lineWidth(0.4).strokeColor('#cccccc').stroke();

        doc.fill('#000000').font('Helvetica-Bold').fontSize(9);
        doc.text('Avano Technologies Private Limited', M, fy + 5, { width: contentW, align: 'center' });

        doc.font('Helvetica').fontSize(7.5).fill('#555555');
        doc.text(
          'CIN: U68200HR2024PTC123116\nVentureX, Unit No. 202 & 202A, Silverton Tower, Sector 50, Golf Course Extension Road, Gurugram, Haryana 122018, India',
          M, fy + 18, { width: contentW, align: 'center', lineGap: 1 }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateTokenPDF };
