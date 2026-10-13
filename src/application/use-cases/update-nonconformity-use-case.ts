import { AuditLog, NonConformity, NonConformityStatus } from '../../domain';
import { serializeForAudit } from '../../shared/utils/serialization';
import { IAuditLogRepository } from '../ports/audit-log-repository';
import { INonConformityRepository } from '../ports/nonconformity-repository';

export interface UpdateNonConformityInput {
  id: string;
  expectedVersion?: number;
  title?: string;
  incidentDescription?: string;
  rootCauseAnalysis?: string;
  ownerId?: string;
  status?: NonConformityStatus;
  vesselName?: string;
  voyageReference?: string;
  incidentLocation?: string;
}

export class UpdateNonConformityUseCase {
  constructor(
    private readonly nonConformityRepository: INonConformityRepository,
    private readonly auditLogRepository: IAuditLogRepository
  ) {}

  async execute(
    input: UpdateNonConformityInput,
    actorId: string
  ): Promise<NonConformity> {
    const nonConformity = await this.nonConformityRepository.findById(input.id);

    if (!nonConformity) {
      throw new Error(`NonConformity with id ${input.id} was not found.`);
    }

    if (
      input.expectedVersion !== undefined &&
      input.expectedVersion !== nonConformity.version
    ) {
      throw new Error(
        `NonConformity version conflict: expected ${input.expectedVersion}, found ${nonConformity.version}.`
      );
    }

    const before = serializeForAudit(
      nonConformity.toSnapshot()
    ) as Record<string, unknown>;

    if (input.title !== undefined) {
      nonConformity.setTitle(input.title);
    }

    if (input.incidentDescription !== undefined) {
      nonConformity.setIncidentDescription(input.incidentDescription);
    }

    if (input.rootCauseAnalysis !== undefined) {
      nonConformity.setRootCauseAnalysis(input.rootCauseAnalysis);
    }

    if (input.ownerId !== undefined) {
      nonConformity.setOwnerId(input.ownerId);
    }

    if (input.status !== undefined) {
      applyStatusTransition(nonConformity, input.status);
    }

    if (
      input.vesselName !== undefined ||
      input.voyageReference !== undefined ||
      input.incidentLocation !== undefined
    ) {
      nonConformity.updateMaritimeContext(
        input.vesselName ?? nonConformity.vesselName,
        input.voyageReference ?? nonConformity.voyageReference,
        input.incidentLocation ?? nonConformity.incidentLocation
      );
    }

    const after = serializeForAudit(
      nonConformity.toSnapshot()
    ) as Record<string, unknown>;
    const changes = createDelta(before, after);

    const auditLog = AuditLog.fromMutation({
      actorId,
      action: 'UPDATE',
      entityName: 'NonConformity',
      entityId: nonConformity.id,
      preMutationState: changes.preMutationState,
      postMutationState: changes.postMutationState,
    });

    await this.nonConformityRepository.save(nonConformity);
    await this.auditLogRepository.save(auditLog);

    return nonConformity;
  }
}

function applyStatusTransition(entity: NonConformity, nextStatus: NonConformityStatus): void {
  switch (nextStatus) {
    case 'Open':
      entity.open();
      return;
    case 'Under_Review':
      entity.startReview();
      return;
    case 'Resolved':
      entity.resolve();
      return;
    default:
      throw new Error(`Unsupported non-conformity status: ${nextStatus}`);
  }
}

function createDelta(
  before: Record<string, unknown>,
  after: Record<string, unknown>
) {
  const relevantFields = [
    'title',
    'incidentDescription',
    'rootCauseAnalysis',
    'status',
    'ownerId',
    'vesselName',
    'voyageReference',
    'incidentLocation',
    'isDeleted',
    'deletedAt',
    'version',
  ] as const;

  const preMutationState: Record<string, unknown> = {};
  const postMutationState: Record<string, unknown> = {};

  for (const field of relevantFields) {
    const previousValue = before[field];
    const nextValue = after[field];

    if (!Object.is(previousValue, nextValue)) {
      preMutationState[field] = previousValue;
      postMutationState[field] = nextValue;
    }
  }

  return { preMutationState, postMutationState };
}
