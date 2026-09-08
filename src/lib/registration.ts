export type Category = "mec" | "other";

export const FEES: Record<Category, number> = {
  mec: 350,
  other: 500,
};

export const CATEGORY_LABELS: Record<Category, string> = {
  mec: "MEC Student",
  other: "Other College / Institution Student / Public",
};

export function feeForCategory(category: string): number | null {
  if (category === "mec" || category === "other") {
    return FEES[category];
  }
  return null;
}

export interface RegistrationData {
  fullName: string;
  email: string;
  phone: string;
  category: Category;

  college: string;
  courseBranchYear: string;

  tshirtSize: string;
  transportRequired: "yes" | "no";

  bloodGroup: string;
  hasMedicalConditions: "yes" | "no";
  medicalConditions: string;
  onMedication: "yes" | "no";
  medicationDetails: string;
  hasAllergies: "yes" | "no";
  allergyDetails: string;
  physicalLimitations: string;

  emergencyContactName: string;
  emergencyContactNumber: string;
  queries: string;
  consent: boolean;
}

export interface StoredRegistration extends RegistrationData {
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  createdAt: number;
  status?: string;
  razorpayPaymentId?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** digits with optional leading + / spaces / hyphens, 10–13 digits total */
function isValidPhone(v: string): boolean {
  if (!/^\+?[0-9][0-9\s-]*$/.test(v)) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

function asYesNo(v: unknown): "yes" | "no" | null {
  return v === "yes" || v === "no" ? v : null;
}

/**
 * Server-side gate. Required: name, email, phone, category, T-shirt size,
 * transport, blood group, the three medical yes/no questions, both emergency
 * contact fields and consent. College, course, the "if yes, specify" details,
 * physical limitations and queries are all optional and may be blank.
 */
export function validateRegistration(
  body: Partial<RegistrationData>
): { ok: true; data: RegistrationData } | { ok: false; error: string } {
  const str = (v: unknown) => String(v ?? "").trim();

  const fullName = str(body.fullName);
  const email = str(body.email);
  const phone = str(body.phone);
  const tshirtSize = str(body.tshirtSize);
  const bloodGroup = str(body.bloodGroup);
  const emergencyContactName = str(body.emergencyContactName);
  const emergencyContactNumber = str(body.emergencyContactNumber);

  if (fullName.length < 2) return { ok: false, error: "Full name is required" };
  if (!EMAIL_RE.test(email))
    return { ok: false, error: "Enter a valid email address" };
  if (!isValidPhone(phone))
    return { ok: false, error: "Enter a valid phone number" };

  if (body.category !== "mec" && body.category !== "other")
    return { ok: false, error: "Select a category" };

  if (!tshirtSize) return { ok: false, error: "Select a T-shirt size" };

  const transportRequired = asYesNo(body.transportRequired);
  if (!transportRequired)
    return { ok: false, error: "Select whether transportation is required" };

  if (!bloodGroup) return { ok: false, error: "Select a blood group" };

  const hasMedicalConditions = asYesNo(body.hasMedicalConditions);
  const onMedication = asYesNo(body.onMedication);
  const hasAllergies = asYesNo(body.hasAllergies);
  if (!hasMedicalConditions || !onMedication || !hasAllergies)
    return { ok: false, error: "Answer all the medical questions" };

  if (emergencyContactName.length < 2)
    return { ok: false, error: "Emergency contact name is required" };
  if (!isValidPhone(emergencyContactNumber))
    return { ok: false, error: "Enter a valid emergency contact number" };

  if (body.consent !== true)
    return { ok: false, error: "Consent & declaration must be accepted" };

  const data: RegistrationData = {
    fullName,
    email,
    phone,
    category: body.category,
    college: str(body.college),
    courseBranchYear: str(body.courseBranchYear),
    tshirtSize,
    transportRequired,
    bloodGroup,
    hasMedicalConditions,
    medicalConditions:
      hasMedicalConditions === "yes" ? str(body.medicalConditions) : "",
    onMedication,
    medicationDetails:
      onMedication === "yes" ? str(body.medicationDetails) : "",
    hasAllergies,
    allergyDetails: hasAllergies === "yes" ? str(body.allergyDetails) : "",
    physicalLimitations: str(body.physicalLimitations),
    emergencyContactName,
    emergencyContactNumber,
    queries: str(body.queries),
    consent: true,
  };

  return { ok: true, data };
}
