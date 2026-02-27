const express=require('express'),router=express.Router();
module.exports=function(pool){
  router.get('/prefill/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});res.json(rows[0])}catch(e){res.status(500).json({error:e.message})}
  });
  router.get('/uids',async(_,res)=>{
    try{const{rows}=await pool.query(`SELECT uid,city,society_name,unit_no,owner_broker_name,visit_submitted_at,listing_submitted_at
      FROM properties WHERE visit_submitted_at IS NOT NULL ORDER BY created_at DESC`);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
  });
  router.post('/submit',async(req,res)=>{
    try{
      const d=req.body;const{rows}=await pool.query('SELECT uid FROM properties WHERE uid=$1',[d.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      await pool.query(`UPDATE properties SET
        listing_asking_price=$1,listing_availability=$2,listing_highlights=$3,listing_description=$4,
        listing_submitted_at=NOW(),updated_at=NOW() WHERE uid=$5`,
        [parseFloat(d.listing_asking_price)||null,d.listing_availability||null,d.listing_highlights||null,d.listing_description||null,d.uid]);
      res.json({success:true,uid:d.uid});
    }catch(e){console.error('Listing:',e);res.status(500).json({error:e.message})}
  });
  return router;
};
