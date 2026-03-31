import { Pool } from 'pg';
import { env } from '../config/env.js';

export async function connectToPg(){
    try{
        const pool = new Pool({
            user: env.PG_USER,
            host: env.PG_HOST,
            database: env.PG_DATABASE,
            password: env.PG_PASSWORD,
            port: Number(env.PG_PORT),
        })
        await pool.connect();
        if(!pool.totalCount) return null;
        return pool;
    }
    catch(err:any){
        console.error("Error connecting to pg: ", err);
        return null;
    }
}