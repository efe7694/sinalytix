# ingestion-worker (not yet built)

Populated in Faz 5 (HCP clinical ingestion — Module 3 §5's 4-tier pipeline)
once `ingestion_jobs`/`tier4_extraction_entities`/`document_hash_index`/
`connected_sources` (Module 1 §10) exist. Plan: BullMQ consumer, the only
service besides `core-api`'s agent-runtime module allowed to reach LLM
endpoints (Module 3 §1.5 egress rule). See DEVIATIONS.md D0.

No `package.json` here yet on purpose — see `services/ws-gateway/README.md`
for the same reasoning.
