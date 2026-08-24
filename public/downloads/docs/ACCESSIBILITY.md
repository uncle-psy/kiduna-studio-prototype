# Accessibility and Inclusive Interaction

Target WCAG 2.2 AA for the production implementation. Accessibility is part of the interaction model, not a final visual audit.

## Keyboard

- All actions are reachable and operable without a pointer.
- Focus order follows: global context, local inspection, Field, contextual actions, Ki/gathering.
- The user may move directly to the Field and Ki panel with skip links in production.
- Visible focus uses Kiduna sky blue and is not clipped.
- Modal or drawer focus returns to its invoker.
- Escape closes non-destructive overlays; it never discards an unsaved draft without warning.
- Gameplay keyboard shortcuts are optional accelerators; all actions remain available as buttons.

## Screen readers

- Realms, Scenes, Sources, Avatars, Allies, Actors, and relationships are named in text.
- The current Realm and current gameplay step are programmatically identified.
- Speaker identity precedes every Ki, Source, Ally, or Actor utterance.
- Presence, speaking, mute, recording, permission, trust, and result states never rely on color alone.
- Async status is announced once without flooding the live region.
- Nested Realm structure uses semantic lists/regions as well as visual containment.

## Voice and transcripts

- Voice is optional and always has a text path.
- Listening, speaking, muted, reconnecting, recording, and transcript states are visible.
- Recording or transcript retention requires explicit contextual notice and consent.
- An Actor voice cannot be confused with a human participant.
- Voice failure does not block a turn or erase typed content.

## Focus and transparency

Transparency is named for members as 0% Opaque through 100% Clear. Context may set it automatically; the Source can override it. When the input moves between the dock and Ki panel, draft, selection, and focus move as one object. Only one editable input exists.

## Visual

- Primary body text meets contrast against its actual rendered background.
- Cream replaces pure white; muted text still meets contrast at its size.
- Touch targets are at least 44 by 44 CSS pixels in the production interface.
- Text scales to 200% without lost content or horizontal page scrolling except intentional boards/state rails.
- Narrow layouts stack the Studio regions and preserve their semantic order.
- Reduced-motion removes ornamental movement and shortens orientation transitions.

## Cognitive clarity

- One primary decision per focused view.
- Confirmations summarize consequence in plain language.
- Permission denial explains why and how to proceed safely.
- Technical terms appear only when they are canonical and necessary.
- The user can inspect the rule or provenance behind matching, Actor actions, automated actions, and resource movement.

## Required test passes

1. Keyboard-only journey from Kinship Duna through a completed hand and return
2. Screen-reader landmarks and headings on every route
3. 200% zoom at desktop and narrow viewport
4. Reduced motion
5. Voice unavailable and voice disconnect recovery
6. Permission denied, expired invitation, and failed async action
7. Input transfer between dock and Ki panel
