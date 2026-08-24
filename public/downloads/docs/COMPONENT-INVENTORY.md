# Component Inventory

## Global components

### Realm Breadcrumb

- Anatomy: ancestors, current Realm, optional Scene
- States: default, long path, restricted ancestor, unavailable ancestor
- Behavior: parents are navigable when visible; current item is not a link
- Accessibility: `nav` landmark, ordered semantic path, current item identified

### Context Inspector

- Anatomy: Realm kind/name, Scene, Source, Avatar, roles, mode, inspect action, hierarchy
- States: compact, expanded, restricted, loading, stale
- Responsive: drawer below tablet breakpoint
- Accessibility: definition list; focus returns to invoker when closed

### Field Card

- Anatomy: kind, title, relationship/state, Presence/activity, primary next action
- States: rest, hover, focus, selected, active, disabled, restricted, empty
- Accessibility: semantic button for selectable cards and article for informational cards

### Ki Panel

- Anatomy: Ki identity, Realm Presence, gathering participants, speaker-labeled thread, suggestions, voice, input
- States: quiet, focused, gathering, listening, sending, disconnected, denied
- Rule: exactly one active input surface. Moving it between dock and panel preserves draft and focus.
- Accessibility: labeled input, restrained live region, speaker names in text, no transcript auto-scroll that steals position

### Participant Stack

- Anatomy: Avatar, name, role, Presence, voice state
- States: present, speaking, listening, muted, away, disconnected
- Accessibility: status text and names; never color alone

### Action Tray

- Anatomy: one primary contextual action plus secondary actions
- States: rest, active, confirming, pending, completed, unavailable
- Accessibility: DOM order matches visual order; touch targets at least 44 by 44 CSS pixels

### Permission Gate

- Anatomy: attempted action, rule, reason, affected scope, remedy
- States: allowed, needs confirmation, pending approval, denied, expired
- Accessibility: heading and status announced; no modal trap without escape

### Realm Container

- Anatomy: name, kind, parent, children, depth, relationship, access
- States: open, selected, restricted, archived, proposed
- Rule: containment and text must communicate hierarchy without relying on spatial distance

### Gameplay State Rail

- Anatomy: ordered state number, name, current state, completed/blocked state
- States: past, current, next, optional, blocked
- Responsive: horizontal scroll on narrow screens
- Accessibility: ordered list; current step announced; progress not color-only

### Event Receipt

- Anatomy: result, actor, action, scope, time, event ID, lineage, remedy
- States: pending, succeeded, failed, reversed, expired
- Accessibility: status announced; IDs selectable and copyable; failure remedy actionable

## Token rules

- Use Goudy Heavyface for major headlines and figures.
- Use Avenir for interface and body.
- Use IBM Plex Sans or a system sans fallback only for quotes/call-outs where supplied/licensed.
- Use cream white, never pure white.
- Use Kiduna sky blue for information/focus and sun gold for major meaning and primary action.
- Avoid decorative gradients; restrained environmental light is acceptable.
- R&R tokens are scoped to the R&R Realm content and do not replace Studio chrome.
