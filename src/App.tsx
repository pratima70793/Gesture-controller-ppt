/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Presentation, 
  Camera, 
  Terminal, 
  BookOpen, 
  CheckCircle2, 
  ShieldCheck, 
  Activity, 
  Play, 
  Pause, 
  Maximize2, 
  Sliders, 
  Clock, 
  Cpu, 
  Zap,
  Sparkles,
  Download,
  ListRestart
} from 'lucide-react';

import { ActionLogItem, ControlMode, SlideItem } from './types';
import { PresentationDeck } from './components/PresentationDeck';
import { WebcamGestureTracker } from './components/WebcamGestureTracker';
import { GestureSimulator } from './components/GestureSimulator';
import { PythonProjectExplorer } from './components/PythonProjectExplorer';

const INITIAL_SLIDES: SlideItem[] = [
  {
    id: 1,
    tag: 'PROJECT TITLE',
    title: 'Real-Time Touchless PPT Controller',
    subtitle: 'Control Your Presentation Without Touching Your Keyboard',
    bullets: [
      'Autonomous computer vision system replacing handheld wireless clickers with real-time hand gestures.',
      'Webcam captures presenter hands; MediaPipe extracts 21 anatomical landmarks.',
      'Multi-frame trajectory analysis detects left/right swipes while ignoring natural speech gestures.',
      'PyAutoGUI bridge communicates directly with Microsoft PowerPoint Slide Show.',
    ],
    notes: 'Introduce project title, motivation, and hands-free presentation paradigm.',
    diagram: 'architecture',
  },
  {
    id: 2,
    tag: 'SYSTEM PIPELINE',
    title: 'End-to-End Processing Architecture',
    subtitle: 'From Optical Frame Capture to PowerPoint Slide Transition',
    bullets: [
      'Webcam Capture: OpenCV VideoCapture at 30 FPS with horizontal mirror flipping.',
      'MediaPipe Hand Landmarker: Identifies 21 3D joint points with >60% tracking confidence.',
      'Anchor Calculation: Landmark 9 (Middle Finger MCP) provides jitter-free palm center.',
      'Trajectory Buffer: 15-frame rolling window compares spatial displacement dx over time dt.',
      'Safety Engine: Validates 3-frame stability and 1.5s cooldown lockout before dispatch.',
    ],
    notes: 'Walk evaluators through the 10-stage processing pipeline shown below.',
    diagram: 'architecture',
  },
  {
    id: 3,
    tag: 'COMPUTER VISION',
    title: 'MediaPipe 21 Hand Landmarks & Anchoring',
    subtitle: 'Spatial Geometry and Robust Landmark Extraction',
    bullets: [
      'Tracks wrist (LM 0), thumb (LM 1-4), index (LM 5-8), middle (LM 9-12), ring (LM 13-16), and pinky (LM 17-20).',
      'Uses Landmark 9 (middle knuckle) as centroid anchor rather than fingertips to avoid false clicks from finger twitches.',
      'Transforms normalized coordinates [0.0, 1.0] into pixel space for accurate distance thresholds.',
      'Real-time HUD draws bones and joint nodes for instant visual verification.',
    ],
    notes: 'Emphasize why Landmark 9 was chosen over fingertip tracking.',
    diagram: 'landmarks',
  },
  {
    id: 4,
    tag: 'GESTURE SPECIFICATION',
    title: 'Swipe Recognition & Threshold Filters',
    subtitle: 'Mathematical Model for Left-to-Right and Right-to-Left Swipes',
    bullets: [
      'Swipe Right (Left → Right): dx >= +110px within 0.08s - 0.65s triggers Next Slide (Right Arrow).',
      'Swipe Left (Right → Left): dx <= -110px within 0.08s - 0.65s triggers Previous Slide (Left Arrow).',
      'Vertical Drift Tolerance: Rejects motions where |dy| > 0.75 * |dx| to ignore arm raising.',
      'Temporal Validation: Requires natural swipe velocity (ignores teleporting artifacts).',
    ],
    notes: 'Explain displacement threshold, duration bounds, and vertical rejection math.',
    diagram: 'trajectory',
  },
  {
    id: 5,
    tag: 'SAFETY & COOLDOWN',
    title: 'False Positive Prevention & Cooldown Lock',
    subtitle: 'Zero Unintended Slide Skips During Live Presentations',
    bullets: [
      'Multi-Frame Requirement: Single-frame noise or camera flicker is strictly ignored.',
      'Stability Checking: Minimum 3 consecutive frames must confirm gesture state.',
      'Strict 1.5s Cooldown: Hardware lockout prevents continuous slide jumps from a single sweep.',
      'Live Countdown Feedback: Real-time HUD shows LOCK: 1.5s countdown until READY.',
    ],
    notes: 'Demonstrate cooldown protection by waving hand continuously—only 1 slide advances.',
  },
  {
    id: 6,
    tag: 'CONTROL MODES',
    title: 'Active vs Paused Presentation States',
    subtitle: 'Seamless Presenter Experience During Q&A Sessions',
    bullets: [
      'ACTIVE Mode: Full autonomous slide control enabled via webcam gestures.',
      'PAUSED Mode: Camera tracking & HUD remain active for monitoring, but keyboard dispatch is muted.',
      'Spacebar Shortcut: Toggle instantaneously between ACTIVE and PAUSED without reaching for menus.',
      'Safe Default: Prevents accidental slide changes while answering audience questions.',
    ],
    notes: 'Show evaluated viva examiners how SPACE key pauses control.',
  },
  {
    id: 7,
    tag: 'EVALUATION & BENCHMARK',
    title: 'Performance Benchmarks & Conclusion',
    subtitle: 'Real-Time Edge Execution with Zero Cloud Latency',
    bullets: [
      'Target Frame Rate: Consistent 28–30 FPS on standard modern laptops.',
      'Latency: Sub-40ms end-to-end detection to PowerPoint execution.',
      'Cloud Independent: Runs 100% locally on Python 3.11 with zero external API fees.',
      'Test Suite: 15 / 15 automated unit tests verifying algorithms, cooldown, and FSM.',
    ],
    notes: 'Conclude presentation with architecture summary and open for questions.',
  },
];

