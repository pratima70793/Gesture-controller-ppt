"""
Gesture Detector Module.
Integrates Multi-Frame Swipe Detection with a Rolling Stability Buffer
and Finite State Machine.
"""

from collections import deque
from enum import Enum
from typing import Deque, Optional, Tuple

from .swipe_detector import SwipeDetector


class GestureState(Enum):
    IDLE = "IDLE"
    HAND_DETECTED = "HAND_DETECTED"
    GESTURE_DETECTED = "GESTURE_DETECTED"
    SWIPE_LEFT = "SWIPE_LEFT"
    SWIPE_RIGHT = "SWIPE_RIGHT"
    COOLDOWN = "COOLDOWN"
    PAUSED = "PAUSED"
    ERROR = "ERROR"


class GestureDetector:
    """
    Evaluates hand anchor coordinates, calculates motion trajectories,
    filters noise using a stability history buffer, and tracks the current
    FSM gesture state.
    """

    def __init__(
        self,
        swipe_threshold: float = 110.0,
        vertical_tolerance_ratio: float = 0.75,
        min_duration: float = 0.08,
        max_duration: float = 0.65,
        stable_frames: int = 3,
    ) -> None:
        self.swipe_detector = SwipeDetector(
            threshold=swipe_threshold,
            vertical_tolerance_ratio=vertical_tolerance_ratio,
            min_duration=min_duration,
            max_duration=max_duration,
        )
        self.stable_frames = stable_frames
        self._stability_buffer: Deque[Optional[str]] = deque(maxlen=stable_frames)
        self._current_state: GestureState = GestureState.IDLE
        self._last_confirmed_gesture: Optional[str] = None

    @property
    def current_state(self) -> GestureState:
        return self._current_state

    @property
    def last_confirmed_gesture(self) -> Optional[str]:
        return self._last_confirmed_gesture

    def reset(self) -> None:
        """Resets the detector and stability queue."""
        self.swipe_detector.reset()
        self._stability_buffer.clear()
        self._current_state = GestureState.IDLE
        self._last_confirmed_gesture = None

    def process_point(
        self,
        hand_present: bool,
        anchor_coords: Optional[Tuple[int, int]],
        is_paused: bool = False,
        in_cooldown: bool = False,
        timestamp: Optional[float] = None,
    ) -> Tuple[GestureState, Optional[str]]:
        """
        Processes a single frame's hand detection data.

        Returns:
            (current_state, confirmed_gesture_to_trigger)
            where confirmed_gesture_to_trigger is 'SWIPE_RIGHT', 'SWIPE_LEFT', or None.
        """
        # Global state overrides
        if is_paused:
            self._current_state = GestureState.PAUSED
        elif in_cooldown:
            self._current_state = GestureState.COOLDOWN
        elif not hand_present:
            self._current_state = GestureState.IDLE
            self.swipe_detector.reset()
            self._stability_buffer.clear()
            return (self._current_state, None)
        else:
            self._current_state = GestureState.HAND_DETECTED

        if not hand_present or anchor_coords is None:
            self._stability_buffer.append(None)
            return (self._current_state, None)

        px_x, px_y = anchor_coords
        candidate_gesture = self.swipe_detector.update(float(px_x), float(px_y), timestamp=timestamp)

        # Update stability buffer
        self._stability_buffer.append(candidate_gesture)

        # Confirm gesture once candidate was detected
        confirmed_gesture = None
        if candidate_gesture is not None:
            # We register candidate gesture
            self._last_confirmed_gesture = candidate_gesture
            if candidate_gesture == "SWIPE_RIGHT":
                self._current_state = GestureState.SWIPE_RIGHT
            elif candidate_gesture == "SWIPE_LEFT":
                self._current_state = GestureState.SWIPE_LEFT
            else:
                self._current_state = GestureState.GESTURE_DETECTED

            # Check if execution is blocked by paused or cooldown
            if not is_paused and not in_cooldown:
                confirmed_gesture = candidate_gesture

        return (self._current_state, confirmed_gesture)
