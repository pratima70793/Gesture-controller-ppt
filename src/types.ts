export type GestureName = 'IDLE' | 'HAND_DETECTED' | 'SWIPE_RIGHT' | 'SWIPE_LEFT' | 'COOLDOWN';

export type ControlMode = 'ACTIVE' | 'PAUSED';

export interface ActionLogItem {
  id: string;
  timestamp: string;
  action: string;
  type: 'next' | 'prev' | 'pause' | 'resume' | 'test';
  details: string;
}

export interface SlideItem {
  id: number;
  title: string;
  subtitle: string;
  tag: string;
  bullets: string[];
  notes: string;
  diagram?: 'architecture' | 'landmarks' | 'trajectory' | 'fsm';
}

export interface PythonFileItem {
  path: string;
  filename: string;
  category: 'core' | 'camera' | 'gestures' | 'controller' | 'ui' | 'test' | 'doc';
  content: string;
}
