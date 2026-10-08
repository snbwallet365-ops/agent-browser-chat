import pg from 'pg';
if(!process.env.DATABASE_URL)throw new Error('Set DATABASE_URL before migration');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try{await pool.query(`
CREATE TABLE IF NOT EXISTS visa_cases(id uuid PRIMARY KEY, body text NOT NULL, updated_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS visa_secrets(name text PRIMARY KEY,value text NOT NULL);
CREATE TABLE IF NOT EXISTS visa_audit(seq bigserial PRIMARY KEY,ts timestamptz NOT NULL,action text NOT NULL,case_id uuid,previous_hash text NOT NULL,hash text NOT NULL);
CREATE OR REPLACE FUNCTION visa_audit_readonly() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit records are append-only'; END; $$;
DROP TRIGGER IF EXISTS audit_readonly ON visa_audit;
CREATE TRIGGER audit_readonly BEFORE UPDATE OR DELETE ON visa_audit FOR EACH ROW EXECUTE FUNCTION visa_audit_readonly();
`);console.log('VeloVisa schema installed. Configure a restricted runtime role and separate migration role.');}finally{await pool.end();}
