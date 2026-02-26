const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const BLUE = '#BDD7EE', BROWN = '#FCE4D6';
const LOGO = path.join(__dirname, '..', 'public', 'images', 'logo.png');

function generateTokenPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin:36, size:'A4', bufferPages:true,
        info:{ Title:`Token Payment Receipt - ${data.uid}`, Author:'Avano Technologies Private Limited' }});
      const buf=[]; doc.on('data',c=>buf.push(c)); doc.on('end',()=>resolve(Buffer.concat(buf)));
      const M=36, W=doc.page.width, H=doc.page.height, CW=W-M*2, FH=52, maxY=H-M-FH;
      const logo=fs.existsSync(LOGO);
      const safe=v=>(v!=null&&v!==''&&String(v)!=='null')?String(v):'';
      const fDate=d=>{try{return d?new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):''}catch{return String(d)}};

      let y=M;
      if(logo)doc.image(LOGO,W-M-72,M,{width:72});
      doc.font('Helvetica-Bold').fontSize(15).fill('#000');
      const t='Token Payment Receipt',tw=doc.widthOfString(t),tx=(W-tw)/2;
      y+=logo?10:0; doc.text(t,tx,y);
      doc.moveTo(tx,y+18).lineTo(tx+tw,y+18).lineWidth(0.8).stroke('#000'); y+=30;
      doc.font('Helvetica').fontSize(10).fill('#000');
      doc.text('Dear ',M,y,{continued:true});
      doc.font('Helvetica-Bold').text(`${data.owner_broker_name||'—'},`); y+=16;
      doc.font('Helvetica').fontSize(10).text('Please find the important details of the transaction below:',M,y); y+=18;

      const rows=[];const p=(l,v,c)=>rows.push([l,v,c]);
      p('City',data.city,BLUE); p('Society Name',data.society_name,BLUE);
      p('Owner Name',data.owner_broker_name,BLUE); p('Co-owner (if any)',data.co_owner,BLUE);
      p('Unit No.',data.unit_no,BLUE); p('Floor',data.floor,BLUE);
      p('Configuration',data.configuration,BLUE); p('Size (in sqft)',data.area_sqft,BLUE);
      p('Registry Status',data.registry_status,BLUE);
      p('Occupancy Status (Vacant/Tenant)',data.occupancy_status,BLUE);
      p('Inclusions, if any (AC, Furniture, Fixtures etc.)',data.inclusions,BLUE);
      p('Guaranteed Sale Price (in INR Lakhs)',data.guaranteed_sale_price,BROWN);
      p('Performance Guarantee (in INR)',data.performance_guarantee,BROWN);
      p('Willingness to deal on Full Registry Value? (Y/N)',data.full_registry_willingness,BROWN);
      p('Initial Period (in Days)',data.initial_period,BROWN);
      p('Grace Period (in Days)',data.grace_period,BROWN);
      const rpp=safe(data.rent_payable_period);
      if(rpp&&rpp.toUpperCase()!=='N/A')p('Rent Payable During Period',rpp,BROWN);
      const rpg=safe(data.rent_payable_grace_period);
      if(rpg&&rpg.toUpperCase()!=='N/A')p('Rent Payable During Grace Period',rpg,BROWN);
      p('Outstanding Loan Amount (if any)',data.outstanding_loan,BLUE);
      p('Name of the Bank (with Loan A/c)',data.bank_name_loan,BLUE);
      p('Loan Account Number (LAN)',data.loan_account_number,BLUE);
      p('Willingness to pay Loan on his own? (Y/N)',data.loan_pay_willingness,BLUE);
      p('Seller confirms all required property papers are available? (Allotment Letter, BBA, Possession Letter, Conveyance Deed)',data.papers_available,BLUE);
      p('Bank A/C number',data.bank_account_number,BROWN);
      p('Bank Name',data.bank_name,BROWN); p('IFSC Code',data.ifsc_code,BROWN);
      p('Token Paid',data.token_paid,BROWN);
      p('Token Transfer Date',fDate(data.token_transfer_date),BROWN);
      p('NEFT Reference No.',data.neft_reference,BROWN);
      p('Remarks (if any)',data.token_remarks,BLUE);

      const c1=210,c2=CW-c1,px=5,py=4;
      let fs2=9.5;
      const meas=sz=>{let h=0;doc.font('Helvetica').fontSize(sz);for(const[l,v]of rows){h+=Math.max(doc.heightOfString(l,{width:c1-px*2}),doc.heightOfString(safe(v)||' ',{width:c2-px*2}))+py*2}return h};
      while(meas(fs2)>maxY-y&&fs2>7)fs2-=0.25;

      for(const[label,value,color]of rows){
        doc.font('Helvetica').fontSize(fs2);
        const vs=safe(value),lh=doc.heightOfString(label,{width:c1-px*2}),vh=doc.heightOfString(vs||' ',{width:c2-px*2}),rh=Math.max(lh,vh)+py*2;
        doc.save();doc.rect(M,y,c1,rh).fill(color);doc.rect(M+c1,y,c2,rh).fill('#FFF');doc.restore();
        doc.rect(M,y,c1,rh).lineWidth(0.4).stroke('#999');doc.rect(M+c1,y,c2,rh).lineWidth(0.4).stroke('#999');
        doc.fill('#000').font('Helvetica').fontSize(fs2);
        doc.text(label,M+px,y+py,{width:c1-px*2});doc.text(vs,M+c1+px,y+py,{width:c2-px*2});
        y+=rh;
      }

      // PAGE 2
      doc.addPage(); y=M;
      doc.font('Helvetica-Bold').fontSize(14).fill('#000');
      const tc='Terms and Conditions',tcw=doc.widthOfString(tc);
      doc.text(tc,M,y); doc.moveTo(M,y+18).lineTo(M+tcw,y+18).lineWidth(0.8).stroke('#000'); y+=36;
      const terms=[
        'Should any discrepancies/unavailability of required documents arise during the document verification process, Openhouse reserves the right to withhold execution of the agreement. In such an event, the advance token paid will be refunded to Openhouse in full.',
        'All charges related to the Society NOC (No Objection Certificate) shall be the sole responsibility of the seller and must be settled at the time of ownership transfer.',
        'To facilitate maximum visits to your property, Openhouse will install a smart lock on your property for digital access at no cost to you.',
        'Openhouse is committed to facilitating a seamless, transparent, and mutually beneficial transaction. We look forward to partnering with you through every step of this process.',
      ];
      doc.font('Helvetica-Oblique').fontSize(11);
      terms.forEach((tm,i)=>{doc.fill('#000').text(`${i+1}. `,M,y,{continued:false});const h=doc.heightOfString(tm,{width:CW-20});doc.text(tm,M+20,y,{width:CW-20});y+=h+16});

      // FOOTER
      const pc=doc.bufferedPageRange().count;
      for(let i=0;i<pc;i++){doc.switchToPage(i);const fy=H-M-FH+8;
        doc.moveTo(M,fy).lineTo(W-M,fy).lineWidth(0.4).strokeColor('#ccc').stroke();
        doc.fill('#000').font('Helvetica-Bold').fontSize(9).text('Avano Technologies Private Limited',M,fy+5,{width:CW,align:'center'});
        doc.font('Helvetica').fontSize(7.5).fill('#555').text('CIN: U68200HR2024PTC123116\nVentureX, Unit No. 202 & 202A, Silverton Tower, Sector 50, Golf Course Extension Road, Gurugram, Haryana 122018, India',M,fy+18,{width:CW,align:'center',lineGap:1})
      }
      doc.end();
    } catch(e){reject(e)}
  });
}
module.exports={generateTokenPDF};
