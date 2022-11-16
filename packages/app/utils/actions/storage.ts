import { IDBPDatabase, openDB } from 'idb';

import { appId } from '../settings.js';
import { ActionCreator } from './index.js';

let dbPromise: Promise<IDBPDatabase>;

export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(`appsemble-${appId}`, 1, {
      upgrade(d) {
        d.createObjectStore('storage');
      },
    });
  }

  return dbPromise;
}

export async function readStorage(storageType: string, key: string): Promise<Object> {
  const storage = storageType || 'indexedDB';
  switch (true) {
    case storage !== 'indexedDB': {
      const store = storage === 'localStorage' ? localStorage : sessionStorage;
      const value = store.getItem(`appsemble-${appId}-${key}`);
      return JSON.parse(value);
    }
    default: {
      const db = await getDB();
      return db.get('storage', key);
    }
  }
}

export function writeStorage(storage: string, key: string, value: any): void {
  async function write(): Promise<void> {
    switch (storage) {
      case 'localStorage':
        localStorage.setItem(`appsemble-${appId}-${key}`, JSON.stringify(value));
        break;
      case 'sessionStorage':
        sessionStorage.setItem(`appsemble-${appId}-${key}`, JSON.stringify(value));
        break;
      default: {
        const db = await getDB();
        await db.put('storage', value, key);
      }
    }
  }
  write();
}

export function removeStorage(storage: string, key: string): void {
  async function remove(): Promise<void> {
    switch (storage) {
      case 'localStorage':
        localStorage.removeItem(`appsemble-${appId}-${key}`);
        break;
      case 'sessionStorage':
        sessionStorage.removeItem(`appsemble-${appId}-${key}`);
        break;
      default: {
        const db = await getDB();
        await db.delete('storage', key);
      }
    }
  }
  remove();
}

export const read: ActionCreator<'storage.read'> = ({ definition, remap }) => [
  async (data) => {
    const key = remap(definition.key, data);
    if (!key) {
      return;
    }

    const result = await readStorage(definition.storage, key);
    return result;
  },
];

export const write: ActionCreator<'storage.write'> = ({ definition, remap }) => [
  (data) => {
    const key = remap(definition.key, data);
    if (!key) {
      return data;
    }

    const value = remap(definition.value, data);

    writeStorage(definition.storage, key, value);
    return data;
  },
];

export const remove: ActionCreator<'storage.remove'> = ({ definition, remap }) => [
  (data) => {
    const key = remap(definition.key, data);
    if (!key) {
      return data;
    }

    removeStorage(definition.storage, key);
    return true;
  },
];

export const append: ActionCreator<'storage.append'> = ({ definition, remap }) => [
  async (data) => {
    const key = remap(definition.key, data);
    if (!key) {
      return data;
    }

    const { storage } = definition;

    let storageData: Object | Object[] = await readStorage(storage, key);

    if (storageData == null) {
      throw new Error('Could not find any data to append onto!');
    }

    const value = remap(definition.value, data);

    if (Array.isArray(storageData)) {
      storageData.push(value);
    } else {
      const storageArray: Object[] = [];
      storageArray.push(storageData, value);
      storageData = storageArray;
    }

    writeStorage(storage, key, storageData);
    return data;
  },
];

export const subtract: ActionCreator<'storage.subtract'> = ({ definition, remap }) => [
  async (data) => {
    const key = remap(definition.key, data);
    if (!key) {
      return data;
    }

    const { storage } = definition;

    let storageData: Object | Object[] = await readStorage(storage, key);

    if (storageData == null) {
      throw new Error('Could not find any data to subtract from!');
    }

    if (Array.isArray(storageData)) {
      storageData.pop();
      if (storageData.length <= 1) {
        const [storageObject] = storageData;
        storageData = storageObject;
      }
    } else {
      storageData = null;
    }

    if (storageData == null) {
      removeStorage(storage, key);
    } else {
      writeStorage(storage, key, storageData);
    }

    return data;
  },
];

export const update: ActionCreator<'storage.update'> = ({ definition, remap }) => [
  async (data) => {
    const key = remap(definition.key, data);
    const item = remap(definition.item, data);
    const value = remap(definition.value, data);
    if (!key || !value) {
      return data;
    }

    const { storage } = definition;

    let storageData: Object | Object[] = await readStorage(storage, key);

    if (storageData == null) {
      throw new Error('Could not find any data to update!');
    }

    if (Array.isArray(storageData)) {
      storageData[item as number] = value;
    } else {
      storageData = value;
    }

    writeStorage(storage, key, storageData);
    return data;
  },
];
