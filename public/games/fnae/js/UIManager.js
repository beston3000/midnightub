// UI Manager
class UIManager {
    constructor(game) {
        this.game = game;
        this.initElements();
    }

    initElements() {
        this.powerValue = document.getElementById('power-value');
        this.timeValue = document.getElementById('time-value');
        this.nightValue = document.getElementById('night-value');
        this.currentSceneImg = document.getElementById('current-scene');
    }

    update() {
        this.powerValue.textContent = Math.floor(this.game.state.oxygen);
        this.timeValue.textContent = `${this.game.state.currentTime === 0 ? 12 : this.game.state.currentTime} AM`;
        
        if (this.game.state.customNight && this.game.state.currentNight === 7) {
            this.nightValue.textContent = '7';
        } else {
            this.nightValue.textContent = this.game.state.currentNight;
        }
        
        if (!this.game.state.cameraOpen) {
            const sceneKey = 'office';
            if (this.game.assets.images[sceneKey]) {
                this.currentSceneImg.src = this.game.assets.images[sceneKey].src;
                this.currentSceneImg.style.display = 'block';
            }
        }
        
        if (this.game.state.oxygen <= 40 && this.game.state.ventsClosed) {
            this.powerValue.classList.add('flicker');
        } else {
            this.powerValue.classList.remove('flicker');
        }
        
        this.updateCameraStatus();
    }

    createHotspots() {
        const hotspotsContainer = document.getElementById('hotspots');
        hotspotsContainer.innerHTML = '';
        
        this.createControlPanelButton();
        this.createCameraButton();
        this.bindCloseCameraButton();
    }

    createControlPanelButton() {
        const hotspotsContainer = document.getElementById('hotspots');
        
        const controlBtn = document.createElement('div');
        controlBtn.id = 'vents-btn';
        controlBtn.className = 'control-panel-button';
        controlBtn.style.position = 'absolute';
        controlBtn.style.left = '0';
        controlBtn.style.bottom = '0';
        controlBtn.style.width = '25vw';
        controlBtn.style.height = '10vh';
        controlBtn.style.background = 'rgba(0, 0, 0, 0.7)';
        controlBtn.style.border = '2px solid rgba(255, 255, 255, 0.3)';
        controlBtn.style.borderLeft = 'none';
        controlBtn.style.borderBottom = 'none';
        controlBtn.style.display = 'flex';
        controlBtn.style.flexDirection = 'row';
        controlBtn.style.alignItems = 'center';
        controlBtn.style.justifyContent = 'space-between';
        controlBtn.style.cursor = 'pointer';
        controlBtn.style.opacity = '0';
        controlBtn.style.transition = 'opacity 0.3s, background 0.3s';
        controlBtn.style.padding = '0 1.5vw';
        controlBtn.style.pointerEvents = 'none';
        
        const leftArrows = document.createElement('div');
        leftArrows.style.display = 'flex';
        leftArrows.style.gap = '0.8vw';
        leftArrows.className = 'control-arrows';
        leftArrows.style.flexShrink = '0';
        
        const arrowLeft1 = document.createElement('div');
        arrowLeft1.innerHTML = '▲';
        arrowLeft1.style.color = '#fff';
        arrowLeft1.style.fontSize = '2vw';
        arrowLeft1.style.lineHeight = '1';
        leftArrows.appendChild(arrowLeft1);
        
        const arrowLeft2 = document.createElement('div');
        arrowLeft2.innerHTML = '▲';
        arrowLeft2.style.color = '#fff';
        arrowLeft2.style.fontSize = '2vw';
        arrowLeft2.style.lineHeight = '1';
        leftArrows.appendChild(arrowLeft2);
        
        controlBtn.appendChild(leftArrows);
        
        const text = document.createElement('div');
        text.textContent = 'CONTROL PANEL';
        text.style.color = '#fff';
        text.style.fontSize = '1.8vw';
        text.style.fontWeight = 'bold';
        text.style.fontFamily = 'Arial, sans-serif';
        text.style.letterSpacing = '0.15vw';
        text.style.whiteSpace = 'nowrap';
        text.style.flex = '1';
        text.style.textAlign = 'center';
        controlBtn.appendChild(text);
        
        const rightArrows = document.createElement('div');
        rightArrows.style.display = 'flex';
        rightArrows.style.gap = '0.8vw';
        rightArrows.className = 'control-arrows';
        rightArrows.style.flexShrink = '0';
        
        const arrowRight1 = document.createElement('div');
        arrowRight1.innerHTML = '▲';
        arrowRight1.style.color = '#fff';
        arrowRight1.style.fontSize = '2vw';
        arrowRight1.style.lineHeight = '1';
        rightArrows.appendChild(arrowRight1);
        
        const arrowRight2 = document.createElement('div');
        arrowRight2.innerHTML = '▲';
        arrowRight2.style.color = '#fff';
        arrowRight2.style.fontSize = '2vw';
        arrowRight2.style.lineHeight = '1';
        rightArrows.appendChild(arrowRight2);
        
        controlBtn.appendChild(rightArrows);
        
        controlBtn.addEventListener('mouseenter', () => {
            controlBtn.style.background = 'rgba(0, 0, 0, 0.9)';
        });
        
        controlBtn.addEventListener('mouseleave', () => {
            controlBtn.style.background = 'rgba(0, 0, 0, 0.7)';
        });
        
        controlBtn.addEventListener('click', () => {
            this.toggleControlPanel();
            setTimeout(() => this.updateControlPanelArrows(), 50);
        });
        
        hotspotsContainer.appendChild(controlBtn);
    }

