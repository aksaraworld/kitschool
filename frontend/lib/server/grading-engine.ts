/**
 * Grading calculation engine – config-driven, no hardcoded rules.
 * Supports TK (development-based) and SD–SMA (subject-based weighted).
 */

import type {
  GradingConfig,
  GradingComponent,
  PredicateMapping,
  GradeComponent,
  CalculatedGrade,
  SchoolLevel,
} from '@/lib/types';

export interface GradeComponentRecord {
  componentKey: string;
  componentLabel?: string;
  numericScore?: number;
  descriptiveScore?: string;
  maxScore?: number;
}

/**
 * Check if level uses TK (development-based) assessment.
 */
export function isTkLevel(level: SchoolLevel): boolean {
  return level === 'tk';
}

/**
 * Get effective grading components for a subject (config + subject overrides).
 */
export function getEffectiveComponents(
  config: GradingConfig,
  overrides?: { key: string; weight: number }[]
): GradingComponent[] {
  if (!overrides?.length) return config.components ?? [];
  const overrideMap = new Map(overrides.map((o) => [o.key, o.weight]));
  return (config.components ?? []).map((c) => {
    const w = overrideMap.get(c.key);
    if (w !== undefined) return { ...c, weight: w };
    return c;
  });
}

/**
 * Calculate final numeric score from weighted components (SD–SMA).
 */
export function calculateFinalNumeric(
  components: GradeComponentRecord[],
  config: GradingConfig,
  overrides?: { key: string; weight: number }[]
): number | null {
  const effectiveComponents = getEffectiveComponents(config, overrides);
  let weightedSum = 0;
  let totalWeight = 0;

  for (const comp of effectiveComponents) {
    const rec = components.find((c) => c.componentKey === comp.key);
    if (rec?.numericScore != null) {
      const max = rec.maxScore ?? 100;
      const normalized = max > 0 ? (rec.numericScore / max) * 100 : 0;
      weightedSum += normalized * comp.weight;
      totalWeight += comp.weight;
    }
  }

  if (totalWeight <= 0) return null;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

/**
 * Map numeric score to letter/predicate using config mappings.
 */
export function mapToPredicate(
  numeric: number,
  config: GradingConfig
): { letter: string; predicate?: string } {
  const mappings = (config.predicateMappings ?? []) as PredicateMapping[];
  const sorted = [...mappings].sort((a, b) => b.minNumeric - a.minNumeric);
  const match = sorted.find((m) => numeric >= m.minNumeric && numeric <= m.maxNumeric);
  return {
    letter: match?.letter ?? '-',
    predicate: match?.description ?? match?.letter ?? '-',
  };
}

/**
 * Calculate full grade for SD–SMA (subject-based).
 */
export function calculateSubjectGrade(
  components: GradeComponentRecord[],
  config: GradingConfig,
  overrides?: { key: string; weight: number }[]
): {
  numeric: number;
  letter: string;
  predicate?: string;
  breakdown: { key: string; label: string; score: number; weight: number }[];
} {
  const effectiveComponents = getEffectiveComponents(config, overrides);
  const breakdown: { key: string; label: string; score: number; weight: number }[] = [];

  for (const comp of effectiveComponents) {
    const rec = components.find((c) => c.componentKey === comp.key);
    const score = rec?.numericScore ?? 0;
    const max = rec?.maxScore ?? 100;
    const normalized = max > 0 ? (score / max) * 100 : 0;
    breakdown.push({
      key: comp.key,
      label: comp.label,
      score: normalized,
      weight: comp.weight,
    });
  }

  const numeric = calculateFinalNumeric(components, config, overrides);
  const finalNumeric = numeric ?? 0;
  const { letter, predicate } = mapToPredicate(finalNumeric, config);

  return {
    numeric: finalNumeric,
    letter,
    predicate,
    breakdown,
  };
}

/**
 * Aggregate TK development-area grades (descriptive only, no numeric).
 */
export function aggregateTkGrades(
  components: GradeComponentRecord[]
): { areaKey: string; descriptiveScore: string }[] {
  return components
    .filter((c) => c.descriptiveScore)
    .map((c) => ({
      areaKey: c.componentKey,
      descriptiveScore: c.descriptiveScore!,
    }));
}

/**
 * Build calculated grades for a student (SD–SMA).
 * Pass in grade components grouped by subjectId, and configs by level.
 */
export function buildCalculatedGrades(
  componentsBySubject: Map<string, GradeComponentRecord[]>,
  config: GradingConfig,
  subjectOverrides: Map<string, { key: string; weight: number }[]>,
  subjectNames: Map<string, string>
): CalculatedGrade[] {
  const result: CalculatedGrade[] = [];

  for (const [subjectId, components] of componentsBySubject) {
    if (isTkLevel(config.level)) {
      const areas = aggregateTkGrades(components);
      result.push({
        subjectId,
        subjectName: subjectNames.get(subjectId),
        numeric: 0,
        letter: '-',
        components: [],
        descriptiveComponents: areas.map((a) => ({
          key: a.areaKey,
          label: a.areaKey,
          value: a.descriptiveScore,
        })),
      });
    } else {
      const overrides = subjectOverrides.get(subjectId);
      const calc = calculateSubjectGrade(components, config, overrides);
      result.push({
        subjectId,
        subjectName: subjectNames.get(subjectId),
        numeric: calc.numeric,
        letter: calc.letter,
        predicate: calc.predicate,
        components: calc.breakdown,
      });
    }
  }

  return result;
}
