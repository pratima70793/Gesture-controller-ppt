"""
Configuration settings for Real-Time Touchless PPT Controller.
All parameters can be tuned for specific lighting, camera resolution,
and presenter preferences.
"""

from typing import Tuple

# ==========================================
# CAMERA SETTINGS
# ==========================================
CAMERA_INDEX: int = 0
FRAME_WIDTH: int = 1280
FRAME_HEIGHT: int = 720
TARGET_FPS: int = 30
MIRROR_CAMERA: bool = True  # Flip horizontally for natural mirror behavior

# ==========================================
# MEDIAPIPE HAND TRACKING SETTINGS
# ==========================================
MAX_NUM_HANDS: int = 1
MIN_DETECTION_CONFIDENCE: float = 0.6
MIN_TRACKING_CONFIDENCE: float = 0.6

# Landmark indices of interest
LANDMARK_WRIST: int = 0
LANDMARK_THUMB_TIP: int = 4
LANDMARK_INDEX_TIP: int = 8
LANDMARK_MIDDLE_TIP: int = 12
LANDMARK_RING_TIP: int = 16
LANDMARK_PINKY_TIP: int = 20
LANDMARK_PALM_CENTER: int = 9  # Middle MCP joint, stable hand anchor

# ==========================================
# GESTURE & SWIPE RECOGNITION SETTINGS
# ==========================================
# Minimum horizontal displacement (in pixels at 1280x720) to register a swipe
SWIPE_THRESHOLD: float = 110.0

# Maximum vertical displacement allowed relative to horizontal movement
# Prevents diagonal/up-down arm movement from triggering false swipes
VERTICAL_TOLERANCE_RATIO: float = 0.75  # abs(dy) must be < abs(dx) * 0.75

# Time window for swipe recognition (seconds)
SWIPE_MIN_DURATION: float = 0.08  # Ignore instant teleporting artifacts
SWIPE_MAX_DURATION: float = 0.65  # Swipes must be reasonably brisk

# Position buffer length for motion tracking
HISTORY_BUFFER_SIZE: int = 15

# Minimum consecutive detection frames required to confirm gesture
STABLE_FRAMES: int = 3

# ==========================================
# POWERPOINT CONTROLLER & COOLDOWN
# ==========================================
# Cooldown period (in seconds) after a slide change to prevent multi-triggers
COOLDOWN_SECONDS: float = 1.5

# Maximum entries stored in dashboard action history
MAX_HISTORY: int = 10

# Initial control mode: "ACTIVE" or "PAUSED"
INITIAL_CONTROL_MODE: str = "ACTIVE"

# ==========================================
# KEYBOARD SHORTCUTS (ASCII CODES)
# ==========================================
KEY_PAUSE_ACTIVATE: int = 32   # Spacebar
KEY_QUIT_Q: int = ord('q')     # 'q'
KEY_QUIT_ESC: int = 27         # Escape
KEY_TEST_NEXT: int = ord('n')  # 'n' (simulate next slide)
KEY_TEST_PREV: int = ord('p')  # 'p' (simulate previous slide)

# ==========================================
# UI & VISUAL COLORS (BGR for OpenCV)
# ==========================================
COLOR_BACKGROUND: Tuple[int, int, int] = (18, 20, 24)
COLOR_TEXT_PRIMARY: Tuple[int, int, int] = (255, 255, 255)
COLOR_TEXT_MUTED: Tuple[int, int, int] = (160, 165, 175)
COLOR_ACCENT_GREEN: Tuple[int, int, int] = (46, 204, 113)   # Active / Success
COLOR_ACCENT_RED: Tuple[int, int, int] = (75, 75, 235)     # Paused / Cooldown
COLOR_ACCENT_BLUE: Tuple[int, int, int] = (245, 160, 35)    # Brand / Hand (BGR)
COLOR_ACCENT_ORANGE: Tuple[int, int, int] = (30, 144, 255)  # Next slide
COLOR_LANDMARK_POINT: Tuple[int, int, int] = (0, 215, 255)  # Gold points
COLOR_LANDMARK_LINE: Tuple[int, int, int] = (50, 180, 255)   # Connections
