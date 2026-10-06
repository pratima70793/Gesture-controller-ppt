"""
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
    # Configure PyAutoGUI failsafe and timing
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
    """
    Controls Microsoft PowerPoint presentations via PyAutoGUI keyboard events.
    Enforces a strict 1-2 second cooldown between commands to prevent duplicate
    triggers from continuous hand movement.
    """

    def __init__(self, cooldown_seconds: float = 1.5, max_history: int = 10) -> None:
        self.cooldown_seconds: float = cooldown_seconds
        self.max_history: int = max_history
        self._last_action_time: float = 0.0
        self._last_action: str = "INITIALIZED"
        self._history: Deque[ActionRecord] = deque(maxlen=max_history)
        self._is_active: bool = True
        self._mock_mode: bool = not HAS_PYAUTOGUI

    @property
    def is_active(self) -> bool:
        return self._is_active

    def set_active(self, active: bool) -> None:
        self._is_active = active

    def toggle_active(self) -> bool:
        self._is_active = not self._is_active
        return self._is_active

    def is_in_cooldown(self) -> bool:
        """Returns True if the controller is currently within the cooldown window."""
        elapsed = time.time() - self._last_action_time
        return elapsed < self.cooldown_seconds

    def remaining_cooldown(self) -> float:
        """Returns the number of seconds remaining in the cooldown window."""
        elapsed = time.time() - self._last_action_time
        rem = self.cooldown_seconds - elapsed
        return max(0.0, rem)

    def is_ready(self) -> bool:
        """Returns True if the controller is active and ready to fire commands."""
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
        """
        Triggers Next Slide in PowerPoint (Right Arrow).
        Respects cooldown and active control mode.
        """
        if not self.is_ready():
            return False

        try:
            if HAS_PYAUTOGUI and pyautogui is not None:
                pyautogui.press("right")
            self._record_action("NEXT SLIDE", "Right Arrow key dispatched")
            return True
        except Exception as e:
            self._record_action("ERROR", f"Failed to send Next Slide: {e}")
            return False

    def previous_slide(self) -> bool:
        """
        Triggers Previous Slide in PowerPoint (Left Arrow).
        Respects cooldown and active control mode.
        """
        if not self.is_ready():
            return False

        try:
            if HAS_PYAUTOGUI and pyautogui is not None:
                pyautogui.press("left")
            self._record_action("PREVIOUS SLIDE", "Left Arrow key dispatched")
            return True
        except Exception as e:
            self._record_action("ERROR", f"Failed to send Prev Slide: {e}")
            return False

    def start_presentation(self) -> bool:
        """Starts PowerPoint Slide Show (F5)."""
        if not self._is_active:
            return False
        try:
            if HAS_PYAUTOGUI and pyautogui is not None:
                pyautogui.press("f5")
            self._record_action("START PRESENTATION", "F5 dispatched")
            return True
        except Exception as e:
            self._record_action("ERROR", f"Failed to start presentation: {e}")
            return False

    def exit_presentation(self) -> bool:
        """Exits PowerPoint Slide Show (Escape)."""
        try:
            if HAS_PYAUTOGUI and pyautogui is not None:
                pyautogui.press("esc")
            self._record_action("EXIT PRESENTATION", "Escape dispatched")
            return True
        except Exception as e:
            self._record_action("ERROR", f"Failed to exit presentation: {e}")
            return False

    @property
    def last_action(self) -> str:
        return self._last_action

    @property
    def history(self) -> List[ActionRecord]:
        return list(self._history)
