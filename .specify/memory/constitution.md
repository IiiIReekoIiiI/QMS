# Quality Management System (QMS-ISO9001) Constitution

## Core Principles

### I. QMS Scope

The system MUST support an organization in establishing, operating, maintaining, and continually improving its Quality Management System (QMS) in alignment with ISO 9001:2015. This includes managing the QMS processes and evidence associated with Context, Leadership, Planning, Support, Operation, Performance Evaluation, and Improvement. The system supports QMS work; it MUST NOT claim to certify an organization or independently guarantee its compliance with ISO 9001:2015. The organization and its designated personnel remain accountable for QMS decisions, process execution, and conformity.

Features unrelated to managing the organization's QMS—including billing, payment gateways, physical inventory tracking, and open-ended chat messaging—are out of scope. Plans that introduce modules outside these boundaries MUST be rejected.

The system MUST maintain an explicit mapping from each ISO 9001:2015 clause (4 through 10) to the capabilities that support it. Every clause MUST have an identified accountable owner, a defined evidence model, and a documented lifecycle. This mapping MUST be reviewed whenever a new feature is proposed, and any clause without coverage MUST be flagged as a known gap.

### II. Hexagonal Architecture and Explicit Domain Outcomes

The codebase MUST use three decoupled layers with dependencies directed inward:

1. **Domain:** QMS business entities, value objects, and rules. It MUST NOT depend on Application or Infrastructure, or on delivery, persistence, or framework technologies.
2. **Application:** Use cases that coordinate Domain behavior and define ports for external systems. It MAY depend on Domain but MUST NOT depend on Infrastructure or frameworks.
3. **Infrastructure:** Adapters that implement Application ports and connect to delivery, persistence, frameworks, and external services. It MAY depend on Application and Domain.

Use cases MUST represent expected QMS/domain failures with a discriminated union or a `Result`/`Either` type, such as `Result<Success, DomainError>`. Generic exceptions such as `throw new Error` MUST NOT represent expected business outcomes. Unexpected technical failures MUST NOT be converted into success-shaped results; they MUST reach centralized error handling, be logged using the structured-logging requirements, and return safe external responses that do not expose internal details. Database entities MUST use UUIDv7 primary keys.

Only domain-defined error variants MAY appear inside a `Result`/`Either`. Any error originating outside the Domain layer (database, network, framework, IO, etc.) MUST propagate as a thrown exception or rejected promise and MUST NOT be wrapped in a `Result`. This boundary MUST be enforced by convention and reviewed in code review; a shared helper MUST exist that only accepts domain error types.

### III. Quality Evidence, Traceability, and Lifecycle

**QMS evidence** is documented information used to demonstrate the operation, results, or effectiveness of the organization's QMS. The system MUST provide comprehensive traceability for all QMS records—including quality objectives, risks, opportunities, audits, findings, and corrective actions—by tracking their complete lifecycle and decision history.

Every successful state mutation to a QMS record MUST synchronously create an immutable record in a dedicated `audit_logs` table within the same database transaction. To ensure a complete and useful audit trail for ISO 9001 compliance, each audit log entry MUST capture exactly:
1. **Who did it (`actor_id`):** The unique identifier of the user or system actor who made the change.
2. **When (`timestamp`):** The exact date and time of the action, stored and exchanged in UTC using ISO 8601.
3. **What action (`action`):** The specific operation performed (e.g., `CREATE`, `UPDATE`, `APPROVE`, `SOFT_DELETE`, `PURGE`).
4. **On what resource (`entity_name` and `entity_id`):** The type of QMS record modified and its unique UUIDv7 identifier.
5. **How it changed (`changes`):** A descriptive delta payload storing the exact textual content as it was before (`pre_mutation_state`) and how it is now (`post_mutation_state`). 

To maintain system speed and avoid data bloat, the `changes` payload MUST store only structural text fields, forms, and metadata. It MUST NOT copy binary file attachments, heavy payloads, or secrets; instead, it MUST store stable identifiers and version references to those files.

The system PROHIBITS the immediate physical destruction of active QMS records. When an authorized user deletes a record, the system MUST execute a **Soft Delete**. A soft-deleted record MUST be marked as inactive (`is_deleted = true`, `deleted_at = TIMESTAMP`) and hidden from ordinary user views, but it MUST remain physically intact in the database to preserve historical traceability and existing audit logs.

A permanent **Hard Delete (Purga)** MAY only be executed automatically by a system background process once a record has remained in a soft-deleted state for the entire duration defined in the approved organization's data retention policy. When this retention period expires, the record’s content is permanently purged from the database to reclaim space. The execution of this purge, along with its authorization timestamp, MUST be recorded as a final event in the `audit_logs` table before the record disappears.

