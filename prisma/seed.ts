import { createClient } from "../src/lib/db";
import { resetDemo } from "../src/lib/demo";

const db = createClient();

resetDemo(db)
  .then(() => console.log("Seeded R101 to R108, customers C01 to C07, technicians T1 to T3."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
