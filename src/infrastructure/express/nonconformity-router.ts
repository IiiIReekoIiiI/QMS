import {
  CreateNonConformityUseCase,
  SoftDeleteNonConformityUseCase,
  UpdateNonConformityUseCase,
} from '../../application';
import { NonConformityStatus } from '../../domain';
import {
  PostgresAuditLogRepository,
  PostgresNonConformityRepository,
  PostgresPool,
  withPostgresTransaction,
} from '../persistence';
import { HttpError } from './error-middleware';
import {
  ExpressFactoryLike,
  ExpressHandler,
  ExpressRequestLike,
  ExpressResponseLike,
} from './http-types';
import { createUuidV7 } from '../persistence/uuid-v7';

const nonConformityStatuses: readonly NonConformityStatus[] = [
  'Open',
  'Under_Review',
  'Resolved',
];

export function createNonConformityRouter(
  express: ExpressFactoryLike,
  pool: PostgresPool
) {
  const router = express.Router();

  router.post(
    '/nonconformities',
    asyncRoute(async (request, response) => {
      const actorId = requireActorId(request);
      const body = readObject(request.body);
      assertAllowedKeys(body, [
        'title',
        'incident_description',
        'root_cause_analysis',
        'status',
        'owner_id',
        'vessel_name',
        'voyage_reference',
        'incident_location',
      ]);

      const title = requiredString(body, 'title');
      const incidentDescription = requiredString(body, 'incident_description');
      const ownerId = requireUuid(body, 'owner_id');
      const status = optionalStatus(body, 'status');
      const rootCauseAnalysis = optionalString(body, 'root_cause_analysis');
      const vesselName = optionalNonEmptyString(body, 'vessel_name');
      const voyageReference = optionalNonEmptyString(body, 'voyage_reference');
      const incidentLocation = optionalNonEmptyString(body, 'incident_location');

      const created = await withPostgresTransaction(pool, async (connection) => {
        const nonConformityRepository = new PostgresNonConformityRepository(connection);
        const auditLogRepository = new PostgresAuditLogRepository(connection);
        const useCase = new CreateNonConformityUseCase(
          nonConformityRepository,
          auditLogRepository
        );

        return useCase.execute(
          {
            id: createUuidV7(),
            title,
            incidentDescription,
            ownerId,
            status,
            rootCauseAnalysis,
            vesselName,
            voyageReference,
            incidentLocation,
          },
          actorId
        );
      });

      response.status(201).json(toHttpRecord(created.toSnapshot()));
    })
  );

  router.put(
    '/nonconformities/:id',
    asyncRoute(async (request, response) => {
      const actorId = requireActorId(request);
      const id = requireUuidV7(request.params.id, 'id');
      const body = readObject(request.body);
      assertAllowedKeys(body, [
        'expected_version',
        'title',
        'incident_description',
        'root_cause_analysis',
        'owner_id',
        'status',
        'vessel_name',
        'voyage_reference',
        'incident_location',
      ]);

      const expectedVersion = readExpectedVersion(request, body);
      const input = {
        id,
        expectedVersion,
        title: optionalNonEmptyString(body, 'title'),
        incidentDescription: optionalNonEmptyString(body, 'incident_description'),
        rootCauseAnalysis: optionalString(body, 'root_cause_analysis'),
        ownerId: body.owner_id === undefined ? undefined : requireUuid(body, 'owner_id'),
        status: optionalStatus(body, 'status'),
        vesselName: optionalNonEmptyString(body, 'vessel_name'),
        voyageReference: optionalNonEmptyString(body, 'voyage_reference'),
        incidentLocation: optionalNonEmptyString(body, 'incident_location'),
      };

      if (!hasUpdate(input)) {
        throw new HttpError(400, 'EMPTY_UPDATE', 'At least one field to update is required.');
      }

      const updated = await withPostgresTransaction(pool, async (connection) => {
        const nonConformityRepository = new PostgresNonConformityRepository(connection);
        const auditLogRepository = new PostgresAuditLogRepository(connection);
        const useCase = new UpdateNonConformityUseCase(
          nonConformityRepository,
          auditLogRepository
        );

        return useCase.execute(input, actorId);
      });

      response.setHeader('etag', `"${updated.version}"`);
      response.status(200).json(toHttpRecord(updated.toSnapshot()));
    })
  );

  router.delete(
    '/nonconformities/:id',
    asyncRoute(async (request, response) => {
      const actorId = requireActorId(request);
      requireSoftDeletePermission(request);
      const id = requireUuidV7(request.params.id, 'id');

      const deleted = await withPostgresTransaction(pool, async (connection) => {
        const nonConformityRepository = new PostgresNonConformityRepository(connection);
        const auditLogRepository = new PostgresAuditLogRepository(connection);
        const useCase = new SoftDeleteNonConformityUseCase(
          nonConformityRepository,
          auditLogRepository
        );

        return useCase.execute({ id }, actorId);
      });

      response.status(200).json(toHttpRecord(deleted.toSnapshot()));
    })
  );

  return router;
}

