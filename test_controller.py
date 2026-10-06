"""
Automated Test Suite for Real-Time Touchless PPT Controller.
Tests swipe algorithms, cooldown timing, stability filters, and state machine.
Can be executed in any environment (including headless CI/CD) without a physical webcam.

Usage:
    python3 test_controller.py
"""

import os
import sys
import time
import unittest

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from controller.ppt_controller import PPTController
from gestures.gesture_detector import GestureDetector, GestureState
from gestures.swipe_detector import SwipeDetector
from utils.helpers import FPSCounter, format_timestamp


class TestSwipeDetector(unittest.TestCase):
    """Verifies the multi-frame trajectory and swipe math."""

    def setUp(self):
        self.detector = SwipeDetector(
            threshold=100.0,
            vertical_tolerance_ratio=0.75,
            min_duration=0.05,
            max_duration=0.5,
            buffer_size=15,
        )

    def test_single_frame_never_triggers(self):
        """A single frame should never trigger a swipe."""
        result = self.detector.update(x=200, y=300, timestamp=1.0)
        self.assertIsNone(result)

    def test_small_jitter_does_not_trigger(self):
        """Jitter below SWIPE_THRESHOLD must not trigger a slide change."""
        t = 1.0
        # Hand moves only 30 pixels (threshold is 100)
        self.detector.update(x=200, y=300, timestamp=t)
        self.detector.update(x=210, y=302, timestamp=t + 0.05)
        self.detector.update(x=220, y=301, timestamp=t + 0.10)
        result = self.detector.update(x=230, y=300, timestamp=t + 0.15)
        self.assertIsNone(result)

    def test_swipe_right_left_to_right(self):
        """Simulates clean hand movement from left to right (x: 200 -> 340)."""
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
        """Simulates clean hand movement from right to left (x: 500 -> 360)."""
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
        """Vertical arm raise must be rejected and not trigger slide changes."""
        t = 1.0
        # Hand moves 120px horizontally, but 160px vertically (ratio > 0.75)
        self.detector.update(x=200, y=100, timestamp=t)
        self.detector.update(x=250, y=180, timestamp=t + 0.08)
        self.detector.update(x=320, y=260, timestamp=t + 0.16)
        result = self.detector.update(x=330, y=270, timestamp=t + 0.24)
        self.assertIsNone(result)

    def test_reset_clears_buffer(self):
        """Reset clears state completely."""
        self.detector.update(x=200, y=300, timestamp=1.0)
        self.detector.update(x=250, y=300, timestamp=1.1)
        self.detector.reset()
        self.assertEqual(self.detector.sample_count, 0)


class TestPPTController(unittest.TestCase):
    """Verifies PowerPoint command dispatching, cooldown, and safety mode."""

    def setUp(self):
        # 0.2s cooldown for fast test execution
        self.controller = PPTController(cooldown_seconds=0.2, max_history=5)

    def test_initial_state(self):
        self.assertTrue(self.controller.is_active)
        self.assertTrue(self.controller.is_ready())
        self.assertFalse(self.controller.is_in_cooldown())
        self.assertEqual(self.controller.remaining_cooldown(), 0.0)

    def test_cooldown_blocks_rapid_second_command(self):
        """First command succeeds, second command immediately after must be blocked."""
        success_first = self.controller.next_slide()
        self.assertTrue(success_first)
        self.assertTrue(self.controller.is_in_cooldown())
        self.assertGreater(self.controller.remaining_cooldown(), 0.0)

        # Immediate follow-up must fail due to cooldown
        success_second = self.controller.next_slide()
        self.assertFalse(success_second)

        # Wait for cooldown to expire
        time.sleep(0.22)
        self.assertFalse(self.controller.is_in_cooldown())
        self.assertTrue(self.controller.is_ready())

        # Now subsequent command succeeds
        success_third = self.controller.previous_slide()
        self.assertTrue(success_third)

    def test_pause_mode_disables_commands(self):
        """When paused, commands must NOT execute."""
        self.controller.set_active(False)
        self.assertFalse(self.controller.is_active)
        self.assertFalse(self.controller.is_ready())

        executed = self.controller.next_slide()
        self.assertFalse(executed)

        # Re-activate
        self.controller.toggle_active()
        self.assertTrue(self.controller.is_active)
        self.assertTrue(self.controller.is_ready())

    def test_action_history_bounded(self):
        """History should not exceed max_history and records most recent first."""
        for i in range(8):
            self.controller.set_active(True)
            self.controller._record_action(f"ACTION_{i}", f"Desc {i}")

        history = self.controller.history
        self.assertEqual(len(history), 5)  # max_history was set to 5
        self.assertEqual(history[0].action, "ACTION_7")


class TestGestureDetectorStateMachine(unittest.TestCase):
    """Verifies state machine transitions and interaction with cooldown and pause."""

    def setUp(self):
        self.detector = GestureDetector(
            swipe_threshold=100.0,
            vertical_tolerance_ratio=0.75,
            min_duration=0.05,
            max_duration=0.5,
            stable_frames=3,
        )

    def test_idle_when_no_hand(self):
        state, action = self.detector.process_point(hand_present=False, anchor_coords=None)
        self.assertEqual(state, GestureState.IDLE)
        self.assertIsNone(action)

    def test_paused_state_override(self):
        state, action = self.detector.process_point(
            hand_present=True,
            anchor_coords=(300, 300),
            is_paused=True,
            in_cooldown=False,
        )
        self.assertEqual(state, GestureState.PAUSED)
        self.assertIsNone(action)

    def test_cooldown_state_override(self):
        state, action = self.detector.process_point(
            hand_present=True,
            anchor_coords=(300, 300),
            is_paused=False,
            in_cooldown=True,
        )
        self.assertEqual(state, GestureState.COOLDOWN)
        self.assertIsNone(action)


class TestHelpers(unittest.TestCase):
    """Verifies helpers and timestamps."""

    def test_timestamp_format(self):
        s = format_timestamp(1700000000)
        self.assertRegex(s, r"^\d{2}:\d{2}:\d{2}$")

    def test_fps_counter(self):
        fps = FPSCounter()
        self.assertEqual(fps.fps, 0.0)
        fps.update()
        time.sleep(0.01)
        res = fps.update()
        self.assertGreaterEqual(res, 0.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
