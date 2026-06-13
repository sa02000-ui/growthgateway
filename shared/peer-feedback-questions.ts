type TraitKey = 'N' | 'E' | 'O' | 'A' | 'C';

export interface PeerQuestion {
  id: number;
  text: string;
  trait: TraitKey;
  keyed: '+' | '-';
}

export const peerQuestions: PeerQuestion[] = [
  { id: 1, text: "They worry about things.", trait: "N", keyed: "+" },
  { id: 6, text: "They are relaxed most of the time.", trait: "N", keyed: "-" },
  { id: 11, text: "They get stressed out easily.", trait: "N", keyed: "+" },
  { id: 16, text: "They rarely get irritated.", trait: "N", keyed: "-" },
  { id: 21, text: "They often feel blue.", trait: "N", keyed: "+" },
  { id: 26, text: "They seldom feel blue.", trait: "N", keyed: "-" },
  
  { id: 2, text: "They make friends easily.", trait: "E", keyed: "+" },
  { id: 7, text: "They keep in the background.", trait: "E", keyed: "-" },
  { id: 12, text: "They are the life of the party.", trait: "E", keyed: "+" },
  { id: 17, text: "They don't talk a lot.", trait: "E", keyed: "-" },
  { id: 22, text: "They know how to captivate people.", trait: "E", keyed: "+" },
  { id: 27, text: "Their experiences seem somewhat dull.", trait: "E", keyed: "-" },
  
  { id: 3, text: "They have a vivid imagination.", trait: "O", keyed: "+" },
  { id: 8, text: "They are not interested in abstract ideas.", trait: "O", keyed: "-" },
  { id: 13, text: "They enjoy hearing new ideas.", trait: "O", keyed: "+" },
  { id: 18, text: "They avoid philosophical discussions.", trait: "O", keyed: "-" },
  { id: 23, text: "They carry conversations to a higher level.", trait: "O", keyed: "+" },
  { id: 28, text: "They do not like art.", trait: "O", keyed: "-" },
  
  { id: 4, text: "They have a good word for everyone.", trait: "A", keyed: "+" },
  { id: 9, text: "They have a sharp tongue.", trait: "A", keyed: "-" },
  { id: 14, text: "They believe that others have good intentions.", trait: "A", keyed: "+" },
  { id: 19, text: "They cut others to pieces.", trait: "A", keyed: "-" },
  { id: 24, text: "They make people feel at ease.", trait: "A", keyed: "+" },
  { id: 29, text: "They are not interested in other people's problems.", trait: "A", keyed: "-" },
  
  { id: 5, text: "They are always prepared.", trait: "C", keyed: "+" },
  { id: 10, text: "They waste their time.", trait: "C", keyed: "-" },
  { id: 15, text: "They get chores done right away.", trait: "C", keyed: "+" },
  { id: 20, text: "They find it difficult to get down to work.", trait: "C", keyed: "-" },
  { id: 25, text: "They carry out their plans.", trait: "C", keyed: "+" },
  { id: 30, text: "They do just enough work to get by.", trait: "C", keyed: "-" },
];

// Standardized agree/disagree Likert scale, shared by the peer-feedback form
// and any matched self mini-form so both are scored on the same anchors.
export const likertScale = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

// Instructed-response attention check. Its id is outside the real item id range
// so calculatePeerScores ignores it; it is validated on the client only.
export const ATTENTION_CHECK = {
  id: 9999,
  text: "For quality control, please select \u201CDisagree\u201D for this item.",
  expected: 2,
};

export const traitNames: Record<TraitKey, string> = {
  N: "Neuroticism",
  E: "Extraversion",
  O: "Openness",
  A: "Agreeableness",
  C: "Conscientiousness",
};

