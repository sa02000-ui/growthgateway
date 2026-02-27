const assessmentDisplayNames: Record<string, string> = {
  'ipip-neo-120': 'Big Five Personality Assessment',
  'schwartz-pvq-21': 'Core Values & Motivations Assessment',
  'short-dark-triad-sd3': 'Shadow Personality Traits',
  'icar-16': 'Logical Reasoning & Problem Solving',
  'grit-s-8': 'Grit & Perseverance Assessment',
  'onet-riasec-30': 'Career Interest & Work Style Profile',
  'teique-sf-30': 'Emotional Intelligence Assessment',
  'pss-10': 'Perceived Stress Scale',
  'swls-5': 'Satisfaction With Life Scale',
  'brs-6': 'Resilience & Bounce-Back Assessment',
  'flourishing-8': 'Psychological Well-Being & Flourishing',

  'IPIP-NEO-120': 'Big Five Personality Assessment',
  'Schwartz Portrait Values (PVQ)': 'Core Values & Motivations Assessment',
  'Short Dark Triad (SD3)': 'Shadow Personality Traits',
  'ICAR-16 Cognitive Assessment': 'Logical Reasoning & Problem Solving',
  'Short Grit Scale (Grit-S)': 'Grit & Perseverance Assessment',
  'O*NET Interest Profiler (Mini)': 'Career Interest & Work Style Profile',
  'TEIQue-SF (Emotional Intelligence)': 'Emotional Intelligence Assessment',
  'Perceived Stress Scale (PSS-10)': 'Perceived Stress Scale',
  'Satisfaction With Life Scale (SWLS)': 'Satisfaction With Life Scale',
  'Brief Resilience Scale (BRS)': 'Resilience & Bounce-Back Assessment',
  'Flourishing Scale (FS)': 'Psychological Well-Being & Flourishing',
};

export function getDisplayName(assessmentTypeOrSlug: string): string {
  return assessmentDisplayNames[assessmentTypeOrSlug] || assessmentTypeOrSlug;
}
