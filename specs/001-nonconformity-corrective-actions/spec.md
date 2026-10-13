# Feature Specification: Non-Conformity Corrective Actions Management

**Feature Branch**: `[001-nonconformity-corrective-actions]`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Hi. We are going to initialize the `specification.md` (or `specs/non-conformities.md`) file using the Spec-Driven Development (SDD) methodology with Spec Kit.

Before writing any code, we must define the "WHAT" of our first module: **Non-Conformities and Corrective Actions Management (ISO 9001:2015 - Clause 10.2)**.

For this module, you MUST strictly adhere to the boundaries established in our `constitution.md` (Version 1.0.0):
1. **Hexagonal Architecture:** Clearly define Domain entities (NonConformity, CorrectiveAction), Application use cases, and Infrastructure adapters (Express routes and persistence).
2. **Audit Trail Requirements (Section III):** Design the data contract so that every mutation synchronously records inside the `audit_logs` table the `actor_id`, `timestamp`, `action`, and the `changes` JSONB payload (capturing the explicit `pre_mutation_state` and `post_mutation_state` of modified text fields).
3. **Lifecycle & Soft Delete:** Immediate physical destruction of active QMS records is strictly prohibited. Define the semantic state machine for the Non-Conformity lifecycle (e.g., `Open`, `Under_Review`, `Resolved`) and the logical deletion behavior (`is_deleted = true`, `deleted_at`).
4. **Pragmatic Scope:** This module is purely based on structured text forms. DO NOT include binary file uploads, AES-256 file encryption, or digital signatures at this stage.

**Required Specification Document Structure:**
- **ISO Clause Mapping:** Explicit alignment with ISO 9001:2015 clause 10.2.
- **Domain Data Models:** Core fields (UUIDv7 ID, Title, Incident Description, Root Cause Analysis, Status, timestamps).
- **API Contracts (Expected Endpoints):** Proposed Express routes (POST, GET, PUT, DELETE for Soft Delete) including strict request schema validations.
- **Audit Log Payload Flow:** Concrete JSONB example showing how text updates will be captured in the audit stream.

Please read `constitution.md`, analyze these requirements, and initialize the specification file. If you encounter any ambiguities or require domain-specific fields for maritime incident reporting, pause at the `/clarify` phase and ask me your questions before finalizing the document."

## ISO Clause Mapping

This feature addresses ISO 9001:2015 Clause 10.2: Nonconformity and Corrective Action.

- **Clause 10.2.1**: The system must enable the identification, documentation, and reporting of nonconformities.
- **Clause 10.2.2**: The system must support root cause analysis and the determination of corrective actions.
- **Clause 10.2.3**: The system must support implementation, review, and effectiveness of corrective actions.
- **Clause 10.2.4**: The system must preserve accountability and evidence for actions taken and their outcomes.

The feature is scoped to structured text-based records and their lifecycle evidence. It does not include binary attachments, file encryption, or signature workflows.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record and classify a non-conformity (Priority: P1)

A Quality or Operations user needs to log a non-conformity that affects a process, product, or service so it can be reviewed, investigated, and resolved in accordance with ISO 9001:2015.

**Why this priority**: This is the core value of the module; without a reliable record of issues, root-cause analysis and corrective action cannot begin.

**Independent Test**: A user can create a non-conformity record with a title, description, and initial status, and the record becomes visible to authorized reviewers.

**Acceptance Scenarios**:

1. **Given** a logged-in quality user with permission to create records, **When** they submit a new non-conformity with a title and incident description, **Then** a new record is created with a unique UUIDv7 ID and an initial state of `Open`.
2. **Given** a new non-conformity record exists, **When** a reviewer opens it, **Then** they can read the full incident description and current status, and the record is clearly attributed to its owner or creator.

---

### User Story 2 - Investigate root cause and assign corrective actions (Priority: P1)

A responsible team member needs to document the underlying cause of the issue and assign action items to close the non-conformity.

**Why this priority**: Root-cause analysis and corrective action ownership are the operational heart of Clause 10.2 and directly support continual improvement.

**Independent Test**: A reviewer can update the root cause analysis and create one or more corrective actions associated with the non-conformity.

**Acceptance Scenarios**:

1. **Given** an `Open` non-conformity, **When** the assigned reviewer records root cause findings, **Then** the analysis is saved and the status may advance to `Under_Review`.
2. **Given** a non-conformity under review, **When** a corrective action is created with an owner, target date, and description, **Then** the corrective action is linked to the set of affected records and visible to authorized users.

---

### User Story 3 - Resolve and soft-delete records with traceability (Priority: P2)

A Quality Leader or Auditor needs to close non-conformities, preserve evidence, and ensure soft-deleted records remain available for audit history while being hidden from routine operation.

