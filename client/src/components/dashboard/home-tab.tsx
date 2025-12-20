import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Info, TrendingUp, Target, Users, BarChart3 } from 'lucide-react';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const perceptionData = [
  { trait: 'Leadership', self: 75, desired: 90, peer: 65, actual: 70 },
  { trait: 'Communication', self: 80, desired: 85, peer: 72, actual: 76 },
  { trait: 'Empathy', self: 70, desired: 80, peer: 85, actual: 78 },
  { trait: 'Creativity', self: 85, desired: 90, peer: 70, actual: 75 },
  { trait: 'Resilience', self: 65, desired: 85, peer: 60, actual: 68 },
  { trait: 'Adaptability', self: 78, desired: 88, peer: 75, actual: 80 },
];

const stats = [
  { label: 'Assessments Completed', value: '3', icon: Target, change: '+1 this month' },
  { label: 'Peer Responses', value: '12', icon: Users, change: '+4 this week' },
  { label: 'Growth Score', value: '72%', icon: TrendingUp, change: '+8% improvement' },
];

export default function HomeTab() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a] tracking-tight" data-testid="text-dashboard-title">
          The Perception Gap
        </h1>
        <p className="text-gray-500 mt-1">
          Understand how your self-perception aligns with reality
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-white border-[#0f172a]/10">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-[#0f172a] mt-1" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{stat.change}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-[#0f172a]/5 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-[#0f172a]" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white border-[#0f172a]/10">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-xl font-semibold text-[#0f172a] flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Perception Gap Analysis
              </CardTitle>
              <CardDescription className="mt-1">
                Compare how you see yourself vs. how others perceive you
              </CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="gap-1 cursor-help" data-testid="badge-coming-soon">
                  <Info className="w-3 h-3" />
                  Coming Soon
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-sm">
                  This chart tracks the gaps between four realities: your self-perception, 
                  your desired state, how peers perceive you, and your actual assessment results. 
                  Full functionality coming soon!
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-[300px] md:h-[400px]" data-testid="chart-perception-gap">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={perceptionData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis 
                  dataKey="trait" 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickLine={false}
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickCount={5}
                />
                <Radar
                  name="Self-Perception"
                  dataKey="self"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Radar
                  name="Desired"
                  dataKey="desired"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.1}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <Radar
                  name="Peer Perception"
                  dataKey="peer"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Radar
                  name="Actual Results"
                  dataKey="actual"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '20px',
                    fontSize: '12px'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 p-4 rounded-lg bg-[#0f172a]/5 border border-[#0f172a]/10">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[#0f172a] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#0f172a]">Understanding Your Perception Gap</p>
                <p className="text-sm text-gray-500 mt-1">
                  The closer your self-perception (blue) aligns with peer perception (purple) and actual results (orange), 
                  the more accurate your self-awareness. Your desired state (green) shows where you want to grow.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
