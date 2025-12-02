import { writable } from 'svelte/store';

export type StoredUser = {
  id: number;
  email: string;
  password: string;
  name: string;
  birthDate: string;
  verified: boolean;
};

type AuthState = {
  user: StoredUser | null;
};

function loadUsers(): StoredUser[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('users') ?? '[]') as StoredUser[];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('users', JSON.stringify(users));
}

function loadCurrentUser(): StoredUser | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return JSON.parse(
      localStorage.getItem('currentUser') ?? 'null'
    ) as StoredUser | null;
  } catch {
    return null;
  }
}

function saveCurrentUser(user: StoredUser | null) {
  if (typeof localStorage === 'undefined') return;
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
}

function createAuthStore() {
  const initial: AuthState = { user: loadCurrentUser() };
  const { subscribe, set } = writable<AuthState>(initial);

  function login(email: string, password: string): StoredUser {
    const users = loadUsers();
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!found) {
      throw new Error('Für diese E-Mail existiert kein Konto.');
    }

    if (!found.verified) {
      throw new Error('Bitte bestätige zuerst deine E-Mail-Adresse.');
    }

    if (found.password !== password) {
      throw new Error('Das Passwort ist falsch.');
    }

    set({ user: found });
    saveCurrentUser(found);
    return found;
  }

  function logout() {
    set({ user: null });
    saveCurrentUser(null);
  }

  function register(args: {
    firstName: string;
    lastName: string;
    birthDate: string;
    email: string;
    password: string;
  }): { verificationLink: string } {
    const { firstName, lastName, birthDate, email, password } = args;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Bitte gib eine gültige E-Mail-Adresse ein.');
    }

    const users = loadUsers();
    if (
      users.some((u) => u.email.toLowerCase() === email.toLowerCase())
    ) {
      throw new Error('Für diese E-Mail-Adresse existiert bereits ein Konto.');
    }

    const newUser: StoredUser = {
      id: Date.now(),
      email,
      password,
      name: `${firstName} ${lastName}`,
      birthDate,
      verified: false
    };

    users.push(newUser);
    saveUsers(users);

    const verificationLink = `http://localhost:5173/auth/verify?email=${encodeURIComponent(
      email
    )}`;

    return { verificationLink };
  }

  function verify(email: string): StoredUser {
    const users = loadUsers();
    const idx = users.findIndex(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (idx === -1) {
      throw new Error('Benutzer für diese E-Mail wurde nicht gefunden.');
    }

    users[idx].verified = true;
    saveUsers(users);

    set({ user: users[idx] });
    saveCurrentUser(users[idx]);
    return users[idx];
  }

  return {
    subscribe,
    login,
    logout,
    register,
    verify
  };
}

export const auth = createAuthStore();
