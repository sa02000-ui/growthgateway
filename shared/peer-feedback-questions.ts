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

export const likertScale = [
  { value: 1, label: "Very Inaccurate" },
  { value: 2, label: "Moderately Inaccurate" },
  { value: 3, label: "Neither" },
  { value: 4, label: "Moderately Accurate" },
  { value: 5, label: "Very Accurate" },
];

export const traitNames: Record<TraitKey, string> = {
  N: "Neuroticism",
  E: "Extraversion",
  O: "Openness",
  A: "Agreeableness",
  C: "Conscientiousness",
};

export function calculatePeerScores(responses: Record<string, number>): Record<TraitKey, number> {
  const traits: TraitKey[] = ['N', 'E', 'O', 'A', 'C'];
  const scores: Record<TraitKey, number> = { N: 0, E: 0, O: 0, A: 0, C: 0 };
  
  for (const trait of traits) {
    const traitQuestions = peerQuestions.filter(q => q.trait === trait);
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
