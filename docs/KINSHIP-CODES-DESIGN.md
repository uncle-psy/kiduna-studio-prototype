# Kinship Codes - Design and Prototype Contract

Status: working design, 2026-07-16  
Source basis: *Kinship Codes - Kidunas* (Kinship Systems, June 2026), the Genesis Ally canon, and the July 16 prototype rulings.

## 1. Purpose

A Kinship Code is a portable trust envelope. It can invite a person, identify the issuer and their Ally, state the intended relationship and landing context, convey bounded authority or benefits, carry lineage, limit redemption, and define how long the resulting access persists.

The long-term system treats the Code as verifiable and the delivery channel as untrusted. Email, text, social media, chat, MCP, and websites can carry a Code; none of those channels make it authentic. Cryptographic verification against the issuer's registered identity is the authority boundary.

The prototype implements the social and state semantics now. It does not pretend that a human-readable prototype token is a production cryptographic credential.

## 2. Long-term Code envelope

The complete design supports these claims:

| Claim | Meaning |
| --- | --- |
| `issuer` | Registered Persona or principal extending trust |
| `wallet` | Issuer wallet or signing-key reference |
| `agent` | Ally or typed Actor that prepared the Code |
| `context` | Organization, community, Project, Relationship, or other container being offered |
| `role` | Recipient role in that context |
| `scope` | Specific permitted operations |
| `splash` | First landing Scene or orientation flow |
| `ref` / lineage | Attribution path through prior invitations and issuers |
| `redeem_by` | Last instant at which redemption may begin |
| `ttl` | Duration of access after redemption |
| `max_uses` | Total permitted redemptions |
| `bound_to` | Person, email, group, or domain allowed to redeem |
| `actions` | Typed Actions triggered after valid redemption |
| `benefits` | Economic or program benefits attached to the invitation |
| `vibes` | Interaction or Sentinel alignment contract |
| `price` | Optional one-time or recurring price |
| `terms` | Additional agreement references |
| `access` | Public, private, secret, or personal information boundary |
| `trust` | Issuer's directional High, Medium, or Low trust judgment |

Production Codes will be signed, versioned tokens verified against registered issuer keys. The Graph Command Service will authorize redemption, append an immutable Record, apply typed Actions, and reject expired, exhausted, revoked, mismatched, or invalidly signed Codes atomically.

## 3. Code kinds are composable properties

“Personal,” “time-bound,” “single-use,” and “open” are not mutually exclusive product types. They are properties:

- **Audience**: `personal` binds to one intended person/email; `open` permits anyone satisfying other claims.
- **Redemption count**: `max_uses=1` means exactly one successful redemption; `null` means no prototype limit.
- **Redemption window**: `redeem_by` may be fifteen minutes, a day, a week, a chosen time, or absent.
- **Access lifetime**: `ttl` controls how long the relationship's granted access remains after redemption; it is distinct from the redemption window.
- **Trust**: High, Medium, or Low, directional from issuer toward recipient.
- **Context**: why the invitation exists and where the recipient should arrive.

Examples:

- A business partner: personal, bound email, single-use, High trust, seven-day redemption window.
- A social post: open, permanent redemption, unlimited uses, Low trust.
- A workshop invitation: open or domain-bound, 25 uses, Medium trust, 48-hour redemption window, Project landing point.

## 4. Prototype data model

The working prototype persists:

- Accounts, verified email state, Personas, password hashes, and server-side sessions.
- Codes, issuer, Persona, audience, recipient binding, trust, purpose, relationship context, privacy, grants, redemption limit, deadline, status, claims, and lineage.
- Atomic redemption records and use counts.
- Relationships formed by successful redemption.
- One vector namespace per issuer-owned understanding of an invitee.
- Wisdom entries with author, perspective, privacy, grants, provenance, and embedding.

Prototype Code values are high-entropy human-readable references. They are not JWTs, do not carry a real signature, do not grant money or production authority, and are valid only inside this prototype database.

## 5. Issuance flow through Ki

