# Quickstart: Validate the Non-Conformity Module

## Prerequisites

- Running QMS API service with authenticated roles for Quality Leader, Auditor, and Contributor
- PostgreSQL database with the expected `nonconformities`, `corrective_actions`, and `audit_logs` tables
- Test harness capable of exercising Express API endpoints and database transactions

## Validation scenarios

### 1. Create a non-conformity

1. Authenticate as a Quality user or authorized reviewer.
2. Submit a record with title, incident description, and owner.
3. Confirm the service returns `201 Created` and the record has a UUIDv7 ID and initial status `Open`.
4. Verify an `audit_logs` row has been written in the same transaction.

### 2. Update root cause analysis

1. Retrieve the record and update the `root_cause_analysis` field.
2. Confirm the previous state is stored in `pre_mutation_state` and the new state in `post_mutation_state`.
3. Verify `updated_at` changes and the record version increments.

### 3. Create and complete a corrective action

1. Create a corrective action linked to the non-conformity.
2. Update its status to `Completed`.
3. Confirm the audit history captures the action, actor, timestamp, and changed content.

### 4. Soft delete a record

1. Authenticate as the Quality Leader or an evidence-review authorized user.
2. Send the DELETE request for an active record.
3. Confirm the record is hidden from standard views and marked `is_deleted = true` with a `deleted_at` timestamp.
4. Validate that the record still exists in storage and its historical audit chain remains available.

### 5. Reject conflicting updates

1. Load a record.
2. Modify the same record from another session.
3. Retry the first update.
4. Confirm the API rejects the stale write and surfaces a conflict message.

## Expected outcomes

- Every successful mutation produces an audit log.
- Soft-deleted records remain intact and auditable.
- Out-of-order or stale updates are rejected.
- The module remains limited to structured text forms and does not introduce unsupported binary or signing workflows.
