class CameraSystem {
    constructor(game) {
        this.game = game;
        this.cameraPanel = document.getElementById('camera-panel');
        this.currentCamLabel = document.getElementById('current-cam-label');
        this.cameraErrorLabel = document.getElementById('camera-error-label');
        this.playSoundBtn = document.getElementById('play-sound-btn');
        this.shockHawkingBtn = document.getElementById('shock-hawking-btn');
        this.currentSoundToggle = false;
        this.staticVideo = document.getElementById('camera-static-video');
        
        this.soundButtonCooldown = false;
        this.soundButtonUseCount = 0;
        this.maxSoundUses = 5; 
        this.cooldownTime = 8000; 
        this.cooldownInterval = null; 
        
        this.locationAttractCount = {}; 
        this.maxLocationAttractCount = 2; 
        this.lastEpLocation = null; 
        
        this.characterImages = null;
        this.characterPositions = null;
        this.characterBrightness = null;
        this.characterRotation = null;
        
        this.bindEvents();
    }
    
    initEPConfig() {
        if (this.game.enemyAI) {
            this.characterImages = this.game.enemyAI.characterImages;
            this.characterPositions = this.game.enemyAI.characterPositions;
            this.characterBrightness = this.game.enemyAI.characterBrightness;
            this.characterRotation = this.game.enemyAI.characterRotation;
        }
    }

    bindEvents() {
        if (this.playSoundBtn) this.playSoundBtn.addEventListener('click', () => this.playAmbientSound());
        if (this.shockHawkingBtn) this.shockHawkingBtn.addEventListener('click', () => this.shockHawking());
    }

    toggle() {
        if (this.game.state.cameraOpen) this.close();
        else this.open();
    }

    open() {
        this.game.state.cameraOpen = true;
        this.cameraPanel.classList.remove('hidden');
        this.cameraPanel.classList.add('show');
        
        this.game.assets.playSound('crank1');
        this.game.assets.playSound('staticLoop', true, 0.3);
        
        this.createCameraGrid();
        this.updateShockButtonVisibility();
        
        if (this.game.enemyAI && this.game.enemyAI.hawking.active) {
            this.game.enemyAI.updateHawkingWarningDisplay();
        }
        
        if (this.game.state.cameraFailed) {
            this.showCameraFailure();
        } else {
            this.cameraPanel.classList.remove('transitioning');
            if (this.cameraErrorLabel) this.cameraErrorLabel.classList.remove('active');
            this.stopStatic();
            const cameraGrid = document.getElementById('camera-grid');
            if (cameraGrid) cameraGrid.style.display = 'block';
            this.updateView();
        }
        
        this.game.isRotatingLeft = false;
        this.game.isRotatingRight = false;
    }
    
    showCameraFailure() {
        if (window.multiplayer && window.multiplayer.role === 'engineer') {
            window.multiplayer.sendEvent('CAMERA_FAILED');
        }

        if (this.game.state.currentNight === 5 && Math.random() < 0.3) {
            this.game.showGoldenStephen();
        }
        
        this.cameraPanel.classList.add('transitioning');
        
        const cameraGrid = document.getElementById('camera-grid');
        if (cameraGrid) cameraGrid.style.display = 'none';
        
        if (this.cameraErrorLabel) this.cameraErrorLabel.classList.add('active');
        
        if (this.staticVideo) {
            this.staticVideo.classList.add('active');
            this.staticVideo.currentTime = 0; 
            this.staticVideo.play().catch(e => console.log('Video playback failed:', e));
        }
    }
    
    stopStatic() {
        if (this.staticVideo) {
            this.staticVideo.classList.remove('active');
            this.staticVideo.pause();
            this.staticVideo.currentTime = 0;
        }
    }
    
    startStatic() {
        if (this.staticVideo) {
            this.staticVideo.classList.add('active');
            this.staticVideo.play().catch(e => console.log('Video playback failed:', e));
        }
    }
    
