"use client";

import React, { useState, useEffect } from "react";
import FormField, { Input } from "../ui/FormField";
import { generateEmailOtp, upsertStep1 } from "./signupApi";
import client from "@/lib/httpClient";
import type { SignupData } from "./constants";
import type { MessageType } from "./useSignupMessage";

interface Step1Props {
  onSuccess: () => void;
  cachedData: SignupData;
  updateData: (updates: Partial<SignupData>) => SignupData;
  createMessage: (message: string, type: MessageType) => void;
  clearData?: () => void;
}

export default function Step1({
  onSuccess,
  cachedData,
  updateData,
  createMessage,
  clearData,
}: Step1Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [hasChecked, setHasChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setFullName(cachedData.fullName || "");
    setEmail(cachedData.email || "");
    setHasChecked(cachedData.hasChecked ?? false);
  }, [cachedData.fullName, cachedData.email, cachedData.hasChecked]);

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      createMessage("First name is required", "error");
      return false;
    } else if (fullName.trim().length < 2) {
      createMessage("First name must be at least 2 characters", "error");
      return false;
    } else if (fullName.trim().length > 20) {
      createMessage("First name can be up to 20 characters only", "error");
      return false;
    } else if (!/^[a-zA-ZÀ-ÖØ-öø-ÿ\s'\-]+$/.test(fullName.trim())) {
      createMessage("First name can only contain letters, spaces, hyphens, and apostrophes", "error");
      return false;
    }

    if (!email.trim()) {
      createMessage("Email is required", "error");
      return false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email.trim())) {
      createMessage("Please enter a valid email address", "error");
      return false;
    }

    if (!hasChecked) {
      createMessage(
        "You must agree to receive communications before continuing",
        "error"
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      // Check if account already exists in users table before sending OTP
      try {
        const checkRes = await client.post("/visitors/check-email", {
          email: email.trim(),
        });
        if (checkRes.data?.exists) {
          createMessage(
            "An account with this email already exists. Please log in instead.",
            "error"
          );
          setIsLoading(false);
          return;
        }
      } catch (checkErr: any) {
        // If check-email endpoint doesn't exist, proceed with OTP generation
        // (backward compatibility)
        if (checkErr?.response?.status !== 404) {
          // Non-404 error means the endpoint exists but returned an error
        }
      }

      const response = await generateEmailOtp(email.trim());

      if (response.data?.status) {
        updateData({
          fullName: fullName.trim(),
          email: email.trim(),
          hasChecked,
          hasVerifiedEmail: false,
          currentStep: "2",
        });

        upsertStep1({
          email: email.trim(),
          firstName: fullName.trim(),
          hasChecked,
        });

        onSuccess();
      } else {
        createMessage(
          response.data?.message === "Email already exists"
            ? "Email is already registered"
            : response.data?.message || "Something went wrong",
          "error"
        );
        if (response.data?.message === "Email already exists") {
          clearData?.();
        }
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const apiMessage = err?.response?.data?.message;

      if (status === 409) {
        createMessage("Email is already registered", "error");
        clearData?.();
      } else {
        createMessage(
          apiMessage || "Unable to generate OTP. Please try again.",
          "error"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <p className="text-[0.85rem] text-white/75 mb-4 leading-[1.5]">
        <b className="text-white">Step 1 of 6</b>
        {" · "}Enter your name and email address. We&apos;ll send a 6-digit code to
        verify your email address.
      </p>

      <FormField label="First name or alias" required>
        <Input
          type="text"
          placeholder="what you want to be called"
          value={fullName}
          onChange={(e) => {
            // Allow only letters (including accented), spaces, hyphens, apostrophes
            const filtered = e.target.value
              .replace(/[^a-zA-ZÀ-ÖØ-öø-ÿ\s'\-]/g, "")
              // Strip emojis and other unicode symbols
              .replace(/\p{Extended_Pictographic}/gu, "");
            setFullName(filtered);
          }}
          onKeyDown={(e) => {
            // Block digits and common special chars at key level
            if (/^[0-9!@#$%^&*()_+=\[\]{};:"\\|,.<>/?`~]$/.test(e.key)) {
              e.preventDefault();
            }
          }}
          maxLength={20}
        />
      </FormField>

      <FormField label="Email address" required>
        <Input
          type="text"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
           maxLength={254}
        />
      </FormField>

      <label className="flex gap-[0.6rem] items-start text-[0.8rem] text-muted leading-[1.45] mt-2 cursor-pointer">
        <input
          type="checkbox"
          checked={hasChecked}
          onChange={(e) => setHasChecked(e.target.checked)}
          className="mt-[0.2rem] shrink-0 w-4 h-4 accent-accent"
        />
        <span>
          By continuing, I agree to receive various communications from WV DUNA
          with the understanding that I can unsubscribe anytime. I have reviewed
          the{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-skyblue hover:text-white">
            Privacy Policy
          </a>{" "}
          and accept the{" "}
          <a href="/tos" target="_blank" rel="noopener noreferrer" className="text-skyblue hover:text-white">
            Terms of Service
          </a>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full font-sans font-bold text-[1rem] py-4 rounded-[4px] bg-accent text-on-accent hover:bg-accent-hover transition-all duration-150 mt-[0.4rem] disabled:opacity-50"
      >
        {isLoading ? "Sending..." : "Send me the 6-digit code"}
      </button>
    </form>
  );
}