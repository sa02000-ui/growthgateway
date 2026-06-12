// Reliable Change Index (RCI) and measurement-class utilities.
//
// Psychometric assessments differ in how much they should be expected to change:
//  - TRAIT measures (Big Five, Dark Triad, RIASEC, cognitive ability) are stable.
//    Retaking them over short periods mostly captures measurement noise and
//    practice/memory effects, not real growth.
//  - STATE measures (perceived stress, life satisfaction, resilience, flourishing)
//    can meaningfully shift over weeks.
//
// The Reliable Change Index tells us whether the difference between two scores is
// large enough to be "reliable" rather than noise:
//   RCI = 1.96 * SD * sqrt(2) * sqrt(1 - alpha)
// A change is only labelled meaningful when |change| > RCI.

export type MeasurementClass = 'trait' | 'state';

export interface Psychometrics {
  /** Internal-consistency reliability (Cronbach's alpha), 0–1. */
  alpha: number;
  /** Standard deviation expressed on the 0–100 display scale used by the charts. */
  sd: number;
}

export interface AssessmentClassification {
  slug: string;
  measurementClass: MeasurementClass;
  /** Suggested days between meaningful retakes. */
  retestIntervalDays: number;
  /** One-time measures (e.g. cognitive ability) should not be retaken or trended. */
  oneTime?: boolean;
  /** Reliability for single-score state measures (used for RCI on their trend). */
  cronbachAlpha?: number;
  /** SD on the 0–100 display scale for single-score state measures. */
  sd?: number;
  /** assessment_type / name strings seen in stored results, for matching. */
  aliases: string[];
}

// Big Five (IPIP-NEO-120) domain reliabilities with SDs expressed on the 0–100
// display scale. Alphas are representative published values; SDs are approximate
// population estimates on the percentage scale used by the dashboard.
export const BIG_FIVE_PSYCHOMETRICS: Record<'O' | 'C' | 'E' | 'A' | 'N', Psychometrics> = {
  O: { alpha: 0.84, sd: 15 },
  C: { alpha: 0.88, sd: 15 },
  E: { alpha: 0.89, sd: 16 },
  A: { alpha: 0.86, sd: 14 },
  N: { alpha: 0.89, sd: 17 },
};

export const ASSESSMENT_CLASSIFICATIONS: AssessmentClassification[] = [
  { slug: 'ipip-neo-120', measurementClass: 'trait', retestIntervalDays: 365,
    aliases: ['ipip-neo-120', 'big five personality assessment', 'big five', 'ipip', 'neo'] },
  { slug: 'schwartz-pvq-21', measurementClass: 'trait', retestIntervalDays: 365,
    aliases: ['schwartz', 'pvq', 'portrait values'] },
  { slug: 'short-dark-triad-sd3', measurementClass: 'trait', retestIntervalDays: 365,
    aliases: ['dark triad', 'sd3'] },
  { slug: 'icar-16', measurementClass: 'trait', retestIntervalDays: 365, oneTime: true,
    aliases: ['icar', 'cognitive'] },
  { slug: 'grit-s-8', measurementClass: 'trait', retestIntervalDays: 365,
    aliases: ['grit'] },
  { slug: 'onet-riasec-30', measurementClass: 'trait', retestIntervalDays: 365,
    aliases: ['riasec', 'interest profiler', 'holland'] },
  { slug: 'teique-sf-30', measurementClass: 'trait', retestIntervalDays: 365,
    aliases: ['teique', 'trait ei', 'emotional intelligence'] },
  { slug: 'pss-10', measurementClass: 'state', retestIntervalDays: 14, cronbachAlpha: 0.85, sd: 18,
    aliases: ['perceived stress', 'pss'] },
  { slug: 'swls-5', measurementClass: 'state', retestIntervalDays: 30, cronbachAlpha: 0.87, sd: 18,
    aliases: ['satisfaction with life', 'swls'] },
  { slug: 'brs-6', measurementClass: 'state', retestIntervalDays: 30, cronbachAlpha: 0.83, sd: 18,
    aliases: ['brief resilience', 'brs', 'resilience'] },
  { slug: 'flourishing-8', measurementClass: 'state', retestIntervalDays: 30, cronbachAlpha: 0.87, sd: 16,
    aliases: ['flourishing', 'well-being', 'wellbeing'] },
];

/** Resolve a slug or assessment_type/name string to its classification. */
export function classifyAssessment(typeOrSlug: string | undefined | null): AssessmentClassification | undefined {
  if (!typeOrSlug) return undefined;
  const v = typeOrSlug.toLowerCase().trim();
  const bySlug = ASSESSMENT_CLASSIFICATIONS.find((c) => c.slug === v);
  if (bySlug) return bySlug;
  return ASSESSMENT_CLASSIFICATIONS.find(
    (c) => v.includes(c.slug) || c.aliases.some((a) => v.includes(a)),
  );
}

export function getMeasurementClass(typeOrSlug: string | undefined | null): MeasurementClass | undefined {
  return classifyAssessment(typeOrSlug)?.measurementClass;
}

export function isOneTimeAssessment(typeOrSlug: string | undefined | null): boolean {
  return classifyAssessment(typeOrSlug)?.oneTime === true;
}

function valid(sd: number | undefined, alpha: number | undefined): sd is number {
  return (
    typeof sd === 'number' && typeof alpha === 'number' &&
    isFinite(sd) && isFinite(alpha) && sd > 0 && alpha > 0 && alpha < 1
  );
}

/** RCI threshold; null when inputs are unavailable/invalid. */
export function reliableChangeIndex(sd: number | undefined, alpha: number | undefined): number | null {
  if (!valid(sd, alpha)) return null;
  return 1.96 * sd * Math.sqrt(2) * Math.sqrt(1 - (alpha as number));
}

/** Standard error of measurement (±1 SEM is used for confidence bands). */
export function standardErrorOfMeasurement(sd: number | undefined, alpha: number | undefined): number | null {
  if (!valid(sd, alpha)) return null;
  return sd * Math.sqrt(1 - (alpha as number));
}

export interface ChangeAssessment {
  change: number;
  rci: number | null;
  /** true/false when RCI is computable, null when we lack the data to judge. */
  meaningful: boolean | null;
}

export function assessChange(change: number, sd: number | undefined, alpha: number | undefined): ChangeAssessment {
  const rci = reliableChangeIndex(sd, alpha);
  return { change, rci, meaningful: rci === null ? null : Math.abs(change) > rci };
}