    restoreCameraView() {
        this.stopStatic();
        this.cameraPanel.classList.remove('transitioning');
        
        if (this.cameraErrorLabel) this.cameraErrorLabel.classList.remove('active');
        
        const cameraGrid = document.getElementById('camera-grid');
        if (cameraGrid) cameraGrid.style.display = 'block';
        
        this.updateView();
    }
    
    restartCamera() {
        if (this.game.state.controlPanelBusy) return;
        
        this.game.state.cameraRestarting = true;
        this.game.state.controlPanelBusy = true; 
        
        this.game.assets.playSound('ekg', false, 0.8);
        
        setTimeout(() => {
            this.game.state.cameraFailed = false;
            this.game.state.cameraRestarting = false;
            this.game.state.controlPanelBusy = false; 
            
            this.game.assets.stopSound('static');
            this.resetSoundButtonCount();
            
            if (this.game.state.cameraOpen) {
                this.restoreCameraView();
            }

            // Sync: Tell Watcher it is completely fixed!
            if (window.multiplayer && window.multiplayer.role === 'engineer') {
                window.multiplayer.sendEvent('CAMERA_FIXED');
            }

        }, 4000);
    }

    close() {
        this.game.state.cameraOpen = false;
        this.cameraPanel.classList.add('closing');
        this.cameraPanel.classList.remove('show');
        
        this.game.assets.stopSound('staticLoop');
        
        const characterOverlay = document.getElementById('character-overlay');
        if (characterOverlay) characterOverlay.innerHTML = '';
        
        if (this.game.enemyAI && this.game.enemyAI.hawking.active) {
            this.game.enemyAI.updateHawkingWarningDisplay();
        }
        
        setTimeout(() => {
            this.cameraPanel.classList.add('hidden');
            this.cameraPanel.classList.remove('closing');
        }, 400);
        
        this.game.assets.playSound('crank2');
    }

    switchCamera(camNum) {
        if (this.game.state.cameraFailed) return;
        
        this.cameraPanel.classList.add('transitioning');
        
        const cameraGrid = document.getElementById('camera-grid');
        if (cameraGrid) cameraGrid.style.display = 'none';
        
        const characterOverlay = document.getElementById('character-overlay');
        if (characterOverlay) characterOverlay.style.display = 'none';
        
        this.game.assets.setSoundVolume('staticLoop', 0.1);
        this.game.assets.playSound('static', false, 1.0);
        
        setTimeout(() => this.game.assets.stopSound('static'), 1000);
        this.startStatic();
        
        setTimeout(() => {
            if (this.game.state.cameraFailed) {
                this.showCameraFailure();
                return;
            }
            
            this.game.state.currentCam = `cam${camNum}`;
            this.updateView();
            this.createCameraGrid();
            
            setTimeout(() => {
                if (this.game.state.cameraFailed) {
                    this.showCameraFailure();
                    return;
                }
                
                this.stopStatic();
                this.cameraPanel.classList.remove('transitioning');
                
                if (cameraGrid) cameraGrid.style.display = 'block';
                if (characterOverlay) characterOverlay.style.display = 'block';
                
                this.updateShockButtonVisibility();
                this.game.assets.setSoundVolume('staticLoop', 0.3);
            }, 500);
        }, 500);
    }

    updateView() {
        if (this.game.state.cameraFailed) return;
        
        if (this.game.assets.images[this.game.state.currentCam]) {
            this.cameraPanel.style.backgroundImage = `url('${this.game.assets.images[this.game.state.currentCam].src}')`;
        }
        
        const camNum = this.game.state.currentCam.replace('cam', '');
        this.currentCamLabel.textContent = `CAM ${camNum}`;
        
        this.updateCharacterDisplay();
        this.updateShockButtonVisibility();
    }
    