If applicable privacy laws (such as the right to be forgotten) require the removal of personal data before the retention period expires, the system MUST use **Crypto-shredding or Anonymization** (destroying the encryption keys or overwriting personal names with generic placeholders like "Deleted User"). The physical records, structural text changes, and their corresponding `audit_logs` entries MUST NOT be deleted, ensuring the historical chain of events remains unbroken and fully auditable for ISO 9001.

Entities with complex lifecycles MUST implement an explicit state machine in the Domain layer. Direct status mutation is prohibited; transitions MUST use semantic domain methods. The Domain layer MUST prevent the author or editor of an ISO document from approving that same document. Time-based calculations, including corrective-action deadlines and audit schedules, MUST be performed in the Application layer.

The system MUST detect when a QMS record has changed since a user loaded it and MUST prevent silent overwrites. Conflicting updates MUST be rejected; the user MUST be informed of the conflict and given access to the current record before retrying.

### Controlled Documents: Operational State Separation

Controlled documents and operational forms MUST maintain a strict, explicit separation between their approval status and their operational effectiveness to protect 24/7/365 maritime maneuvers. 

1. **Approval State (`Approved`):** The action where the Quality Leader or compliance authority verifies and freezes the document content. This action MUST NOT automatically activate the document in daily operations.
2. **Effectiveness State (`Effective`):** The explicit, separate action or verified scheduled deployment date where the approved document is officially made visible and mandatory for crews and vessels. 

The system PROHIBITS an approved document from automatically superseding an active version until the explicit effectiveness trigger occurs. Superseded versions MUST remain identifiable and transition to an inactive state precisely at the millisecond the new version becomes effective, ensuring zero operational disruption or data confusion during live maritime operations.

### IV. Security and Access Control

Every endpoint and use case MUST enforce role-based authorization for specific roles, such as Auditor, Quality Leader, and Contributor, following least privilege.

Authentication MUST use asymmetrically signed JWTs expiring within 15 minutes, paired with secure refresh tokens stored in `HttpOnly` and `Secure` cookies. Refresh tokens MUST be rotated after each successful use, and the previously used token MUST be invalidated. Reuse of an invalidated refresh token MUST revoke its token family and require reauthentication. The mechanism used to track token families MUST be documented in approved architecture guidance. Access-token invalidation on logout and concurrent-session handling MUST be defined in approved architecture guidance.

Uploaded files, including PDFs, manuals, and audit evidence, MUST be encrypted at rest using AES-256-GCM in the Infrastructure layer before persistence. All network connections between clients, application services, and storage containing QMS data MUST use TLS with certificate validation; production interfaces MUST NOT accept plaintext connections. Encryption keys MUST be managed by an approved key-management service, stored separately from encrypted files, access-controlled, and rotatable. Application configuration MAY identify or grant access to the key-management service but MUST NOT store key material.

The system MUST define and enforce a data classification scheme (for example: Public, Internal, Confidential, Restricted). Every QMS record type MUST be assigned a classification. Handling rules for storage, transmission, logging, export, and disposal MUST be defined per classification and documented in approved architecture guidance. Rules that reference "secrets" or "sensitive data" elsewhere in this constitution MUST be interpreted using this classification scheme.

The system MUST declare its tenancy model in approved architecture guidance. If the system is single-tenant by design, that MUST be stated explicitly along with the conditions under which the decision would be revisited. If multi-tenant, tenant isolation rules MUST be defined, enforced at the data-access layer, and covered by integration tests.

### V. Operational Reliability

### Reliable Time, Contingency Escalation, and Temporal Consistency

The system MUST establish a multi-layered defense strategy to guarantee the veridicality and chronological consistency of all QMS timestamps. The server environment MUST NOT rely on client-side (browser) clocks under any circumstance.

To minimize the risk of application downtime while protecting audit trail integrity, the system MUST implement the following time synchronization and verification escalation:

1. **Primary Time Source (NTP Pool):** The system MUST synchronize its internal clock via Network Time Protocol (NTP) utilizing a redundant pool of verified, high-availability time providers (e.g., Google, Cloudflare, and infrastructure-native time services). 
2. **Database Fallback:** If the primary NTP pool becomes temporarily unreachable, the application layer MAY fallback to utilizing the atomic clock timestamp generated directly by the centralized relational database cluster (`NOW()`), provided the database environment maintains active time synchronization.
3. **Monotonic Offset:** In the event of short-term network disruptions where external sources are completely isolated, the application layer MAY temporarily rely on its internal monotonic hardware clock (e.g., CPU high-resolution timers) adjusted by the last validated synchronization offset. This state MUST NOT exceed an approved cumulative threshold (e.g., 2 hours).
4. **Fail-Fast Safe Mode (Only-Read Enforcement):** If all previous escalation layers fail to validate a reliable time source, or if a clock drift anomaly is detected, the system MUST immediately enforce a strict fail-fast state. All active write operations, creations, edits, and state mutations to QMS records MUST be blocked and rejected. The application MUST restrict user interactions to read-only views until time synchronization is fully restored, and a critical alert MUST be dispatched to the Technical Logs stream.

