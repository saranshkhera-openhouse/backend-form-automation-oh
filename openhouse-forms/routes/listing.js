const express=require('express'),router=express.Router();
const{visibilityFilter}=require('../utils/visibility');
module.exports=function(pool){
  router.get('/prefill/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      if(!rows[0].final_submitted_at)return res.status(400).json({error:'Key Handover (Form 8) must be submitted first'});
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
        maintenance_charges=$1,society_move_in_charges=$2,
        electricity_charges=$3,dg_charges=$4,
        seller_location=$5,super_area=$6,carpet_area=$7,
        gas_pipeline=$8,club_facility=$9,
        seller_residential_status=$10,sellers_available_on_registry=$11,
        listing_submitted_at=NOW(),updated_at=NOW() WHERE uid=$12`,
        [parseFloat(d.maintenance_charges)||null,parseFloat(d.society_move_in_charges)||null,
         parseFloat(d.electricity_charges)||null,parseFloat(d.dg_charges)||null,
         d.seller_location||null,parseFloat(d.super_area)||null,parseFloat(d.carpet_area)||null,
         d.gas_pipeline||null,d.club_facility||null,
         d.seller_residential_status||null,d.sellers_available_on_registry||null,d.uid]);
      res.json({success:true,uid:d.uid});
    }catch(e){console.error('Listing:',e);res.status(500).json({error:e.message})}
  });
  return router;
};