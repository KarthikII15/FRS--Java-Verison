import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { AIInsight } from '../../types';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, FileText, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';

interface AIInsightsPanelProps {
  insights: AIInsight[];
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ insights }) => {
  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'anomaly':
        return AlertTriangle;
      case 'prediction':
        return TrendingUp;
      case 'recommendation':
        return Lightbulb;
      case 'summary':
        return FileText;
      default:
        return Sparkles;
    }
  };

  const getPriorityColor = (priority: AIInsight['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    }
  };

  const getTypeColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'anomaly':
        return 'text-red-600';
      case 'prediction':
        return 'text-purple-600';
      case 'recommendation':
        return 'text-green-600';
      case 'summary':
        return 'text-blue-600';
    }
  };

  return (
    <div className="space-y-6">
      <Card className={cn("bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-2", lightTheme.border.default, "dark:border-border")}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>AI-Powered Insights</CardTitle>
              <p className={cn("text-sm mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>
                Intelligent analysis and recommendations for your workforce
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6">
        {insights.map((insight) => {
          const Icon = getInsightIcon(insight.type);

          return (
            <Card key={insight.id} className={cn("hover:shadow-lg transition-shadow", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                    getTypeColor(insight.type).replace('text-', 'bg-') + '/10'
                  )}>
                    <Icon className={cn('w-6 h-6', getTypeColor(insight.type))} />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={cn("font-semibold text-lg", lightTheme.text.primary, "dark:text-white")}>{insight.title}</h3>
                          <Badge className={getPriorityColor(insight.priority)}>
                            {insight.priority}
                          </Badge>
                        </div>
                        <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>
                          {new Date(insight.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {insight.type}
                      </Badge>
                    </div>

                    <p className={cn(lightTheme.text.primary, "dark:text-gray-300")}>
                      {insight.description}
                    </p>

                    {insight.actions && insight.actions.length > 0 && (
                      <div className="space-y-2">
                        <p className={cn("text-sm font-medium", lightTheme.text.primary, "dark:text-gray-100")}>
                          Recommended Actions:
                        </p>
                        <div className="space-y-2">
                          {insight.actions.map((action, index) => (
                            <div
                              key={index}
                              className={cn("flex items-center gap-2 text-sm", lightTheme.text.secondary, "dark:text-gray-400")}
                            >
                              <ArrowRight className="w-4 h-4 text-blue-600" />
                              <span>{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="default" onClick={() => toast("Action Initiated", { description: "Opening resolution workflow for this insight." })}>
                        Take Action
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toast("Details View", { description: "Displaying expanded data points for this insight." })}>
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Natural Language Query Interface */}
      <Card className={cn("border-2 border-dashed", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <Sparkles className="w-8 h-8 mx-auto text-blue-600" />
            <div>
              <h3 className={cn("font-semibold text-lg mb-2", lightTheme.text.primary, "dark:text-white")}>Ask AI Anything</h3>
              <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>
                Try: "Show me employees with irregular patterns last month" or "Which department has the best attendance?"
              </p>
            </div>
            <div className="flex gap-2 max-w-2xl mx-auto">
              <input
                type="text"
                placeholder="Ask a question about your workforce..."
                className={cn("flex-1 px-4 py-2 rounded-lg border", lightTheme.background.secondary, lightTheme.border.input, lightTheme.text.primary, "dark:bg-gray-800 dark:border-gray-600 dark:text-white")}
              />
              <Button onClick={() => toast.success("Query Processing", { description: "Analyzing semantic context to fetch relevant insight..." })}>
                <Sparkles className="w-4 h-4 mr-2" />
                Ask
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

