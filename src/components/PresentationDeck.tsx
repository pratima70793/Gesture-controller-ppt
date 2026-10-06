import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Layers, 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Sparkles,
  Presentation,
  CheckCircle2
} from 'lucide-react';
import { SlideItem } from '../types';

interface PresentationDeckProps {
  currentSlideIndex: number;
  onNextSlide: () => void;
  onPrevSlide: () => void;
  onSelectSlide: (index: number) => void;
  totalSlides: number;
  slides: SlideItem[];
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const PresentationDeck: React.FC<PresentationDeckProps> = ({
  currentSlideIndex,
  onNextSlide,
  onPrevSlide,
  onSelectSlide,
  totalSlides,
  slides,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const currentSlide = slides[currentSlideIndex] || slides[0];

  return (
    <div className={`relative flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-full min-h-[500px]'}`}>
      {/* Slide Top Bar */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Presentation className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 uppercase tracking-wider">
                {currentSlide.tag}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Slide {currentSlideIndex + 1} of {totalSlides}
              </span>
            </div>
          </div>
        </div>

        {/* Slide Selector Pills */}
        <div className="hidden md:flex items-center gap-1.5">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => onSelectSlide(idx)}
              className={`w-7 h-7 rounded-md text-xs font-medium transition-all ${
                idx === currentSlideIndex
                  ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
              title={`Slide ${idx + 1}: ${s.title}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleFullscreen}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Toggle Presentation Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide Canvas Area */}
      <div className="flex-1 flex flex-col justify-between p-8 md:p-12 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 text-white relative overflow-hidden select-none">
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Slide Content */}
        <div className="relative z-10 max-w-4xl">
          <div className="mb-4">
            <span className="inline-block text-orange-400 font-mono text-xs uppercase tracking-widest font-semibold mb-2">
              • PPT SLIDE DECK
            </span>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {currentSlide.title}
            </h1>
            <p className="text-sm md:text-lg text-slate-400 mt-2 font-light">
              {currentSlide.subtitle}
            </p>
          </div>

          <div className="h-px w-24 bg-gradient-to-r from-orange-500 to-transparent my-6" />

          {/* Bullet Points */}
          <div className="space-y-4 my-6">
            {currentSlide.bullets.map((bullet, idx) => (
              <div key={idx} className="flex items-start gap-3.5 group">
                <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:bg-orange-500/20 transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm md:text-base text-slate-300 leading-relaxed font-normal">
                  {bullet}
                </p>
              </div>
            ))}
          </div>

          {/* Diagram Highlights if available */}
          {currentSlide.diagram === 'architecture' && (
            <div className="mt-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 font-mono flex flex-wrap items-center gap-2">
              <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Webcam</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">OpenCV</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">MediaPipe Hands</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Swipe Trajectory</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">1.5s Cooldown</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">PyAutoGUI Slide Show</span>
            </div>
          )}

          {currentSlide.diagram === 'landmarks' && (
            <div className="mt-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-4">
              <Activity className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              <div className="text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-emerald-300">Landmark 9 (MIDDLE_MCP) Anchor</div>
                <div>Resistant to finger twitches. Coordinates normalized in [0, 1] then scaled to frame pixel dimensions.</div>
              </div>
            </div>
          )}
        </div>

        {/* Slide Presenter Notes Footer */}
        <div className="relative z-10 pt-6 mt-6 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="font-semibold text-slate-300">Presenter Notes:</span>
            <span>{currentSlide.notes}</span>
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={onPrevSlide}
              disabled={currentSlideIndex === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <button
              onClick={onNextSlide}
              disabled={currentSlideIndex === totalSlides - 1}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-semibold shadow-md shadow-orange-500/20 transition-all"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
