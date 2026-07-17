"use client";

/**
 * Chat Components — WV DUNA Design System
 *
 * All values extracted directly from WV DUNA colors_and_type.css and
 * UI Kit.html. No invented colours. No generic Tailwind defaults.
 *
 * Design tokens used:
 *   --bg-deep:          #03011B  (page / drawer backgrounds)
 *   --bg:               #09073A  (primary surface background)
 *   --surface:          #0A0D33  (cards, message bubbles)
 *   --surface-elev:     #100E59  (elevated panels, model dropdown)
 *   --surface-muted:    rgba(255,255,255,0.04)
 *   --fg:               #FFFFFF
 *   --fg-muted:         #CDCDCD
 *   --fg-soft:          rgba(255,255,255,0.60)
 *   --fg-dim:           rgba(255,255,255,0.35)
 *   --border:           rgba(255,255,255,0.12)
 *   --border-strong:    rgba(255,255,255,0.22)
 *   --accent:           #EAAA00  (Old Gold — the single primary action)
 *   --accent-hover:     #FFC229
 *   --on-accent:        #09073A  (navy text ON gold)
 *   --kin-skyblue:      #03CCD9  (links, on-chain, secondary accent)
 *   --success:          #00EB75
 *   --danger:           #FF3A3A
 *   --radius-xs:        4px   (buttons)
 *   --radius-sm:        6px   (inputs)
 *   --radius-md:        10px  (inner elements)
 *   --radius-lg:        14px  (cards)
 *   --radius-xl:        20px  (panels)
 *   --radius-pill:      9999px
 *   --shadow-md:        0 6px 20px rgba(3,1,27,0.45)
 *   --shadow-lg:        0 18px 48px rgba(3,1,27,0.55)
 *   --shadow-glow-accent: 0 0 0 1px rgba(234,170,0,0.40), 0 8px 28px rgba(234,170,0,0.20)
 *   --font-display:     "Goudy Heavyface", Georgia, serif
 *   --font-sans:        "Avenir", system-ui, sans-serif
 *   --tracking-caps:    0.16em
 */

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import type { ChatMessage, MessageAction } from "@/lib/chat-api";

// ─────────────────────────────────────────────────────────────────────────────
// WV DUNA design tokens as JS constants (mirrors colors_and_type.css)
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  bgDeep:       "#03011B",
  bg:           "#09073A",
  surface:      "#0A0D33",
  surfaceElev:  "#100E59",
  gold:         "#EAAA00",
  goldHover:    "#FFC229",
  onAccent:     "#09073A",
  skyblue:      "#03CCD9",
  success:      "#00EB75",
  danger:       "#FF3A3A",
  fg:           "#FFFFFF",
  fgMuted:      "#CDCDCD",
  fgSoft:       "rgba(255,255,255,0.60)",
  fgDim:        "rgba(255,255,255,0.35)",
  border:       "rgba(255,255,255,0.12)",
  borderStrong: "rgba(255,255,255,0.22)",
  shadow:       "0 6px 20px rgba(3,1,27,0.45)",
  shadowLg:     "0 18px 48px rgba(3,1,27,0.55)",
  glowAccent:   "0 0 0 1px rgba(234,170,0,0.40), 0 8px 28px rgba(234,170,0,0.20)",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Model Selector Dropdown
// Sits top-right of the chat header. Options: Auto · GPT · Claude · Llama.
// Matches WV DUNA chip / dropdown pattern: surface-elev background, gold
// accent for selected state, Avenir sans-serif, pill trigger.
// ─────────────────────────────────────────────────────────────────────────────

export type ModelOption = "Auto" | "GPT" | "Claude" | "Llama";

const MODEL_OPTIONS: { value: ModelOption; label: string; sub?: string }[] = [
  { value: "Auto",   label: "Auto",         sub: "Best for the task"   },
  { value: "GPT",    label: "GPT",          sub: "OpenAI"              },
  { value: "Claude", label: "Claude",       sub: "Anthropic"           },
  { value: "Llama",  label: "Llama",        sub: "On-prem"             },
];

interface ModelSelectorProps {
  value?: ModelOption;
  onChange?: (v: ModelOption) => void;
}