1. The Persona tells Ki they want to invite someone.
2. Ki asks who the person is, how the Persona knows them, what they hope to do together, and what should welcome them.
3. The Persona chooses personal or open audience, High/Medium/Low trust, single or unlimited use, redemption window, and information boundary.
4. For private or secret Wisdom, the Persona states which additional people or containers may see it.
5. Ki previews the Code and consequence.
6. On confirmation, the system creates the Code, its lineage, the relationship Wisdom namespace, and the issuer-belief Wisdom entry in one database transaction.
7. The Persona sends the Code out of band. The system does not contact an unregistered person.

## 6. Signup, verification, and redemption

1. A new person supplies name, email, password, and Code.
2. The system validates Code state, recipient binding, deadline, and remaining uses before accepting signup.
3. The system sends a verification link to the supplied email. Account access remains blocked until verification.
4. Verification atomically locks and re-validates the Code, consumes one use, writes the redemption, records lineage, links the relationship namespace to the new account, and forms the Relationship.
5. A personal/single-use Code cannot be successfully redeemed again. An open/permanent Code remains usable until revoked or otherwise limited.

The prototype exposes a clearly labeled verification-link fallback only when outbound email is unavailable. This keeps development usable but does not prove mailbox ownership; production behavior must fail closed if real delivery is required and unavailable.

## 7. Relationship Wisdom and disagreement

Relationship Wisdom is perspective-preserving, not a shared editable profile.

- `owner_belief`: what the inviting Persona believes or remembers about the other person. The invitee cannot overwrite it.
- `self_shared`: what the subject says about themselves and elects to share. The inviter cannot overwrite it.
- Later perspectives may include `organization_record`, `project_observation`, or `public_source`, each with provenance.

Contradiction is allowed and visible. Retrieval returns each statement with author, perspective, and access boundary rather than collapsing them into one supposed truth.

Every entry is `public`, `private`, `secret`, or `personal`:

- **Public**: available under public retrieval policy.
- **Private**: available to the author and explicitly participating people/containers; additional grants are named.
- **Secret**: available only to the author and explicit named grants.
- **Personal**: available only to the author; never grantable.

The vector index is always filtered by deterministic access policy before similarity ranking. Embedding proximity never grants access.

## 8. Lineage

Every account records the Code through which it entered and the invitation path that preceded it. A newly issued Code inherits the issuer's lineage and appends the issuer and new Code. Redemption stores the exact path observed at commit time.

Lineage supports attribution and relationship history. It does not imply inherited authority or trust. Trust remains directional and explicit at every edge.

## 9. Prototype scope now

Implemented in this prototype:

- Durable signup/login/logout and session cookies.
- Email-verification token and real delivery when the configured email provider succeeds.
- David's pre-seeded verified account without committed credentials.
- Personal and open Codes.
- Optional single use or unlimited use.
- Permanent, 15-minute, 24-hour, and seven-day redemption windows.
- High/Medium/Low trust.
- Bound recipient email for personal Codes.
- Atomic use enforcement, expiry, revocation state, lineage, and redemption Records.
- Relationship creation and issuer-owned vector namespace.
- Perspective-preserving Wisdom with all four access levels and explicit grants.
- Ki-led invite builder, Code display, copy action, and invite status.

Deliberately deferred:

- JWT or successor token format and cryptographic signatures.
- Wallet/FROST key binding and decentralized issuer verification.
- Cross-ecosystem verification endpoint and federation.
- Domain/group binding beyond recorded prototype claims.
- Production role/scope execution, benefits, prices, terms, Sentinel contracts, and external Actions.
- Automated profiling from public sources.
- Cryptographic privacy, key distribution, revocation propagation, and regulated effects.

## 10. Security invariants

- Passwords are salted and hashed; plaintext passwords are never stored or returned.
- Session tokens and verification tokens are stored only as hashes.
- Sessions use HttpOnly, SameSite cookies and Secure cookies in production.
- Code redemption limits are enforced inside a database transaction with row locking.
- Email and bound recipient values are normalized before comparison.
- A Code never upgrades its own execution mode or bypasses email verification.
- Retrieved content and invite context remain data, never instructions to Ki.
- Prototype status is visible on every authentication and Code surface.
