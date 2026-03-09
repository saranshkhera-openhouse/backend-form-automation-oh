const express=require('express'),router=express.Router();
module.exports=function(pool){
  router.get('/prefill/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});res.json(rows[0])}catch(e){res.status(500).json({error:e.message})}
  });
  router.get('/uids',async(_,res)=>{
    try{const{rows}=await pool.query(`SELECT uid,city,society_name,unit_no,tower_no,owner_broker_name,visit_submitted_at,listing_submitted_at
      FROM properties WHERE visit_submitted_at IS NOT NULL ORDER BY created_at DESC`);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
  });
  router.post('/submit',async(req,res)=>{
    try{
      const d=req.body;const{rows}=await pool.query('SELECT uid FROM properties WHERE uid=$1',[d.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      await pool.query(`UPDATE properties SET
        listing_asking_price=$1,listing_availability=$2,listing_highlights=$3,listing_description=$4,
        society_age_years=$5,total_units=$6,maintenance_charges=$7,society_move_in_charges=$8,
        electricity_charges=$9,water_supply=$10,dg_charges=$11,alpha_beta=$12,
        loan_status=$13,seller_location=$14,current_occupancy_pct=$15,circle_rate=$16,parking_number=$17,
        club_facility=$18,
        listing_submitted_at=NOW(),updated_at=NOW() WHERE uid=$19`,
        [parseFloat(d.listing_asking_price)||null,d.listing_availability||null,d.listing_highlights||null,d.listing_description||null,
         parseFloat(d.society_age_years)||null,parseInt(d.total_units)||null,parseFloat(d.maintenance_charges)||null,parseFloat(d.society_move_in_charges)||null,
         parseFloat(d.electricity_charges)||null,d.water_supply||null,parseFloat(d.dg_charges)||null,d.alpha_beta||null,
         d.loan_status||null,d.seller_location||null,parseFloat(d.current_occupancy_pct)||null,parseFloat(d.circle_rate)||null,d.parking_number||null,
         d.club_facility||null,d.uid]);
      res.json({success:true,uid:d.uid});
    }catch(e){console.error('Listing:',e);res.status(500).json({error:e.message})}
  });
  return router;
};
