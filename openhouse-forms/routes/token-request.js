const express=require('express'),router=express.Router();
const{generateReceiptHTML}=require('../utils/pdf-template');
const{sendTokenRequestEmail}=require('../utils/email-sender');

module.exports=function(pool){
  router.get('/prefill/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});res.json(rows[0])}catch(e){res.status(500).json({error:e.message})}
  });
  router.get('/uids',async(_,res)=>{
    try{const{rows}=await pool.query(`SELECT uid,city,society_name,unit_no,tower_no,owner_broker_name,contact_no FROM properties WHERE visit_submitted_at IS NOT NULL ORDER BY created_at DESC`);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
  });
  router.post('/submit',async(req,res)=>{
    try{
      const d=req.body;const isDraft=d.is_draft===true||d.is_draft==='true';
      const{rows}=await pool.query('SELECT uid FROM properties WHERE uid=$1',[d.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      await pool.query(`UPDATE properties SET
        token_requested_by=$1,token_amount_requested=$2,
        cheque_image_url=$3,cheque_bank_name=$4,cheque_account_number=$5,cheque_ifsc=$6,
        registry_status=$7,occupancy_status=$8,key_handover_date=$9,
        guaranteed_sale_price=$10,performance_guarantee=$11,
        initial_period=$12,rent_payable_initial_period=$13,
        grace_period=$14,rent_payable_grace_period=$15,
        outstanding_loan=$16,bank_name_loan=$17,loan_account_number=$18,loan_pay_willingness=$19,
        documents_available=$20,token_remarks=$21,token_is_draft=$22,
        token_submitted_at=CASE WHEN $22=FALSE THEN NOW() ELSE token_submitted_at END,updated_at=NOW()
        WHERE uid=$23`,
        [d.token_requested_by||null,parseFloat(d.token_amount_requested)||null,
         d.cheque_image_url||null,d.cheque_bank_name||null,d.cheque_account_number||null,d.cheque_ifsc||null,
         d.registry_status||null,d.occupancy_status||null,d.key_handover_date||null,
         parseFloat(d.guaranteed_sale_price)||null,parseFloat(d.performance_guarantee)||null,
         parseInt(d.initial_period)||null,d.rent_payable_initial_period||null,
         parseInt(d.grace_period)||null,d.rent_payable_grace_period||null,
         parseFloat(d.outstanding_loan)||null,d.bank_name_loan||null,d.loan_account_number||null,d.loan_pay_willingness||null,
         d.documents_available||'[]',d.token_remarks||null,isDraft,d.uid]);
      res.json({success:true,uid:d.uid,draft:isDraft});
    }catch(e){console.error('TokenReq:',e);res.status(500).json({error:e.message})}
  });

  // PDF preview
  router.get('/pdf/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'Not found'});
      const html=generateReceiptHTML(rows[0],'deal');
      res.setHeader('Content-Type','text/html');res.send(html);
    }catch(e){console.error('TokenReqPDF:',e);res.status(500).json({error:'PDF failed'})}
  });

  // ── Send Token Request Email ──
  router.post('/send-email/:uid',async(req,res)=>{
    try{
      // Get logged-in user's tokens
      const userId=req.user?.id;
      if(!userId)return res.status(401).json({error:'Not authenticated'});
      const{rows:uRows}=await pool.query('SELECT email,google_access_token,google_refresh_token FROM users WHERE id=$1',[userId]);
      if(!uRows.length)return res.status(401).json({error:'User not found'});
      const user=uRows[0];
      if(!user.google_access_token&&!user.google_refresh_token){
        return res.status(400).json({error:'Gmail not authorized. Please log out and log in again to grant email permission.'});
      }

      // Get property data
      const{rows:pRows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!pRows.length)return res.status(404).json({error:'Property not found'});
      if(!pRows[0].token_submitted_at)return res.status(400).json({error:'Token request must be submitted first'});

      // Generate PDF HTML
      const pdfHtml=generateReceiptHTML(pRows[0],'deal');

      // Send email
      const result=await sendTokenRequestEmail({
        accessToken:user.google_access_token,
        refreshToken:user.google_refresh_token,
        fromEmail:user.email,
        property:pRows[0],
        pdfHtml
      });

      console.log(`Email sent for ${req.params.uid} by ${user.email} — msgId: ${result.messageId}`);
      res.json({success:true,messageId:result.messageId});
    }catch(e){
      console.error('SendEmail:',e);
      // If token expired, suggest re-login
      if(e.message?.includes('invalid_grant')||e.message?.includes('Token has been expired')||e.code===401){
        return res.status(401).json({error:'Gmail token expired. Please log out and log in again.'});
      }
      res.status(500).json({error:e.message||'Failed to send email'});
    }
  });

  return router;
};
