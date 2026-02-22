// 敌人AI系统 - 基于FNAF机制
class EnemyAI {
    constructor(game) {
        this.game = game;
        
        this.epsteinConfig = {
            1: { aiLevel: 12, movementInterval: [9000, 10000], movementDuration: 1000, spawnDelay: 1000, movementProbability: { forward: 0.8, lateral: 0.1, backward: 0.1 }, soundLureResistance: 0 },
            2: { aiLevel: 12, movementInterval: [9000, 10000], movementDuration: 1000, spawnDelay: 0, movementProbability: { forward: 0.8, lateral: 0.1, backward: 0.1 }, soundLureResistance: 0.1 },
            3: { aiLevel: 12, movementInterval: [9000, 10000], movementDuration: 1000, spawnDelay: 0, movementProbability: { forward: 0.8, lateral: 0.2, backward: 0 }, soundLureResistance: 0.1 },
            4: { aiLevel: 12, movementInterval: [9000, 10000], movementDuration: 1000, spawnDelay: 0, movementProbability: { forward: 0.9, lateral: 0.1, backward: 0 }, soundLureResistance: 0.15 },
            5: { aiLevel: 12, movementInterval: [9000, 10000], movementDuration: 1000, spawnDelay: 0, movementProbability: { forward: 0.9, lateral: 0.1, backward: 0.0 }, soundLureResistance: 0.15 },
            6: { aiLevel: 12, movementInterval: [6500, 7500], movementDuration: 1000, spawnDelay: 0, movementProbability: { forward: 0.9, lateral: 0.1, backward: 0.0 }, soundLureResistance: 0.15 }
        };
        
        this.trumpConfig = {
            2: { aiLevel: 10, movementInterval: [8000, 9000], movementDuration: 1000, spawnDelay: 0, movementProbability: { forward: 0.9, lateral: 0.1, backward: 0.0 }, ventCrawling: { cam1Probability: 1.0, cam2Probability: 0.5, soundDelay: 5000, soundDuration: 10000, totalDuration: 20000, retreatDelay: 2000, retreatSoundDuration: 3000 } },
            3: { aiLevel: 11, movementInterval: [9000, 10000], movementDuration: 1000, spawnDelay: 0, movementProbability: { forward: 0.75, lateral: 0.25, backward: 0.0 }, ventCrawling: { cam1Probability: 1.0, cam2Probability: 0.4, soundDelay: 5000, soundDuration: 10000, totalDuration: 20000, retreatDelay: 2000, retreatSoundDuration: 3000 } },
            4: { aiLevel: 13, movementInterval: [8000, 9000], movementDuration: 1000, spawnDelay: 0, movementProbability: { forward: 0.8, lateral: 0.2, backward: 0.0 }, ventCrawling: { cam1Probability: 1.0, cam2Probability: 0.5, soundDelay: 5000, soundDuration: 10000, totalDuration: 20000, retreatDelay: 2000, retreatSoundDuration: 3000 } },
            5: { aiLevel: 13, movementInterval: [8000, 9000], movementDuration: 1000, spawnDelay: 0, movementProbability: { forward: 0.8, lateral: 0.2, backward: 0.0 }, ventCrawling: { cam1Probability: 1.0, cam2Probability: 0.5, soundDelay: 5000, soundDuration: 10000, totalDuration: 20000, retreatDelay: 2000, retreatSoundDuration: 3000 } }
        };
        
        this.currentEpsteinConfig = null;
        this.currentTrumpConfig = null;
        
        this.epstein = { currentLocation: 'cam11', aiLevel: 0, movementTimer: null, movementInterval: 12000, hasMovedOnce: false, hasSpawned: false };
        this.trump = { currentLocation: 'cam10', aiLevel: 0, movementTimer: null, movementInterval: 10000, hasSpawned: false, isCrawling: false, crawlingTimer: null, crawlingFrom: null, retreatTimer: null };
        this.hawking = { active: false, location: 'cam6', timer: null, warningLevel: 0, warningTimer: null, attackTimer: null };
        
        this.characterImages = { 'cam11': 'assets/images/enemyep1.png', 'cam10': 'assets/images/ep1.png', 'cam1': 'assets/images/ep4.png', 'cam9': 'assets/images/enemyep1.png', 'cam8': 'assets/images/enemyep1.png', 'cam7': 'assets/images/enemyep1.png', 'cam6': 'assets/images/enemyep1.png', 'cam5': 'assets/images/enemyep4.png', 'cam4': 'assets/images/ep1.png', 'cam3': 'assets/images/ep4.png', 'cam2': 'assets/images/enemyep1.png' };
        this.characterImagesNight6 = { 'cam11': 'assets/images/enemyep1_night6.png', 'cam10': 'assets/images/ep1_night6.png', 'cam1': 'assets/images/ep4_night6.png', 'cam9': 'assets/images/enemyep1_night6.png', 'cam8': 'assets/images/enemyep1_night6.png', 'cam7': 'assets/images/enemyep1_night6.png', 'cam6': 'assets/images/enemyep1_night6.png', 'cam5': 'assets/images/enemyep4_night6.png', 'cam4': 'assets/images/ep1_night6.png', 'cam3': 'assets/images/ep4_night6.png', 'cam2': 'assets/images/enemyep1_night6.png' };
        this.trumpImages = { 'cam10': 'assets/images/trump3.png', 'cam11': 'assets/images/trump3.png', 'cam9': 'assets/images/trump.png', 'cam8': 'assets/images/trump5.png', 'cam7': 'assets/images/trump3.png', 'cam6': 'assets/images/trump3.png', 'cam5': 'assets/images/trump2.png', 'cam1': 'assets/images/trump4.png', 'cam2': 'assets/images/trump4.png', 'cam3': 'assets/images/trump2.png', 'cam4': 'assets/images/trump3.png' };
        
        this.locationDepth = { 'office': 0, 'cam1': 1, 'cam2': 2, 'cam3': 2, 'cam6': 3, 'cam4': 3, 'cam5': 4, 'cam7': 4, 'cam8': 5, 'cam11': 5, 'cam9': 5, 'cam10': 6 };
        this.trumpLocationDepth = { 'office': 0, 'cam1': 1, 'cam2': 2, 'cam3': 2, 'cam6': 3, 'cam4': 3, 'cam5': 4, 'cam7': 4, 'cam8': 5, 'cam11': 5, 'cam9': 5, 'cam10': 6 };
        
        this.movementPaths = { 'cam11': ['cam7', 'cam8'], 'cam9': ['cam7', 'cam10'], 'cam10': ['cam9'], 'cam8': ['cam7', 'cam5'], 'cam7': ['cam4'], 'cam4': ['cam2', 'cam3'], 'cam5': ['cam4', 'cam6'], 'cam2': ['cam3', 'cam1'], 'cam3': ['cam1', 'cam6'], 'cam6': ['cam3'], 'cam1': ['office'], 'office': [] };
        this.adjacentRooms = { 'cam11': ['cam7', 'cam8'], 'cam9': ['cam7', 'cam10'], 'cam10': ['cam9'], 'cam8': ['cam11', 'cam7', 'cam5'], 'cam7': ['cam11', 'cam8', 'cam9', 'cam4'], 'cam4': ['cam7', 'cam2', 'cam5', 'cam3'], 'cam5': ['cam8', 'cam4', 'cam6'], 'cam2': ['cam4', 'cam3', 'cam1'], 'cam3': ['cam2', 'cam1', 'cam6', 'cam4'], 'cam6': ['cam5', 'cam3'], 'cam1': ['cam3', 'cam2'] };
        
        this.characterPositions = {
            'cam11': { left: '57.1%', bottom: '0%', width: '29%', transform: 'translateX(-50%) rotate(0deg)' },
            'cam10': { left: '73.8%', bottom: '1.6%', width: '89.2%', transform: 'translateX(-50%) rotate(0deg)' },
            'cam1': { left: '39.9%', bottom: '35.3%', width: '38.8%', transform: 'translateX(-50%) rotate(0deg)' },
            'cam9': { left: '18.5%', bottom: '0%', width: '29.6%', transform: 'translateX(-50%) rotate(0deg)' },
            'cam8': { left: '96.1%', bottom: '0%', width: '29.6%', transform: 'translateX(-50%) rotate(-23deg)' },
            'cam7': { left: '49.7%', bottom: '0%', width: '29.6%', transform: 'translateX(-50%) rotate(-5deg)' },
            'cam6': { left: '16.6%', bottom: '0%', width: '29.6%', transform: 'translateX(-50%) rotate(-5deg)' },
            'cam5': { left: '71.1%', bottom: '0%', width: '29.6%', transform: 'translateX(-50%) rotate(-5deg)' },
            'cam4': { left: '91.4%', bottom: '6.8%', width: '66.9%', transform: 'translateX(-50%) rotate(-5deg)' },
            'cam3': { left: '7.4%', bottom: '5%', width: '66.9%', transform: 'translateX(-50%) rotate(-5deg)' },
            'cam2': { left: '39.6%', bottom: '27.7%', width: '37.8%', transform: 'translateX(-50%) rotate(-139deg)' },
        };
        
        this.characterBrightness = { 'cam11': 100, 'cam10': 100, 'cam1': 22, 'cam9': 8, 'cam8': 9, 'cam7': 9, 'cam6': 9, 'cam5': 7, 'cam4': 65, 'cam3': 30, 'cam2': 8 };
        this.characterRotation = { 'cam11': 0, 'cam10': 0, 'cam1': 0, 'cam9': 0, 'cam8': -23, 'cam7': -5, 'cam6': -5, 'cam5': -5, 'cam4': -5, 'cam3': -5, 'cam2': -139 };
        
        this.lightningEyesConfig = {
            'cam11': { eye1: { left: '46.3%', top: '14.8%', width: '10%', height: '10%' }, eye2: { left: '54.2%', top: '13.8%', width: '10%', height: '10%' } },
            'cam10': { eye1: { left: '37.0%', top: '41.7%', width: '10%', height: '10%' }, eye2: { left: '38.7%', top: '43.5%', width: '10%', height: '10%' } },
            'cam1': { eye1: { left: '47.7%', top: '41.6%', width: '10%', height: '10%' }, eye2: { left: '49.9%', top: '42.3%', width: '10%', height: '10%' } },
            'cam9': { eye1: { left: '46.8%', top: '15.1%', width: '10%', height: '10%' }, eye2: { left: '54.7%', top: '14.1%', width: '10%', height: '10%' } },
            'cam8': { eye1: { left: '47.1%', top: '15.8%', width: '10%', height: '10%' }, eye2: { left: '53.9%', top: '15.3%', width: '10%', height: '10%' } },
            'cam7': { eye1: { left: '46.3%', top: '15.6%', width: '10%', height: '10%' }, eye2: { left: '54.2%', top: '13.6%', width: '10%', height: '10%' } },
            'cam6': { eye1: { left: '46.8%', top: '15.4%', width: '10%', height: '10%' }, eye2: { left: '53.7%', top: '14.5%', width: '10%', height: '10%' } },
            'cam5': { eye1: { left: '52.2%', top: '21.3%', width: '10%', height: '10%' }, eye2: { left: '62.0%', top: '23.1%', width: '10%', height: '10%' } },
            'cam4': { eye1: { left: '37.1%', top: '42.4%', width: '10%', height: '10%' }, eye2: { left: '38.4%', top: '43.6%', width: '10%', height: '10%' } },
            'cam3': { eye1: { left: '47.7%', top: '41.4%', width: '10%', height: '10%' }, eye2: { left: '50.0%', top: '42.5%', width: '10%', height: '10%' } },
            'cam2': { eye1: { left: '46.1%', top: '15.3%', width: '10%', height: '10%' }, eye2: { left: '53.9%', top: '14.3%', width: '10%', height: '10%' } }
        };
        
        this.trumpPositions = {
            'cam10': { left: '10%', bottom: '0%', width: '40%', transform: 'translateX(-50%) rotate(0deg)' },
            'cam11': { left: '38.2%', bottom: '0%', width: '40%', transform: 'translateX(-50%) rotate(0deg)' },
            'cam9': { left: '0%', bottom: '34.6%', width: '13.9%', transform: 'translateX(-50%) rotate(44deg)' },
            'cam8': { left: '1.5%', bottom: '24.5%', width: '20.1%', transform: 'translateX(-50%) rotate(58deg)' },
            'cam7': { left: '7.4%', bottom: '0%', width: '41.4%', transform: 'translateX(-50%) rotate(1deg)' },
            'cam6': { left: '86.3%', bottom: '0%', width: '41.4%', transform: 'translateX(-50%) rotate(1deg)' },
            'cam5': { left: '0%', bottom: '0%', width: '29.3%', transform: 'translateX(-50%) rotate(1deg)' },
            'cam1': { left: '10.8%', bottom: '15%', width: '31.6%', transform: 'translateX(-50%) rotate(1deg)' },
            'cam2': { left: '77.2%', bottom: '32.3%', width: '31.6%', transform: 'translateX(-50%) rotate(1deg)' },
            'cam3': { left: '100%', bottom: '21.4%', width: '32.9%', transform: 'translateX(-50%) rotate(-62deg)' },
            'cam4': { left: '11%', bottom: '0%', width: '31.6%', transform: 'translateX(-50%) rotate(1deg)' },
        };
        
        this.trumpBrightness = { 'cam10': 31, 'cam11': 100, 'cam9': 29, 'cam8': 28, 'cam7': 28, 'cam6': 28, 'cam5': 12, 'cam1': 40, 'cam2': 31, 'cam3': 19, 'cam4': 31 };
        this.trumpRotation = { 'cam10': 0, 'cam11': 0, 'cam9': 44, 'cam8': 58, 'cam7': 1, 'cam6': 1, 'cam5': 1, 'cam1': 1, 'cam2': 1, 'cam3': -62, 'cam4': 1 };
    }

