"use client";

import React, { useState, useRef } from "react";
import { verifyEmailOtp, resendEmailOtp, upsertStep2 } from "./signupApi";
import type { SignupData } from "./constants";
import type { MessageType } from "./useSignupMessage";

interface Step2Props {
  onSuccess: () => void;
  onBack: () => void;
  cachedData: SignupData;
  updateData: (updates: Partial<SignupData>) => SignupData;
  createMessage: (message: string, type: MessageType) => void;
}

export default function Step2({
  onSuccess,
  onBack,
  cachedData,
  updateData,
  createMessage,
}: Step2Props) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInvalid, setHasInvalid] = useState(false);
  const [hasLoadingResendOTP, setHasLoadingResendOTP] = useState(false);

  const handleOtpChange = (value: string, index: number) => {
    if (!/^[0-9]?$/.test(value)) return;
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
        inputRefs.current[index]?.focus();
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

    const pasteData = e.clipboardData.getData("text").trim();
    if (!/^\d+$/.test(pasteData)) return;

    const digits = pasteData.split("").slice(0, 6);
    const updated = [...otp];
    digits.forEach((digit, i) => {
      if (index + i < 6) updated[index + i] = digit;
    });

    setOtp(updated);
    const nextPos = Math.min(index + digits.length - 1, 5);
    inputRefs.current[nextPos]?.focus();
  };

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      createMessage("Please enter all 6 digits", "error");
      setHasInvalid(true);
      return;
    }

    try {
      setIsLoading(true);

      const result = await verifyEmailOtp(cachedData.email, code);

      if (result.data.status) {
        updateData({
          hasVerifiedEmail: true,
          currentStep: "3",
        });

        upsertStep2(cachedData.email);
        onSuccess();
      } else {
        setHasInvalid(true);
        createMessage(
          result.data.message || "Invalid verification code.",
          "error"
        );
      }
    } catch {
      createMessage("Something went wrong. Please try again.", "error");
      setHasInvalid(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setHasInvalid(false);
    setHasLoadingResendOTP(true);

    try {
      const result = await resendEmailOtp(cachedData.email);

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
    updateData({ currentStep: "1" });
    onBack();
  };

  return (
    <form onSubmit={handleVerify}>
      <button
        type="button"
        onClick={handleBackNavigation}
        className="bg-transparent border-0 text-skyblue font-normal text-[0.85rem] cursor-pointer p-0 mb-3 hover:text-white transition-colors"
      >
        ← Back
      </button>

      <div className="mb-4">
        <p className="text-[0.88rem] text-white/70 mb-2 leading-[1.5]">
          <b className="text-white">Step 2 of 6</b> — We sent a security code to{" "}
          <b className="text-white">{cachedData.email || "your email"}</b>.
          Please follow the steps below.
        </p>
      </div>

      <ol className="list-decimal pl-[1.2rem] text-white/75 text-[0.9rem] leading-[1.7] mb-[1.1rem]">
        <li>Open your email</li>
        <li>
          Look for a message from{" "}
          <b className="text-white">security@kinship.systems</b>
        </li>
        <li>Enter the code below to confirm it&apos;s you</li>
      </ol>

      <div className="mb-[1.05rem]">
        <label className="block font-semibold text-[0.88rem] mb-[0.4rem] text-white">
          Enter your 6-digit code
        </label>
        <div className="flex gap-3">
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
              className={`flex-1 min-w-0 text-center font-display text-[1.6rem] py-[0.50rem] rounded-[8px] border text-white focus:outline-none ${
                hasInvalid
                  ? "bg-red-900/30 border-red-500 focus:border-red-400"
                  : "bg-surface border-border focus:border-accent"
              }`}
            />
          ))}
        </div>
      </div>

      {!hasInvalid && (
        <p className="text-white/45 text-[0.8rem] mb-4">
          The code expires in 15 minutes. Didn&apos;t get it? Check your spam
          folder or request a new code.
        </p>
      )}
      {hasInvalid && (
        <p className="text-red-400 text-[0.8rem] mb-4">
          That code doesn&apos;t look right. Please check your email and try
          again.
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full font-sans font-bold text-[1rem] py-4 rounded-[4px] bg-accent text-on-accent hover:bg-accent-hover transition-all duration-150 mt-[0.4rem] disabled:opacity-50"
      >
        {isLoading ? "Verifying..." : "Verify & continue"}
      </button>

      <p className="mt-4 text-center text-[0.85rem] text-muted">
        Didn&apos;t get it?{" "}
        <button
          type="button"
          onClick={handleResend}
          className="bg-transparent border-0 text-skyblue font-normal cursor-pointer hover:text-white p-0"
        >
          {hasLoadingResendOTP ? "Sending..." : "Resend code"}
        </button>
        <br />
        Or{" "}
        <button
          type="button"
          onClick={handleBackNavigation}
          className="bg-transparent border-0 text-skyblue font-normal cursor-pointer hover:text-white p-0"
        >
          try a different email address
        </button>
      </p>
    </form>
  );
}