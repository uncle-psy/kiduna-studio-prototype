'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import '../../globals.css'

const API = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'

function Toast({text, ok}:{text:string; ok:boolean}) {
  if(typeof document === "undefined") return null
  return createPortal(
    <div style={{position:"fixed",top:20,right:20,zIndex:9999,padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:500,boxShadow:"0 4px 20px rgba(0,0,0,.3)",background:ok?"#166534":"#991b1b",color:"#fff",animation:"fadeIn .2s ease"}}>{text}</div>,
    document.body
  )
}

/* ══════════════════════════════════════════════════════════════
   DATA
   ══════════════════════════════════════════════════════════════ */

const TRIGGER_TYPES = [
  {id:"event", nm:"When something happens", ds:"React to events — new emails, messages, mentions, joins.", eg:"e.g. when a new email arrives", color:{bg:"var(--sk-ok-soft)",fg:"var(--sk-ok)"}},
  {id:"time", nm:"On a schedule", ds:"Run at specific times — every day, weekly, monthly.", eg:"e.g. every Monday at 9 AM", color:{bg:"var(--sk-info-soft)",fg:"var(--sk-info)"}},
  {id:"condition", nm:"When a number changes", ds:"Watch a value and react when it crosses a threshold.", eg:"e.g. when wallet < 5 SOL", color:{bg:"var(--sk-warn-soft)",fg:"var(--sk-warn)"}},
  {id:"command", nm:"On my command", ds:"Run manually when you trigger it — on demand, one click.", eg:"e.g. summarize my inbox now", color:{bg:"var(--sk-ac-soft)",fg:"var(--sk-ac)"}},
]

// Fallback tools (used before API loads)
let TOOLS: {uid:string; id:string; nm:string; desc:string; color:string; connected:boolean; type:string; category:string; disabled?:boolean}[] = [
  {uid:"chat", id:"chat", nm:"Chat", desc:"Conversations & messaging", color:"#f472b6", connected:true, type:"internal", category:"Internal"},
  {uid:"vibes", id:"vibes", nm:"Vibes", desc:"Mood & sentiment signals", color:"#c084fc", connected:true, type:"internal", category:"Internal", disabled:true},
  {uid:"voting", id:"voting", nm:"Voting", desc:"Polls & decisions", color:"#fb923c", connected:true, type:"internal", category:"Internal", disabled:true},
  {uid:"seek", id:"seek", nm:"Seek / Search", desc:"Discovery & lookup", color:"#22d3ee", connected:true, type:"internal", category:"Internal", disabled:true},
  {uid:"earning", id:"earning", nm:"Earning", desc:"Revenue & rewards", color:"#4ade80", connected:true, type:"internal", category:"Internal", disabled:true},
]

// Convert selected uids to service ids for storage (deduped)
function uidsToServiceIds(uids: string[]): string[] {
  const ids = new Set<string>()
  uids.forEach(uid => {
    const t = TOOLS.find(t => t.uid === uid)
    if(t) ids.add(t.id)
    else ids.add(uid) // fallback: use uid as service id
  })
  return Array.from(ids)
}

// Convert stored service ids back to uids for display
function serviceIdsToUids(ids: string[]): string[] {
  return ids.map(id => {
    const t = TOOLS.find(t => t.id === id)
    return t ? t.uid : id // preserve original id if no TOOLS match
  })

}

// Fetch tools from API and update TOOLS
async function fetchAvailableTools(wallet?: string): Promise<typeof TOOLS> {
  const DISABLED_INTERNAL = new Set(["vibes", "voting", "seek", "earning"])
  try {
    const res = await fetch(`${API}/api/tools/available`)
    if(!res.ok) throw new Error("not available")
    const data = await res.json()
    const fetched: typeof TOOLS = []
    // Internal tools
    for(const t of (data.internal || [])) {
      fetched.push({uid:t.uid, id:t.uid, nm:t.name, desc:t.desc||"", color:t.color||"#94a3b8", connected:true, type:"internal", category:t.category||"Internal", disabled:DISABLED_INTERNAL.has(t.uid)})
    }
    // External tools (auto-discovered from MCP servers)
    for(const t of (data.external || [])) {
      fetched.push({uid:t.uid, id:t.service, nm:t.name, desc:t.desc||"", color:t.color||"#94a3b8", connected:true, type:"external", category:t.category||"External"})
    }
    if(fetched.length > 0) TOOLS = fetched
    return TOOLS
  } catch(e) {
    return TOOLS
  }
}

const QUICK_PICKS: Record<string,string[]> = {
  event: ["a new email arrives in Gmail", "a new event is added to Calendar", "someone messages on Telegram", "we get a Bluesky mention", "a new chat message arrives", "community vibes shift negative"],
  time: ["every weekday at 9:00 AM", "every Monday at 8 AM", "the first day of each month", "every 6 hours"],
  condition: ["wallet drops below 5 SOL", "no email replies for 24 hours", "calendar has no events tomorrow", "engagement drops 20%", "earnings fall below threshold", "voting quorum not reached"],
  command: ["summarize my unread emails", "check today's calendar and send me a digest", "draft a Bluesky post about our latest update", "send a Telegram message to the team", "search for trending topics", "check community vibes"],
}

const ACTION_EXAMPLES: Record<string,string[]> = {
  event: ["read the email and send a reply using Gmail", "forward the details to Telegram", "post an acknowledgment on Bluesky"],
  time: ["read unread emails and reply to each one via Gmail", "check Calendar for today's events and send a summary via Telegram", "create a Bluesky post with a motivational quote"],
  condition: ["send an alert email via Gmail", "post a warning on Bluesky", "send a Telegram notification to the team"],
  command: ["read my last 10 emails from Gmail and summarize them", "list today's Calendar events and send via Telegram", "draft and post on Bluesky", "check my SOL wallet balance"],
}

