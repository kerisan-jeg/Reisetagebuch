import { writable } from 'svelte/store';

export type Trip = {
  id: number;
  userId: number;
  title: string;
  country: string;
  year: number;
  withWhom: string;
  coverImage: string | null;
  description: string;
  photos: string[];
  locations: { lat: number; lng: number }[];
};

function loadTrips(): Trip[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('trips') ?? '[]') as Trip[];
  } catch {
    return [];
  }
}

function saveTrips(trips: Trip[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('trips', JSON.stringify(trips));
}

function createTripsStore() {
  const { subscribe, update } = writable<Trip[]>(loadTrips());

  function createTrip(
    userId: number,
    data: {
      title: string;
      country: string;
      year: number;
      withWhom: string;
      description: string;
      coverImage?: string | null;
    }
  ): Trip {
    const trips = loadTrips();

    const newTrip: Trip = {
      id: Date.now(),
      userId,
      title: data.title,
      country: data.country,
      year: data.year,
      withWhom: data.withWhom,
      description: data.description,
      coverImage: data.coverImage ?? null,
      photos: [],
      locations: []
    };

    trips.push(newTrip);
    saveTrips(trips);
    update(() => trips);

    return newTrip;
  }

  function getTripsForUser(userId: number): Trip[] {
    return loadTrips().filter((t) => t.userId === userId);
  }

  function getTrip(id: number): Trip | undefined {
    return loadTrips().find((t) => t.id === id);
  }

  function addPhoto(tripId: number, base64Img: string) {
    const trips = loadTrips();
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) throw new Error('Reise nicht gefunden.');

    trip.photos.push(base64Img);
    saveTrips(trips);
    update(() => trips);
  }

  function addLocation(tripId: number, lat: number, lng: number) {
    const trips = loadTrips();
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) throw new Error('Reise nicht gefunden.');

    trip.locations.push({ lat, lng });
    saveTrips(trips);
    update(() => trips);
  }

  function deleteTrip(tripId: number) {
    let trips = loadTrips();
    trips = trips.filter((t) => t.id !== tripId);
    saveTrips(trips);
    update(() => trips);
  }

  return {
    subscribe,
    createTrip,
    getTripsForUser,
    getTrip,
    addPhoto,
    addLocation,
    deleteTrip
  };
}

export const tripsStore = createTripsStore();
