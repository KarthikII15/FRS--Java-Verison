import React from "react";
import { Card, CardContent } from "../ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "../ui/utils";
import { lightTheme } from "../../../theme/lightTheme";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  symbol?: string; // For emojis or custom symbols
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  colorClass?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  symbol,
  trend,
  description,
  colorClass,
}) => {
  // Map specific text color classes to their corresponding background classes
  // This is required because Tailwind CSS cannot interpret dynamic string replacements
  // like colorClass.replace('text-', 'bg-') during the build process, resulting in missing styles.
  const textColorToBgMap: Record<string, string> = {
    'text-blue-500': 'bg-blue-500',
    'text-emerald-500': 'bg-emerald-500',
    'text-amber-500': 'bg-amber-500',
    'text-violet-500': 'bg-violet-500',
    'text-indigo-500': 'bg-indigo-500',
    'text-orange-500': 'bg-orange-500',
    'text-teal-500': 'bg-teal-500',
    'text-rose-500': 'bg-rose-500',
    'text-green-500': 'bg-green-500',
    'text-red-500': 'bg-red-500',
    'text-yellow-500': 'bg-yellow-500',
    'text-purple-500': 'bg-purple-500',
  };

  const bgColorClass = colorClass ? textColorToBgMap[colorClass] || colorClass.replace("text-", "bg-") : null;

  return (
    <Card className={cn(
      "hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group",
      lightTheme.metricCard.container,
      "dark:bg-card dark:border-border/40"
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={cn(
              "text-sm font-medium mb-1 tracking-wide",
              lightTheme.metricCard.title,
              "dark:text-slate-400"
            )}>
              {title}
            </p>
            <p className={cn(
              "text-4xl font-bold tracking-tight",
              lightTheme.metricCard.value,
              "dark:text-white"
            )}>
              {value}
            </p>
            {trend && (
              <div className="flex items-center gap-1.5 mt-2">
                <span
                  className={cn(
                    "text-sm font-semibold tracking-wide",
                    trend.isPositive ? lightTheme.status.success : lightTheme.status.error,
                    "dark:text-[#00E676] dark:text-rose-500"
                  )}
                >
                  {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
                <span className={cn(
                  "text-sm font-medium ml-1",
                  lightTheme.text.muted,
                  "dark:text-slate-500"
                )}>
                  vs last period
                </span>
              </div>
            )}
            {description && !trend && (
              <p className={cn(
                "text-sm font-medium mt-2",
                lightTheme.text.muted,
                "dark:text-slate-500"
              )}>
                {description}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center">
            <div
              className={cn(
                "w-14 h-14 flex items-center justify-center rounded-2xl transition-transform group-hover:scale-105 duration-300",
                bgColorClass ? cn("shadow-lg text-white", bgColorClass) : cn(lightTheme.metricCard.iconBg, "dark:bg-transparent")
              )}
            >
              {symbol ? (
                <span className="text-2xl">{symbol}</span>
              ) : Icon ? (
                <Icon
                  className={cn(
                    "w-7 h-7",
                    bgColorClass ? "text-white/90" : cn(lightTheme.text.muted, "dark:text-slate-400")
                  )}
                />
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


