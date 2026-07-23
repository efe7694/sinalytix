/**
 * Locale resolution — Modül 1 §1.7 (EN / FR / TR) + Modül 2 §1.2
 * (`Accept-Language` drives response text: error messages, notification
 * templates).
 */

export const SUPPORTED_LOCALES = ['en', 'fr', 'tr'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/**
 * `en` — Ontario is the V0 market (Kapsam Matrisi) and `users.locale`
 * already defaults to `'en'` in the schema (migration 0002). A client that
 * wants Turkish or French must say so; guessing from anything other than an
 * explicit signal is how a francophone Ontarian gets an English legal notice.
 */
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Parses an RFC 9110 `Accept-Language` header and returns the best supported
 * match, honoring q-weights and falling back to the primary subtag
 * (`fr-CA` → `fr`). Returns `DEFAULT_LOCALE` when the header is absent,
 * malformed, or names nothing we support.
 *
 * Deliberately hand-rolled rather than pulled from a library: the supported
 * set is three fixed locales, and a dependency here would be loaded on every
 * request path in every service for ~20 lines of parsing.
 */
export function resolveLocale(acceptLanguage: string | undefined | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const candidates = acceptLanguage
    .split(',')
    .map((part) => {
      const [tagRaw, ...params] = part.trim().split(';');
      const tag = (tagRaw ?? '').trim().toLowerCase();
      const qParam = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      // An absent q defaults to 1.0; an unparseable one is treated as 0 so a
      // malformed entry can never outrank a well-formed one.
      const q = qParam === undefined ? 1 : Number.parseFloat(qParam.slice(2));
      return { tag, q: Number.isFinite(q) ? q : 0 };
    })
    .filter((c) => c.tag.length > 0 && c.q > 0)
    // Stable sort by descending q — equal weights keep header order, which is
    // the client's own stated preference order.
    .sort((a, b) => b.q - a.q);

  for (const { tag } of candidates) {
    if (tag === '*') return DEFAULT_LOCALE;
    if (isLocale(tag)) return tag;
    const primary = tag.split('-')[0];
    if (primary && isLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}
