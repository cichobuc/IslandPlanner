import { randomInt } from 'node:crypto';

// Dočasné heslo: 12 znakov bez zameniteľných (0/O, 1/l/I), ľahko prepísateľné z e-mailu / obrazovky.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
export function generateTempPassword(length = 12): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export const PASSWORD_MIN = 10;
