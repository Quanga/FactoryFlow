import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "../shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function seed() {
  console.log("Seeding database...");

  // Create admin user
  await db.insert(schema.users).values({
    id: "admin",
    name: "System Admin",
    email: "admin@factory.com",
    password: "admin123",
    role: "manager",
    department: "Management",
    photoUrl: "https://github.com/shadcn.png",
  }).onConflictDoNothing();

  // Create worker users
  await db.insert(schema.users).values([
    {
      id: "46",
      name: "Theunis Scheepers",
      email: null,
      password: null,
      role: "worker",
      department: "Technical",
      photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
      id: "102",
      name: "Sarah Connor",
      email: null,
      password: null,
      role: "worker",
      department: "Production",
      photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
      id: "105",
      name: "Mike Ross",
      email: null,
      password: null,
      role: "worker",
      department: "Logistics",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
  ]).onConflictDoNothing();

  // Create leave balances for workers
  const workers = ["46", "102", "105"];
  for (const userId of workers) {
    await db.insert(schema.leaveBalances).values([
      {
        userId,
        leaveType: "Annual Leave",
        total: 21,
        taken: 0,
        pending: 0,
      },
      {
        userId,
        leaveType: "Sick Leave",
        total: 30,
        taken: 0,
        pending: 0,
      },
      {
        userId,
        leaveType: "Family Responsibility",
        total: 3,
        taken: 0,
        pending: 0,
      },
    ]).onConflictDoNothing();
  }

  // Create default settings
  await db.insert(schema.settings).values({
    key: "admin_email",
    value: "manager@factory.com",
  }).onConflictDoNothing();

  console.log("Database seeded successfully!");
  await pool.end();
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
