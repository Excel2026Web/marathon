import { Pool } from "pg";
import type { RegistrationData, StoredRegistration } from "./registration";

/**
 * Postgres access for the marathon registration flow.
 *
 * Uses the SAME database as Excel-Merch-Backend (DATABASE_URL) but writes to a
 * dedicated schema (DATABASE_SCHEMA, default "headstart") so it never touches
 * the merch_backend tables.
 */

const SCHEMA = (process.env.DATABASE_SCHEMA || "headstart").replace(
  /[^a-zA-Z0-9_]/g,
  ""
);

const globalForDb = globalThis as unknown as {
  __marathonPool?: Pool;
  __marathonSchemaReady?: Promise<void>;
};

/**
 * Parse a `postgresql://user:pass@host:port/db?params` URL into discrete
 * connection fields. Unlike the standard connection-string parser this tolerates
 * an un-encoded `@` in the password (the merch-backend DB password contains one),
 * so DATABASE_URL can be copied verbatim from that repo's `.env`.
 */
function parseDbUrl(raw: string) {
  const m = raw.match(/^[^:]+:\/\/(.*)@([^@]+)$/);
  if (!m) throw new Error("DATABASE_URL is not a valid postgres URL");

  const [, userinfo, hostpart] = m;
  const ci = userinfo.indexOf(":");
  const user = decodeURIComponent(ci === -1 ? userinfo : userinfo.slice(0, ci));
  const password =
    ci === -1 ? undefined : decodeURIComponent(userinfo.slice(ci + 1));

  const hm = hostpart.match(
    /^([^:/?]+)(?::(\d+))?(?:\/([^?]*))?(?:\?(.*))?$/
  );
  if (!hm) throw new Error("DATABASE_URL host section is malformed");
  const [, host, port, database] = hm;

  return {
    user,
    password,
    host,
    port: port ? parseInt(port, 10) : 5432,
    database: database ? decodeURIComponent(database) : undefined,
  };
}

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set (.env / .env.local)");
  }
  if (!globalForDb.__marathonPool) {
    globalForDb.__marathonPool = new Pool({
      ...parseDbUrl(process.env.DATABASE_URL),
      // Supabase requires TLS; the pooler cert isn't in the local trust store.
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return globalForDb.__marathonPool;
}

/** Idempotently create the schema + table. Runs at most once per process. */
export function ensureSchema(): Promise<void> {
  if (!globalForDb.__marathonSchemaReady) {
    globalForDb.__marathonSchemaReady = (async () => {
      const pool = getPool();
      await pool.query(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}"`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "${SCHEMA}".registrations (
          id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id                 text UNIQUE NOT NULL,
          razorpay_order_id        text UNIQUE NOT NULL,
          razorpay_payment_id      text,
          razorpay_signature       text,
          status                   text NOT NULL DEFAULT 'payment_pending',
          amount_in_rs             integer NOT NULL,
          full_name                text NOT NULL,
          email                    text NOT NULL,
          phone                    text NOT NULL,
          category                 text NOT NULL,
          college                  text,
          course_branch_year       text,
          tshirt_size              text NOT NULL,
          transport_required       boolean NOT NULL,
          blood_group              text NOT NULL,
          has_medical_conditions   boolean NOT NULL,
          medical_conditions       text,
          on_medication            boolean NOT NULL,
          medication_details       text,
          has_allergies            boolean NOT NULL,
          allergy_details          text,
          physical_limitations     text NOT NULL,
          emergency_contact_name   text NOT NULL,
          emergency_contact_number text NOT NULL,
          queries                  text,
          consent                  boolean NOT NULL,
          created_at               timestamptz NOT NULL DEFAULT now(),
          paid_at                  timestamptz
        )
      `);
      await pool.query(
        `CREATE INDEX IF NOT EXISTS registrations_email_idx ON "${SCHEMA}".registrations (email)`
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS registrations_status_idx ON "${SCHEMA}".registrations (status)`
      );
    })().catch((err) => {
      // allow a later request to retry
      globalForDb.__marathonSchemaReady = undefined;
      throw err;
    });
  }
  return globalForDb.__marathonSchemaReady;
}