// Suggestions based on trigger type × tool combination
const TOOL_TRIGGER_SUGGESTIONS: Record<string, Record<string, string[]>> = {
  chat: {
    event: [
      "read the incoming message and send a helpful reply",
      "greet the user and answer their question",
      "acknowledge the message and route it to the right team",
    ],
    time: [
      "send a daily summary of unread chat messages",
      "post a morning check-in message to the group",
      "remind the team about pending chat conversations",
    ],
    condition: [
      "send a chat alert when the condition is met",
      "notify the group via chat when something changes",
      "post a warning message in chat",
    ],
    command: [
      "read recent chat messages and summarize them",
      "search chat history and share relevant messages",
      "compose and send a message based on the request",
    ],
  },
  vibes: {
    event: [
      "analyze the community mood and post a vibe report",
      "react to the mood shift with an appropriate response",
      "flag negative sentiment and alert the moderators",
    ],
    time: [
      "check the community sentiment and send a daily vibe report",
      "post a weekly mood summary to the team",
      "monitor vibes trends and share insights every morning",
    ],
    condition: [
      "send an alert when community mood turns negative",
      "notify the team when engagement vibes drop sharply",
      "trigger a check-in message when sentiment is low",
    ],
    command: [
      "analyze current community vibes and share a summary",
      "check the mood trend and report back",
      "evaluate the sentiment around a specific topic",
    ],
  },
  voting: {
    event: [
      "create a poll based on the new proposal",
      "notify members when a new vote is submitted",
      "tally the vote and update the results in real time",
    ],
    time: [
      "remind members to vote before the deadline",
      "send a weekly voting summary to the group",
      "close expired polls and announce final results",
    ],
    condition: [
      "announce results when voting quorum is reached",
      "send a reminder when a vote is about to expire",
      "alert the team when a proposal gets enough votes",
    ],
    command: [
      "start a new poll on the given topic",
      "count votes and share current standings",
      "summarize all active proposals and their status",
    ],
  },
  seek: {
    event: [
      "search for relevant info and reply with an answer",
      "look up the topic and share a concise summary",
      "find related content and compile key findings",
    ],
    time: [
      "search for trending topics and send a daily brief",
      "compile a weekly research summary on key themes",
      "find the latest updates and share a morning digest",
    ],
    condition: [
      "search for solutions when a problem is detected",
      "look up troubleshooting steps and share them",
      "find related discussions and surface helpful answers",
    ],
    command: [
      "research the given topic and share key findings",
      "search across sources and compile a summary",
      "find the answer to the question and respond",
    ],
  },
  earning: {
    event: [
      "log the new earning and update the revenue tracker",
      "notify the team about the new transaction",
      "record the payment and send a confirmation",
    ],
    time: [
      "send a daily earnings summary to the team",
      "post a weekly revenue report to the group",
      "calculate and distribute pending rewards",
    ],
    condition: [
      "alert the team when earnings drop below the threshold",
      "send a notification when revenue hits a milestone",
      "warn when payout balance is running low",
    ],
    command: [
      "check current earnings and share a summary",
      "calculate pending rewards and show the breakdown",
      "generate a revenue report for the given period",
    ],
  },
  gmail: {
    event: [
      "read the email and send a polite, context-aware reply",
      "forward the email summary to the team",
      "draft a response and send it immediately",
    ],
    time: [
      "check for unread emails and reply to each one",
      "send a daily digest of important emails",
      "review the inbox and flag urgent messages",
    ],
    condition: [
      "send an alert email about the situation",
      "notify via email when the condition triggers",
      "draft and send a warning email to stakeholders",
    ],
    command: [
      "read the last 10 emails and summarize them",
      "search for emails on the topic and share highlights",
      "draft and send an email based on the request",
    ],
  },
  calendar: {
    event: [
      "send a notification about the new calendar event",
      "check event details and prepare a briefing",
      "notify attendees about the upcoming event",
    ],
    time: [
      "check today's calendar and send a morning agenda",
      "send reminders for meetings happening in the next hour",
      "compile a weekly schedule summary",
    ],
    condition: [
      "alert when the calendar is empty for tomorrow",
      "notify when a meeting is rescheduled or cancelled",
      "send a heads-up when there are back-to-back meetings",
    ],
    command: [
      "list today's events and share the schedule",
      "check availability and suggest meeting times",
      "summarize this week's calendar events",
    ],
  },
  meet: {
    event: [
      "create a Google Meet and send the link to participants",
      "prepare a meeting agenda based on the request",
      "send the Meet link and a brief to all attendees",
    ],
    time: [
      "check for upcoming meetings and send reminders",
      "create follow-up notes after scheduled meetings",
      "send a daily list of today's Google Meet sessions",
    ],
    condition: [
      "schedule a Meet when urgent discussion is needed",
      "alert participants when a meeting is about to start",
      "create an ad-hoc Meet when the condition triggers",
    ],
    command: [
      "schedule a Google Meet for the team",
      "send the meeting link to the requested participants",
      "summarize the last Meet and share action items",
    ],
  },
  telegram: {
    event: [
      "forward the update to the Telegram group",
      "send a formatted notification via Telegram",
      "alert the team on Telegram about the event",
    ],
    time: [
      "send a daily summary to the Telegram group",
      "post a scheduled update on Telegram",
      "broadcast a weekly recap via Telegram",
    ],
    condition: [
      "send a Telegram alert when the condition is met",
      "notify the group on Telegram when something changes",
      "post a warning message to the Telegram channel",
    ],
    command: [
      "send the requested message via Telegram",
      "broadcast an announcement to the Telegram group",
      "forward the information to Telegram contacts",
    ],
  },
  bluesky: {
    event: [
      "draft and post an update on Bluesky",
      "share the news on Bluesky with a thread",
      "post an acknowledgment on Bluesky",
    ],
    time: [
      "create a daily motivational post on Bluesky",
      "share a weekly highlights thread on Bluesky",
      "post a scheduled update to Bluesky",
    ],
    condition: [
      "post a warning or alert on Bluesky",
      "share an important update on Bluesky",
      "publish a status update thread on Bluesky",
    ],
    command: [
      "draft and publish a Bluesky post on the topic",
      "create a thread on Bluesky summarizing the request",
      "post the requested content on Bluesky",
    ],
  },
  solana: {
    event: [
      "check the transaction and log it to the ledger",
      "verify the wallet activity and send a notification",
      "record the SOL transfer and confirm it",
    ],
    time: [
      "check SOL wallet balance and send a daily report",
      "monitor staking rewards and post a weekly summary",
      "send a treasury status update every morning",
    ],
    condition: [
      "alert when the wallet balance drops below the threshold",
      "send a warning when a large SOL transfer is detected",
      "notify the team when the treasury needs attention",
    ],
    command: [
      "check the current SOL wallet balance and report",
      "review recent transactions and summarize them",
      "send a treasury snapshot with current holdings",
    ],
  },
}

const TOOL_NAME_SUGGESTIONS: Record<string, Record<string, string[]>> = {
  chat: {
    event: ["Chat responder", "Auto reply bot", "Message handler", "Chat support"],
    time: ["Chat digest", "Morning check-in", "Chat reminder", "Daily recap"],
    condition: ["Chat alert", "Chat notifier", "Conversation monitor", "Chat guard"],
    command: ["Chat assistant", "Message lookup", "Chat summarizer", "Quick reply"],
  },
  vibes: {
    event: ["Vibe reactor", "Mood responder", "Sentiment handler", "Vibe alert"],
    time: ["Vibe report", "Mood tracker", "Weekly vibes", "Sentiment pulse"],
    condition: ["Vibe guard", "Mood alert", "Sentiment watch", "Vibe threshold"],
    command: ["Vibe check", "Mood analyzer", "Sentiment scan", "Vibe summary"],
  },
  voting: {
    event: ["Vote handler", "Poll creator", "Ballot tracker", "Vote notifier"],
    time: ["Vote reminder", "Poll closer", "Weekly ballot", "Voting digest"],
    condition: ["Quorum alert", "Vote threshold", "Ballot guard", "Result announcer"],
    command: ["Poll launcher", "Vote counter", "Ballot summary", "Decision maker"],
  },
  seek: {
    event: ["Auto researcher", "Answer finder", "Info responder", "Smart search"],
    time: ["Daily brief", "Trend scout", "Research digest", "Weekly roundup"],
    condition: ["Problem solver", "Fix finder", "Troubleshooter", "Help scout"],
    command: ["Research bot", "Knowledge finder", "Topic researcher", "Info scout"],
  },
  earning: {
    event: ["Earning logger", "Transaction tracker", "Payment recorder", "Revenue notifier"],
    time: ["Daily earnings", "Revenue report", "Weekly payout", "Earnings digest"],
    condition: ["Revenue guard", "Earnings alert", "Payout monitor", "Threshold watch"],
    command: ["Earnings check", "Revenue summary", "Payout calculator", "Earnings report"],
  },
  gmail: {
    event: ["Email responder", "Auto reply", "Email handler", "Inbox manager"],
    time: ["Email digest", "Inbox review", "Daily mail", "Email scheduler"],
    condition: ["Email alert", "Inbox guard", "Mail watcher", "Email monitor"],
    command: ["Email search", "Mail summary", "Email drafter", "Inbox assistant"],
  },
  calendar: {
    event: ["Event notifier", "Calendar handler", "Meeting alert", "Event watcher"],
    time: ["Morning agenda", "Daily schedule", "Calendar digest", "Weekly planner"],
    condition: ["Calendar guard", "Schedule alert", "Meeting monitor", "Availability check"],
    command: ["Schedule lookup", "Calendar assistant", "Event finder", "Agenda builder"],
  },
  meet: {
    event: ["Meeting creator", "Meet scheduler", "Call organizer", "Meet notifier"],
    time: ["Meet reminder", "Daily meetings", "Call summary", "Meeting prep"],
    condition: ["Urgent meeting", "Meet alert", "Call trigger", "Quick meet"],
    command: ["Meet launcher", "Call scheduler", "Meeting planner", "Meet assistant"],
  },
  telegram: {
    event: ["TG notifier", "Telegram alert", "Message forwarder", "TG updater"],
    time: ["Daily broadcast", "TG digest", "Scheduled post", "Weekly recap"],
    condition: ["TG alert bot", "Telegram guard", "TG warning", "Channel alert"],
    command: ["TG messenger", "Telegram sender", "Broadcast bot", "TG assistant"],
  },
  bluesky: {
    event: ["Bluesky poster", "Social updater", "Post drafter", "Bluesky reactor"],
    time: ["Morning post", "Daily thread", "Scheduled post", "Weekly highlights"],
    condition: ["Alert poster", "Status updater", "Bluesky alert", "Social guard"],
    command: ["Post creator", "Thread writer", "Bluesky drafter", "Content poster"],
  },
  solana: {
    event: ["Transaction logger", "Transfer tracker", "SOL recorder", "Wallet notifier"],
    time: ["Treasury report", "Daily balance", "SOL digest", "Staking summary"],
    condition: ["Treasury guard", "Balance alert", "SOL watcher", "Wallet monitor"],
    command: ["Balance check", "SOL summary", "Treasury snapshot", "Wallet assistant"],
  },
}

