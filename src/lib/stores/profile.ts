import { writable } from 'svelte/store';
import type { StoredUser } from './auth';

export type Profile = {
  userId: number;
  bio: string;
  avatarUrl: string | null;
};

function loadProfiles(): Profile[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('profiles') ?? '[]') as Profile[];
  } catch {
    return [];
  }
}

function saveProfiles(profiles: Profile[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('profiles', JSON.stringify(profiles));
}

function createProfileStore() {
  const { subscribe, update } = writable<Profile[]>(loadProfiles());

  function getProfileForUser(user: StoredUser): Profile {
    const profiles = loadProfiles();
    let profile = profiles.find((p) => p.userId === user.id);

    if (!profile) {
      profile = {
        userId: user.id,
        bio: '',
        avatarUrl: null
      };
      profiles.push(profile);
      saveProfiles(profiles);
      update(() => profiles);
    }

    return profile;
  }

  function updateProfile(userId: number, data: Partial<Profile>) {
    const profiles = loadProfiles();
    const idx = profiles.findIndex((p) => p.userId === userId);

    if (idx === -1) {
      throw new Error('Profil wurde nicht gefunden.');
    }

    profiles[idx] = { ...profiles[idx], ...data };
    saveProfiles(profiles);
    update(() => profiles);
    return profiles[idx];
  }

  return {
    subscribe,
    getProfileForUser,
    updateProfile
  };
}

export const profileStore = createProfileStore();