    updateCharacterDisplay() {
        const currentCam = this.game.state.currentCam;
        const epLocation = this.game.enemyAI.getCurrentLocation();
        const trumpLocation = this.game.enemyAI.getTrumpCurrentLocation();
        const hawkingActive = this.game.enemyAI.hawking.active;
        
        let characterOverlay = document.getElementById('character-overlay');
        if (!characterOverlay) {
            characterOverlay = document.createElement('div');
            characterOverlay.id = 'character-overlay';
            characterOverlay.style.position = 'absolute';
            characterOverlay.style.top = '0';
            characterOverlay.style.left = '0';
            characterOverlay.style.width = '100%';
            characterOverlay.style.height = '100%';
            characterOverlay.style.pointerEvents = 'none';
            characterOverlay.style.zIndex = '5';
            characterOverlay.style.overflow = 'hidden';
            this.cameraPanel.appendChild(characterOverlay);
        }
        
        characterOverlay.innerHTML = '';
        
        if (hawkingActive && currentCam === 'cam6') {
            const hawkingImg = document.createElement('img');
            hawkingImg.src = 'assets/images/mrstephen.png';
            hawkingImg.style.position = 'absolute';
            hawkingImg.className = 'visible hawking-character';
            hawkingImg.style.zIndex = '3';
            hawkingImg.style.left = '59.6%';
            hawkingImg.style.bottom = '0.9%';
            hawkingImg.style.width = '37%';
            hawkingImg.style.transform = 'translateX(-50%) rotate(-5deg)';
            hawkingImg.style.filter = 'brightness(0.33) contrast(1) saturate(1)';
            characterOverlay.appendChild(hawkingImg);
        }
        
        if (this.game.enemyAI.epstein.hasSpawned && epLocation === currentCam && this.characterImages && this.characterImages[currentCam]) {
            const epContainer = document.createElement('div');
            epContainer.className = 'ep-container';
            epContainer.style.position = 'absolute';
            epContainer.style.zIndex = '1';
            
            const pos = this.characterPositions[currentCam];
            if (pos) {
                if (pos.left) {
                    epContainer.style.left = pos.left;
                    epContainer.style.right = 'auto';
                } else if (pos.right) {
                    epContainer.style.right = pos.right;
                    epContainer.style.left = 'auto';
                }
                
                epContainer.style.bottom = pos.bottom;
                epContainer.style.width = pos.width;
                epContainer.style.transform = pos.transform || 'none';
            }
            
            const epImg = document.createElement('img');
            epImg.src = this.characterImages[currentCam];
            epImg.style.position = 'relative';
            epImg.style.width = '100%';
            epImg.style.height = 'auto';
            epImg.style.display = 'block';
            epImg.className = 'visible ep-character';
            
            const brightness = this.characterBrightness[currentCam] || 100;
            epImg.style.filter = `brightness(${brightness}%)`;
            
            epContainer.appendChild(epImg);
            characterOverlay.appendChild(epContainer);
            
            if (this.game.state.currentNight === 6) {
                this.renderLightningEyes(epContainer, currentCam);
            }
        }
        
        if (this.game.enemyAI.trump.hasSpawned && !this.game.enemyAI.trump.isCrawling && trumpLocation === currentCam && this.game.enemyAI.currentTrumpConfig) {
            const trumpImages = this.game.enemyAI.trumpImages;
            const trumpPositions = this.game.enemyAI.trumpPositions;
            const trumpBrightness = this.game.enemyAI.trumpBrightness;
            
            if (trumpImages[currentCam]) {
                const trumpImg = document.createElement('img');
                trumpImg.src = trumpImages[currentCam];
                trumpImg.style.position = 'absolute';
                trumpImg.className = 'visible trump-character';
                trumpImg.style.zIndex = '2'; 
                
                const pos = trumpPositions[currentCam];
                if (pos) {
                    if (pos.left) {
                        trumpImg.style.left = pos.left;
                        trumpImg.style.right = 'auto';
                    } else if (pos.right) {
                        trumpImg.style.right = pos.right;
                        trumpImg.style.left = 'auto';
                    }
                    
                    trumpImg.style.bottom = pos.bottom;
                    trumpImg.style.width = pos.width;
                    trumpImg.style.transform = pos.transform || 'none';
                }
                
                const brightness = trumpBrightness[currentCam] || 100;
                trumpImg.style.filter = `brightness(${brightness}%)`;
                
                characterOverlay.appendChild(trumpImg);
            }
        }
    }

