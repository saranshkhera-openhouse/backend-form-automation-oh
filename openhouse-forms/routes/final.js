const express=require('express'),router=express.Router();
const{generateReceiptHTML}=require('../utils/pdf-template');
module.exports=function(pool){
  router.get('/prefill/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      const p=rows[0];if(!p.token_deal_submitted_at)return res.status(400).json({error:'Deal Terms must be submitted first'});
      res.json(p)}catch(e){res.status(500).json({error:e.message})}
  });
  router.get('/uids',async(_,res)=>{
    try{const{rows}=await pool.query(`SELECT uid,city,society_name,unit_no,tower_no,owner_broker_name,token_deal_submitted_at,final_submitted_at
      FROM properties WHERE token_deal_submitted_at IS NOT NULL ORDER BY updated_at DESC`);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
  });
  router.post('/submit',async(req,res)=>{
    try{
      const d=req.body;const{rows}=await pool.query('SELECT uid FROM properties WHERE uid=$1',[d.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      const miss=[];
      if(!d.bank_account_number)miss.push('Bank A/C');if(!d.bank_name)miss.push('Bank Name');
      if(!d.ifsc_code)miss.push('IFSC');if(!d.token_transfer_date)miss.push('Transfer Date');if(!d.neft_reference)miss.push('NEFT Ref');
      if(miss.length)return res.status(400).json({error:`Missing: ${miss.join(', ')}`,missing:miss});
      await pool.query(`UPDATE properties SET
        remaining_amount=$1,bank_account_number=$2,bank_name=$3,ifsc_code=$4,
        token_transfer_date=$5,neft_reference=$6,final_submitted_at=NOW(),updated_at=NOW()
        WHERE uid=$7`,
        [parseFloat(d.remaining_amount)||null,d.bank_account_number,d.bank_name,d.ifsc_code,
         d.token_transfer_date,d.neft_reference,d.uid]);
      res.json({success:true,uid:d.uid});
    }catch(e){console.error('Final:',e);res.status(500).json({error:e.message})}
  });
  router.get('/pdf/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'Not found'});
      if(!rows[0].final_submitted_at)return res.status(400).json({error:'Submit form first'});
      const html=generateReceiptHTML(rows[0],'final');
      res.setHeader('Content-Type','text/html');res.send(html);
    }catch(e){console.error('PDF:',e);res.status(500).json({error:'PDF failed'})}
  });
  return router;
};
