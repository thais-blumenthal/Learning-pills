import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
`;
console.log("Tables:", rows.map((r: any) => r.table_name));
