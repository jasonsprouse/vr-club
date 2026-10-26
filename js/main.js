import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { AudioManager } from './audioManager.js';
import { ClubScene } from './clubScene.js';
import { XRControllerManager } from './xrController.js';
import { NPCManager } from './npcManager.js';

class App {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.clock = new THREE.Clock();

    this.initThree();
    this.initAudio();
    this.initScene();
    this.initXR();
    this.initDesktopControls();
    this.initHUD();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initThree() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05060b, 0.025);

    // 2. Camera & Dolly Rig (WebXR room-scale & locomotion)
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 1.6, 0);

    this.dolly = new THREE.Group();
    this.dolly.position.set(0, 0, 12);
    this.dolly.add(this.camera);
    this.scene.add(this.dolly);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.xr.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // WebXR VR Button
    const vrButton = VRButton.createButton(this.renderer);
    document.body.appendChild(vrButton);

    this.renderer.xr.addEventListener('sessionstart', () => {
      document.getElementById('hud-overlay').style.display = 'none';
      document.getElementById('instructions-modal').classList.add('hidden');
    });

    this.renderer.xr.addEventListener('sessionend', () => {
      document.getElementById('hud-overlay').style.display = 'flex';
    });
  }

  initAudio() {
    this.audioManager = new AudioManager((track, isPlaying) => {
      this.updateHUDTrackInfo(track, isPlaying);
    });
  }

  initScene() {
    this.clubScene = new ClubScene(this.scene);
    this.npcManager = new NPCManager(this.scene);
    this.audioManager.attachRoomVideo(this.clubScene.roomVideo);
    if (this.clubScene.roomVideo) {
      this.clubScene.roomVideo.addEventListener('ended', () => {
        this.handleAction('next');
      });
    }
  }

  initXR() {
    this.xrController = new XRControllerManager(
      this.renderer,
      this.scene,
      this.camera,
      this.dolly,
      this.clubScene.interactableObjects,
      (action) => this.handleAction(action)
    );
  }

  initDesktopControls() {
    this.controls = new PointerLockControls(this.camera, document.body);
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isSprinting = false;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    const reticle = document.getElementById('reticle');

    // Click canvas to lock pointer
    this.container.addEventListener('click', () => {
      if (!this.renderer.xr.isPresenting && !this.controls.isLocked) {
        this.controls.lock();
      } else if (this.controls.isLocked) {
        this.performDesktopRaycast();
      }
    });

    this.controls.addEventListener('lock', () => {
      reticle.style.display = 'block';
    });

    this.controls.addEventListener('unlock', () => {
      reticle.style.display = 'none';
    });

    // Keyboard events
    document.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.moveForward = true; break;
        case 'KeyS': case 'ArrowDown': this.moveBackward = true; break;
        case 'KeyA': case 'ArrowLeft': this.moveLeft = true; break;
        case 'KeyD': case 'ArrowRight': this.moveRight = true; break;
        case 'ShiftLeft': case 'ShiftRight': this.isSprinting = true; break;
        case 'Space':
          this.handleAction('play');
          break;
        case 'KeyN':
          this.handleAction('next');
          break;
        case 'KeyP':
          this.handleAction('prev');
          break;
      }
    });

    document.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.moveForward = false; break;
        case 'KeyS': case 'ArrowDown': this.moveBackward = false; break;
        case 'KeyA': case 'ArrowLeft': this.moveLeft = false; break;
        case 'KeyD': case 'ArrowRight': this.moveRight = false; break;
        case 'ShiftLeft': case 'ShiftRight': this.isSprinting = false; break;
      }
    });

    this.desktopRaycaster = new THREE.Raycaster();
  }

  performDesktopRaycast() {
    this.desktopRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.desktopRaycaster.intersectObjects(this.clubScene.interactableObjects, true);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      this.handleAction(hit.userData.action);
    }
  }

  selectTrack(idx) {
    if (idx < 0) idx = this.audioManager.playlist.length - 1;
    if (idx >= this.audioManager.playlist.length) idx = 0;

    this.audioManager.resumeAudioContext();
    this.audioManager.currentIndex = idx;
    this.audioManager.isPlaying = true;

    // Play video directly on in-room 3D Cinema Screen
    const track = this.clubScene.playTrackIndex(idx);

    // Ensure 3D screen is showing video texture if user toggled to visualizer
    const screenSourceBtn = document.getElementById('btn-screen-source');
    if (screenSourceBtn) {
      screenSourceBtn.innerHTML = '<i class="fas fa-film"></i> 3D Screen: Video';
      screenSourceBtn.classList.add('active');
    }

    // Update 2D HUD track info and in-VR controller remote
    this.updateHUDTrackInfo(track, true);
    if (this.xrController) {
      this.xrController.renderHandheldRemote(track.title, true);
    }
  }

  handleAction(action) {
    if (action === 'play' || action === 'toggleVideo') {
      if (this.clubScene.isVideoPlaying) {
        this.clubScene.pauseVideo();
        this.audioManager.isPlaying = false;
        const current = this.audioManager.getCurrentTrack();
        this.updateHUDTrackInfo(current, false);
        if (this.xrController) this.xrController.renderHandheldRemote(current.title, false);
      } else {
        this.audioManager.resumeAudioContext();
        this.clubScene.playVideo();
        this.audioManager.isPlaying = true;
        const current = this.audioManager.getCurrentTrack();
        this.updateHUDTrackInfo(current, true);
        if (this.xrController) this.xrController.renderHandheldRemote(current.title, true);
      }
    } else if (action === 'next') {
      const nextIdx = (this.audioManager.currentIndex + 1) % this.audioManager.playlist.length;
      this.selectTrack(nextIdx);
    } else if (action === 'prev') {
      const prevIdx = (this.audioManager.currentIndex - 1 + this.audioManager.playlist.length) % this.audioManager.playlist.length;
      this.selectTrack(prevIdx);
    }
  }

  initHUD() {
    const playBtn = document.getElementById('btn-play');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const volSlider = document.getElementById('volume-slider');
    const laserBtn = document.getElementById('btn-laser');
    const strobeBtn = document.getElementById('btn-strobe');
    const modeBtn = document.getElementById('btn-mode');
    const startBtn = document.getElementById('btn-start-club');
    const modal = document.getElementById('instructions-modal');
    const playlistToggle = document.getElementById('btn-playlist-toggle');
    const playlistDrawer = document.getElementById('playlist-drawer');
    const playlistClose = document.getElementById('btn-close-playlist');
    const playlistItems = document.getElementById('playlist-items');
    const screenSourceBtn = document.getElementById('btn-screen-source');

    // 1. In-Room 3D Cinema Screen Toggle (Switch between In-Room Video and Spectrum Visualizer)
    let screenIsVideo = true;
    screenSourceBtn?.addEventListener('click', () => {
      screenIsVideo = !screenIsVideo;
      if (screenIsVideo) {
        this.clubScene.screenMat.map = this.clubScene.videoTexture;
        this.clubScene.playVideo();
        this.audioManager.isPlaying = true;
        screenSourceBtn.innerHTML = '<i class="fas fa-film"></i> 3D Screen: Video';
        screenSourceBtn.classList.add('active');
        this.updateHUDTrackInfo(this.audioManager.getCurrentTrack(), true);
      } else {
        this.clubScene.screenMat.map = this.clubScene.screenTexture;
        this.clubScene.pauseVideo();
        screenSourceBtn.innerHTML = '<i class="fas fa-sliders-h"></i> 3D Screen: Visualizer';
        screenSourceBtn.classList.remove('active');
      }
      this.clubScene.screenMat.needsUpdate = true;
    });

    // 2. Build Unified Tracklist Drawer for ALL 13 Good Faith Paradigm tracks
    if (playlistItems) {
      playlistItems.innerHTML = '';

      const vHeader = document.createElement('div');
      vHeader.className = 'playlist-section-header';
      vHeader.innerHTML = '<i class="fas fa-film" style="color:#00f0ff; margin-right:6px;"></i> 3D CINEMA MUSIC VIDEOS (13 TRACKS)';
      playlistItems.appendChild(vHeader);

      this.audioManager.playlist.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = `playlist-row ${idx === this.audioManager.currentIndex ? 'active' : ''}`;
        row.setAttribute('data-index', idx);
        row.innerHTML = `
          <span class="pl-idx">${String(idx + 1).padStart(2, '0')}</span>
          <img class="pl-thumb" src="${item.thumb}" alt="${item.title}">
          <div class="pl-meta">
            <div class="pl-title">${item.title}</div>
            <div class="pl-type">${item.type} <span style="color:#00f0ff; font-weight:700; margin-left:4px;">• 3D Screen</span></div>
          </div>
          <span class="pl-play-icon"><i class="fas ${idx === this.audioManager.currentIndex && this.audioManager.isPlaying ? 'fa-volume-high' : 'fa-play'}" style="color:${idx === this.audioManager.currentIndex ? '#00f0ff' : '#8e95aa'}; font-size:11px;"></i></span>
        `;
        row.addEventListener('click', () => {
          this.selectTrack(idx);
          playlistDrawer.classList.add('hidden');
        });
        playlistItems.appendChild(row);
      });
    }

    playlistToggle?.addEventListener('click', () => {
      playlistDrawer?.classList.toggle('hidden');
    });

    playlistClose?.addEventListener('click', () => {
      playlistDrawer?.classList.add('hidden');
    });

    // Stage Video Screen Controls
    const videoFrame = document.getElementById('stage-video-frame');
    const btnVideoToggle = document.getElementById('btn-video-toggle');
    let videoMode = 'stage';

    const setVideoMode = (mode) => {
      videoMode = mode;
      if (videoFrame) videoFrame.className = `video-mode-${mode}`;
      if (mode === 'stage') {
        if (btnVideoToggle) {
          btnVideoToggle.innerHTML = '<i class="fas fa-tv"></i> Video: Stage';
          btnVideoToggle.classList.add('active');
        }
      } else if (mode === 'pip') {
        if (btnVideoToggle) {
          btnVideoToggle.innerHTML = '<i class="fas fa-clone"></i> Video: PIP';
          btnVideoToggle.classList.add('active');
        }
      } else {
        if (btnVideoToggle) {
          btnVideoToggle.innerHTML = '<i class="fas fa-eye-slash"></i> Video: OFF';
          btnVideoToggle.classList.remove('active');
        }
      }
    };

    btnVideoToggle?.addEventListener('click', () => {
      if (videoMode === 'stage') setVideoMode('pip');
      else if (videoMode === 'pip') setVideoMode('hidden');
      else setVideoMode('stage');
    });

    document.getElementById('btn-video-pip')?.addEventListener('click', () => setVideoMode('pip'));
    document.getElementById('btn-video-stage')?.addEventListener('click', () => setVideoMode('stage'));
    document.getElementById('btn-video-hide')?.addEventListener('click', () => setVideoMode('hidden'));

    // Start / Dismiss modal
    startBtn?.addEventListener('click', () => {
      modal?.classList.add('hidden');
      this.selectTrack(0);
      this.controls.lock();
    });

    // Player Controls
    playBtn?.addEventListener('click', () => this.handleAction('play'));
    prevBtn?.addEventListener('click', () => this.handleAction('prev'));
    nextBtn?.addEventListener('click', () => this.handleAction('next'));

    volSlider?.addEventListener('input', (e) => {
      this.audioManager.setVolume(parseInt(e.target.value));
    });

    // FX Controls
    laserBtn?.addEventListener('click', () => {
      this.clubScene.lasersEnabled = !this.clubScene.lasersEnabled;
      laserBtn.classList.toggle('active', this.clubScene.lasersEnabled);
    });

    strobeBtn?.addEventListener('click', () => {
      this.clubScene.strobesEnabled = !this.clubScene.strobesEnabled;
      strobeBtn.classList.toggle('active', this.clubScene.strobesEnabled);
    });

    modeBtn?.addEventListener('click', () => {
      this.clubScene.visualizerMode = (this.clubScene.visualizerMode + 1) % 2;
      modeBtn.innerHTML = `<i class="fas fa-sliders-h"></i> ${this.clubScene.visualizerMode === 0 ? 'Mode: Spectrum' : 'Mode: Tunnel'}`;
    });

    // View Presets
    document.querySelectorAll('.btn-preset').forEach((btn) => {
      btn?.addEventListener('click', (e) => {
        const view = e.target.getAttribute('data-view');
        this.teleportToPreset(view);
      });
    });
  }

  teleportToPreset(view) {
    if (view === 'floor') {
      this.dolly.position.set(0, 0, 3);
      this.camera.lookAt(0, 2, -14);
    } else if (view === 'dj') {
      this.dolly.position.set(0, 1.1, -13.5);
      this.camera.lookAt(0, 2, 8);
    } else if (view === 'lounge') {
      this.dolly.position.set(-9, 0, 6);
      this.camera.lookAt(0, 1.5, -5);
    } else if (view === 'bar') {
      this.dolly.position.set(9, 0, 4);
      this.camera.lookAt(12, 1.5, 4);
    } else if (view === 'balcony') {
      this.dolly.position.set(0, 4.5, 16);
      this.camera.lookAt(0, 2, -10);
    }
  }

  updateHUDTrackInfo(track, isPlaying) {
    if (!track) return;
    const playIcon = document.querySelector('#btn-play i');
    if (playIcon) {
      playIcon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
    }
    const titleEl = document.getElementById('track-title');
    const badgeEl = document.getElementById('track-badge');
    const thumbEl = document.getElementById('track-thumb-img');

    if (titleEl) titleEl.textContent = track.title;
    if (badgeEl) badgeEl.textContent = track.type;
    if (thumbEl) thumbEl.src = track.thumb;

    const videoTitleEl = document.getElementById('video-screen-title');
    if (videoTitleEl) videoTitleEl.textContent = `${track.title} • @GparadigmOrgLove`;

    // Highlight active in tracklist drawer & update icons
    const rows = document.querySelectorAll('.playlist-row');
    rows.forEach((r) => {
      const idx = parseInt(r.getAttribute('data-index'));
      const isCurrent = (idx === this.audioManager.currentIndex);
      r.classList.toggle('active', isCurrent);
      const icon = r.querySelector('.pl-play-icon i');
      if (icon) {
        if (isCurrent && isPlaying) {
          icon.className = 'fas fa-volume-high';
          icon.style.color = '#00f0ff';
        } else if (isCurrent) {
          icon.className = 'fas fa-pause';
          icon.style.color = '#ff007f';
        } else {
          icon.className = 'fas fa-play';
          icon.style.color = '#8e95aa';
        }
      }
    });

    if (this.xrController) {
      this.xrController.renderHandheldRemote(track.title, isPlaying);
    }
  }

  updateDesktopMovement(delta) {
    if (!this.controls.isLocked) return;

    const speed = (this.isSprinting ? 12 : 6) * delta;
    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    if (this.moveForward || this.moveBackward) {
      this.velocity.z -= this.direction.z * speed * 40;
    }
    if (this.moveLeft || this.moveRight) {
      this.velocity.x -= this.direction.x * speed * 40;
    }

    this.controls.moveRight(-this.velocity.x * delta);
    this.controls.moveForward(-this.velocity.z * delta);

    // Room boundaries
    this.dolly.position.x = Math.max(-15, Math.min(15, this.dolly.position.x));
    this.dolly.position.z = Math.max(-20, Math.min(20, this.dolly.position.z));
  }

  start() {
    this.renderer.setAnimationLoop((time, frame) => {
      const delta = Math.min(this.clock.getDelta(), 0.1);
      const t = this.clock.getElapsedTime();

      this.audioManager.updateAudioData();
      this.clubScene.update(delta, t, this.audioManager);
      if (this.npcManager) {
        this.npcManager.update(delta, t, this.audioManager);
      }

      if (this.renderer.xr.isPresenting) {
        const curVideo = this.clubScene.getCurrentVideo();
        this.xrController.update(
          delta,
          this.clubScene.floorMesh,
          curVideo ? curVideo.title : '',
          this.clubScene.isVideoPlaying
        );
      } else {
        this.updateDesktopMovement(delta);
        this.pollDesktopGamepad();
      }

      this.renderer.render(this.scene, this.camera);
    });
  }

  // Support for standard Bluetooth / USB Gamepads (Xbox, PlayStation, etc.)
  pollDesktopGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];
    if (!gp) return;

    if (!this.lastGpButtons) this.lastGpButtons = {};

    const isDown = (idx) => gp.buttons[idx] && (gp.buttons[idx].pressed || gp.buttons[idx].value > 0.5);

    // Button 0 (A / Cross): Play / Pause
    if (isDown(0) && !this.lastGpButtons[0]) {
      this.handleAction('play');
    }
    // Button 1 (B / Circle): Next Video
    if (isDown(1) && !this.lastGpButtons[1]) {
      this.handleAction('next');
    }
    // Button 2 (X / Square): Prev Video
    if (isDown(2) && !this.lastGpButtons[2]) {
      this.handleAction('prev');
    }
    // D-Pad Left (14) / Right (15)
    if (isDown(14) && !this.lastGpButtons[14]) {
      this.handleAction('prev');
    }
    if (isDown(15) && !this.lastGpButtons[15]) {
      this.handleAction('next');
    }

    // Save states
    for (let i = 0; i < gp.buttons.length; i++) {
      this.lastGpButtons[i] = isDown(i);
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  try {
    const app = new App();
    app.start();
  } catch (err) {
    console.error("Initialization error:", err);
    const box = document.getElementById('debug-error-box');
    if (box) {
      box.style.display = 'block';
      box.textContent += '❌ [Startup Crash] ' + (err.stack || err) + '\n';
    }
  }
});
