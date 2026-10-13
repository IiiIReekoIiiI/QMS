import { AuditLog, NonConformity, NonConformityStatus } from '../../domain';
import { serializeForAudit } from '../../shared/utils/serialization';
import { IAuditLogRepository } from '../ports/audit-log-repository';
import { INonConformityRepository } from '../ports/nonconformity-repository';

export interface CreateNonConformityInput {
  id: string;
  title: string;
  incidentDescription: string;
  rootCauseAnalysis?: string;
  ownerId: string;
  status?: NonConformityStatus;
  vesselName?: string;
  voyageReference?: string;
  incidentLocation?: string;
}

export class CreateNonConformityUseCase {
  constructor(
    private readonly nonConformityRepository: INonConformityRepository,
    private readonly auditLogRepository: IAuditLogRepository
  ) {}

  async execute(
    input: CreateNonConformityInput,
    actorId: string
  ): Promise<NonConformity> {
    const nonConformity = NonConformity.create({
      id: input.id,
      title: input.title,
      incidentDescription: input.incidentDescription,
      rootCauseAnalysis: input.rootCauseAnalysis,
      ownerId: input.ownerId,
      status: input.status,
      vesselName: input.vesselName,
      voyageReference: input.voyageReference,
      incidentLocation: input.incidentLocation,
    });

    const log = AuditLog.fromMutation({
      actorId,
      action: 'CREATE',
      entityName: 'NonConformity',
      entityId: nonConformity.id,
      preMutationState: {},
      postMutationState: serializeForAudit(
        nonConformity.toSnapshot()
      ) as Record<string, unknown>,
    });

    await this.nonConformityRepository.save(nonConformity);
    await this.auditLogRepository.save(log);

    return nonConformity;
  }
}
