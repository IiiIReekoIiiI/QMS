export type CorrectiveActionStatus = 'Planned' | 'In_Progress' | 'Completed';

export interface CorrectiveActionData {
  id: string;
  nonconformityId: string;
  title: string;
  description: string;
  ownerId: string;
  dueDate?: Date;
  status?: CorrectiveActionStatus;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
}

export class CorrectiveAction {
  readonly id: string;
  private _nonconformityId: string;
  private _title: string;
  private _description: string;
  private _ownerId: string;
  private _dueDate?: Date;
  private _status: CorrectiveActionStatus;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _isDeleted: boolean;

  constructor(data: CorrectiveActionData) {
    this.id = this.requireNonEmpty(data.id, 'id');
    this._nonconformityId = this.requireNonEmpty(data.nonconformityId, 'nonconformityId');
    this._title = this.requireNonEmpty(data.title, 'title');
    this._description = this.requireNonEmpty(data.description, 'description');
    this._ownerId = this.requireNonEmpty(data.ownerId, 'ownerId');
    this._dueDate = data.dueDate;
    this._status = this.assertValidStatus(data.status ?? 'Planned');
    this._createdAt = data.createdAt ?? new Date();
    this._updatedAt = data.updatedAt ?? this._createdAt;
    this._isDeleted = data.isDeleted ?? false;
  }

  static create(
    data: Omit<CorrectiveActionData, 'createdAt' | 'updatedAt'>
  ): CorrectiveAction {
    return new CorrectiveAction({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  get nonconformityId(): string {
    return this._nonconformityId;
  }

  get title(): string {
    return this._title;
  }

  get description(): string {
    return this._description;
  }

  get ownerId(): string {
    return this._ownerId;
  }

  get dueDate(): Date | undefined {
    return this._dueDate;
  }

  get status(): CorrectiveActionStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get isDeleted(): boolean {
    return this._isDeleted;
  }

  setTitle(title: string): void {
    this._title = this.requireNonEmpty(title, 'title');
    this.bumpUpdatedAt();
  }

  setDescription(description: string): void {
    this._description = this.requireNonEmpty(description, 'description');
    this.bumpUpdatedAt();
  }

  setOwnerId(ownerId: string): void {
    this._ownerId = this.requireNonEmpty(ownerId, 'ownerId');
    this.bumpUpdatedAt();
  }

  setDueDate(dueDate: Date | undefined): void {
    this._dueDate = dueDate;
    this.bumpUpdatedAt();
  }

  plan(): void {
    this.transitionTo('Planned');
  }

  start(): void {
    this.transitionTo('In_Progress');
  }

  complete(): void {
    this.transitionTo('Completed');
  }

  softDelete(): void {
    this._isDeleted = true;
    this.bumpUpdatedAt();
  }

  restore(): void {
    this._isDeleted = false;
    this.bumpUpdatedAt();
  }

  isTransitionAllowed(from: CorrectiveActionStatus, to: CorrectiveActionStatus): boolean {
    const allowedTransitions: Record<CorrectiveActionStatus, CorrectiveActionStatus[]> = {
      Planned: ['Planned', 'In_Progress', 'Completed'],
      In_Progress: ['In_Progress', 'Completed'],
      Completed: ['Completed'],
    };

    return allowedTransitions[from]?.includes(to) ?? false;
  }

  toSnapshot(): CorrectiveActionData {
    return {
      id: this.id,
      nonconformityId: this.nonconformityId,
      title: this.title,
      description: this.description,
      ownerId: this.ownerId,
      dueDate: this.dueDate,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isDeleted: this.isDeleted,
    };
  }

  private transitionTo(nextStatus: CorrectiveActionStatus): void {
    const currentStatus = this._status;
    if (!this.isTransitionAllowed(currentStatus, nextStatus)) {
      throw new Error(
        `Invalid status transition: cannot move from ${currentStatus} to ${nextStatus}.`
      );
    }

    this._status = nextStatus;
    this.bumpUpdatedAt();
  }

  private bumpUpdatedAt(): void {
    this._updatedAt = new Date();
  }

  private assertValidStatus(status: CorrectiveActionStatus): CorrectiveActionStatus {
    const validStatuses: CorrectiveActionStatus[] = ['Planned', 'In_Progress', 'Completed'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid corrective action status: ${status}`);
    }
    return status;
  }

  private requireNonEmpty(value: string | undefined, fieldName: string): string {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new Error(`${fieldName} is required and cannot be empty.`);
    }
    return trimmed;
  }
}
