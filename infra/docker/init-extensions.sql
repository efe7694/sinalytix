-- PostgreSQL extensions for Sinalytix
-- Executed on first database initialization

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Field-level encryption for PHI columns
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Vector storage for RAG embeddings (Phase 2)
-- CREATE EXTENSION IF NOT EXISTS "vector";
