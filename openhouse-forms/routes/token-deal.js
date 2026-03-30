const express=require('express'),router=express.Router();
const{generateReceiptHTML}=require('../utils/pdf-template');
const{sendDealTermsEmail}=require('../utils/email-sender');
const{visibilityFilter}=require('../utils/visibility');
const{NAME_TO_PHONE}=require('../utils/whatsapp');

module.exports=function(pool){
  router.get('/prefill/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      const p=rows[0];if(!p.token_submitted_at&&!p.token_is_draft)return res.status(400).json({error:'Token Request must be submitted first'});
      res.json(p)}catch(e){res.status(500).json({error:e.message})}
  });
  router.get('/uids',async(req,res)=>{
    try{const vis=visibilityFilter(req.user);const{rows}=await pool.query(`SELECT uid,city,society_name,unit_no,tower_no,owner_broker_name,token_submitted_at,token_is_draft,token_deal_submitted_at
      FROM properties WHERE (token_submitted_at IS NOT NULL OR token_is_draft=TRUE) AND is_dead IS NOT TRUE${vis.clause} ORDER BY updated_at DESC`,vis.params);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
  });
  router.post('/submit',async(req,res)=>{
    try{
      const d=req.body;const{rows}=await pool.query('SELECT uid FROM properties WHERE uid=$1',[d.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      if(!d.deal_token_amount)return res.status(400).json({error:'Token amount required'});
      await pool.query(`UPDATE properties SET deal_token_amount=$1,
        deal_bank_name=$2,deal_bank_account_number=$3,deal_ifsc_code=$4,deal_transfer_date=$5,deal_neft_reference=$6,
        owner_email=$8,co_owner_email=$9,co_owner_number=$10,third_owner_email=$11,broker_email=$12,
        token_is_draft=FALSE,token_deal_submitted_at=NOW(),updated_at=NOW() WHERE uid=$7`,
        [parseFloat(d.deal_token_amount)||null,
         d.deal_bank_name||null,d.deal_bank_account_number||null,d.deal_ifsc_code||null,d.deal_transfer_date||null,(d.deal_neft_reference||'').toUpperCase()||null,
         d.uid,d.owner_email||null,d.co_owner_email||null,d.co_owner_number||null,d.third_owner_email||null,d.broker_email||null]);
      res.json({success:true,uid:d.uid});
    }catch(e){console.error('TokenDeal:',e);res.status(500).json({error:e.message})}
  });
  router.get('/pdf/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'Not found'});
      if(!rows[0].token_deal_submitted_at)return res.status(400).json({error:'Submit deal terms first'});
      const html=generateReceiptHTML(rows[0],'deal');
      res.setHeader('Content-Type','text/html');res.send(html);
    }catch(e){console.error('DealPDF:',e);res.status(500).json({error:'Failed'})}
  });
  router.post('/send-email/:uid',async(req,res)=>{
    try{
      const userId=req.user?.id;
      if(!userId)return res.status(401).json({error:'Not authenticated'});
      const{rows:uRows}=await pool.query('SELECT email,name,google_access_token,google_refresh_token FROM users WHERE id=$1',[userId]);
      if(!uRows.length)return res.status(401).json({error:'User not found'});
      const user=uRows[0];
      if(!user.google_access_token&&!user.google_refresh_token){
        return res.status(400).json({error:'Gmail not authorized. Please log out and log in again.'});
      }
      const{rows:pRows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!pRows.length)return res.status(404).json({error:'Property not found'});
      if(!pRows[0].token_deal_submitted_at)return res.status(400).json({error:'Deal terms must be submitted first'});
      const p=pRows[0];
      if(!p.owner_email)return res.status(400).json({error:'Owner email is required to send'});
      const baseUrl=process.env.APP_URL||'';
      const pdfHtml=generateReceiptHTML(p,'deal',baseUrl);
      const signatoryName=user.name||user.email.split('@')[0];
      let signatoryPhone='';
      for(const[name,phone]of Object.entries(NAME_TO_PHONE)){
        if(name.toLowerCase()===signatoryName.toLowerCase()||signatoryName.toLowerCase().includes(name.toLowerCase())){signatoryPhone=phone;break}
      }
      const result=await sendDealTermsEmail({
        accessToken:user.google_access_token,refreshToken:user.google_refresh_token,
        fromEmail:user.email,property:p,pdfHtml,signatoryName,signatoryPhone
      });
      console.log(`Deal email sent for ${req.params.uid} by ${user.email} — msgId: ${result.messageId}`);
      res.json({success:true,messageId:result.messageId});
    }catch(e){
      console.error('DealEmail:',e);
      if(e.message?.includes('invalid_grant')||e.message?.includes('Token has been expired')||e.code===401){
        return res.status(401).json({error:'Gmail token expired. Please log out and log in again.'});
      }
      res.status(500).json({error:e.message||'Failed to send email'});
    }
  });
  return router;
};
