import { AuditLog } from '../../domain';

export interface IAuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}
