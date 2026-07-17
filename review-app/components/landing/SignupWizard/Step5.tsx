"use client";

import React, { useState, useRef } from "react";
import { verifySmsOtp, resendSmsOtp, upsertStep5 } from "./signupApi";
import type { SignupData } from "./constants";
import type { MessageType } from "./useSignupMessage";

interface Step5Props {
  onSuccess: () => void;
  onBack: () => void;
  cachedData: SignupData;
  updateData: (updates: Partial<SignupData>) => SignupData;
  createMessage: (message: string, type: MessageType) => void;
}

export default function Step5({
  onSuccess,
  onBack,
  cachedData,
  updateData,
  createMessage,
}: Step5Props) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInvalid, setHasInvalid] = useState(false);
  const [hasLoadingResendOTP, setHasLoadingResendOTP] = useState(false);

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;
    setHasInvalid(false);

    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);

    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    setHasInvalid(false);

    if (e.key === "Backspace") {
      e.preventDefault();
      const updated = [...otp];

      if (otp[index]) {
        updated[index] = "";
        setOtp(updated);
      } else if (index > 0) {
        updated[index - 1] = "";
        setOtp(updated);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number
  ) => {
    e.preventDefault();
    setHasInvalid(false);

    const pasteData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pasteData) return;

    const newOtp = [...otp];
    pasteData.split("").forEach((char, i) => {
      if (index + i < 6) newOtp[index + i] = char;
    });

    setOtp(newOtp);
    inputRefs.current[Math.min(index + pasteData.length, 5)]?.focus();
  };

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 6) {
      createMessage("Please enter the full 6-digit code.", "error");
      setHasInvalid(true);
      return;
    }

    try {
      setIsLoading(true);

      const res = await verifySmsOtp(cachedData.mobileNumber, enteredOtp);

      if (res.data.status) {
        updateData({
          isMobileNumberVerified: true,
          currentStep: "6",
        });

        upsertStep5(cachedData.email);
        onSuccess();
      } else {
        setHasInvalid(true);
        createMessage(res.data.message || "Invalid code", "error");
      }
    } catch {
      createMessage("Something went wrong", "error");
      setHasInvalid(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setHasInvalid(false);
    setHasLoadingResendOTP(true);

    try {
      const result = await resendSmsOtp({
        email: cachedData.email,
        mobile: cachedData.mobileNumber,
        countryCode: cachedData.countryCode,
      });

      if (result.data.status) {
        setOtp(["", "", "", "", "", ""]);
        if (result.data.code === "OTP_ALREADY_SENT") {
          createMessage(result.data.message, "warn");
        } else if (result.data.code === "OTP_SENT") {
          createMessage(result.data.message, "success");
        }
      } else {
        createMessage(result.data.message, "error");
        setHasInvalid(true);
      }
    } finally {
      setHasLoadingResendOTP(false);
    }
  };

  const handleBackNavigation = () => {
    updateData({ currentStep: "4" });
    onBack();
  };

  return (
    <form onSubmit={handleVerify}>
      <button
        type="button"
        onClick={handleBackNavigation}
        className="bg-transparent border-0 text-skyblue font-bold text-[0.85rem] cursor-pointer p-0 mb-3 hover:text-white transition-colors"
      >
        ← Back
      </button>

      <p className="text-[0.85rem] text-muted mb-4 leading-[1.5]">
        <b className="text-white">Step 5 of 6</b> . Verify your mobile number. We sent a six-digit code to{" "}
        <b className="text-white">
          +{cachedData.countryCode || ""} {cachedData.mobileNumber || "your phone"}
        </b>.
      </p>

      <div className="mb-[1.05rem]">
        <label className="block font-semibold text-[0.88rem] mb-[0.4rem] text-white">
          Enter your 6-digit code
        </label>
        <div className="flex gap-2">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              onChange={(e) => handleOtpChange(e.target.value, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onPaste={(e) => handlePaste(e, idx)}
              aria-label={`Digit ${idx + 1}`}
              className={`flex-1 min-w-0 text-center font-display text-[1.25rem] py-[0.4rem] rounded-[8px] border text-white focus:outline-none ${
                hasInvalid
                  ? "bg-red-900/30 border-red-500 focus:border-red-400"
                  : "bg-surface border-border focus:border-accent"
              }`}
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full font-sans font-bold text-[0.95rem] py-3 rounded-[4px] bg-accent text-on-accent hover:bg-accent-hover transition-all duration-150 mt-[0.4rem] disabled:opacity-50"
      >
        {isLoading ? "Verifying..." : "Verify and Continue"}
      </button>

      <p className="mt-4 text-center text-[0.85rem] text-muted">
        Didn&apos;t get a code?{" "}
        <button
          type="button"
          onClick={handleResend}
          className="bg-transparent border-0 text-skyblue font-semibold cursor-pointer hover:text-white p-0"
        >
          {hasLoadingResendOTP ? "Sending..." : "Resend"}
        </button>
      </p>
    </form>
  );
}