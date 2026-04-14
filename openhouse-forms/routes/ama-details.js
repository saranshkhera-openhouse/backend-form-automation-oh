const express=require('express'),router=express.Router();
const logger=require('../utils/logger');
const{visibilityFilter}=require('../utils/visibility');
const{notifyAMASubmitted}=require('../utils/whatsapp');

/** Fields forwarded to Core for Home + Seller creation (explicit allow-list). */
function buildCorePayload(row){
  return{
    supply_form_uid:row.uid,
    uid:row.uid,
    city:row.city,
    locality:row.locality,
    society_name:row.society_name,
    tower_no:row.tower_no,
    unit_no:row.unit_no,
    floor:row.floor,
    configuration:row.configuration,
    area_sqft:row.area_sqft,
    bathrooms:row.bathrooms,
    society_age_years:row.society_age_years,
    owner_broker_name:row.owner_broker_name,
    first_name:row.first_name,
    last_name:row.last_name,
    contact_no:row.contact_no,
    listing_asking_price:row.listing_asking_price,
    demand_price:0,
  };
}

module.exports=function(pool){
  router.get('/prefill/:uid',async(req,res)=>{
    try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
      if(!rows.length)return res.status(404).json({error:'UID not found'});
      const p=rows[0];if(!p.token_deal_submitted_at)return res.status(400).json({error:'Deal Terms (Form 4) must be submitted first'});
      res.json(p)}catch(e){res.status(500).json({error:e.message})}
  });
  router.get('/uids',async(req,res)=>{
    try{const vis=visibilityFilter(req.user);const{rows}=await pool.query(`SELECT uid,city,society_name,unit_no,tower_no,owner_broker_name,token_deal_submitted_at,ama_submitted_at
      FROM properties WHERE token_deal_submitted_at IS NOT NULL AND is_dead IS NOT TRUE AND is_token_refunded IS NOT TRUE${vis.clause} ORDER BY updated_at DESC`,vis.params);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
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
        loan_applicant_name=COALESCE($12,loan_applicant_name),loan_co_applicant_name=COALESCE($13,loan_co_applicant_name),
        bank_name_loan=COALESCE($14,bank_name_loan),loan_account_number=COALESCE($15,loan_account_number),
        outstanding_loan=COALESCE($16,outstanding_loan),loan_pay_willingness=COALESCE($17,loan_pay_willingness),
        ama_submitted_at=NOW(),updated_at=NOW()
        WHERE uid=$11`,
        [d.ama_sanction_url||null,d.ama_soa_url||null,d.ama_lod_url||null,
         d.ama_pg_non_forfeitable||null,parseFloat(d.ama_beta_max_pct)||null,parseFloat(d.ama_beta_min_pct)||null,
         d.ama_maint_alignment||null,d.ama_elec_alignment||null,d.ama_special_terms||null,
         d.ama_prop_docs||'{}',
         d.uid,
         d.loan_applicant_name||null,d.loan_co_applicant_name||null,
         d.bank_name_loan||null,d.loan_account_number||null,
         parseFloat(d.outstanding_loan)||null,d.loan_pay_willingness||null]);
      res.json({success:true,uid:d.uid});
      logger.logFormSubmit(d.uid,'ama_details_submitted',5,req.user?.email,req.user?.name).catch(()=>{});
      pool.query('SELECT * FROM properties WHERE uid=$1',[d.uid]).then(({rows})=>{
        if(rows[0])notifyAMASubmitted(rows[0],null,{email:req.user?.email,name:req.user?.name}).catch(e=>console.error('WA AMA notify error:',e));
      }).catch(e=>console.error('WA AMA fetch error:',e));
    }catch(e){console.error('AMA:',e);res.status(500).json({error:e.message})}
  });

  router.post('/create-seller-dashboard',async(req,res)=>{
    const tag='[ama-details/create-seller-dashboard]';
    try{
      const uid=(req.body&&req.body.uid)?String(req.body.uid).trim():'';
      if(!uid){
        console.warn(tag,'reject: missing uid');
        return res.status(400).json({error:'uid is required'});
      }
      console.log(tag,'start',{uid,userEmail:req.user&&req.user.email});

      const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[uid]);
      if(!rows.length){
        console.warn(tag,'reject: uid not found',{uid});
        return res.status(404).json({error:'UID not found'});
      }
      const p=rows[0];
      if(!p.token_deal_submitted_at){
        console.warn(tag,'reject: token deal not submitted',{uid});
        return res.status(400).json({error:'Deal Terms (Form 4) must be submitted first'});
      }
      if(p.core_home_id){
        console.log(tag,'idempotent: core_home_id already set',{uid,core_home_id:p.core_home_id});
        return res.status(200).json({
          message:'Seller dashboard already linked',
          idempotent:true,
          home_id:p.core_home_id,
          uid,
        });
      }

      const coreBase=(process.env.CORE_API_BASE_URL||'').replace(/\/$/,'');
      const apiKey=(process.env.SUPPLY_FORM_API_KEY||'').trim();
      if(!coreBase||!apiKey){
        console.error(tag,'misconfigured: CORE_API_BASE_URL or SUPPLY_FORM_API_KEY missing');
        return res.status(503).json({error:'Core integration not configured on this server'});
      }

      const payload=buildCorePayload(p);
      console.log(tag,'initial_payload_to_core',JSON.stringify(payload));

      const url=`${coreBase}/api/v1/oh/supply-form/create-home/`;
      const r=await fetch(url,{
        method:'POST',
        headers:{'Content-Type':'application/json','X-Supply-Form-Key':apiKey},
        body:JSON.stringify(payload),
      });
      let j={};
      try{j=await r.json();}catch(_){}
      console.log(tag,'core_response',{status:r.status,bodyPreview:JSON.stringify(j).slice(0,4000)});

      const homeId=j.home_id??j.homeId??(j.home&&(j.home.id??j.homeId));
      if(r.ok&&homeId!=null){
        await pool.query('UPDATE properties SET core_home_id=$1,updated_at=NOW() WHERE uid=$2',[homeId,uid]);
        console.log(tag,'stored core_home_id',{uid,homeId});
      }else if(r.status===200&&(j.idempotent||j.idempotent===true)&&homeId!=null){
        await pool.query('UPDATE properties SET core_home_id=$1,updated_at=NOW() WHERE uid=$2',[homeId,uid]);
      }

      if(!r.ok){
        return res.status(r.status).json({
          error:j.error||j.message||'Core request failed',
          details:j.details||j,
          trace:j.trace,
        });
      }
      return res.status(r.status).json({...j,uid});
    }catch(e){
      console.error(tag,'exception',e);
      return res.status(500).json({error:e.message});
    }
  });
  return router;
};