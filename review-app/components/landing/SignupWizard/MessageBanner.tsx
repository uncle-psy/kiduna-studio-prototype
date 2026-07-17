"use client";

import type { MessageType } from "./useSignupMessage";

interface MessageBannerProps {
  show: boolean;
  text: string;
  type: MessageType;
}

export default function MessageBanner({ show, text, type }: MessageBannerProps) {
  if (!show || !text) return null;

  const colorMap: Record<MessageType, string> = {
    error: "bg-red-600/90 text-white",
    success: "bg-green-600/90 text-white",
    warn: "bg-yellow-600/90 text-white",
  };

  return (
    <div
      className={`${colorMap[type]} text-[0.85rem] px-4 py-2 rounded-[8px] mb-3 text-center transition-opacity duration-300`}
    >
      {text}
    </div>
  );
}