    updateControlPanelArrows() {
        const controlBtn = document.getElementById('vents-btn');
        if (!controlBtn) return;
        
        const arrows = controlBtn.querySelectorAll('.control-arrows div');
        const isOpen = document.getElementById('control-panel-popup') && 
                      !document.getElementById('control-panel-popup').classList.contains('hidden');
        
        arrows.forEach((arrow) => {
            arrow.innerHTML = isOpen ? '▼' : '▲';
        });
    }

    toggleControlPanel() {
        const panel = document.getElementById('control-panel-popup');
        if (panel) {
            const wasHidden = panel.classList.contains('hidden');
            
            if (!wasHidden && this.game.state.controlPanelBusy) {
                return; 
            }
            
            panel.classList.toggle('hidden');
            
            if (wasHidden) {
                this.game.isRotatingLeft = false;
                this.game.isRotatingRight = false;
                this.game.state.controlPanelOpen = true;
            } else {
                this.game.state.controlPanelOpen = false;
            }
        } else {
            this.createControlPanelPopup();
            this.game.isRotatingLeft = false;
            this.game.isRotatingRight = false;
            this.game.state.controlPanelOpen = true;
        }
    }

    createControlPanelPopup() {
        const popup = document.createElement('div');
        popup.id = 'control-panel-popup';
        popup.style.position = 'fixed';
        popup.style.top = '10vh';
        popup.style.left = '10vw';
        popup.style.width = '70vw';
        popup.style.minHeight = '60vh';
        popup.style.background = '#000';
        popup.style.border = '4px solid #0f0';
        popup.style.padding = '4vh 4vw';
        popup.style.zIndex = '100';
        popup.style.fontFamily = "'Courier New', monospace";
        popup.style.color = '#0f0';
        
        const title = document.createElement('div');
        title.textContent = '/// Control Panel';
        title.style.fontSize = '2.5vw';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '5vh';
        popup.appendChild(title);
        
        const optionsContainer = document.createElement('div');
        optionsContainer.id = 'control-options';
        
        const option1 = document.createElement('div');
        option1.id = 'option-vents';
        option1.style.fontSize = '2.5vw';
        option1.style.marginBottom = '4vh';
        option1.style.cursor = 'pointer';
        option1.style.padding = '1.5vh 0';
        option1.style.display = 'flex';
        option1.style.alignItems = 'center';
        option1.style.direction = 'ltr'; 
        option1.innerHTML = this.game.state.ventsClosed ? 
            '<span class="option-arrow" style="color: #0f0; margin-right: 1.5vw; width: 2vw;">&gt;</span><span>Open Air Vents</span><span id="vents-dots" style="margin-left: 1vw; direction: ltr; font-family: \'Courier New\', monospace;"></span>' :
            '<span class="option-arrow" style="color: #0f0; margin-right: 1.5vw; width: 2vw;">&gt;</span><span>Close Air Vents</span><span id="vents-dots" style="margin-left: 1vw; direction: ltr; font-family: \'Courier New\', monospace;"></span>';
        option1.addEventListener('click', () => {
            this.game.toggleVents();
        });
        optionsContainer.appendChild(option1);
        
        const option2 = document.createElement('div');
        option2.id = 'option-cameras';
        option2.style.fontSize = '2.5vw';
        option2.style.cursor = 'pointer';
        option2.style.padding = '1.5vh 0';
        option2.style.display = 'flex';
        option2.style.alignItems = 'center';
        option2.style.direction = 'ltr'; 
        option2.innerHTML = '<span class="option-arrow" style="color: transparent; margin-right: 1.5vw; width: 2vw;">&gt;</span><span>Restart Cameras</span><span id="camera-dots" style="margin-left: 1vw; direction: ltr; font-family: \'Courier New\', monospace;"></span><span id="camera-status" style="margin-left: auto; padding-right: 2vw; direction: ltr;"></span>';
        option2.addEventListener('click', () => {
            this.selectControlOption('cameras');
            this.handleRestartCamera();
        });
        optionsContainer.appendChild(option2);
        
        popup.appendChild(optionsContainer);
        
        document.addEventListener('click', (e) => {
            if (!popup.contains(e.target) && e.target.id !== 'vents-btn' && !e.target.closest('#vents-btn')) {
                if (this.game.state.controlPanelBusy) {
                    return; 
                }
                
                popup.classList.add('hidden');
                this.game.state.controlPanelOpen = false;
                this.updateControlPanelArrows();
            }
        });
        
        document.body.appendChild(popup);
    }

