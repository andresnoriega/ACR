import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(
  bytes: number,
  options: {
    decimals?: number
    sizeType?: "accurate" | "normal"
  } = {}
) {
  if (bytes === 0) return '0 Bytes';
  const { decimals = 2, sizeType = "normal" } = options;
  const k = sizeType === "accurate" ? 1024 : 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


/**
 * Recursively sanitizes an object for Firestore by converting `undefined` values to `null`.
 * Firestore does not support `undefined` field values.
 * @param obj The object to sanitize.
 * @returns A new object with `undefined` values replaced by `null`.
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const newObj: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value === undefined) {
        newObj[key] = null; // Replace undefined with null
      } else if (typeof value === 'object' && value !== null) {
        newObj[key] = sanitizeForFirestore(value); // Recurse for nested objects/arrays
      } else {
        newObj[key] = value;
      }
    }
  }
  return newObj as T;
}
