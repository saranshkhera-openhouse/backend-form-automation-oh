const express=require('express'),router=express.Router();
module.exports=function(pool){
  router.get('/prefill/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});res.json(rows[0])}catch(e){res.status(500).json({error:e.message})}
  });
  router.get('/uids',async(_,res)=>{
    try{const{rows}=await pool.query(`SELECT uid,city,society_name,unit_no,tower_no,owner_broker_name FROM properties WHERE schedule_submitted_at IS NOT NULL ORDER BY created_at DESC`);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
  });
  router.post('/submit',async(req,res)=>{
    try{
      const d=req.body;if(!d.uid)return res.status(400).json({error:'UID required'});
      await pool.query(`UPDATE properties SET
        source=$1,demand_price=$2,owner_broker_name=$3,first_name=$4,last_name=$5,contact_no=$6,
        city=$7,locality=$8,society_name=$9,unit_no=$10,tower_no=$11,floor=$12,configuration=$13,area_sqft=$14,
        extra_area=$15,bathrooms=$16,balconies=$17,
        gas_pipeline=$18,parking=$19,furnishing=$20,furnishing_details=$21,
        total_lifts=$22,total_floors_tower=$23,total_flats_floor=$24,
        exit_facing=$25,exit_compass_image=$26,video_link=$27,
        balcony_details=$28,additional_images=$29,
        visit_submitted_at=NOW(),updated_at=NOW()
        WHERE uid=$30`,
        [d.source,parseFloat(d.demand_price)||null,d.owner_broker_name,d.first_name||null,d.last_name||null,d.contact_no,
         d.city,d.locality,d.society_name,d.unit_no,d.tower_no||null,parseInt(d.floor)??null,d.configuration,parseFloat(d.area_sqft)||null,
         d.extra_area||'[]',parseInt(d.bathrooms)??null,parseInt(d.balconies)??null,
         d.gas_pipeline||null,d.parking,d.furnishing||null,d.furnishing_details||'[]',
         parseInt(d.total_lifts)??null,parseInt(d.total_floors_tower)??null,parseInt(d.total_flats_floor)??null,
         d.exit_facing||null,d.exit_compass_image||null,d.video_link||null,
         d.balcony_details||'[]',d.additional_images||'[]',d.uid]);
      res.json({success:true,uid:d.uid});
    }catch(e){console.error('Visit:',e);res.status(500).json({error:e.message})}
  });
  return router;
};
