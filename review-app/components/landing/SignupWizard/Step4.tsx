"use client";

import React, { useState, useEffect } from "react";
import FormField from "../ui/FormField";
import PhoneInput from "../ui/PhoneInput";
import type { PhoneValue } from "../ui/PhoneInput";
import { generateSmsOtp, upsertStep4 } from "./signupApi";
import type { SignupData } from "./constants";
import type { MessageType } from "./useSignupMessage";

interface Step4Props {
  onSuccess: () => void;
  onBack: () => void;
  cachedData: SignupData;
  updateData: (updates: Partial<SignupData>) => SignupData;
  createMessage: (message: string, type: MessageType) => void;
}

export default function Step4({
  onSuccess,
  onBack,
  cachedData,
  updateData,
  createMessage,
}: Step4Props) {
  const [phoneValue, setPhoneValue] = useState<PhoneValue>({
    countryCode: "1",
    dialCode: "1",
    country: "US",
    mobileNumber: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (cachedData.mobileNumber || cachedData.countryCode) {
      setPhoneValue({
        mobileNumber: cachedData.mobileNumber || "",
        countryCode: cachedData.countryCode || "1",
        dialCode: cachedData.countryCode || "1",
        country: cachedData.country || "US",
      });
    }
  }, [cachedData.mobileNumber, cachedData.countryCode, cachedData.country]);

  const handleBackNavigation = () => {
    updateData({ currentStep: "3" });
    onBack();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleaned = phoneValue.mobileNumber.replace(/[\s\-()]/g, "");

    if (!cleaned) {
      createMessage("Mobile number is required.", "error");
      return;
    }

    if (cleaned.length < 8) {
      createMessage("Please enter a valid mobile number.", "error");
      return;
    }

    const numberChanged =
      cachedData.mobileNumber !== cleaned ||
      cachedData.countryCode !== phoneValue.dialCode;

    if (cachedData.isMobileNumberVerified !== true || numberChanged) {
      try {
        setIsLoading(true);

        const result = await generateSmsOtp({
          email: cachedData.email,
          mobile: cleaned,
          countryCode: phoneValue.dialCode,
        });

        if (result.data.status) {
          updateData({
            mobileNumber: cleaned,
            countryCode: phoneValue.dialCode,
            country: phoneValue.country,
            isMobileNumberVerified: false,
            currentStep: "5",
          });

          upsertStep4({
            email: cachedData.email,
            mobileNumber: cleaned,
            countryCode: phoneValue.dialCode,
            country: phoneValue.country,
          });

          onSuccess();
        } else {
          createMessage(
            result.data.message || "Please check the mobile number",
            "error"
          );
        }
      } catch {
        createMessage("Something went wrong", "error");
      } finally {
        setIsLoading(false);
      }
    } else {
      updateData({ currentStep: "6" });
      onSuccess();
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

      <p className="text-[0.85rem] text-muted mb-4 leading-[1.5]">
        <b className="text-white">Step 4 of 6</b> — Enter your mobile number. We&apos;ll send a 6-digit code by text to
        verify and continue.
      </p>

      <FormField label="Mobile number" required>
        <PhoneInput value={phoneValue} onChange={setPhoneValue} />
      </FormField>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full font-sans font-bold text-[0.95rem] py-3 rounded-[4px] bg-accent text-on-accent hover:bg-accent-hover transition-all duration-150 mt-[0.4rem] disabled:opacity-50"
      >
        {isLoading ? "Sending..." : "Send code"}
      </button>
    </form>
  );
}