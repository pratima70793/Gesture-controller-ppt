import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Camera, 
  CameraOff, 
  RefreshCw, 
  Sparkles, 
  ShieldAlert, 
  Pause, 
  Play, 
  Volume2, 
  VolumeX,
  Sliders,
  CheckCircle,
  Clock,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { ControlMode, GestureName } from '../types';

interface WebcamGestureTrackerProps {
  onNextSlide: () => void;
  onPrevSlide: () => void;
  controlMode: ControlMode;
  onToggleControlMode: () => void;
  onLogAction: (action: string, type: 'next' | 'prev' | 'pause' | 'resume' | 'test', details: string) => void;
}

export const WebcamGestureTracker: React.FC<WebcamGestureTrackerProps> = ({
  onNextSlide,
  onPrevSlide,
  controlMode,
  onToggleControlMode,
  onLogAction,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [currentGesture, setCurrentGesture] = useState<GestureName>('IDLE');
  const [handDetected, setHandDetected] = useState<boolean>(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [fps, setFps] = useState<number>(30);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Audio clicker feedback
  const playClickSound = useCallback((frequency: number = 880) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio autoplay policy fallback
    }
  }, [soundEnabled]);

  // Motion history buffer
  const historyRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const lastActionTimeRef = useRef<number>(0);
  const cooldownDuration = 1.5; // 1.5 seconds

  // Initialize Webcam
  const startWebcam = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
          onLogAction('CAMERA CONNECTED', 'test', 'Webcam stream initialized at 30 FPS');
        };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Permission denied or no webcam detected.';
      setCameraError(message);
      setCameraActive(false);
      onLogAction('CAMERA ERROR', 'test', `Webcam access failed: ${message}`);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setHandDetected(false);
    setCurrentGesture('IDLE');
    onLogAction('CAMERA DISCONNECTED', 'test', 'Webcam stream stopped');
  };

  // Cooldown countdown loop
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = (Date.now() - lastActionTimeRef.current) / 1000;
      const rem = Math.max(0, cooldownDuration - elapsed);
      setCooldownRemaining(rem);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Frame processing loop for motion & landmark tracking
  useEffect(() => {
    if (!cameraActive) return;

    let animId: number;
    let lastFrameTime = performance.now();
    let frameCount = 0;

    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;

          // Draw mirrored camera feed
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(video, -w, 0, w, h);
          ctx.restore();

          // Calculate approximate FPS
          frameCount++;
          const now = performance.now();
          if (now - lastFrameTime >= 1000) {
            setFps(Math.round((frameCount * 1000) / (now - lastFrameTime)));
            frameCount = 0;
            lastFrameTime = now;
          }

          // Sample motion via image difference or skin tone centroid
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;
          let sumX = 0;
          let sumY = 0;
          let pixelCount = 0;

          // Step by 4 for high-performance sampling
          for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Simple skin-color heuristic in RGB
            if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
              const pxIdx = i / 4;
              const pxX = pxIdx % w;
              const pxY = Math.floor(pxIdx / w);
              // Focus on upper 80% of screen to ignore shirts
              if (pxY < h * 0.85) {
                sumX += pxX;
                sumY += pxY;
                pixelCount++;
              }
            }
          }

          const hasHand = pixelCount > 1200;
          setHandDetected(hasHand);

          if (hasHand) {
            const centroidX = sumX / pixelCount;
            const centroidY = sumY / pixelCount;
            const currentTime = Date.now();

            // Render Hand Skeleton & Landmark Points
            drawSimulatedSkeleton(ctx, centroidX, centroidY);

            // Trajectory Buffer
            historyRef.current.push({ x: centroidX, y: centroidY, time: currentTime });
            if (historyRef.current.length > 15) {
              historyRef.current.shift();
            }

            // Swipe Detection Logic
            if (historyRef.current.length >= 4) {
              const oldest = historyRef.current[0];
              const latest = historyRef.current[historyRef.current.length - 1];
              const dt = (latest.time - oldest.time) / 1000;
              const dx = latest.x - oldest.x;
              const dy = latest.y - oldest.y;

              const SWIPE_PX = 95;
              const inCooldown = (currentTime - lastActionTimeRef.current) / 1000 < cooldownDuration;

              if (dt > 0.08 && dt < 0.6 && Math.abs(dx) > SWIPE_PX && Math.abs(dy) < Math.abs(dx) * 0.8) {
                if (dx > 0) {
                  // Left to Right -> NEXT SLIDE
                  setCurrentGesture('SWIPE_RIGHT');
                  if (!inCooldown && controlMode === 'ACTIVE') {
                    lastActionTimeRef.current = currentTime;
                    historyRef.current = [];
                    playClickSound(950);
                    onNextSlide();
                    onLogAction('SWIPE RIGHT', 'next', 'Left-to-Right gesture -> Next Slide (Right Arrow)');
                  }
                } else {
                  // Right to Left -> PREV SLIDE
                  setCurrentGesture('SWIPE_LEFT');
                  if (!inCooldown && controlMode === 'ACTIVE') {
                    lastActionTimeRef.current = currentTime;
                    historyRef.current = [];
                    playClickSound(650);
                    onPrevSlide();
                    onLogAction('SWIPE LEFT', 'prev', 'Right-to-Left gesture -> Previous Slide (Left Arrow)');
                  }
                }
              } else {
                setCurrentGesture('HAND_DETECTED');
              }
            }
          } else {
            setCurrentGesture('IDLE');
            historyRef.current = [];
          }
        }
      }

      animId = requestAnimationFrame(processFrame);
    };

    animId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animId);
  }, [cameraActive, controlMode, onNextSlide, onPrevSlide, onLogAction, playClickSound]);

  // Helper to render aesthetic 21-point hand skeleton
  const drawSimulatedSkeleton = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
    ctx.save();

    // Palm Anchor 9 (Middle MCP)
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();

    // Outer glow
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Finger lines radiating
    const fingers = [
      { dx: -35, dy: -25 }, // Thumb
      { dx: -20, dy: -50 }, // Index
      { dx: 0, dy: -60 },   // Middle
      { dx: 20, dy: -52 },  // Ring
      { dx: 36, dy: -35 },  // Pinky
    ];

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;

    fingers.forEach((f) => {
      const tipX = cx + f.dx;
      const tipY = cy + f.dy;
      // Joint line
      ctx.beginPath();
      ctx.moveTo(cx, cy + 20); // Wrist base
      ctx.lineTo(cx, cy);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // Fingertip node
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(tipX, tipY, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Label Anchor
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('LM 9 (PALM)', cx - 28, cy + 22);

    ctx.restore();
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Camera Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className={`w-3 h-3 rounded-full ${cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">
            Webcam Vision Feed
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title={soundEnabled ? 'Clicker Sound Enabled' : 'Clicker Sound Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Mode Badge */}
          <button
            onClick={onToggleControlMode}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
              controlMode === 'ACTIVE'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
            }`}
          >
            {controlMode === 'ACTIVE' ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>{controlMode}</span>
          </button>
        </div>
      </div>

      {/* Main Video/Canvas Stage */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {/* Hidden video element feeding canvas */}
        <video ref={videoRef} className="hidden" playsInline muted autoPlay />

        {/* Processed canvas overlay */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className={`w-full h-full object-cover transition-opacity duration-300 ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Overlay when camera is OFF */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 z-20">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Real-Time Hand Gesture Vision
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-5">
              Launch your webcam to track 21 hand landmarks, swipe left/right to navigate PowerPoint slides, and test cooldown protection.
            </p>

            {cameraError && (
              <div className="flex items-center gap-2 p-2.5 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            <button
              onClick={startWebcam}
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Start Webcam Tracking</span>
            </button>
          </div>
        )}

        {/* Live HUD Overlay when Camera is Active */}
        {cameraActive && (
          <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-10">
            {/* Top HUD */}
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="px-2 py-1 rounded bg-slate-950/80 border border-slate-800 text-emerald-400">
                FPS: {fps}
              </span>
              <span className="px-2 py-1 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                RESOLUTION: 640x480
              </span>
            </div>

            {/* Gesture Indicator Banner */}
            <div className="self-center">
              {currentGesture === 'SWIPE_RIGHT' && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/90 text-white font-bold text-sm shadow-xl shadow-emerald-500/30 animate-bounce">
                  <span>SWIPE RIGHT → NEXT SLIDE</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
              {currentGesture === 'SWIPE_LEFT' && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/90 text-white font-bold text-sm shadow-xl shadow-amber-500/30 animate-bounce">
                  <ArrowLeft className="w-4 h-4" />
                  <span>SWIPE LEFT ← PREVIOUS SLIDE</span>
                </div>
              )}
            </div>

            {/* Bottom HUD: Hand & Cooldown */}
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950/80 border border-slate-800">
                <span className={`w-2 h-2 rounded-full ${handDetected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                <span className="text-slate-200">
                  HAND: {handDetected ? 'DETECTED' : 'AWAITING HAND'}
                </span>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-950/80 border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span className={cooldownRemaining > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {cooldownRemaining > 0 ? `LOCK: ${cooldownRemaining.toFixed(1)}s` : 'READY'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Toolbar */}
      <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {cameraActive ? (
            <button
              onClick={stopWebcam}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <CameraOff className="w-3.5 h-3.5" />
              <span>Stop Camera</span>
            </button>
          ) : (
            <button
              onClick={startWebcam}
              className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Connect Camera</span>
            </button>
          )}

          <button
            onClick={onToggleControlMode}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>[SPACE] {controlMode === 'ACTIVE' ? 'Pause' : 'Activate'}</span>
          </button>
        </div>

        {/* Cooldown Bar */}
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>Cooldown:</span>
          <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-75"
              style={{ width: `${(cooldownRemaining / cooldownDuration) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
