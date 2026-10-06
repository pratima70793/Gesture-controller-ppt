"""
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
    """
    Tracks hand landmarks using MediaPipe Hands.
    Extracts 21 landmarks and computes key anchor points (Palm center, index tip, wrist).
    """

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
        self._mp_drawing = None
        self._mp_hands = None
        self._is_initialized = False

        if HAS_MEDIAPIPE and mp is not None:
            self._mp_hands = mp.solutions.hands
            self._mp_drawing = mp.solutions.drawing_utils
            self._mp_drawing_styles = mp.solutions.drawing_styles
            try:
                self._hands = self._mp_hands.Hands(
                    static_image_mode=False,
                    max_num_hands=max_num_hands,
                    min_detection_confidence=min_detection_confidence,
                    min_tracking_confidence=min_tracking_confidence,
                )
                self._is_initialized = True
            except Exception as e:
                self._is_initialized = False

    @property
    def is_available(self) -> bool:
        return self._is_initialized

    def process_frame(
        self, frame_bgr: Any
    ) -> Tuple[bool, List[Tuple[float, float, float]], Optional[Tuple[int, int]]]:
        """
        Processes an OpenCV BGR frame.

        Returns:
            (hand_detected, landmark_list_normalized, anchor_pixel_coords)
            where:
            - hand_detected: bool
            - landmark_list_normalized: list of 21 (x, y, z) floats in [0, 1]
            - anchor_pixel_coords: (px_x, px_y) of palm center in image pixels
        """
        if not self._is_initialized or self._hands is None:
            return (False, [], None)

        h, w = frame_bgr.shape[:2]
        # Convert BGR to RGB for MediaPipe
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        frame_rgb.flags.writeable = False

        results = self._hands.process(frame_rgb)
        frame_rgb.flags.writeable = True

        if not results.multi_hand_landmarks:
            return (False, [], None)

        # Primary hand
        first_hand = results.multi_hand_landmarks[0]
        landmarks_norm = [(lm.x, lm.y, lm.z) for lm in first_hand.landmark]

        # Anchor: Landmark 9 (MIDDLE_FINGER_MCP) or Landmark 0 (WRIST) + Landmark 9 average
        # Landmark 9 is the structural center of the hand palm and resists finger twitching
        anchor_lm = first_hand.landmark[9]
        anchor_px = (int(anchor_lm.x * w), int(anchor_lm.y * h))

        return (True, landmarks_norm, anchor_px)

    def draw_landmarks(self, frame_bgr: Any, landmarks_norm: List[Tuple[float, float, float]]) -> None:
        """Draws aesthetic hand skeleton and landmarks onto the frame."""
        if not HAS_MEDIAPIPE or cv2 is None or not landmarks_norm:
            return

        h, w = frame_bgr.shape[:2]

        # Landmark pixel points
        pts = [(int(lm[0] * w), int(lm[1] * h)) for lm in landmarks_norm]

        # MediaPipe hand connection pairs (21 points standard skeleton)
        CONNECTIONS = [
            (0, 1), (1, 2), (2, 3), (3, 4),        # Thumb
            (0, 5), (5, 6), (6, 7), (7, 8),        # Index
            (5, 9), (9, 10), (10, 11), (11, 12),   # Middle
            (9, 13), (13, 14), (14, 15), (15, 16), # Ring
            (13, 17), (17, 18), (18, 19), (19, 20),# Pinky
            (0, 17)                                # Palm base
        ]

        # Draw connection bones
        for start_idx, end_idx in CONNECTIONS:
            if start_idx < len(pts) and end_idx < len(pts):
                cv2.line(frame_bgr, pts[start_idx], pts[end_idx], (70, 190, 255), 2, cv2.LINE_AA)

        # Draw joint nodes
        for i, (px, py) in enumerate(pts):
            if i in (4, 8, 12, 16, 20):  # Fingertips
                cv2.circle(frame_bgr, (px, py), 6, (0, 230, 255), -1, cv2.LINE_AA)
                cv2.circle(frame_bgr, (px, py), 8, (255, 255, 255), 1, cv2.LINE_AA)
            elif i == 9:  # Palm center anchor
                cv2.circle(frame_bgr, (px, py), 7, (46, 204, 113), -1, cv2.LINE_AA)
            else:
                cv2.circle(frame_bgr, (px, py), 4, (200, 200, 255), -1, cv2.LINE_AA)

    def close(self) -> None:
        """Releases MediaPipe resources."""
        if self._hands is not None:
            self._hands.close()
            self._hands = None
            self._is_initialized = False
