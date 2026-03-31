const express=require('express'),router=express.Router();
const{visibilityFilter}=require('../utils/visibility');
const{notifyAMASubmitted}=require('../utils/whatsapp');

module.exports=function(pool){
  router.get('/prefill/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      const p=rows[0];if(!p.token_deal_submitted_at)return res.status(400).json({error:'Deal Terms (Form 4) must be submitted first'});
      res.json(p)}catch(e){res.status(500).json({error:e.message})}
  });
  router.get('/uids',async(req,res)=>{
    try{const vis=visibilityFilter(req.user);const{rows}=await pool.query(`SELECT uid,city,society_name,unit_no,tower_no,owner_broker_name,token_deal_submitted_at,ama_submitted_at
      FROM properties WHERE token_deal_submitted_at IS NOT NULL AND is_dead IS NOT TRUE${vis.clause} ORDER BY updated_at DESC`,vis.params);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
  });
  router.post('/submit',async(req,res)=>{
    try{
      const d=req.body;const{rows}=await pool.query('SELECT uid FROM properties WHERE uid=$1',[d.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      await pool.query(`UPDATE properties SET
        ama_sanction_url=$1,ama_soa_url=$2,ama_lod_url=$3,
        ama_pg_non_forfeitable=$4,ama_beta_max_pct=$5,ama_beta_min_pct=$6,
        ama_maint_alignment=$7,ama_elec_alignment=$8,ama_special_terms=$9,
        ama_prop_docs=$10,
        ama_submitted_at=NOW(),updated_at=NOW()
        WHERE uid=$11`,
        [d.ama_sanction_url||null,d.ama_soa_url||null,d.ama_lod_url||null,
         d.ama_pg_non_forfeitable||null,parseFloat(d.ama_beta_max_pct)||null,parseFloat(d.ama_beta_min_pct)||null,
         d.ama_maint_alignment||null,d.ama_elec_alignment||null,d.ama_special_terms||null,
         d.ama_prop_docs||'{}',
         d.uid]);
      res.json({success:true,uid:d.uid});
      // Fire-and-forget WhatsApp notification
      pool.query('SELECT * FROM properties WHERE uid=$1',[d.uid]).then(({rows})=>{
        if(rows[0])notifyAMASubmitted(rows[0]).catch(e=>console.error('WA AMA notify error:',e));
      }).catch(e=>console.error('WA AMA fetch error:',e));
    }catch(e){console.error('AMA:',e);res.status(500).json({error:e.message})}
  });
  return router;
};