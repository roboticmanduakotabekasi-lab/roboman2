/**
 * src/utils/smartSearch.ts
 * Algoritma Pencarian Cerdas (Smart Search Engine):
 * 1. Multi-Token Query: Memecah query berdasarkan spasi, setiap token harus cocok (e.g. "10 inashaura").
 * 2. Typo-Tolerant / Fuzzy Matching: Menggunakan Levenshtein distance untuk toleransi typo 1-2 huruf.
 * 3. Relevance Scoring: Mengurutkan hasil berdasarkan kecocokan terbaik (exact match, prefix, substring, fuzzy).
 */

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }

  return row[b.length];
}

/**
 * Normalizes text: trims, lowers case, strips accents/diacritics
 */
export function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Checks if a search token matches a target text string
 * Returns match score (0 = no match, >0 = matched with weight)
 */
export function matchTokenAgainstField(targetField: string, token: string): number {
  const normField = normalizeSearchText(targetField);
  const normToken = normalizeSearchText(token);

  if (!normField || !normToken) return 0;

  // 1. Exact match
  if (normField === normToken) return 100;

  // 2. Starts with (Prefix match)
  if (normField.startsWith(normToken)) return 60;

  // 3. Substring match
  if (normField.includes(normToken)) return 40;

  // 4. Word-level fuzzy match (tolerance for typos)
  // Only apply fuzzy matching if token has at least 4 characters
  if (normToken.length >= 4) {
    const maxAllowedDist = normToken.length >= 7 ? 2 : 1;
    const words = normField.split(/[\s,./\-_]+/);

    for (const w of words) {
      if (!w) continue;
      // Word starts with token
      if (w.startsWith(normToken)) return 50;

      // Distance check
      if (Math.abs(w.length - normToken.length) <= maxAllowedDist) {
        const dist = levenshteinDistance(w, normToken);
        if (dist <= maxAllowedDist) {
          return 25 - dist * 5;
        }
      }
    }
  }

  return 0;
}

/**
 * Smart Search function with Multi-Token support and Typo Tolerance
 */
export function smartFilter<T>(
  items: T[],
  query: string,
  fieldExtractor: (item: T) => (string | undefined | null | number)[]
): T[] {
  const rawQ = query.trim();
  if (!rawQ) return items;

  const tokens = rawQ
    .split(/\s+/)
    .map((t) => normalizeSearchText(t))
    .filter(Boolean);

  if (!tokens.length) return items;

  const scored: { item: T; score: number; index: number }[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const fields = fieldExtractor(item)
      .filter((f): f is string | number => f !== undefined && f !== null && f !== '')
      .map((f) => String(f));

    let itemTotalScore = 0;
    let allTokensMatched = true;

    // Every token must match AT LEAST ONE field
    for (const token of tokens) {
      let bestTokenScore = 0;
      for (const field of fields) {
        const score = matchTokenAgainstField(field, token);
        if (score > bestTokenScore) {
          bestTokenScore = score;
        }
      }

      if (bestTokenScore === 0) {
        allTokensMatched = false;
        break;
      }
      itemTotalScore += bestTokenScore;
    }

    if (allTokensMatched) {
      scored.push({ item, score: itemTotalScore, index: idx });
    }
  }

  // Sort by score descending; preserve original index for ties
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  return scored.map((s) => s.item);
}
