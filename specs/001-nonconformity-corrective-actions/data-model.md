# Data Model: Non-Conformity Corrective Actions Management

## Entities

### NonConformity

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUIDv7 | Yes | Primary key |
| title | string | Yes | Short issue summary |
| incident_description | string | Yes | Structured narrative of event and impact |
| root_cause_analysis | string | No | Investigation findings |
| status | enum | Yes | `Open`, `Under_Review`, `Resolved`, etc. |
| owner_id | UUID | Yes | Accountable user or team owner |
| vessel_name | string | No | Marine context only when relevant |
| voyage_reference | string | No | Marine context only when relevant |
| incident_location | string | No | Marine context only when relevant |
| created_at | UTC timestamp | Yes | Creation time |
| updated_at | UTC timestamp | Yes | Last mutation time |
| deleted_at | UTC timestamp | No | Set only on soft delete |
| is_deleted | boolean | Yes | Default false |
| version | integer | Yes | Optimistic concurrency revision |

**Rules**:
- Lifecycle transitions must occur through domain methods.
- `title` and `incident_description` are required for create and update operations.
- `root_cause_analysis` may remain empty until investigation begins.
- `is_deleted = true` hides the record from normal views but preserves the row and audit chain.

### CorrectiveAction

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUIDv7 | Yes | Primary key |
| nonconformity_id | UUIDv7 | Yes | FK to NonConformity |
| title | string | Yes | Action summary |
| description | string | Yes | Task details |
| owner_id | UUID | Yes | Responsible actor |
| due_date | UTC date | No | Completion target |
| status | enum | Yes | `Planned`, `In_Progress`, `Completed` |
| created_at | UTC timestamp | Yes | Creation time |
| updated_at | UTC timestamp | Yes | Last mutation time |
| is_deleted | boolean | Yes | Default false |

**Rules**:
- A corrective action belongs to exactly one non-conformity.
- It may not be created without a valid owner and description.
- Update events also generate audit-log entries.

### AuditLog

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUIDv7 | Yes | Primary key |
| actor_id | UUID | Yes | User or system actor |
| timestamp | UTC timestamp | Yes | ISO 8601 UTC |
| action | string | Yes | `CREATE`, `UPDATE`, `SOFT_DELETE`, etc. |
| entity_name | string | Yes | `NonConformity` or `CorrectiveAction` |
| entity_id | UUIDv7 | Yes | Affected record |
| changes | JSONB | Yes | `pre_mutation_state` and `post_mutation_state` |

**Rules**:
- Records are immutable after creation.
- `changes` stores only text and metadata deltas, not binary attachments.
- It must be written in the same transaction as the mutation.

## Relationships

- One `NonConformity` may have many `CorrectiveAction` records.
- Each `CorrectiveAction` is linked to a single `NonConformity`.
- Each mutation of either entity creates one `AuditLog` row.
- Soft-deleted records remain stored and linked to their audit history; they are not physically removed.

## Validation Rules

- A non-conformity must have a title and incident description before creation or update.
- A status transition must be allowed by the lifecycle state machine.
- Contradictory concurrent updates must be rejected through optimistic locking or version checking.
- Maritime fields are optional; if supplied, they must be non-empty strings and may be hidden when irrelevant.
- Deletion must be validated against authorization and must produce an audit entry before return success.
