class MultiplayerManager {
    constructor() {
        this.socket = io();
        this.roomId = null;
        this.role = null; 
        
        this.bindLobbyEvents();
        this.bindSocketEvents();
    }

    bindLobbyEvents() {
        const btnHost = document.getElementById('btn-host');
        const btnJoin = document.getElementById('btn-join');
        const btnBack = document.getElementById('btn-lobby-back');

        if (btnHost) {
            btnHost.addEventListener('click', () => {
                const room = document.getElementById('room-id-input').value;
                if (!room) return alert("Enter a room code!");
                this.roomId = room;
                this.socket.emit('createRoom', room);
                document.getElementById('lobby-status').innerText = "Waiting for Watcher to join...";
            });
        }

        if (btnJoin) {
            btnJoin.addEventListener('click', () => {
                const room = document.getElementById('room-id-input').value;
                if (!room) return alert("Enter a room code!");
                this.roomId = room;
                this.socket.emit('joinRoom', room);
                document.getElementById('lobby-status').innerText = "Connecting...";
            });
        }
        
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                document.getElementById('multiplayer-lobby').style.display = 'none';
                document.getElementById('main-menu').classList.remove('hidden');
            });
        }
    }

    bindSocketEvents() {
        this.socket.on('roleAssigned', (role) => {
            this.role = role;
            console.log("Assigned role:", this.role);
            this.applyAsymmetricalUI();
        });

        this.socket.on('roomError', (msg) => {
            alert(msg);
            document.getElementById('lobby-status').innerText = msg;
        });

        this.socket.on('gameReady', () => {
            // Hide Lobby, Show Main Menu again for final confirmation
            document.getElementById('multiplayer-lobby').style.display = 'none';
            document.getElementById('main-menu').classList.remove('hidden');
            
            const statusText = document.getElementById('multiplayer-status-text');
            if (statusText) {
                if (this.role === 'watcher') {
                    statusText.innerText = "Watcher Mode: Waiting for Host to start the game...";
                } else if (this.role === 'engineer') {
                    statusText.innerText = "Watcher Joined! You can now click NEW GAME or CONTINUE.";
                }
            }
        });

        this.socket.on('gameEvent', (data) => {
            this.handleIncomingEvent(data);
        });
    }

    applyAsymmetricalUI() {
        document.body.classList.add(`role-${this.role}`);
        const style = document.createElement('style');

        if (this.role === 'watcher') {
            style.innerHTML = `
                #vents-btn, #bottom-right-ui, #control-panel-popup { display: none !important; }
                #start-game, #continue-game, #special-night-btn, #custom-night-btn, #multiplayer-btn { display: none !important; }
            `;
        } else if (this.role === 'engineer') {
            style.innerHTML = `
                #camera-btn, #camera-panel { display: none !important; }
                #multiplayer-btn { display: none !important; }
            `;
        }
        document.head.appendChild(style);
    }

    sendEvent(action, payload = {}) {
        if (!this.roomId) return;
        this.socket.emit('gameEvent', { roomId: this.roomId, action, payload });
    }

    handleIncomingEvent(data) {
        console.log("📡 Multiplayer Event Received:", data.action, data.payload); 

        if (!window.game) return;
        
        switch(data.action) {
            case 'START_GAME':
                if (this.role === 'watcher') {
                    window.game.state.currentNight = data.payload.night;
                    window.game.startGame();
                }
                break;

            case 'PLAY_AUDIO':
                if (this.role === 'engineer') {
                    window.game.state.currentCam = data.payload.cam;
                    window.game.camera.playAmbientSound(true);
                }
                break;

            case 'SHOCK_HAWKING':
                if (this.role === 'engineer') window.game.enemyAI.shockHawking();
                break;

            case 'TOGGLE_VENTS':
                if (this.role === 'watcher') {
                    window.game.state.ventsClosed = data.payload.closed;
                    window.game.initVentFanAnimation();
                }
                break;

            case 'RESTART_CAMERAS':
                if (this.role === 'watcher') {
                    window.game.state.cameraRestarting = true;
                    window.game.assets.playSound('ekg', false, 0.8);
                }
                break;
                
            case 'CAMERA_FIXED':
                if (this.role === 'watcher') {
                    window.game.state.cameraFailed = false;
                    window.game.state.cameraRestarting = false;
                    window.game.assets.stopSound('static');
                    window.game.camera.resetSoundButtonCount();
                    if (window.game.state.cameraOpen) {
                        window.game.camera.restoreCameraView();
                    }
                }
                break;

            case 'CAMERA_FAILED':
                if (this.role === 'watcher') {
                    window.game.state.cameraFailed = true; 
                    window.game.camera.showCameraFailure();
                }
                break;
                
            case 'STATIC_TRANSITION':
                if (this.role === 'watcher') {
                    window.game.camera.playMovementTransition(true);
                }
                break;

            case 'ENEMY_MOVED':
                if (this.role === 'watcher') {
                    window.game.enemyAI.epstein.currentLocation = data.payload.epsteinLoc;
                    window.game.enemyAI.epstein.hasSpawned = data.payload.epSpawned;
                    
                    if(window.game.enemyAI.trump) {
                        window.game.enemyAI.trump.currentLocation = data.payload.trumpLoc;
                        window.game.enemyAI.trump.hasSpawned = data.payload.trumpSpawned;
                        window.game.enemyAI.trump.isCrawling = data.payload.trumpCrawling;
                    }
                    if(window.game.enemyAI.hawking) {
                        window.game.enemyAI.hawking.active = data.payload.hawkingActive;
                        window.game.enemyAI.hawking.warningLevel = data.payload.hawkingWarning;
                        window.game.camera.updateShockButtonVisibility();
                    }
                    window.game.camera.updateCharacterDisplay();
                }
                break;
                
            case 'JUMPSCARE':
                if (this.role === 'watcher') window.game.enemyAI.triggerJumpscare(data.payload.enemy);
                break;
                
            case 'NIGHT_WIN':
                if (this.role === 'watcher') window.game.winNight();
                break;
        }
    }
}

window.multiplayer = new MultiplayerManager();