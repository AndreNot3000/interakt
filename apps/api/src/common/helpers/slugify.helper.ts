import slugifyLib from 'slugify';
import { v4 as uuidv4 } from 'uuid';

export function createSlug(text: string): string {
  return slugifyLib(text, {
    lower: true,
    strict: true,
    trim: true,
  });
}

export function createUniqueSlug(text: string): string {
  const base = createSlug(text);
  const suffix = uuidv4().split('-')[0];
  return `${base}-${suffix}`;
}