Furthermore, the Application layer MUST validate that the timestamp of any new mutation, update, or lifecycle transition is strictly greater than or equal to the record's creation timestamp and its prior audit log entries. Any attempt to record an event with an incoherent or retroactive timestamp MUST be aborted immediately and treated as a security incident.

Unstructured direct console output MUST NOT be used for application logging. Technical logs MUST be structured and MUST include a `correlation_id`. Technical logs MUST NOT contain QMS evidence content, secrets, or unnecessary sensitive data, and MUST have a defined retention period documented in approved operational policy.

### Environment Configuration and Migrations

Environment configuration MUST be accessed through a centralized configuration boundary, strongly typed, and validated at startup using a strict schema. Required missing or invalid configuration MUST cause the application to fail fast.

Automatic schema synchronization MUST NOT be enabled in any environment. Schema changes MUST use immutable database migrations in every environment, and seed data MUST be idempotent. Data access MUST make relational query behavior explicit and MUST prevent N+1 query patterns.

### VI. Mobile-First Design

The design of every user-facing QMS feature MUST prioritize the mobile experience over the desktop experience. Design and validate the mobile layout and core workflows first; desktop layouts MUST adapt and extend that mobile-first design rather than constrain it. Core QMS workflows MUST remain usable on mobile devices.

For the purposes of this constitution, "usable on mobile" means: every core QMS workflow MUST be completable on a 375 CSS-pixel-wide viewport without horizontal scrolling, using only touch input, and MUST meet WCAG 2.2 Level AA for the screens involved. Compliance MUST be verified in CI via automated viewport and accessibility checks for the core workflow screens.

## Additional Constraints

Any framework or technology required for product implementation MUST be reviewed and approved by the Technical Lead before adoption. Approved architecture/platform guidance MUST record the approval, rationale, adopted technology, exact version, and any approved alternatives.

Technology choices and their exact versions MUST be documented in approved architecture/platform guidance. Selected technologies MUST be supported, security-patched, and reviewed before adoption. Domain and Application code MUST meet at least 90% line coverage and 85% branch coverage using the project's approved test framework, and CI MUST enforce these thresholds for every change. Generated code and framework configuration are excluded. Any other coverage exclusion requires an approved exception under this constitution.

Infrastructure code is not subject to a blanket coverage threshold. Instead, Infrastructure code paths that implement atomic audit logging, authorization enforcement, encryption, and secure transport MUST be covered by integration tests that exercise both success and failure behaviors. Other Infrastructure code MUST be covered by tests at the discretion of the reviewing engineer, and the rationale for the chosen level of testing MUST be recorded in code review. Coverage reports MUST still be generated and reviewed; they inform review but do not gate merges for Infrastructure code.

CI MUST run integration tests for critical QMS controls, including atomic audit logging and rollback on audit-write failure, authorization enforcement, concurrent-edit conflict detection, controlled-document versioning, traceable evidence correction, and export permissions. Tests MUST verify event actors, types, affected resources, outcomes, access restrictions, and protection against alteration or deletion across relevant application and infrastructure boundaries.

Every pull request MUST include a completed compliance checklist that references this constitution. The project maintains two checklist tiers: a core checklist required for every pull request, and a full checklist required for pull requests that touch high-risk areas (audit logging, authentication or authorization, evidence lifecycle, cryptography, schema or migrations). The definition of high-risk areas and the checklist templates MUST be maintained under version control alongside this constitution. CI MUST flag pull requests that modify non-compliant areas without an approved exception reference.

## Applicability and Development Workflow

This constitution applies to all QMS application code and changes, including workflows, domain rules, APIs, schemas and migrations, access control, audit trails, file storage, tests, and deployment configuration.

New features and changes to existing functionality MUST comply with applicable requirements. Existing code is not subject to a blanket rewrite. When a change touches a non-compliant area, the change MUST either bring that area into compliance or document an approved exception.

An exception MUST identify the requirement and affected area, explain its rationale and risk, specify compensating controls, name an accountable owner, and include a review or expiry date. Exceptions require approval from the QMS Product Owner and Quality/Compliance Lead. Exceptions MUST NOT waive legal, contractual, or customer requirements.

Design and code reviews MUST verify compliance with this constitution and record approved exceptions with the related work. If a feature specification or implementation plan conflicts with this constitution, work on the conflict MUST pause until it is resolved or an exception is approved.

## Governance

This constitution governs the engineering and architectural boundaries of the QMS software. As a single-developer project, the Lead Developer holds absolute authority over all architectural, technical, and compliance decisions.

Amendments to this document (including major, minor, and patch versions) require only the authorization and commit verification of the Lead Developer. Future updates that integrate external organizational roles or formal compliance committee approvals will be explicitly refactored only upon official deployment and adoption by the organization.

**Version**: 1.0.0 | **Ratified**: 2026-10-13 | **Last Amended**: 2026-10-13