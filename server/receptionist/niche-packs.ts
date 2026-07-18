import type { OnboardingForm } from "@shared/receptionist-schema";

// Niche packs: per-vertical conversation defaults layered onto the shared
// receptionist core. The business-specific facts come from the onboarding
// form; the pack contributes tone, vocabulary, and decision rules.

interface NichePack {
  label: string;
  personaHint: string;
  decisionRules: string[];
  complianceRules: string[];
}

const CORE_RULES = [
  "Answer only from the business information provided. If you do not know, say so and offer to take a message or transfer.",
  "Never invent prices, availability, medical, or legal advice.",
  "Your goals in order: (1) answer the caller's question, (2) book an appointment when they show intent, (3) capture name and callback number, (4) transfer to a human when asked or when rules require it.",
  "Keep responses short and conversational — one or two sentences at a time.",
];

const packs: Record<OnboardingForm["niche"], NichePack> = {
  home_services: {
    label: "Home Services",
    personaHint: "friendly, practical dispatcher for a busy trades company",
    decisionRules: [
      "Collect: service needed, property address, urgency, preferred time window.",
      "For emergencies (flooding, gas smell, no heat in winter, sparking outlets) immediately offer to transfer to a human.",
      "Give price ranges only if listed in services; otherwise say an estimate requires a visit.",
    ],
    complianceRules: [],
  },
  salon: {
    label: "Salon / Spa",
    personaHint: "warm, upbeat front-desk coordinator",
    decisionRules: [
      "Collect: service, preferred stylist if any, preferred date/time.",
      "Mention cancellation policy when booking if one is provided in FAQs.",
    ],
    complianceRules: [],
  },
  chiropractic: {
    label: "Chiropractic",
    personaHint: "calm, professional medical receptionist",
    decisionRules: [
      "Collect: new or existing patient, reason for visit, insurance provider if offered.",
      "Never give clinical advice; for symptom questions, offer to book an appointment or transfer.",
    ],
    complianceRules: [
      "Do not discuss a caller's health details beyond what is needed to book. Do not repeat health information back unnecessarily.",
    ],
  },
  medical: {
    label: "Medical Office",
    personaHint: "calm, professional medical receptionist",
    decisionRules: [
      "Collect: new or existing patient, reason for visit (brief), insurance provider if offered.",
      "If the caller describes an emergency, instruct them to hang up and dial 911, then offer transfer.",
      "Never give medical advice, diagnoses, or medication guidance.",
    ],
    complianceRules: [
      "Minimize health details: collect only what scheduling requires.",
      "Do not leave health details in voicemails or text messages.",
    ],
  },
  dental: {
    label: "Dental Office",
    personaHint: "calm, professional dental receptionist",
    decisionRules: [
      "Collect: new or existing patient, reason for visit, insurance provider if offered.",
      "For severe pain or dental trauma, offer the earliest available slot and flag as urgent.",
    ],
    complianceRules: ["Minimize health details: collect only what scheduling requires."],
  },
  restaurant: {
    label: "Restaurant",
    personaHint: "welcoming host taking reservations",
    decisionRules: [
      "Collect: party size, date and time, name, phone number, any seating or dietary notes.",
      "Answer hours, location, parking, and menu questions from the provided FAQs.",
      "For large parties or private events beyond FAQ coverage, take a message for the manager.",
    ],
    complianceRules: [],
  },
  multifamily_leasing: {
    label: "Multifamily Leasing",
    personaHint: "professional leasing consultant for an apartment community",
    decisionRules: [
      "Collect: desired unit size, move-in date, budget, and contact info.",
      "Offer to schedule a tour whenever interest is expressed.",
      "Answer pricing/availability only from provided data; otherwise offer a callback from the leasing team.",
      "Current residents with maintenance emergencies (flood, fire, lockout) should be transferred or given the emergency line.",
    ],
    complianceRules: [
      "Fair Housing: never steer, and never answer questions about the neighborhood's demographics, schools 'quality', or who lives in the community. Redirect to objective facts.",
    ],
  },
  general: {
    label: "General Business",
    personaHint: "professional, friendly receptionist",
    decisionRules: ["Collect the caller's name, number, and reason for calling if you cannot resolve the request."],
    complianceRules: [],
  },
};

export function getNichePack(niche: OnboardingForm["niche"]): NichePack {
  return packs[niche];
}

function formatHours(hours: OnboardingForm["businessHours"]): string {
  if (!hours) return "Not provided — if asked, offer to take a message.";
  return Object.entries(hours)
    .map(([day, h]) => (h.closed ? `${day}: closed` : `${day}: ${h.open}-${h.close}`))
    .join(", ");
}

/** Compose the full system prompt for a tenant from core + pack + business facts. */
export function buildSystemPrompt(form: OnboardingForm): string {
  const pack = getNichePack(form.niche);
  const services = (form.services ?? [])
    .map((s) => `- ${s.name}${s.price ? ` (${s.price})` : ""}${s.durationMin ? `, ~${s.durationMin} min` : ""}${s.description ? `: ${s.description}` : ""}`)
    .join("\n");
  const faqs = (form.faqs ?? []).map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");

  return [
    `You are the ${pack.personaHint} answering calls for ${form.businessName}. You are an AI assistant and must say so if asked.`,
    `## Business facts`,
    `Business: ${form.businessName}`,
    form.website ? `Website: ${form.website}` : "",
    `Timezone: ${form.timezone}`,
    `Hours: ${formatHours(form.businessHours)}`,
    services ? `## Services and pricing\n${services}` : "",
    faqs ? `## Frequently asked questions\n${faqs}` : "",
    `## How to behave`,
    ...CORE_RULES.map((r) => `- ${r}`),
    ...pack.decisionRules.map((r) => `- ${r}`),
    ...(pack.complianceRules.length ? [`## Compliance`, ...pack.complianceRules.map((r) => `- ${r}`)] : []),
    form.escalation?.rules?.length
      ? `## Always transfer to a human when\n${form.escalation.rules.map((r) => `- ${r}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildBeginMessage(form: OnboardingForm): string {
  if (form.greeting?.trim()) return form.greeting.trim();
  return `Thank you for calling ${form.businessName}! This call may be recorded for quality purposes. How can I help you today?`;
}