**Why this priority**: Lifecycle closure and historical traceability protect compliance obligations and prevent silent data loss.

**Independent Test**: A resolved non-conformity can be closed, and a user deletion can be executed as a soft delete without physical removal from the database.

**Acceptance Scenarios**:

1. **Given** a non-conformity with completed corrective actions, **When** the assigned owner marks it as resolved, **Then** the record status changes to `Resolved` and the action is recorded in the audit log.
2. **Given** a non-conformity is removed by an authorized user, **When** the delete request is processed, **Then** the record is marked `is_deleted = true`, retains its audit history, and is hidden from ordinary views.

---

### Edge Cases

- What happens when a user attempts to update a non-conformity that has changed since it was loaded?
- How does the system handle a corrective action that is created without a valid owner or due date?
- What happens when an authorized user attempts to permanently delete a record before the approved retention period has expired?
- How does the system behave when the state transition is not allowed by the defined lifecycle?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support creation of a non-conformity record with a unique UUIDv7 identifier, title, incident description, and initial lifecycle state.
- **FR-002**: System MUST allow authorized users to view, filter, and retrieve non-conformity records while preventing access to soft-deleted records in normal operational views.
- **FR-003**: System MUST allow authorized users to update structured text fields, including title, incident description, root cause analysis, and status narrative, while preserving the previous state for audit purposes.
- **FR-004**: System MUST enforce a states-based lifecycle for non-conformities, with progressive transitions such as `Open`, `Under_Review`, and `Resolved` using semantic domain methods rather than direct field mutation.
- **FR-005**: System MUST support creation of one or more corrective actions associated with a non-conformity, each with a clear owner, description, and due date or review status.
- **FR-006**: System MUST support optional maritime-specific incident metadata for any non-conformity record when the event is relevant to marine operations, including vessel name or identifier, voyage reference, and incident location; these fields MUST remain optional and hidden when not relevant.
- **FR-007**: System MUST allow soft deletion of a non-conformity by the Quality Leader or any authorized user with evidence-review permissions, while the record remains in the database with `is_deleted = true` and `deleted_at` recorded.
- **FR-008**: System MUST prevent silent overwrites by rejecting updates that conflict with the current record version and informing the user that the record changed before retry.
- **FR-009**: System MUST create an immutable audit log entry for every successful mutation, including the actor, timestamp, action, entity name, entity ID, and a JSONB `changes` payload containing `pre_mutation_state` and `post_mutation_state` for modified text fields.
- **FR-010**: System MUST maintain the historical chain of evidence for QMS records and reject any direct physical deletion of active records unless an approved retention and purge process is executed.
- **FR-011**: System MUST keep the module limited to structured text capture and lifecycle management, excluding binary file uploads, encryption at rest for attachments, and digital signatures for this feature stage.

### Domain Data Models

#### NonConformity

- **id**: UUIDv7 unique identifier.
- **title**: Short, human-readable summary of the issue.
- **incident_description**: Structured narrative describing the non-conformity, its impact, and context.
- **root_cause_analysis**: Summary of investigation findings and identified cause.
- **status**: Lifecycle state such as `Open`, `Under_Review`, or `Resolved`.
- **owner_id**: Identifier of the accountable user or team.
- **vessel_name**: Optional identifier for a vessel involved in a maritime incident.
- **voyage_reference**: Optional voyage or trip reference for maritime-related events.
- **incident_location**: Optional location or site detail relevant to the event.
- **created_at**: UTC creation timestamp.
- **updated_at**: UTC last modification timestamp.
- **deleted_at**: UTC timestamp for logical deletion when applicable.
- **is_deleted**: Boolean flag indicating soft-deleted status.
- **version**: Optimistic-concurrency token or revision counter for detection of conflicting updates.

#### CorrectiveAction

- **id**: UUIDv7 unique identifier.
- **nonconformity_id**: Reference to the containing non-conformity.
- **title**: Short action description.
- **description**: Required task or remediation description.
- **owner_id**: Responsible actor or team member.
- **due_date**: Intended completion date.
- **status**: Lifecycle status of the action, such as `Planned`, `In_Progress`, or `Completed`.
- **created_at**: UTC creation timestamp.
- **updated_at**: UTC last modification timestamp.
- **is_deleted**: Boolean flag if the action is removed logically.

#### AuditLog

- **id**: UUIDv7 unique identifier.
- **actor_id**: User or system actor performing the mutation.
- **timestamp**: UTC timestamp in ISO 8601 format.
- **action**: Operation name such as `CREATE`, `UPDATE`, `APPROVE`, `SOFT_DELETE`, or `PURGE`.
- **entity_name**: Type of record modified, such as `NonConformity` or `CorrectiveAction`.
- **entity_id**: UUIDv7 of the affected record.
- **changes**: JSONB payload with `pre_mutation_state` and `post_mutation_state` for text fields and metadata.