function getActionSuggestions(tools: string[], triggerType: string|null): string[] {
  const trigger = triggerType || "event"
  if (tools.length > 0) {
    const suggestions: string[] = []
    for (const tool of tools) {
      const triggerSugs = TOOL_TRIGGER_SUGGESTIONS[tool]?.[trigger]
      if (triggerSugs) suggestions.push(...triggerSugs)
    }
    if (suggestions.length > 0) return suggestions.slice(0, 4)
  }
  return ACTION_EXAMPLES[trigger] || ACTION_EXAMPLES.event
}

function getNameSuggestions(tools: string[], triggerType: string|null): string[] {
  const trigger = triggerType || "event"
  if (tools.length > 0) {
    const suggestions: string[] = []
    for (const tool of tools) {
      const triggerNames = TOOL_NAME_SUGGESTIONS[tool]?.[trigger]
      if (triggerNames) {
        const take = tools.length === 1 ? triggerNames.length : 2
        suggestions.push(...triggerNames.slice(0, take))
      }
    }
    if (suggestions.length > 0) return [...new Set(suggestions)].slice(0, 4)
  }
  return ["Email replies", "Morning post", "Treasury guard", "Welcome members"]
}

/* ══════════════════════════════════════════════════════════════
   SVG ICONS  (exact copy from HTML)
   ══════════════════════════════════════════════════════════════ */

function TriggerIcon({t}:{t:string}) {
  if(t==="time") return <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>
  if(t==="event") return <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>
  if(t==="condition") return <><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></>
  if(t==="command") return <><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></>
  return <><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3"/></>
}

function ToolIcon({id}:{id:string}) {
  if(id==="chat") return <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>
  if(id==="vibes") return <><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/></>
  if(id==="voting") return <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></>
  if(id==="seek") return <><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></>
  if(id==="earning") return <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>
  if(id==="gmail") return <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 7l10 7 10-7"/></>
  if(id==="calendar") return <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>
  if(id==="meet") return <><path d="M15 10l5-3v10l-5-3"/><rect x="2" y="6" width="13" height="12" rx="2"/></>
  if(id==="telegram") return <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>
  if(id==="bluesky") return <path d="M12 4c-2 4-6 6-9 6 0 4 3 7 9 10 6-3 9-6 9-10-3 0-7-2-9-6z"/>
  if(id==="solana") return <path d="M5 8l14-3-2 4H3zM5 14l14-3-2 4H3zM5 20l14-3-2 4H3z"/>
  return <circle cx="12" cy="12" r="10"/>
}

function toolByID(id:string) { return TOOLS.find(t=>t.id===id) || {id,nm:id,desc:"",color:"#94a3b8",connected:false,type:"external"} }

function escapeHTML(s:string){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") }

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */

interface Draft {
  triggerType:string|null
  whenText:string
  tools:string[]
  thenText:string
  skillContent:string
  name:string
  requiresApproval:boolean
  conditionField:string
  conditionOperator:string
  conditionThreshold:string
  payloadMode:'auto_enable'|'require_approval'|'disabled'
  payloadSiteSlug:string
}

function freshDraft():Draft {
  return { triggerType:null, whenText:"", tools:[], thenText:"", skillContent:"", name:"", requiresApproval:false, conditionField:"", conditionOperator:"gt", conditionThreshold:"", payloadMode:'require_approval', payloadSiteSlug:"" }
}

function cleanDisplayText(raw:string|null|undefined):string {
  if(!raw) return ""
  let s = raw.trim()
  // Convert markdown links [text](url) → text
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
  // Remove raw AT protocol URIs
  s = s.replace(/at:\/\/did:[^\s)}\]]+/g, "")
  // Remove raw did:plc references
  s = s.replace(/did:plc:[^\s)}\]]+/g, "")
  // Remove leftover raw https URLs
  s = s.replace(/https?:\/\/[^\s)}\]]+/g, "")
  // Remove "check it out" / "feel free to check" phrases with leftover link text
  s = s.replace(/\.?\s*(You can|Feel free to)?\s*check it out\s*(here|using the link provided)?\.?/gi, ".")
  // Remove URI: lines entirely
  s = s.replace(/\n*URI:\s*\S*/g, "")
  // Remove leading serial numbers like "1)" "2)" "1." "2."
  s = s.replace(/^\d+[.)]\s*/g, "")
  // Clean up double periods, extra whitespace
  s = s.replace(/\.{2,}/g, ".").replace(/\n{2,}/g, " ").replace(/\s{2,}/g, " ").trim()
  // Remove trailing period-only leftovers
  s = s.replace(/\.\s*$/, "").trim()
  return s
}

function suggestName(d:Draft):string {
  if(!d.whenText && !d.thenText) return ""
  const w = (d.whenText||"").toLowerCase()
  if(w.includes("email")) return "Email replies"
  if(w.includes("morning")||w.includes("8")) return "Morning post"
  if(w.includes("wallet")||w.includes("sol")) return "Treasury guard"
  if(w.includes("join")) return "Welcome members"
  if(w.includes("telegram")) return "Telegram answers"
  if(w.includes("bluesky")) return "Bluesky engagement"
  return ""
}

function canAdvance(step:number, d:Draft):boolean {
  if(step===1) return !!d.triggerType && !!d.whenText.trim()
  if(step===2) return true  // Tools is optional
  if(step===3) return !!d.thenText.trim() && !!d.name.trim()
  if(step===4) {
    if(!d.name.trim()) return false
    // Unified validation: infer tools from action text, check they're selected
    const missing = getMissingInferredTools(d)
    return missing.length === 0
  }
  return true
}

/* ── Tool inference from text ─────────────────────────────────
   Maps keywords in whenText + thenText → required tool UIDs.
   Works for manual builds and modified drafts.
   ─────────────────────────────────────────────────────────── */

const TOOL_KEYWORD_MAP: {toolId:string; keywords:string[]}[] = [
  {toolId:"google_read_email", keywords:[
    "read email","read mail","check email","check mail","inbox",
    "unread email","new email","email arrives","incoming email",
    "fetch email","open email","review email","scan email",
    "monitor email","email lands","email comes in",
  ]},
  {toolId:"google_send_email", keywords:[
    "send email","send mail","send a reply","reply via gmail",
    "reply to email","reply email","respond to email","respond via email",
    "compose email","write email","email back","send digest",
    "send summary email","deliver email","email notification",
    "send an email","mail a",
  ]},
  {toolId:"google_search_email", keywords:[
    "search email","search mail","find email","look up email",
    "filter email","search inbox","search gmail",
  ]},
  {toolId:"google_draft_emails", keywords:[
    "draft email","draft mail","save draft","email draft",
  ]},
  {toolId:"google_reply_forward_email", keywords:[
    "forward email","forward mail","forward the details",
  ]},
  {toolId:"bluesky_create_post", keywords:[
    "post on bluesky","bluesky post","publish on bluesky",
    "create post","create a post","post an update","post a ",
    "bluesky update","post to bluesky","share on bluesky",
    "bluesky","social post","daily post",
  ]},
  {toolId:"get_balance", keywords:[
    "wallet balance","check balance","sol balance","get balance",
    "balance drops","balance below","balance falls","monitor balance",
    "low balance","treasury","check wallet","wallet drops",
  ]},
  {toolId:"transfer_sol", keywords:[
    "transfer sol","send sol","transfer funds","move sol",
    "send funds","pay sol","send token",
  ]},
  {toolId:"google_read_events", keywords:[
    "calendar","events","schedule","meeting","appointments",
    "today's events","upcoming events","check calendar",
  ]},
  {toolId:"telegram_send_message", keywords:[
    "telegram","send message to telegram","message on telegram",
    "telegram message","notify on telegram","telegram notification",
  ]},
]

function inferRequiredTools(d:Draft): string[] {
  const text = `${d.whenText} ${d.thenText}`.toLowerCase()
  if(!text.trim()) return []
  const inferred = new Set<string>()
  for(const mapping of TOOL_KEYWORD_MAP) {
    for(const kw of mapping.keywords) {
      if(text.includes(kw)) { inferred.add(mapping.toolId); break }
    }
  }
  return Array.from(inferred)
}

function getMissingInferredTools(d:Draft): string[] {
  const inferred = inferRequiredTools(d)
  if(inferred.length === 0) return []
  return inferred.filter(toolId =>
    TOOLS.some((t:any) => t.uid === toolId) && !d.tools.includes(toolId)
  )
}