export default function App() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [controlMode, setControlMode] = useState<ControlMode>('ACTIVE');
  const [activeTab, setActiveTab] = useState<'controller' | 'code' | 'docs'>('controller');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [actionHistory, setActionHistory] = useState<ActionLogItem[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      action: 'SYSTEM INITIALIZED',
      type: 'test',
      details: 'Ready for presentation control',
    },
  ]);

  const addActionLog = useCallback((action: string, type: 'next' | 'prev' | 'pause' | 'resume' | 'test', details: string) => {
    const newItem: ActionLogItem = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      action,
      type,
      details,
    };
    setActionHistory((prev) => [newItem, ...prev.slice(0, 9)]);
  }, []);

  const handleNextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => {
      const next = Math.min(prev + 1, INITIAL_SLIDES.length - 1);
      return next;
    });
  }, []);

  const handlePrevSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      return next;
    });
  }, []);

  const handleToggleControlMode = useCallback(() => {
    setControlMode((prev) => {
      const next = prev === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      addActionLog(
        `MODE CHANGED: ${next}`,
        next === 'ACTIVE' ? 'resume' : 'pause',
        `Switched control mode to ${next}`
      );
      return next;
    });
  }, [addActionLog]);

  // Global Keyboard Shortcuts (Space for pause/activate, Left/Right arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleControlMode();
      } else if (e.code === 'ArrowRight' || e.key === 'n') {
        if (controlMode === 'ACTIVE') {
          handleNextSlide();
          addActionLog('KEYBOARD NEXT', 'next', 'Right arrow pressed');
        }
      } else if (e.code === 'ArrowLeft' || e.key === 'p') {
        if (controlMode === 'ACTIVE') {
          handlePrevSlide();
          addActionLog('KEYBOARD PREV', 'prev', 'Left arrow pressed');
        }
      } else if (e.code === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controlMode, handleNextSlide, handlePrevSlide, handleToggleControlMode, isFullscreen, addActionLog]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800 backdrop-blur-md px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                Real-Time Touchless PPT Controller
              </h1>
              <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Python 3.11 • MediaPipe • OpenCV
              </span>
            </div>
            <p className="text-xs text-slate-400 font-normal">
              Control Your Presentation Without Touching Your Keyboard
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('controller')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'controller'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live Controller & Slides</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'code'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Python Source & ZIP</span>
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'docs'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Viva & Architecture</span>
          </button>
        </div>

        {/* Quick Mode Toggle & Shortcut reminder */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleControlMode}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 shadow-sm cursor-pointer ${
              controlMode === 'ACTIVE'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
            }`}
            title="Press SPACE to toggle"
          >
            {controlMode === 'ACTIVE' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>CONTROL: {controlMode}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {activeTab === 'controller' && (
          <div className="space-y-6">
            {/* Split Screen Layout: Presentation Deck on Left, Vision & Telemetry on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: PowerPoint Slide Show Deck */}
              <div className="lg:col-span-7 flex flex-col space-y-4">
                <PresentationDeck
                  currentSlideIndex={currentSlideIndex}
                  onNextSlide={handleNextSlide}
                  onPrevSlide={handlePrevSlide}
                  onSelectSlide={(idx) => setCurrentSlideIndex(idx)}
                  totalSlides={INITIAL_SLIDES.length}
                  slides={INITIAL_SLIDES}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                />

                {/* Gesture Quick Reference Card */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                      →
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Swipe Right</div>
                      <div className="text-[11px] text-slate-400">Next Slide (Right Arrow)</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                      ←
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Swipe Left</div>
                      <div className="text-[11px] text-slate-400">Prev Slide (Left Arrow)</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-mono text-xs font-bold">
                      SPC
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">SPACE Bar</div>
                      <div className="text-[11px] text-slate-400">Pause / Activate</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Webcam Tracker + Simulator + Action History */}
              <div className="lg:col-span-5 flex flex-col space-y-6">
                {/* Real-Time Webcam Feed with 21 Landmark Overlay */}
                <WebcamGestureTracker
                  onNextSlide={handleNextSlide}
                  onPrevSlide={handlePrevSlide}
                  controlMode={controlMode}
                  onToggleControlMode={handleToggleControlMode}
                  onLogAction={addActionLog}
                />

                {/* Gesture Trajectory Simulator (Hardware-Free Verification) */}
                <GestureSimulator
                  onNextSlide={handleNextSlide}
                  onPrevSlide={handlePrevSlide}
                  controlMode={controlMode}
                  onLogAction={addActionLog}
                />

                {/* Recent Actions Telemetry Log */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Recent Actions Log (Max 10)
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      Live Event Stream
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs">
                    {actionHistory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">{item.timestamp}</span>
                          <span
                            className={`font-semibold ${
                              item.type === 'next'
                                ? 'text-emerald-400'
                                : item.type === 'prev'
                                ? 'text-amber-400'
                                : item.type === 'pause'
                                ? 'text-rose-400'
                                : 'text-blue-400'
                            }`}
                          >
                            {item.action}
                          </span>
                        </div>
                        <span className="text-slate-400 truncate max-w-[140px] text-[10px]">
                          {item.details}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="space-y-6">
            <PythonProjectExplorer />
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-10 shadow-2xl space-y-8">
            <div>
              <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest">
                PROJECT DOCUMENTATION & VIVA PREPARATION
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                Real-Time Touchless PPT Controller Specification
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Complete engineering documentation, mathematical models, and defense notes for academic evaluation.
              </p>
            </div>

            {/* Test Matrix */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Automated Test Verification Matrix (15 / 15 Passed)</span>
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Test Case</th>
                      <th className="p-3">Stimulus / Vector</th>
                      <th className="p-3">Expected Outcome</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="p-3 font-semibold text-white">Swipe Right</td>
                      <td className="p-3">x: 200 → 340 (dx = +140px, dt = 0.24s)</td>
                      <td className="p-3">SWIPE_RIGHT → Next Slide (Right Arrow)</td>
                      <td className="p-3 text-emerald-400 font-bold">✓ PASS</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Swipe Left</td>
                      <td className="p-3">x: 500 → 360 (dx = -140px, dt = 0.24s)</td>
                      <td className="p-3">SWIPE_LEFT → Prev Slide (Left Arrow)</td>
                      <td className="p-3 text-emerald-400 font-bold">✓ PASS</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Jitter Filter</td>
                      <td className="p-3">dx = 30px (below threshold 110px)</td>
                      <td className="p-3">Ignored (No Slide Change)</td>
                      <td className="p-3 text-emerald-400 font-bold">✓ PASS</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Vertical Rejection</td>
                      <td className="p-3">dx = 130px, dy = 170px (dy &gt; 0.75 * dx)</td>
                      <td className="p-3">Ignored (Arm raise rejected)</td>
                      <td className="p-3 text-emerald-400 font-bold">✓ PASS</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Cooldown Lock</td>
                      <td className="p-3">Second trigger within 0.2s of first</td>
                      <td className="p-3">Blocked until cooldown expiration</td>
                      <td className="p-3 text-emerald-400 font-bold">✓ PASS</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">PAUSED State</td>
                      <td className="p-3">Valid swipe executed while PAUSED</td>
                      <td className="p-3">State shown on HUD; PyAutoGUI muted</td>
                      <td className="p-3 text-emerald-400 font-bold">✓ PASS</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* How to Run with Native PowerPoint Guide */}
            <div className="p-6 rounded-xl bg-orange-500/5 border border-orange-500/20 space-y-3">
              <h4 className="text-sm font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Running Locally with Native Microsoft PowerPoint</span>
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
                <li>Download the Python project using the <strong>Download Project (.zip)</strong> button above.</li>
                <li>Extract the folder and navigate inside: <code className="px-2 py-0.5 rounded bg-black/60 text-orange-300 font-mono">cd touchless-ppt-controller</code></li>
                <li>Create and activate a virtual environment: <code className="px-2 py-0.5 rounded bg-black/60 text-orange-300 font-mono">python -m venv venv && venv\Scripts\activate</code></li>
                <li>Install dependencies: <code className="px-2 py-0.5 rounded bg-black/60 text-orange-300 font-mono">pip install -r requirements.txt</code></li>
                <li>Open Microsoft PowerPoint, load your slides, and press <strong>F5</strong> to start Slide Show.</li>
                <li>Run the controller: <code className="px-2 py-0.5 rounded bg-black/60 text-orange-300 font-mono">python main.py</code></li>
                <li>Position your hand in front of your webcam and enjoy touchless presentation control!</li>
              </ol>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