    createCameraGrid() {
        const grid = document.getElementById('camera-grid');
        grid.innerHTML = '';
        
        const mapContainer = document.createElement('div');
        mapContainer.style.position = 'relative';
        mapContainer.style.width = '100%';
        mapContainer.style.height = '100%';
        
        const mapImg = document.createElement('img');
        mapImg.src = 'assets/images/FNAE-Map-layout.png';
        mapImg.style.width = '100%';
        mapImg.style.height = 'auto';
        mapImg.style.display = 'block';
        mapContainer.appendChild(mapImg);
        
        const youMarker = document.createElement('div');
        youMarker.style.position = 'absolute';
        youMarker.style.left = '7.0%';
        youMarker.style.top = '82.6%';
        youMarker.style.width = '13.0%';
        youMarker.style.height = '8.0%';
        youMarker.style.display = 'flex';
        youMarker.style.alignItems = 'center';
        youMarker.style.justifyContent = 'center';
        youMarker.style.fontSize = '0.7vw';
        youMarker.style.fontWeight = 'bold';
        youMarker.style.color = '#fff';
        youMarker.style.textShadow = '1px 1px 2px #000';
        youMarker.style.fontFamily = 'Arial, sans-serif';
        youMarker.style.background = 'rgba(0, 0, 0, 0.5)';
        youMarker.style.borderRadius = '4px';
        youMarker.textContent = 'YOU';
        mapContainer.appendChild(youMarker);
        
        const cameraPositions = [
            { cam: 1, x: 25.7, y: 84.3, width: 13.0, height: 8.0 },
            { cam: 2, x: 35.0, y: 56.6, width: 13.0, height: 8.0 },
            { cam: 3, x: 51.5, y: 77.6, width: 13.0, height: 8.0 },
            { cam: 4, x: 57.7, y: 44.9, width: 12.9, height: 8.0 },
            { cam: 5, x: 75.4, y: 60.3, width: 12.9, height: 8.0 },
            { cam: 6, x: 77.2, y: 82.2, width: 13.0, height: 8.0 },
            { cam: 7, x: 52.0, y: 27.9, width: 12.9, height: 8.0 },
            { cam: 8, x: 80.2, y: 21.9, width: 12.8, height: 8.0 },
            { cam: 9, x: 24.4, y: 20.6, width: 12.9, height: 8.0 },
            { cam: 10, x: 7.9, y: 39.1, width: 12.8, height: 8.0 },
            { cam: 11, x: 72.9, y: 4.6, width: 13.0, height: 8.0 },
        ];
        
        cameraPositions.forEach(pos => {
            const hotspot = document.createElement('div');
            hotspot.className = 'camera-hotspot';
            hotspot.style.position = 'absolute';
            hotspot.style.left = pos.x + '%';
            hotspot.style.top = pos.y + '%';
            hotspot.style.width = pos.width + '%';
            hotspot.style.height = pos.height + '%';
            hotspot.style.cursor = 'pointer';
            hotspot.style.transition = 'all 0.2s';
            hotspot.style.display = 'flex';
            hotspot.style.alignItems = 'center';
            hotspot.style.justifyContent = 'center';
            hotspot.style.fontSize = '0.7vw';
            hotspot.style.fontWeight = 'bold';
            hotspot.style.color = '#fff';
            hotspot.style.textShadow = '1px 1px 2px #000';
            hotspot.style.fontFamily = 'Arial, sans-serif';
            hotspot.style.whiteSpace = 'nowrap';
            hotspot.style.borderRadius = '4px';
            hotspot.style.letterSpacing = '0.5px';
            
            hotspot.textContent = `CAM ${pos.cam}`;
            
            if (this.game.state.currentCam === `cam${pos.cam}`) {
                hotspot.classList.add('camera-selected');
                hotspot.style.border = 'none';
            } else {
                hotspot.style.border = 'none';
                hotspot.style.background = 'transparent';
            }
            
            hotspot.addEventListener('mouseenter', () => {
                if (this.game.state.currentCam !== `cam${pos.cam}`) {
                    hotspot.style.background = 'rgba(255, 255, 255, 0.2)';
                }
            });
            
            hotspot.addEventListener('mouseleave', () => {
                if (this.game.state.currentCam !== `cam${pos.cam}`) {
                    hotspot.style.background = 'transparent';
                }
            });
            
            hotspot.addEventListener('click', () => this.switchCamera(pos.cam));
            mapContainer.appendChild(hotspot);
        });
        
        grid.appendChild(mapContainer);
    }

