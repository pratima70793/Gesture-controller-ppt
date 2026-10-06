"""
Dashboard and Telemetry UI Module.
Renders a real-time professional heads-up display (HUD) and side-by-side
telemetry panel for presentation demonstrations.
"""

from typing import List, Optional, Tuple, Any

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

from controller.ppt_controller import ActionRecord
from gestures.gesture_detector import GestureState


class Dashboard:
    """
    Renders high-contrast, professional telemetry overlays and split-screen
    dashboard using OpenCV graphics.
    """

    def __init__(self, width: int = 1280, height: int = 720) -> None:
        self.width = width
        self.height = height

    def render(
        self,
        camera_frame: Optional[Any],
        fps: float,
        hand_detected: bool,
        current_state: GestureState,
        control_mode_active: bool,
        is_cooldown: bool,
        remaining_cooldown: float,
        last_action: str,
        action_history: List[ActionRecord],
        camera_error: str = "",
    ) -> Any:
        """
        Creates a clean presentation dashboard combining camera view with
        telemetry and instructions.
        """
        # If camera frame is missing (error state or headless), generate blank canvas
        if camera_frame is None or not HAS_CV2 or not HAS_NUMPY:
            if HAS_NUMPY and np is not None and HAS_CV2 and cv2 is not None:
                canvas = np.zeros((self.height, self.width, 3), dtype=np.uint8)
                canvas[:] = (24, 27, 32)
                if camera_error:
                    cv2.putText(
                        canvas,
                        f"CAMERA STATUS: {camera_error}",
                        (60, self.height // 2),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.9,
                        (70, 70, 240),
                        2,
                        cv2.LINE_AA,
                    )
                return canvas
            return None

        # Working display image
        canvas = camera_frame.copy()
        h, w = canvas.shape[:2]

        # ----------------------------------------------------
        # TOP HEADER HUD (Dark translucent banner)
        # ----------------------------------------------------
        header_height = 80
        overlay = canvas.copy()
        cv2.rectangle(overlay, (0, 0), (w, header_height), (15, 18, 22), -1)
        cv2.addWeighted(overlay, 0.75, canvas, 0.25, 0, canvas)

        # Title
        cv2.putText(
            canvas,
            "REAL-TIME TOUCHLESS PPT CONTROLLER",
            (24, 38),
            cv2.FONT_HERSHEY_DUPLEX,
            0.8,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )
        cv2.putText(
            canvas,
            "Autonomous Hand Gesture PowerPoint Presentation System",
            (25, 62),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (170, 175, 185),
            1,
            cv2.LINE_AA,
        )

        # Control Mode Pill (Right header)
        mode_text = "MODE: ACTIVE" if control_mode_active else "MODE: PAUSED"
        mode_color = (46, 204, 113) if control_mode_active else (75, 75, 235)  # Green / Red
        cv2.rectangle(canvas, (w - 240, 20), (w - 24, 60), mode_color, 2)
        cv2.putText(
            canvas,
            mode_text,
            (w - 225, 46),
            cv2.FONT_HERSHEY_DUPLEX,
            0.6,
            mode_color,
            2,
            cv2.LINE_AA,
        )

        # ----------------------------------------------------
        # BOTTOM STATUS TELEMETRY DOCK
        # ----------------------------------------------------
        dock_height = 130
        dock_y = h - dock_height
        overlay = canvas.copy()
        cv2.rectangle(overlay, (0, dock_y), (w, h), (15, 18, 22), -1)
        cv2.addWeighted(overlay, 0.85, canvas, 0.15, 0, canvas)

        # Divide dock into 4 columns:
        # Col 1: Hand Status & FPS
        # Col 2: Current Gesture & Animation
        # Col 3: Cooldown & Execution Status
        # Col 4: Last Action & History
        col_w = w // 4

        # Col 1: Hand Status & FPS
        hand_str = "DETECTED" if hand_detected else "NOT DETECTED"
        hand_col = (46, 204, 113) if hand_detected else (140, 145, 155)
        cv2.putText(canvas, "HAND TRACKING", (24, dock_y + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 165, 175), 1)
        cv2.putText(canvas, hand_str, (24, dock_y + 62), cv2.FONT_HERSHEY_DUPLEX, 0.7, hand_col, 2)
        cv2.putText(canvas, f"CAMERA FPS: {int(fps)}", (24, dock_y + 98), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 205, 215), 1)

        # Col 2: Current Gesture
        gesture_text = current_state.value.replace("_", " ")
        g_col = (255, 215, 0) if "SWIPE" in current_state.value else (240, 240, 240)
        cv2.putText(canvas, "GESTURE DETECTED", (col_w + 10, dock_y + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 165, 175), 1)
        cv2.putText(canvas, gesture_text, (col_w + 10, dock_y + 65), cv2.FONT_HERSHEY_DUPLEX, 0.75, g_col, 2)
        
        # Subtle direction indicator
        if current_state == GestureState.SWIPE_RIGHT:
            cv2.putText(canvas, ">>> NEXT SLIDE >>>", (col_w + 10, dock_y + 100), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (46, 204, 113), 2)
        elif current_state == GestureState.SWIPE_LEFT:
            cv2.putText(canvas, "<<< PREV SLIDE <<<", (col_w + 10, dock_y + 100), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 165, 0), 2)
        else:
            cv2.putText(canvas, "Awaiting hand swipe...", (col_w + 10, dock_y + 100), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (140, 145, 155), 1)

        # Col 3: Cooldown Status
        cv2.putText(canvas, "COOLDOWN SAFETY", (col_w * 2 + 10, dock_y + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 165, 175), 1)
        if is_cooldown:
            cd_text = f"LOCK: {remaining_cooldown:.1f}s"
            cd_col = (75, 75, 235)
            # Progress bar
            bar_w = 160
            filled_w = int(bar_w * (remaining_cooldown / 1.5))
            cv2.rectangle(canvas, (col_w * 2 + 10, dock_y + 82), (col_w * 2 + 10 + bar_w, dock_y + 94), (60, 60, 70), -1)
            cv2.rectangle(canvas, (col_w * 2 + 10, dock_y + 82), (col_w * 2 + 10 + filled_w, dock_y + 94), cd_col, -1)
        else:
            cd_text = "READY"
            cd_col = (46, 204, 113)
            cv2.putText(canvas, "Ready for next gesture", (col_w * 2 + 10, dock_y + 95), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (140, 145, 155), 1)

        cv2.putText(canvas, cd_text, (col_w * 2 + 10, dock_y + 65), cv2.FONT_HERSHEY_DUPLEX, 0.75, cd_col, 2)

        # Col 4: Last Action & Shortcuts
        cv2.putText(canvas, "LAST COMMAND", (col_w * 3 + 10, dock_y + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 165, 175), 1)
        cv2.putText(canvas, last_action, (col_w * 3 + 10, dock_y + 62), cv2.FONT_HERSHEY_DUPLEX, 0.65, (255, 255, 255), 2)
        cv2.putText(canvas, "[SPACE] Pause/Active | [Q] Quit", (col_w * 3 + 10, dock_y + 98), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (180, 185, 195), 1)

        # ----------------------------------------------------
        # TOP-RIGHT MINI FLOATING ACTION HISTORY OVERLAY
        # ----------------------------------------------------
        if action_history:
            hist_w = 260
            hist_h = min(150, 30 + len(action_history[:4]) * 24)
            hist_x = w - hist_w - 20
            hist_y = header_height + 15
            
            overlay = canvas.copy()
            cv2.rectangle(overlay, (hist_x, hist_y), (hist_x + hist_w, hist_y + hist_h), (18, 22, 28), -1)
            cv2.addWeighted(overlay, 0.75, canvas, 0.25, 0, canvas)
            cv2.rectangle(canvas, (hist_x, hist_y), (hist_x + hist_w, hist_y + hist_h), (50, 55, 65), 1)

            cv2.putText(canvas, "RECENT ACTIONS", (hist_x + 12, hist_y + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (160, 165, 175), 1)
            for idx, item in enumerate(action_history[:4]):
                row_y = hist_y + 44 + idx * 24
                cv2.putText(
                    canvas,
                    f"{item.time_str} {item.action}",
                    (hist_x + 12, row_y),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.44,
                    (230, 235, 245),
                    1,
                    cv2.LINE_AA,
                )

        return canvas
