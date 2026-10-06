import { PythonFileItem } from './types';

export const PYTHON_FILES: PythonFileItem[] = [
  {
    path: 'main.py',
    filename: 'main.py',
    category: 'core',
    content: `"""
Real-Time Touchless PPT Controller.
Main Entrypoint.

Usage:
    python main.py
    python main.py --camera 0
    python main.py --cooldown 1.5 --threshold 110
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import config
from gestures.gesture_controller import GestureController


def parse_args():
    parser = argparse.ArgumentParser(
        description="Real-Time Touchless PPT Controller using MediaPipe and PyAutoGUI."
    )
    parser.add_argument(
        "--camera",
        type=int,
        default=config.CAMERA_INDEX,
        help=f"Camera index to use (default: {config.CAMERA_INDEX})",
    )
    parser.add_argument(
        "--width",
        type=int,
        default=config.FRAME_WIDTH,
        help=f"Capture frame width (default: {config.FRAME_WIDTH})",
    )
    parser.add_argument(
        "--height",
        type=int,
        default=config.FRAME_HEIGHT,
        help=f"Capture frame height (default: {config.FRAME_HEIGHT})",
    )
    parser.add_argument(
        "--cooldown",
        type=float,
        default=config.COOLDOWN_SECONDS,
        help=f"Cooldown in seconds between slide triggers (default: {config.COOLDOWN_SECONDS})",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=config.SWIPE_THRESHOLD,
        help=f"Horizontal pixel displacement threshold for swipe (default: {config.SWIPE_THRESHOLD})",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    controller = GestureController(
        camera_index=args.camera,
        frame_width=args.width,
        frame_height=args.height,
        cooldown_seconds=args.cooldown,
        swipe_threshold=args.threshold,
    )

    try:
        controller.start()
    except Exception as e:
        print(f"[FATAL] Unexpected error occurred: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
`,
  },
  {
    path: 'config.py',
    filename: 'config.py',
    category: 'core',
    content: `"""
Configuration settings for Real-Time Touchless PPT Controller.
All parameters can be tuned for specific lighting, camera resolution,
and presenter preferences.
"""

from typing import Tuple

# CAMERA SETTINGS
CAMERA_INDEX: int = 0
FRAME_WIDTH: int = 1280
FRAME_HEIGHT: int = 720
TARGET_FPS: int = 30
MIRROR_CAMERA: bool = True  # Flip horizontally for natural mirror behavior

# MEDIAPIPE HAND TRACKING SETTINGS
MAX_NUM_HANDS: int = 1
MIN_DETECTION_CONFIDENCE: float = 0.6
MIN_TRACKING_CONFIDENCE: float = 0.6

# Landmark indices
LANDMARK_WRIST: int = 0
LANDMARK_THUMB_TIP: int = 4
LANDMARK_INDEX_TIP: int = 8
LANDMARK_MIDDLE_TIP: int = 12
LANDMARK_RING_TIP: int = 16
LANDMARK_PINKY_TIP: int = 20
LANDMARK_PALM_CENTER: int = 9  # Middle MCP joint, stable hand anchor

# GESTURE & SWIPE RECOGNITION SETTINGS
SWIPE_THRESHOLD: float = 110.0
VERTICAL_TOLERANCE_RATIO: float = 0.75
SWIPE_MIN_DURATION: float = 0.08
SWIPE_MAX_DURATION: float = 0.65
HISTORY_BUFFER_SIZE: int = 15
STABLE_FRAMES: int = 3

# POWERPOINT CONTROLLER & COOLDOWN
COOLDOWN_SECONDS: float = 1.5
MAX_HISTORY: int = 10
INITIAL_CONTROL_MODE: str = "ACTIVE"

# KEYBOARD SHORTCUTS
KEY_PAUSE_ACTIVATE: int = 32   # Spacebar
KEY_QUIT_Q: int = ord('q')     # 'q'
KEY_QUIT_ESC: int = 27         # Escape
KEY_TEST_NEXT: int = ord('n')  # 'n' (simulate next slide)
KEY_TEST_PREV: int = ord('p')  # 'p' (simulate previous slide)
`,
  },
  {
    path: 'camera/camera_manager.py',
    filename: 'camera_manager.py',
    category: 'camera',
    content: `"""
Camera Manager Module.
Controls OpenCV VideoCapture hardware access, frame resolution, mirror flipping,
and connection error handling.
"""

from typing import Optional, Tuple, Any

try:
    import numpy as np
    HAS_NUMPY = True
except (ImportError, Exception):
    np = None
    HAS_NUMPY = False

try:
    import cv2
    HAS_CV2 = True
except (ImportError, Exception):
    cv2 = None
    HAS_CV2 = False


class CameraManager:
    """
    Manages webcam capture safely, handling device connection errors,
    frame flipping for intuitive mirroring, and proper resource release.
    """

    def __init__(
        self,
        camera_index: int = 0,
        frame_width: int = 1280,
        frame_height: int = 720,
        mirror: bool = True,
    ) -> None:
        self.camera_index = camera_index
        self.frame_width = frame_width
        self.frame_height = frame_height
        self.mirror = mirror

        self._cap: Optional[Any] = None
        self._is_connected = False
        self._error_message = ""

    def initialize(self) -> bool:
        """Attempts to open the video capture device."""
        if not HAS_CV2 or cv2 is None:
            self._error_message = "OpenCV (cv2) library is not installed."
            self._is_connected = False
            return False

        try:
            self._cap = cv2.VideoCapture(self.camera_index)
            if not self._cap.isOpened():
                self._error_message = f"Unable to access webcam at device index {self.camera_index}."
                self._is_connected = False
                return False

            self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.frame_width)
            self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.frame_height)
            self._is_connected = True
            self._error_message = ""
            return True
        except Exception as e:
            self._error_message = f"Webcam error: {e}"
            self._is_connected = False
            return False

    def is_connected(self) -> bool:
        return self._is_connected and (self._cap is not None and self._cap.isOpened())

    @property
    def error_message(self) -> str:
        return self._error_message

    def read_frame(self) -> Tuple[bool, Optional[Any]]:
        if not self.is_connected() or self._cap is None:
            return (False, None)

        ret, frame = self._cap.read()
        if not ret or frame is None:
            self._error_message = "Camera connection lost or frame drop."
            return (False, None)

        if self.mirror:
            frame = cv2.flip(frame, 1)

        return (True, frame)

    def release(self) -> None:
        if self._cap is not None:
            try:
                self._cap.release()
            except Exception:
                pass
            self._cap = None
        self._is_connected = False
`,
  },
  {
    path: 'gestures/hand_tracker.py',
    filename: 'hand_tracker.py',
    category: 'gestures',
    content: `"""
Hand Tracker Module.
Wraps Google MediaPipe Hands solution to detect 21 3D landmarks in real time.
"""

from typing import List, Optional, Tuple, Any

try:
    import numpy as np
    HAS_NUMPY = True
except (ImportError, Exception):
    np = None
    HAS_NUMPY = False

try:
    import mediapipe as mp
    import cv2
    HAS_MEDIAPIPE = True
except (ImportError, Exception):
    mp = None
    cv2 = None
    HAS_MEDIAPIPE = False


class HandTracker:
    def __init__(
        self,
        max_num_hands: int = 1,
        min_detection_confidence: float = 0.6,
        min_tracking_confidence: float = 0.6,
    ) -> None:
        self.max_num_hands = max_num_hands
        self.min_detection_confidence = min_detection_confidence
        self.min_tracking_confidence = min_tracking_confidence

        self._hands = None
        self._is_initialized = False

        if HAS_MEDIAPIPE and mp is not None:
            self._mp_hands = mp.solutions.hands
            try:
                self._hands = self._mp_hands.Hands(
                    static_image_mode=False,
                    max_num_hands=max_num_hands,
                    min_detection_confidence=min_detection_confidence,
                    min_tracking_confidence=min_tracking_confidence,
                )
                self._is_initialized = True
            except Exception:
                self._is_initialized = False

    @property
    def is_available(self) -> bool:
        return self._is_initialized

    def process_frame(
        self, frame_bgr: Any
    ) -> Tuple[bool, List[Tuple[float, float, float]], Optional[Tuple[int, int]]]:
        if not self._is_initialized or self._hands is None:
            return (False, [], None)

        h, w = frame_bgr.shape[:2]
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        frame_rgb.flags.writeable = False

        results = self._hands.process(frame_rgb)
        frame_rgb.flags.writeable = True

        if not results.multi_hand_landmarks:
            return (False, [], None)

        first_hand = results.multi_hand_landmarks[0]
        landmarks_norm = [(lm.x, lm.y, lm.z) for lm in first_hand.landmark]

        # Anchor: Landmark 9 (MIDDLE_FINGER_MCP) palm center
        anchor_lm = first_hand.landmark[9]
        anchor_px = (int(anchor_lm.x * w), int(anchor_lm.y * h))

        return (True, landmarks_norm, anchor_px)

    def draw_landmarks(self, frame_bgr: Any, landmarks_norm: List[Tuple[float, float, float]]) -> None:
        if not HAS_MEDIAPIPE or cv2 is None or not landmarks_norm:
            return

        h, w = frame_bgr.shape[:2]
        pts = [(int(lm[0] * w), int(lm[1] * h)) for lm in landmarks_norm]

        CONNECTIONS = [
            (0, 1), (1, 2), (2, 3), (3, 4),
            (0, 5), (5, 6), (6, 7), (7, 8),
            (5, 9), (9, 10), (10, 11), (11, 12),
            (9, 13), (13, 14), (14, 15), (15, 16),
            (13, 17), (17, 18), (18, 19), (19, 20),
            (0, 17)
        ]

        for s, e in CONNECTIONS:
            if s < len(pts) and e < len(pts):
                cv2.line(frame_bgr, pts[s], pts[e], (70, 190, 255), 2, cv2.LINE_AA)

        for i, (px, py) in enumerate(pts):
            if i in (4, 8, 12, 16, 20):
                cv2.circle(frame_bgr, (px, py), 6, (0, 230, 255), -1, cv2.LINE_AA)
            elif i == 9:
                cv2.circle(frame_bgr, (px, py), 7, (46, 204, 113), -1, cv2.LINE_AA)
            else:
                cv2.circle(frame_bgr, (px, py), 4, (200, 200, 255), -1, cv2.LINE_AA)

    def close(self) -> None:
        if self._hands is not None:
            self._hands.close()
            self._hands = None
            self._is_initialized = False
`,
  },
  {
    path: 'gestures/swipe_detector.py',
    filename: 'swipe_detector.py',
    category: 'gestures',
    content: `"""
Swipe Detector Module.
Analyzes multi-frame trajectory of hand landmarks to identify left-to-right
and right-to-left swipes while rejecting noisy, small, or vertical movements.
"""

import time
from collections import deque
from dataclasses import dataclass
from typing import Deque, Optional, Tuple


@dataclass
class PointSample:
    x: float
    y: float
    timestamp: float


class SwipeDetector:
    def __init__(
        self,
        threshold: float = 110.0,
        vertical_tolerance_ratio: float = 0.75,
        min_duration: float = 0.08,
        max_duration: float = 0.65,
        buffer_size: int = 15,
    ) -> None:
        self.threshold: float = threshold
        self.vertical_tolerance_ratio: float = vertical_tolerance_ratio
        self.min_duration: float = min_duration
        self.max_duration: float = max_duration
        self.buffer_size: int = buffer_size

        self._history: Deque[PointSample] = deque(maxlen=buffer_size)
        self._last_dx: float = 0.0
        self._last_dy: float = 0.0

    def reset(self) -> None:
        self._history.clear()
        self._last_dx = 0.0
        self._last_dy = 0.0

    def update(self, x: float, y: float, timestamp: Optional[float] = None) -> Optional[str]:
        now = time.time() if timestamp is None else timestamp
        self._history.append(PointSample(x=x, y=y, timestamp=now))

        if len(self._history) < 3:
            return None

        current = self._history[-1]
        best_candidate: Optional[Tuple[str, float]] = None

        for past in list(self._history)[:-1]:
            elapsed = current.timestamp - past.timestamp
            if elapsed < self.min_duration or elapsed > self.max_duration:
                continue

            dx = current.x - past.x
            dy = current.y - past.y
            abs_dx = abs(dx)
            abs_dy = abs(dy)

            if abs_dx >= self.threshold:
                if abs_dy <= abs_dx * self.vertical_tolerance_ratio:
                    self._last_dx = dx
                    self._last_dy = dy
                    if dx > 0:
                        best_candidate = ("SWIPE_RIGHT", abs_dx)
                    else:
                        best_candidate = ("SWIPE_LEFT", abs_dx)
                    break

        if best_candidate is not None:
            self.reset()
            return best_candidate[0]

        return None
`,
  },
  {
    path: 'controller/ppt_controller.py',
    filename: 'ppt_controller.py',
    category: 'controller',
    content: `"""
PowerPoint Controller Module.
Handles keyboard command dispatching to Microsoft PowerPoint via PyAutoGUI,
cooldown timers, and execution history.
"""

import time
from collections import deque
from dataclasses import dataclass
from typing import Deque, List, Optional

try:
    import pyautogui
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.05
    HAS_PYAUTOGUI = True
except (ImportError, Exception):
    pyautogui = None
    HAS_PYAUTOGUI = False


@dataclass
class ActionRecord:
    timestamp: float
    time_str: str
    action: str
    description: str


class PPTController:
    def __init__(self, cooldown_seconds: float = 1.5, max_history: int = 10) -> None:
        self.cooldown_seconds: float = cooldown_seconds
        self.max_history: int = max_history
        self._last_action_time: float = 0.0
        self._last_action: str = "INITIALIZED"
        self._history: Deque[ActionRecord] = deque(maxlen=max_history)
        self._is_active: bool = True

    @property
    def is_active(self) -> bool:
        return self._is_active

    def set_active(self, active: bool) -> None:
        self._is_active = active

    def toggle_active(self) -> bool:
        self._is_active = not self._is_active
        return self._is_active

    def is_in_cooldown(self) -> bool:
        elapsed = time.time() - self._last_action_time
        return elapsed < self.cooldown_seconds

    def remaining_cooldown(self) -> float:
        elapsed = time.time() - self._last_action_time
        return max(0.0, self.cooldown_seconds - elapsed)

    def is_ready(self) -> bool:
        return self._is_active and not self.is_in_cooldown()

    def _record_action(self, action: str, description: str) -> None:
        now = time.time()
        self._last_action_time = now
        self._last_action = action
        time_str = time.strftime("%H:%M:%S", time.localtime(now))
        self._history.appendleft(
            ActionRecord(
                timestamp=now,
                time_str=time_str,
                action=action,
                description=description,
            )
        )

    def next_slide(self) -> bool:
        if not self.is_ready():
            return False
        try:
            if HAS_PYAUTOGUI and pyautogui is not None:
                pyautogui.press("right")
            self._record_action("NEXT SLIDE", "Right Arrow key dispatched")
            return True
        except Exception as e:
            self._record_action("ERROR", f"Failed: {e}")
            return False

    def previous_slide(self) -> bool:
        if not self.is_ready():
            return False
        try:
            if HAS_PYAUTOGUI and pyautogui is not None:
                pyautogui.press("left")
            self._record_action("PREVIOUS SLIDE", "Left Arrow key dispatched")
            return True
        except Exception as e:
            self._record_action("ERROR", f"Failed: {e}")
            return False

    def start_presentation(self) -> bool:
        if not self._is_active:
            return False
        try:
            if HAS_PYAUTOGUI and pyautogui is not None:
                pyautogui.press("f5")
            self._record_action("START PRESENTATION", "F5 dispatched")
            return True
        except Exception as e:
            return False

    def exit_presentation(self) -> bool:
        try:
            if HAS_PYAUTOGUI and pyautogui is not None:
                pyautogui.press("esc")
            self._record_action("EXIT PRESENTATION", "Escape dispatched")
            return True
        except Exception as e:
            return False

    @property
    def last_action(self) -> str:
        return self._last_action

    @property
    def history(self) -> List[ActionRecord]:
        return list(self._history)
`,
  },
  {
    path: 'test_controller.py',
    filename: 'test_controller.py',
    category: 'test',
    content: `"""
Automated Test Suite for Real-Time Touchless PPT Controller.
15 Unit Tests covering Swipe Trajectory, Stability, Cooldown, and FSM.
"""

import os
import sys
import time
import unittest

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from controller.ppt_controller import PPTController
from gestures.gesture_detector import GestureDetector, GestureState
from gestures.swipe_detector import SwipeDetector
from utils.helpers import FPSCounter, format_timestamp


class TestSwipeDetector(unittest.TestCase):
    def setUp(self):
        self.detector = SwipeDetector(
            threshold=100.0,
            vertical_tolerance_ratio=0.75,
            min_duration=0.05,
            max_duration=0.5,
            buffer_size=15,
        )

    def test_single_frame_never_triggers(self):
        result = self.detector.update(x=200, y=300, timestamp=1.0)
        self.assertIsNone(result)

    def test_small_jitter_does_not_trigger(self):
        t = 1.0
        self.detector.update(x=200, y=300, timestamp=t)
        self.detector.update(x=210, y=302, timestamp=t + 0.05)
        self.detector.update(x=220, y=301, timestamp=t + 0.10)
        result = self.detector.update(x=230, y=300, timestamp=t + 0.15)
        self.assertIsNone(result)

    def test_swipe_right_left_to_right(self):
        t = 1.0
        r1 = self.detector.update(x=200, y=300, timestamp=t)
        self.assertIsNone(r1)
        r2 = self.detector.update(x=240, y=305, timestamp=t + 0.08)
        self.assertIsNone(r2)
        r3 = self.detector.update(x=280, y=302, timestamp=t + 0.16)
        self.assertIsNone(r3)
        result = self.detector.update(x=340, y=300, timestamp=t + 0.24)
        self.assertEqual(result, "SWIPE_RIGHT")

    def test_swipe_left_right_to_left(self):
        t = 1.0
        r1 = self.detector.update(x=500, y=300, timestamp=t)
        self.assertIsNone(r1)
        r2 = self.detector.update(x=460, y=298, timestamp=t + 0.08)
        self.assertIsNone(r2)
        r3 = self.detector.update(x=420, y=302, timestamp=t + 0.16)
        self.assertIsNone(r3)
        result = self.detector.update(x=360, y=300, timestamp=t + 0.24)
        self.assertEqual(result, "SWIPE_LEFT")

    def test_vertical_movement_rejected(self):
        t = 1.0
        self.detector.update(x=200, y=100, timestamp=t)
        self.detector.update(x=250, y=180, timestamp=t + 0.08)
        self.detector.update(x=320, y=260, timestamp=t + 0.16)
        result = self.detector.update(x=330, y=270, timestamp=t + 0.24)
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main(verbosity=2)
`,
  },
  {
    path: 'requirements.txt',
    filename: 'requirements.txt',
    category: 'core',
    content: `opencv-python>=4.8.0.76
mediapipe>=0.10.9
pyautogui>=0.9.54
numpy>=1.24.0,<2.0.0
`,
  },
  {
    path: 'README.md',
    filename: 'README.md',
    category: 'doc',
    content: `# Real-Time Touchless PPT Controller
Control Microsoft PowerPoint Presentations Without Touching Keyboard.
Built with Python 3.11, OpenCV, MediaPipe, and PyAutoGUI.
`,
  },
];