function toolDisplayName(toolId:string): string {
  const loaded = TOOLS.find((t:any) => t.uid === toolId)
  if(loaded) return (loaded as any).nm
  const names: Record<string,string> = {
    "google_read_email":"Read Email","google_send_email":"Send Email",
    "google_reply_forward_email":"Reply & Forward Email","google_draft_emails":"Draft Emails",
    "google_search_email":"Search Email","google_read_events":"Read Calendar Events",
    "bluesky_create_post":"Create Post","bluesky_read_timeline":"Read Timeline",
    "telegram_send_message":"Send Message","get_balance":"Get Balance",
    "transfer_sol":"Transfer SOL","send_sol":"Send SOL",
    "solana_transfertoken":"Transfer Token","solana_getreceiverwallet":"Get Receiver Wallet",
    "transfertoken":"Transfer Token","getreceiverwallet":"Get Receiver Wallet",
  }
  return names[toolId] || toolId.replace(/_/g," ").replace(/\b\w/g,(c:string)=>c.toUpperCase())
}

/* ══════════════════════════════════════════════════════════════
   INLINE TOOL PILL  (used in skill cards & preview)
   ══════════════════════════════════════════════════════════════ */

function ExpTool({id}:{id:string}) {
  const t = toolByID(id)
  return (
    <span className="exp-tool">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:t.color}}><ToolIcon id={id}/></svg>
      {t.nm}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════
   SKILL CONTENT EDITOR  (Edit / Preview toggle for SKILL.md)
   ══════════════════════════════════════════════════════════════ */

function renderMarkdown(md:string):string {
  // Simple markdown → HTML renderer (covers SKILL.md content)
  let html = md
    // Frontmatter — render as code block
    .replace(/^---\n([\s\S]*?)\n---/m, '<div style="background:rgba(0,0,0,.3);border:1px solid var(--sk-border);border-radius:8px;padding:12px 14px;margin-bottom:16px;font-family:monospace;font-size:11.5px;line-height:1.6;color:var(--sk-tx-mute);white-space:pre-wrap">$1</div>')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 style="font-size:13px;font-weight:700;margin:16px 0 6px;color:var(--sk-tx)">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;margin:18px 0 8px;color:var(--sk-ac)">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="font-size:16px;font-weight:800;margin:0 0 12px;color:var(--sk-tx)">$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,.06);padding:1px 5px;border-radius:4px;font-size:11.5px;font-family:monospace">$1</code>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li style="margin:4px 0;padding-left:4px">$1</li>')
    // Ordered lists (numbered)
    .replace(/^\d+\.\s+(.+)$/gm, '<li style="margin:4px 0;padding-left:4px">$1</li>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p style="margin:8px 0;line-height:1.6">')
    // Single newlines within text (not after HTML tags)
    .replace(/(?<!\>)\n(?!\<)/g, '<br/>')

  // Wrap consecutive <li> in <ul> or <ol>
  html = html.replace(/((<li[^>]*>.*?<\/li>\s*)+)/g, '<ul style="margin:8px 0;padding-left:20px;list-style:disc">$1</ul>')

  return `<p style="margin:8px 0;line-height:1.6">${html}</p>`
}

