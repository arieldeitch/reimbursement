import { create } from 'zustand';

import { getTripRepository } from '@/repositories/tripRepository';
import type { TripStatus, WorkTrip } from '@/types/trip';

export interface AddTripInput {
  name: string;
  destination: string;
  client?: string;
  startDate: string;
  endDate: string;
  notes?: string;
  status: TripStatus;
}

interface TripState {
  trips: WorkTrip[];
  isLoading: boolean;
  loadTrips: () => Promise<void>;
  addTrip: (input: AddTripInput) => Promise<WorkTrip>;
  getTripById: (id: string) => Promise<WorkTrip | null>;
  updateTrip: (trip: WorkTrip) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
}

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  isLoading: false,

  loadTrips: async () => {
    set({ isLoading: true });
    try {
      const trips = await getTripRepository().list();
      set({ trips, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  addTrip: async (input) => {
    const trip = await getTripRepository().create({
      ...input,
      deletedAt: null,
    });
    set((state) => ({ trips: [trip, ...state.trips] }));
    return trip;
  },

  getTripById: async (id) => {
    const cached = get().trips.find((t) => t.id === id) ?? null;
    if (cached) return cached;
    return getTripRepository().getById(id);
  },

  updateTrip: async (trip) => {
    const updated = await getTripRepository().update(trip);
    set((state) => ({
      trips: state.trips.map((t) => (t.id === updated.id ? updated : t)),
    }));
  },

  deleteTrip: async (id) => {
    await getTripRepository().softDelete(id);
    set((state) => ({
      trips: state.trips.filter((t) => t.id !== id),
    }));
  },
}));
