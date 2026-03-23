const express=require('express'),router=express.Router();

module.exports=function(pool){

  // Get all localities for a city (no society needed)
  router.get('/localities',async(req,res)=>{
    try{
      const{city}=req.query;if(!city)return res.json([]);
      const{rows}=await pool.query('SELECT DISTINCT locality FROM master_societies WHERE city=$1 ORDER BY locality',[city]);
      res.json(rows.map(r=>r.locality));
    }catch(e){res.status(500).json({error:e.message})}
  });

  // Get societies for a city+locality
  router.get('/societies',async(req,res)=>{
    try{
      const{city,locality}=req.query;if(!city||!locality)return res.json([]);
      const{rows}=await pool.query('SELECT DISTINCT society_name FROM master_societies WHERE city=$1 AND locality=$2 ORDER BY society_name',[city,locality]);
      res.json(rows.map(r=>r.society_name));
    }catch(e){res.status(500).json({error:e.message})}
  });

  router.post('/submit',async(req,res)=>{
    try{
      const d=req.body;
      if(!d.cp_name||!d.cp_contact)return res.status(400).json({error:'CP Name and Contact required'});
      if(!d.city||!d.locality)return res.status(400).json({error:'City and Locality required'});
      if(!d.society_name)return res.status(400).json({error:'Society Name required'});
      if(!d.configuration)return res.status(400).json({error:'Configuration required'});
      if(!d.size_sqft)return res.status(400).json({error:'Size required'});
      if(!d.price_expectation)return res.status(400).json({error:'Price Expectation required'});

      const{rows}=await pool.query(`INSERT INTO cp_inventory(
        cp_code,cp_name,cp_contact,city,locality,society_name,
        configuration,floor,unit_no,size_sqft,price_expectation,
        flat_status,exit_facing,additional_comments,bulk_inventory_urls,
        submitted_at,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW()) RETURNING id`,
        [d.cp_code||null,d.cp_name,d.cp_contact,d.city,d.locality,d.society_name,
         d.configuration,d.floor||null,d.unit_no||null,d.size_sqft,d.price_expectation,
         d.flat_status||null,d.exit_facing||null,d.additional_comments||null,
         d.bulk_inventory_urls||'[]']);
      res.json({success:true,id:rows[0].id});
    }catch(e){console.error('CPInventory:',e);res.status(500).json({error:e.message})}
  });

  // List all submissions (for admin)
  router.get('/list',async(req,res)=>{
    try{
      const{rows}=await pool.query('SELECT * FROM cp_inventory ORDER BY created_at DESC');
      res.json(rows);
    }catch(e){res.status(500).json({error:e.message})}
  });

  return router;
};