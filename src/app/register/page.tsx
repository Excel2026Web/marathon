"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bebas_Neue, Oswald } from "next/font/google";

const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"] });
const oswald = Oswald({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Category = "mec" | "other";
type YesNo = "yes" | "no";

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  category: Category | "";

  college: string;
  courseBranchYear: string;

  tshirtSize: string;
  tshirtSizeOther: string;
  transportRequired: YesNo | "";

  bloodGroup: string;
  hasMedicalConditions: YesNo | "";
  medicalConditions: string;
  onMedication: YesNo | "";
  medicationDetails: string;
  hasAllergies: YesNo | "";
  allergyDetails: string;
  physicalLimitations: string;

  emergencyContactName: string;
  emergencyContactNumber: string;
  queries: string;
  consent: boolean;
}

const INITIAL: FormState = {
  fullName: "",
  email: "",
  phone: "",
  category: "",
  college: "",
  courseBranchYear: "",
  tshirtSize: "",
  tshirtSizeOther: "",
  transportRequired: "",
  bloodGroup: "",
  hasMedicalConditions: "",
  medicalConditions: "",
  onMedication: "",
  medicationDetails: "",
  hasAllergies: "",
  allergyDetails: "",
  physicalLimitations: "",
  emergencyContactName: "",
  emergencyContactNumber: "",
  queries: "",
  consent: false,
};

const FEES: Record<Category, number> = { mec: 350, other: 500 };

const STEP_TITLES = [
  "Personal Details",
  "Academic / Institution",
  "Participant Details",
  "Health & Medical",
  "Emergency Contact & Consent",
  "Review & Pay",
];

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Other"];
const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "Don't know",
];

/* ------------------------------------------------------------------ */
/*  Validators (shared with the server via /lib/registration)          */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailError(v: string): string | null {
  const t = v.trim();
  if (!t) return "Email address is required";
  if (!EMAIL_RE.test(t)) return "Enter a valid email address";
  return null;
}

/** Accepts digits with optional +, spaces, hyphens; 10–13 digits after stripping. */
function phoneError(v: string, label = "Phone number"): string | null {
  const t = v.trim();
  if (!t) return `${label} is required`;
  if (!/^\+?[0-9][0-9\s-]*$/.test(t)) return `${label} may only contain digits`;
  const digits = t.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13)
    return `Enter a valid ${label.toLowerCase()}`;
  return null;
}

function nameError(v: string, label: string): string | null {
  const t = v.trim();
  if (!t) return `${label} is required`;
  if (t.length < 2) return `Enter a valid ${label.toLowerCase()}`;
  return null;
}

/* ------------------------------------------------------------------ */
/*  Razorpay typing                                                    */
/* ------------------------------------------------------------------ */

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  notes: Record<string, string>;
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss: () => void };
}
interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (resp: unknown) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

/* ------------------------------------------------------------------ */
/*  Small presentational helpers                                       */
/* ------------------------------------------------------------------ */

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="block text-sm font-medium tracking-wide text-amber-100">
      {children}
      {required && <span className="ml-1 text-amber-400">*</span>}
    </span>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-400">{msg}</p>;
}

const inputClass =
  "mt-2 w-full bg-black/40 border border-amber-500/30 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/60 text-white placeholder-white/30 px-4 py-2.5 text-sm transition-colors";

