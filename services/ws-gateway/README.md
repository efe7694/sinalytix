# ws-gateway (not yet built)

Populated in Faz 2/3, once `CareTask`/`CaregiverShift` exist to broadcast changes for
(Module 2 §4 WebSocket channels, Module 3 §3 real-time architecture).

Plan: `@nestjs/platform-ws` (raw `ws`, not Socket.IO — Module 2 §4 specifies a
custom JSON envelope over `wss://`, not Socket.IO's protocol), subscribing to
the same Redis pub/sub the `job-runner` outbox poller publishes to, with topic
authorization via `@sinalytix/policy-engine`. See DEVIATIONS.md D0.

No `package.json` here yet on purpose — an empty NestJS bootstrap with
nothing to do would be dead code until there's a real topic to serve.
