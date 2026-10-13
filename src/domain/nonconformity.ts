export type NonConformityStatus = 'Open' | 'Under_Review' | 'Resolved';

export interface NonConformityData {
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
}

export class NonConformity {
  readonly id: string;
  private _title: string;
  private _incidentDescription: string;
  private _rootCauseAnalysis: string;
  private _status: NonConformityStatus;
  private _ownerId: string;
  private _vesselName?: string;
  private _voyageReference?: string;
  private _incidentLocation?: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt?: Date;
  private _isDeleted: boolean;
  private _version: number;

  constructor(data: NonConformityData) {
    this.id = this.requireNonEmpty(data.id, 'id');
    this._title = this.requireNonEmpty(data.title, 'title');
    this._incidentDescription = this.requireNonEmpty(
      data.incidentDescription,
      'incidentDescription'
    );
    this._rootCauseAnalysis = data.rootCauseAnalysis ?? '';
    this._status = this.assertValidStatus(data.status ?? 'Open');
    this._ownerId = this.requireNonEmpty(data.ownerId, 'ownerId');
    this._vesselName = data.vesselName?.trim() || undefined;
    this._voyageReference = data.voyageReference?.trim() || undefined;
    this._incidentLocation = data.incidentLocation?.trim() || undefined;
    this._createdAt = data.createdAt ?? new Date();
    this._updatedAt = data.updatedAt ?? this._createdAt;
    this._deletedAt = data.deletedAt;
    this._isDeleted = data.isDeleted ?? false;
    this._version = data.version ?? 1;

    if (this._version < 1) {
      throw new Error('version must be at least 1.');
    }
  }

  static create(
    data: Omit<NonConformityData, 'createdAt' | 'updatedAt' | 'version'>
  ): NonConformity {
    return new NonConformity({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });
  }

  get title(): string {
    return this._title;
  }

  get incidentDescription(): string {
    return this._incidentDescription;
  }

  get rootCauseAnalysis(): string {
    return this._rootCauseAnalysis;
  }

  get status(): NonConformityStatus {
    return this._status;
  }

  get ownerId(): string {
    return this._ownerId;
  }

  get vesselName(): string | undefined {
    return this._vesselName;
  }

  get voyageReference(): string | undefined {
    return this._voyageReference;
  }

  get incidentLocation(): string | undefined {
    return this._incidentLocation;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get deletedAt(): Date | undefined {
    return this._deletedAt;
  }

  get isDeleted(): boolean {
    return this._isDeleted;
  }

  get version(): number {
    return this._version;
  }

  setTitle(title: string): void {
    this._title = this.requireNonEmpty(title, 'title');
    this.bumpVersion();
  }

  setIncidentDescription(description: string): void {
    this._incidentDescription = this.requireNonEmpty(description, 'incidentDescription');
    this.bumpVersion();
  }

  setRootCauseAnalysis(rootCauseAnalysis: string): void {
    this._rootCauseAnalysis = rootCauseAnalysis.trim();
    this.bumpVersion();
  }

  setOwnerId(ownerId: string): void {
    this._ownerId = this.requireNonEmpty(ownerId, 'ownerId');
    this.bumpVersion();
  }

  updateMaritimeContext(
    vesselName?: string,
    voyageReference?: string,
    incidentLocation?: string
  ): void {
    this._vesselName = vesselName?.trim() || undefined;
    this._voyageReference = voyageReference?.trim() || undefined;
    this._incidentLocation = incidentLocation?.trim() || undefined;
    this.bumpVersion();
  }

  open(): void {
    this.transitionTo('Open');
  }

  startReview(): void {
    this.transitionTo('Under_Review');
  }

  resolve(): void {
    this.transitionTo('Resolved');
  }

  softDelete(): void {
    if (this._isDeleted) {
      return;
    }

    this._isDeleted = true;
    this._deletedAt = new Date();
    this.bumpVersion();
  }

  restore(): void {
    this._isDeleted = false;
    this._deletedAt = undefined;
    this.bumpVersion();
  }

  isTransitionAllowed(from: NonConformityStatus, to: NonConformityStatus): boolean {
    const allowedTransitions: Record<NonConformityStatus, NonConformityStatus[]> = {
      Open: ['Open', 'Under_Review', 'Resolved'],
      Under_Review: ['Under_Review', 'Resolved'],
      Resolved: ['Resolved', 'Open'],
    };

    return allowedTransitions[from]?.includes(to) ?? false;
  }

  toSnapshot(): NonConformityData {
    return {
      id: this.id,
      title: this.title,
      incidentDescription: this.incidentDescription,
      rootCauseAnalysis: this.rootCauseAnalysis,
      status: this.status,
      ownerId: this.ownerId,
      vesselName: this.vesselName,
      voyageReference: this.voyageReference,
      incidentLocation: this.incidentLocation,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      isDeleted: this.isDeleted,
      version: this.version,
    };
  }

  private transitionTo(nextStatus: NonConformityStatus): void {
    const currentStatus = this._status;
    if (!this.isTransitionAllowed(currentStatus, nextStatus)) {
      throw new Error(
        `Invalid state transition: cannot move from ${currentStatus} to ${nextStatus}.`
      );
    }

    this._status = nextStatus;
    this.bumpVersion();
  }

  private bumpVersion(): void {
    this._version += 1;
    this._updatedAt = new Date();
  }

  private assertValidStatus(status: NonConformityStatus): NonConformityStatus {
    const validStatuses: NonConformityStatus[] = ['Open', 'Under_Review', 'Resolved'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid non-conformity status: ${status}`);
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
