import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isLocale, resolveLocale } from './locale';
import { ERROR_MESSAGES, translateError } from './error-messages';

describe('resolveLocale (Accept-Language, Modül 2 §1.2)', () => {
  it('picks an exact supported tag', () => {
    expect(resolveLocale('fr')).toBe('fr');
    expect(resolveLocale('tr')).toBe('tr');
  });

  it('falls back to the primary subtag (fr-CA → fr) — the Ontario case', () => {
    expect(resolveLocale('fr-CA')).toBe('fr');
    expect(resolveLocale('en-US')).toBe('en');
  });

  it('honors q-weights over header order', () => {
    expect(resolveLocale('en;q=0.2, fr;q=0.9')).toBe('fr');
    expect(resolveLocale('de, fr;q=0.8, tr;q=0.9')).toBe('tr');
  });

  it('keeps header order when weights tie', () => {
    expect(resolveLocale('tr, fr')).toBe('tr');
  });

  it('skips q=0 (RFC 9110: explicitly not acceptable)', () => {
    expect(resolveLocale('fr;q=0, tr')).toBe('tr');
  });

  it('treats a malformed q as lowest rather than letting it win', () => {
    expect(resolveLocale('fr;q=abc, tr;q=0.5')).toBe('tr');
  });

  it('defaults for absent / unsupported / wildcard headers', () => {
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale('')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale('de, ja')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale('*')).toBe(DEFAULT_LOCALE);
  });

  it('is case-insensitive', () => {
    expect(resolveLocale('FR-CA')).toBe('fr');
  });

  it('never throws on hostile input (this parses an attacker-controlled header)', () => {
    for (const input of [';;;', 'q=1', ',,,', 'x'.repeat(5000), 'fr;q=;q=;q=']) {
      expect(() => resolveLocale(input)).not.toThrow();
    }
  });
});

describe('isLocale', () => {
  it('accepts exactly the supported set', () => {
    for (const l of SUPPORTED_LOCALES) expect(isLocale(l)).toBe(true);
    expect(isLocale('de')).toBe(false);
    expect(isLocale('toString')).toBe(false);
  });
});

describe('ERROR_MESSAGES catalog', () => {
  const keys = Object.keys(ERROR_MESSAGES) as (keyof typeof ERROR_MESSAGES)[];

  it('has a non-empty string for every locale of every key', () => {
    for (const key of keys) {
      for (const locale of SUPPORTED_LOCALES) {
        expect(ERROR_MESSAGES[key][locale], `${key}.${locale}`).toBeTruthy();
      }
    }
  });

  it('uses the same placeholder set across all three locales of a key', () => {
    // A translation that drops `{minutes}` silently ships "try again in
    // minutes" to that language only — invisible without this check.
    const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string).sort();
    for (const key of keys) {
      const en = placeholders(ERROR_MESSAGES[key].en);
      expect(placeholders(ERROR_MESSAGES[key].fr), `${key} fr`).toEqual(en);
      expect(placeholders(ERROR_MESSAGES[key].tr), `${key} tr`).toEqual(en);
    }
  });

  it('contains no forbidden "something went wrong" phrasing (Tasarım Sistemi §4)', () => {
    for (const key of keys) {
      for (const locale of SUPPORTED_LOCALES) {
        expect(ERROR_MESSAGES[key][locale].toLowerCase()).not.toContain('bir şeyler ters gitti');
      }
    }
  });
});

describe('translateError', () => {
  it('returns the requested locale', () => {
    expect(translateError('error.not_found', 'fr')).toBe(ERROR_MESSAGES['error.not_found'].fr);
    expect(translateError('error.not_found', 'tr')).toBe(ERROR_MESSAGES['error.not_found'].tr);
  });

  it('defaults to DEFAULT_LOCALE when none is given', () => {
    expect(translateError('error.not_found')).toBe(ERROR_MESSAGES['error.not_found'][DEFAULT_LOCALE]);
  });

  it('substitutes params', () => {
    expect(translateError('ec.max_contacts', 'en', { max: 3 })).toContain('3');
    expect(translateError('link.too_many_attempts', 'tr', { minutes: 15 })).toContain('15');
  });

  it('leaves an unsupplied placeholder visible rather than printing "undefined"', () => {
    // A stray `{minutes}` reads as an obvious bug; "in undefined minutes"
    // reads as a broken product. Deliberate — see the function's doc comment.
    expect(translateError('link.too_many_attempts', 'en')).toContain('{minutes}');
    expect(translateError('link.too_many_attempts', 'en', { other: 1 })).toContain('{minutes}');
  });

  it('does not substitute from inherited Object properties', () => {
    expect(translateError('ec.max_contacts', 'en', {})).toContain('{max}');
  });
});
