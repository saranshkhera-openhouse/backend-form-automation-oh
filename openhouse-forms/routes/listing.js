const express=require('express'),router=express.Router();
const{visibilityFilter}=require('../utils/visibility');
module.exports=function(pool){
  router.get('/prefill/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      if(!rows[0].final_submitted_at)return res.status(400).json({error:'PSD (Form 6) must be submitted first'});
      res.json(rows[0])}catch(e){res.status(500).json({error:e.message})}
  });
  router.get('/uids',async(req,res)=>{
    try{const vis=visibilityFilter(req.user);const{rows}=await pool.query(`SELECT uid,city,society_name,unit_no,tower_no,owner_broker_name,final_submitted_at,listing_submitted_at
      FROM properties WHERE final_submitted_at IS NOT NULL AND is_dead IS NOT TRUE${vis.clause} ORDER BY created_at DESC`,vis.params);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
  });
  router.post('/submit',async(req,res)=>{
    try{
      const d=req.body;const{rows}=await pool.query('SELECT uid FROM properties WHERE uid=$1',[d.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      await pool.query(`UPDATE properties SET
        society_age_years=$1,maintenance_charges=$2,society_move_in_charges=$3,
        electricity_charges=$4,dg_charges=$5,parking_number=$6,
        seller_location=$7,super_area=$8,carpet_area=$9,
        gas_pipeline=$10,club_facility=$11,
        listing_submitted_at=NOW(),updated_at=NOW() WHERE uid=$12`,
        [parseFloat(d.society_age_years)||null,parseFloat(d.maintenance_charges)||null,parseFloat(d.society_move_in_charges)||null,
         parseFloat(d.electricity_charges)||null,parseFloat(d.dg_charges)||null,d.parking_number||null,
         d.seller_location||null,parseFloat(d.super_area)||null,parseFloat(d.carpet_area)||null,
         d.gas_pipeline||null,d.club_facility||null,d.uid]);
      res.json({success:true,uid:d.uid});
    }catch(e){console.error('Listing:',e);res.status(500).json({error:e.message})}
  });
  return router;
};
