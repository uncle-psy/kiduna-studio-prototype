import crypto from "node:crypto";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
const password = process.env.DAVID_PASSWORD;
if (!connectionString || !password) throw new Error("DATABASE_URL and DAVID_PASSWORD are required.");

const sql = postgres(connectionString, { max: 1, prepare: false });
const userId = "prototype-owner-david";
const passwordHash = (() => {
  const salt = crypto.randomBytes(16).toString("hex");
  return `scrypt:${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
})();

await sql.begin(async (tx) => {
  await tx`insert into prototype_users (id, name, handle, email, password_hash, status, email_verified_at, lineage)
    values (${userId}, 'David', 'moto', 'david@kiduna.club', ${passwordHash}, 'active', now(), ${tx.json([userId])})
    on conflict (email) do update set name = excluded.name, handle = 'moto', password_hash = excluded.password_hash, status = 'active', email_verified_at = coalesce(prototype_users.email_verified_at, now()), updated_at = now()`;
  const [owner] = await tx`select id from prototype_users where email = 'david@kiduna.club'`;
  await tx`insert into prototype_personas (id, user_id, name, handle, initials, role, is_default)
    values ('persona-david', ${owner.id}, 'David', 'david', 'DL', 'Steward', true)
    on conflict (handle) do update set user_id = excluded.user_id, name = excluded.name, initials = excluded.initials, role = excluded.role, is_default = true`;
  await tx`insert into prototype_personas (id, user_id, name, handle, initials, role, is_default)
    values ('persona-moto', ${owner.id}, 'Moto', 'moto', 'MO', 'Founder', false)
    on conflict (handle) do update set user_id = excluded.user_id, name = excluded.name, initials = excluded.initials, role = excluded.role`;
});
await sql.end();
console.log("Prototype owner account is ready.");