    start() {
        this.loadAIConfig();
        
        // MULTIPLAYER FIX: Completely disable local AI logic for the Watcher!
        // The Host will simulate everything and push coordinates over the network.
        if (window.multiplayer && window.multiplayer.role === 'watcher') {
            return; 
        }
        
        if (this.epstein.aiLevel > 0) {
            const spawnTimer = setTimeout(() => {
                this.spawnEpstein();
            }, this.currentEpsteinConfig.spawnDelay);
        }
        
        if (this.currentTrumpConfig && this.trump.aiLevel > 0) {
            setTimeout(() => {
                this.spawnTrump();
            }, this.currentTrumpConfig.spawnDelay);
        }
        
        if (this.game.state.customNight && this.game.state.customAILevels.hawking > 0) {
            this.startHawking();
        } else if (!this.game.state.customNight && this.game.state.currentNight >= 3 && this.game.state.currentNight <= 5) {
            this.startHawking();
        }
    }
    
    loadAIConfig() {
        const night = this.game.state.currentNight;
        
        if (this.game.state.customNight && night === 7) {
            const customLevels = this.game.state.customAILevels;
            
            this.currentEpsteinConfig = {
                aiLevel: customLevels.epstein,
                movementInterval: [9000, 10000],
                movementDuration: 1000,
                spawnDelay: 0,
                movementProbability: { forward: 0.9, lateral: 0.1, backward: 0.0 },
                soundLureResistance: 0.15
            };
            this.epstein.aiLevel = customLevels.epstein;
            this.epstein.movementInterval = this.getRandomInterval(this.currentEpsteinConfig.movementInterval);
            
            if (customLevels.trump > 0) {
                this.currentTrumpConfig = {
                    aiLevel: customLevels.trump,
                    movementInterval: [8000, 9000],
                    movementDuration: 1000,
                    spawnDelay: 0,
                    movementProbability: { forward: 0.8, lateral: 0.2, backward: 0.0 },
                    ventCrawling: { cam1Probability: 1.0, cam2Probability: 0.5, soundDelay: 5000, soundDuration: 10000, totalDuration: 20000, retreatDelay: 2000, retreatSoundDuration: 3000 }
                };
                this.trump.aiLevel = customLevels.trump;
                this.trump.movementInterval = this.getRandomInterval(this.currentTrumpConfig.movementInterval);
            } else {
                this.currentTrumpConfig = null;
            }
            return;
        }
        
        this.currentEpsteinConfig = this.epsteinConfig[night] || this.epsteinConfig[1];
        this.epstein.aiLevel = this.currentEpsteinConfig.aiLevel;
        this.epstein.movementInterval = this.getRandomInterval(this.currentEpsteinConfig.movementInterval);
        
        if (night >= 2 && night <= 5) {
            this.currentTrumpConfig = this.trumpConfig[night] || this.trumpConfig[2];
            this.trump.aiLevel = this.currentTrumpConfig.aiLevel;
            this.trump.movementInterval = this.getRandomInterval(this.currentTrumpConfig.movementInterval);
        } else {
            this.currentTrumpConfig = null; 
        }
    }
    
