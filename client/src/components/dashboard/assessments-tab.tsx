import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const assessments = [
  {
    id: 1,
    title: 'Leadership Style Assessment',
    description: 'Discover your natural leadership tendencies and areas for growth',
    status: 'completed',
    completedAt: '2024-01-15',
    questions: 25,
  },
  {
    id: 2,
    title: 'Communication Profile',
    description: 'Understand how you communicate and connect with others',
    status: 'completed',
    completedAt: '2024-01-10',
    questions: 30,
  },
  {
    id: 3,
    title: 'Emotional Intelligence (EQ)',
    description: 'Measure your ability to understand and manage emotions',
    status: 'in-progress',
    progress: 60,
    questions: 40,
  },
  {
    id: 4,
    title: 'Conflict Resolution Style',
    description: 'Learn how you naturally approach and resolve conflicts',
    status: 'not-started',
    questions: 20,
  },
];

export default function AssessmentsTab() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a] tracking-tight" data-testid="text-assessments-title">
            My Assessments
          </h1>
          <p className="text-gray-500 mt-1">
            Complete assessments to build your personality profile
          </p>
        </div>
        <Button className="bg-[#0f172a] gap-2" data-testid="button-new-assessment">
          <Plus className="w-4 h-4" />
          New Assessment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {assessments.map((assessment) => (
          <Card key={assessment.id} className="bg-white border-[#0f172a]/10" data-testid={`card-assessment-${assessment.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0f172a]/5 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-[#0f172a]" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-[#0f172a]">
                      {assessment.title}
                    </CardTitle>
                    <CardDescription className="text-sm mt-0.5">
                      {assessment.questions} questions
                    </CardDescription>
                  </div>
                </div>
                <StatusBadge status={assessment.status} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">{assessment.description}</p>
              
              {assessment.status === 'completed' && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  Completed on {new Date(assessment.completedAt!).toLocaleDateString()}
                </div>
              )}
              
              {assessment.status === 'in-progress' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Progress</span>
                    <span className="text-[#0f172a] font-medium">{assessment.progress}%</span>
                  </div>
                  <div className="h-2 bg-[#0f172a]/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#0f172a] rounded-full transition-all duration-300"
                      style={{ width: `${assessment.progress}%` }}
                    />
                  </div>
                </div>
              )}
              
              {assessment.status === 'not-started' && (
                <Button variant="outline" size="sm" className="w-full border-[#0f172a]/20" data-testid={`button-start-assessment-${assessment.id}`}>
                  Start Assessment
                </Button>
              )}
              
              {assessment.status === 'in-progress' && (
                <Button size="sm" className="w-full bg-[#0f172a] mt-3" data-testid={`button-continue-assessment-${assessment.id}`}>
                  Continue
                </Button>
              )}
              
              {assessment.status === 'completed' && (
                <Button variant="outline" size="sm" className="w-full border-[#0f172a]/20 mt-3" data-testid={`button-view-results-${assessment.id}`}>
                  View Results
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 border-0">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </Badge>
      );
    case 'in-progress':
      return (
        <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700 border-0">
          <Clock className="w-3 h-3" />
          In Progress
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="gap-1 bg-gray-100 text-gray-600 border-0">
          <AlertCircle className="w-3 h-3" />
          Not Started
        </Badge>
      );
  }
}