    selectControlOption(option) {
        const option1 = document.getElementById('option-vents');
        const option2 = document.getElementById('option-cameras');
        
        if (option === 'vents') {
            const arrow1 = option1.querySelector('.option-arrow');
            const arrow2 = option2.querySelector('.option-arrow');
            if (arrow1) arrow1.style.color = '#0f0';
            if (arrow2) arrow2.style.color = 'transparent';
            
            const text1 = option1.querySelector('span:nth-child(2)');
            if (text1) {
                text1.textContent = this.game.state.ventsClosed ? 'Open Air Vents' : 'Close Air Vents';
            }
        } else {
            const arrow1 = option1.querySelector('.option-arrow');
            const arrow2 = option2.querySelector('.option-arrow');
            if (arrow1) arrow1.style.color = 'transparent';
            if (arrow2) arrow2.style.color = '#0f0';
        }
    }

    updateControlPanelOptions() {
        this.selectControlOption('vents');
        this.updateCameraStatus();
        this.updateVentsStatus(); 
    }
    
    updateVentsStatus() {
        const dotsSpan = document.getElementById('vents-dots');
        if (!dotsSpan) return;
        
        if (this.game.state.ventsToggling) {
            dotsSpan.style.color = '#0f0'; 
            if (!dotsSpan.dataset.animating) {
                dotsSpan.dataset.animating = 'true';
                this.animateLoadingDots(dotsSpan);
            }
        } else {
            dotsSpan.textContent = '';
            delete dotsSpan.dataset.animating;
        }
    }
    
