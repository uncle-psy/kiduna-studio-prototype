"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import FormField, { Input } from "../ui/FormField";
import { validateKinshipCode, updateKinshipCode } from "./signupApi";
import type { SignupData } from "./constants";
import type { MessageType } from "./useSignupMessage";

interface Step6Props {
  onSuccess: () => void;
  onBack: () => void;
  cachedData: SignupData;
  updateData: (updates: Partial<SignupData>) => SignupData;
  clearData: () => void;
  createMessage: (message: string, type: MessageType) => void;
}

export default function Step6({
  onSuccess,
  onBack,
  cachedData,
  updateData,
  clearData,
  createMessage,
}: Step6Props) {
  const [kinshipCode, setKinshipCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (cachedData.kinshipCode) setKinshipCode(cachedData.kinshipCode);
  }, [cachedData.kinshipCode]);

  const handleBackNavigation = () => {
    updateData({ currentStep: "5" });
    onBack();
  };

  // Account already created in Step 3 — only save kinship code here
  const handleFinalSave = async (code: string) => {
    try {
      setIsLoading(true);

      const res = await updateKinshipCode({
        email: cachedData.email,
        referedKinshipCode: code,
        noCodeChecked: false,
      });

      if (!res.data?.status) {
        createMessage(
          res.data?.message || "Unable to save Kinship Code",
          "error"
        );
        return;
      }

      updateData({ kinshipCode: code, currentStep: "complete" });

      // Navigate to checkout FIRST, before setting the auth token.
      // Setting the token triggers auth context → useEffect redirects in
      // LoginForm and signup page auth guard, causing rapid multiple
      // navigations (blink/shake). By navigating first, the checkout page
      // loads cleanly and reads the token on mount.
      if (cachedData.authToken) {
        window.localStorage.setItem("token", cachedData.authToken);
      }

      // Check if this user should skip payment (email-based, backend-validated)
      // Backend also activates 'member' tier when skip=true
      const { shouldSkipPayment } = await import("@/lib/payment-skip");
      const skip = await shouldSkipPayment(cachedData.authToken);
      if (skip) {
        window.location.href = "/onboarding";
        return;
      }
      
      // Use window.location for a clean navigation without React state interference
      window.location.href = "/checkout";
    } catch {
      createMessage("Something went wrong", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const code = kinshipCode.trim();

    // Kinship Code is required.
    if (!code) {
      createMessage("Please enter a Kinship Code to continue.", "error");
      return;
    }

    // Validate length
    if (code.length < 3 || code.length > 20) {
      createMessage("Kinship Code must be between 3 and 20 characters.", "error");
      return;
    }

    try {
      setIsLoading(true);

      const response = await validateKinshipCode(code);

      if (!response.data?.status || !response.data?.result?.exists) {
        createMessage("Invalid Kinship Code. Please try again.", "error");
        setIsLoading(false);
        return;
      }

      // Code is valid — save
      await handleFinalSave(code);
    } catch {
      createMessage("Unable to verify Kinship Code.", "error");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="button"
        onClick={handleBackNavigation}
        className="bg-transparent border-0 text-skyblue font-bold text-[0.85rem] cursor-pointer p-0 mb-3 hover:text-white transition-colors"
      >
        ← Back
      </button>

      <p className="text-[0.85rem] text-white/68 mb-[1.2rem] leading-[1.5]">
        <b className="text-white">Step 6 of 6</b> · Make a Connection
      </p>

      <p className="text-white/75 text-[0.97rem] mb-4.5">
        Relationships are at the heart of the DUNAVERSE. Enter your Host&apos;s
        Kinship Code to establish trust, attribution, and shared rewards far into
        the future. By entering a Code now, both you and your Host will receive
        bonus WVDUNA Coins today.
      </p>

      <FormField label="Enter a Kinship Code" required>
        <Input
          type="text"
          placeholder="XXX—XXX—XXX"
          autoComplete="off"
          value={kinshipCode}
          onChange={(e) => setKinshipCode(e.target.value.trim())}
          maxLength={20}
        />
      </FormField>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full font-sans font-bold text-[1rem] py-4 rounded-[4px] bg-accent text-on-accent hover:bg-accent-hover transition-all duration-150 mt-[0.4rem] disabled:opacity-50"
      >
        {isLoading ? "Processing..." : "Enter the DUNAVERSE!"}
      </button>

      {/* No Kinship Code? Point the user to the community to get an invite. */}
      <div className="mt-5 pt-4 border-t border-border text-center">
        <p className="text-[0.85rem] text-muted mb-3">
          Don&apos;t have a Kinship Code yet?
        </p>
        <button
          type="button"
          onClick={async () => {
            // Mark the user as needing a code so they're redirected correctly on next login
            try {
              const client = (await import("@/lib/httpClient")).default;
              await client.post("/visitors/set-needs-code", { email: cachedData.email });
            } catch { /* best effort */ }
            window.location.href = "/community";
          }}
          className="block w-full font-sans font-bold text-[0.95rem] py-3 rounded-[4px] border border-skyblue/50 text-skyblue hover:bg-skyblue/10 hover:text-white transition-all duration-150 text-center cursor-pointer bg-transparent"
        >
          Join Our Community
        </button>
      </div>
    </form>
  );
}