import { encryptData, decryptData } from "./encrypt.js";

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
    this.secret = secret;
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

  set(key, value, ttl = null) {
    const data = { value, expiry: ttl ? Date.now() + ttl : null };
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
    } catch {
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
    Object.keys(this.storage)
      .filter((k) => k.startsWith(this.namespace + ":"))
      .forEach((k) => this.storage.removeItem(k));
  }
}
