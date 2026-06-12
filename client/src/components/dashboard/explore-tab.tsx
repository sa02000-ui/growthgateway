import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Users, 
  Lightbulb, 
  Heart, 
  BookOpen, 
  ExternalLink,
  Award,
  Lock,
  CheckCircle2
} from 'lucide-react';

interface Assessment {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  duration: string;
  category: string;
  available: boolean;
  scientificSource?: {
    name: string;
    reliability: string;
  };
}

const assessments: Assessment[] = [
  {
    id: 'ipip-neo-120',
    name: 'IPIP-NEO-120',
    description: 'The gold standard Big Five personality assessment measuring Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism.',
    questionCount: 120,
    duration: '15-20 min',
    category: 'Core Personality',
    available: true,
    scientificSource: {
      name: 'International Personality Item Pool',
      reliability: "Internal reliability (Cronbach's α): 0.85–0.92",
    },
  },
  {
    id: 'big-five-60',
    name: 'Big Five-60',
    description: 'A shorter version of the Big Five assessment for quick personality insights.',
    questionCount: 60,
    duration: '8-10 min',
    category: 'Core Personality',
    available: false,
  },
  {
    id: 'eq-assessment',
    name: 'Emotional Intelligence (EQ)',
    description: 'Measure your ability to understand, use, and manage emotions effectively.',
    questionCount: 40,
    duration: '10-12 min',
    category: 'Behavioral & Social',
    available: false,
  },
  {
    id: 'conflict-styles',
    name: 'Conflict Resolution Styles',
    description: 'Discover your preferred approach to handling disagreements and conflicts.',
    questionCount: 30,
    duration: '8-10 min',
    category: 'Behavioral & Social',
    available: false,
  },
  {
    id: 'work-productivity',
    name: 'Work Style & Productivity',
    description: 'Understand your work preferences, focus patterns, and productivity drivers.',
    questionCount: 45,
    duration: '12-15 min',
    category: 'Cognitive & Productivity',
    available: false,
  },
  {
    id: 'decision-making',
    name: 'Decision-Making Style',
    description: 'Explore how you approach decisions - analytical, intuitive, or collaborative.',
    questionCount: 35,
    duration: '10-12 min',
    category: 'Cognitive & Productivity',
    available: false,
  },
  {
    id: 'resilience',
    name: 'Resilience Assessment',
    description: 'Measure your capacity to recover from setbacks and adapt to change.',
    questionCount: 25,
    duration: '6-8 min',
    category: 'Well-being & Resilience',
    available: false,
  },
  {
    id: 'burnout-risk',
    name: 'Burnout Risk Indicator',
    description: 'Evaluate your current stress levels and risk factors for burnout.',
    questionCount: 22,
    duration: '5-7 min',
    category: 'Well-being & Resilience',
    available: false,
  },
];

const categories = [
  { name: 'Core Personality', icon: Brain, description: 'Foundational personality traits' },
  { name: 'Behavioral & Social', icon: Users, description: 'Interpersonal dynamics' },
  { name: 'Cognitive & Productivity', icon: Lightbulb, description: 'Work and thinking styles' },
  { name: 'Well-being & Resilience', icon: Heart, description: 'Mental health indicators' },
];

export default function ExploreTab() {
  const groupedAssessments = categories.map(category => ({
    ...category,
    assessments: assessments.filter(a => a.category === category.name),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight" data-testid="text-explore-title">
          Explore Assessments
        </h1>
        <p className="text-muted-foreground mt-1">
          Discover insights about yourself with our curated test library
        </p>
      </div>

      {groupedAssessments.map((category) => (
        <div key={category.name} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <category.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{category.name}</h2>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {category.assessments.map((assessment) => (
              <Card 
                key={assessment.id} 
                className={`bg-card border-border ${!assessment.available ? 'opacity-70' : ''}`}
                data-testid={`card-assessment-${assessment.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2 flex-wrap">
                        {assessment.name}
                        {assessment.scientificSource && (
                          <Badge 
                            variant="outline" 
                            className="gap-1 text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                            data-testid="badge-scientific-source"
                          >
                            <Award className="w-3 h-3" />
                            Scientific Source
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm">
                        {assessment.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {assessment.questionCount} questions
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {assessment.duration}
                    </Badge>
                  </div>

                  {assessment.scientificSource && (
                    <div className="p-3 bg-muted/50 rounded-md space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                        <BookOpen className="w-3.5 h-3.5 text-primary" />
                        {assessment.scientificSource.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          {assessment.scientificSource.reliability}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    {assessment.available ? (
                      <Button className="w-full gap-2" data-testid={`button-start-${assessment.id}`}>
                        Start Assessment
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full gap-2" disabled>
                        <Lock className="w-4 h-4" />
                        Coming Soon
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