    updateCameraStatus() {
        const statusSpan = document.getElementById('camera-status');
        const dotsSpan = document.getElementById('camera-dots');
        if (!statusSpan) return;
        
        if (this.game.state.cameraRestarting) {
            if (dotsSpan) {
                dotsSpan.style.color = '#0f0'; 
                if (!dotsSpan.dataset.animating) {
                    dotsSpan.dataset.animating = 'true';
                    this.animateLoadingDots(dotsSpan);
                }
            }
            if (this.game.state.cameraFailed) {
                statusSpan.style.color = '#f00';
                statusSpan.textContent = 'ERR';
            } else {
                statusSpan.textContent = '';
            }
        } else if (this.game.state.cameraFailed) {
            if (dotsSpan) {
                dotsSpan.textContent = '';
                delete dotsSpan.dataset.animating;
            }
            statusSpan.style.color = '#f00';
            statusSpan.textContent = 'ERR';
        } else {
            if (dotsSpan) {
                dotsSpan.textContent = '';
                delete dotsSpan.dataset.animating;
            }
            statusSpan.textContent = '';
        }
    }
    
    animateLoadingDots(element) {
        const states = ['.', '..', '...'];
        let index = 0;
        
        const animate = () => {
            if (!element.dataset.animating) return;
            element.textContent = states[index];
            index = (index + 1) % states.length;
            setTimeout(animate, 500); 
        };
        
        animate();
    }
    
    handleRestartCamera() {
        if (!this.game.state.cameraRestarting && !this.game.state.controlPanelBusy) {
            
            // Multiplayer Sync - Engineer tells Watcher they are restarting cameras
            if (window.multiplayer && window.multiplayer.role === 'engineer') {
                window.multiplayer.sendEvent('RESTART_CAMERAS');
            }

            this.game.camera.restartCamera();
            this.updateCameraStatus();
            
            const updateInterval = setInterval(() => {
                this.updateCameraStatus();
                if (!this.game.state.cameraRestarting) {
                    clearInterval(updateInterval);
                }
            }, 100);
        }
    }

    createCameraButton() {
        const hotspotsContainer = document.getElementById('hotspots');
        
        const cameraBtn = document.createElement('div');
        cameraBtn.id = 'camera-btn';
        cameraBtn.className = 'camera-button';
        cameraBtn.style.position = 'absolute';
        cameraBtn.style.right = '0';
        cameraBtn.style.top = '25%';
        cameraBtn.style.width = '6vw';
        cameraBtn.style.height = '45vh';
        cameraBtn.style.background = 'rgba(0, 0, 0, 0.7)';
        cameraBtn.style.border = '2px solid rgba(255, 255, 255, 0.3)';
        cameraBtn.style.borderRight = 'none';
        cameraBtn.style.display = 'flex';
        cameraBtn.style.flexDirection = 'column';
        cameraBtn.style.alignItems = 'center';
        cameraBtn.style.justifyContent = 'space-between';
        cameraBtn.style.cursor = 'pointer';
        cameraBtn.style.opacity = '0';
        cameraBtn.style.transition = 'opacity 0.3s, background 0.3s';
        cameraBtn.style.padding = '2vh 0';
        cameraBtn.style.pointerEvents = 'none';
        
        const topArrows = document.createElement('div');
        topArrows.style.display = 'flex';
        topArrows.style.flexDirection = 'column';
        topArrows.style.gap = '0.5vh';
        
        const arrowTop = document.createElement('div');
        arrowTop.innerHTML = '◄';
        arrowTop.className = 'camera-arrow';
        arrowTop.style.color = '#fff';
        arrowTop.style.fontSize = '1.8vw';
        arrowTop.style.transform = 'rotate(0deg)';
        arrowTop.style.lineHeight = '1';
        topArrows.appendChild(arrowTop);
        
        const arrowTop2 = document.createElement('div');
        arrowTop2.innerHTML = '◄';
        arrowTop2.className = 'camera-arrow';
        arrowTop2.style.color = '#fff';
        arrowTop2.style.fontSize = '1.8vw';
        arrowTop2.style.transform = 'rotate(0deg)';
        arrowTop2.style.lineHeight = '1';
        topArrows.appendChild(arrowTop2);
        
        cameraBtn.appendChild(topArrows);
        
        const text = document.createElement('div');
        text.textContent = 'CAMERA';
        text.style.color = '#fff';
        text.style.fontSize = '1.3vw';
        text.style.fontWeight = 'bold';
        text.style.fontFamily = 'Arial, sans-serif';
        text.style.transform = 'rotate(-90deg)';
        text.style.letterSpacing = '0.2vw';
        text.style.whiteSpace = 'nowrap';
        cameraBtn.appendChild(text);
        
        const bottomArrows = document.createElement('div');
        bottomArrows.style.display = 'flex';
        bottomArrows.style.flexDirection = 'column';
        bottomArrows.style.gap = '0.5vh';
        
        const arrowBottom = document.createElement('div');
        arrowBottom.innerHTML = '◄';
        arrowBottom.className = 'camera-arrow';
        arrowBottom.style.color = '#fff';
        arrowBottom.style.fontSize = '1.8vw';
        arrowBottom.style.transform = 'rotate(0deg)';
        arrowBottom.style.lineHeight = '1';
        bottomArrows.appendChild(arrowBottom);
        
        const arrowBottom2 = document.createElement('div');
        arrowBottom2.innerHTML = '◄';
        arrowBottom2.className = 'camera-arrow';
        arrowBottom2.style.color = '#fff';
        arrowBottom2.style.fontSize = '1.8vw';
        arrowBottom2.style.transform = 'rotate(0deg)';
        arrowBottom2.style.lineHeight = '1';
        bottomArrows.appendChild(arrowBottom2);
        
        cameraBtn.appendChild(bottomArrows);
        
        cameraBtn.addEventListener('mouseenter', () => {
            cameraBtn.style.background = 'rgba(0, 0, 0, 0.9)';
        });
        
        cameraBtn.addEventListener('mouseleave', () => {
            cameraBtn.style.background = 'rgba(0, 0, 0, 0.7)';
        });
        
        cameraBtn.addEventListener('click', () => {
            this.game.toggleCamera();
            setTimeout(() => this.updateCameraButtonArrows(), 50);
        });
        
        hotspotsContainer.appendChild(cameraBtn);
    }