// Matched "I"-worded self version of the 30 peer items. Same ids / traits /
// keying so self and peer are scored on identical anchors for an apples-to-apples
// self-vs-peer gap.
export const selfMiniQuestions: PeerQuestion[] = [
  { id: 1, text: "I worry about things.", trait: "N", keyed: "+" },
  { id: 6, text: "I am relaxed most of the time.", trait: "N", keyed: "-" },
  { id: 11, text: "I get stressed out easily.", trait: "N", keyed: "+" },
  { id: 16, text: "I rarely get irritated.", trait: "N", keyed: "-" },
  { id: 21, text: "I often feel blue.", trait: "N", keyed: "+" },
  { id: 26, text: "I seldom feel blue.", trait: "N", keyed: "-" },

  { id: 2, text: "I make friends easily.", trait: "E", keyed: "+" },
  { id: 7, text: "I keep in the background.", trait: "E", keyed: "-" },
  { id: 12, text: "I am the life of the party.", trait: "E", keyed: "+" },
  { id: 17, text: "I don't talk a lot.", trait: "E", keyed: "-" },
  { id: 22, text: "I know how to captivate people.", trait: "E", keyed: "+" },
  { id: 27, text: "My experiences seem somewhat dull.", trait: "E", keyed: "-" },

  { id: 3, text: "I have a vivid imagination.", trait: "O", keyed: "+" },
  { id: 8, text: "I am not interested in abstract ideas.", trait: "O", keyed: "-" },
  { id: 13, text: "I enjoy hearing new ideas.", trait: "O", keyed: "+" },
  { id: 18, text: "I avoid philosophical discussions.", trait: "O", keyed: "-" },
  { id: 23, text: "I carry conversations to a higher level.", trait: "O", keyed: "+" },
  { id: 28, text: "I do not like art.", trait: "O", keyed: "-" },

  { id: 4, text: "I have a good word for everyone.", trait: "A", keyed: "+" },
  { id: 9, text: "I have a sharp tongue.", trait: "A", keyed: "-" },
  { id: 14, text: "I believe that others have good intentions.", trait: "A", keyed: "+" },
  { id: 19, text: "I cut others to pieces.", trait: "A", keyed: "-" },
  { id: 24, text: "I make people feel at ease.", trait: "A", keyed: "+" },
  { id: 29, text: "I am not interested in other people's problems.", trait: "A", keyed: "-" },

  { id: 5, text: "I am always prepared.", trait: "C", keyed: "+" },
  { id: 10, text: "I waste my time.", trait: "C", keyed: "-" },
  { id: 15, text: "I get chores done right away.", trait: "C", keyed: "+" },
  { id: 20, text: "I find it difficult to get down to work.", trait: "C", keyed: "-" },
  { id: 25, text: "I carry out my plans.", trait: "C", keyed: "+" },
  { id: 30, text: "I do just enough work to get by.", trait: "C", keyed: "-" },
];

// Relationship segments used to group peer feedback (respecting the min-3
// privacy threshold per group on the dashboard).
export type RelationshipValue = 'family' | 'friend' | 'partner' | 'colleague' | 'manager' | 'other';

export const relationshipOptions: { value: RelationshipValue; label: string }[] = [
  { value: 'family', label: 'Family' },
  { value: 'friend', label: 'Friend' },
  { value: 'partner', label: 'Partner / Spouse' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'manager', label: 'Manager / Mentor' },
  { value: 'other', label: 'Other' },
];

export const relationshipValues: RelationshipValue[] = relationshipOptions.map(o => o.value);

export const relationshipLabels: Record<RelationshipValue, string> = relationshipOptions.reduce(
  (acc, o) => { acc[o.value] = o.label; return acc; },
  {} as Record<RelationshipValue, string>,
);

// Shared Big Five scorer over any matched item set (peer or self mini-form).
function scoreBigFive(questions: PeerQuestion[], responses: Record<string, number>): Record<TraitKey, number> {
  const traits: TraitKey[] = ['N', 'E', 'O', 'A', 'C'];
  const scores: Record<TraitKey, number> = { N: 0, E: 0, O: 0, A: 0, C: 0 };

  for (const trait of traits) {
    const traitQuestions = questions.filter(q => q.trait === trait);
    let sum = 0;
    let count = 0;

    for (const q of traitQuestions) {
      const response = responses[String(q.id)];
      if (response !== undefined) {
        const score = q.keyed === '+' ? response : (6 - response);
        sum += score;
        count++;
      }
    }

    if (count > 0) {
      const avg = sum / count;
      scores[trait] = ((avg - 1) / 4) * 100;
    }
  }

  return scores;
}

export function calculatePeerScores(responses: Record<string, number>): Record<TraitKey, number> {
  return scoreBigFive(peerQuestions, responses);
}

export function calculateSelfMiniScores(responses: Record<string, number>): Record<TraitKey, number> {
  return scoreBigFive(selfMiniQuestions, responses);
}
