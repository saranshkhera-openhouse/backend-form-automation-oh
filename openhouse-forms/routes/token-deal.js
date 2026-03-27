const express=require('express'),router=express.Router();
const{generateReceiptHTML}=require('../utils/pdf-template');
const{visibilityFilter}=require('../utils/visibility');
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
        owner_email=$8,co_owner_email=$9,
        token_is_draft=FALSE,token_deal_submitted_at=NOW(),updated_at=NOW() WHERE uid=$7`,
        [parseFloat(d.deal_token_amount)||null,
         d.deal_bank_name||null,d.deal_bank_account_number||null,d.deal_ifsc_code||null,d.deal_transfer_date||null,(d.deal_neft_reference||'').toUpperCase()||null,
         d.uid,d.owner_email||null,d.co_owner_email||null]);
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
  return router;
};
