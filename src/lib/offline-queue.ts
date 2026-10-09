export type OfflineMutation = {
  id: string
  action: 'clock_in' | 'clock_out' | 'start_break' | 'end_break' | 'create_task' | 'request_supply'
  payload: any
  timestamp: number
  status: 'pending' | 'failed'
  error?: string
}

const DB_NAME = 'hoic_offline_db'
const STORE_NAME = 'mutations'

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject('No window')
    const request = indexedDB.open(DB_NAME, 1)
    
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function addMutation(mutation: Omit<OfflineMutation, 'id' | 'timestamp' | 'status'>): Promise<OfflineMutation> {
  const db = await getDB()
  const newMutation: OfflineMutation = {
    ...mutation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    status: 'pending'
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.add(newMutation)
    
    request.onsuccess = () => resolve(newMutation)
    request.onerror = () => reject(request.error)
  })
}

export async function getPendingMutations(): Promise<OfflineMutation[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    
    request.onsuccess = () => {
      const all: OfflineMutation[] = request.result
      resolve(all.filter(m => m.status === 'pending').sort((a, b) => a.timestamp - b.timestamp))
    }
    request.onerror = () => reject(request.error)
  })
}

export async function removeMutation(id: string): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function markMutationFailed(id: string, error: string): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getRequest = store.get(id)
    
    getRequest.onsuccess = () => {
      const data = getRequest.result
      if (data) {
        data.status = 'failed'
        data.error = error
        store.put(data).onsuccess = () => resolve()
      } else {
        resolve()
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}
