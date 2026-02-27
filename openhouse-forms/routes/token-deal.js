const express=require('express'),router=express.Router();
const{generateTokenPDF}=require('../utils/pdf-generator');
module.exports=function(pool){
  router.get('/prefill/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      const p=rows[0];if(!p.token_submitted_at&&!p.token_is_draft)return res.status(400).json({error:'Token Request must be submitted first'});
      res.json(p)}catch(e){res.status(500).json({error:e.message})}
  });
  router.get('/uids',async(_,res)=>{
    try{const{rows}=await pool.query(`SELECT uid,city,society_name,unit_no,owner_broker_name,token_submitted_at,token_is_draft,token_deal_submitted_at
      FROM properties WHERE token_submitted_at IS NOT NULL OR token_is_draft=TRUE ORDER BY updated_at DESC`);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
  });
  router.post('/submit',async(req,res)=>{
    try{
      const d=req.body;const{rows}=await pool.query('SELECT uid FROM properties WHERE uid=$1',[d.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      const miss=[];if(!d.bank_account_number)miss.push('Bank A/C');if(!d.bank_name)miss.push('Bank Name');
      if(!d.ifsc_code)miss.push('IFSC');if(!d.token_amount_paid)miss.push('Amount Paid');
      if(!d.token_transfer_date)miss.push('Transfer Date');if(!d.neft_reference)miss.push('NEFT Ref');
      if(miss.length)return res.status(400).json({error:`Missing: ${miss.join(', ')}`,missing:miss});
      await pool.query(`UPDATE properties SET
        co_owner=$1,registry_status=$2,occupancy_status=$3,inclusions=$4,
        initial_period=$5,grace_period=$6,rent_payable_initial_period=$7,rent_payable_grace_period=$8,
        outstanding_loan=$9,bank_name_loan=$10,loan_account_number=$11,loan_pay_willingness=$12,
        papers_available=$13,documents_available=$14,token_remarks=$15,
        token_amount_paid=$16,cheque_image_url=$17,bank_account_number=$18,bank_name=$19,ifsc_code=$20,
        token_transfer_date=$21,neft_reference=$22,token_is_draft=FALSE,token_deal_submitted_at=NOW(),updated_at=NOW()
        WHERE uid=$23`,
        [d.co_owner||null,d.registry_status,d.occupancy_status,d.inclusions||null,
         parseInt(d.initial_period)||null,parseInt(d.grace_period)||null,d.rent_payable_initial_period||null,d.rent_payable_grace_period||null,
         parseFloat(d.outstanding_loan)||null,d.bank_name_loan||null,d.loan_account_number||null,d.loan_pay_willingness||null,
         d.papers_available,d.documents_available||'[]',d.token_remarks||null,
         parseFloat(d.token_amount_paid)||null,d.cheque_image_url||null,d.bank_account_number,d.bank_name,d.ifsc_code,
         d.token_transfer_date,d.neft_reference,d.uid]);
      res.json({success:true,uid:d.uid});
    }catch(e){console.error('TokenDeal:',e);res.status(500).json({error:e.message})}
  });
  router.get('/pdf/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'Not found'});
      if(!rows[0].token_deal_submitted_at)return res.status(400).json({error:'Submit form first'});
      const buf=await generateTokenPDF(rows[0]);
      res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`inline; filename=Token_${rows[0].uid}.pdf`);res.send(buf);
    }catch(e){console.error('PDF:',e);res.status(500).json({error:'PDF failed'})}
  });
  return router;
};
