import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import { cn } from '../../ui/utils';
import { lightTheme } from '../../../../theme/lightTheme';

interface TimelinePlaybackProps {
    onTimeChange: (time: Date) => void;
    onClose: () => void;
}

export const TimelinePlayback: React.FC<TimelinePlaybackProps> = ({ onTimeChange, onClose }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState([50]); // 0 to 100

    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    // Example calculation for display
    const startTime = new Date();
    startTime.setHours(8, 0, 0, 0); // 8:00 AM
    const endTime = new Date();
    endTime.setHours(18, 0, 0, 0); // 6:00 PM

    const totalMs = endTime.getTime() - startTime.getTime();
    const currentMs = startTime.getTime() + (totalMs * (progress[0] / 100));
    const currentTime = new Date(currentMs);

    return (
        <div className={cn("absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl backdrop-blur-xl border shadow-2xl rounded-2xl p-4 flex flex-col gap-3 animate-in slide-in-from-bottom-8", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900/95 dark:border-slate-700")}>
            <div className="flex items-center justify-between px-2">
                <div className={cn("flex items-center gap-2", lightTheme.text.primary, "dark:text-slate-300")}>
                    <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span className="text-sm font-semibold">Historical Replay Mode</span>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className={cn("h-6 text-xs px-2", lightTheme.text.secondary, lightTheme.background.hover, "dark:text-slate-400 dark:hover:text-white")}>
                    Exit Replay
                </Button>
            </div>

            <div className="flex items-center gap-4 px-2">
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className={cn("w-8 h-8 rounded-full", lightTheme.text.secondary, lightTheme.background.hover, "dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800")}>
                        <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button
                        size="icon"
                        onClick={handlePlayPause}
                        className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-1" />}
                    </Button>
                    <Button variant="ghost" size="icon" className={cn("w-8 h-8 rounded-full", lightTheme.text.secondary, lightTheme.background.hover, "dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800")}>
                        <SkipForward className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex-1 flex flex-col gap-1.5 mt-1">
                    <Slider
                        value={progress}
                        onValueChange={(val) => {
                            setProgress(val);
                            const tMs = startTime.getTime() + (totalMs * (val[0] / 100));
                            onTimeChange(new Date(tMs));
                        }}
                        max={100}
                        step={0.1}
                        className="w-full"
                    />
                    <div className={cn("flex justify-between text-[10px] font-medium", lightTheme.text.muted, "dark:text-slate-500")}>
                        <span>08:00 AM</span>
                        <span className="text-blue-500 dark:text-blue-400 text-xs font-bold">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>06:00 PM</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
