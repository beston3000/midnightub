// 游戏入口 - 初始化所有模块
let game;
let staticNoise;

let loadedAssets = 0;
let totalAssets = 0;

function disableBrowserDefaults() {
    document.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; }, { capture: true });
    document.addEventListener('dragstart', (e) => { e.preventDefault(); return false; }, { capture: true });
    document.addEventListener('selectstart', (e) => { e.preventDefault(); return false; }, { capture: true });
    document.addEventListener('copy', (e) => { e.preventDefault(); return false; }, { capture: true });
    document.addEventListener('cut', (e) => { e.preventDefault(); return false; }, { capture: true });
    
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && ['a', 'c', 'x', 's', 'p', 'u'].includes(e.key.toLowerCase())) {
            e.preventDefault();
            return false;
        }
    }, { capture: true });
    
    document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false, capture: true });
    document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false, capture: true });
    
    document.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return true;
        if (e.detail > 1) { e.preventDefault(); return false; }
    }, { capture: true });
}

function updatePreloadProgress(progress) {
    const progressBar = document.getElementById('progress-bar');
    const percentage = document.getElementById('preloader-percentage');
    if (progressBar && percentage) {
        progressBar.style.width = progress + '%';
        percentage.textContent = Math.round(progress) + '%';
    }
}

async function preloadGameAssets() {
    const basePath = window.location.pathname.includes('/FNAE-HTML5-1.2.2-fix/') ? '/FNAE-HTML5-1.2.2-fix/' : './';
    
    const imagePaths = [
        'assets/images/original.png', 'assets/images/Cam1.png', 'assets/images/Cam2.png',
        'assets/images/Cam3.png', 'assets/images/Cam4.png', 'assets/images/Cam5.png',
        'assets/images/Cam6.png', 'assets/images/Cam7.png', 'assets/images/Cam8.png',
        'assets/images/Cam9.png', 'assets/images/Cam10.png', 'assets/images/Cam11.png',
        'assets/images/jump.png', 'assets/images/jumptrump.png', 'assets/images/menubackground.png', 
        'assets/images/cutscene.png', 'assets/images/fa3.png', 'assets/images/FNAE-Map-layout.png', 
        'assets/images/enemyep1.png', 'assets/images/ep1.png', 'assets/images/ep4.png', 
        'assets/images/enemyep4.png', 'assets/images/scaryhawk.png', 'assets/images/scaryhawking.png', 
        'assets/images/scaryep.png', 'assets/images/scarytrump.png', 'assets/images/star.png', 
        'assets/images/winscreen.png', 'assets/images/goldenstephen.png'
    ];
    
    const soundPaths = [
        'assets/sounds/music.ogg', 'assets/sounds/music3.ogg', 'assets/sounds/Static_sound.ogg',
        'assets/sounds/vents.ogg', 'assets/sounds/jumpcare.ogg', 'assets/sounds/Blip.ogg',
        'assets/sounds/winmusic.ogg', 'assets/sounds/chimes.ogg', 'assets/sounds/Crank1.ogg',
        'assets/sounds/Crank2.ogg', 'assets/sounds/goldenstephenscare.ogg'
    ];
    
    totalAssets = imagePaths.length + soundPaths.length;
    loadedAssets = 0;
    
    const imagePromises = imagePaths.map(path => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => { loadedAssets++; updatePreloadProgress((loadedAssets / totalAssets) * 100); resolve(); };
            img.onerror = () => { loadedAssets++; updatePreloadProgress((loadedAssets / totalAssets) * 100); resolve(); };
            img.src = basePath + path;
        });
    });
    
    const audioPromises = soundPaths.map(path => {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.addEventListener('canplaythrough', () => { loadedAssets++; updatePreloadProgress((loadedAssets / totalAssets) * 100); resolve(); }, { once: true });
            audio.addEventListener('error', () => { loadedAssets++; updatePreloadProgress((loadedAssets / totalAssets) * 100); resolve(); }, { once: true });
            audio.src = basePath + path;
            audio.load();
        });
    });
    
    await Promise.all([...imagePromises, ...audioPromises]);
    updatePreloadProgress(100);
    await new Promise(resolve => setTimeout(resolve, 500));
}

function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.classList.add('fade-out');
        setTimeout(() => { preloader.style.display = 'none'; }, 500);
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    disableBrowserDefaults();
    await preloadGameAssets();
    
    if (typeof preloadBackgrounds === 'function') {
        preloadBackgrounds();
    }
    
    hidePreloader();
    
    game = new Game();
    window.game = game; // Expose game to multiplayer
    staticNoise = new StaticNoise();
    
    game.updateContinueButton();
    
    const mainMenu = document.getElementById('main-menu');
    const urlParams = new URLSearchParams(window.location.search);
    const autostart = urlParams.get('autostart');
    
    const menuMusic = document.getElementById('menu-music');
    if (menuMusic) {
        menuMusic.volume = 0.5;
        if (autostart === '1') {
            menuMusic.play().catch(e => setupManualPlayback());
        } else {
            setupManualPlayback();
        }
        
        function setupManualPlayback() {
            const playMusic = () => {
                if (mainMenu && !mainMenu.classList.contains('hidden')) {
                    menuMusic.play().catch(e => {});
                }
                document.removeEventListener('click', playMusic);
                document.removeEventListener('keydown', playMusic);
            };
            document.addEventListener('click', playMusic);
            document.addEventListener('keydown', playMusic);
        }
    }
    
    const observer = new MutationObserver(() => {
        if (mainMenu && !mainMenu.classList.contains('hidden') && typeof startScaryFaceFlicker === 'function') {
            startScaryFaceFlicker();
            staticNoise.start();
        } else {
            if (typeof stopScaryFaceFlicker === 'function') stopScaryFaceFlicker();
            staticNoise.stop();
        }
    });
    
    if (mainMenu) {
        observer.observe(mainMenu, { attributes: true, attributeFilter: ['class'] });
        if (!mainMenu.classList.contains('hidden') && typeof startScaryFaceFlicker === 'function') {
            startScaryFaceFlicker();
            staticNoise.start();
        }
    }
});

window.addEventListener('message', (event) => {
    if (event.data.type === 'USER_CLICKED_PLAY') {
        const menuMusic = document.getElementById('menu-music');
        if (menuMusic) {
            menuMusic.volume = 0.5;
            menuMusic.play().catch(e => {});
        }
    }
});