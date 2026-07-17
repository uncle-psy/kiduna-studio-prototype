import client from "@/lib/httpClient";

/**
 * Signup API service.
 * Every function mirrors a Kinship EarlyAccess API call exactly.
 *
 * Endpoints used:
 *   POST /visitors/generate-otp          — Send OTP (email or SMS)
 *   POST /visitors/verify-otp            — Verify OTP code
 *   POST /visitors/resend-otp            — Resend OTP code
 *   POST /visitors/upsert-early-access   — Persist step progress
 *   POST /visitors/save-early-access     — Create account + wallet (Step 3)
 *   POST /visitors/has-code-exist        — Validate Kinship Code
 */

// ─── Resume: fetch persisted registration progress by email ───
// Reads server-side progress so the wizard can resume from the correct step on
// any device/browser, not just the one holding the localStorage cache.
export interface EarlyAccessProgress {
  found: boolean;
  currentStep: string;
  firstName: string;
  email: string;
  hasChecked: boolean;
  hasVerifiedEmail: boolean;
  isMobileNumberVerified: boolean;
  mobileNumber: string;
  countryCode: string;
  country: string;
  mobilePreferences: string[];
  referredKinshipCode: string;
  noCodeChecked: boolean;
  accountCreated: boolean;
}

/**
 * Fetch a user's saved registration progress.
 * - Returns the record when one exists.
 * - Returns null when there is no record yet (404) — caller starts fresh.
 * - Throws on network/server errors so the caller can show an error state
 *   and gracefully fall back to the local cache.
 */
export async function fetchEarlyAccessProgress(
  email: string,
): Promise<EarlyAccessProgress | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  try {
    const res = await client.get(
      `/visitors/early-access/${encodeURIComponent(normalized)}`,
    );
    return res.data?.found ? (res.data as EarlyAccessProgress) : null;
  } catch (err: any) {
    if (err?.response?.status === 404) return null; // no progress yet — not an error
    throw err; // network/server failure — surface to caller
  }
}

/**
 * Persist the exact screen the user is currently viewing.
 *
 * The per-step upserts only advance the marker when a step's *action* succeeds,
 * which can leave the server one screen behind the screen the user is actually
 * on. This records the current screen directly (reusing the early-access upsert)
 * so logging in again restores that exact page. Fire-and-forget — never blocks
 * the UI, and never throws.
 */
export async function persistCurrentStep(email: string, currentStep: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  return client
    .post("/visitors/upsert-early-access", {
      email: normalized,
      currentStep,
    })
    .catch(() => {});
}

// ─── Step 1: Generate email OTP ───────────────────────────────
export async function generateEmailOtp(email: string) {
  return client.post("/visitors/generate-otp", {
    type: "email",
    email,
  });
}

// ─── Step 1: Upsert after email OTP sent ──────────────────────
export async function upsertStep1(data: {
  email: string;
  firstName: string;
  hasChecked: boolean;
}) {
  return client
    .post("/visitors/upsert-early-access", {
      email: data.email,
      firstName: data.firstName,
      hasChecked: data.hasChecked,
      currentStep: "2",
    })
    .catch(() => {});
}

// ─── Step 2: Verify email OTP ─────────────────────────────────
export async function verifyEmailOtp(email: string, otp: string) {
  return client.post("/visitors/verify-otp", {
    email,
    otp,
    type: "email",
  });
}

// ─── Step 2: Resend email OTP ─────────────────────────────────
export async function resendEmailOtp(email: string) {
  return client.post("/visitors/resend-otp", {
    email,
    type: "email",
  });
}

// ─── Step 2: Upsert after email verified ──────────────────────
export async function upsertStep2(email: string) {
  return client
    .post("/visitors/upsert-early-access", {
      email,
      hasVerifiedEmail: true,
      currentStep: "3",
    })
    .catch(() => {});
}

// ─── Step 3: Create account + wallet ──────────────────────────
// David: password set பண்ணும்போதே account + wallet create ஆகணும்
export async function upsertStep3(data: {
  email: string;
  fullName: string;
  password: string;
  hasVerifiedEmail: boolean;
}) {
  return client.post("/visitors/save-early-access", {
    email: data.email,
    fullName: data.fullName,
    password: data.password,
    hasVerifiedEmail: data.hasVerifiedEmail,
    // The password/account is now created — the user lands on Step 4 (Phone).
    // Record the screen they move to (4), not the one they just left (3), so
    // resume restores the Phone step rather than re-opening Password.
    currentStep: "4",
  });
}

// ─── Step 4: Generate SMS OTP ─────────────────────────────────
export async function generateSmsOtp(data: {
  email: string;
  mobile: string;
  countryCode: string;
}) {
  return client.post("/visitors/generate-otp", {
    type: "sms",
    mobile: data.mobile,
    countryCode: data.countryCode,
    email: data.email,
  });
}

// ─── Step 4: Upsert after SMS OTP sent ────────────────────────
export async function upsertStep4(data: {
  email: string;
  mobileNumber: string;
  countryCode: string;
  country: string;
}) {
  return client
    .post("/visitors/upsert-early-access", {
      email: data.email,
      mobileNumber: data.mobileNumber,
      countryCode: data.countryCode,
      country: data.country,
      isMobileNumberVerified: false,
      currentStep: "5",
    })
    .catch(() => {});
}

// ─── Step 5: Verify SMS OTP ──────────────────────────────────
export async function verifySmsOtp(mobile: string, otp: string) {
  return client.post("/visitors/verify-otp", {
    mobile,
    otp,
    type: "sms",
    currentStep: "6",
  });
}

// ─── Step 5: Resend SMS OTP ──────────────────────────────────
export async function resendSmsOtp(data: {
  email: string;
  mobile: string;
  countryCode: string;
}) {
  return client.post("/visitors/resend-otp", {
    type: "sms",
    mobile: data.mobile,
    countryCode: data.countryCode,
    email: data.email,
  });
}

// ─── Step 5: Upsert after mobile verified ─────────────────────
export async function upsertStep5(email: string) {
  return client
    .post("/visitors/upsert-early-access", {
      email,
      isMobileNumberVerified: true,
      currentStep: "6",
    })
    .catch(() => {});
}

// ─── Step 6: Validate Kinship Code ────────────────────────────
export async function validateKinshipCode(code: string) {
  return client.post("/visitors/has-code-exist", {
    code,
  });
}

// ─── Step 6: Update kinship code only (account already created in Step 3) ───
export async function updateKinshipCode(data: {
  email: string;
  referedKinshipCode: string;
  noCodeChecked: boolean;
}) {
  return client.post("/visitors/upsert-early-access", {
    email: data.email,
    referedKinshipCode: data.referedKinshipCode,
    noCodeChecked: data.noCodeChecked,
    currentStep: "complete",
  });
}

// ─── Step 7: Create Stripe Onramp session ────────────────────
// walletAddress = Step3-ல create ஆன Solana wallet
export async function createOnrampSession(walletAddress: string) {
  return client.post("/stripe/onramp-session", { walletAddress });
}

// ─── Step 7: Mark founder purchase complete ───────────────────
// Purchase முடிஞ்சதும் backend-ல founder mark பண்ண
export async function markFounderPurchase() {
  return client.post("/stripe/mark-founder-purchase", {});
}