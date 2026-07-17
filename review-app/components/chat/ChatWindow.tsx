"use client";

/**
 * ChatWindow — WV DUNA Design System
 *
 * Identical API and all business logic preserved.
 * Only the UI layer is restyled to match the WV DUNA design system exactly.
 *
 * Design decisions (all from colors_and_type.css + UI Kit.html):
 * - Container: surface (#0A0D33) bg, radius-lg (14px) card, shadow-md
 * - Header:    WV DUNA ChatHeader (Goudy title, avatar, ModelSelector top-right)
 * - Messages:  WV DUNA MessageList + MessageBubble (gold user, navy assistant)
 * - Input:     WV DUNA ChatInput (gold focus ring, gold send button)
 * - Error:     danger (#FF3A3A) state, WV DUNA badge style
 */

import { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import {
  ChatHeader,
  ChatInput,
  MessageList,
} from "./ChatComponents";
// Re-export ModelOption so callers can import it from this file too
export type { ModelOption } from "./ChatComponents";

import {
  createChatSession,
  getChatMessages,
  sendChatMessage,
  type ChatSession,
  type ChatMessage,
} from "@/lib/chat-api";

// WV DUNA tokens used in this file
const T = {
  surface:  "#0A0D33",
  bg:       "#09073A",
  gold:     "#EAAA00",
  danger:   "#FF3A3A",
  fg:       "#FFFFFF",
  fgMuted:  "#CDCDCD",
  fgSoft:   "rgba(255,255,255,0.60)",
  fgDim:    "rgba(255,255,255,0.35)",
  border:   "rgba(255,255,255,0.12)",
  shadow:   "0 6px 20px rgba(3,1,27,0.45)",
} as const;

interface ChatWindowProps {
  presenceId:    string;
  presenceName:  string;
  presenceHandle?: string;
  userId:        string;
  userWallet:    string;
  userRole:      "creator" | "member" | "guest";
  platformId?:   string;
  onClose?:      () => void;
  className?:    string;
}

export function ChatWindow({
  presenceId,
  presenceName,
  presenceHandle,
  userId,
  userWallet,
  userRole,
  platformId,
  onClose,
  className = "",
}: ChatWindowProps) {
  const [session,    setSession]    = useState<ChatSession | null>(null);
  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [isLoading,  setIsLoading]  = useState(false);
  const [isSending,  setIsSending]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // ── Session init ─────────────────────────────────────────────────────────
  useEffect(() => {
    const initSession = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const newSession = await createChatSession({
          presenceId,
          userId,
          userWallet,
          userRole,
          platformId,
          title: `Chat with ${presenceName}`,
        });

        setSession(newSession);

        const existingMessages = await getChatMessages({
          sessionId: newSession.id,
          limit:     50,
        });

        setMessages(existingMessages);
      } catch (err) {
        console.error("Failed to init chat:", err);
        setError(err instanceof Error ? err.message : "Failed to start chat");
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, [presenceId, userId, userWallet, userRole, platformId, presenceName]);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (content: string) => {
      if (!session || isSending) return;

      setIsSending(true);
      setError(null);

      // Optimistic user message
      const tempMsg: ChatMessage = {
        id:        `temp_${Date.now()}`,
        sessionId: session.id,
        role:      "user",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempMsg]);

      try {
        const response = await sendChatMessage({
          sessionId: session.id,
          content,
          userId,
          userRole,
        });

        setMessages((prev) =>
          prev
            .filter((m) => m.id !== tempMsg.id)
            .concat([response.userMessage, response.assistantMessage])
        );

        if (response.orchestration.pendingApproval) {
          console.log("Action requires approval:", response.orchestration.pendingApproval);
        }
      } catch (err) {
        console.error("Failed to send message:", err);
        setError(err instanceof Error ? err.message : "Failed to send");
        setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      } finally {
        setIsSending(false);
      }
    },
    [session, userId, userRole, isSending]
  );

  // ── Build subtitle: "Your Host's Ally · WV DUNA" pattern ─────────────────
  const subtitle = presenceHandle
    ? `@${presenceHandle} · WV DUNA`
    : "Your Ally · WV DUNA";

  // ── Error state (no session) ─────────────────────────────────────────────
  if (error && !session) {
    return (
      <div
        className={className}
        style={{
          display:      "flex",
          flexDirection:"column",
          background:   T.surface,
          border:       `1px solid ${T.border}`,
          borderRadius: "14px",
          overflow:     "hidden",
          boxShadow:    T.shadow,
        }}
      >
        <ChatHeader
          title={presenceName}
          subtitle={subtitle}
          onBack={onClose}
        />
        <div
          style={{
            flex:           1,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            padding:        "40px 32px",
            textAlign:      "center",
            gap:            "16px",
          }}
        >
          {/* Danger badge circle */}
          <div
            style={{
              width:          "48px",
              height:         "48px",
              borderRadius:   "50%",
              background:     "rgba(255,58,58,0.12)",
              border:         `1px solid rgba(255,58,58,0.28)`,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
            }}
          >
            <Icon icon="lucide:alert-circle" width={22} height={22} style={{ color: T.danger }} />
          </div>
          <div>
            <h3
              style={{
                fontFamily: "var(--font-display, 'Goudy Heavyface', Georgia, serif)",
                fontSize:   "18px",
                fontWeight: 400,
                color:      T.fg,
                margin:     "0 0 8px",
              }}
            >
              Connection error
            </h3>
            <p
              style={{
                fontFamily: "var(--font-sans, 'Avenir', sans-serif)",
                fontSize:   "13px",
                color:      T.fgMuted,
                margin:     0,
                maxWidth:   "280px",
                lineHeight: "1.5",
              }}
            >
              {error}
            </p>
          </div>
          {/* Ghost retry button */}
          <button
            onClick={() => window.location.reload()}
            style={{
              fontFamily:    "var(--font-sans, 'Avenir', sans-serif)",
              fontSize:      "13px",
              fontWeight:    700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color:         T.gold,
              background:    "transparent",
              border:        `1px solid rgba(234,170,0,0.35)`,
              borderRadius:  "4px",
              padding:       "10px 20px",
              cursor:        "pointer",
              transition:    "background 160ms",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                "rgba(234,170,0,0.10)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                "transparent")
            }
          >
            Try again →
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div
      className={className}
      style={{
        display:       "flex",
        flexDirection: "column",
        background:    T.surface,
        border:        `1px solid ${T.border}`,
        borderRadius:  "14px",
        overflow:      "hidden",
        boxShadow:     T.shadow,
      }}
    >
      {/* Header — Goudy title, avatar, model selector. NO Live/Clear. */}
      <ChatHeader
        title={presenceName}
        subtitle={subtitle}
        onBack={onClose}
      />

      {/* Messages */}
      <MessageList
        messages={messages}
        agentName={presenceName}
        isLoading={isSending || isLoading}
      />

      {/* Inline error banner (when session exists but send failed) */}
      {error && session && (
        <div
          style={{
            padding:     "10px 20px",
            borderTop:   `1px solid rgba(255,58,58,0.20)`,
            background:  "rgba(255,58,58,0.08)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-sans, 'Avenir', sans-serif)",
              fontSize:   "12px",
              color:      T.danger,
              display:    "flex",
              alignItems: "center",
              gap:        "6px",
              margin:     0,
            }}
          >
            <Icon icon="lucide:alert-circle" width={13} height={13} />
            {error}
          </p>
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isLoading || isSending || !session}
        placeholder={
          isLoading ? "Connecting…" :
          isSending  ? "Sending…"   :
          `Message ${presenceName}…`
        }
      />
    </div>
  );
}

export default ChatWindow;