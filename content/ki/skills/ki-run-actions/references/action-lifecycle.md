# Action lifecycle

## States

`proposed → awaiting_context → awaiting_authorization → awaiting_confirmation → queued → executing → waiting_external → completed`

Terminal and recovery states: `failed`, `denied`, `deferred`, `cancelled`, `expired`, `compensating`, `compensated`, `manually_resolved`.

External operations distinguish `authorized`, `queued`, `submitted`, `acknowledged`, `awaiting_external`, `settled`, `failed_retryable`, and `failed_terminal`.

## Honesty mapping

- drafted: artifact only;
- proposed: ActionRequest exists;
- authorized: allowed, not committed;
- committed: local state and Record written;
- submitted: provider received it, not settled;
- completed: all required local work completed;
- settled: authoritative external rail confirms finality;
- completed in prototype: simulated state reached terminal success without real external effect.

Never render intent as completion.

## Receipt fields

Include ActionDefinition/version, exact parameters with redaction, Source/requester, Organization/Project, authority basis, conflicts, confirmation proof reference, mode, before/after state versions, performer and tool/Skill/Actor versions, external references, result, timestamp, and superseding/correction links.

Machine-render receipts from command parameters. Ki may explain a receipt but not replace it.

