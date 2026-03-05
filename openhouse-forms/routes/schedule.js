const express=require('express'),router=express.Router();

const CITY_MAP={'Gurgaon':'G','Noida':'N','Ghaziabad':'GH'};
const SRC_MAP={'CP':'C','Direct':'D'};

module.exports=function(pool){

  // Generate next UID: OH{G/N/GH}{C/D}{001...}
  router.get('/next-uid',async(req,res)=>{
    try{
      const{city,source}=req.query;
      if(!city||!source)return res.status(400).json({error:'city and source required'});
      const ci=CITY_MAP[city];const si=SRC_MAP[source];
      if(!ci||!si)return res.status(400).json({error:'Invalid city or source'});
      const prefix=`OH${ci}${si}`;
      // Count existing UIDs with this prefix
      const{rows}=await pool.query(`SELECT COUNT(*) as c FROM properties WHERE uid LIKE $1`,[prefix+'%']);
      const next=parseInt(rows[0].c)+1;
      const uid=prefix+String(next).padStart(4,'0');
      res.json({uid,prefix,next});
    }catch(e){res.status(500).json({error:e.message})}
  });

  router.post('/submit',async(req,res)=>{
    try{
      const d=req.body;if(!d.uid||!d.uid.trim())return res.status(400).json({error:'UID is required'});
      const uid=d.uid.trim().toUpperCase();
      const ex=await pool.query('SELECT uid FROM properties WHERE uid=$1',[uid]);
      if(ex.rows.length)return res.status(400).json({error:'UID already exists'});
      // Combine first+last into owner_broker_name for backward compat
      const ownerName=[d.first_name,d.last_name].filter(Boolean).join(' ');
      await pool.query(`INSERT INTO properties(uid,schedule_date,schedule_time,lead_id,source,first_name,last_name,owner_broker_name,contact_no,
        area_sqft,demand_price,city,society_name,locality,unit_no,tower_no,floor,configuration,assigned_by,field_exec,schedule_submitted_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW())`,
        [uid,d.schedule_date||null,d.schedule_time||null,d.lead_id||null,d.source||null,
         d.first_name||null,d.last_name||null,ownerName||null,d.contact_no||null,
         parseFloat(d.area_sqft)||null,parseFloat(d.demand_price)||null,
         d.city||null,d.society_name||null,d.locality||null,d.unit_no||null,d.tower_no||null,
         parseInt(d.floor)||null,d.configuration||null,d.assigned_by||null,d.field_exec||null]);
      res.json({success:true,uid});
    }catch(e){console.error('Schedule:',e);res.status(500).json({error:e.message})}
  });

  router.get('/uids',async(_,res)=>{
    try{const{rows}=await pool.query(`SELECT uid,city,society_name,unit_no,tower_no,owner_broker_name FROM properties WHERE schedule_submitted_at IS NOT NULL ORDER BY created_at DESC`);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
  });

  return router;
};
