# Real-Time Touchless PPT Controller

> **Control Your Presentation Without Touching Your Keyboard**

An autonomous, touchless presentation control system built with **Python 3.11**, **OpenCV**, **MediaPipe**, and **PyAutoGUI**. The system detects real-time hand movements through your webcam, extracts 21 hand landmarks, verifies gesture stability, enforces cooldown protection, and controls Microsoft PowerPoint slide transitions seamlessly.

---

## 🚀 Key Features

* **Real-Time Webcam Processing:** Captures 30 FPS video with horizontal mirror flipping for intuitive natural movement.
* **MediaPipe Hand Landmark Tracking:** Tracks 21 anatomical landmarks per hand and computes stable palm-center anchors.
* **Robust Multi-Frame Swipe Detection:**
  * **Swipe Right (Left → Right):** Dispatches `Next Slide` (Right Arrow key).
  * **Swipe Left (Right → Left):** Dispatches `Previous Slide` (Left Arrow key).
* **Multi-Layer False Positive Prevention:**
  * Multi-frame motion trajectory buffer (never triggers on single-frame noise).
  * Configurable pixel displacement threshold (`SWIPE_THRESHOLD = 110`).
  * Vertical movement rejection (`VERTICAL_TOLERANCE_RATIO`) to ignore accidental arm lifts.
  * Stability checking (`STABLE_FRAMES = 3`).
* **Strict Cooldown Protection:** Enforces a 1.5-second lock after every slide transition, preventing duplicate triggers from a single stroke.
* **Control Modes:**
  * **ACTIVE:** Gestures actively control PowerPoint.
  * **PAUSED:** Video & gesture feedback remain visible, but commands to PowerPoint are disabled (toggle via `SPACE`).
* **Heads-Up Telemetry Dashboard:**
  * Real-time camera feed with skeleton overlay.
  * Live status indicators: Hand Detection, Gesture State, Cooldown Timer, Control Mode, FPS.
  * Scrolling Recent Actions History log (last 10 events).
  * Keyboard shortcut reference.
* **Graceful Error Handling:** Safe camera reconnection checks, non-blocking headless fallback, and safe resource cleanup on exit.

---

## 🛠️ Technology Stack

* **Python 3.11**
* **OpenCV (`opencv-python`):** Video capture, image processing, HUD rendering.
* **MediaPipe (`mediapipe`):** 21-point hand landmark estimation.
* **PyAutoGUI (`pyautogui`):** Presentation keyboard shortcut dispatching.
* **NumPy (`numpy`):** Coordinate arrays and spatial vectors.

---

## 📁 Project Structure

```text
touchless-ppt-controller/
│
├── main.py                     # Application entry point & CLI parser
├── config.py                   # Centralized configuration parameters
├── test_controller.py          # Automated test suite (15 unit tests)
├── requirements.txt            # Python dependencies
├── README.md                   # Complete documentation
│
├── camera/
│   ├── __init__.py
│   └── camera_manager.py       # OpenCV webcam capture & error handling
│
├── gestures/
│   ├── __init__.py
│   ├── hand_tracker.py         # MediaPipe 21-point landmark extraction
│   ├── swipe_detector.py       # Multi-frame trajectory & swipe algorithm
│   ├── gesture_detector.py     # Stability buffer & Finite State Machine
│   └── gesture_controller.py   # Runtime orchestrator
│
├── controller/
│   ├── __init__.py
│   └── ppt_controller.py       # PyAutoGUI slide commands & cooldown manager
│
├── ui/
│   ├── __init__.py
│   └── dashboard.py            # Real-time HUD and telemetry visualizer
│
└── utils/
    ├── __init__.py
    └── helpers.py              # FPS counter & timestamp formatting
```

---

## 📦 Installation & Setup

### 1. Prerequisites
* Python 3.11 installed on your computer.
* A working webcam (built-in or USB).
* Microsoft PowerPoint (or any presentation tool supporting Left/Right arrow keys).

### 2. Clone or Navigate to the Project
```bash
cd touchless-ppt-controller
```

### 3. Create and Activate a Virtual Environment
**On Windows:**
```cmd
python -m venv venv
venv\Scripts\activate
```

**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

---

## 🖥️ How to Use with Microsoft PowerPoint

Follow these simple steps for a presentation:

1. **Open Microsoft PowerPoint** and open your presentation file (`.pptx`).
2. **Start the Slide Show** by pressing `F5` in PowerPoint.
3. **Launch the Controller**:
   ```bash
   python main.py
   ```
4. **Position Your Hand:** Place your hand within webcam view (~2 to 4 feet away).
5. **Perform Gestures:**
   * **Next Slide:** Move hand briskly from **Left to Right**.
   * **Previous Slide:** Move hand briskly from **Right to Left**.
6. **Pause Anytime:** Press `SPACE` to pause gesture execution while answering audience questions. Press `SPACE` again to resume.
7. **Exit:** Press `q` or `ESC` in the camera window or terminal to cleanly exit.

---

## ⌨️ Controls & Shortcuts

| Key | Action | Description |
|---|---|---|
| **SPACE** | Toggle Control Mode | Switches between `ACTIVE` and `PAUSED` |
| **Q** or **ESC** | Quit | Cleanly releases camera and closes app |
| **N** | Test Next Slide | Manually tests `pyautogui.press('right')` |
| **P** | Test Previous Slide | Manually tests `pyautogui.press('left')` |

---

## ⚙️ Configuration Parameters (`config.py`)

All parameters are easily tunable in `config.py`:

```python
CAMERA_INDEX = 0              # 0 for default webcam, 1 for external USB
FRAME_WIDTH = 1280            # Video resolution width
FRAME_HEIGHT = 720            # Video resolution height
SWIPE_THRESHOLD = 110.0       # Minimum horizontal pixels to register a swipe
VERTICAL_TOLERANCE_RATIO = 0.75 # Rejects motions with excessive vertical drift
STABLE_FRAMES = 3             # Consecutive frames required to confirm gesture
COOLDOWN_SECONDS = 1.5        # Seconds between accepted slide commands
MAX_HISTORY = 10              # Maximum entries kept in recent actions HUD
```

---

## 🧪 Automated Testing

The project includes an automated test suite verifying swipe trajectory math, cooldown enforcement, and state transitions without needing a physical webcam or active PowerPoint window:

```bash
python test_controller.py
```

Test Results:
* **15 / 15 Tests Passing**
* Verifies `SWIPE_RIGHT`, `SWIPE_LEFT`, jitter rejection, vertical movement filtering, cooldown lockouts, and active/paused state transitions.

---

## 🎓 College Demonstration Guide

To demonstrate this project for an evaluation or viva:
1. **Show Architecture:** Explain the pipeline:
   `Webcam → Frame Capture → MediaPipe Hands → Landmark 9 Anchor → Trajectory Buffer → Stability Check → Cooldown Check → PyAutoGUI → PowerPoint`.
2. **Live Demo:**
   * Show the real-time HUD with the 21-point hand skeleton.
   * Demonstrate swipe right to advance slide 1 → slide 2.
   * Point out the cooldown countdown timer (`LOCK: 1.5s` → `READY`).
   * Swipe rapidly to prove duplicate slide jumps are blocked.
   * Press `SPACE` to show `MODE: PAUSED` and demonstrate that gestures are detected visually but do not alter the slide show.
   * Press `SPACE` to reactivate and swipe left to return to the title slide.
