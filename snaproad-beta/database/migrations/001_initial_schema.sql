-- Migration: 001_initial_schema
-- Created: 2025-01-01
-- Description: Initial database schema for SnapRoad Beta

BEGIN;

-- This migration creates the initial database schema
-- Run schema.sql for the full schema

-- Version tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);

-- Record this migration
INSERT INTO schema_migrations (version) VALUES ('001_initial_schema');

COMMIT;
