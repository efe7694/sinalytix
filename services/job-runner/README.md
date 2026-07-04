# job-runner (not yet built)

Populated starting Faz 2 (occurrence materialization, shift reminders/auto-close)
and expanded through later phases as jobs J1–J13 (Module 3 §4) get owning
tables. Plan: BullMQ (Redis-backed, already provisioned in
`infra/docker/docker-compose.yml`) for repeatable/cron jobs + the
`event_outbox` poller (Module 3 §3.2). See DEVIATIONS.md D0.

No `package.json` here yet on purpose — see `services/ws-gateway/README.md`
for the same reasoning.
