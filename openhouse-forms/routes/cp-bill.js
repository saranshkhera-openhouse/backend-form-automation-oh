const express=require('express'),router=express.Router();
const{visibilityFilter}=require('../utils/visibility');
const{sendCPBillEmail}=require('../utils/email-sender');

module.exports=function(pool){
  router.get('/prefill/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      const p=rows[0];if(!p.final_submitted_at)return res.status(400).json({error:'PSD (Form 5) must be submitted first'});
      res.json(p)}catch(e){res.status(500).json({error:e.message})}
  });
  router.get('/uids',async(req,res)=>{
    try{const vis=visibilityFilter(req.user);const{rows}=await pool.query(`SELECT uid,city,society_name,unit_no,tower_no,owner_broker_name,final_submitted_at,cp_bill_submitted_at
      FROM properties WHERE final_submitted_at IS NOT NULL AND is_dead IS NOT TRUE${vis.clause} ORDER BY updated_at DESC`,vis.params);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
  });
  router.post('/submit',async(req,res)=>{
    try{
      const d=req.body;const{rows}=await pool.query('SELECT uid FROM properties WHERE uid=$1',[d.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      await pool.query(`UPDATE properties SET
        cp_name=$1,cp_phone=$2,cp_firm=$3,cp_email=$4,
        deal_type=$5,oh_acquired_model=$6,agreed_brokerage=$7,
        deal_value=$8,total_brokerage_amount=$9,
        incentive_visit=$10,incentive_owner_meeting=$11,total_cp_amount=$12,
        cp_aadhaar_front_url=$13,cp_aadhaar_back_url=$14,
        cp_pan_card_url=$15,cp_cancelled_cheque_url=$16,cp_ama_signed_url=$17,
        cp_bill_submitted_at=NOW(),updated_at=NOW()
        WHERE uid=$18`,
        [d.cp_name||null,d.cp_phone||null,d.cp_firm||null,d.cp_email||null,
         d.deal_type||null,d.oh_acquired_model||null,d.agreed_brokerage||null,
         d.deal_value||null,d.total_brokerage_amount||null,
         d.incentive_visit||null,d.incentive_owner_meeting||null,d.total_cp_amount||null,
         d.cp_aadhaar_front_url||null,d.cp_aadhaar_back_url||null,
         d.cp_pan_card_url||null,d.cp_cancelled_cheque_url||null,d.cp_ama_signed_url||null,
         d.uid]);
      res.json({success:true,uid:d.uid});
    }catch(e){console.error('CPBill:',e);res.status(500).json({error:e.message})}
  });
  router.post('/send-email/:uid',async(req,res)=>{
    try{
      const userId=req.user?.id;
      if(!userId)return res.status(401).json({error:'Not authenticated'});
      // Check admin or manager
      const{rows:uRows}=await pool.query('SELECT email,name,is_admin,is_manager,google_access_token,google_refresh_token FROM users WHERE id=$1',[userId]);
      if(!uRows.length)return res.status(401).json({error:'User not found'});
      const user=uRows[0];
      if(!user.is_admin&&!user.is_manager)return res.status(403).json({error:'Only admins and managers can send CP bill emails'});
      if(!user.google_access_token&&!user.google_refresh_token){
        return res.status(400).json({error:'Gmail not authorized. Please log out and log in again.'});
      }
      const{rows:pRows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!pRows.length)return res.status(404).json({error:'Property not found'});
      if(!pRows[0].cp_bill_submitted_at)return res.status(400).json({error:'CP Bill form must be submitted first'});
      const result=await sendCPBillEmail({
        accessToken:user.google_access_token,refreshToken:user.google_refresh_token,
        fromEmail:user.email,senderName:user.name||user.email,property:pRows[0]
      });
      console.log(`CP Bill email sent for ${req.params.uid} by ${user.email} — msgId: ${result.messageId}`);
      res.json({success:true,messageId:result.messageId});
    }catch(e){
      console.error('CPBillEmail:',e);
      if(e.message?.includes('invalid_grant')||e.message?.includes('Token has been expired')||e.code===401){
        return res.status(401).json({error:'Gmail token expired. Please log out and log in again.'});
      }
      res.status(500).json({error:e.message||'Failed to send email'});
    }
  });
  return router;
};
