/**
 * IndexedDB helper for Sobuj Ghonta (সবুজ ঘণ্টা)
 * Keeps all photos, notes, downloaded audio clips, walk logs,
 * and opt-in user keys strictly on the user's device.
 */

const DB_NAME = 'SobujGhontaDB';
const DB_VERSION = 2;

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

      if (!db.objectStoreNames.contains('secureKeys')) {
        db.createObjectStore('secureKeys', { keyPath: 'provider' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- Nature Journal Operations ---
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

export async function deleteJournalEntry(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('journal', 'readwrite');
    const store = tx.objectStore('journal');
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// --- Offline Audio Cache Operations ---
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

// --- Personal Walk Sessions Operations (RFC 4180 Portability) ---
export async function saveWalkSession(session) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('walkSessions', 'readwrite');
    const store = tx.objectStore('walkSessions');
    const request = store.add({
      ...session,
      savedAt: new Date().toISOString()
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllWalkSessions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('walkSessions', 'readonly');
    const store = tx.objectStore('walkSessions');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteWalkSession(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('walkSessions', 'readwrite');
    const store = tx.objectStore('walkSessions');
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAllWalkSessions(sessions) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('walkSessions', 'readwrite');
    const store = tx.objectStore('walkSessions');
    for (const session of sessions) {
      store.add({
        ...session,
        savedAt: new Date().toISOString()
      });
    }
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllWalkSessions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('walkSessions', 'readwrite');
    const store = tx.objectStore('walkSessions');
    const request = store.clear();
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// --- In-App Keys & Providers Storage (Opt-In IndexedDB) ---
export async function saveInAppKey(provider, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('secureKeys', 'readwrite');
    const store = tx.objectStore('secureKeys');
    const request = store.put({ provider, key, updatedAt: Date.now() });
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function getInAppKey(provider) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('secureKeys', 'readonly');
    const store = tx.objectStore('secureKeys');
    const request = store.get(provider);
    request.onsuccess = () => resolve(request.result?.key || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllInAppKeys() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('secureKeys', 'readonly');
    const store = tx.objectStore('secureKeys');
    const request = store.getAll();
    request.onsuccess = () => {
      const result = {};
      for (const item of (request.result || [])) {
        result[item.provider] = item.key;
      }
      resolve(result);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function removeInAppKey(provider) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('secureKeys', 'readwrite');
    const store = tx.objectStore('secureKeys');
    const request = store.delete(provider);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}
