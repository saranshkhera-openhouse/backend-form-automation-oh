const express=require('express'),router=express.Router();
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
        token_amount_requested=$1,
        cheque_image_url=$2,cheque_bank_name=$3,cheque_account_number=$4,cheque_ifsc=$5,
        registry_status=$6,occupancy_status=$7,key_handover_date=$8,
        guaranteed_sale_price=$9,performance_guarantee=$10,
        initial_period=$11,rent_payable_initial_period=$12,
        grace_period=$13,rent_payable_grace_period=$14,
        outstanding_loan=$15,bank_name_loan=$16,loan_account_number=$17,loan_pay_willingness=$18,
        documents_available=$19,token_remarks=$20,token_is_draft=$21,
        token_submitted_at=CASE WHEN $21=FALSE THEN NOW() ELSE token_submitted_at END,updated_at=NOW()
        WHERE uid=$22`,
        [parseFloat(d.token_amount_requested)||null,
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
  return router;
};
