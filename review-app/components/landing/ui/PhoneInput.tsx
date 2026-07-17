"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

export interface PhoneValue {
  countryCode: string;
  dialCode: string;
  country: string;
  mobileNumber: string;
}

interface PhoneInputProps {
  value: PhoneValue;
  onChange: (value: PhoneValue) => void;
}

interface Country {
  name: string;
  code: string;
  dial: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { name: "United States", code: "US", dial: "1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "GB", dial: "44", flag: "🇬🇧" },
  { name: "Canada", code: "CA", dial: "1", flag: "🇨🇦" },
  { name: "Australia", code: "AU", dial: "61", flag: "🇦🇺" },
  { name: "India", code: "IN", dial: "91", flag: "🇮🇳" },
  { name: "Germany", code: "DE", dial: "49", flag: "🇩🇪" },
  { name: "France", code: "FR", dial: "33", flag: "🇫🇷" },
  { name: "Brazil", code: "BR", dial: "55", flag: "🇧🇷" },
  { name: "Japan", code: "JP", dial: "81", flag: "🇯🇵" },
  { name: "South Korea", code: "KR", dial: "82", flag: "🇰🇷" },
  { name: "China", code: "CN", dial: "86", flag: "🇨🇳" },
  { name: "Mexico", code: "MX", dial: "52", flag: "🇲🇽" },
  { name: "Spain", code: "ES", dial: "34", flag: "🇪🇸" },
  { name: "Italy", code: "IT", dial: "39", flag: "🇮🇹" },
  { name: "Netherlands", code: "NL", dial: "31", flag: "🇳🇱" },
  { name: "Sweden", code: "SE", dial: "46", flag: "🇸🇪" },
  { name: "Norway", code: "NO", dial: "47", flag: "🇳🇴" },
  { name: "Denmark", code: "DK", dial: "45", flag: "🇩🇰" },
  { name: "Finland", code: "FI", dial: "358", flag: "🇫🇮" },
  { name: "Switzerland", code: "CH", dial: "41", flag: "🇨🇭" },
  { name: "Austria", code: "AT", dial: "43", flag: "🇦🇹" },
  { name: "Belgium", code: "BE", dial: "32", flag: "🇧🇪" },
  { name: "Portugal", code: "PT", dial: "351", flag: "🇵🇹" },
  { name: "Ireland", code: "IE", dial: "353", flag: "🇮🇪" },
  { name: "New Zealand", code: "NZ", dial: "64", flag: "🇳🇿" },
  { name: "Singapore", code: "SG", dial: "65", flag: "🇸🇬" },
  { name: "Hong Kong", code: "HK", dial: "852", flag: "🇭🇰" },
  { name: "Taiwan", code: "TW", dial: "886", flag: "🇹🇼" },
  { name: "Thailand", code: "TH", dial: "66", flag: "🇹🇭" },
  { name: "Philippines", code: "PH", dial: "63", flag: "🇵🇭" },
  { name: "Malaysia", code: "MY", dial: "60", flag: "🇲🇾" },
  { name: "Indonesia", code: "ID", dial: "62", flag: "🇮🇩" },
  { name: "Vietnam", code: "VN", dial: "84", flag: "🇻🇳" },
  { name: "Pakistan", code: "PK", dial: "92", flag: "🇵🇰" },
  { name: "Bangladesh", code: "BD", dial: "880", flag: "🇧🇩" },
  { name: "Sri Lanka", code: "LK", dial: "94", flag: "🇱🇰" },
  { name: "Nepal", code: "NP", dial: "977", flag: "🇳🇵" },
  { name: "South Africa", code: "ZA", dial: "27", flag: "🇿🇦" },
  { name: "Nigeria", code: "NG", dial: "234", flag: "🇳🇬" },
  { name: "Kenya", code: "KE", dial: "254", flag: "🇰🇪" },
  { name: "Egypt", code: "EG", dial: "20", flag: "🇪🇬" },
  { name: "Turkey", code: "TR", dial: "90", flag: "🇹🇷" },
  { name: "Saudi Arabia", code: "SA", dial: "966", flag: "🇸🇦" },
  { name: "UAE", code: "AE", dial: "971", flag: "🇦🇪" },
  { name: "Israel", code: "IL", dial: "972", flag: "🇮🇱" },
  { name: "Russia", code: "RU", dial: "7", flag: "🇷🇺" },
  { name: "Poland", code: "PL", dial: "48", flag: "🇵🇱" },
  { name: "Czech Republic", code: "CZ", dial: "420", flag: "🇨🇿" },
  { name: "Romania", code: "RO", dial: "40", flag: "🇷🇴" },
  { name: "Greece", code: "GR", dial: "30", flag: "🇬🇷" },
  { name: "Argentina", code: "AR", dial: "54", flag: "🇦🇷" },
  { name: "Colombia", code: "CO", dial: "57", flag: "🇨🇴" },
  { name: "Chile", code: "CL", dial: "56", flag: "🇨🇱" },
  { name: "Peru", code: "PE", dial: "51", flag: "🇵🇪" },
];

export default function PhoneInput({ value, onChange }: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedCountry =
    COUNTRIES.find((c) => c.code === value.country) || COUNTRIES[0];

  const filtered = search
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dial.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES;

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setIsOpen(false);
      setSearch("");
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, handleClickOutside]);

  const selectCountry = (country: Country) => {
    onChange({
      ...value,
      country: country.code,
      dialCode: country.dial,
      countryCode: country.dial,
    });
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex rounded-[8px] border border-border focus-within:border-accent transition-colors bg-bg-deep">
        {/* Country code button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 text-white text-[0.95rem] transition-colors shrink-0 border-r border-border"
        >
          <span className="text-[1.2rem] leading-none">{selectedCountry.flag}</span>
          <span className="text-muted text-[0.85rem]">+{selectedCountry.dial}</span>
          <svg
            className={`w-3 h-3 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Phone number input */}
        <input
          type="tel"
          inputMode="tel"
          placeholder="Mobile number"
          autoComplete="tel"
          value={value.mobileNumber}
          onChange={(e) => {
            // Only allow digits, no + or country code prefix
            const cleaned = e.target.value.replace(/\D/g, "").slice(0, 15);
            onChange({ ...value, mobileNumber: cleaned });
          }}
          onKeyDown={(e) => {
            // Block +, e, E, -, . (common unwanted inputs on tel fields)
            if (["+", "e", "E", "-", "."].includes(e.key)) e.preventDefault();
          }}
          className="w-full py-[0.78rem] px-4 rounded-r-[8px] bg-transparent text-white font-sans text-[1rem] focus:outline-none border-none"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full max-h-[240px] bg-surface border border-border rounded-[8px] overflow-hidden shadow-lg shadow-black/40">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-2 px-3 rounded-[6px] bg-bg-deep border border-border text-white font-sans text-[0.85rem] focus:outline-none focus:border-accent placeholder:text-dim"
            />
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[184px]">
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-dim text-[0.85rem] text-center">
                No countries found
              </div>
            )}
            {filtered.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => selectCountry(country)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent/10 transition-colors ${
                  country.code === value.country
                    ? "bg-accent/10 text-white"
                    : "text-muted"
                }`}
              >
                <span className="text-[1.1rem] leading-none">{country.flag}</span>
                <span className="text-[0.85rem] flex-1 truncate">{country.name}</span>
                <span className="text-dim text-[0.8rem]">+{country.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}