    playAmbientSound(fromNetwork = false) {
        if (this.soundButtonCooldown) return;

        const currentCam = this.game.state.currentCam;
        
        // Sync: If Watcher clicked, ONLY play sound locally and let Host handle AI logic
        if (window.multiplayer && window.multiplayer.role === 'watcher' && !fromNetwork) {
            window.multiplayer.sendEvent('PLAY_AUDIO', { cam: currentCam });
            
            const soundFile = this.currentSoundToggle ? '2.ogg' : '1.ogg';
            this.currentSoundToggle = !this.currentSoundToggle;
            const audio = new Audio(`assets/sounds/${soundFile}`);
            audio.play().catch(e => console.log('音频播放失败:', e));
            
            this.soundButtonCooldown = true;
            this.playSoundBtn.style.opacity = '0.5';
            this.playSoundBtn.style.cursor = 'not-allowed';
            
            this.startCooldownAnimation();
            
            setTimeout(() => {
                this.soundButtonCooldown = false;
                this.playSoundBtn.style.opacity = '1';
                this.playSoundBtn.style.cursor = 'pointer';
                this.stopCooldownAnimation();
            }, this.cooldownTime);
            
            return; // EXIT EARLY! Do not process enemy logic on Watcher!
        }
        
        const currentEpLocation = this.game.enemyAI.getCurrentLocation();
        if (this.lastEpLocation !== currentEpLocation) {
            this.locationAttractCount = {}; 
            this.lastEpLocation = currentEpLocation;
        }
        
        const soundFile = this.currentSoundToggle ? '2.ogg' : '1.ogg';
        this.currentSoundToggle = !this.currentSoundToggle;
        
        const audio = new Audio(`assets/sounds/${soundFile}`);
        audio.play().catch(e => console.log('音频播放失败:', e));
        
        let canAttract = true;
        if (this.locationAttractCount[currentCam] >= this.maxLocationAttractCount) {
            canAttract = false;
        }
        
        let attracted = false;
        if (canAttract) {
            attracted = this.game.enemyAI.attractToSound(currentCam);
            if (attracted) {
                this.playAttractionTransition();
                this.locationAttractCount[currentCam] = (this.locationAttractCount[currentCam] || 0) + 1;
                this.lastEpLocation = currentCam;
            }
        }
        
        this.soundButtonUseCount++;
        
        if (this.soundButtonUseCount >= this.maxSoundUses) {
            this.soundButtonUseCount = 0; 
            if (this.cameraPanel.classList.contains('transitioning')) {
                this.stopStatic();
                this.cameraPanel.classList.remove('transitioning');
            }
            this.game.enemyAI.triggerCameraFailure();
        }
        
        this.soundButtonCooldown = true;
        this.playSoundBtn.style.opacity = '0.5';
        this.playSoundBtn.style.cursor = 'not-allowed';
        
        this.startCooldownAnimation();
        
        setTimeout(() => {
            this.soundButtonCooldown = false;
            this.playSoundBtn.style.opacity = '1';
            this.playSoundBtn.style.cursor = 'pointer';
            this.stopCooldownAnimation();
        }, this.cooldownTime);
    }
    
    startCooldownAnimation() {
        let dotCount = 0;
        this.cooldownInterval = setInterval(() => {
            dotCount = (dotCount + 1) % 4;
            const dots = '.'.repeat(dotCount);
            this.playSoundBtn.textContent = `PLAY SOUND${dots}`;
        }, 500);
    }
    
    stopCooldownAnimation() {
        if (this.cooldownInterval) {
            clearInterval(this.cooldownInterval);
            this.cooldownInterval = null;
        }
        this.playSoundBtn.textContent = 'PLAY SOUND';
    }
    
