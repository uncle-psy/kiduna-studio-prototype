"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import FormCard from "../ui/FormCard";
import MessageBanner from "./MessageBanner";
import { useSignupMessage } from "./useSignupMessage";
import { useSignupStorage } from "./useSignupStorage";
import { fetchEarlyAccessProgress, persistCurrentStep } from "./signupApi";
import Step1 from "./Step1";
import Step2 from "./Step2";
import Step3 from "./Step3";
import Step4 from "./Step4";
import Step5 from "./Step5";
import Step6 from "./Step6";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

/** Rank a step string for "furthest progress" comparison. 'complete' wins. */
function stepRank(s: string | undefined): number {
  if (s === "complete") return 99;
  const n = Number(s);
  return Number.isFinite(n) && n >= 1 && n <= 6 ? n : 0;
}

/** Return whichever step represents the furthest progress (server vs local). */
function furthestStep(a: string | undefined, b: string | undefined): string {
  return stepRank(a) >= stepRank(b) ? a ?? "1" : b ?? "1";
}

export default function SignupWizard() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const { message, createMessage } = useSignupMessage();
  const { cachedData, isLoaded, updateData, clearData } = useSignupStorage();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Resume state — we hold the UI on a loading screen until we've reconciled
  // local cache with server-side progress, so the user never briefly sees the
  // wrong step before being moved to the right one.
  const [resumeChecked, setResumeChecked] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const resumeRan = useRef(false);
  // The step value last written to the server — avoids a redundant write right
  // after resume and only persists on genuine navigation.
  const lastPersistedStep = useRef<string | null>(null);

  /** Apply a persisted step value to the wizard (handles the 'complete' funnel). */
  function applyStep(stepStr: string | undefined) {
    if (stepStr === "complete") {
      // Only redirect to checkout/checkout-success if user has a valid token.
      // After logout, stale signup data might still say "complete" but the
      // user needs to start fresh.
      const hasToken =
        typeof window !== "undefined" ? !!localStorage.getItem("token") : false;

      if (!hasToken) {
        clearData();
        setCurrentStep(1);
        return;
      }

      // Check if this user should skip payment (email-based, backend-validated)
      // Backend also activates 'member' tier when skip=true
      import("@/lib/payment-skip").then(({ shouldSkipPayment }) => {
        const token = localStorage.getItem("token");
        shouldSkipPayment(token).then((skip) => {
          if (skip) {
            router.replace("/onboarding");
          } else {
            const pendingOnramp =
              typeof window !== "undefined"
                ? localStorage.getItem("onramp_session_id")
                : null;
            router.replace(pendingOnramp ? "/checkout-success" : "/checkout");
          }
        });
      });
      return;
    }

    const stepNum = Number(stepStr);
    setCurrentStep(stepNum >= 1 && stepNum <= 6 ? (stepNum as Step) : 1);
  }

  /* ── Resume from the furthest of server-side and local progress ──
     Runs once, after the local cache has loaded and auth has resolved.
     Identity for the server lookup is the logged-in user's email (works on
     any device/browser); for a same-device pre-account session we fall back
     to the cached email. Without an email we can only use the local cache. */
  useEffect(() => {
    if (!isLoaded || authLoading || resumeRan.current) return;
    resumeRan.current = true;

    let cancelled = false;

    async function resume() {
      const localStep = cachedData.currentStep;
      const email = (user?.email || cachedData.email || "")
        .toLowerCase()
        .trim();

      // No identity → can only resume from the local cache (e.g. a brand-new
      // visitor, or a pre-account Step 1/2 session on a different device).
      if (!email) {
        lastPersistedStep.current = localStep ?? "1";
        applyStep(localStep);
        if (!cancelled) setResumeChecked(true);
        return;
      }

      try {
        const server = await fetchEarlyAccessProgress(email);
        if (cancelled) return;

        if (server) {
          // Server is authoritative across devices — hydrate the cache so the
          // resumed step renders with the right context, then jump to whichever
          // step is furthest along (guards against a lost local write).
          let target = furthestStep(server.currentStep, localStep);
          // The Password screen (Step 3) is complete once the account exists,
          // so never resume to it (or earlier) after account creation — move the
          // user forward to the Phone step. This also repairs records whose step
          // was persisted before the Step-3 marker was corrected.
          if (server.accountCreated && stepRank(target) < 4) target = "4";
          lastPersistedStep.current = target;
          updateData({
            email: server.email,
            fullName: server.firstName || cachedData.fullName,
            hasChecked: server.hasChecked,
            hasVerifiedEmail: server.hasVerifiedEmail,
            isMobileNumberVerified: server.isMobileNumberVerified,
            mobileNumber: server.mobileNumber || cachedData.mobileNumber,
            countryCode: server.countryCode || cachedData.countryCode,
            country: server.country || cachedData.country,
            mobilePreferences: server.mobilePreferences?.length
              ? server.mobilePreferences
              : cachedData.mobilePreferences,
            kinshipCode: server.referredKinshipCode || cachedData.kinshipCode,
            noCodeChecked: server.noCodeChecked,
            accountCreated: server.accountCreated || cachedData.accountCreated,
            currentStep: target,
          });
          applyStep(target);
        } else {
          // No server record yet → use whatever the local cache has.
          lastPersistedStep.current = localStep ?? "1";
          applyStep(localStep);
        }
      } catch {
        if (cancelled) return;
        // Couldn't reach the server — don't block the user; resume from the
        // local cache and let them know their progress wasn't re-verified.
        setResumeError(
          "We couldn't verify your saved progress just now — resuming from your last step on this device.",
        );
        lastPersistedStep.current = localStep ?? "1";
        applyStep(localStep);
      } finally {
        if (!cancelled) setResumeChecked(true);
      }
    }

    resume();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, authLoading, user?.email]);

  /* ── Persist the exact current screen on every navigation ──
     Records the step the user is actually viewing (not just completed actions),
     so logging in again restores that exact page. Reuses the early-access
     upsert. Runs only after resume has reconciled, skips Step 1 (no server
     record yet), and skips the no-op write of the just-resumed step. */
  useEffect(() => {
    if (!resumeChecked) return;
    if (currentStep < 2) return;
    const email = (user?.email || cachedData.email || "").toLowerCase().trim();
    if (!email) return;
    const value = String(currentStep);
    if (lastPersistedStep.current === value) return;
    lastPersistedStep.current = value;
    persistCurrentStep(email, value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, resumeChecked]);

  // Loading state while we reconcile progress.
  if (!resumeChecked) {
    return (
      <FormCard>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            padding: "48px 0",
          }}
        >
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span style={{ color: "#fff", opacity: 0.7, fontSize: "0.9rem" }}>
            Restoring your progress…
          </span>
        </div>
      </FormCard>
    );
  }

  return (
    <FormCard>
      <MessageBanner
        show={message.show}
        text={message.text}
        type={message.type}
      />

      {resumeError && (
        <MessageBanner show text={resumeError} type="error" />
      )}

      {currentStep === 1 && (
        <Step1
          onSuccess={() => setCurrentStep(2)}
          cachedData={cachedData}
          updateData={updateData}
          createMessage={createMessage}
          clearData={clearData}
        />
      )}

      {currentStep === 2 && (
        <Step2
          onSuccess={() => setCurrentStep(3)}
          onBack={() => setCurrentStep(1)}
          cachedData={cachedData}
          updateData={updateData}
          createMessage={createMessage}
        />
      )}

      {currentStep === 3 && (
        <Step3
          onSuccess={() => setCurrentStep(4)}
          onBack={() => setCurrentStep(2)}
          cachedData={cachedData}
          updateData={updateData}
          createMessage={createMessage}
        />
      )}

      {currentStep === 4 && (
        <Step4
          onSuccess={() => setCurrentStep(5)}
          onBack={() => setCurrentStep(3)}
          cachedData={cachedData}
          updateData={updateData}
          createMessage={createMessage}
        />
      )}

      {currentStep === 5 && (
        <Step5
          onSuccess={() => setCurrentStep(6)}
          onBack={() => setCurrentStep(4)}
          cachedData={cachedData}
          updateData={updateData}
          createMessage={createMessage}
        />
      )}
     {currentStep === 6 && (
        <Step6
          onSuccess={() => {}}
          onBack={() => setCurrentStep(5)}
          cachedData={cachedData}
          updateData={updateData}
          clearData={clearData}
          createMessage={createMessage}
        />
      )}
    </FormCard>
  );
}
