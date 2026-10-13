-- Migration: Initialize Non-Conformity and Audit Logs Tables
-- Target: PostgreSQL 16+

-- 1. Create Non-Conformity Status Enum
CREATE TYPE non_conformity_status AS ENUM ('Open', 'Under_Review', 'Resolved');

-- 2. Create Audit Log Action Enum
CREATE TYPE audit_log_action AS ENUM ('CREATE', 'UPDATE', 'APPROVE', 'SOFT_DELETE', 'PURGE');

-- 3. Create Non-Conformities Table
CREATE TABLE non_conformities (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    incident_description TEXT NOT NULL,
    root_cause_analysis TEXT NOT NULL DEFAULT '',
    status non_conformity_status NOT NULL DEFAULT 'Open',
    owner_id UUID NOT NULL,
    vessel_name VARCHAR(255) NULL,
    voyage_reference VARCHAR(255) NULL,
    incident_location VARCHAR(255) NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1
);

-- 4. Create Audit Logs Table (Strictly Transactional)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    actor_id UUID NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    action audit_log_action NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    changes JSONB NOT NULL
);

-- 5. Create Performance and Compliance Indexes
CREATE INDEX idx_non_conformities_lookup ON non_conformities (id) WHERE is_deleted = FALSE;
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_name, entity_id);