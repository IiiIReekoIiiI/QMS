# Non-Conformity API Contract

## Base path

`/nonconformities`

## POST /nonconformities

Creates a new non-conformity record.

### Request

```json
{
  "title": "Crane inspection overdue",
  "incident_description": "A lifting operation proceeded without a documented inspection.",
  "root_cause_analysis": "Initial assessment pending.",
  "status": "Open",
  "owner_id": "uuid",
  "vessel_name": "MV Horizon",
  "voyage_reference": "VY-2045",
  "incident_location": "Berth 3"
}
```

### Validation

- `title` is required and not blank.
- `incident_description` is required and not blank.
- `status` must be a valid lifecycle value.
- `vessel_name`, `voyage_reference`, and `incident_location` are optional.
- `owner_id` must resolve to an authorized user or role owner.

### Response

- `201 Created` with the created record and generated UUIDv7 identifier.
- Authorization or validation failures return structured error responses without exposing internal details.

## GET /nonconformities

Returns active non-conformity records visible to the caller.

### Behavior

- Excludes soft-deleted records from standard listing and search.
- Supports filtering by status, owner, and date range.

## GET /nonconformities/:id

Returns the full non-conformity record for an authorized user.

### Behavior

- Returns version mismatch detail when the record changed since last read.
- Soft-deleted entries are hidden from ordinary user views.

## PUT /nonconformities/:id

Updates a non-conformity record.

### Validation

- Required text fields may not be empty.
- State transitions must be allowed by the lifecycle state machine.
- Version conflict must be rejected with a clear retry instruction.
- All successful updates generate a transactional audit log entry.

## DELETE /nonconformities/:id

Soft-deletes a non-conformity record.

### Validation

- Allowed only for the Quality Leader or authorized evidence-review roles.
- Sets `is_deleted = true` and records `deleted_at` in UTC.
- Record remains retrievable for audit traces but hidden from normal views.

## POST /nonconformities/:id/corrective-actions

Creates one corrective action linked to a non-conformity.

### Request

```json
{
  "title": "Reinstate inspection checklist",
  "description": "Require sign-off before any lifting operation proceeds.",
  "owner_id": "uuid",
  "due_date": "2026-10-20",
  "status": "Planned"
}
```

## PUT /nonconformities/:id/corrective-actions/:actionId

Updates corrective-action details or lifecycle state.

### Behavior

- Enforces the action status model.
- Produces an audit event on every successful mutation.
