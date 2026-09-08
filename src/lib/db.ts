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
      // Added later: single-shot guard so the confirmation mail (sent only from
      // the Razorpay webhook) goes out exactly once.
      await pool.query(
        `ALTER TABLE "${SCHEMA}".registrations
           ADD COLUMN IF NOT EXISTS confirmation_mail_sent boolean NOT NULL DEFAULT false`
      );
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
  return rowToRegistration(res.rows[0]);
}

function rowToRegistration(r: Record<string, unknown>): StoredRegistration {
  const b = (v: unknown): "yes" | "no" => (v ? "yes" : "no");
  return {
    orderId: r.order_id as string,
    razorpayOrderId: r.razorpay_order_id as string,
    amount: r.amount_in_rs as number,
    createdAt: new Date(r.created_at as string).getTime(),
    fullName: r.full_name as string,
    email: r.email as string,
    phone: r.phone as string,
    category: r.category as StoredRegistration["category"],
    college: (r.college as string) ?? "",
    courseBranchYear: (r.course_branch_year as string) ?? "",
    tshirtSize: r.tshirt_size as string,
    transportRequired: b(r.transport_required),
    bloodGroup: r.blood_group as string,
    hasMedicalConditions: b(r.has_medical_conditions),
    medicalConditions: (r.medical_conditions as string) ?? "",
    onMedication: b(r.on_medication),
    medicationDetails: (r.medication_details as string) ?? "",
    hasAllergies: b(r.has_allergies),
    allergyDetails: (r.allergy_details as string) ?? "",
    physicalLimitations: (r.physical_limitations as string) ?? "",
    emergencyContactName: r.emergency_contact_name as string,
    emergencyContactNumber: r.emergency_contact_number as string,
    queries: (r.queries as string) ?? "",
    consent: r.consent as boolean,
    status: r.status as string,
    razorpayPaymentId: (r.razorpay_payment_id as string) ?? undefined,
  };
}

/** Looks up a registration the way the merch-backend webhook does: by the
 *  Razorpay order id together with our receipt (orderId). */
export async function getRegistrationByRazorpayOrderId(
  razorpayOrderId: string,
  orderId: string
): Promise<StoredRegistration | null> {
  await ensureSchema();
  const res = await getPool().query(
    `SELECT * FROM "${SCHEMA}".registrations
      WHERE razorpay_order_id = $1 AND order_id = $2`,
    [razorpayOrderId, orderId]
  );
  if (res.rowCount === 0) return null;
  return rowToRegistration(res.rows[0]);
}

/**
 * Marks the registration confirmed (checkout signature verified client-side).
 * Returns false if it was already confirmed. Does NOT send any mail.
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
            razorpay_payment_id = COALESCE(razorpay_payment_id, $2),
            razorpay_signature = COALESCE(razorpay_signature, $3),
            paid_at = COALESCE(paid_at, now())
      WHERE order_id = $1
        AND status <> 'confirmed'`,
    [args.orderId, args.razorpayPaymentId, args.razorpaySignature]
  );
  return (res.rowCount ?? 0) > 0;
}

/** Confirms from the webhook (`order.paid`). Idempotent; never clobbers an
 *  existing payment id / paid_at. Does NOT send any mail on its own. */
export async function confirmRegistrationFromWebhook(
  orderId: string,
  razorpayPaymentId: string
): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `UPDATE "${SCHEMA}".registrations
        SET status = 'confirmed',
            razorpay_payment_id = COALESCE(razorpay_payment_id, $2),
            paid_at = COALESCE(paid_at, now())
      WHERE order_id = $1`,
    [orderId, razorpayPaymentId]
  );
}

/**
 * Atomically claims the right to send the confirmation mail for this order.
 * Returns true for exactly one caller ever; subsequent calls return false.
 */
export async function claimConfirmationMail(orderId: string): Promise<boolean> {
  await ensureSchema();
  const res = await getPool().query(
    `UPDATE "${SCHEMA}".registrations
        SET confirmation_mail_sent = true
      WHERE order_id = $1 AND confirmation_mail_sent = false`,
    [orderId]
  );
  return (res.rowCount ?? 0) > 0;
}

/** Releases the claim (call if the mail send failed, so a webhook retry resends). */
export async function releaseConfirmationMail(orderId: string): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `UPDATE "${SCHEMA}".registrations
        SET confirmation_mail_sent = false
      WHERE order_id = $1`,
    [orderId]
  );
}