function TextField({
  label,
  value,
  onChange,
  error,
  required,
  type = "text",
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <Label required={required}>{label}</Label>
      {hint && <span className="mt-1 block text-xs text-white/40">{hint}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
      <FieldError msg={error} />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  error,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <Label required={required}>{label}</Label>
      {hint && <span className="mt-1 block text-xs text-white/40">{hint}</span>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={inputClass + " resize-y"}
      />
      <FieldError msg={error} />
    </label>
  );
}

function RadioGroup({
  label,
  options,
  value,
  onChange,
  error,
  required,
  hint,
  columns = false,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  hint?: string;
  columns?: boolean;
}) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      {hint && <span className="mt-1 block text-xs text-white/40">{hint}</span>}
      <div
        className={
          "mt-3 gap-2 " +
          (columns
            ? "grid grid-cols-2 sm:grid-cols-3"
            : "flex flex-col")
        }
      >
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={
                "flex items-center gap-3 border px-4 py-2.5 text-left text-sm transition-colors " +
                (active
                  ? "border-amber-400 bg-amber-400/10 text-white"
                  : "border-amber-500/25 text-white/70 hover:border-amber-500/50 hover:text-white")
              }
            >
              <span
                className={
                  "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border " +
                  (active ? "border-amber-400" : "border-white/40")
                }
              >
                {active && (
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                )}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [done, setDone] = useState<null | {
    orderId: string;
    amount: number;
    email: string;
    name: string;
    mailSent: boolean;
  }>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load Razorpay checkout script once.
  useEffect(() => {
    if (document.getElementById("razorpay-checkout-js")) return;
    const s = document.createElement("script");
    s.id = "razorpay-checkout-js";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      setErrors((e) => {
        if (!e[key as string]) return e;
        const next = { ...e };
        delete next[key as string];
        return next;
      });
    },
    []
  );

  const fee = form.category ? FEES[form.category] : null;

  const resolvedTshirt = useMemo(() => {
    if (form.tshirtSize === "Other") return form.tshirtSizeOther.trim();
    return form.tshirtSize;
  }, [form.tshirtSize, form.tshirtSizeOther]);

  /* ---------------- validation ---------------- */

  // Only these are required: name, email, phone, category, T-shirt size,
  // transport, blood group and the three medical yes/no questions. Every
  // free-text extra (college, course, "if yes, specify", physical limitations,
  // queries) can be left blank.
  function validateStep(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    const put = (k: keyof FormState, msg: string | null) => {
      if (msg) e[k] = msg;
    };

    if (s === 0) {
      put("fullName", nameError(form.fullName, "Full name"));
      put("email", emailError(form.email));
      put("phone", phoneError(form.phone));
      if (!form.category) e.category = "Select a category";
    }

    // s === 1 (College / Course) — no required fields.

    if (s === 2) {
      if (!form.tshirtSize) e.tshirtSize = "Select a T-shirt size";
      else if (form.tshirtSize === "Other" && !form.tshirtSizeOther.trim())
        e.tshirtSizeOther = "Please specify your size";
      if (!form.transportRequired) e.transportRequired = "Select an option";
    }

    if (s === 3) {
      if (!form.bloodGroup) e.bloodGroup = "Select your blood group";
      if (!form.hasMedicalConditions)
        e.hasMedicalConditions = "Select an option";
      if (!form.onMedication) e.onMedication = "Select an option";
      if (!form.hasAllergies) e.hasAllergies = "Select an option";
    }

    if (s === 4) {
      put(
        "emergencyContactName",
        nameError(form.emergencyContactName, "Emergency contact name")
      );
      put(
        "emergencyContactNumber",
        phoneError(form.emergencyContactNumber, "Emergency contact number")
      );
      if (!form.consent)
        e.consent = "You must accept the consent & declaration";
    }

    return e;
  }

  function next() {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => Math.min(s + 1, 5));
  }
  function back() {
    setPayError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  /* ---------------- payment ---------------- */

  async function handlePay() {
    // Re-validate everything before paying.
    for (let s = 0; s <= 4; s++) {
      const e = validateStep(s);
      if (Object.keys(e).length > 0) {
        setErrors(e);
        setStep(s);
        return;
      }
    }

    setSubmitting(true);
    setPayError(null);

    const payload = {
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      category: form.category,
      college: form.college,
      courseBranchYear: form.courseBranchYear,
      tshirtSize: resolvedTshirt,
      transportRequired: form.transportRequired,
      bloodGroup: form.bloodGroup,
      hasMedicalConditions: form.hasMedicalConditions,
      medicalConditions: form.medicalConditions,
      onMedication: form.onMedication,
      medicationDetails: form.medicationDetails,
      hasAllergies: form.hasAllergies,
      allergyDetails: form.allergyDetails,
      physicalLimitations: form.physicalLimitations,
      emergencyContactName: form.emergencyContactName,
      emergencyContactNumber: form.emergencyContactNumber,
      queries: form.queries,
      consent: form.consent,
    };

    try {
      const res = await fetch("/api/register/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start payment");

      if (!window.Razorpay) {
        throw new Error(
          "Payment library not loaded yet. Check your connection and retry."
        );
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: "Headstart 2.0 — 10K Mini Marathon",
        description: "Excel 2026 Marathon Registration",
        order_id: data.razorpayOrderId,
        prefill: {
          name: data.name,
          email: data.email,
          contact: data.phone,
        },
        notes: { orderId: data.orderId },
        theme: { color: "#f59e0b" },
        handler: async (response) => {
          try {
            const vr = await fetch("/api/register/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: data.orderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const vd = await vr.json();
            if (!vr.ok || !vd.success)
              throw new Error(vd.error || "Payment verification failed");
            setDone({
              orderId: vd.orderId,
              amount: vd.amount,
              email: vd.email,
              name: vd.name,
              mailSent: vd.mailSent,
            });
          } catch (err) {
            setPayError(
              err instanceof Error
                ? err.message
                : "Payment verification failed. Contact the organisers with your payment ID."
            );
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setPayError("Payment was cancelled.");
          },
        },
      });
      rzp.open();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  /* ---------------- render ---------------- */

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <nav className="relative z-50 w-full bg-black/80 backdrop-blur-md border-b border-amber-500/40 px-6 sm:px-10 md:px-14 lg:px-20 py-4 flex items-center justify-between shadow-[0_1px_20px_rgba(245,158,11,0.15)]">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Excel Logo"
            width={180}
            height={64}
            className="object-contain h-10 sm:h-12 md:h-16 w-auto"
            priority
          />
        </Link>
        <div
          className={`flex items-baseline gap-1.5 sm:gap-2 ${bebasNeue.className}`}
        >
          <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-wide uppercase text-white leading-none">
            HEADSTART
          </span>
          <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-wide uppercase leading-none text-transparent [-webkit-text-stroke:1px_#f59e0b] md:[-webkit-text-stroke:1.5px_#f59e0b]">
            2.0
          </span>
        </div>
      </nav>

      <main className="relative flex-1 overflow-hidden bg-[#0a0a0a]">
        <div className="absolute inset-0 z-0">
          <Image
            src="/background.jpg"
            alt=""
            fill
            className="object-cover object-center opacity-30"
            priority
          />
          <div className="absolute inset-0 bg-black/80" />
        </div>

        <div
          ref={scrollRef}
          className="relative z-10 h-full overflow-y-auto px-4 sm:px-8 py-10"
        >
          <div className="mx-auto w-full max-w-2xl">
            {/* Heading */}
            <div className={`mb-2 flex items-baseline gap-3 ${bebasNeue.className}`}>
              <h1 className="text-4xl sm:text-5xl tracking-wide uppercase text-white leading-none">
                Register
              </h1>
              <span className="text-4xl sm:text-5xl tracking-wide uppercase leading-none text-transparent [-webkit-text-stroke:1.5px_#f59e0b]">
                Now
              </span>
            </div>
            <p
              className={`mb-8 text-sm tracking-[0.25em] uppercase text-amber-100/80 ${oswald.className}`}
            >
              Excel 2026 Marathon · Headstart 2.0 · 10K Mini Marathon
            </p>

            {done ? (
              <SuccessCard done={done} oswaldClass={oswald.className} />
            ) : (
              <div
                className={`border border-amber-500/30 bg-black/60 backdrop-blur-sm ${oswald.className}`}
              >
                {/* Stepper */}
                <div className="border-b border-amber-500/20 px-5 py-4 sm:px-8">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.25em] text-amber-400">
                      Step {step + 1} / 6
                    </p>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                      {STEP_TITLES[step]}
                    </p>
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    {STEP_TITLES.map((_, i) => (
                      <div
                        key={i}
                        className={
                          "h-1 flex-1 transition-colors " +
                          (i <= step ? "bg-amber-400" : "bg-white/15")
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Body */}
                <div className="space-y-6 px-5 py-7 sm:px-8">
                  {step === 0 && (
                    <>
                      <TextField
                        label="Full Name"
                        required
                        value={form.fullName}
                        onChange={(v) => set("fullName", v)}
                        error={errors.fullName}
                      />
                      <TextField
                        label="Email address"
                        required
                        type="email"
                        value={form.email}
                        onChange={(v) => set("email", v)}
                        error={errors.email}
                        hint="Your registration confirmation is sent here."
                      />
                      <TextField
                        label="Phone Number"
                        required
                        type="tel"
                        value={form.phone}
                        onChange={(v) => set("phone", v)}
                        error={errors.phone}
                      />
                      <RadioGroup
                        label="Category"
                        required
                        value={form.category}
                        onChange={(v) => set("category", v as Category)}
                        error={errors.category}
                        options={[
                          { value: "mec", label: "MEC Student — ₹350" },
                          {
                            value: "other",
                            label:
                              "Other College / Institution Student / Public — ₹500",
                          },
                        ]}
                      />
                      {fee !== null && (
                        <div className="border border-amber-500/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                          Registration Fee:{" "}
                          <span className="font-semibold text-amber-300">
                            ₹{fee}/-
                          </span>{" "}
                          <span className="text-white/50">(Early Bird)</span>
                        </div>
                      )}
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <div className="border border-amber-500/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
                        {form.category === "mec"
                          ? "MEC Student Registration"
                          : "Other College / Institution / Public Registration"}
                        {fee !== null && (
                          <>
                            {" "}
                            · Registration Fee:{" "}
                            <span className="font-semibold text-amber-300">
                              ₹{fee}/-
                            </span>
                          </>
                        )}
                      </div>
                      <TextField
                        label="College / Institution"
                        value={form.college}
                        onChange={(v) => set("college", v)}
                        hint="If applicable."
                      />
                      <TextField
                        label="Course / Branch and Year of Study"
                        value={form.courseBranchYear}
                        onChange={(v) => set("courseBranchYear", v)}
                        hint="If applicable."
                      />
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <RadioGroup
                        label="What is your T-shirt size?"
                        required
                        columns
                        value={form.tshirtSize}
                        onChange={(v) => set("tshirtSize", v)}
                        error={errors.tshirtSize}
                        options={TSHIRT_SIZES.map((s) => ({
                          value: s,
                          label: s,
                        }))}
                      />
                      {form.tshirtSize === "Other" && (
                        <TextField
                          label="Specify your T-shirt size"
                          required
                          value={form.tshirtSizeOther}
                          onChange={(v) => set("tshirtSizeOther", v)}
                          error={errors.tshirtSizeOther}
                        />
                      )}
                      <RadioGroup
                        label="Is transportation facility required?"
                        required
                        value={form.transportRequired}
                        onChange={(v) => set("transportRequired", v as YesNo)}
                        error={errors.transportRequired}
                        options={[
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                        ]}
                      />
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <RadioGroup
                        label="Blood Group"
                        required
                        columns
                        value={form.bloodGroup}
                        onChange={(v) => set("bloodGroup", v)}
                        error={errors.bloodGroup}
                        options={BLOOD_GROUPS.map((b) => ({
                          value: b,
                          label: b,
                        }))}
                      />
                      <RadioGroup
                        label="Do you have any existing or previous medical conditions we should be aware of?"
                        required
                        hint="Examples: asthma, diabetes, heart conditions, etc."
                        value={form.hasMedicalConditions}
                        onChange={(v) =>
                          set("hasMedicalConditions", v as YesNo)
                        }
                        error={errors.hasMedicalConditions}
                        options={[
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                        ]}
                      />
                      {form.hasMedicalConditions === "yes" && (
                        <TextArea
                          label="If yes, please specify the medical condition(s)."
                          value={form.medicalConditions}
                          onChange={(v) => set("medicalConditions", v)}
                        />
                      )}
                      <RadioGroup
                        label="Are you currently taking any medication?"
                        required
                        value={form.onMedication}
                        onChange={(v) => set("onMedication", v as YesNo)}
                        error={errors.onMedication}
                        options={[
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                        ]}
                      />
                      {form.onMedication === "yes" && (
                        <TextArea
                          label="If yes, please specify the medication(s) and, if relevant, the reason for taking them."
                          value={form.medicationDetails}
                          onChange={(v) => set("medicationDetails", v)}
                        />
                      )}
                      <RadioGroup
                        label="Do you have any allergies?"
                        required
                        hint="Examples: food, medication, pollen, etc."
                        value={form.hasAllergies}
                        onChange={(v) => set("hasAllergies", v as YesNo)}
                        error={errors.hasAllergies}
                        options={[
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                        ]}
                      />
                      {form.hasAllergies === "yes" && (
                        <TextArea
                          label="If yes, specify."
                          value={form.allergyDetails}
                          onChange={(v) => set("allergyDetails", v)}
                        />
                      )}
                      <TextArea
                        label="Do you have any physical limitations we should be aware of?"
                        value={form.physicalLimitations}
                        onChange={(v) => set("physicalLimitations", v)}
                      />
                    </>
                  )}

                  {step === 4 && (
                    <>
                      <TextField
                        label="Emergency Contact Name"
                        required
                        value={form.emergencyContactName}
                        onChange={(v) => set("emergencyContactName", v)}
                        error={errors.emergencyContactName}
                      />
                      <TextField
                        label="Emergency Contact Number"
                        required
                        type="tel"
                        value={form.emergencyContactNumber}
                        onChange={(v) => set("emergencyContactNumber", v)}
                        error={errors.emergencyContactNumber}
                      />
                      <TextArea
                        label="Do you have any queries or concerns regarding the event?"
                        value={form.queries}
                        onChange={(v) => set("queries", v)}
                      />
                      <div>
                        <button
                          type="button"
                          onClick={() => set("consent", !form.consent)}
                          className="flex items-start gap-3 text-left"
                        >
                          <span
                            className={
                              "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center border " +
                              (form.consent
                                ? "border-amber-400 bg-amber-400 text-black"
                                : "border-white/40")
                            }
                          >
                            {form.consent && (
                              <svg
                                viewBox="0 0 20 20"
                                className="h-3.5 w-3.5"
                                fill="currentColor"
                              >
                                <path d="M7.5 13.5l-3-3 1-1 2 2 5-5 1 1z" />
                              </svg>
                            )}
                          </span>
                          <span className="text-sm text-white/80">
                            <span className="text-amber-400">* </span>I confirm
                            that the information provided above is true and
                            accurate to the best of my knowledge. I understand
                            and agree to abide by the rules and guidelines of
                            the event.
                          </span>
                        </button>
                        <FieldError msg={errors.consent} />
                      </div>
                    </>
                  )}

                  {step === 5 && (
                    <ReviewStep
                      form={form}
                      resolvedTshirt={resolvedTshirt}
                      fee={fee}
                      payError={payError}
                    />
                  )}
                </div>

                {/* Footer nav */}
                <div className="flex items-center justify-between gap-3 border-t border-amber-500/20 px-5 py-4 sm:px-8">
                  <button
                    type="button"
                    onClick={back}
                    disabled={step === 0 || submitting}
                    className="px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-white/60 transition-colors hover:text-white disabled:opacity-30"
                  >
                    Back
                  </button>

                  {step < 5 ? (
                    <button
                      type="button"
                      onClick={next}
                      className="bg-gradient-to-r from-amber-400 to-amber-500 px-7 py-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-black transition-all hover:from-amber-300 hover:to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)]"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePay}
                      disabled={submitting}
                      className="bg-gradient-to-r from-amber-400 to-amber-500 px-7 py-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-black transition-all hover:from-amber-300 hover:to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)] disabled:opacity-50"
                    >
                      {submitting
                        ? "Processing…"
                        : `Pay ₹${fee ?? ""} & Register`}
                    </button>
                  )}
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-xs text-white/40">
              For queries: Sreenidhi +91 85475 25246 · Hrishidev +91 79073 9597
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Review step                                                        */
/* ------------------------------------------------------------------ */

function Row({ k, v }: { k: string; v: string }) {
  if (!v) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-white/10 py-2 text-sm">
      <span className="text-white/50">{k}</span>
      <span className="text-right text-white/90">{v}</span>
    </div>
  );
}

function ReviewStep({
  form,
  resolvedTshirt,
  fee,
  payError,
}: {
  form: FormState;
  resolvedTshirt: string;
  fee: number | null;
  payError: string | null;
}) {
  return (
    <div className="space-y-5">
      <div className="border border-amber-500/40 bg-amber-400/10 px-4 py-4 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-200/80">
          Amount payable
        </p>
        <p className="mt-1 text-3xl font-bold text-amber-300">₹{fee ?? "—"}/-</p>
        <p className="mt-1 text-xs text-white/50">
          {form.category === "mec"
            ? "MEC Student rate"
            : "Other College / Institution / Public rate"}
        </p>
      </div>

      <div>
        <Row k="Full Name" v={form.fullName} />
        <Row k="Email" v={form.email} />
        <Row k="Phone" v={form.phone} />
        <Row
          k="Category"
          v={form.category === "mec" ? "MEC Student" : "Other / Public"}
        />
        <Row k="College / Institution" v={form.college} />
        <Row k="Course / Branch / Year" v={form.courseBranchYear} />
        <Row k="T-shirt size" v={resolvedTshirt} />
        <Row
          k="Transportation"
          v={form.transportRequired === "yes" ? "Required" : "Not required"}
        />
        <Row k="Blood Group" v={form.bloodGroup} />
        <Row
          k="Medical conditions"
          v={
            form.hasMedicalConditions === "yes"
              ? form.medicalConditions
              : "None"
          }
        />
        <Row
          k="Medication"
          v={form.onMedication === "yes" ? form.medicationDetails : "None"}
        />
        <Row
          k="Allergies"
          v={form.hasAllergies === "yes" ? form.allergyDetails : "None"}
        />
        <Row k="Physical limitations" v={form.physicalLimitations} />
        <Row k="Emergency Contact" v={form.emergencyContactName} />
        <Row k="Emergency Number" v={form.emergencyContactNumber} />
        <Row k="Queries" v={form.queries} />
      </div>

      {payError && (
        <div className="border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {payError}
        </div>
      )}

      <p className="text-xs text-white/40">
        You&apos;ll be redirected to Razorpay to complete the payment securely.
        A confirmation email is sent once payment succeeds.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Success card                                                       */
/* ------------------------------------------------------------------ */

function SuccessCard({
  done,
  oswaldClass,
}: {
  done: {
    orderId: string;
    amount: number;
    email: string;
    name: string;
    mailSent: boolean;
  };
  oswaldClass: string;
}) {
  return (
    <div
      className={`border border-amber-500/40 bg-black/70 backdrop-blur-sm px-6 py-10 text-center ${oswaldClass}`}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-400 text-amber-400">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="mt-6 text-2xl font-semibold uppercase tracking-[0.15em] text-white">
        Registration Confirmed
      </h2>
      <p className="mt-2 text-sm text-white/70">
        Thank you, {done.name}. Your spot for Headstart 2.0 is booked.
      </p>

      <div className="mx-auto mt-6 max-w-sm space-y-2 border border-white/10 bg-white/5 px-5 py-4 text-left text-sm">
        <div className="flex justify-between">
          <span className="text-white/50">Registration ID</span>
          <span className="text-white/90">{done.orderId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Amount paid</span>
          <span className="text-white/90">₹{done.amount}/-</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Confirmation email</span>
          <span className="text-white/90">
            {done.mailSent ? `Sent to ${done.email}` : "Will be sent shortly"}
          </span>
        </div>
      </div>

      <p className="mt-6 text-xs uppercase tracking-[0.2em] text-amber-200/70">
        11 Oct 2026 · 06:00 AM · Durbar Hall
      </p>

      <Link
        href="/"
        className="mt-8 inline-block bg-gradient-to-r from-amber-400 to-amber-500 px-7 py-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-black transition-all hover:from-amber-300 hover:to-amber-400"
      >
        Back to Home
      </Link>
    </div>
  );
}
