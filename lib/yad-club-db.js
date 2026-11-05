'use strict';
const {Pool}=require('pg');
function available(){return Boolean(process.env.YAD_CLUB_DATABASE_URL&&process.env.YAD_CLUB_SESSION_SECRET?.length>=32&&process.env.RESEND_API_KEY&&process.env.YAD_CLUB_FROM_EMAIL)}
let pool;
function database(){
 if(!process.env.YAD_CLUB_DATABASE_URL)throw Error('Club database is not configured');
 if(!pool)pool=new Pool({connectionString:process.env.YAD_CLUB_DATABASE_URL,ssl:{rejectUnauthorized:true},max:2,idleTimeoutMillis:2500,connectionTimeoutMillis:3500});
 return pool;
}
module.exports={database,available};
