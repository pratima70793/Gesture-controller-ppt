"""
Real-Time Touchless PPT Controller.
Main Entrypoint.

Usage:
    python main.py
    python main.py --camera 0
    python main.py --cooldown 1.5 --threshold 100
"""

import argparse
import sys
import os

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import config
from gestures.gesture_controller import GestureController


def parse_args():
    parser = argparse.ArgumentParser(
        description="Real-Time Touchless PPT Controller using MediaPipe and PyAutoGUI."
    )
    parser.add_argument(
        "--camera",
        type=int,
        default=config.CAMERA_INDEX,
        help=f"Camera index to use (default: {config.CAMERA_INDEX})",
    )
    parser.add_argument(
        "--width",
        type=int,
        default=config.FRAME_WIDTH,
        help=f"Capture frame width (default: {config.FRAME_WIDTH})",
    )
    parser.add_argument(
        "--height",
        type=int,
        default=config.FRAME_HEIGHT,
        help=f"Capture frame height (default: {config.FRAME_HEIGHT})",
    )
    parser.add_argument(
        "--cooldown",
        type=float,
        default=config.COOLDOWN_SECONDS,
        help=f"Cooldown in seconds between slide triggers (default: {config.COOLDOWN_SECONDS})",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=config.SWIPE_THRESHOLD,
        help=f"Horizontal pixel displacement threshold for swipe (default: {config.SWIPE_THRESHOLD})",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    controller = GestureController(
        camera_index=args.camera,
        frame_width=args.width,
        frame_height=args.height,
        cooldown_seconds=args.cooldown,
        swipe_threshold=args.threshold,
    )

    try:
        controller.start()
    except Exception as e:
        print(f"[FATAL] Unexpected error occurred: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