    getRandomInterval(intervalConfig) {
        if (Array.isArray(intervalConfig)) {
            const [min, max] = intervalConfig;
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        return intervalConfig;
    }
    
    spawnEpstein() {
        if (this.epstein.hasSpawned) return;
        this.epstein.hasSpawned = true;
        
        if (this.game.state.currentNight === 1) this.triggerCameraFailure();
        this.startMovementLoop();
        this.updateCameraDisplay();
    }
    
    spawnTrump() {
        if (this.trump.hasSpawned) return;
        this.trump.hasSpawned = true;
        
        if (this.game.state.cameraOpen) this.updateCameraDisplay();
        this.startTrumpMovementLoop();
    }

    stop() {
        if (this.epstein.movementTimer) clearTimeout(this.epstein.movementTimer);
        this.epstein.movementTimer = null;
        
        if (this.trump.movementTimer) clearTimeout(this.trump.movementTimer);
        this.trump.movementTimer = null;
        
        if (this.trump.crawlingTimer) clearTimeout(this.trump.crawlingTimer);
        this.trump.crawlingTimer = null;
        
        if (this.trump.retreatTimer) clearTimeout(this.trump.retreatTimer);
        this.trump.retreatTimer = null;
        
        if (this.hawking.timer) clearTimeout(this.hawking.timer);
        this.hawking.timer = null;
        
        if (this.hawking.warningTimer) clearTimeout(this.hawking.warningTimer);
        this.hawking.warningTimer = null;
        
        if (this.hawking.attackTimer) clearTimeout(this.hawking.attackTimer);
        this.hawking.attackTimer = null;
        
        this.game.assets.stopSound('ventCrawling');
        this.hideHawkingWarning();
    }

    startMovementLoop() {
        const scheduleNextCheck = () => {
            let currentConfig = this.currentEpsteinConfig;
            if (this.game.state.currentNight === 4 && this.game.state.currentTime >= 4) {
                currentConfig = {
                    ...this.currentEpsteinConfig,
                    movementInterval: [8000, 10000],
                    movementProbability: { forward: 1.0, lateral: 0.0, backward: 0.0 }
                };
            }
            
            const nextInterval = this.getRandomInterval(currentConfig.movementInterval);
            this.epstein.movementTimer = setTimeout(() => {
                this.checkMovement();
                scheduleNextCheck();
            }, nextInterval);
        };
        scheduleNextCheck();
    }
    
    startTrumpMovementLoop() {
        const scheduleNextCheck = () => {
            let currentConfig = this.currentTrumpConfig;
            if (this.game.state.currentNight === 5 && this.game.state.currentTime >= 4) {
                currentConfig = {
                    ...this.currentTrumpConfig,
                    movementInterval: [6000, 7000], 
                    movementProbability: { forward: 1.0, lateral: 0.0, backward: 0.0 }
                };
            }
            
            const nextInterval = this.getRandomInterval(currentConfig.movementInterval);
            this.trump.movementTimer = setTimeout(() => {
                this.checkTrumpMovement();
                scheduleNextCheck();
            }, nextInterval);
        };
        scheduleNextCheck();
    }

    checkMovement() {
        if (!this.epstein.hasSpawned || this.epstein.aiLevel === 0 || this.epstein.currentLocation === 'office') return;
        if (Math.floor(Math.random() * 20) + 1 <= this.epstein.aiLevel) this.moveToNextLocation();
    }
    
    checkTrumpMovement() {
        if (!this.trump.hasSpawned || this.trump.aiLevel === 0 || this.trump.currentLocation === 'office') return;
        if (Math.floor(Math.random() * 20) + 1 <= this.trump.aiLevel) this.moveTrumpToNextLocation();
    }

    moveToNextLocation() {
        const currentLoc = this.epstein.currentLocation;
        const currentDepth = this.locationDepth[currentLoc];
        
        let config = this.currentEpsteinConfig;
        if (this.game.state.currentNight === 4 && this.game.state.currentTime >= 4) {
            config = { ...this.currentEpsteinConfig, movementProbability: { forward: 1.0, lateral: 0.0, backward: 0.0 } };
            if (!this.epstein.night4AggressiveMode) this.epstein.night4AggressiveMode = true;
        }
        
        const allLocations = Object.keys(this.locationDepth).filter(loc => loc !== 'office' && loc !== currentLoc);
        const adjacentLocs = this.adjacentRooms[currentLoc] || [];
        
        const forwardLocations = allLocations.filter(loc => this.locationDepth[loc] === currentDepth - 1);
        const lateralLocations = adjacentLocs.filter(loc => this.locationDepth[loc] === currentDepth);
        const backwardLocations = adjacentLocs.filter(loc => this.locationDepth[loc] === currentDepth + 1);
        
        if (forwardLocations.length === 0 && currentDepth === 1) {
            this.epstein.currentLocation = 'office';
            this.triggerJumpscare('epstein');
            return;
        }
        
        const movementProb = config.movementProbability;
        const totalProb = movementProb.forward + movementProb.lateral + movementProb.backward;
        
        if (totalProb === 0 || (forwardLocations.length === 0 && lateralLocations.length === 0 && backwardLocations.length === 0)) return;
        
        const normalizedProb = {
            forward: movementProb.forward / totalProb,
            lateral: movementProb.lateral / totalProb,
            backward: movementProb.backward / totalProb
        };
        
        const random = Math.random();
        let selectedLocations = [];
        
        if (random < normalizedProb.forward && forwardLocations.length > 0) selectedLocations = forwardLocations;
        else if (random < normalizedProb.forward + normalizedProb.lateral && lateralLocations.length > 0) selectedLocations = lateralLocations;
        else if (backwardLocations.length > 0) selectedLocations = backwardLocations;
        else {
            if (forwardLocations.length > 0) selectedLocations = forwardLocations;
            else if (lateralLocations.length > 0) selectedLocations = lateralLocations;
            else if (backwardLocations.length > 0) selectedLocations = backwardLocations;
            else return;
        }
        
        const nextLocation = selectedLocations[Math.floor(Math.random() * selectedLocations.length)];
        this.epstein.currentLocation = nextLocation;
        
        this.game.assets.playSound('blip', false, 0.5);
        
        if (nextLocation === 'office') {
            this.triggerJumpscare('epstein');
            return;
        }
        
        if (this.game.state.cameraOpen && !this.game.state.cameraFailed) this.game.camera.playMovementTransition();
        this.updateCameraDisplay();
    }
    
    moveTrumpToNextLocation() {
        const currentLoc = this.trump.currentLocation;
        const currentDepth = this.trumpLocationDepth[currentLoc];
        
        let config = this.currentTrumpConfig;
        if (this.game.state.currentNight === 5 && this.game.state.currentTime >= 4) {
            config = { ...this.currentTrumpConfig, movementProbability: { forward: 1.0, lateral: 0.0, backward: 0.0 }, ventCrawling: { ...this.currentTrumpConfig.ventCrawling, cam1Probability: 1.0, cam2Probability: 0.8 } };
            if (!this.trump.night5AggressiveMode) this.trump.night5AggressiveMode = true;
        }
        
        if (this.trump.isCrawling) return;
        
        if (currentLoc === 'cam1' && Math.random() < config.ventCrawling.cam1Probability) { this.startTrumpCrawling(currentLoc); return; }
        if (currentLoc === 'cam2' && Math.random() < config.ventCrawling.cam2Probability) { this.startTrumpCrawling(currentLoc); return; }
        
        const allLocations = Object.keys(this.trumpLocationDepth).filter(loc => loc !== 'office' && loc !== currentLoc);
        const adjacentLocs = this.adjacentRooms[currentLoc] || [];
        
        const forwardLocations = allLocations.filter(loc => this.trumpLocationDepth[loc] === currentDepth - 1);
        const lateralLocations = adjacentLocs.filter(loc => this.trumpLocationDepth[loc] === currentDepth);
        const backwardLocations = adjacentLocs.filter(loc => this.trumpLocationDepth[loc] === currentDepth + 1);
        
        if (forwardLocations.length === 0 && lateralLocations.length === 0 && backwardLocations.length === 0) return;
        
        const movementProb = config.movementProbability;
        const totalProb = movementProb.forward + movementProb.lateral + movementProb.backward;
        
        if (totalProb === 0) return;
        
        const normalizedProb = {
            forward: movementProb.forward / totalProb,
            lateral: movementProb.lateral / totalProb,
            backward: movementProb.backward / totalProb
        };
        
        const random = Math.random();
        let selectedLocations = [];
        
        if (random < normalizedProb.forward && forwardLocations.length > 0) selectedLocations = forwardLocations;
        else if (random < normalizedProb.forward + normalizedProb.lateral && lateralLocations.length > 0) selectedLocations = lateralLocations;
        else if (backwardLocations.length > 0) selectedLocations = backwardLocations;
        else {
            if (forwardLocations.length > 0) selectedLocations = forwardLocations;
            else if (lateralLocations.length > 0) selectedLocations = lateralLocations;
            else if (backwardLocations.length > 0) selectedLocations = backwardLocations;
            else return;
        }
        
        const nextLocation = selectedLocations[Math.floor(Math.random() * selectedLocations.length)];
        this.trump.currentLocation = nextLocation;
        
        this.game.assets.playSound('blip', false, 0.5);
        if (this.game.state.cameraOpen && !this.game.state.cameraFailed) this.game.camera.playMovementTransition();
        this.updateCameraDisplay();
    }
    
    startTrumpCrawling(fromLocation) {
        const config = this.currentTrumpConfig.ventCrawling;
        
        if (this.game.state.ventsClosed) {
            const depth3Locations = Object.keys(this.trumpLocationDepth).filter(loc => this.trumpLocationDepth[loc] === 3 && loc !== 'office');
            let retreatLocation = depth3Locations.length > 0 ? depth3Locations[Math.floor(Math.random() * depth3Locations.length)] : Object.keys(this.locationDepth).filter(loc => this.locationDepth[loc] === 3 && loc !== 'office')[Math.floor(Math.random() * Object.keys(this.locationDepth).filter(loc => this.locationDepth[loc] === 3 && loc !== 'office').length)];
            
            this.trump.currentLocation = retreatLocation;
            this.trump.isCrawling = false;
            this.trump.crawlingFrom = null;
            this.updateCameraDisplay();
            return;
        }
        
        this.trump.isCrawling = true;
        this.trump.crawlingFrom = fromLocation; 
        this.trump.currentLocation = 'crawling'; 
        this.updateCameraDisplay();
        
        setTimeout(() => {
            if (this.trump.isCrawling && this.trump.currentLocation === 'crawling') {
                this.game.assets.playSound('ventCrawling', true, 1.0);
                setTimeout(() => {
                    if (this.trump.isCrawling && this.trump.currentLocation === 'crawling') this.game.assets.stopSound('ventCrawling');
                }, config.soundDuration);
            }
        }, config.soundDelay);
        
        this.trump.crawlingTimer = setTimeout(() => {
            this.trump.currentLocation = 'office';
            this.trump.isCrawling = false;
            this.trump.crawlingFrom = null;
            this.game.assets.stopSound('ventCrawling');
            this.triggerJumpscare('trump');
        }, config.totalDuration);
    }
    
    stopTrumpCrawling() {
        if (!this.trump.isCrawling) return false;
        
        const config = this.currentTrumpConfig.ventCrawling;
        if (this.trump.crawlingTimer) clearTimeout(this.trump.crawlingTimer);
        this.trump.crawlingTimer = null;
        
        this.game.assets.stopSound('ventCrawling');
        this.trump.isCrawling = false;
        
        const depth3Locations = Object.keys(this.trumpLocationDepth).filter(loc => this.trumpLocationDepth[loc] === 3 && loc !== 'office');
        let retreatLocation = depth3Locations.length > 0 ? depth3Locations[Math.floor(Math.random() * depth3Locations.length)] : Object.keys(this.locationDepth).filter(loc => this.locationDepth[loc] === 3 && loc !== 'office')[Math.floor(Math.random() * Object.keys(this.locationDepth).filter(loc => this.locationDepth[loc] === 3 && loc !== 'office').length)];
        
        this.trump.currentLocation = retreatLocation;
        this.trump.crawlingFrom = null;
        this.updateCameraDisplay();
        
        setTimeout(() => {
            this.game.assets.playSound('ventCrawling', false, 1.0);
            setTimeout(() => this.game.assets.stopSound('ventCrawling'), config.retreatSoundDuration);
        }, config.retreatDelay);
        
        return true;
    }
    
    onVentsChanged(ventsClosed) {
        if (this.trump.isCrawling && ventsClosed) this.stopTrumpCrawling();
    }
    
    attractToSound(soundLocation) {
        let epAttracted = false;
        let trumpAttracted = false;
        
        const epCurrentLoc = this.epstein.currentLocation;
        const adjacentToEp = this.adjacentRooms[epCurrentLoc];
        
        if (this.epstein.hasSpawned && adjacentToEp && adjacentToEp.includes(soundLocation)) {
            const resistance = this.currentEpsteinConfig.soundLureResistance;
            if (resistance > 0) {
                const failChance = Math.random();
                if (failChance < resistance) {
                    this.game.assets.playSound('blip', false, 0.5);
                    return false; 
                }
            }
            
            this.epstein.currentLocation = soundLocation;
            
            // MULTIPLAYER FIX: Immediately force sync to the Watcher's screen!
            this.updateCameraDisplay();
            
            this.game.assets.playSound('blip', false, 0.5);
            
            if (soundLocation === 'office') this.triggerJumpscare('epstein');
            epAttracted = true;
        } 
        
        const trumpCurrentLoc = this.trump.currentLocation;
        const adjacentToTrump = this.adjacentRooms[trumpCurrentLoc];
        
        if (this.trump.hasSpawned && !this.trump.isCrawling && adjacentToTrump && adjacentToTrump.includes(soundLocation)) {
            this.trump.currentLocation = soundLocation;
            
            // MULTIPLAYER FIX: Immediately force sync to the Watcher's screen!
            this.updateCameraDisplay();
            
            if (!epAttracted) this.game.assets.playSound('blip', false, 0.5);
            if (soundLocation === 'office') this.triggerJumpscare('trump');
            trumpAttracted = true;
        }
        
        return epAttracted || trumpAttracted;
    }
    
    triggerCameraFailure() {
        this.game.state.cameraFailed = true;
        if (window.multiplayer && window.multiplayer.role === 'engineer') {
            window.multiplayer.sendEvent('CAMERA_FAILED');
        }
        this.game.assets.playSound('static', true, 1.0);
        if (this.game.state.cameraOpen) this.game.camera.showCameraFailure();
    }

    updateCameraDisplay() {
        if (window.multiplayer && window.multiplayer.role === 'engineer') {
            window.multiplayer.sendEvent('ENEMY_MOVED', {
                epsteinLoc: this.epstein.currentLocation,
                epSpawned: this.epstein.hasSpawned,
                trumpLoc: this.trump.currentLocation,
                trumpSpawned: this.trump.hasSpawned,
                trumpCrawling: this.trump.isCrawling,
                hawkingActive: this.hawking.active,
                hawkingWarning: this.hawking.warningLevel
            });
        }
        if (this.game.camera) this.game.camera.updateCharacterDisplay();
    }

    triggerJumpscare(enemy = 'epstein') {
        if (window.multiplayer && window.multiplayer.role === 'engineer') {
            window.multiplayer.sendEvent('JUMPSCARE', { enemy: enemy });
        }

        this.stop();
        
        if (enemy === 'hawking') {
            this.triggerHawkingMissileJumpscare();
            return;
        }
        
        this.game.assets.stopSound('vents');
        this.game.assets.stopSound('static');
        
        const jumpscareContainer = document.createElement('div');
        jumpscareContainer.id = 'jumpscare-container';
        jumpscareContainer.style.position = 'fixed';
        jumpscareContainer.style.top = '0';
        jumpscareContainer.style.left = '0';
        jumpscareContainer.style.width = '100%';
        jumpscareContainer.style.height = '100%';
        jumpscareContainer.style.display = 'flex';
        jumpscareContainer.style.alignItems = 'center';
        jumpscareContainer.style.justifyContent = 'center';
        jumpscareContainer.style.zIndex = '99999';
        jumpscareContainer.style.overflow = 'hidden';
        
        const officeBackground = document.createElement('img');
        officeBackground.src = this.game.assets.images.office.src;
        officeBackground.style.position = 'absolute';
        officeBackground.style.top = '0';
        officeBackground.style.left = '0';
        officeBackground.style.width = '100%';
        officeBackground.style.height = '100%';
        officeBackground.style.objectFit = 'cover';
        officeBackground.style.zIndex = '1';
        
        const jumpscareImg = document.createElement('img');
        if (enemy === 'trump') jumpscareImg.src = this.game.assets.images.trumpJumpscare?.src || this.game.assets.images.jumpscare.src;
        else if (enemy === 'hawking') jumpscareImg.src = this.game.assets.images.hawkingJumpscare?.src || this.game.assets.images.jumpscare.src;
        else jumpscareImg.src = this.game.assets.images.jumpscare.src;
        
        jumpscareImg.style.position = 'absolute';
        jumpscareImg.style.top = '50%';
        jumpscareImg.style.left = '50%';
        jumpscareImg.style.transform = 'translate(-50%, -50%)';
        jumpscareImg.style.width = '25%'; 
        jumpscareImg.style.height = 'auto';
        jumpscareImg.style.zIndex = '2';
        jumpscareImg.style.transition = 'none';
        
        jumpscareContainer.appendChild(officeBackground);
        jumpscareContainer.appendChild(jumpscareImg);
        document.body.appendChild(jumpscareContainer);
        
        if (enemy === 'hawking') this.game.assets.playSound('hawkingJumpscare', false, 1.0);
        else this.game.assets.playSound('jumpscare', false, 1.0);
        
        setTimeout(() => jumpscareImg.style.width = '50%', 150);
        setTimeout(() => jumpscareImg.style.width = '100%', 300);
        
        setTimeout(() => {
            jumpscareContainer.style.transition = 'opacity 0.5s';
            jumpscareContainer.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(jumpscareContainer);
                this.game.gameOver('GAME OVER');
            }, 500);
        }, 1500);
    }

    getCurrentLocation() { return this.epstein.currentLocation; }
    getCurrentImage(cam, night) { return (night === 6 && this.characterImagesNight6[cam]) ? this.characterImagesNight6[cam] : this.characterImages[cam]; }
    getTrumpCurrentLocation() { return this.trump.currentLocation; }
    isTrumpCrawling() { return this.trump.isCrawling; }

    reset() {
        this.stop();
        
        this.epstein.currentLocation = 'cam11';
        this.epstein.aiLevel = 0;
        this.epstein.hasMovedOnce = false;
        this.epstein.hasSpawned = false;
        this.epstein.night4AggressiveMode = false; 
        if (this.epstein.timer) clearTimeout(this.epstein.timer);
        this.epstein.timer = null;
        
        this.trump.currentLocation = 'cam10';
        this.trump.aiLevel = 0;
        this.trump.hasSpawned = false;
        this.trump.isCrawling = false;
        this.trump.crawlingFrom = null;
        this.trump.night5AggressiveMode = false; 
        if (this.trump.timer) clearTimeout(this.trump.timer);
        this.trump.timer = null;
        if (this.trump.crawlingTimer) clearTimeout(this.trump.crawlingTimer);
        this.trump.crawlingTimer = null;
        if (this.trump.retreatTimer) clearTimeout(this.trump.retreatTimer);
        this.trump.retreatTimer = null;
        
        this.hawking.active = false;
        this.hawking.warningLevel = 0;
        if (this.hawking.timer) clearTimeout(this.hawking.timer);
        this.hawking.timer = null;
        if (this.hawking.warningTimer) clearTimeout(this.hawking.warningTimer);
        this.hawking.warningTimer = null;
        if (this.hawking.attackTimer) clearTimeout(this.hawking.attackTimer);
        this.hawking.attackTimer = null;
        this.hideHawkingWarning();
        
        const characterOverlay = document.getElementById('character-overlay');
        if (characterOverlay) characterOverlay.innerHTML = '';
    }
    
    startHawking() {
        this.hawking.active = true;
        this.hawking.warningLevel = 0;
        
        let initialWarningTime = 30000; 
        if (this.game.state.customNight && this.game.state.currentNight === 7) {
            const hawkingLevel = this.game.state.customAILevels.hawking;
            if (hawkingLevel >= 16) initialWarningTime = 15000; 
            else if (hawkingLevel >= 11) initialWarningTime = 20000; 
            else if (hawkingLevel >= 6) initialWarningTime = 25000; 
            else initialWarningTime = 30000; 
        } else {
            initialWarningTime = 20000;
        }
        
        this.hawking.timer = setTimeout(() => this.showHawkingWarning('yellow'), initialWarningTime);
    }
    
    showHawkingWarning(level) {
        if (!this.hawking.active) return;
        
        let yellowToRedTime = 5000; 
        let redToBreakTime = 5000;  
        
        if (this.game.state.customNight && this.game.state.currentNight === 7) {
            const hawkingLevel = this.game.state.customAILevels.hawking;
            if (hawkingLevel >= 16) { yellowToRedTime = 3000; redToBreakTime = 3000; }
            else if (hawkingLevel >= 11) { yellowToRedTime = 4000; redToBreakTime = 4000; }
            else if (hawkingLevel >= 6) { yellowToRedTime = 5000; redToBreakTime = 5000; }
            else { yellowToRedTime = 6000; redToBreakTime = 6000; }
        }
        
        if (level === 'yellow') {
            this.hawking.warningLevel = 1;
            this.updateHawkingWarningDisplay();
            this.hawking.warningTimer = setTimeout(() => this.showHawkingWarning('red'), yellowToRedTime);
        } else if (level === 'red') {
            this.hawking.warningLevel = 2;
            this.updateHawkingWarningDisplay();
            this.hawking.warningTimer = setTimeout(() => this.hawkingBreakCamera(), redToBreakTime);
        }
    }
    
    updateHawkingWarningDisplay() {
        let warningIcon = document.getElementById('hawking-warning-icon');
        
        if (!warningIcon) {
            warningIcon = document.createElement('img');
            warningIcon.id = 'hawking-warning-icon';
            warningIcon.style.position = 'absolute';
            warningIcon.style.zIndex = '1000';
            warningIcon.style.display = 'block';
            warningIcon.style.animation = 'flash 0.5s infinite';
            
            if (this.game.state.cameraOpen) {
                const cameraGrid = document.getElementById('camera-grid');
                if (cameraGrid) cameraGrid.appendChild(warningIcon);
            } else {
                document.body.appendChild(warningIcon);
            }
        }
        
        if (this.game.state.cameraOpen) {
            warningIcon.style.position = 'absolute';
            warningIcon.style.left = '91%'; 
            warningIcon.style.top = '82.2%';
            warningIcon.style.width = '11.2%'; 
            warningIcon.style.height = 'auto';
            warningIcon.style.transform = 'none';
            
            const cameraGrid = document.getElementById('camera-grid');
            if (cameraGrid && warningIcon.parentElement !== cameraGrid) cameraGrid.appendChild(warningIcon);
        } else {
            warningIcon.style.position = 'fixed';
            warningIcon.style.left = 'auto';
            warningIcon.style.right = 'calc(2vw + 15vw)'; 
            warningIcon.style.top = 'auto';
            warningIcon.style.bottom = '2vh';
            warningIcon.style.width = '3vw';
            warningIcon.style.height = 'auto';
            warningIcon.style.transform = 'none';
            
            if (warningIcon.parentElement !== document.body) document.body.appendChild(warningIcon);
        }
        
        if (this.hawking.warningLevel === 1) warningIcon.src = 'assets/images/Warninglight.png';
        else if (this.hawking.warningLevel === 2) warningIcon.src = 'assets/images/Warningheavy.png';
    }
    
    hideHawkingWarning() {
        const warningIcon = document.getElementById('hawking-warning-icon');
        if (warningIcon) warningIcon.remove();
    }
    
    hawkingBreakCamera() {
        this.hideHawkingWarning();
        this.triggerCameraFailure();
        this.hawking.active = false;
        this.updateCameraDisplay();
        
        this.hawking.attackTimer = setTimeout(() => this.triggerJumpscare('hawking'), 4000);
    }
    
    triggerHawkingMissileJumpscare() {
        this.game.assets.stopSound('vents');
        this.game.assets.stopSound('static');
        
        const jumpscareContainer = document.createElement('div');
        jumpscareContainer.id = 'jumpscare-container';
        jumpscareContainer.style.position = 'fixed';
        jumpscareContainer.style.top = '0';
        jumpscareContainer.style.left = '0';
        jumpscareContainer.style.width = '100%';
        jumpscareContainer.style.height = '100%';
        jumpscareContainer.style.zIndex = '99999';
        jumpscareContainer.style.overflow = 'hidden';
        jumpscareContainer.style.backgroundColor = '#000';
        
        const officeBackground = document.createElement('img');
        officeBackground.src = this.game.assets.images.office.src;
        officeBackground.style.position = 'absolute';
        officeBackground.style.top = '0';
        officeBackground.style.left = '0';
        officeBackground.style.width = '100%';
        officeBackground.style.height = '100%';
        officeBackground.style.objectFit = 'cover';
        officeBackground.style.zIndex = '1';
        
        const hawkingImg = document.createElement('img');
        hawkingImg.src = 'assets/images/mrstephen.png';
        hawkingImg.style.position = 'absolute';
        hawkingImg.style.left = '43.6%';
        hawkingImg.style.bottom = '27.4%';
        hawkingImg.style.width = '30%';
        hawkingImg.style.height = 'auto';
        hawkingImg.style.zIndex = '2';
        hawkingImg.style.filter = 'brightness(0.68) contrast(1) saturate(1)';
        
        const missileImg = document.createElement('img');
        missileImg.src = 'assets/images/front.png';
        missileImg.style.position = 'absolute';
        missileImg.style.left = '25%';
        missileImg.style.top = '40%';
        missileImg.style.width = '5%';
        missileImg.style.height = 'auto';
        missileImg.style.zIndex = '3';
        missileImg.style.transition = 'all 1s ease-out';
        
        const explosionImg = document.createElement('div');
        explosionImg.style.position = 'absolute';
        explosionImg.style.top = '50%';
        explosionImg.style.left = '50%';
        explosionImg.style.transform = 'translate(-50%, -50%)';
        explosionImg.style.width = '50vw'; 
        explosionImg.style.height = '50vh'; 
        explosionImg.style.zIndex = '4';
        explosionImg.style.backgroundImage = 'url(assets/images/exp2.png)';
        explosionImg.style.backgroundSize = '400% auto'; 
        explosionImg.style.backgroundRepeat = 'no-repeat';
        explosionImg.style.backgroundPosition = '0% 0%';
        explosionImg.style.display = 'none';
        
        jumpscareContainer.appendChild(officeBackground);
        jumpscareContainer.appendChild(hawkingImg);
        jumpscareContainer.appendChild(missileImg);
        jumpscareContainer.appendChild(explosionImg);
        document.body.appendChild(jumpscareContainer);
        
        this.game.assets.playSound('hawkingJumpscare', false, 1.0);
        
        setTimeout(() => {
            missileImg.style.left = '50%';
            missileImg.style.top = '50%';
            missileImg.style.transform = 'translate(-50%, -50%)';
            missileImg.style.width = '80%';
        }, 50);
        
        setTimeout(() => {
            missileImg.style.display = 'none';
            explosionImg.style.display = 'block';
            
            let frame = 0;
            const animateExplosion = setInterval(() => {
                explosionImg.style.backgroundPosition = `0% ${[8.00, 36.50, 65.00, 93.00][frame]}%`;
                frame++;
                if (frame > 3) {
                    clearInterval(animateExplosion);
                    setTimeout(() => {
                        jumpscareContainer.style.transition = 'opacity 0.5s';
                        jumpscareContainer.style.opacity = '0';
                        setTimeout(() => {
                            document.body.removeChild(jumpscareContainer);
                            this.game.gameOver('GAME OVER');
                        }, 500);
                    }, 200);
                }
            }, 80);
        }, 1000);
    }
    
    shockHawking() {
        if (!this.hawking.active) return false;
        
        if (this.hawking.timer) clearTimeout(this.hawking.timer);
        this.hawking.timer = null;
        if (this.hawking.warningTimer) clearTimeout(this.hawking.warningTimer);
        this.hawking.warningTimer = null;
        if (this.hawking.attackTimer) clearTimeout(this.hawking.attackTimer);
        this.hawking.attackTimer = null;
        
        this.hawking.warningLevel = 0;
        this.hideHawkingWarning();
        
        this.game.assets.playSound('hawking_shock', false, 0.8);
        
        let resetWarningTime = 20000; 
        if (this.game.state.customNight && this.game.state.currentNight === 7) {
            const hawkingLevel = this.game.state.customAILevels.hawking;
            if (hawkingLevel >= 16) resetWarningTime = 15000; 
            else if (hawkingLevel >= 11) resetWarningTime = 20000; 
            else if (hawkingLevel >= 6) resetWarningTime = 25000; 
            else resetWarningTime = 30000; 
        }
        
        this.hawking.timer = setTimeout(() => this.showHawkingWarning('yellow'), resetWarningTime);
        return true;
    }
}