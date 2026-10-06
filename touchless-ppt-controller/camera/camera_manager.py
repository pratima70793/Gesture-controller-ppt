"""
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

        self._cap: Optional[cv2.VideoCapture] = None
        self._is_connected = False
        self._error_message = ""

    def initialize(self) -> bool:
        """
        Attempts to open the video capture device.
        Returns True if successful, False otherwise without raising unhandled exceptions.
        """
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

            # Configure resolution
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
        """
        Captures a single frame, optionally flips it horizontally for mirror view.
        Returns:
            (success, frame_bgr)
        """
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
        """Safely closes video capture device."""
        if self._cap is not None:
            try:
                self._cap.release()
            except Exception:
                pass
            self._cap = None
        self._is_connected = False
