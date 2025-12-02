import { writable } from 'svelte/store';

export type BucketItem = {
  id: number;
  title: string;        // z.B. "Japan besuchen"
  category: string;     // z.B. "Städtetrip", "Strand", "Natur"
  targetYear: number | null; // geplantes Jahr oder null
  done: boolean;        // schon erledigt?
};

function loadBucket(): BucketItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('bucketlist') ?? '[]') as BucketItem[];
  } catch {
    return [];
  }
}

function saveBucket(items: BucketItem[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('bucketlist', JSON.stringify(items));
}

function createBucketStore() {
  const { subscribe, set, update } = writable<BucketItem[]>(loadBucket());

  function addItem(data: { title: string; category?: string; targetYear?: number | null }) {
    const items = loadBucket();
    const item: BucketItem = {
      id: Date.now(),
      title: data.title,
      category: data.category ?? 'Allgemein',
      targetYear: data.targetYear ?? null,
      done: false
    };
    items.push(item);
    saveBucket(items);
    set(items);
    return item;
  }

  function toggleDone(id: number) {
    const items = loadBucket();
    const idx = items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      items[idx].done = !items[idx].done;
      saveBucket(items);
      set(items);
    }
  }

  function removeItem(id: number) {
    let items = loadBucket();
    items = items.filter((i) => i.id !== id);
    saveBucket(items);
    set(items);
  }

  function clearAll() {
    saveBucket([]);
    set([]);
  }

  return {
    subscribe,
    addItem,
    toggleDone,
    removeItem,
    clearAll
  };
}

export const bucketStore = createBucketStore();
