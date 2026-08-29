/**
 * iGROWth · catalogul de planuri
 *
 * Prețurile afișate pe site vin din backend, la build:
 *   GET {IG_API_URL}/public/plans?audience=athlete
 *
 * De ce la build și nu în browser: prețurile ajung în HTML (bune pentru SEO și
 * pentru JSON-LD), pagina nu sare la încărcare și nu mai facem un request.
 * Costul: după o schimbare de preț în admin, site-ul trebuie reconstruit —
 * vezi „Deploy hook" în docs/PLAN-DEPLOYMENT.md.
 *
 * Dacă API-ul nu răspunde, build-ul NU pică: folosim ultima copie cunoscută din
 * `site/plans.<audience>.json` și afișăm un avertisment.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const fallbackFile = (audience) => join(HERE, `plans.${audience}.json`);

/** 579 → „5,79 €"  ·  100 → „1 €"  (sumele rotunde se scriu fără zecimale) */
export const money = (cents, currency = 'EUR') => {
  const symbol = currency === 'EUR' ? '€' : currency;
  const value = cents % 100 === 0
    ? String(cents / 100)
    : (cents / 100).toFixed(2).replace('.', ',');
  return `${value} ${symbol}`;
};

/** Cost săptămânal aproximativ: luna are ~4,33 săptămâni, anul are 52. */
export const perWeek = (cents, period, short = false) => {
  const weeks = period === 'year' ? 52 : 4.33;
  const value = (cents / 100 / weeks).toFixed(2).replace('.', ',');
  return `≈ ${value} €/${short ? 'săpt' : 'săptămână'}`;
};

export async function loadPlans(apiUrl, audience = 'athlete') {
  const url = `${apiUrl.replace(/\/$/, '')}/public/plans?audience=${audience}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const plans = body?.plans ?? body;
    if (!Array.isArray(plans) || !plans.length) throw new Error('răspuns fără planuri');

    /* copia locală se actualizează doar când API-ul a răspuns corect */
    writeFileSync(fallbackFile(audience), JSON.stringify(plans, null, 2) + '\n');
    return { plans, source: 'API' };
  } catch (e) {
    const plans = JSON.parse(readFileSync(fallbackFile(audience), 'utf8'));
    return { plans, source: `copie locală (API indisponibil: ${e.message})` };
  }
}

/**
 * Marcajele {{price:…}} / {{week:…}} / {{wk:…}} folosite în content/.
 *   {{price:start:m}} → 5,79 €      {{price:start:y}} → 57,99 €
 *   {{week:start:m}}  → ≈ 1,34 €/săptămână
 *   {{wk:start:m}}    → ≈ 1,34 €/săpt          (varianta scurtă, din modal)
 */
export function priceMarkers(plans, prefix = 'price') {
  /* pentru sportivi pastram numele scurte din content: {{week:…}} / {{wk:…}} */
  const weekKey = prefix === 'price' ? 'week' : `${prefix}Week`;
  const wkKey = prefix === 'price' ? 'wk' : `${prefix}Wk`;
  const out = {};
  for (const p of plans) {
    const pairs = [['m', p.price_cents_month, 'month'], ['y', p.price_cents_year, 'year']];
    for (const [suffix, cents, period] of pairs) {
      if (cents === null || cents === undefined) continue;
      out[`{{${prefix}:${p.code}:${suffix}}}`] = money(cents, p.currency);
      out[`{{${weekKey}:${p.code}:${suffix}}}`] = perWeek(cents, period, false);
      out[`{{${wkKey}:${p.code}:${suffix}}}`] = perWeek(cents, period, true);
    }
  }
  return out;
}

/** Codurile care au preț anual — doar pentru ele se poate trimite `year`. */
export const yearlyCodes = (plans) =>
  plans.filter((p) => p.price_cents_year !== null && p.price_cents_year !== undefined)
    .map((p) => p.code);

/** Ofertele pentru JSON-LD (schema.org Product). */
export const schemaOffers = (plans) =>
  plans.map((p) => ({
    name: p.name,
    price: (p.price_cents_month / 100).toFixed(2),
    currency: p.currency ?? 'EUR',
  }));
