import { NonConformity } from '../../domain';

export interface INonConformityRepository {
  findById(id: string): Promise<NonConformity | null>;
  save(nonConformity: NonConformity): Promise<NonConformity>;
}
