import CryptoJS from "crypto-js";

const DEFAULT_SECRET = "webvault-secret";

export function encryptData(data, secret = DEFAULT_SECRET) {
  return CryptoJS.AES.encrypt(JSON.stringify(data), secret).toString();
}

export function decryptData(cipher, secret = DEFAULT_SECRET) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, secret);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch {
    return null;
  }
}
