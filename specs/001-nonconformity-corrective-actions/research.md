# Research: Non-Conformity Corrective Actions Management

## Decision: Domain-first structure with Express-specific adapters

**Rationale**: The constitution requires a strict inward dependency model: Domain cannot depend on Application or Infrastructure, and Infrastructure can depend on Application and Domain. This means the work should be modeled in `src/domain`, orchestrated through `src/application`, and exposed via Express routes in `src/infrastructure/express`.

**Alternatives considered**:
- Single-layer service model with database logic mixed into route handlers — rejected because it violates hexagonal architecture and makes audit controls harder to enforce.
- Full document-management feature with attachments and signatures — rejected because it exceeds the specified scope and is explicitly out of scope for this stage.

## Decision: Audit logs as mandatory transactional evidence

**Rationale**: Every successful mutation must create a dedicated `audit_logs` row in the same database transaction. The payload must capture the exact before/after state for text fields and associated metadata so evidentiary traceability remains intact.

**Alternatives considered**:
- Logging only the record ID and action name — rejected because the constitution requires `pre_mutation_state` and `post_mutation_state` for change capture.
- Async background audit queue — rejected because the design requires synchronous write-before-commit semantics.

## Decision: Explicit non-conformity lifecycle state machine

**Rationale**: The spec requires a semantic state model such as `Open`, `Under_Review`, and `Resolved`, with transitions mediated through domain methods rather than direct mutation.

**Alternatives considered**:
- Free-form status strings without validation — rejected because it would allow invalid transitions and weak compliance evidence.
- Direct field updates from Infrastructure — rejected because lifecycle logic must live in the Domain layer.

## Decision: Soft delete instead of hard delete

**Rationale**: The constitution explicitly forbids immediate physical destruction of active records. Soft delete preserves historical traceability while hiding records from normal user views.

**Alternatives considered**:
- Immediate DELETE on API call — rejected as non-compliant.
- Hard delete after retention period through application code — accepted only as a later purge job, not as the default deletion mechanism.

## Decision: Maritime metadata is optional and conditional

**Rationale**: The final interpretation keeps `vessel_name`, `voyage_reference`, and `incident_location` optional for all records and visible only when relevant to marine operations. This preserves flexibility without creating mandatory fields for non-maritime cases.

**Alternatives considered**:
- Mandatory maritime fields for all records — rejected because it introduces noise and validation burden outside relevant cases.
- Per-organization schema toggles — rejected because it raises unnecessary configuration complexity for this module.

## Decision: Role-based authorization with least privilege

**Rationale**: The constitution requires role-based authorization, least privilege, and evidence review boundaries. The module treats soft delete as a privileged operation restricted to the Quality Leader and authorized evidence-review roles.

**Alternatives considered**:
- Allowing all authenticated users to delete records — rejected because it weakens evidence integrity and conflicts with the constitution.
- Creating a single universal admin role — rejected because it is less consistent with least-privilege access control.
