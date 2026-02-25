const PDFDocument = require('pdfkit');

function generateTokenPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        bufferPages: true,
        info: {
          Title: `Token Agreement - ${data.uid}`,
          Author: 'Openhouse',
        },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const pageW = doc.page.width;
      const contentW = pageW - 100;

      // ── Header ──
      doc.rect(0, 0, pageW, 90).fill('#111827');
      doc.fill('#ffffff').fontSize(22).font('Helvetica-Bold').text('OPENHOUSE', 50, 25);
      doc.fontSize(11).font('Helvetica').text('Token Agreement', 50, 52);
      doc.fontSize(9).fillColor('#94a3b8')
         .text(`UID: ${data.uid}  |  Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 50, 68);

      let y = 110;

      const section = (title, fields) => {
        if (y > 720) { doc.addPage(); y = 50; }

        doc.rect(50, y, contentW, 26).fill('#f1f5f9');
        doc.fill('#111827').fontSize(10).font('Helvetica-Bold').text(title, 60, y + 7);
        y += 34;

        fields.forEach(([label, value]) => {
          if (y > 750) { doc.addPage(); y = 50; }
          doc.fill('#64748b').fontSize(8.5).font('Helvetica').text(label, 60, y, { width: 190 });
          doc.fill('#111827').fontSize(9.5).font('Helvetica-Bold')
             .text(String(value ?? '—'), 260, y, { width: 280 });
          y += 20;
        });
        y += 8;
      };

      section('PROPERTY IDENTIFICATION', [
        ['UID', data.uid],
        ['City', data.city],
        ['Locality', data.locality],
        ['Society Name', data.society_name],
        ['Unit No.', data.unit_no],
        ['Floor', data.floor],
        ['Configuration', data.configuration],
        ['Size (sqft)', data.area_sqft],
      ]);

      section('OWNERSHIP', [
        ['Owner / Broker Name', data.owner_broker_name],
        ['Co-owner', data.co_owner],
        ['Registry Status', data.registry_status],
        ['Occupancy Status', data.occupancy_status],
        ['Inclusions', data.inclusions],
      ]);

      section('SALE TERMS', [
        ['Guaranteed Sale Price (₹ Lakhs)', data.guaranteed_sale_price],
        ['Performance Guarantee (₹)', data.performance_guarantee],
        ['Full Registry Value Willingness', data.full_registry_willingness],
        ['Initial Period (Days)', data.initial_period],
        ['Grace Period (Days)', data.grace_period],
        ['Grace Period Alignment', data.grace_period_alignment],
      ]);

      section('LOAN DETAILS', [
        ['Outstanding Loan Amount (₹)', data.outstanding_loan],
        ['Bank Name (Loan A/c)', data.bank_name_loan],
        ['Loan Account Number', data.loan_account_number],
        ['Willing to Pay Loan', data.loan_pay_willingness],
      ]);

      section('DOCUMENTS', [
        ['Papers Available', data.papers_available],
        ['Documents', data.documents_available],
      ]);

      section('PAYMENT', [
        ['Bank A/C Number', data.bank_account_number],
        ['Bank Name', data.bank_name],
        ['IFSC Code', data.ifsc_code],
        ['Token Paid (₹)', data.token_paid],
        ['Transfer Date', data.token_transfer_date ? new Date(data.token_transfer_date).toLocaleDateString('en-IN') : null],
        ['NEFT Reference', data.neft_reference],
      ]);

      if (data.token_remarks) {
        section('REMARKS', [['Remarks', data.token_remarks]]);
      }

      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fill('#94a3b8').fontSize(7).font('Helvetica')
           .text(
             `Openhouse Token Agreement  •  ${data.uid}  •  Page ${i + 1} of ${pageCount}`,
             50, doc.page.height - 30,
             { align: 'center', width: contentW }
           );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateTokenPDF };
