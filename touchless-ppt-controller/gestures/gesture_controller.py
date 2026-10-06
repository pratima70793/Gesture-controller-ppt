"""
Gesture Controller Orchestrator Module.
Connects Camera, Hand Tracking, Gesture Detection, PowerPoint Controller,
and Real-Time Dashboard into a seamless presentation pipeline.
"""

import time
from typing import Optional, Any

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

import config
from camera.camera_manager import CameraManager
from controller.ppt_controller import PPTController
from gestures.gesture_detector import GestureDetector, GestureState
from gestures.hand_tracker import HandTracker
from ui.dashboard import Dashboard
from utils.helpers import FPSCounter


class GestureController:
    """
    Main runtime orchestrator. Manages application state, process frames,
    executes presentation commands upon verified gestures, and draws telemetry.
    """

    def __init__(
        self,
        camera_index: int = config.CAMERA_INDEX,
        frame_width: int = config.FRAME_WIDTH,
        frame_height: int = config.FRAME_HEIGHT,
        cooldown_seconds: float = config.COOLDOWN_SECONDS,
        swipe_threshold: float = config.SWIPE_THRESHOLD,
    ) -> None:
        self.camera = CameraManager(
            camera_index=camera_index,
            frame_width=frame_width,
            frame_height=frame_height,
            mirror=config.MIRROR_CAMERA,
        )
        self.hand_tracker = HandTracker(
            max_num_hands=config.MAX_NUM_HANDS,
            min_detection_confidence=config.MIN_DETECTION_CONFIDENCE,
            min_tracking_confidence=config.MIN_TRACKING_CONFIDENCE,
        )
        self.gesture_detector = GestureDetector(
            swipe_threshold=swipe_threshold,
            vertical_tolerance_ratio=config.VERTICAL_TOLERANCE_RATIO,
            min_duration=config.SWIPE_MIN_DURATION,
            max_duration=config.SWIPE_MAX_DURATION,
            stable_frames=config.STABLE_FRAMES,
        )
        self.ppt_controller = PPTController(
            cooldown_seconds=cooldown_seconds,
            max_history=config.MAX_HISTORY,
        )
        self.dashboard = Dashboard(width=frame_width, height=frame_height)
        self.fps_counter = FPSCounter()

        self._is_running: bool = False
        self.window_name = "Real-Time Touchless PPT Controller"

    def start(self) -> None:
        """Starts the real-time processing loop."""
        print("=" * 60)
        print(" REAL-TIME TOUCHLESS PPT CONTROLLER")
        print(" Control Microsoft PowerPoint Presentations Without Touching Keyboard")
        print("=" * 60)
        print("[INFO] Initializing webcam...")

        if not self.camera.initialize():
            print(f"[ERROR] {self.camera.error_message}")
            print("[HINT] Ensure webcam is connected and permissions are granted.")
            print("[HINT] For testing on headless/remote environments, run: python test_controller.py")
            return

        print("[INFO] Camera initialized successfully.")
        print("[INFO] Starting presentation loop.")
        print("[GUIDE] Open Microsoft PowerPoint and start Slide Show (F5).")
        print("[GUIDE] Swipe Right -> Next Slide")
        print("[GUIDE] Swipe Left  -> Previous Slide")
        print("[GUIDE] Press SPACE to Toggle Pause/Active")
        print("[GUIDE] Press 'q' or ESC to Quit")
        print("-" * 60)

        self._is_running = True

        try:
            if HAS_CV2 and cv2 is not None:
                cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
                cv2.resizeWindow(self.window_name, self.camera.frame_width, self.camera.frame_height)

            while self._is_running:
                self.step()

                if HAS_CV2 and cv2 is not None:
                    key = cv2.waitKey(1) & 0xFF
                    if key in (config.KEY_QUIT_Q, config.KEY_QUIT_ESC):
                        print("[INFO] Quit requested by user.")
                        break
                    elif key == config.KEY_PAUSE_ACTIVATE:
                        new_state = self.ppt_controller.toggle_active()
                        print(f"[MODE] Control mode toggled: {'ACTIVE' if new_state else 'PAUSED'}")
                    elif key == config.KEY_TEST_NEXT:
                        print("[TEST] Manual next slide trigger (key 'n')")
                        self.ppt_controller.next_slide()
                    elif key == config.KEY_TEST_PREV:
                        print("[TEST] Manual previous slide trigger (key 'p')")
                        self.ppt_controller.previous_slide()

        except KeyboardInterrupt:
            print("\n[INFO] Interrupted by user.")
        finally:
            self.stop()

    def step(self) -> Any:
        """
        Executes one processing step on the current webcam frame.
        Can also be invoked in tests or custom event loops.
        """
        fps = self.fps_counter.update()
        success, frame = self.camera.read_frame()

        if not success or frame is None:
            # Handle frame drop or disconnected camera gracefully
            rendered = self.dashboard.render(
                camera_frame=None,
                fps=fps,
                hand_detected=False,
                current_state=GestureState.ERROR,
                control_mode_active=self.ppt_controller.is_active,
                is_cooldown=self.ppt_controller.is_in_cooldown(),
                remaining_cooldown=self.ppt_controller.remaining_cooldown(),
                last_action=self.ppt_controller.last_action,
                action_history=self.ppt_controller.history,
                camera_error=self.camera.error_message,
            )
            if HAS_CV2 and cv2 is not None and self._is_running:
                cv2.imshow(self.window_name, rendered)
            return rendered

        # 1. MediaPipe Hand Landmark Detection
        hand_found, landmarks_norm, anchor_px = self.hand_tracker.process_frame(frame)

        # 2. Draw Hand Landmark Skeleton onto frame
        if hand_found:
            self.hand_tracker.draw_landmarks(frame, landmarks_norm)

        # 3. Gesture Detection & Stability Checking
        state, confirmed_gesture = self.gesture_detector.process_point(
            hand_present=hand_found,
            anchor_coords=anchor_px,
            is_paused=not self.ppt_controller.is_active,
            in_cooldown=self.ppt_controller.is_in_cooldown(),
        )

        # 4. Dispatch PowerPoint Commands
        if confirmed_gesture == "SWIPE_RIGHT":
            executed = self.ppt_controller.next_slide()
            if executed:
                print(f"[{time.strftime('%H:%M:%S')}] >>> GESTURE CONFIRMED: SWIPE RIGHT -> NEXT SLIDE")
        elif confirmed_gesture == "SWIPE_LEFT":
            executed = self.ppt_controller.previous_slide()
            if executed:
                print(f"[{time.strftime('%H:%M:%S')}] <<< GESTURE CONFIRMED: SWIPE LEFT -> PREVIOUS SLIDE")

        # 5. Render Real-Time Dashboard Overlay
        rendered = self.dashboard.render(
            camera_frame=frame,
            fps=fps,
            hand_detected=hand_found,
            current_state=state,
            control_mode_active=self.ppt_controller.is_active,
            is_cooldown=self.ppt_controller.is_in_cooldown(),
            remaining_cooldown=self.ppt_controller.remaining_cooldown(),
            last_action=self.ppt_controller.last_action,
            action_history=self.ppt_controller.history,
            camera_error="",
        )

        if HAS_CV2 and cv2 is not None and self._is_running:
            cv2.imshow(self.window_name, rendered)

        return rendered

    def stop(self) -> None:
        """Safely shuts down camera, MediaPipe, and OpenCV display windows."""
        self._is_running = False
        print("[INFO] Releasing hardware resources...")
        self.camera.release()
        self.hand_tracker.close()
        if HAS_CV2 and cv2 is not None:
            try:
                cv2.destroyAllWindows()
            except Exception:
                pass
        print("[INFO] Application exited cleanly.")
