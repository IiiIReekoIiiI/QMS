import { AuditLog } from '../../domain';
import { IAuditLogRepository } from '../../application/ports';
import { PostgresQueryable } from './postgres-types';

export class PostgresAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly connection: PostgresQueryable) {}

  async save(auditLog: AuditLog): Promise<AuditLog> {
    const record = auditLog.toPersistenceRecord();
    const changes = auditLog.changes;

    await this.connection.query(
      `INSERT INTO audit_logs (
         id, actor_id, timestamp, action, entity_name, entity_id, changes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        record.id,
        record.actorId,
        record.timestamp,
        record.action,
        record.entityName,
        record.entityId,
        JSON.stringify({
          pre_mutation_state: changes.preMutationState,
          post_mutation_state: changes.postMutationState,
        }),
      ]
    );

    return auditLog;
  }
}