export function ModelSelector({ value = "Auto", onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ModelOption>(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const pick = (v: ModelOption) => {
    setSelected(v);
    onChange?.(v);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Trigger — WV DUNA pill chip (chips.selected = gold bg + navy text) */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display:        "inline-flex",
          alignItems:     "center",
          gap:            "6px",
          fontFamily:     "var(--font-sans, 'Avenir', sans-serif)",
          fontSize:       "12px",
          fontWeight:     700,
          letterSpacing:  "0.06em",
          textTransform:  "uppercase",
          padding:        "6px 12px",
          borderRadius:   "9999px",
          border:         `1px solid ${T.gold}`,
          background:     open ? T.gold : "transparent",
          color:          open ? T.onAccent : T.gold,
          cursor:         "pointer",
          transition:     "background 160ms, color 160ms",
          whiteSpace:     "nowrap",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(234,170,0,0.14)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected}
        <Icon
          icon="lucide:chevron-down"
          width={12}
          height={12}
          style={{
            transition:  "transform 160ms",
            transform:   open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Dropdown — surface-elev panel, radius-lg, shadow-lg */}
      {open && (
        <div
          role="listbox"
          style={{
            position:     "absolute",
            top:          "calc(100% + 8px)",
            right:        0,
            zIndex:       100,
            minWidth:     "180px",
            background:   T.surfaceElev,
            border:       `1px solid ${T.borderStrong}`,
            borderRadius: "14px",
            boxShadow:    T.shadowLg,
            padding:      "6px",
            animation:    "wvDropIn 0.13s ease-out",
          }}
        >
          <style>{`
            @keyframes wvDropIn {
              from { opacity:0; transform:translateY(-6px) scale(0.97); }
              to   { opacity:1; transform:translateY(0)    scale(1);    }
            }
          `}</style>
          {MODEL_OPTIONS.map((opt) => {
            const isActive = opt.value === selected;
            return (
              <button
                key={opt.value}
                role="option"
                aria-selected={isActive}
                onClick={() => pick(opt.value)}
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "space-between",
                  width:          "100%",
                  padding:        "10px 12px",
                  borderRadius:   "10px",
                  border:         "none",
                  background:     isActive
                    ? "rgba(234,170,0,0.14)"
                    : "transparent",
                  cursor:   "pointer",
                  textAlign: "left",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                }}
              >
                <span style={{ display: "grid", gap: "2px" }}>
                  <span
                    style={{
                      fontFamily:  "var(--font-sans, 'Avenir', sans-serif)",
                      fontSize:    "13px",
                      fontWeight:  isActive ? 700 : 500,
                      color:       isActive ? T.gold : T.fg,
                    }}
                  >
                    {opt.label}
                  </span>
                  {opt.sub && (
                    <span
                      style={{
                        fontFamily: "var(--font-sans, 'Avenir', sans-serif)",
                        fontSize:   "10px",
                        color:      T.fgSoft,
                      }}
                    >
                      {opt.sub}
                    </span>
                  )}
                </span>
                {isActive && (
                  <Icon
                    icon="lucide:check"
                    width={14}
                    height={14}
                    style={{ color: T.gold, flexShrink: 0 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Header
// Structure: back button? · avatar circle · title + subtitle · model selector
// The LIVE and CLEAR buttons from the old design are removed entirely.
// ─────────────────────────────────────────────────────────────────────────────

interface ChatHeaderProps {
  title:    string;
  subtitle?: string;
  avatar?:  React.ReactNode;
  onBack?:  () => void;
  model?:   ModelOption;
  onModelChange?: (v: ModelOption) => void;
}

export function ChatHeader({
  title,
  subtitle,
  avatar,
  onBack,
  model,
  onModelChange,
}: ChatHeaderProps) {
  return (
    <div
      style={{
        display:         "flex",
        alignItems:      "center",
        gap:             "12px",
        padding:         "14px 20px",
        borderBottom:    `1px solid ${T.border}`,
        background:      T.bg,
        backdropFilter:  "blur(10px)",
        position:        "sticky",
        top:             0,
        zIndex:          10,
      }}
    >
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            width:        "32px",
            height:       "32px",
            borderRadius: "9999px",
            border:       `1px solid ${T.border}`,
            background:   "transparent",
            color:        T.fgSoft,
            cursor:       "pointer",
            flexShrink:   0,
            transition:   "border-color 160ms, color 160ms",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              T.borderStrong;
            (e.currentTarget as HTMLButtonElement).style.color = T.fg;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = T.border;
            (e.currentTarget as HTMLButtonElement).style.color = T.fgSoft;
          }}
          aria-label="Go back"
        >
          <Icon icon="lucide:arrow-left" width={16} height={16} />
        </button>
      )}

      {/* Avatar — WV DUNA avatar circle: surface-elev bg, gold initial, Goudy */}
      {avatar ?? (
        <WvAvatar name={title} size={40} />
      )}

      {/* Title + subtitle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2
          style={{
            fontFamily:   "var(--font-display, 'Goudy Heavyface', Georgia, serif)",
            fontSize:     "17px",
            fontWeight:   400,
            lineHeight:   "1.1",
            color:        T.fg,
            margin:       0,
            whiteSpace:   "nowrap",
            overflow:     "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              fontFamily:   "var(--font-sans, 'Avenir', sans-serif)",
              fontSize:     "11px",
              fontWeight:   400,
              color:        T.fgSoft,
              margin:       "2px 0 0",
              whiteSpace:   "nowrap",
              overflow:     "hidden",
              textOverflow: "ellipsis",
              maxWidth:     "320px",
            }}
          >
            {subtitle.length > 60 ? subtitle.slice(0, 60) + "…" : subtitle}
          </p>
        )}
      </div>

      {/* Model selector — top-right */}
      <ModelSelector value={model} onChange={onModelChange} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WV DUNA avatar — Goudy initial on surface-elev radial gradient
// Used in header, message list, chat list items
// ─────────────────────────────────────────────────────────────────────────────

interface WvAvatarProps {
  name:   string;
  size?:  number;
}

export function WvAvatar({ name, size = 36 }: WvAvatarProps) {
  const letter = name.trim()[0]?.toUpperCase() ?? "?";
  return (
    <div
      aria-hidden="true"
      style={{
        width:          `${size}px`,
        height:         `${size}px`,
        borderRadius:   "50%",
        flexShrink:     0,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontFamily:     "var(--font-display, 'Goudy Heavyface', Georgia, serif)",
        fontSize:       `${Math.round(size * 0.42)}px`,
        fontWeight:     400,
        color:          T.gold,
        background:     `radial-gradient(circle at 35% 35%, ${T.surfaceElev}, ${T.bg})`,
        border:         `1px solid rgba(234,170,0,0.28)`,
        boxShadow:      `0 0 0 0 transparent`,
        userSelect:     "none",
      }}
    >
      {letter}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Indicator (unchanged functionality, restyled)
// ─────────────────────────────────────────────────────────────────────────────

interface ActionIndicatorProps {
  action: MessageAction;
}

function ActionIndicator({ action }: ActionIndicatorProps) {
  const cfg = {
    pending:          { icon: "lucide:loader-2",   color: T.gold,    bg: "rgba(234,170,0,0.12)",  label: "Processing…",      spin: true  },
    executed:         { icon: "lucide:check-circle",color: T.success, bg: "rgba(0,235,117,0.12)",  label: "Completed",        spin: false },
    failed:           { icon: "lucide:x-circle",   color: T.danger,  bg: "rgba(255,58,58,0.12)",  label: "Failed",           spin: false },
    requires_approval:{ icon: "lucide:shield-alert",color: T.skyblue, bg: "rgba(3,204,217,0.12)", label: "Awaiting approval", spin: false },
  } as const;

  const c = cfg[action.status as keyof typeof cfg] ?? cfg.pending;

  return (
    <div
      style={{
        marginTop:    "10px",
        padding:      "8px 10px",
        borderRadius: "8px",
        background:   c.bg,
        border:       `1px solid ${c.color}28`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <Icon
          icon={c.icon}
          width={13}
          height={13}
          style={{
            color:     c.color,
            animation: c.spin ? "spin 1s linear infinite" : "none",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-sans, 'Avenir', sans-serif)",
            fontSize:   "11px",
            fontWeight: 700,
            color:      c.color,
          }}
        >
          {c.label}
        </span>
      </div>
      {action.workerName && (
        <p
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize:   "10px",
            color:      T.fgSoft,
            margin:     "4px 0 0",
          }}
        >
          Worker: {action.workerName}
        </p>
      )}
      {action.type && (
        <p
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize:   "10px",
            color:      T.fgSoft,
            margin:     "2px 0 0",
          }}
        >
          Action: {action.type}
        </p>
      )}
      {action.error && (
        <p
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize:   "10px",
            color:      T.danger,
            margin:     "4px 0 0",
          }}
        >
          {action.error}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Message Bubble
// User:     gold (#EAAA00) bubble, navy text (--on-accent), rounded-2xl br-sm
// Assistant: surface (#0A0D33) bubble, 1px border, fg text, rounded-2xl bl-sm
// System:   centered, muted pill
// ─────────────────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message:  ChatMessage;
  agentName?: string;
  isLast?:  boolean;
}

export function MessageBubble({ message, agentName, isLast }: MessageBubbleProps) {
  const isUser   = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div
        style={{
          display:        "flex",
          justifyContent: "center",
          margin:         "16px 0",
        }}
      >
        <div
          style={{
            fontFamily:   "var(--font-sans, 'Avenir', sans-serif)",
            fontSize:     "11px",
            letterSpacing:"0.08em",
            textTransform:"uppercase",
            color:        T.fgSoft,
            background:   "rgba(255,255,255,0.04)",
            border:       `1px solid ${T.border}`,
            borderRadius: "9999px",
            padding:      "5px 14px",
            maxWidth:     "420px",
            textAlign:    "center",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  isUser ? "row-reverse" : "row",
        alignItems:     "flex-end",
        gap:            "10px",
        marginBottom:   "16px",
      }}
    >
      {/* Assistant avatar — WvAvatar aligned to bubble bottom */}
      {!isUser && (
        <WvAvatar name={agentName ?? "A"} size={30} />
      )}

      <div style={{ maxWidth: "72%", display: "grid", gap: "4px" }}>
        {/* Agent name label — eyebrow style above first assistant bubble */}
        {!isUser && agentName && (
          <span
            style={{
              fontFamily:   "var(--font-sans, 'Avenir', sans-serif)",
              fontSize:     "10px",
              fontWeight:   700,
              letterSpacing:"0.14em",
              textTransform:"uppercase",
              color:        T.gold,
            }}
          >
            {agentName}
          </span>
        )}

        {/* Bubble */}
        <div
          style={{
            fontFamily:   "var(--font-sans, 'Avenir', sans-serif)",
            fontSize:     "14px",
            lineHeight:   "1.55",
            whiteSpace:   "pre-wrap",
            wordBreak:    "break-word",
            padding:      "12px 16px",
            borderRadius: isUser
              ? "18px 18px 4px 18px"
              : "18px 18px 18px 4px",
            background:   isUser ? T.gold : T.surface,
            color:        isUser ? T.onAccent : T.fgMuted,
            border:       isUser
              ? "none"
              : `1px solid ${T.border}`,
            boxShadow:    isUser
              ? "0 4px 18px rgba(234,170,0,0.35)"
              : T.shadow,
          }}
        >
          {message.content}
          {message.action && <ActionIndicator action={message.action} />}
        </div>

        {/* Timestamp — mono, dim */}
        <span
          style={{
            fontFamily:  "var(--font-mono, monospace)",
            fontSize:    "10px",
            color:       T.fgDim,
            textAlign:   isUser ? "right" : "left",
            paddingLeft: isUser ? 0 : "4px",
          }}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour:   "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Typing Indicator — three gold dots, WV DUNA bounce
// ─────────────────────────────────────────────────────────────────────────────

export function TypingIndicator() {
  return (
    <>
      <style>{`
        @keyframes wvDot {
          0%, 60%, 100% { transform: translateY(0); opacity:0.35; }
          30%            { transform: translateY(-5px); opacity:1; }
        }
      `}</style>
      <div
        style={{
          display:       "flex",
          flexDirection: "row",
          alignItems:    "flex-end",
          gap:           "10px",
          marginBottom:  "16px",
        }}
      >
        <WvAvatar name="A" size={30} />
        <div
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "5px",
            padding:      "14px 18px",
            borderRadius: "18px 18px 18px 4px",
            background:   T.surface,
            border:       `1px solid ${T.border}`,
            boxShadow:    T.shadow,
          }}
        >
          {[0, 0.18, 0.36].map((delay, i) => (
            <span
              key={i}
              style={{
                display:      "block",
                width:        "6px",
                height:       "6px",
                borderRadius: "50%",
                background:   T.gold,
                animation:    `wvDot 1.2s ease-in-out ${delay}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Message List
// ─────────────────────────────────────────────────────────────────────────────

interface MessageListProps {
  messages:    ChatMessage[];
  agentName?:  string;
  isLoading?:  boolean;
  onLoadMore?: () => void;
  hasMore?:    boolean;
}

export function MessageList({
  messages,
  agentName,
  isLoading = false,
  onLoadMore,
  hasMore = false,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isLoading]);

  return (
    <div
      style={{
        flex:       1,
        overflowY:  "auto",
        padding:    "24px 20px 16px",
        scrollBehavior: "smooth",
      }}
    >
      {/* Load earlier */}
      {hasMore && onLoadMore && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            style={{
              fontFamily:    "var(--font-sans, 'Avenir', sans-serif)",
              fontSize:      "12px",
              fontWeight:    700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color:         T.gold,
              background:    "transparent",
              border:        `1px solid rgba(234,170,0,0.30)`,
              borderRadius:  "9999px",
              padding:       "6px 16px",
              cursor:        isLoading ? "not-allowed" : "pointer",
              opacity:       isLoading ? 0.4 : 1,
              transition:    "background 160ms",
            }}
          >
            {isLoading ? "Loading…" : "Load earlier messages"}
          </button>
        </div>
      )}

      {/* Empty state */}
      {messages.length === 0 && !isLoading && (
        <div
          style={{
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            height:         "100%",
            gap:            "20px",
            textAlign:      "center",
            padding:        "40px 32px",
          }}
        >
          {/* Decorative radial glow + avatar */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                position:     "absolute",
                inset:        "-28px",
                borderRadius: "50%",
                background:   "radial-gradient(circle, rgba(234,170,0,0.18), transparent 70%)",
                pointerEvents:"none",
              }}
            />
            <WvAvatar name={agentName ?? "Agent"} size={64} />
          </div>
          <div style={{ maxWidth: "320px" }}>
            <h3
              style={{
                fontFamily: "var(--font-display, 'Goudy Heavyface', Georgia, serif)",
                fontSize:   "22px",
                fontWeight: 400,
                color:      T.fg,
                margin:     "0 0 10px",
                lineHeight: "1.1",
              }}
            >
              {agentName ?? "Your Ally"}
            </h3>
            <p
              style={{
                fontFamily: "var(--font-sans, 'Avenir', sans-serif)",
                fontSize:   "14px",
                color:      T.fgMuted,
                margin:     "0 0 20px",
                lineHeight: "1.55",
              }}
            >
              Send a message to start the conversation.
            </p>
            {/* Ready badge — WV DUNA b-success style */}
            <span
              style={{
                display:       "inline-flex",
                alignItems:    "center",
                gap:           "6px",
                fontFamily:    "var(--font-sans, 'Avenir', sans-serif)",
                fontSize:      "11px",
                fontWeight:    700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding:       "5px 12px",
                borderRadius:  "9999px",
                background:    "rgba(0,235,117,0.14)",
                color:         "#00EB75",
              }}
            >
              <span
                style={{
                  width:        "6px",
                  height:       "6px",
                  borderRadius: "50%",
                  background:   "#00EB75",
                  flexShrink:   0,
                }}
              />
              Ready
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.map((msg, idx) => {
        const prevMsg = messages[idx - 1];
        const showLabel =
          !isUser(msg) &&
          (idx === 0 || isUser(prevMsg));
        return (
          <MessageBubble
            key={msg.id}
            message={msg}
            agentName={showLabel ? agentName : undefined}
            isLast={idx === messages.length - 1}
          />
        );
      })}

      {/* Typing indicator */}
      {isLoading && <TypingIndicator />}

      <div ref={bottomRef} />
    </div>
  );
}

function isUser(msg: ChatMessage) {
  return msg.role === "user";
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Input
// Matches WV DUNA input style: bg rgba(255,255,255,0.04), border rgba(255,255,255,0.12),
// radius-sm (6px) for the field, gold focus ring.
// Send button: gold primary btn (--radius-xs, gold bg, on-accent navy text).
// Mic button: ghost style.
// ─────────────────────────────────────────────────────────────────────────────

interface ChatInputProps {
  onSend:       (message: string) => void;
  disabled?:    boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type a message…",
}: ChatInputProps) {
  const [input,   setInput]   = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = !disabled && input.trim().length > 0;

  return (
    <div
      style={{
        borderTop:  `1px solid ${T.border}`,
        background: T.bg,
        padding:    "16px 20px",
      }}
    >
      {/* Input row */}
      <div
        style={{
          display:      "flex",
          alignItems:   "flex-end",
          gap:          "10px",
          borderRadius: "10px",
          border:       `1px solid ${focused ? T.gold : T.border}`,
          background:   "rgba(255,255,255,0.04)",
          padding:      "10px 12px",
          boxShadow:    focused
            ? "0 0 0 3px rgba(234,170,0,0.20)"
            : "none",
          transition:   "border-color 120ms ease, box-shadow 120ms ease",
        }}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            flex:        1,
            border:      "none",
            outline:     "none",
            background:  "transparent",
            resize:      "none",
            fontFamily:  "var(--font-sans, 'Avenir', sans-serif)",
            fontSize:    "14px",
            lineHeight:  "1.5",
            color:       T.fg,
            minHeight:   "22px",
            maxHeight:   "150px",
            overflowY:   "auto",
            opacity:     disabled ? 0.4 : 1,
            cursor:      disabled ? "not-allowed" : "text",
          }}
        />

        {/* Mic — ghost button */}
        <button
          type="button"
          aria-label="Voice input"
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            width:          "32px",
            height:         "32px",
            borderRadius:   "9999px",
            border:         "none",
            background:     "transparent",
            color:          T.fgDim,
            cursor:         disabled ? "not-allowed" : "pointer",
            flexShrink:     0,
            transition:     "color 160ms",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = T.fgSoft)
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = T.fgDim)
          }
          disabled={disabled}
        >
          <Icon icon="lucide:mic" width={16} height={16} />
        </button>

        {/* Send — WV DUNA primary button: gold bg, navy text, radius-xs */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            width:          "36px",
            height:         "36px",
            borderRadius:   "50%",
            border:         "none",
            background:     canSend ? T.gold : "rgba(255,255,255,0.08)",
            color:          canSend ? T.onAccent : T.fgDim,
            cursor:         canSend ? "pointer" : "not-allowed",
            flexShrink:     0,
            transition:     "background 160ms, color 160ms, box-shadow 160ms",
            boxShadow:      canSend
              ? "0 4px 16px rgba(234,170,0,0.45)"
              : "none",
          }}
          onMouseEnter={(e) => {
            if (canSend)
              (e.currentTarget as HTMLButtonElement).style.background =
                T.goldHover;
          }}
          onMouseLeave={(e) => {
            if (canSend)
              (e.currentTarget as HTMLButtonElement).style.background = T.gold;
          }}
        >
          <Icon icon="lucide:send" width={15} height={15} />
        </button>
      </div>

      {/* Hint */}
      <p
        style={{
          fontFamily:    "var(--font-sans, 'Avenir', sans-serif)",
          fontSize:      "10px",
          fontWeight:    700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color:         T.fgDim,
          textAlign:     "center",
          margin:        "8px 0 0",
        }}
      >
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat List Item (session / chat history row)
// Active: gold left-border accent + gold-soft bg — same as WV DUNA chip.selected
// ─────────────────────────────────────────────────────────────────────────────

interface SessionListItemProps {
  session: {
    id:            string;
    title?:        string;
    lastMessageAt: string;
    messageCount:  number;
  };
  isActive?: boolean;
  onClick:   () => void;
  onArchive?: () => void;
}

export function SessionListItem({
  session,
  isActive,
  onClick,
  onArchive,
}: SessionListItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:     "block",
        width:       "100%",
        textAlign:   "left",
        padding:     "12px 16px",
        borderBottom:`1px solid ${T.border}`,
        borderLeft:  `2px solid ${isActive ? T.gold : "transparent"}`,
        background:  isActive
          ? "rgba(234,170,0,0.10)"
          : hovered
          ? "rgba(255,255,255,0.03)"
          : "transparent",
        cursor:      "pointer",
        border:      "none",
        transition:  "background 120ms, border-color 120ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h4
          style={{
            fontFamily:   "var(--font-display, 'Goudy Heavyface', Georgia, serif)",
            fontSize:     "14px",
            fontWeight:   400,
            color:        isActive ? T.gold : T.fg,
            margin:       0,
            flex:         1,
            whiteSpace:   "nowrap",
            overflow:     "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {session.title ?? "Untitled chat"}
        </h4>
        {onArchive && hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); onArchive(); }}
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              width:          "24px",
              height:         "24px",
              border:         "none",
              background:     "transparent",
              borderRadius:   "6px",
              color:          T.fgSoft,
              cursor:         "pointer",
              transition:     "background 120ms",
              flexShrink:     0,
            }}
            aria-label="Archive"
          >
            <Icon icon="lucide:archive" width={13} height={13} />
          </button>
        )}
      </div>
      <div
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        "6px",
          marginTop:  "4px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize:   "10px",
            color:      T.fgDim,
          }}
        >
          {new Date(session.lastMessageAt).toLocaleDateString()}
        </span>
        <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: T.fgDim }} />
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize:   "10px",
            color:      T.fgDim,
          }}
        >
          {session.messageCount} msg{session.messageCount !== 1 ? "s" : ""}
        </span>
      </div>
    </button>
  );
}