type TraitKey = 'N' | 'E' | 'O' | 'A' | 'C';

export interface PeerQuestion {
  id: number;
  text: string;
  trait: TraitKey;
  keyed: '+' | '-';
}

export const peerQuestions: PeerQuestion[] = [
  { id: 1, text: "Worry about things.", trait: "N", keyed: "+" },
  { id: 6, text: "Am relaxed most of the time.", trait: "N", keyed: "-" },
  { id: 11, text: "Get stressed out easily.", trait: "N", keyed: "+" },
  { id: 16, text: "Rarely get irritated.", trait: "N", keyed: "-" },
  { id: 21, text: "Often feel blue.", trait: "N", keyed: "+" },
  { id: 26, text: "Seldom feel blue.", trait: "N", keyed: "-" },
  
  { id: 2, text: "Make friends easily.", trait: "E", keyed: "+" },
  { id: 7, text: "Keep in the background.", trait: "E", keyed: "-" },
  { id: 12, text: "Am the life of the party.", trait: "E", keyed: "+" },
  { id: 17, text: "Don't talk a lot.", trait: "E", keyed: "-" },
  { id: 22, text: "Know how to captivate people.", trait: "E", keyed: "+" },
  { id: 27, text: "Would describe my experiences as somewhat dull.", trait: "E", keyed: "-" },
  
  { id: 3, text: "Have a vivid imagination.", trait: "O", keyed: "+" },
  { id: 8, text: "Am not interested in abstract ideas.", trait: "O", keyed: "-" },
  { id: 13, text: "Enjoy hearing new ideas.", trait: "O", keyed: "+" },
  { id: 18, text: "Avoid philosophical discussions.", trait: "O", keyed: "-" },
  { id: 23, text: "Carry the conversation to a higher level.", trait: "O", keyed: "+" },
  { id: 28, text: "Do not like art.", trait: "O", keyed: "-" },
  
  { id: 4, text: "Have a good word for everyone.", trait: "A", keyed: "+" },
  { id: 9, text: "Have a sharp tongue.", trait: "A", keyed: "-" },
  { id: 14, text: "Believe that others have good intentions.", trait: "A", keyed: "+" },
  { id: 19, text: "Cut others to pieces.", trait: "A", keyed: "-" },
  { id: 24, text: "Make people feel at ease.", trait: "A", keyed: "+" },
  { id: 29, text: "Am not interested in other people's problems.", trait: "A", keyed: "-" },
  
  { id: 5, text: "Am always prepared.", trait: "C", keyed: "+" },
  { id: 10, text: "Waste my time.", trait: "C", keyed: "-" },
  { id: 15, text: "Get chores done right away.", trait: "C", keyed: "+" },
  { id: 20, text: "Find it difficult to get down to work.", trait: "C", keyed: "-" },
  { id: 25, text: "Carry out my plans.", trait: "C", keyed: "+" },
  { id: 30, text: "Do just enough work to get by.", trait: "C", keyed: "-" },
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
