"""
Utility helpers for Real-Time Touchless PPT Controller.
"""

import time
from collections import deque
from typing import Deque, Optional


class FPSCounter:
    """Calculates smoothed real-time Frames Per Second."""

    def __init__(self, window_size: int = 30) -> None:
        self._timestamps: Deque[float] = deque(maxlen=window_size)
        self._fps: float = 0.0

    def update(self) -> float:
        now = time.time()
        self._timestamps.append(now)
        if len(self._timestamps) > 1:
            elapsed = self._timestamps[-1] - self._timestamps[0]
            if elapsed > 0:
                self._fps = (len(self._timestamps) - 1) / elapsed
        return self._fps

    @property
    def fps(self) -> float:
        return self._fps


def format_timestamp(ts: Optional[float] = None) -> str:
    """Formats epoch time to HH:MM:SS."""
    if ts is None:
        ts = time.time()
    return time.strftime("%H:%M:%S", time.localtime(ts))
