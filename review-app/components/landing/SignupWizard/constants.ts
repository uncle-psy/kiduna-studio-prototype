export const STORAGE_KEY = "duna-signup-data";

export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface SignupData {
  fullName: string;
  email: string;
  hasChecked: boolean;
  hasVerifiedEmail: boolean;
  password: string;
  confirmPassword: string;
  mobileNumber: string;
  countryCode: string;
  country: string;
  isMobileNumberVerified: boolean;
  mobilePreferences: string[];
  kinshipCode: string;
  noCodeChecked: boolean;
  // Set true once Step 3 has created the account + wallet. Guards against
  // re-creating (and an "Email already registered" dead-end) when the user
  // navigates back to Step 3.
  accountCreated: boolean;
  // Auth token returned by Step 3 account creation. Held in the signup cache
  // (NOT localStorage "token") until the user finishes the wizard, so the
  // public header doesn't treat an in-progress signup as a logged-in session.
  authToken: string;
  currentStep: string;
}

export const DEFAULT_SIGNUP_DATA: SignupData = {
  fullName: "",
  email: "",
  hasChecked: false,
  hasVerifiedEmail: false,
  password: "",
  confirmPassword: "",
  mobileNumber: "",
  countryCode: "",
  country: "",
  isMobileNumberVerified: false,
  mobilePreferences: [],
  kinshipCode: "",
  noCodeChecked: false,
  accountCreated: false,
  authToken: "",
  currentStep: "1",
};
