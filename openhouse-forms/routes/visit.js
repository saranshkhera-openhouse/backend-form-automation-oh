const express=require('express'),router=express.Router();
module.exports=function(pool){
  router.get('/prefill/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});res.json(rows[0])}catch(e){res.status(500).json({error:e.message})}
  });
  router.get('/uids',async(_,res)=>{
    try{const{rows}=await pool.query(`SELECT uid,city,society_name,unit_no,owner_broker_name FROM properties WHERE schedule_submitted_at IS NOT NULL ORDER BY created_at DESC`);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
  });
  router.post('/submit',async(req,res)=>{
    try{
      const d=req.body;if(!d.uid)return res.status(400).json({error:'UID required'});
      // Update schedule fields if edited + add visit fields
      await pool.query(`UPDATE properties SET
        source=$1,demand_price=$2,owner_broker_name=$3,contact_no=$4,city=$5,locality=$6,society_name=$7,unit_no=$8,floor=$9,configuration=$10,area_sqft=$11,
        extra_area=$12,bathrooms=$13,balconies=$14,gas_pipeline=$15,possession_status=$16,tentative_handover_date=$17,
        club_facility=$18,parking=$19,sunlight=$20,furnishing=$21,furnishing_details=$22,
        total_lifts=$23,total_floors_tower=$24,total_flats_floor=$25,balcony_details=$26,
        exit_facing=$27,master_bedroom_balcony_facing=$28,master_bedroom_balcony_view=$29,master_bedroom_compass_image=$30,
        second_bedroom_balcony_facing=$31,second_bedroom_balcony_view=$32,second_bedroom_compass_image=$33,
        third_bedroom_balcony_facing=$34,third_bedroom_balcony_view=$35,third_bedroom_compass_image=$36,
        kitchen_balcony_facing=$37,kitchen_balcony_view=$38,
        living_room_balcony1_facing=$39,living_room_balcony1_view=$40,living_room_balcony2_facing=$41,living_room_balcony2_view=$42,
        video_link=$43,additional_images=$44,visit_submitted_at=NOW(),updated_at=NOW()
        WHERE uid=$45`,
        [d.source,parseFloat(d.demand_price)||null,d.owner_broker_name,d.contact_no,d.city,d.locality,d.society_name,d.unit_no,
         parseInt(d.floor)??null,d.configuration,parseFloat(d.area_sqft)||null,d.extra_area||'[]',
         parseInt(d.bathrooms)??null,parseInt(d.balconies)??null,d.gas_pipeline,d.possession_status,d.tentative_handover_date||null,
         d.club_facility,d.parking,parseInt(d.sunlight)||null,d.furnishing,d.furnishing_details||'[]',
         parseInt(d.total_lifts)??null,parseInt(d.total_floors_tower)??null,parseInt(d.total_flats_floor)??null,d.balcony_details||'[]',
         d.exit_facing||null,d.master_bedroom_balcony_facing||null,d.master_bedroom_balcony_view||null,d.master_bedroom_compass_image||null,
         d.second_bedroom_balcony_facing||null,d.second_bedroom_balcony_view||null,d.second_bedroom_compass_image||null,
         d.third_bedroom_balcony_facing||null,d.third_bedroom_balcony_view||null,d.third_bedroom_compass_image||null,
         d.kitchen_balcony_facing||null,d.kitchen_balcony_view||null,
         d.living_room_balcony1_facing||null,d.living_room_balcony1_view||null,d.living_room_balcony2_facing||null,d.living_room_balcony2_view||null,
         d.video_link||null,d.additional_images||'[]',d.uid]);
      res.json({success:true,uid:d.uid});
    }catch(e){console.error('Visit:',e);res.status(500).json({error:e.message})}
  });
  return router;
};
