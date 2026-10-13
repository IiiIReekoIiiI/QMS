import { NonConformity, NonConformityData } from '../../domain';
import { INonConformityRepository } from '../../application/ports';
import { PostgresQueryable } from './postgres-types';

interface NonConformityRow {
  id: string;
  title: string;
  incident_description: string;
  root_cause_analysis: string | null;
  status: NonConformityData['status'];
  owner_id: string;
  vessel_name: string | null;
  voyage_reference: string | null;
  incident_location: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
  is_deleted: boolean;
  version: number;
}

export class PostgresNonConformityRepository
  implements INonConformityRepository
{
  private readonly originalVersions = new Map<string, number>();

  constructor(private readonly connection: PostgresQueryable) {}

  async findById(id: string): Promise<NonConformity | null> {
    const result = await this.connection.query<NonConformityRow>(
      `SELECT id, title, incident_description, root_cause_analysis, status,
              owner_id, vessel_name, voyage_reference, incident_location,
              created_at, updated_at, deleted_at, is_deleted, version
       FROM non_conformities
       WHERE id = $1 AND is_deleted = false`,
      [id]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    this.originalVersions.set(row.id, row.version);
    return new NonConformity({
      id: row.id,
      title: row.title,
      incidentDescription: row.incident_description,
      rootCauseAnalysis: row.root_cause_analysis ?? '',
      status: row.status,
      ownerId: row.owner_id,
      vesselName: row.vessel_name ?? undefined,
      voyageReference: row.voyage_reference ?? undefined,
      incidentLocation: row.incident_location ?? undefined,
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
      deletedAt: row.deleted_at ? toDate(row.deleted_at) : undefined,
      isDeleted: row.is_deleted,
      version: row.version,
    });
  }

  async save(nonConformity: NonConformity): Promise<NonConformity> {
    const snapshot = nonConformity.toSnapshot();

    const expectedVersion = this.originalVersions.get(nonConformity.id);
    if (expectedVersion !== undefined) {
      const result = await this.connection.query(
        `UPDATE non_conformities
         SET title = $2,
             incident_description = $3,
             root_cause_analysis = $4,
             status = $5,
             owner_id = $6,
             vessel_name = $7,
             voyage_reference = $8,
             incident_location = $9,
             updated_at = $10,
             deleted_at = $11,
             is_deleted = $12,
             version = $13
         WHERE id = $1 AND version = $14 AND is_deleted = false`,
        [
          snapshot.id,
          snapshot.title,
          snapshot.incidentDescription,
          snapshot.rootCauseAnalysis ?? '',
          snapshot.status,
          snapshot.ownerId,
          snapshot.vesselName ?? null,
          snapshot.voyageReference ?? null,
          snapshot.incidentLocation ?? null,
          snapshot.updatedAt,
          snapshot.deletedAt ?? null,
          snapshot.isDeleted ?? false,
          snapshot.version,
          expectedVersion,
        ]
      );

      if (result.rowCount !== 1) {
        throw new Error('NonConformity version conflict during persistence.');
      }

      this.originalVersions.set(snapshot.id, snapshot.version ?? 1);
      return nonConformity;
    }

    await this.connection.query(
      `INSERT INTO non_conformities (
         id, title, incident_description, root_cause_analysis, status,
         owner_id, vessel_name, voyage_reference, incident_location,
         created_at, updated_at, deleted_at, is_deleted, version
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        snapshot.id,
        snapshot.title,
        snapshot.incidentDescription,
        snapshot.rootCauseAnalysis ?? '',
        snapshot.status,
        snapshot.ownerId,
        snapshot.vesselName ?? null,
        snapshot.voyageReference ?? null,
        snapshot.incidentLocation ?? null,
        snapshot.createdAt,
        snapshot.updatedAt,
        snapshot.deletedAt ?? null,
        snapshot.isDeleted ?? false,
        snapshot.version,
      ]
    );

    this.originalVersions.set(snapshot.id, snapshot.version ?? 1);
    return nonConformity;
  }
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