### API Contracts (Expected Endpoints)

The module will expose a narrow set of text-based endpoints following application-layer use cases and domain rules.

- **POST /nonconformities**
  - Creates a non-conformity record.
  - Request schema must require: `title`, `incident_description`, and optional `status` with allowed values defined in the lifecycle contract.
  - Accepts optional maritime metadata (`vessel_name`, `voyage_reference`, `incident_location`) only when relevant to the event.
  - Rejects invalid fields, blank required text, or out-of-range operational values.

- **GET /nonconformities**
  - Returns active non-conformity records visible to auth users.
  - Excludes soft-deleted records from ordinary listing views.

- **GET /nonconformities/:id**
  - Returns the selected non-conformity with current status, root cause analysis, and metadata.
  - Returns conflict information when a version mismatch is detected.

- **PUT /nonconformities/:id**
  - Updates structured text fields and lifecycle state transitions.
  - Strict validation must reject empty required values, unsupported state transitions, and invalid optional maritime metadata.
  - Synchronously writes an audit log record before returning success.

- **DELETE /nonconformities/:id**
  - Performs a logical soft delete.
  - Requires authorization for Quality Leader or designated evidence-management reviewer roles.
  - Sets `is_deleted = true`, `deleted_at`, and hides the record from standard views.
  - Non-destructive and auditable.

- **POST /nonconformities/:id/corrective-actions**
  - Creates a corrective action and links it to the source non-conformity.

- **GET /nonconformities/:id/corrective-actions**
  - Lists actions linked to the selected non-conformity.

- **PUT /nonconformities/:id/corrective-actions/:actionId**
  - Updates corrective action details or status, with audit record creation on every successful mutation.

### Audit Log Payload Flow

Each successful record mutation must generate an immutable audit entry within the same transaction. Example payload:

```json
{
  "actor_id": "8d28e2e0-8a55-4d83-a6dd-f8d16d3d42f0",
  "timestamp": "2026-10-13T14:02:33Z",
  "action": "UPDATE",
  "entity_name": "NonConformity",
  "entity_id": "4c118a56-7b4d-4490-9be6-e362d9d3d31a",
  "changes": {
    "pre_mutation_state": {
      "title": "Crane inspection overdue",
      "incident_description": "A lifting operation proceeded without a documented inspection.",
      "root_cause_analysis": "Initial assessment pending."
    },
    "post_mutation_state": {
      "title": "Crane inspection overdue",
      "incident_description": "A lifting operation proceeded without a documented inspection.",
      "root_cause_analysis": "Root cause was missed maintenance sign-off on the previous shift; corrective checklist was not enforced."
    }
  }
}
```

This record must be created synchronously and retained as immutable history even when the source record is later soft-deleted or resolved.

## Key Entities *(include if feature involves data)*

- **NonConformity**: A quality issue or process deviation that requires investigation and resolution.
- **CorrectiveAction**: A remediation task linked to a non-conformity to eliminate root causes or prevent recurrence.
- **AuditLog**: An immutable evidence trail of who changed what, when, and how the text changed.
- **Actor**: A user or system principal authorized to create, review, approve, or delete records.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of successful non-conformity and corrective-action mutations generate audit records in the same transaction.
- **SC-002**: 100% of soft-deleted records remain physically stored and hidden from ordinary user views until the approved retention policy allows purge.
- **SC-003**: Authorized users can complete the core non-conformity lifecycle from creation through resolution in under 10 minutes for typical records.
- **SC-004**: At least 95% of reviewed non-conformities achieve a clear outcome definition and follow-up action within the same review cycle.
- **SC-005**: Users report that the lifecycle and evidence trail are understandable and support continual improvement and audit readiness.

## Assumptions

- The organization has a defined set of roles such as Quality Leader, Auditor, and Contributor, with least-privilege access rules.
- Maritime metadata is optional for every record and is shown only when the non-conformity is relevant to marine operations; non-maritime records remain valid without it.
- Soft deletion is permitted by the Quality Leader or by any authorized user with evidence-review permissions; contributors may update records but may not permanently remove them from the audit trail.
- Structured text fields are the primary evidence model for this module, and no binary evidence is required in the initial release.
- Non-conformity records may be created for operational, quality, or compliance issues across business units, with optional maritime metadata only when relevant.
- Existing platform infrastructure provides identity and authorization boundaries, while this feature defines the QMS record lifecycle rules and obligations.
- The module is limited to the creation, tracking, and resolution of non-conformities and corrective actions and does not include document approval signatures or encrypted file attachments at this stage.
