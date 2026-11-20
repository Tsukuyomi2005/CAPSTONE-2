/**
 * Pure helpers for weight-based service pricing (no Convex imports so the same
 * code can be used by the backend validators and the React UI).
 *
 * Tiers are ordered by ascending `maxKg`. A tier covers weights greater than the
 * previous tier's `maxKg` up to and including its own `maxKg`. The last tier has
 * no `maxKg` and covers everything above the previous tier.
 */

export interface WeightTier {
  label: string;
  maxKg?: number;
  price: number;
}

export const MIN_WEIGHT_TIERS = 2;
export const MAX_WEIGHT_TIERS = 10;
export const TIER_LABEL_MAX = 30;

/** Returns an error message, or null if the tiers are valid. */
export function validateWeightTiers(tiers: WeightTier[]): string | null {
  if (tiers.length < MIN_WEIGHT_TIERS || tiers.length > MAX_WEIGHT_TIERS) {
    return `Weight-based pricing needs between ${MIN_WEIGHT_TIERS} and ${MAX_WEIGHT_TIERS} tiers.`;
  }
  let previousMax = 0;
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const isLast = i === tiers.length - 1;
    const row = `Tier ${i + 1}`;
    const label = tier.label.trim();
    if (!label) return `${row}: label is required.`;
    if (label.length > TIER_LABEL_MAX) {
      return `${row}: label must be at most ${TIER_LABEL_MAX} characters.`;
    }
    if (!Number.isFinite(tier.price) || tier.price <= 0) {
      return `${row}: price must be greater than 0.`;
    }
    if (isLast) {
      if (tier.maxKg !== undefined) {
        return `${row}: the last tier must be open-ended (no max weight).`;
      }
    } else {
      if (tier.maxKg === undefined || !Number.isFinite(tier.maxKg) || tier.maxKg <= 0) {
        return `${row}: max weight must be greater than 0.`;
      }
      if (tier.maxKg <= previousMax) {
        return `${row}: max weight must be greater than the previous tier (${previousMax} kg).`;
      }
      previousMax = tier.maxKg;
    }
  }
  return null;
}

/** Finds the tier that applies to a pet weight in kg, or null if the weight is invalid. */
export function getTierForWeight(
  tiers: WeightTier[] | undefined,
  weightKg: number
): WeightTier | null {
  if (!tiers || tiers.length === 0) return null;
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
  for (const tier of tiers) {
    if (tier.maxKg === undefined || weightKg <= tier.maxKg) return tier;
  }
  return null;
}

export function hasWeightTiers(service: { weightTiers?: WeightTier[] }): boolean {
  return !!service.weightTiers && service.weightTiers.length > 0;
}

/** Human readable range for a tier, e.g. "Up to 5 kg", "Over 5 – 15 kg", "Over 15 kg". */
export function describeTierRange(tiers: WeightTier[], index: number): string {
  const tier = tiers[index];
  const previousMax = index > 0 ? tiers[index - 1].maxKg : undefined;
  if (tier.maxKg === undefined) return previousMax === undefined ? 'Any weight' : `Over ${previousMax} kg`;
  if (previousMax === undefined) return `Up to ${tier.maxKg} kg`;
  return `Over ${previousMax} – ${tier.maxKg} kg`;
}

export function getLowestTierPrice(tiers: WeightTier[]): number {
  return Math.min(...tiers.map((t) => t.price));
}

/** Price for a service given an optional pet weight. Flat services ignore the weight. */
export function resolveServicePrice(
  service: { price: number; weightTiers?: WeightTier[] },
  weightKg?: number
): { price: number; tier: WeightTier | null } {
  if (!hasWeightTiers(service)) return { price: service.price, tier: null };
  const tier = weightKg !== undefined ? getTierForWeight(service.weightTiers, weightKg) : null;
  return { price: tier ? tier.price : service.price, tier };
}
