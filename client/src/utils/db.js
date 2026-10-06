/**
 * IndexedDB helper for Sobuj Ghonta
 * Keeps all photos, notes, and downloaded audio clips strictly on the user's device.
 */

const DB_NAME = 'SobujGhontaDB';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('journal')) {
        db.createObjectStore('journal', { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains('audioClips')) {
        db.createObjectStore('audioClips', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('walkSessions')) {
        db.createObjectStore('walkSessions', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Nature Journal Operations
export async function saveJournalEntry(entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('journal', 'readwrite');
    const store = tx.objectStore('journal');
    const request = store.add({
      ...entry,
      createdAt: new Date().toISOString()
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllJournalEntries() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('journal', 'readonly');
    const store = tx.objectStore('journal');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.reverse());
    request.onerror = () => reject(request.error);
  });
}

// Offline Audio Cache Operations
export async function cacheAudioBlob(key, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audioClips', 'readwrite');
    const store = tx.objectStore('audioClips');
    const request = store.put({ key, blob, cachedAt: Date.now() });
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedAudioBlob(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audioClips', 'readonly');
    const store = tx.objectStore('audioClips');
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.blob || null);
    request.onerror = () => reject(request.error);
  });
}

export async function clearAudioCache() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audioClips', 'readwrite');
    const store = tx.objectStore('audioClips');
    const request = store.clear();
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}
