import type { Entity } from './entity';

export type TripStatus = 'open' | 'closed';

export interface WorkTrip extends Entity {
  name: string;
  destination: string;
  /** The client or project this trip is associated with. */
  client?: string;
  startDate: string;
  endDate: string;
  notes?: string;
  status: TripStatus;
  deletedAt: string | null;
}