function SkillContentEditor({content, onChange, onRegenerate, regenerating}:{content:string; onChange:(v:string)=>void; onRegenerate:()=>void; regenerating?:boolean}) {
  const [mode, setMode] = useState<"edit"|"preview">("edit")

  const tabStyle = (active:boolean) => ({
    padding:"6px 14px", borderRadius:"8px 8px 0 0",
    fontSize:"11.5px", fontWeight:700 as const,
    cursor:"pointer" as const, transition:"all .15s ease",
    border:"1px solid", borderBottom:"none",
    ...(active ? {
      background:"rgba(0,0,0,.2)", color:"var(--sk-ac)",
      borderColor:"var(--sk-border)",
    } : {
      background:"transparent", color:"var(--sk-tx-faint)",
      borderColor:"transparent",
    })
  })

  return (
    <div className="wz-field">
      {/* Tab bar */}
      <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:0}}>
        <label className="wz-label" style={{flex:1,marginBottom:0}}>Program content (PROGRAM.md)</label>
        <button onClick={()=>setMode("edit")} style={tabStyle(mode==="edit")} title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button onClick={()=>setMode("preview")} style={tabStyle(mode==="preview")} title="Preview">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>

      {/* Content area */}
      <div style={{position:"relative"}}>
        {regenerating && (
          <div style={{position:"absolute",inset:0,zIndex:2,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(5,8,36,0.6)",borderRadius:"0 0 10px 10px",backdropFilter:"blur(2px)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,color:"var(--sk-ac)",fontSize:13,fontWeight:600}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
              Regenerating…
            </div>
          </div>
        )}
        {mode==="edit" ? (
          <textarea className="wz-textarea" value={content}
            onChange={e=>onChange(e.target.value)}
            readOnly={regenerating}
            style={{
              minHeight:220, fontFamily:"monospace", fontSize:"12px", lineHeight:"1.6",
              borderRadius: 6, borderTop:"1px solid var(--sk-border)",
              opacity: regenerating ? 0.5 : 1, transition:"opacity .2s ease",
            }}/>
        ) : (
          <div
            style={{
              minHeight:220, padding:"14px 16px",
              background:"rgba(0,0,0,.2)", border:"1.5px solid var(--sk-border)",
              borderRadius:"0 0 10px 10px", borderTop:"1px solid var(--sk-border)",
              fontSize:"13px", color:"var(--sk-tx)", overflowY:"auto", maxHeight:400,
              opacity: regenerating ? 0.5 : 1, transition:"opacity .2s ease",
            }}
            dangerouslySetInnerHTML={{__html: renderMarkdown(content)}}
          />
        )}
      </div>

      {/* Bottom actions */}
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <button onClick={onRegenerate}
          disabled={regenerating}
          style={{fontSize:"11.5px",padding:"5px 11px",borderRadius:99,
            background: regenerating ? "rgba(235,128,0,.12)" : "rgba(255,255,255,.04)",
            border: regenerating ? "1px solid rgba(235,128,0,.3)" : "1px solid var(--sk-border)",
            color: regenerating ? "var(--sk-ac)" : "var(--sk-tx-mute)",
            cursor: regenerating ? "not-allowed" : "pointer",
            transition:"all .15s ease",
            opacity: regenerating ? 0.7 : 1,
            display:"flex",alignItems:"center",gap:6}}>
          {regenerating ? (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Regenerating…</>
          ) : (
            <>↻ Regenerate</>
          )}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   PREVIEW CARD  (updated to match screenshot — separate name card + dashed border)
   ══════════════════════════════════════════════════════════════ */

function PreviewCard({d, step}:{d:Draft; step:number}) {
  const name = d.name || (step>=4 ? suggestName(d) : "")
  const hasTrigger = !!d.whenText
  const hasAction = !!d.thenText

  return (
    <>
      {/* ONE outer card — dashed border — holds everything */}
      <div className="preview-card">
        {/* Name area — dashed inner box */}
        <div className="preview-name-area">
          <div className={`preview-card-name ${name?"":"empty"}`}>
            {name || "Your program will be named here…"}
          </div>
        </div>

        {/* Status */}
        <div className="preview-card-status">
          <span className="dot-pending"></span>
          Not active yet — saves on the final step
        </div>

        {/* When row */}
        <div className="preview-rule" style={{marginTop:14}}>
          <div className="preview-rule-row">
            <span className="pill" style={{background:"var(--sk-info-soft)",color:"var(--sk-info)"}}>When</span>
            {hasTrigger ? (
              <div className="preview-filled-box">{d.whenText}</div>
            ) : (
              <div className="preview-empty-box">(pick a trigger in step 1)</div>
            )}
          </div>

          {/* Do row */}
          <div className="preview-rule-row">
            <span className="pill" style={{background:"var(--sk-ac-soft)",color:"var(--sk-ac)"}}>Do</span>
            {hasAction ? (
              <div className="preview-filled-box">
                {d.thenText}
                {d.tools.length > 0 && (
                  <span className="preview-tools" style={{marginTop:8}}>
                    {d.tools.map(t => <ExpTool key={t} id={t}/>)}
                  </span>
                )}
              </div>
            ) : (
              <div className="preview-empty-box">(describe the action in step 2)</div>
            )}
          </div>
        </div>

        {step>=4 && (
          <div style={{marginTop:14,paddingTop:14,borderTop:"1px dashed rgba(255,255,255,.08)",fontSize:"11.5px",color:"var(--sk-tx-mute)"}}>
            <b style={{color:"var(--sk-ok)"}}>✓ Ready to save.</b> Once saved, it'll start running immediately.
          </div>
        )}
      </div>

      {step===1 && !d.triggerType && (
        <div style={{fontSize:"11.5px",color:"var(--sk-tx-faint)",textAlign:"center",lineHeight:"1.5",padding:12}}>
          Pick a trigger type on the left and watch the preview fill in →
        </div>
      )}
    </>
  )
}

/* ══════════════════════════════════════════════════════════════
   WIZARD STEPS  (exact logic from HTML)
   ══════════════════════════════════════════════════════════════ */
function StepTrigger({d, set}:{d:Draft; set:(v:Partial<Draft>)=>void}) {
  const picks = d.triggerType ? QUICK_PICKS[d.triggerType]||[] : []
  return (
    <>
      <div className="wz-q">What should <span className="serif">wake</span> your agent?</div>
      <div className="wz-hint">Pick one. Your agent stays asleep until this happens.</div>
      <div className="tg-grid">
        {TRIGGER_TYPES.map(t => (
          <button key={t.id} className={`tg-card ${d.triggerType===t.id?"on":""}`}
            onClick={()=>set({triggerType:t.id, whenText:d.whenText||""})}>
            <div className="tg-card-ico" style={{background:t.color.bg,color:t.color.fg}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><TriggerIcon t={t.id}/></svg>
            </div>
            <div className="tg-card-nm">{t.nm}</div>
            <div className="tg-card-ds">{t.ds}</div>
            <div className="tg-card-eg">{t.eg}</div>
          </button>
        ))}
      </div>
      {d.triggerType && (
        <div className="wz-field" style={{marginTop:22}}>
          <label className="wz-label">In your words, when should this program run?</label>
          <input type="text" className="wz-input" value={d.whenText}
            onChange={e=>set({whenText:e.target.value})}
            placeholder={`e.g. ${picks[0]||""}`} autoFocus/>
          <div className="wz-quick">
            {picks.map(q => <button key={q} onClick={()=>set({whenText:q})}>{q}</button>)}
          </div>
        </div>
      )}
      {d.triggerType === "condition" && (
        <div style={{marginTop:16}}>
          <label className="wz-label">Trigger when the number of detected items</label>
          <div style={{display:"flex",gap:10,alignItems:"center",marginTop:6}}>
            <select className="wz-input" style={{width:160}} value={d.conditionOperator} onChange={e=>set({conditionOperator:e.target.value})}>
              <option value="gt">is greater than</option>
              <option value="lt">is less than</option>
              <option value="gte">is at least</option>
              <option value="lte">is at most</option>
              <option value="eq">is exactly</option>
            </select>
            <input type="number" className="wz-input" style={{width:80}} value={d.conditionThreshold}
              onChange={e=>set({conditionThreshold:e.target.value})}
              placeholder="e.g. 3"/>
          </div>
        </div>
      )}
    </>
  )
}

function StepAction({d, set}:{d:Draft; set:(v:Partial<Draft>)=>void}) {
  const ex = getActionSuggestions(d.tools, d.triggerType)
  const nameSugs = getNameSuggestions(d.tools, d.triggerType)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(!!d.skillContent)
  const [genError, setGenError] = useState<string|null>(null)

  async function handleGenerate() {
    if(!d.thenText.trim() || !d.name.trim()) return
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch(`${API}/api/skills/generate-content`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          name: d.name,
          trigger_type: d.triggerType,
          when_text: d.whenText,
          then_text: d.thenText,
          tools: d.tools,
        }),
      })
      if(res.ok){
        const data = await res.json()
        set({skillContent: data.skill_content || data.skillContent || ""})
        setGenerated(true)
      } else {
        setGenError("Failed to generate program content")
      }
    } catch(e){
      setGenError("Failed to generate program content")
    } finally {
      setGenerating(false)
    }
  }

  // Auto-suggest name if empty
  useEffect(()=>{
    if(!d.name){ const s=suggestName(d); if(s) set({name:s}) }
  },[]) // eslint-disable-line react-hooks/exhaustive-deps

  const canGenerate = d.name.trim() && d.thenText.trim()

  return (
    <>
      {genError && <Toast text={genError} ok={false}/>}
      <div className="wz-q">Now, what should your agent <span className="serif">do?</span></div>
      <div className="wz-hint">Name your program, describe the action, then generate the program content.</div>

      {/* Skill name — collected here before generation */}
      <div className="wz-field">
        <label className="wz-label">Program name</label>
        <input type="text" className="wz-input" value={d.name}
          onChange={e=>{set({name:e.target.value}); setGenerated(false)}}
          placeholder="e.g. Email replies"/>
        <div className="wz-quick">
          {nameSugs.map(n =>
            <button key={n} onClick={()=>{set({name:n}); setGenerated(false)}}>{n}</button>)}
        </div>
      </div>

      {/* Action description */}
      <div className="wz-field">
        <label className="wz-label">When that happens, your agent should…</label>
        <textarea className="wz-textarea" value={d.thenText}
          onChange={e=>{set({thenText:e.target.value}); setGenerated(false)}}
          placeholder={`e.g. ${ex[0]}`}
          style={{minHeight:72}}/>
        <div className="wz-quick">
          {ex.map(e => <button key={e} onClick={()=>{set({thenText:e}); setGenerated(false)}}>{e}</button>)}
        </div>
      </div>

      {/* Generate button — needs both name and action, shown when no content yet */}
      {canGenerate && !generated && (
        <button onClick={handleGenerate}
          disabled={generating}
          style={{
            width:"100%", padding:"12px 16px", borderRadius:12,
            background:"linear-gradient(135deg, var(--sk-ac-soft), rgba(96,165,250,.12))",
            border:"1.5px solid var(--sk-ac)",
            color:"var(--sk-ac)", fontSize:"13px", fontWeight:700,
            cursor: generating?"wait":"pointer",
            transition:"all .15s ease", marginBottom:16,
            opacity: generating?.6:1,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          }}>
          {generating && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>}
          {generating ? "Generating program content…" : "Generate Program Content"}
        </button>
      )}

      {/* Generated / editable skill content */}
      {generated && d.skillContent && (
        <SkillContentEditor
          content={d.skillContent}
          onChange={(v:string)=>set({skillContent:v})}
          onRegenerate={handleGenerate}
          regenerating={generating}
        />
      )}

      {!generated && !canGenerate && (
        <div style={{background:"rgba(96,165,250,.08)",border:"1px solid rgba(96,165,250,.2)",borderRadius:12,padding:"12px 14px",fontSize:"12.5px",color:"var(--sk-tx-2)",lineHeight:"1.55"}}>
          <b style={{color:"var(--sk-info)"}}>Tip:</b> Enter a program name and describe the action to enable content generation.
        </div>
      )}
    </>
  )
}

