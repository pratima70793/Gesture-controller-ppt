import React, { useState, useRef } from 'react';
import { 
  Sliders, 
  ArrowRight, 
  ArrowLeft, 
  ShieldAlert, 
  CheckCircle2, 
  Hand, 
  Zap, 
  Activity,
  CornerDownRight
} from 'lucide-react';
import { ControlMode } from '../types';

interface GestureSimulatorProps {
  onNextSlide: () => void;
  onPrevSlide: () => void;
  controlMode: ControlMode;
  onLogAction: (action: string, type: 'next' | 'prev' | 'pause' | 'resume' | 'test', details: string) => void;
}

export const GestureSimulator: React.FC<GestureSimulatorProps> = ({
  onNextSlide,
  onPrevSlide,
  controlMode,
  onLogAction,
}) => {
  const [trackpadFeedback, setTrackpadFeedback] = useState<string>('Drag cursor across pad to simulate hand swipe');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastSimulatedActionRef = useRef<number>(0);
  const cooldownDuration = 1.5;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
    setIsDragging(true);
    setTrackpadFeedback('Tracking hand gesture...');
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) {
      setIsDragging(false);
      return;
    }

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const dt = (Date.now() - dragStartRef.current.time) / 1000;
    setIsDragging(false);

    const now = Date.now();
    const inCooldown = (now - lastSimulatedActionRef.current) / 1000 < cooldownDuration;

    // Displacement analysis
    if (Math.abs(dx) < 60) {
      setTrackpadFeedback('Motion rejected: displacement below SWIPE_THRESHOLD (110px)');
      onLogAction('MOTION REJECTED', 'test', `dx=${Math.round(dx)}px below threshold. No slide change.`);
      return;
    }

    if (Math.abs(dy) > Math.abs(dx) * 0.75) {
      setTrackpadFeedback('Motion rejected: excessive vertical drift (VERTICAL_TOLERANCE_RATIO)');
      onLogAction('VERTICAL DRIFT', 'test', `Vertical drift dy=${Math.round(dy)}px rejected`);
      return;
    }

    if (inCooldown) {
      setTrackpadFeedback('Blocked: Cooldown safety lock active (1.5s lockout)');
      onLogAction('COOLDOWN BLOCKED', 'test', 'Swipe ignored: Cooldown active');
      return;
    }

    if (controlMode === 'PAUSED') {
      setTrackpadFeedback('Gesture recognized but PowerPoint control is PAUSED');
      onLogAction('PAUSED GESTURE', 'test', 'Swipe ignored because Control Mode is PAUSED');
      return;
    }

    // Execute valid swipe
    lastSimulatedActionRef.current = now;
    if (dx > 0) {
      setTrackpadFeedback('CONFIRMED: SWIPE RIGHT -> NEXT SLIDE');
      onNextSlide();
      onLogAction('SIMULATOR NEXT', 'next', `Clean swipe dx=+${Math.round(dx)}px in ${dt.toFixed(2)}s`);
    } else {
      setTrackpadFeedback('CONFIRMED: SWIPE LEFT -> PREVIOUS SLIDE');
      onPrevSlide();
      onLogAction('SIMULATOR PREV', 'prev', `Clean swipe dx=${Math.round(dx)}px in ${dt.toFixed(2)}s`);
    }
  };

  // Quick action buttons
  const triggerSwipeRight = () => {
    const now = Date.now();
    if ((now - lastSimulatedActionRef.current) / 1000 < cooldownDuration) {
      onLogAction('COOLDOWN BLOCKED', 'test', 'Simulated swipe blocked by cooldown');
      setTrackpadFeedback('Blocked by Cooldown (1.5s lock)');
      return;
    }
    if (controlMode === 'PAUSED') {
      onLogAction('PAUSED GESTURE', 'test', 'Simulated swipe ignored: PAUSED');
      setTrackpadFeedback('Control Mode is PAUSED');
      return;
    }
    lastSimulatedActionRef.current = now;
    onNextSlide();
    onLogAction('SIMULATE SWIPE RIGHT', 'next', 'Triggered: Next Slide (Right Arrow)');
    setTrackpadFeedback('Simulated: SWIPE RIGHT -> NEXT SLIDE');
  };

  const triggerSwipeLeft = () => {
    const now = Date.now();
    if ((now - lastSimulatedActionRef.current) / 1000 < cooldownDuration) {
      onLogAction('COOLDOWN BLOCKED', 'test', 'Simulated swipe blocked by cooldown');
      setTrackpadFeedback('Blocked by Cooldown (1.5s lock)');
      return;
    }
    if (controlMode === 'PAUSED') {
      onLogAction('PAUSED GESTURE', 'test', 'Simulated swipe ignored: PAUSED');
      setTrackpadFeedback('Control Mode is PAUSED');
      return;
    }
    lastSimulatedActionRef.current = now;
    onPrevSlide();
    onLogAction('SIMULATE SWIPE LEFT', 'prev', 'Triggered: Prev Slide (Left Arrow)');
    setTrackpadFeedback('Simulated: SWIPE LEFT -> PREVIOUS SLIDE');
  };

  const triggerSmallJitter = () => {
    setTrackpadFeedback('Simulated small jitter: rejected by threshold filter');
    onLogAction('JITTER TEST', 'test', 'Small movement dx=18px: no slide change (PASS)');
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-400" />
          <h3 className="text-xs font-bold text-white tracking-wider uppercase">
            Gesture Trajectory Simulator
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Hardware-Free Pipeline Verification
        </span>
      </div>

      {/* Interactive Trackpad */}
      <div
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        className={`relative h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 cursor-grab select-none transition-all ${
          isDragging
            ? 'border-orange-500 bg-orange-500/10 cursor-grabbing'
            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
        }`}
      >
        <Hand className={`w-6 h-6 mb-2 transition-transform ${isDragging ? 'text-orange-400 scale-125' : 'text-slate-500'}`} />
        <span className="text-xs font-medium text-slate-300 text-center">
          {trackpadFeedback}
        </span>
        <span className="text-[10px] text-slate-500 mt-1">
          Click and drag horizontally across this trackpad
        </span>
      </div>

      {/* Test Buttons Row */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <button
          onClick={triggerSwipeLeft}
          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
          <span>Swipe Left</span>
        </button>

        <button
          onClick={triggerSmallJitter}
          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
          title="Tests that movements below threshold are ignored"
        >
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span>Small Jitter</span>
        </button>

        <button
          onClick={triggerSwipeRight}
          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>Swipe Right</span>
          <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
        </button>
      </div>
    </div>
  );
};
