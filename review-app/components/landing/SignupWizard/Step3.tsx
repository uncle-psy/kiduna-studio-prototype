"use client";

import React, { useState, useEffect } from "react";
import FormField from "../ui/FormField";
import PasswordField from "../ui/PasswordField";
import { upsertStep3 } from "./signupApi";
import type { SignupData } from "./constants";
import type { MessageType } from "./useSignupMessage";

interface Step3Props {
  onSuccess: () => void;
  onBack: () => void;
  cachedData: SignupData;
  updateData: (updates: Partial<SignupData>) => SignupData;
  createMessage: (message: string, type: MessageType) => void;
}

export default function Step3({
  onSuccess,
  onBack,
  cachedData,
  updateData,
  createMessage,
}: Step3Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (cachedData.password) {
      setPassword(cachedData.password);
      setConfirmPassword(cachedData.password);
    }
  }, [cachedData.password]);

  const handleBackNavigation = () => {
    updateData({ currentStep: "2" });
    onBack();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!password) {
      createMessage("Password is required", "error");
      return;
    }
    if (password.length < 12) {
      createMessage("Password must be at least 12 characters", "error");
      return;
    }
    if (password.length > 32) {
      createMessage("Password must not exceed 32 characters", "error");
      return;
    }
    if (/\p{Extended_Pictographic}/u.test(password)) {
      createMessage("Password should not contain emojis", "error");
      return;
    }
    if (!confirmPassword) {
      createMessage("Confirm password is required", "error");
      return;
    }
    if (password !== confirmPassword) {
      createMessage("Password and Confirm Password do not match", "error");
      return;
    }

    // Account + wallet already created on a prior visit to this step. Calling
    // save-early-access again would fail with "Email already registered", so
    // just keep the password and move forward — later steps update the account.
    if (cachedData.accountCreated) {
      updateData({ password, currentStep: "4" });
      onSuccess();
      return;
    }

    setIsLoading(true);

    try {
      // David: password set பண்ணும்போதே account + wallet create ஆகணும்
      const res = await upsertStep3({
        email: cachedData.email,
        fullName: cachedData.fullName,
        password,
        hasVerifiedEmail: cachedData.hasVerifiedEmail,
      });

      if (!res.data?.status) {
        createMessage(
          res.data?.message === "Email already exists" ||
            res.data?.message === "Email is already registered"
            ? "Email is already registered"
            : res.data?.message || "Unable to create account",
          "error"
        );
        return;
      }

      // Account + wallet created. Hold the token in the signup cache only —
      // it becomes the active session at the end of the wizard (Step 6, before
      // checkout), so the public header doesn't show "Go to Studio" mid-signup.
      updateData({
        password,
        accountCreated: true,
        authToken: res.data?.token || "",
        currentStep: "4",
      });
      onSuccess();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        createMessage("Email is already registered", "error");
      } else {
        createMessage("Something went wrong. Please try again.", "error");
      }
    } finally {
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

      <p className="text-[0.85rem] text-white/70 mb-4 leading-[1.5]">
        <b className="text-white">Step 3 of 6</b> · Set your password. Use at least 12 characters. Longer is stronger. You
        can use letters, numbers, symbols, or a passphrase.
      </p>

      <FormField label="Set Password" required>
        <PasswordField
          id="su-pass"
          placeholder="At least 12 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={32}
        />
      </FormField>

      <FormField label="Confirm Password" required>
        <PasswordField
          id="su-pass2"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          maxLength={32}
        />
      </FormField>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full font-sans font-bold text-[1rem] py-4 rounded-[4px] bg-accent text-on-accent hover:bg-accent-hover transition-all duration-150 mt-[0.4rem] disabled:opacity-50"
      >
        {isLoading ? "Creating your account..." : "Set Your Password and Continue"}
      </button>
    </form>
  );
}