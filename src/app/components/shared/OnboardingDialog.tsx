import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import {
  Users,
  BarChart3,
  Shield,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Activity
} from 'lucide-react';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';

interface OnboardingProps {
  open: boolean;
  onClose: () => void;
  userRole: 'admin' | 'hr';
}

export const OnboardingDialog: React.FC<OnboardingProps> = ({ open, onClose, userRole }) => {
  const [step, setStep] = useState(0);

  const hrSteps = [
    {
      icon: Users,
      title: 'Welcome to Workforce Analytics',
      description: 'Access comprehensive facial recognition attendance analytics in one place.',
      features: [
        'View real-time attendance via face recognition',
        'Analyze employee performance trends',
        'Generate and export detailed reports',
        'Get AI-powered insights',
      ],
    },
    {
      icon: BarChart3,
      title: 'Powerful Analytics',
      description: 'Gain deep insights into attendance patterns with advanced visualizations.',
      features: [
        'Multi-employee comparative analysis',
        'Department-level attendance comparisons',
        'Weekly and monthly patterns',
        'Punctuality and performance metrics',
      ],
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Insights',
      description: 'Let AI help you make data-driven workforce decisions.',
      features: [
        'Attendance anomaly detection',
        'Predictive analytics',
        'Automated recommendations',
        'Pattern recognition insights',
      ],
    },
  ];

  const adminSteps = [
    {
      icon: Shield,
      title: 'Welcome to System Administration',
      description: 'Full control over your facial recognition attendance system.',
      features: [
        'User lifecycle management',
        'Facial recognition device monitoring',
        'System health & accuracy tracking',
        'Comprehensive audit logs',
      ],
    },
    {
      icon: Users,
      title: 'User Management',
      description: 'Manage users, roles, and facial recognition enrollment.',
      features: [
        'Create and edit users',
        'Assign roles and permissions',
        'Monitor facial data registration status',
        'Track user activities',
      ],
    },
    {
      icon: Activity,
      title: 'System Monitoring',
      description: 'Keep your facial recognition system at peak performance.',
      features: [
        'CV device health monitoring',
        'Facial recognition accuracy tracking',
        'Real-time alert management',
        'Performance analytics',
      ],
    },
  ];

  const steps = userRole === 'hr' ? hrSteps : adminSteps;
  const currentStep = steps[step];
  const Icon = currentStep.icon;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">{currentStep.title}</DialogTitle>
              <DialogDescription className="text-base mt-1">
                {currentStep.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-6">
          <h4 className="font-semibold text-lg">Key Features:</h4>
          <div className="space-y-3">
            {currentStep.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className={cn(lightTheme.text.secondary, "dark:text-gray-300")}>{feature}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${index === step
                    ? 'w-8 bg-blue-600'
                    : 'w-2 bg-gray-300 dark:bg-gray-600'
                  }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSkip}>
              Skip
            </Button>
            <Button onClick={handleNext}>
              {step < steps.length - 1 ? (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                'Get Started'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