function asyncRoute(
  operation: (
    request: ExpressRequestLike,
    response: ExpressResponseLike
  ) => Promise<void>
): ExpressHandler {
  return (request, response, next) => {
    void operation(request, response).catch((error: unknown) => {
      next(toHttpError(error));
    });
  };
}

function toHttpError(error: unknown): unknown {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.message.includes('version conflict')) {
      return new HttpError(409, 'VERSION_CONFLICT', 'The record changed. Reload it before retrying.');
    }

    if (error.message.includes('was not found')) {
      return new HttpError(404, 'NOT_FOUND', 'The requested non-conformity was not found.');
    }

    if (
      error.message.includes('Invalid state transition') ||
      error.message.includes('is required and cannot be empty') ||
      error.message.startsWith('Invalid non-conformity status')
    ) {
      return new HttpError(400, 'INVALID_REQUEST', 'The request violates a domain rule.');
    }
  }

  return error;
}

function requireActorId(request: ExpressRequestLike): string {
  const actorId = request.user?.id;
  if (!actorId?.trim()) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }
  return actorId;
}

function requireSoftDeletePermission(request: ExpressRequestLike): void {
  const user = request.user;
  if (!user) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }

  const hasQualityRole = user.roles?.some(
    (role) => normalizeAuthorizationName(role) === 'quality leader'
  );
  const canReviewEvidence = user.permissions?.some(
    (permission) => normalizeAuthorizationName(permission) === 'evidence review'
  );

  if (!hasQualityRole && !canReviewEvidence) {
    throw new HttpError(403, 'FORBIDDEN', 'You are not authorized to delete this record.');
  }
}

function normalizeAuthorizationName(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function readObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'INVALID_REQUEST', 'A JSON object request body is required.');
  }
  return value as Record<string, unknown>;
}

function assertAllowedKeys(
  body: Record<string, unknown>,
  allowedKeys: readonly string[]
): void {
  const unknownKey = Object.keys(body).find((key) => !allowedKeys.includes(key));
  if (unknownKey) {
    throw new HttpError(400, 'INVALID_FIELD', 'The request contains an unsupported field.');
  }
}

function requiredString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, 'INVALID_FIELD', `${key} must be a non-empty string.`);
  }
  return value.trim();
}

function requireUuid(body: Record<string, unknown>, key: string): string {
  const value = requiredString(body, key);
  if (!isUuid(value)) {
    throw new HttpError(400, 'INVALID_FIELD', `${key} must be a UUID.`);
  }
  return value;
}

function optionalString(
  body: Record<string, unknown>,
  key: string
): string | undefined {
  const value = body[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new HttpError(400, 'INVALID_FIELD', `${key} must be a string.`);
  }
  return value;
}

