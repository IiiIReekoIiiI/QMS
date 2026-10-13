export type AuditLogAction = 'CREATE' | 'UPDATE' | 'APPROVE' | 'SOFT_DELETE' | 'PURGE';

export interface ChangesPayload {
  preMutationState: Record<string, unknown>;
  postMutationState: Record<string, unknown>;
}

export interface AuditLogData {
  id: string;
  actorId: string;
  timestamp: Date;
  action: AuditLogAction;
  entityName: string;
  entityId: string;
  changes: ChangesPayload;
}

export class AuditLog {
  readonly id: string;
  private _actorId: string;
  private _timestamp: Date;
  private _action: AuditLogAction;
  private _entityName: string;
  private _entityId: string;
  private _changes: ChangesPayload;

  constructor(data: AuditLogData) {
    this.id = this.requireNonEmpty(data.id, 'id');
    this._actorId = this.requireNonEmpty(data.actorId, 'actorId');
    this._timestamp = data.timestamp ?? new Date();
    this._action = this.assertValidAction(data.action);
    this._entityName = this.requireNonEmpty(data.entityName, 'entityName');
    this._entityId = this.requireNonEmpty(data.entityId, 'entityId');
    this._changes = this.assertValidChanges(data.changes);
  }

  static create(data: Omit<AuditLogData, 'timestamp'> & { timestamp?: Date }): AuditLog {
    return new AuditLog({
      ...data,
      timestamp: data.timestamp ?? new Date(),
    });
  }

  static fromMutation(params: {
    actorId: string;
    action: AuditLogAction;
    entityName: string;
    entityId: string;
    preMutationState: Record<string, unknown>;
    postMutationState: Record<string, unknown>;
    timestamp?: Date;
  }): AuditLog {
    return new AuditLog({
      id: generateUuid(),
      actorId: params.actorId,
      timestamp: params.timestamp ?? new Date(),
      action: params.action,
      entityName: params.entityName,
      entityId: params.entityId,
      changes: {
        preMutationState: params.preMutationState,
        postMutationState: params.postMutationState,
      },
    });
  }

  get actorId(): string {
    return this._actorId;
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  get action(): AuditLogAction {
    return this._action;
  }

  get entityName(): string {
    return this._entityName;
  }

  get entityId(): string {
    return this._entityId;
  }

  get changes(): ChangesPayload {
    return {
      preMutationState: { ...this._changes.preMutationState },
      postMutationState: { ...this._changes.postMutationState },
    };
  }

  toPersistenceRecord(): AuditLogData {
    return {
      id: this.id,
      actorId: this.actorId,
      timestamp: this.timestamp,
      action: this.action,
      entityName: this.entityName,
      entityId: this.entityId,
      changes: this.changes,
    };
  }

  private assertValidAction(action: AuditLogAction): AuditLogAction {
    const validActions: AuditLogAction[] = ['CREATE', 'UPDATE', 'APPROVE', 'SOFT_DELETE', 'PURGE'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid audit action: ${action}`);
    }
    return action;
  }

  private assertValidChanges(changes: ChangesPayload): ChangesPayload {
    if (!changes || typeof changes !== 'object') {
      throw new Error('Audit log changes are required.');
    }

    if (
      !('preMutationState' in changes) ||
      !('postMutationState' in changes) ||
      typeof changes.preMutationState !== 'object' ||
      typeof changes.postMutationState !== 'object'
    ) {
      throw new Error(
        'Audit log changes must include preMutationState and postMutationState object payloads.'
      );
    }

    return {
      preMutationState: { ...changes.preMutationState },
      postMutationState: { ...changes.postMutationState },
    };
  }

  private requireNonEmpty(value: string | undefined, fieldName: string): string {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new Error(`${fieldName} is required and cannot be empty.`);
    }
    return trimmed;
  }
}

function generateUuid(): string {
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return template.replace(/[xy]/g, (character) => {
    const random = Math.random() * 16 | 0;
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
