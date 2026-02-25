const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Colors matching the docx
const BLUE = '#BDD7EE';
const BROWN = '#FCE4D6';
const WHITE = '#FFFFFF';

// Logo path - place your logo at public/images/logo.png
const LOGO_PATH = path.join(__dirname, '..', 'public', 'images', 'logo.png');

function generateTokenPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36, // 0.5 inch
        size: 'A4',
        bufferPages: true,
        info: {
          Title: `Token Payment Receipt - ${data.uid}`,
          Author: 'Openhouse - Avano Technologies Private Limited',
        },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const margin = 36;
      const contentW = pageW - margin * 2;

      // ═══════════════════════════════════════
      // PAGE 1
      // ═══════════════════════════════════════

      // ── Logo (top-right) ──
      const hasLogo = fs.existsSync(LOGO_PATH);
      if (hasLogo) {
        doc.image(LOGO_PATH, pageW - margin - 80, margin, { width: 80 });
      }

      // ── Title: "Token Payment Receipt" ──
      let y = margin + (hasLogo ? 30 : 0);
      doc.font('Helvetica-Bold').fontSize(16);
      const titleText = 'Token Payment Receipt';
      const titleWidth = doc.widthOfString(titleText);
      const titleX = (pageW - titleWidth) / 2;
      doc.text(titleText, titleX, y);
      // Underline
      doc.moveTo(titleX, y + 20).lineTo(titleX + titleWidth, y + 20).lineWidth(1).stroke('#000000');
      y += 36;

      // ── "Dear [Owner Name]," ──
      doc.font('Helvetica').fontSize(11);
      doc.text('Dear ', margin, y, { continued: true });
      doc.font('Helvetica-Bold').text(`${data.owner_broker_name || '—'},`, { continued: false });
      y += 22;

      // ── Intro line ──
      doc.font('Helvetica').fontSize(11);
      doc.text('Please find the important details of the transaction below:', margin, y);
      y += 24;

      // ── TABLE ──
      const col1W = 220;
      const col2W = contentW - col1W;
      const cellPadX = 6;
      const cellPadY = 5;
      const fontSize = 10;

      function tableRow(label, value, color) {
        const valStr = value != null && value !== '' && value !== 'null' ? String(value) : '';

        // Measure text height
        doc.font('Helvetica').fontSize(fontSize);
        const labelH = doc.heightOfString(label, { width: col1W - cellPadX * 2 });
        const valH = doc.heightOfString(valStr || ' ', { width: col2W - cellPadX * 2 });
        const rowH = Math.max(labelH, valH) + cellPadY * 2;

        // Check page break
        if (y + rowH > pageH - 80) {
          doc.addPage();
          y = margin;
        }

        // Background for label cell
        doc.rect(margin, y, col1W, rowH).fill(color);
        // White background for value cell
        doc.rect(margin + col1W, y, col2W, rowH).fill(WHITE);

        // Borders
        doc.rect(margin, y, col1W, rowH).lineWidth(0.5).stroke('#999999');
        doc.rect(margin + col1W, y, col2W, rowH).lineWidth(0.5).stroke('#999999');

        // Label text
        doc.fill('#000000').font('Helvetica').fontSize(fontSize);
        doc.text(label, margin + cellPadX, y + cellPadY, { width: col1W - cellPadX * 2 });

        // Value text
        doc.fill('#000000').font('Helvetica').fontSize(fontSize);
        doc.text(valStr, margin + col1W + cellPadX, y + cellPadY, { width: col2W - cellPadX * 2 });

        y += rowH;
      }

      // Format helpers
      const fmtDate = (d) => {
        if (!d) return '';
        try {
          return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return String(d); }
      };

      // Property Info (BLUE)
      tableRow('City', data.city, BLUE);
      tableRow('Society Name', data.society_name, BLUE);
      tableRow('Owner Name', data.owner_broker_name, BLUE);
      tableRow('Co-owner (if any)', data.co_owner, BLUE);
      tableRow('Unit No.', data.unit_no, BLUE);
      tableRow('Floor', data.floor, BLUE);
      tableRow('Configuration', data.configuration, BLUE);
      tableRow('Size (in sqft)', data.area_sqft, BLUE);
      tableRow('Registry Status', data.registry_status, BLUE);
      tableRow('Occupancy Status (Vacant/Tenant)', data.occupancy_status, BLUE);
      tableRow('Inclusions, if any (AC, Furniture, Fixtures etc.)', data.inclusions, BLUE);

      // Sale Terms (BROWN)
      tableRow('Guaranteed Sale Price (in INR Lakhs)', data.guaranteed_sale_price, BROWN);
      tableRow('Performance Guarantee (in INR)', data.performance_guarantee, BROWN);
      tableRow('Willingness to deal on Full Registry Value? (Y/N)', data.full_registry_willingness, BROWN);
      tableRow('Initial Period (in Days)', data.initial_period, BROWN);
      tableRow('Grace Period (in Days)', data.grace_period, BROWN);
      tableRow('Grace Period Alignment', data.grace_period_alignment, BROWN);

      // Loan Details (BLUE)
      tableRow('Outstanding Loan Amount (if any)', data.outstanding_loan, BLUE);
      tableRow('Name of the Bank (with Loan A/c)', data.bank_name_loan, BLUE);
      tableRow('Loan Account Number (LAN)', data.loan_account_number, BLUE);
      tableRow('Willingness to pay Loan on his own? (Y/N)', data.loan_pay_willingness, BLUE);

      // Documents (BLUE)
      tableRow('Seller confirms all required property papers are available? (Allotment Letter, BBA, Possession Letter, Conveyance Deed)', data.papers_available, BLUE);

      // Payment (BROWN)
      tableRow('Bank A/C number', data.bank_account_number, BROWN);
      tableRow('Bank Name', data.bank_name, BROWN);
      tableRow('IFSC Code', data.ifsc_code, BROWN);
      tableRow('Token Paid', data.token_paid, BROWN);
      tableRow('Token Transfer Date', fmtDate(data.token_transfer_date), BROWN);
      tableRow('NEFT Reference No.', data.neft_reference, BROWN);

      // Remarks (BLUE)
      tableRow('Remarks (if any)', data.token_remarks, BLUE);

      // ═══════════════════════════════════════
      // PAGE 2 — Terms and Conditions
      // ═══════════════════════════════════════
      doc.addPage();
      y = margin;

      // Heading: "Terms and Conditions" — bold + underlined
      doc.font('Helvetica-Bold').fontSize(14);
      const tcTitle = 'Terms and Conditions';
      const tcW = doc.widthOfString(tcTitle);
      doc.text(tcTitle, margin, y);
      doc.moveTo(margin, y + 18).lineTo(margin + tcW, y + 18).lineWidth(1).stroke('#000000');
      y += 36;

      // Numbered points in italics
      const terms = [
        'Should any discrepancies/unavailability of required documents arise during the document verification process, Openhouse reserves the right to withhold execution of the agreement. In such an event, the advance token paid will be refunded to Openhouse in full.',
        'All charges related to the Society NOC (No Objection Certificate) shall be the sole responsibility of the seller and must be settled at the time of ownership transfer.',
        'To facilitate maximum visits to your property, Openhouse will install a smart lock on your property for digital access at no cost to you.',
        'Openhouse is committed to facilitating a seamless, transparent, and mutually beneficial transaction. We look forward to partnering with you through every step of this process.',
      ];

      doc.font('Helvetica-Oblique').fontSize(11);

      terms.forEach((term, i) => {
        const numText = `${i + 1}. `;
        const numW = doc.widthOfString(numText);
        const textW = contentW - numW - 10;

        // Measure height for this term
        const termH = doc.heightOfString(term, { width: textW });

        // Check page break (unlikely but safe)
        if (y + termH + 10 > pageH - 80) {
          doc.addPage();
          y = margin;
        }

        // Number
        doc.fill('#000000').text(numText, margin, y, { continued: false, width: numW });

        // Term text (indented)
        doc.text(term, margin + numW + 4, y, { width: textW });

        y += termH + 14;
      });

      // ═══════════════════════════════════════
      // FOOTER on every page
      // ═══════════════════════════════════════
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);

        const footerY = pageH - 65;

        // Line separator
        doc.moveTo(margin, footerY).lineTo(pageW - margin, footerY).lineWidth(0.5).strokeColor('#cccccc').stroke();

        // Company name
        doc.fill('#000000').font('Helvetica-Bold').fontSize(10);
        doc.text('Avano Technologies Private Limited', margin, footerY + 6, {
          width: contentW, align: 'center'
        });

        // Company details
        doc.font('Helvetica').fontSize(8).fillColor('#555555');
        doc.text(
          'CIN: U68200HR2024PTC123116\nVentureX, Unit No. 202 & 202A, Silverton Tower, Sector 50, Golf Course Extension Road, Gurugram, Haryana 122018, India',
          margin, footerY + 20,
          { width: contentW, align: 'center', lineGap: 1 }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateTokenPDF };
