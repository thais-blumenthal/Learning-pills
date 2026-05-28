import { db } from "../src/db/index";
import { chunks } from "../src/db/schema";

const all = await db.select().from(chunks);
for (const c of all) {
  console.log(`\n[${c.position}] ${c.title}`);
  console.log(c.body);
  console.log(`Q: ${c.question}`);
}
