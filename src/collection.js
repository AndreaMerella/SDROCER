// Collection — persists to localStorage, structured for future Supabase migration

const KEY = 'sdrocer_collection_v2';

export function getCollection() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function addRecord(track) {
  const collection = getCollection();
  const record = {
    id: Date.now(),
    addedAt: new Date().toISOString(),
    status: 'heard',   // 'owned' | 'want' | 'heard'
    notes: '',
    ...track
  };
  collection.unshift(record); // newest first
  save(collection);
  return record;
}

export function updateStatus(id, status) {
  const collection = getCollection();
  const record = collection.find(r => r.id === id);
  if (record) {
    record.status = status;
    save(collection);
  }
}

export function updateNotes(id, notes) {
  const collection = getCollection();
  const record = collection.find(r => r.id === id);
  if (record) {
    record.notes = notes;
    save(collection);
  }
}

export function removeRecord(id) {
  const collection = getCollection().filter(r => r.id !== id);
  save(collection);
}

export function clearCollection() {
  localStorage.removeItem(KEY);
}

export function filterCollection({ status, query } = {}) {
  let records = getCollection();
  if (status && status !== 'all') {
    records = records.filter(r => r.status === status);
  }
  if (query) {
    const q = query.toLowerCase();
    records = records.filter(r =>
      r.title?.toLowerCase().includes(q) ||
      r.artist?.toLowerCase().includes(q) ||
      r.label?.toLowerCase().includes(q)
    );
  }
  return records;
}

function save(collection) {
  localStorage.setItem(KEY, JSON.stringify(collection));
}