function optionalNonEmptyString(
  body: Record<string, unknown>,
  key: string
): string | undefined {
  const value = optionalString(body, key);
  if (value !== undefined && !value.trim()) {
    throw new HttpError(400, 'INVALID_FIELD', `${key} must not be empty.`);
  }
  return value;
}

function optionalStatus(
  body: Record<string, unknown>,
  key: string
): NonConformityStatus | undefined {
  const value = body[key];
  if (value === undefined) {
    return undefined;
  }
  if (
    typeof value !== 'string' ||
    !nonConformityStatuses.includes(value as NonConformityStatus)
  ) {
    throw new HttpError(400, 'INVALID_STATUS', `${key} is not a supported status.`);
  }
  return value as NonConformityStatus;
}

function readExpectedVersion(
  request: ExpressRequestLike,
  body: Record<string, unknown>
): number {
  const bodyValue = body.expected_version;
  if (
    bodyValue !== undefined &&
    (typeof bodyValue !== 'number' || !Number.isSafeInteger(bodyValue) || bodyValue < 1)
  ) {
    throw new HttpError(400, 'INVALID_VERSION', 'expected_version must be a positive integer.');
  }

  const ifMatch = request.get('if-match');
  const headerVersion = ifMatch ? parseVersionHeader(ifMatch) : undefined;
  if (ifMatch && headerVersion === undefined) {
    throw new HttpError(400, 'INVALID_VERSION', 'If-Match must contain a record version.');
  }

  if (bodyValue !== undefined && headerVersion !== undefined && bodyValue !== headerVersion) {
    throw new HttpError(
      400,
      'CONFLICTING_VERSIONS',
      'expected_version and If-Match must specify the same version.'
    );
  }

  const expectedVersion = bodyValue ?? headerVersion;
  if (expectedVersion === undefined) {
    throw new HttpError(
      400,
      'VERSION_REQUIRED',
      'Provide expected_version or the If-Match header.'
    );
  }
  return expectedVersion as number;
}

function parseVersionHeader(value: string): number | undefined {
  const match = /^"?(\\d+)"?$/.exec(value.trim());
  if (!match) {
    return undefined;
  }

  const version = Number(match[1]);
  return Number.isSafeInteger(version) && version > 0 ? version : undefined;
}

function requireUuidV7(value: string | undefined, field: string): string {
  if (typeof value !== 'string' || !isUuidV7(value)) {
    throw new HttpError(400, 'INVALID_ID', `${field} must be a UUIDv7.`);
  }
  return value;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isUuidV7(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function toHttpRecord(snapshot: {
  id: string;
  title: string;
  incidentDescription: string;
  rootCauseAnalysis?: string;
  status?: NonConformityStatus;
  ownerId: string;
  vesselName?: string;
  voyageReference?: string;
  incidentLocation?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  isDeleted?: boolean;
  version?: number;
}) {
  return {
    id: snapshot.id,
    title: snapshot.title,
    incident_description: snapshot.incidentDescription,
    root_cause_analysis: snapshot.rootCauseAnalysis ?? '',
    status: snapshot.status,
    owner_id: snapshot.ownerId,
    vessel_name: snapshot.vesselName ?? null,
    voyage_reference: snapshot.voyageReference ?? null,
    incident_location: snapshot.incidentLocation ?? null,
    created_at: snapshot.createdAt?.toISOString(),
    updated_at: snapshot.updatedAt?.toISOString(),
    deleted_at: snapshot.deletedAt?.toISOString() ?? null,
    is_deleted: snapshot.isDeleted ?? false,
    version: snapshot.version,
  };
}

function hasUpdate(input: {
  id: string;
  expectedVersion: number;
  title?: string;
  incidentDescription?: string;
  rootCauseAnalysis?: string;
  ownerId?: string;
  status?: NonConformityStatus;
  vesselName?: string;
  voyageReference?: string;
  incidentLocation?: string;
}): boolean {
  return Object.entries(input).some(
    ([key, value]) =>
      key !== 'id' && key !== 'expectedVersion' && value !== undefined
  );
}
