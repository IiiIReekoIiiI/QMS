import { AuditLog, NonConformity } from '../../domain';
import { serializeForAudit } from '../../shared/utils/serialization';
import { IAuditLogRepository } from '../ports/audit-log-repository';
import { INonConformityRepository } from '../ports/nonconformity-repository';

export interface SoftDeleteNonConformityInput {
  id: string;
}

export class SoftDeleteNonConformityUseCase {
  constructor(
    private readonly nonConformityRepository: INonConformityRepository,
    private readonly auditLogRepository: IAuditLogRepository
  ) {}

  async execute(
    input: SoftDeleteNonConformityInput,
    actorId: string
  ): Promise<NonConformity> {
    const nonConformity = await this.nonConformityRepository.findById(input.id);

    if (!nonConformity) {
      throw new Error(`NonConformity with id ${input.id} was not found.`);
    }

    const preMutationState = {
      isDeleted: nonConformity.isDeleted,
      deletedAt: serializeForAudit(nonConformity.deletedAt) ?? null,
    };

    nonConformity.softDelete();

    const postMutationState = {
      isDeleted: nonConformity.isDeleted,
      deletedAt: serializeForAudit(nonConformity.deletedAt) ?? null,
    };

    const auditLog = AuditLog.fromMutation({
      actorId,
      action: 'SOFT_DELETE',
      entityName: 'NonConformity',
      entityId: nonConformity.id,
      preMutationState,
      postMutationState,
    });

    await this.nonConformityRepository.save(nonConformity);
    await this.auditLogRepository.save(auditLog);

    return nonConformity;
  }
}