    playAttractionTransition(fromNetwork = false) {
        if (window.multiplayer && window.multiplayer.role === 'engineer' && !fromNetwork) {
            window.multiplayer.sendEvent('STATIC_TRANSITION');
        }

        this.cameraPanel.classList.add('transitioning');
        
        const cameraGrid = document.getElementById('camera-grid');
        if (cameraGrid) cameraGrid.style.display = 'none';
        
        const characterOverlay = document.getElementById('character-overlay');
        if (characterOverlay) characterOverlay.style.display = 'none';
        
        this.game.assets.setSoundVolume('staticLoop', 0.1);
        this.game.assets.playSound('static', false, 1.0);
        
        setTimeout(() => this.game.assets.stopSound('static'), 1000);
        this.startStatic();
        
        setTimeout(() => {
            if (this.game.state.cameraFailed) {
                this.showCameraFailure();
                return;
            }
            this.updateCharacterDisplay();
            setTimeout(() => {
                if (this.game.state.cameraFailed) {
                    this.showCameraFailure();
                    return;
                }
                
                this.stopStatic();
                this.cameraPanel.classList.remove('transitioning');
                
                if (cameraGrid) cameraGrid.style.display = 'block';
                if (characterOverlay) characterOverlay.style.display = 'block';
                
                this.game.assets.setSoundVolume('staticLoop', 0.3);
            }, 500);
        }, 500);
    }
    
    resetSoundButtonCount() {
        this.soundButtonUseCount = 0;
    }
    
    playMovementTransition(fromNetwork = false) {
        if (this.game.state.cameraFailed) return;
        
        if (window.multiplayer && window.multiplayer.role === 'engineer' && !fromNetwork) {
            window.multiplayer.sendEvent('STATIC_TRANSITION');
        }

        this.cameraPanel.classList.add('transitioning');
        
        const cameraGrid = document.getElementById('camera-grid');
        if (cameraGrid) cameraGrid.style.display = 'none';
        
        const characterOverlay = document.getElementById('character-overlay');
        if (characterOverlay) characterOverlay.style.display = 'none';
        
        this.game.assets.setSoundVolume('staticLoop', 0.1);
        this.game.assets.playSound('static', false, 1.0);
        
        setTimeout(() => this.game.assets.stopSound('static'), 1000);
        this.startStatic();
        
        setTimeout(() => {
            if (this.game.state.cameraFailed) {
                this.showCameraFailure();
                return;
            }
            
            this.updateCharacterDisplay();
            
            setTimeout(() => {
                if (this.game.state.cameraFailed) {
                    this.showCameraFailure();
                    return;
                }
                
                this.stopStatic();
                this.cameraPanel.classList.remove('transitioning');
                
                if (cameraGrid) cameraGrid.style.display = 'block';
                if (characterOverlay) characterOverlay.style.display = 'block';
                
                this.game.assets.setSoundVolume('staticLoop', 0.3);
            }, 500);
        }, 500);
    }
    
    shockHawking() {
        if (window.multiplayer && window.multiplayer.role === 'watcher') {
            window.multiplayer.sendEvent('SHOCK_HAWKING');
        }

        this.game.assets.playSound('hawking_shock', false, 1.0);
        this.cameraPanel.classList.add('transitioning');
        
        if (this.staticVideo) {
            this.staticVideo.classList.add('active');
            this.staticVideo.currentTime = 0;
            this.staticVideo.play().catch(e => console.log('Video playback failed:', e));
        }
        
        setTimeout(() => {
            if (this.game.enemyAI && this.game.enemyAI.shockHawking()) {
                console.log('Hawking shocked successfully!');
            }
            
            if (this.staticVideo) {
                this.staticVideo.classList.remove('active');
                this.staticVideo.pause();
            }
            
            this.cameraPanel.classList.remove('transitioning');
            this.updateView();
        }, 1000);
    }
    
