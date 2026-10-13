# Implementation Plan: Non-Conformity Corrective Actions Management

**Branch**: `[001-nonconformity-corrective-actions]` | **Date**: 2026-10-13 | **Spec**: `specs/001-nonconformity-corrective-actions/spec.md`

**Input**: Feature specification from `/specs/001-nonconformity-corrective-actions/spec.md`

## Summary

This feature delivers the first QMS module for ISO 9001:2015 Clause 10.2: recording non-conformities, tracking root-cause analysis, creating corrective actions, and preserving immutable compliance evidence through the audit trail. The design keeps the domain model independent from Express and persistence, enforces lifecycle transitions and soft-delete behavior, and exposes a narrow, text-only API contract for operational use.

## Technical Context

**Language/Version**: TypeScript 5.x with Node.js 20 LTS

**Primary Dependencies**: Express, PostgreSQL, UUIDv7 generation, validation library (Zod or equivalent), structured logging

**Storage**: PostgreSQL relational database with dedicated `audit_logs` table and UUIDv7 keys for QMS entities

**Testing**: Vitest or Jest with integration tests for API and audit logging behavior

**Target Platform**: Web service backend for QMS operations

**Project Type**: web-service

**Performance Goals**: Typical non-conformity lifecycle updates complete within normal operational latency targets; audit writes must complete within the same transaction as the mutation

**Constraints**: Soft delete is non-destructive, lifecycle transitions are explicit, no binary attachments, no encrypted file storage in this scope, record version conflict detection is mandatory

**Scale/Scope**: Single-tenant QMS workflow with moderate operational volume; support for quality review and corrective actions rather than large document repositories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Pass: Hexagonal architecture is enforced by separating Domain, Application, and Infrastructure boundaries.
- Pass: `audit_logs` required record structure is defined for `actor_id`, `timestamp`, `action`, `entity_name`, `entity_id`, and `changes` with `pre_mutation_state` and `post_mutation_state`.
- Pass: Soft delete is required; physical record destruction is prohibited for active records.
- Pass: Lifecycle rules are explicit and enforced through semantic domain transitions.
- Pass: Scope is intentionally limited to structured text forms; binary uploads, encryption at rest, and signatures are excluded.
- Pass: Security and authorization requirements are captured at the use-case boundary.
- Pass: Conflict detection and optimistic concurrency rules are included.

## Project Structure

### Documentation (this feature)

```text
specs/001-nonconformity-corrective-actions/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (not created here)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── nonconformity/
│   ├── corrective-action/
│   └── audit-log/
├── application/
│   ├── use-cases/
│   ├── ports/
│   └── errors/
├── infrastructure/
│   ├── persistence/
│   ├── express/
│   └── auth/
├── shared/
│   └── validation/
└── index.ts

tests/
├── integration/
│   ├── audit-logging/
│   ├── auth/
│   └── nonconformity-flows/
├── contract/
│   └── nonconformity-api/
└── unit/
    └── domain/
```

**Structure Decision**: A single backend service is sufficient because the feature is a bounded QMS workflow with one domain model, one set of application use cases, and a single persistence boundary. Domain logic remains isolated from HTTP and database adapters.

## Complexity Tracking

No constitution violations require explicit exception handling for this feature. The design stays within the allowed architecture and compliance boundaries.