    bindCloseCameraButton() { }

    updateCameraButtonArrows() {
        const cameraBtn = document.getElementById('camera-btn');
        if (!cameraBtn) return;
        
        const arrows = cameraBtn.querySelectorAll('.camera-arrow');
        const isOpen = this.game.state.cameraOpen;
        
        arrows.forEach((arrow) => {
            arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    }

    updateHotspotVisibility(viewPosition) {
        const ventsBtn = document.getElementById('vents-btn');
        const cameraBtn = document.getElementById('camera-btn');
        
        if (ventsBtn) {
            ventsBtn.style.opacity = viewPosition < 0.15 ? '1' : '0';
            ventsBtn.style.pointerEvents = viewPosition < 0.15 ? 'auto' : 'none';
        }
        
        if (cameraBtn) {
            const isVisible = viewPosition > 0.85;
            cameraBtn.style.opacity = isVisible ? '1' : '0';
            cameraBtn.style.pointerEvents = isVisible ? 'auto' : 'none';
        }
    }

    showTooltip(event, text) {
        let tooltip = document.getElementById('game-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'game-tooltip';
            tooltip.style.position = 'fixed';
            tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
            tooltip.style.color = 'white';
            tooltip.style.padding = '8px 12px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.fontSize = '14px';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.zIndex = '10000';
            tooltip.style.whiteSpace = 'nowrap';
            document.body.appendChild(tooltip);
        }
        
        tooltip.textContent = text;
        tooltip.style.display = 'block';
        tooltip.style.left = event.clientX + 10 + 'px';
        tooltip.style.top = event.clientY + 10 + 'px';
    }

    hideTooltip() {
        const tooltip = document.getElementById('game-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    updateViewPosition(viewPosition) {
        const offset = -viewPosition * 50;
        this.currentSceneImg.style.left = `${offset}%`;
        this.updateHotspotVisibility(viewPosition);
    }
}