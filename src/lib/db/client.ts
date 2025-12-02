// Minimal metaStore implementation used by profile store.
// Uses localStorage in the browser, otherwise an in-memory map for SSR/tests.
type StoredValue = string;

class InMemoryStore {
	private map = new Map<string, StoredValue>();
	async getItem<T>(k: string): Promise<T | null> { const v = this.map.get(k); return v ? JSON.parse(v) as T : null; }
	async setItem<T>(k: string, v: T): Promise<void> { this.map.set(k, JSON.stringify(v)); }
}

const isLocalStorageAvailable = typeof localStorage !== 'undefined';

export const metaStore = isLocalStorageAvailable ? {
	async getItem<T>(k: string): Promise<T | null> { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : null; },
	async setItem<T>(k: string, v: T): Promise<void> { localStorage.setItem(k, JSON.stringify(v)); }
} : new InMemoryStore();

export default metaStore;
