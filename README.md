# Good Faith Paradigm VR Club 🪩🕶️

An immersive WebXR virtual reality nightclub experience featuring music, in-room cinema video screens, audio-reactive visualizers, and dancing NPCs from **Good Faith Paradigm** ([@GparadigmOrgLove](https://www.youtube.com/@GparadigmOrgLove)).

Built with **Three.js**, **WebXR**, and **Web Audio API**.

---

## 🌟 Key Features

### 🎬 Massive 12-Meter In-Room Cinema Screen & Tracklist Controller
- **Giant Floating 16:9 Cinema Screen**: Positioned directly above the DJ booth (`12.0m x 6.75m`), angled forward toward the dance floor, encased in a cyber bezel and pulsating cyan bias-lighting halo.
- **Tracklist (13) Direct Screen Control**: Selecting any track from the on-screen Tracklist or in-VR controller immediately loads and streams that official music video directly onto the 3D in-room cinema screen.
- **Auto-Advance & Seamless Loop**: Automatically transitions to the next video when playback finishes, looping continuously through all 13 tracks.

### 🎧 13 Curated Good Faith Paradigm Tracks & Videos
1. *Sanctuary of Sound* (Featured Track)
2. *Light In Your Mind* (Club Anthem)
3. *Have You Seen the Light* (Trance / Synth)
4. *Hold The Grace* (Spiritual Groove)
5. *TimeLapse* (Atmospheric Beat)
6. *Golden Plates and Spirit's Light* (Deep Synthesis)
7. *Christ Mind* (Vocal Meditation)
8. *The Eleventh Alignment* (Electro Sacred)
9. *A Thousand Doors* (Ambient Pulse)
10. *Seeking the Third Story* (Sacred Waves)
11. *The Theophany* (Official Short)
12. *The Mathematics of Theophany* (Official Short)
13. *The Insight Engine* (Official Short)

### 🔊 100% Authentic Music & Web Audio Reactivity
- **Zero Synthetic Beat Overlays**: 100% authentic soundtrack straight from the music videos.
- **Real-Time Music Reactivity**: The actual audio stream from the video drives:
  - The **100-tile reactive LED dance floor** with ripple waves and bass pulse explosions.
  - The **moving-head spotlights and overhead laser array**.
  - The **pulsating neon halo** around the video screen.
  - The **dancing NPCs** (podium go-go dancers, floor crowd, DJ, bartender).
  - The **turntable platter rotation and mixer VU meters**.

### 🥽 Multi-Device & WebXR Controls
- **VR Headsets (Meta Quest 2/3/Pro, Apple Vision Pro, Pico 4, HTC Vive, PC VR)**:
  - WebXR `immersive-vr` mode via **ENTER VR** button.
  - **In-VR Handheld Media Remote**: Docked to left wrist with interactive `[PREV]`, `[PLAY]`, and `[NEXT]` buttons and live track title display.
  - **50m Laser Pointer**: Aim the controller laser at the giant 12m video screen and pull the trigger to toggle Play / Pause from anywhere in the club.
  - **Hardware Buttons**: `[A]` / `[X]` to Play/Pause, `[B]` / `[Y]` for Next track, thumbstick click for Previous track.
  - **Teleportation & Locomotion**: Aim floor ring to teleport; smooth thumbstick walking and snap-turning.
- **Desktop (PC / Mac)**:
  - Click anywhere to lock pointer and walk around with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / Arrow Keys.
  - Hold <kbd>Shift</kbd> to sprint.
  - <kbd>Spacebar</kbd> for Play/Pause, <kbd>N</kbd> for Next track, <kbd>P</kbd> for Previous track.
  - Click directly on 3D objects or use the HUD controls and Tracklist drawer.
  - USB / Bluetooth Gamepad support (Xbox, PlayStation, etc.).

---

## 🚀 How to Run

### Using the Python Streaming Server (Recommended)
Open a terminal in this folder and run:
```bash
python serve.py
```
- Open `http://localhost:8080` in your desktop browser.
- Or on your **Meta Quest Browser / VR Headset**, open `http://<YOUR-LOCAL-IP>:8080` (printed in the terminal).
