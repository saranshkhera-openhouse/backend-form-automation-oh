const express=require('express'),router=express.Router();
module.exports=function(pool){
  router.post('/submit',async(req,res)=>{
    try{
      const d=req.body;if(!d.uid||!d.uid.trim())return res.status(400).json({error:'UID is required'});
      const uid=d.uid.trim().toUpperCase();
      const ex=await pool.query('SELECT uid FROM properties WHERE uid=$1',[uid]);
      if(ex.rows.length)return res.status(400).json({error:'UID already exists'});
      await pool.query(`INSERT INTO properties(uid,schedule_date,schedule_time,lead_id,source,owner_broker_name,contact_no,area_sqft,demand_price,city,society_name,locality,unit_no,floor,configuration,field_exec,schedule_submitted_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())`,
        [uid,d.schedule_date||null,d.schedule_time||null,d.lead_id||null,d.source||null,d.owner_broker_name||null,d.contact_no||null,
         parseFloat(d.area_sqft)||null,parseFloat(d.demand_price)||null,d.city||null,d.society_name||null,d.locality||null,d.unit_no||null,parseInt(d.floor)||null,d.configuration||null,d.field_exec||null]);
      res.json({success:true,uid});
    }catch(e){console.error('Schedule:',e);res.status(500).json({error:e.message})}
  });
  router.get('/uids',async(_,res)=>{
    try{const{rows}=await pool.query(`SELECT uid,city,society_name,unit_no,owner_broker_name FROM properties WHERE schedule_submitted_at IS NOT NULL ORDER BY created_at DESC`);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
  });
  return router;
};
