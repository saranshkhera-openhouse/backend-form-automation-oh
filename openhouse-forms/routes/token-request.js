const express=require('express'),router=express.Router();
module.exports=function(pool){
  router.get('/prefill/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});res.json(rows[0])}catch(e){res.status(500).json({error:e.message})}
  });
  router.get('/uids',async(_,res)=>{
    try{const{rows}=await pool.query(`SELECT uid,city,society_name,unit_no,owner_broker_name,contact_no FROM properties WHERE visit_submitted_at IS NOT NULL ORDER BY created_at DESC`);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
  });
  router.post('/submit',async(req,res)=>{
    try{
      const d=req.body;const isDraft=d.is_draft===true||d.is_draft==='true';
      const{rows}=await pool.query('SELECT uid FROM properties WHERE uid=$1',[d.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      await pool.query(`UPDATE properties SET
        token_amount_requested=$1,co_owner=$2,registry_status=$3,occupancy_status=$4,inclusions=$5,
        initial_period=$6,grace_period=$7,rent_payable_initial_period=$8,rent_payable_grace_period=$9,
        outstanding_loan=$10,bank_name_loan=$11,loan_account_number=$12,loan_pay_willingness=$13,
        papers_available=$14,documents_available=$15,token_remarks=$16,token_is_draft=$17,
        token_submitted_at=CASE WHEN $17=FALSE THEN NOW() ELSE token_submitted_at END,updated_at=NOW()
        WHERE uid=$18`,
        [parseFloat(d.token_amount_requested)||null,d.co_owner||null,d.registry_status||null,d.occupancy_status||null,d.inclusions||null,
         parseInt(d.initial_period)||null,parseInt(d.grace_period)||null,d.rent_payable_initial_period||null,d.rent_payable_grace_period||null,
         parseFloat(d.outstanding_loan)||null,d.bank_name_loan||null,d.loan_account_number||null,d.loan_pay_willingness||null,
         d.papers_available||null,d.documents_available||'[]',d.token_remarks||null,isDraft,d.uid]);
      res.json({success:true,uid:d.uid,draft:isDraft});
    }catch(e){console.error('TokenReq:',e);res.status(500).json({error:e.message})}
  });
  return router;
};