    updateShockButtonVisibility() {
        if (this.shockHawkingBtn) {
            const currentCam = this.game.state.currentCam;
            const night = this.game.state.currentNight;
            
            const isNormalNight = night >= 3 && night <= 5;
            const isCustomNightWithHawking = this.game.state.customNight && 
                                            night === 7 && 
                                            this.game.state.customAILevels.hawking > 0;
            
            if ((isNormalNight || isCustomNightWithHawking) && this.game.state.cameraOpen && currentCam === 'cam6') {
                this.shockHawkingBtn.style.display = 'block';
            } else {
                this.shockHawkingBtn.style.display = 'none';
            }
        }
    }
    
    renderLightningEyes(epContainer, currentCam) {
        const eyesConfig = this.game.enemyAI.lightningEyesConfig[currentCam];
        if (!eyesConfig) return;
        
        [eyesConfig.eye1, eyesConfig.eye2].forEach((eyeConfig) => {
            const eyeContainer = document.createElement('div');
            eyeContainer.className = 'lightning-eye-container';
            eyeContainer.style.position = 'absolute';
            eyeContainer.style.left = eyeConfig.left;
            eyeContainer.style.top = eyeConfig.top;
            eyeContainer.style.width = eyeConfig.width;
            eyeContainer.style.height = eyeConfig.height;
            eyeContainer.style.transform = 'translate(-50%, -50%)';
            eyeContainer.style.transformOrigin = 'center center';
            eyeContainer.style.zIndex = '10';
            eyeContainer.style.pointerEvents = 'none';
            
            const core = document.createElement('div');
            core.className = 'lightning-eye-core';
            core.style.position = 'absolute';
            core.style.top = '50%';
            core.style.left = '50%';
            core.style.width = '60%';
            core.style.height = '60%';
            core.style.transform = 'translate(-50%, -50%)';
            core.style.background = 'radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(0, 255, 255, 1) 40%, rgba(0, 200, 255, 0.6) 70%, transparent 100%)';
            core.style.borderRadius = '50%';
            core.style.filter = 'brightness(2)';
            core.style.animation = 'lightning-pulse 0.15s infinite';
            
            const glow = document.createElement('div');
            glow.className = 'lightning-eye-glow';
            glow.style.position = 'absolute';
            glow.style.top = '50%';
            glow.style.left = '50%';
            glow.style.width = '100%';
            glow.style.height = '100%';
            glow.style.transform = 'translate(-50%, -50%)';
            glow.style.background = 'radial-gradient(ellipse at center, rgba(0, 255, 255, 0.8) 0%, rgba(0, 255, 255, 0.4) 30%, rgba(0, 200, 255, 0.2) 60%, transparent 100%)';
            glow.style.borderRadius = '50%';
            glow.style.boxShadow = `
                0 0 20px rgba(0, 255, 255, 1),
                0 0 40px rgba(0, 255, 255, 0.8),
                0 0 60px rgba(0, 255, 255, 0.6)
            `;
            glow.style.animation = 'lightning-flicker 0.1s infinite';
            
            for (let i = 0; i < 3; i++) {
                const lightning = document.createElement('div');
                lightning.className = 'lightning-bolt';
                lightning.style.position = 'absolute';
                lightning.style.top = '50%';
                lightning.style.left = '50%';
                lightning.style.width = '2px';
                lightning.style.height = `${30 + Math.random() * 40}%`;
                lightning.style.background = 'linear-gradient(to bottom, rgba(255, 255, 255, 1), rgba(0, 255, 255, 0.8), transparent)';
                lightning.style.transformOrigin = 'top center';
                lightning.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 360}deg)`;
                lightning.style.boxShadow = '0 0 5px rgba(0, 255, 255, 1), 0 0 10px rgba(0, 255, 255, 0.8)';
                lightning.style.animation = `lightning-bolt ${0.1 + Math.random() * 0.1}s infinite`;
                lightning.style.animationDelay = `${Math.random() * 0.1}s`;
                lightning.style.opacity = '0.8';
                eyeContainer.appendChild(lightning);
            }
            
            eyeContainer.appendChild(glow);
            eyeContainer.appendChild(core);
            epContainer.appendChild(eyeContainer);
        });
    }
}