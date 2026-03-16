import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';
import { toast } from 'sonner';
import {
  Camera,
  Upload,
  ScanFace,
  Trash2,
  X,
  Info,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { authConfig } from '../../config/authConfig';
import { useAuth } from '../../contexts/AuthContext';

export interface EnrollmentEmbedding {
  id: string;
  modelVersion?: string;
  qualityScore?: number;
  isPrimary?: boolean;
  enrolledAt?: string;
}

export interface EnrollmentStatus {
  enrolled: boolean;
  embeddingCount: number;
  embeddings: EnrollmentEmbedding[];
}

interface FaceEnrollButtonProps {
  employeeId: string;
  employeeName: string;
  enrolled?: boolean;
  onEnrolled?: (newStatus: EnrollmentStatus) => void;
  compact?: boolean;
}

type PanelState = 'idle' | 'selecting' | 'preview' | 'uploading' | 'success' | 'error';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const FaceEnrollButton: React.FC<FaceEnrollButtonProps> = ({
  employeeId,
  employeeName,
  enrolled,
  onEnrolled,
  compact,
}) => {
  const { accessToken } = useAuth();
  const [panelState, setPanelState] = useState<PanelState>('idle');
  const [isEnrolled, setIsEnrolled] = useState(authConfig.mode === 'mock' ? false : !!enrolled);
  const [status, setStatus] = useState<EnrollmentStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const primaryEmbedding = useMemo(() => {
    if (!status?.embeddings?.length) return null;
    const primary = status.embeddings.find(e => e.isPrimary);
    return primary || status.embeddings[0];
  }, [status]);

  useEffect(() => {
    if (authConfig.mode === 'mock') return;
    if (!accessToken) return;
    let isMounted = true;
    const loadStatus = async () => {
      try {
        const resp = await fetch(`${authConfig.apiBaseUrl}/employees/${employeeId}/enroll-face`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!resp.ok) return;
        const data = await resp.json();
        if (!isMounted) return;
        const newStatus: EnrollmentStatus = {
          enrolled: !!data.enrolled,
          embeddingCount: data.embeddingCount || 0,
          embeddings: data.embeddings || [],
        };
        setStatus(newStatus);
        setIsEnrolled(!!newStatus.enrolled);
      } catch {
        // Silent fail; UI still usable
      }
    };
    loadStatus();
    return () => {
      isMounted = false;
    };
  }, [accessToken, employeeId]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [stream]);

  if (compact) {
    return isEnrolled ? (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        <ScanFace className="w-3 h-3 mr-1" />
        Face Enrolled
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        Not Enrolled
      </Badge>
    );
  }

  const resetToIdle = () => {
    setPanelState('idle');
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
  };

  const validateFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Unsupported file type', { description: 'Upload a JPG, PNG, or WEBP image.' });
      return false;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('File too large', { description: 'Maximum size is 5 MB.' });
      return false;
    }
    return true;
  };

  const handleFile = (file: File) => {
    if (!validateFile(file)) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPanelState('preview');
  };

  const handleBrowse = () => {
    inputRef.current?.click();
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const startCamera = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      setStream(media);
      setPanelState('selecting');
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        await videoRef.current.play();
      }
    } catch {
      toast.error('Camera unavailable', { description: 'Allow camera access or upload a photo instead.' });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    setStream(null);
  };

  const captureFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'webcam.jpg', { type: 'image/jpeg' });
      handleFile(file);
      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  const handleEnroll = async () => {
    if (!selectedFile) return;
    setPanelState('uploading');
    setErrorMessage(null);

    if (authConfig.mode === 'mock') {
      setTimeout(() => {
        const newStatus: EnrollmentStatus = {
          enrolled: true,
          embeddingCount: 1,
          embeddings: [],
        };
        setIsEnrolled(true);
        setStatus(newStatus);
        setPanelState('success');
        onEnrolled?.(newStatus);
      }, 1500);
      return;
    }

    try {
      const form = new FormData();
      form.append('photo', selectedFile);
      const resp = await fetch(`${authConfig.apiBaseUrl}/employees/${employeeId}/enroll-face`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });

      if (resp.status === 503) {
        throw new Error('The AI sidecar is not reachable. Ensure the Jetson is connected and frs-edge service is running.');
      }

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const msg = data?.message || 'Enrollment failed';
        if (resp.status === 422) {
          if (msg.toLowerCase().includes('no face')) {
            throw new Error('No face detected - use a clear, front-facing photo');
          }
          if (msg.toLowerCase().includes('multiple')) {
            throw new Error('Multiple faces detected - photo must contain only this employee.');
          }
        }
        throw new Error(msg);
      }

      const data = await resp.json().catch(() => ({}));
      const newStatus: EnrollmentStatus = {
        enrolled: true,
        embeddingCount: data.embeddingCount || 1,
        embeddings: data.embeddings || [],
      };
      setIsEnrolled(true);
      setStatus(newStatus);
      setPanelState('success');
      onEnrolled?.(newStatus);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Enrollment failed';
      setErrorMessage(msg);
      setPanelState('error');
    }
  };

  const handleDelete = async () => {
    if (authConfig.mode === 'mock') {
      setIsEnrolled(false);
      setStatus(null);
      resetToIdle();
      return;
    }
    try {
      const resp = await fetch(`${authConfig.apiBaseUrl}/employees/${employeeId}/enroll-face`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!resp.ok) throw new Error('Failed to remove enrollment');
      toast.success('Enrollment removed', { description: `${employeeName} can be re-enrolled now.` });
      setIsEnrolled(false);
      setStatus(null);
      resetToIdle();
    } catch (e) {
      toast.error('Delete failed', { description: e instanceof Error ? e.message : 'Unknown error' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Info row when enrolled */}
      {isEnrolled && panelState === 'idle' && (
        <div className={cn("p-3 rounded-lg border flex items-start gap-3", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/40 dark:border-border")}>
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
          <div className="flex-1">
            <p className={cn("text-xs font-bold", lightTheme.text.primary, "dark:text-white")}>Face enrolled</p>
            <p className={cn("text-[11px]", lightTheme.text.muted, "dark:text-slate-500")}>
              {status?.embeddingCount ?? 1} photo(s) registered
              {primaryEmbedding?.qualityScore ? ` - Quality ${primaryEmbedding.qualityScore}` : ''}
              {primaryEmbedding?.enrolledAt ? ` - ${new Date(primaryEmbedding.enrolledAt).toLocaleDateString()}` : ''}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-red-500 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      {panelState === 'idle' && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={cn(
            "border border-dashed rounded-xl p-6 text-center space-y-4",
            lightTheme.border.default,
            lightTheme.background.card,
            "dark:bg-slate-900 dark:border-border"
          )}
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <Camera className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className={cn("text-sm font-semibold", lightTheme.text.primary, "dark:text-white")}>Drag & drop a face photo</p>
            <p className={cn("text-xs", lightTheme.text.muted, "dark:text-slate-500")}>JPG, PNG, or WEBP up to 5 MB</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="outline" onClick={handleBrowse}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </Button>
            <Button onClick={startCamera}>
              <Camera className="w-4 h-4 mr-2" />
              Use Camera
            </Button>
          </div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300 px-3 py-1 rounded-full">
            <Info className="w-3 h-3" />
            One face only - No sunglasses - Front-facing - Good lighting
          </div>
        </div>
      )}

      {panelState === 'selecting' && (
        <div className={cn("border rounded-xl p-4 space-y-4", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
          <div className="relative overflow-hidden rounded-lg">
            <video ref={videoRef} className="w-full rounded-lg" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-64 border-2 border-emerald-400/70 rounded-full bg-emerald-500/5" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={captureFrame}>
              <Camera className="w-4 h-4 mr-2" />
              Capture
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => { stopCamera(); resetToIdle(); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {panelState === 'preview' && previewUrl && (
        <div className={cn("border rounded-xl p-4 space-y-4", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
          <div className="relative">
            <img src={previewUrl} alt="Preview" className="w-full rounded-lg object-cover" />
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-white/80 dark:bg-slate-800/80" onClick={resetToIdle}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={handleEnroll} className="w-full">
            {isEnrolled ? 'Re-Enroll Face' : 'Enroll Face'}
          </Button>
        </div>
      )}

      {panelState === 'uploading' && (
        <div className={cn("border rounded-xl p-4 space-y-4", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className={cn(lightTheme.text.secondary, "dark:text-slate-300")}>Enrolling - sending to sidecar...</span>
          </div>
          <Progress value={65} className="h-2" />
          <Button disabled className="w-full">
            Enrolling...
          </Button>
        </div>
      )}

      {panelState === 'success' && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
            Enrollment successful - {employeeName} will be recognised by cameras within 30 seconds.
          </div>
          <Button variant="outline" onClick={resetToIdle}>
            Add Another Photo
          </Button>
        </div>
      )}

      {panelState === 'error' && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <span className="text-sm">{errorMessage || 'Enrollment failed. Try again.'}</span>
          </div>
          <Button variant="outline" onClick={() => setPanelState('preview')}>
            Try Again
          </Button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.currentTarget.value = '';
        }}
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
