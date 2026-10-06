"""
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
    """
    Detects directional swipe gestures across multiple frames.

    Guarantees:
    - Never triggers from a single frame.
    - Requires horizontal displacement above configurable SWIPE_THRESHOLD.
    - Rejects vertical arm motions using vertical tolerance ratio.
    - Enforces temporal bounds (min/max duration).
    - Clears trajectory on detection to prevent continuous duplicate triggers.
    """

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
        """Clears the trajectory buffer."""
        self._history.clear()
        self._last_dx = 0.0
        self._last_dy = 0.0

    def update(self, x: float, y: float, timestamp: Optional[float] = None) -> Optional[str]:
        """
        Feeds the latest hand anchor coordinate (e.g. palm center or middle knuckle).

        Returns:
            "SWIPE_RIGHT" if moving left-to-right,
            "SWIPE_LEFT"  if moving right-to-left,
            None          otherwise.
        """
        now = time.time() if timestamp is None else timestamp
        self._history.append(PointSample(x=x, y=y, timestamp=now))

        if len(self._history) < 3:
            return None

        # Compare current point against historical points within valid time window
        current = self._history[-1]
        best_candidate: Optional[Tuple[str, float]] = None

        # Iterate from oldest to recent to find the strongest valid initiation point
        for past in list(self._history)[:-1]:
            elapsed = current.timestamp - past.timestamp
            if elapsed < self.min_duration:
                continue
            if elapsed > self.max_duration:
                continue

            dx = current.x - past.x
            dy = current.y - past.y
            abs_dx = abs(dx)
            abs_dy = abs(dy)

            # Check threshold and horizontal dominance
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
            # Gesture detected! Clear history to avoid re-triggering from the same tail
            self.reset()
            return best_candidate[0]

        return None

    @property
    def last_deltas(self) -> Tuple[float, float]:
        """Returns the most recent (dx, dy) for visual telemetry/HUD."""
        return (self._last_dx, self._last_dy)

    @property
    def sample_count(self) -> int:
        return len(self._history)