function StepTools({d, set, wallet}:{d:Draft; set:(v:Partial<Draft>)=>void; wallet?:string}) {
  const toggle = (uid:string) => {
    const i = d.tools.indexOf(uid)
    set({tools: i>=0 ? d.tools.filter(t=>t!==uid) : [...d.tools,uid]})
  }
  const isToolOn = (t:{uid:string}) => d.tools.includes(t.uid)
  const [toolsList, setToolsList] = useState(TOOLS)
  const [loadingTools, setLoadingTools] = useState(true)

  useEffect(()=>{
    fetchAvailableTools().then(t => {
      setToolsList(t)
      setLoadingTools(false)
      // Force Wizard re-render so canAdvance re-evaluates with updated TOOLS
      set({tools: [...d.tools]})
    }).catch(()=>{
      setLoadingTools(false)
      set({tools: [...d.tools]})
    })
  },[])

  // No template-based required tool logic — tools are always optional at this step
  const categories: Record<string, typeof TOOLS> = {}
  toolsList.forEach(t => {
    const cat = (t as any).category || "Other"
    if(!categories[cat]) categories[cat] = []
    categories[cat].push(t)
  })

  const catColors: Record<string,string> = {
    "Internal":"#c084fc", "Email":"#ef4444", "Calendar":"#34d399", "Meeting":"#fbbf24",
    "Social":"#38bdf8", "Messaging":"#60a5fa", "Wallet":"#a78bfa"
  }

  return (
    <>
      <div className="wz-q">Which <span className="serif">tools</span> can it use?</div>
      <div className="wz-hint">Pick what your agent is allowed to touch. This step is optional — you can skip if you're not sure yet.</div>

      {loadingTools && <div style={{padding:20,textAlign:"center",color:"rgba(255,255,255,.4)",fontSize:13}}>Loading tools from servers...</div>}

      {Object.entries(categories).map(([cat, tools]) => {
        const color = catColors[cat] || "#94a3b8"
        return (
          <div key={cat} style={{marginTop:20,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:color}}/>
              <span style={{fontSize:"12px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color}}>{cat}</span>
              <div style={{flex:1,height:1,background:`${color}25`}}/>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {tools.map((t,i) => {
                const on = isToolOn(t)
                const isDisabled = !!(t as any).disabled
                return (
                  <button key={t.uid} onClick={()=>{ if(!isDisabled) toggle(t.uid) }}
                    style={{
                      display:"flex",alignItems:"center",gap:8,padding:"8px 14px",
                      borderRadius:10,
                      border:`1.5px solid ${isDisabled?"rgba(255,255,255,.06)": on?t.color:"rgba(255,255,255,.1)"}`,
                      background:isDisabled?"rgba(255,255,255,.02)": on?`${t.color}15`:"rgba(255,255,255,.03)",
                      cursor:isDisabled?"not-allowed":"pointer",transition:"all .15s ease",
                      opacity:isDisabled?0.45:1,
                    }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={isDisabled?{opacity:.4}:{}}><ToolIcon id={t.id}/></svg>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontSize:12,fontWeight:600,color:isDisabled?"rgba(255,255,255,.35)": on?"#fff":"rgba(255,255,255,.8)"}}>{t.nm}</div>
                      {isDisabled
                        ? <div style={{fontSize:9,fontWeight:700,color:"#f59e0b",letterSpacing:"0.04em",marginTop:1}}>COMING SOON</div>
                        : t.desc && <div style={{fontSize:10,color:"rgba(255,255,255,.35)",marginTop:1}}>{t.desc}</div>
                      }
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}

function StepName({d, set}:{d:Draft; set:(v:Partial<Draft>)=>void}) {
  const [contentMode, setContentMode] = useState<"edit"|"preview">("preview")
  const missingTools = getMissingInferredTools(d)
  const hasMissing = missingTools.length > 0

  return (
    <>
      <div className="wz-q">Review and <span className="serif">save</span></div>
      <div className="wz-hint">Check everything looks right. All fields are still editable.</div>

      {/* Validation: action text implies tools that aren't selected */}
      {hasMissing && (
        <div style={{
          margin:"4px 0 20px", padding:"14px 18px", borderRadius:12,
          background:"rgba(239,68,68,.08)", border:"1.5px solid rgba(239,68,68,.25)",
          display:"flex", alignItems:"flex-start", gap:12,
        }}>
          <div style={{
            width:32, height:32, borderRadius:10, flexShrink:0,
            background:"rgba(239,68,68,.15)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <div style={{fontSize:13, fontWeight:700, color:"#ef4444"}}>
              Your action needs tool{missingTools.length > 1 ? "s" : ""} you haven't selected
            </div>
            <div style={{fontSize:12, color:"var(--sk-tx-mute)", marginTop:4, lineHeight:"1.55"}}>
              Your action mentions {missingTools.length === 1 ? "a capability that requires" : "capabilities that require"} <strong style={{color:"#fff"}}>{missingTools.map(toolDisplayName).join(", ")}</strong>. Go back to the Tools step and select {missingTools.length === 1 ? "it" : "them"}, or edit the action to match your selected tools.
            </div>
          </div>
        </div>
      )}

      <div className="wz-field">
        <label className="wz-label">Program name</label>
        <input type="text" className="wz-input" value={d.name}
          onChange={e=>set({name:e.target.value})} placeholder="Name your program"/>
      </div>
      <div className="wz-field">
        <label className="wz-label">When</label>
        <input type="text" className="wz-input" value={d.whenText}
          onChange={e=>set({whenText:e.target.value})} placeholder="When should this run?"/>
      </div>
      <div className="wz-field">
        <label className="wz-label">Tools</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {TOOLS.map(t => {
            const on = d.tools.includes(t.uid)
            const isDisabled = !!(t as any).disabled
            return (
              <button key={t.uid} className={`detail-tool-chip ${on?"on":""}`}
                onClick={()=>{ if(!isDisabled) set({tools: on ? d.tools.filter(x=>x!==t.uid) : [...d.tools, t.uid]}) }}
                style={isDisabled?{opacity:0.35, cursor:"not-allowed", borderColor:"rgba(255,255,255,.06)"}:{}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:isDisabled?"rgba(255,255,255,.25)":t.color}}><ToolIcon id={t.id}/></svg>
                {t.nm}
                {isDisabled && <span style={{fontSize:8,fontWeight:700,color:"#f59e0b",letterSpacing:"0.04em"}}>SOON</span>}
                {!isDisabled && on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
              </button>
            )
          })}
        </div>
      </div>
      <div className="wz-field">
        <label className="wz-label">Action</label>
        <textarea className="wz-textarea" value={d.thenText}
          onChange={e=>set({thenText:e.target.value})}
          placeholder="What should your agent do?"
          style={{minHeight:60}}/>
      </div>
      <div className="wz-field">
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <label className="wz-label" style={{marginBottom:0}}>PROGRAM.md content</label>
          {d.skillContent && (
            <div style={{display:"flex",gap:2,marginLeft:"auto"}}>
              <button onClick={()=>setContentMode("edit")} title="Edit"
                style={{width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",
                  background:contentMode==="edit"?"rgba(255,255,255,.08)":"transparent",
                  color:contentMode==="edit"?"var(--sk-ac)":"var(--sk-tx-faint)",
                  border:"1px solid",borderColor:contentMode==="edit"?"var(--sk-border)":"transparent",
                  cursor:"pointer"}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button onClick={()=>setContentMode("preview")} title="Preview"
                style={{width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",
                  background:contentMode==="preview"?"rgba(255,255,255,.08)":"transparent",
                  color:contentMode==="preview"?"var(--sk-ac)":"var(--sk-tx-faint)",
                  border:"1px solid",borderColor:contentMode==="preview"?"var(--sk-border)":"transparent",
                  cursor:"pointer"}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          )}
        </div>
        {d.skillContent ? (
          contentMode==="edit" ? (
            <textarea className="wz-textarea" value={d.skillContent}
              onChange={e=>set({skillContent:e.target.value})}
              style={{minHeight:160,fontFamily:"var(--font-sans, inherit)",fontSize:"13px",lineHeight:"1.6"}}/>
          ) : (
            <div style={{
              background:"rgba(0,0,0,.2)",border:"1.5px solid var(--sk-border)",
              borderRadius:10,padding:"12px 14px",fontSize:"12.5px",lineHeight:"1.6",
              color:"var(--sk-tx)",maxHeight:200,overflowY:"auto",
            }} dangerouslySetInnerHTML={{__html: renderMarkdown(d.skillContent)}}/>
          )
        ) : (
          <span style={{fontSize:12,color:"var(--sk-tx-faint)"}}>
            ○ Not generated (optional)
          </span>
        )}
      </div>
      {/* ── Payload Mode — shown when a payload_* tool is selected ──────────── */}
      {d.tools.some(t => t === 'payload' || t.startsWith('payload_')) && (
        <div className="wz-field">
          <label className="wz-label">Payload Mode</label>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {([
              { value:'auto_enable',      label:'Auto Enable',             desc:'Agent publishes directly to your site without asking' },
              { value:'require_approval', label:'Require Approval',        desc:'Agent creates a draft, you review it in Actions, then it publishes' },
              { value:'disabled',         label:'Disable',                 desc:'Payload connection is paused for this skill' },
            ] as const).map(mode => (
              <button
                key={mode.value}
                type="button"
                onClick={()=>set({
                  payloadMode: mode.value,
                  requiresApproval: mode.value === 'require_approval',
                })}
                style={{
                  display:"flex",alignItems:"flex-start",gap:10,
                  padding:"10px 14px",borderRadius:10,width:"100%",textAlign:"left" as const,
                  background: d.payloadMode === mode.value ? "rgba(99,102,241,.1)" : "rgba(255,255,255,.025)",
                  border: `1.5px solid ${d.payloadMode === mode.value ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.07)"}`,
                  transition:"all .15s ease",
                }}>
                <div style={{
                  width:16,height:16,borderRadius:99,marginTop:1,flexShrink:0,
                  border:`2px solid ${d.payloadMode === mode.value ? "#6366f1" : "rgba(255,255,255,.25)"}`,
                  background: d.payloadMode === mode.value ? "#6366f1" : "transparent",
                  display:"flex",alignItems:"center",justifyContent:"center",
                }}>
                  {d.payloadMode === mode.value && <div style={{width:6,height:6,borderRadius:99,background:"#fff"}}/>}
                </div>
                <div>
                  <div style={{fontSize:12.5,fontWeight:700,color: d.payloadMode === mode.value ? "#818cf8" : "var(--sk-tx)"}}>
                    {mode.label}
                  </div>
                  <div style={{fontSize:11,color:"var(--sk-tx-faint)",marginTop:1}}>{mode.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Standard approval toggle (shown when NO payload tool selected) ── */}
      {!d.tools.some(t => t === 'payload' || t.startsWith('payload_')) && (
        <div className="wz-field">
          <label className="wz-label">Require approval before executing</label>
          <button
            onClick={()=>set({requiresApproval:!d.requiresApproval})}
            style={{
              display:"flex",alignItems:"center",gap:10,
              padding:"10px 14px",borderRadius:10,width:"100%",
              background:d.requiresApproval?"rgba(34,197,94,.08)":"rgba(239,68,68,.06)",
              border:`1.5px solid ${d.requiresApproval?"rgba(34,197,94,.25)":"rgba(239,68,68,.2)"}`,
              transition:"all .15s ease",textAlign:"left" as const,
            }}>
            <div style={{
              width:36,height:20,borderRadius:99,padding:2,
              background:d.requiresApproval?"var(--sk-ok)":"rgba(239,68,68,.5)",
              transition:"all .2s ease",display:"flex",
              justifyContent:d.requiresApproval?"flex-end":"flex-start",
            }}>
              <div style={{width:16,height:16,borderRadius:99,background:"#fff",transition:"all .2s ease"}}/>
            </div>
            <div>
              <div style={{fontSize:12.5,fontWeight:700,color:d.requiresApproval?"var(--sk-ok)":"var(--sk-bad)"}}>
                {d.requiresApproval ? "ON — Approval required" : "OFF — No approval needed"}
              </div>
              <div style={{fontSize:11,color:"var(--sk-tx-faint)",marginTop:1}}>
                {d.requiresApproval
                  ? "AI actions will wait for your review on the Approve page"
                  : "AI actions will execute immediately without review"}
              </div>
            </div>
          </button>
        </div>
      )}
    </>
  )
}

/* ══════════════════════════════════════════════════════════════
   WIZARD MODAL
   ══════════════════════════════════════════════════════════════ */

function Wizard({open, onClose, onSkillCreated, wallet}:{open:boolean; onClose:()=>void; onSkillCreated?:(skillId?:string)=>void; wallet:string}) {
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<Draft>(freshDraft())
  const [saving, setSaving] = useState(false)
  const [wizMsg, setWizMsg] = useState<{text:string;ok:boolean}|null>(null)
  const bdRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{ if(open){ setStep(1); setDraft(freshDraft()); setSaving(false); setWizMsg(null) } },[open])
  useEffect(()=>{
    if(!open) return
    const h = (e:KeyboardEvent)=>{ if(e.key==="Escape") onClose() }
    document.addEventListener("keydown",h)
    return ()=>document.removeEventListener("keydown",h)
  },[open,onClose])

  const set = (patch:Partial<Draft>) => setDraft(prev=>({...prev,...patch}))
  function showWizMsg(text:string, ok:boolean){ setWizMsg({text,ok}); setTimeout(()=>setWizMsg(null), 3000) }

  async function advance(){
    if(!canAdvance(step,draft)) return
    if(step===4){
      setSaving(true)
      try {
        const res = await fetch(`${API}/api/skills`, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            name: draft.name,
            trigger_type: draft.triggerType,
            when_text: draft.whenText,
            then_text: draft.thenText,
            tools: draft.tools,
            skill_content: draft.skillContent || null,
            requires_approval: draft.requiresApproval,
            wallet: wallet || null,
            ...(draft.tools.some((t:string) => t === 'payload' || t.startsWith('payload_')) ? {
              payload_mode: draft.payloadMode || 'require_approval',
              payload_site_slug: draft.payloadSiteSlug || null,
            } : {}),
            ...(draft.triggerType === "condition" && draft.conditionThreshold ? {
              condition_params: {
                field: "count",
                operator: draft.conditionOperator,
                threshold: parseFloat(draft.conditionThreshold),
              }
            } : {}),
          }),
        })
        if(!res.ok){
          const err = await res.json().catch(()=>({}))
          showWizMsg(err.detail || err.error || "Failed to create program", false)
          return
        }
        const data = await res.json()
        const newSkillId = data.skill?.id || data.id
        onClose()
        if(onSkillCreated) onSkillCreated(newSkillId)
      } catch(e){
        showWizMsg("Failed to create program", false)
      } finally {
        setSaving(false)
      }
      return
    }
    setStep(step+1)
  }

  if(!open) return null

  const stepLabels = ["Trigger","Tools","Action","Review & save"]

  return (
    <div className="wz-backdrop" ref={bdRef} onClick={e=>{if(e.target===bdRef.current) onClose()}}>
      <div className="wz" style={{maxWidth:640}}>
        {/* Head */}
        <div className="wz-head">
          <div className="wz-title">Create a <span className="serif">program</span></div>
          <button className="wz-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Steps */}
        <div className="wz-steps">
          {stepLabels.map((lbl,i)=>{
            const num=i+1; const done=num<step; const on=num===step
            return (
              <div key={lbl} style={{display:"contents"}}>
                {i>0 && <div className={`wz-step-bar ${done?"done":""}`}/>}
                <div className={`wz-step ${done?"done":""} ${on?"on":""}`}>
                  <span className="num">{done?"✓":num}</span>
                  {lbl}
                </div>
              </div>
            )
          })}
        </div>

        {/* Body */}
        <div style={{flex:1,minHeight:0,overflowY:"auto",padding:"28px 32px"}}>
          {wizMsg && <Toast text={wizMsg.text} ok={wizMsg.ok}/>}
          {step===1 && <StepTrigger d={draft} set={set}/>}
          {step===2 && <StepTools d={draft} set={set}/>}
          {step===3 && <StepAction d={draft} set={set}/>}
          {step===4 && <StepName d={draft} set={set}/>}
        </div>

        {/* Foot */}
        <div className="wz-foot">
          {step>1 ? <button className="btn-ghost" onClick={()=>setStep(step-1)}>← Back</button> : <span/>}
          <span className="wz-foot-hint">Step {step} of 4</span>
          <button className="btn" onClick={advance}
            style={canAdvance(step,draft)&&!saving?{}:{opacity:.4,cursor:"not-allowed"}}>
            {saving ? "Saving…" : step===4 ? "Save & activate" : "Continue →"}
          </button> 
        </div>
      </div>
    </div>
  )
} 

/* ══════════════════════════════════════════════════════════════
   SKILL CARD  (exact from HTML)
   ══════════════════════════════════════════════════════════════ */

function SkillCard({sk, onRefresh, runningMap, onStartPolling}:{sk:any; onRefresh:()=>void; runningMap:Record<string,string>; onStartPolling:()=>void}) {
  const isActive = (sk.status||"").toLowerCase()==="active"
  const isCommand = (sk.trigger_type||sk.triggerType||"").toLowerCase()==="command"
  const [stats, setStats] = useState<any>(null)
  const [toggling, setToggling] = useState(false)
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState<{text:string;ok:boolean}|null>(null)

  // Derive trace ID from parent's running map (no individual polling)
  const traceId = runningMap[sk.id] || null
  const prevTraceRef = useRef<string|null>(null)

  useEffect(()=>{
    if(traceId) { setRunning(true) }
    else if(prevTraceRef.current && !traceId) {
      // Was running, now stopped — refresh stats
      runningRef.current = false; setRunning(false); onRefresh()
    }
    prevTraceRef.current = traceId
  },[traceId])

  useEffect(()=>{
    fetch(`${API}/api/skills/${sk.id}/stats`)
      .then(r=>r.json())
      .then(d=>setStats(d))
      .catch(()=>{})
  },[sk.id])

  function showMsg(text:string, ok:boolean){ setMsg({text,ok}); setTimeout(()=>setMsg(null), 3000) }

  async function handleToggle(){
    setToggling(true)
    try {
      await fetch(`${API}/api/skills/${sk.id}/status`, {
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({status: isActive ? "paused" : "active"})
      })
      onRefresh()
    } catch(e){ showMsg("Failed to update status", false) }
    finally { setToggling(false) }
  }

  const runningRef = useRef(false)
  async function handleRun(){
    if(runningRef.current) return
    runningRef.current = true
    setRunning(true)
    try {
      const r = await fetch(`${API}/api/skills/${sk.id}/run`, {method:"POST"})
      const d = await r.json()
      if(d.running) { showMsg("Program is already running. Please wait.", false); runningRef.current = false; setRunning(false); return }
      if(!d.success) { showMsg(d.error || "Execution failed", false); runningRef.current = false; setRunning(false); return }
      // Success — start polling and reset after delay
      onStartPolling()
      setTimeout(()=>{ runningRef.current = false; setRunning(false) }, 5000)
    } catch(e){
      showMsg("Failed to run program", false)
      runningRef.current = false
      setRunning(false)
    }
  }

  const todayCount = stats?.today ?? 0
  const totalCount = stats?.total ?? 0
  const skillRouter = useRouter()

  const last = stats?.last || null

  return (
    <div className={`skill ${isActive?"":"paused"}`}>
      {msg && <Toast text={msg.text} ok={msg.ok}/>}
      <div className="skill-left">
        <div className="skill-name-row">
          <div className="skill-name">{sk.name}</div>
          <div className={`skill-status ${isActive?"":"paused"}`}>
            <span className="pulse"></span>
            {isActive ? "Quietly working" : "Paused"}
          </div>
        </div>
        <div className="skill-bottom-meta">
          <span><b>{todayCount}</b> today · <b>{totalCount}</b> all-time</span>
          {last && <span style={{color:"var(--sk-tx-faint)",fontSize:"10.5px"}}>Last: {last.when}</span>}
        </div>
      </div>

      <div className="skill-mid">
        <div className="skill-line">
          <span className="pill" style={{background:"var(--sk-info-soft)",color:"var(--sk-info)"}}>When</span>
          <span className="text">{sk.when_text||sk.whenText}</span>
        </div>
        <div className="skill-line">
          <span className="pill" style={{background:"var(--sk-ac-soft)",color:"var(--sk-ac)"}}>Do</span>
          <span className="text">
            {sk.then_text||sk.thenText}{" "}
            {(sk.tools||[]).map((t:string) => <ExpTool key={t} id={t}/>)}
          </span>
        </div>
        {last && (
          <div className="skill-receipt">
            <span className="tick">{last.ok?"✓":"✗"}</span>
            Last action: <b>{cleanDisplayText(last.text)||""}</b>
          </div>
        )}
      </div>

      <div className="skill-right">
        {isCommand && <button className="s-btn primary" onClick={handleRun} disabled={running}>{running ? "Running…" : "Run"}</button>}
        <button className="s-btn" onClick={()=>window.location.href=`/align/${sk.id}`}>Edit</button>
        <button className="s-btn" onClick={handleToggle} disabled={toggling}>
          {toggling ? "…" : isActive ? "Pause" : "Resume"}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE  (exact render from HTML — no sidebar, no demo strip)
   ══════════════════════════════════════════════════════════════ */

export default function AlignPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [skills, setSkills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statsMap, setStatsMap] = useState<Record<string,any>>({})
  const [toolsReady, setToolsReady] = useState(false)

  // Fetch available tools from MCP servers (dynamic discovery)
  useEffect(()=>{
    fetchAvailableTools(user?.wallet || '').then(()=>setToolsReady(true)).catch(()=>setToolsReady(true))
  },[user?.wallet])
  // Fetch all skills from backend — filtered to the current user's wallet
  const fetchSkills = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (user?.wallet) params.set('wallet', user.wallet)
      const res = await fetch(`${API}/api/skills?${params.toString()}`)
      if(res.ok){
        const data = await res.json()
        setSkills(data.skills || [])
      } else {
        setSkills([])
      }
    } catch(e){
      console.error("Failed to fetch programs:", e)
      setSkills([])
    } finally {
      setLoading(false)
    }
  },[user?.wallet])

  useEffect(()=>{ fetchSkills() },[fetchSkills])

  // Fetch stats for all skills (for stats row totals)
  useEffect(()=>{
    if(skills.length===0) return
    const fetchAllStats = async () => {
      const map: Record<string,any> = {}
      await Promise.all(skills.map(async (sk:any) => {
        try {
          const r = await fetch(`${API}/api/skills/${sk.id}/stats`)
          if(r.ok) map[sk.id] = await r.json()
        } catch(e){}
      }))
      setStatsMap(map)
    }
    fetchAllStats()
  },[skills])

  // Poll running skills only when needed (triggered by Run button)
  const [runningMap, setRunningMap] = useState<Record<string,string>>({})
  const pollingRef = useRef<ReturnType<typeof setInterval>|null>(null)

  function startPolling() {
    if(pollingRef.current) return // already polling
    pollingRef.current = setInterval(async ()=>{
      try {
        const r = await fetch(`${API}/api/skills/running-all`)
        if(r.ok){
          const d = await r.json()
          const running = d.running || {}
          setRunningMap(running)
          // Stop polling when nothing is running
          if(Object.keys(running).length === 0 && pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
        }
      } catch{}
    }, 3000)
    // Immediate first fetch
    fetch(`${API}/api/skills/running-all`).then(r=>r.json()).then(d=>setRunningMap(d.running||{})).catch(()=>{})
  }

  // Cleanup on unmount
  useEffect(()=>{
    return ()=>{ if(pollingRef.current) clearInterval(pollingRef.current) }
  },[])

  const list = skills
  const active = list.filter((s:any)=>(s.status||"").toLowerCase()==="active").length
  const today = Object.values(statsMap).reduce((a:number,s:any)=>a+(s?.today||0),0)
  const thisWeek = Object.values(statsMap).reduce((a:number,s:any)=>a+(s?.thisWeek||s?.this_week||0),0)

  if(loading) {
    return (
      <div className="sk-page" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:400}}>
        <div style={{color:"var(--sk-tx-faint)",fontSize:14}}>Loading Programs...</div>
      </div>
    )
  }

  return (
    <div className="sk-page">
      {/* Header */}
      <div className="page-head">
        <div>
          <div style={{fontSize:"0.66rem",fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",color:"#03CCD9",marginBottom:8}}>Building mode · Step 4</div>
          <h1>Enact</h1>
          <p style={{fontSize:"0.82rem",maxWidth:"100%"}}>Teach your ally <span className="serif" style={{color:"#EAAA00"}}>when</span> to act and <span className="serif" style={{color:"#EAAA00"}}>what</span> to do. A Program bundles one or more Programs — each Program is a line in a <span style={{color:"#fff"}}>Program.md</span> file: when this happens, do that.</p>
        </div>
        <button className="btn" onClick={()=>setWizardOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><path d="M12 5v14M5 12h14"/></svg>
          New Program
        </button>
      </div>

      {/* Stats */}
      <div className="stat-row">
        <div className="stat">
          <div className="stat-l"><span className="dot"></span> Active prgorams</div>
          <div className="stat-v">{active}<span className="unit">/ {list.length}</span></div>
          {/* <div className="stat-s">{list.length - active} paused</div> */}
        </div>
        <div className="stat">
          <div className="stat-l">Handled today</div>
          <div className="stat-v" style={{color:"var(--sk-ac)"}}>{today}<span className="unit">things</span></div>
          {/* <div className="stat-s">Across all skills</div> */}
        </div>
        <div className="stat">
          <div className="stat-l">Fired this week</div>
          <div className="stat-v" style={{color:"var(--sk-info)"}}>{thisWeek}<span className="unit">times</span></div>
          {/* <div className="stat-s">Across all skills</div> */}
        </div>
      </div>

      {/* Skills section */}
      <div className="section">
        <h2>Your <span className="serif">Programs</span></h2>
        <span className="hint">{list.length} Program{list.length===1?"":"s"} total</span>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <div className="empty-ico">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          </div>
          <h3>Your agent doesn't know any programs yet.</h3>
          <p>Teach it the first one — most people start with email replies or a morning post. Takes 30 seconds.</p>
          <div className="examples">
            <span>"Reply to emails for me"</span>
            <span>"Post every morning"</span>
            <span>"Alert me when X"</span>
          </div>
          <button className="btn" onClick={()=>setWizardOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><path d="M12 5v14M5 12h14"/></svg>
            Teach your first program
          </button>
        </div>
      ) : (
        <div className="skills-grid">
          {list.map((sk:any) => <SkillCard key={sk.id} sk={sk} onRefresh={fetchSkills} runningMap={runningMap} onStartPolling={startPolling}/>)}
        </div>
      )}

      {/* Wizard modal */}
      <Wizard open={wizardOpen} onClose={()=>setWizardOpen(false)} onSkillCreated={(skillId)=>{
        fetchSkills()
        if(skillId) router.push(`/align/${skillId}`)
      }} wallet={user?.wallet||""}/>
    </div>
  )
}