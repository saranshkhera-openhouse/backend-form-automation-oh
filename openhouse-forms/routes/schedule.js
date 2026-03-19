const express=require('express'),router=express.Router();
const{notifyVisitScheduled}=require('../utils/whatsapp');

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
      const{rows}=await pool.query(`SELECT MAX(CAST(REPLACE(uid,$1,'') AS INTEGER)) as max_num FROM properties WHERE uid LIKE $2`,[prefix, prefix+'%']);
      const next=(rows[0].max_num||1000)+1;
      const uid=prefix+String(next);
      res.json({uid,prefix,next});
    }catch(e){res.status(500).json({error:e.message})}
  });

  // Check existing properties in a society
  router.get('/society-check',async(req,res)=>{
    try{
      const society=req.query.society;
      if(!society)return res.json([]);
      const{rows}=await pool.query('SELECT uid,unit_no,tower_no,floor,area_sqft,configuration FROM properties WHERE society_name=$1 AND is_dead IS NOT TRUE ORDER BY created_at DESC',[society]);
      res.json(rows);
    }catch(e){res.status(500).json({error:e.message})}
  });

  // Get busy slots for a field exec on a given date
  router.get('/busy-slots',async(req,res)=>{
    try{
      const{field_exec,date}=req.query;
      if(!field_exec||!date)return res.json([]);
      const{rows}=await pool.query(
        `SELECT schedule_time,uid,society_name,unit_no,tower_no FROM properties
         WHERE field_exec=$1 AND schedule_date=$2 AND is_dead IS NOT TRUE
         ORDER BY schedule_time ASC`,[field_exec,date]);
      // Return busy hours (extract hour from each time)
      const slots=rows.map(r=>{
        const hr=r.schedule_time?parseInt(r.schedule_time.split(':')[0]):null;
        return{hour:hr,time:r.schedule_time,uid:r.uid,society:r.society_name,unit:r.unit_no,tower:r.tower_no};
      }).filter(s=>s.hour!==null);
      res.json(slots);
    }catch(e){res.status(500).json({error:e.message})}
  });

  router.post('/submit',async(req,res)=>{
    try{
      const d=req.body;if(!d.uid||!d.uid.trim())return res.status(400).json({error:'UID is required'});
      const uid=d.uid.trim().toUpperCase();
      const ex=await pool.query('SELECT uid FROM properties WHERE uid=$1',[uid]);
      if(ex.rows.length)return res.status(400).json({error:'UID already exists'});
      // Reject past dates
      if(d.schedule_date){const today=new Date().toISOString().split('T')[0];
        if(d.schedule_date<today)return res.status(400).json({error:'Schedule date cannot be in the past'})}
      // Check slot conflict (each visit blocks actual_time → actual_time + 60 min)
      if(d.field_exec&&d.schedule_date&&d.schedule_time){
        const[sh,sm]=d.schedule_time.split(':').map(Number);const selMin=sh*60+sm;
        const{rows:busy}=await pool.query(
          `SELECT schedule_time FROM properties WHERE field_exec=$1 AND schedule_date=$2 AND is_dead IS NOT TRUE`,
          [d.field_exec,d.schedule_date]);
        const windows=busy.map(r=>{const[h,m]=r.schedule_time.split(':').map(Number);const s=h*60+m;return{start:s,end:s+60}});
        const newEnd=selMin+60;
        const hit=windows.find(w=>selMin<w.end&&newEnd>w.start);
        if(hit){
          // Find next free minute where a 60-min visit fits without overlap
          let next=hit.end;
          let safe=false;while(!safe&&next<=20*60-60){safe=true;for(const w of windows){if(next<w.end&&(next+60)>w.start){next=w.end;safe=false;break}}}
          const nh=Math.floor(next/60),nm=next%60;
          const nextStr=next<=20*60-60?`${nh>12?nh-12:nh===0?12:nh}:${String(nm).padStart(2,'0')} ${nh>=12?'PM':'AM'}`:'No slots today';
          return res.status(400).json({error:`This slot is busy for ${d.field_exec}. Next free: ${nextStr}`});
        }
      }
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
      // Fire-and-forget WhatsApp notification to assigned_to
      notifyVisitScheduled({uid,...d,owner_broker_name:ownerName}).catch(e=>console.error('WA schedule notify error:',e));
    }catch(e){console.error('Schedule:',e);res.status(500).json({error:e.message})}
  });

  router.get('/uids',async(_,res)=>{
    try{const{rows}=await pool.query(`SELECT uid,city,society_name,unit_no,tower_no,owner_broker_name FROM properties WHERE schedule_submitted_at IS NOT NULL ORDER BY created_at DESC`);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
  });

  return router;
};