export async function insertPendingRegistration(args: {
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  data: RegistrationData;
}): Promise<void> {
  await ensureSchema();
  const { orderId, razorpayOrderId, amount, data: d } = args;
  await getPool().query(
    `INSERT INTO "${SCHEMA}".registrations (
       order_id, razorpay_order_id, amount_in_rs, status,
       full_name, email, phone, category, college, course_branch_year,
       tshirt_size, transport_required, blood_group,
       has_medical_conditions, medical_conditions,
       on_medication, medication_details,
       has_allergies, allergy_details, physical_limitations,
       emergency_contact_name, emergency_contact_number, queries, consent
     ) VALUES (
       $1,$2,$3,'payment_pending',
       $4,$5,$6,$7,$8,$9,
       $10,$11,$12,
       $13,$14,
       $15,$16,
       $17,$18,$19,
       $20,$21,$22,$23
     )`,
    [
      orderId,
      razorpayOrderId,
      amount,
      d.fullName,
      d.email,
      d.phone,
      d.category,
      d.college || null,
      d.courseBranchYear || null,
      d.tshirtSize,
      d.transportRequired === "yes",
      d.bloodGroup,
      d.hasMedicalConditions === "yes",
      d.medicalConditions || null,
      d.onMedication === "yes",
      d.medicationDetails || null,
      d.hasAllergies === "yes",
      d.allergyDetails || null,
      d.physicalLimitations,
      d.emergencyContactName,
      d.emergencyContactNumber,
      d.queries || null,
      d.consent,
    ]
  );
}

export async function getRegistrationByOrderId(
  orderId: string
): Promise<StoredRegistration | null> {
  await ensureSchema();
  const res = await getPool().query(
    `SELECT * FROM "${SCHEMA}".registrations WHERE order_id = $1`,
    [orderId]
  );
  if (res.rowCount === 0) return null;
  const r = res.rows[0];
  return {
    orderId: r.order_id,
    razorpayOrderId: r.razorpay_order_id,
    amount: r.amount_in_rs,
    createdAt: new Date(r.created_at).getTime(),
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    category: r.category,
    college: r.college ?? "",
    courseBranchYear: r.course_branch_year ?? "",
    tshirtSize: r.tshirt_size,
    transportRequired: r.transport_required ? "yes" : "no",
    bloodGroup: r.blood_group,
    hasMedicalConditions: r.has_medical_conditions ? "yes" : "no",
    medicalConditions: r.medical_conditions ?? "",
    onMedication: r.on_medication ? "yes" : "no",
    medicationDetails: r.medication_details ?? "",
    hasAllergies: r.has_allergies ? "yes" : "no",
    allergyDetails: r.allergy_details ?? "",
    physicalLimitations: r.physical_limitations,
    emergencyContactName: r.emergency_contact_name,
    emergencyContactNumber: r.emergency_contact_number,
    queries: r.queries ?? "",
    consent: r.consent,
    status: r.status,
    razorpayPaymentId: r.razorpay_payment_id ?? undefined,
  };
}

/**
 * Marks the registration confirmed. Returns false if it was already confirmed
 * (idempotency guard) or not found.
 */
export async function markRegistrationConfirmed(args: {
  orderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<boolean> {
  await ensureSchema();
  const res = await getPool().query(
    `UPDATE "${SCHEMA}".registrations
        SET status = 'confirmed',
            razorpay_payment_id = $2,
            razorpay_signature = $3,
            paid_at = now()
      WHERE order_id = $1
        AND status <> 'confirmed'`,
    [args.orderId, args.razorpayPaymentId, args.razorpaySignature]
  );
  return (res.rowCount ?? 0) > 0;
}
