import { encryptData, decryptData, DEFAULT_SECRET } from "./encrypt.js";

let nodeStorageInstance = null;

async function getNodeStorage() {
  if (!nodeStorageInstance) {
    const { LocalStorage } = await import("node-localstorage");
    nodeStorageInstance = new LocalStorage("./node_storage");
  }
  return nodeStorageInstance;
}

export default class WebVault {
  constructor(namespace, storageInstance, secret) {
    this.namespace = namespace;
    this.secret = secret || DEFAULT_SECRET;
    this.storage = storageInstance;
  }

  static async create(namespace = "app", useSession = false, secret = null) {
    let storageInstance;
    if (typeof window !== "undefined") {
      // Browser
      storageInstance = useSession ? sessionStorage : localStorage;
    } else {
      // Node
      storageInstance = await getNodeStorage();
    }
    return new WebVault(namespace, storageInstance, secret);
  }

  _getKey(key) {
    return `${this.namespace}:${key}`;
  }

  set(key, value, ttl = null, ttlUnit = "ms") {
    let expiry = null;
    if (ttl) {
      expiry = ttlUnit === "s" ? Date.now() + ttl * 1000 : Date.now() + ttl;
    }
    const data = { value, expiry };
    const toStore = this.secret
      ? encryptData(data, this.secret)
      : JSON.stringify(data);
    this.storage.setItem(this._getKey(key), toStore);
  }

  get(key) {
    const raw = this.storage.getItem(this._getKey(key));
    if (!raw) return null;

    let data;
    try {
      data = this.secret ? decryptData(raw, this.secret) : JSON.parse(raw);
      if (!data) throw new Error("Failed to parse/decrypt");
    } catch {
      console.warn(`[WebVault] Failed to decrypt or parse data for key: ${key}`);
      return null;
    }

    if (data.expiry && Date.now() > data.expiry) {
      this.remove(key);
      return null;
    }

    return data.value;
  }

  remove(key) {
    this.storage.removeItem(this._getKey(key));
  }

  clear() {
    let keys;
    if (typeof window !== "undefined") {
      keys = Object.keys(this.storage);
    } else {
      keys = this.storage._keys || [];
    }
    keys
      .filter((k) => k.startsWith(this.namespace + ":"))
      .forEach((k) => this.storage.removeItem(k));
  }
}
