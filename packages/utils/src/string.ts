/**
 * A minimalistic implementation to convert camelcase strings to hyphenated ones.
 *
 * @param string - The camelcase input.
 * @returns The input, but hyphenated.
 */
export function camelToHyphen(string: string): string {
  return string.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

/**
 * Convert a string to upper case.
 *
 * @param input - The string to convert to upper case.
 * @returns The input, but upper case.
 */
export function toUpperCase(input: string): string {
  return input.toUpperCase();
}

/**
 * Escape a JSON reference.
 *
 * See https://tools.ietf.org/html/rfc6901#section-3
 *
 * @param ref - THe JSON pointer segment to escape.
 * @returns The escaped JSON pointer segment.
 */
export function decodeJSONRef(ref: string): string {
  return decodeURIComponent(ref).replace(/~/g, '~0').replace(/\//g, '~1');
}
