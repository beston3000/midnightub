import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- 1. CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyCbQWX-i8aW_wOsxamVR4tF_ndtOZ6ARIc",
    authDomain: "midnight-ub.firebaseapp.com",
    projectId: "midnight-ub",
    storageBucket: "midnight-ub.firebasestorage.app",
    messagingSenderId: "251456556509",
    appId: "1:251456556509:web:e2dd5d8e79a64adb877a34",
    measurementId: "G-FSK7MXJX21"
};
const EMAIL_DOMAIN = "@website.com";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Export for other scripts to use
export { app, db, auth, serverTimestamp };

// --- 2. INJECT STYLES ---
const styles = `
    /* Auth Overlay */
    #authOverlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; display: flex; align-items: center; justify-content: center; background: rgba(3, 5, 8, 0.95); backdrop-filter: blur(10px); transition: opacity 0.5s; }
    #authOverlay.hidden { opacity: 0; pointer-events: none; }
    
    /* Auth Card */
    .core-auth-content { width: 400px; padding: 40px; background: rgba(10, 15, 30, 0.95); border: 1px solid var(--accent-primary); box-shadow: 0 0 20px var(--accent-primary); text-align: center; position: relative; display: flex; flex-direction: column; gap: 15px; font-family: 'Rajdhani', sans-serif; }
    
    /* Elements */
    .core-auth-view { display: none; }
    .core-auth-view.active { display: block; animation: coreFadeIn 0.3s ease; }
    .core-h2 { font-family: 'Orbitron', sans-serif; color: var(--accent-primary); margin: 0 0 20px; letter-spacing: 2px; text-transform: uppercase; font-size: 24px; }
    .core-input { width: 100%; background: rgba(0, 0, 0, 0.4); border: 1px solid #627c85; color: var(--accent-primary); font-family: 'Space Grotesk', sans-serif; font-size: 16px; padding: 12px 15px; outline: none; margin-bottom: 10px; transition: 0.3s; box-sizing: border-box; }
    .core-input:focus { border-color: var(--accent-primary); background: rgba(0, 0, 0, 0.6); box-shadow: 0 0 15px var(--accent-primary); }
    
    /* Buttons */
    .core-btn { width: 100%; padding: 12px; border: none; font-family: 'Orbitron', sans-serif; font-weight: bold; cursor: pointer; text-transform: uppercase; transition: 0.3s; margin-bottom: 10px; }
    .core-btn-primary { background: var(--accent-primary); color: #000; }
    .core-btn-primary:hover { box-shadow: 0 0 20px var(--accent-primary); color: #fff; }
    .core-btn-secondary { background: transparent; border: 1px solid var(--accent-primary); color: var(--accent-primary); }
    .core-btn-secondary:hover { background: rgba(0, 0, 0, 0.3); }
    .core-btn-text { background: none; color: #627c85; font-size: 12px; margin-top: 10px; border: none; cursor: pointer; text-decoration: underline; }
    
    .core-error { color: #ff2a2a; font-size: 12px; margin-top: 15px; min-height: 18px; text-transform: uppercase; font-weight: bold; }
    .core-pending-icon { font-size: 40px; color: var(--accent-secondary); margin-bottom: 20px; display: block; }
    
    /* System Message */
    .core-sys-msg { color: var(--accent-secondary); font-size: 13px; font-weight: bold; margin-bottom: 20px; border: 1px solid var(--accent-secondary); padding: 10px; background: rgba(0,0,0,0.5); line-height: 1.4; text-shadow: 0 0 5px var(--accent-secondary); }

    @keyframes coreFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`;

// --- 3. INJECT HTML ---
function injectUI() {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    const overlay = document.createElement("div");
    overlay.id = "authOverlay";
    overlay.innerHTML = `
        <div class="core-auth-content">
            <div id="viewLanding" class="core-auth-view active">
                <h2 class="core-h2">System Access</h2>
                <div class="core-sys-msg">
                    ⚠️ SYSTEM RESET: JAN 29, 2026<br>
                    ALL PREVIOUS ACCOUNTS PURGED.<br>
                    PLEASE REGISTER A NEW IDENTITY.
                </div>
                <button id="btnShowLogin" class="core-btn core-btn-primary">Sign In</button>
                <button id="btnShowRegister" class="core-btn core-btn-secondary">Create Account</button>
            </div>

            <div id="viewLogin" class="core-auth-view">
                <h2 class="core-h2">Identity Verify</h2>
                <input type="text" id="coreLoginUser" class="core-input" placeholder="USERNAME" autocomplete="off">
                <input type="password" id="coreLoginPass" class="core-input" placeholder="PASSWORD">
                <button id="coreBtnLogin" class="core-btn core-btn-primary">Connect</button>
                <button class="core-btn core-btn-text" onclick="window.showCoreView('viewLanding')">Cancel</button>
                <div class="core-error" id="coreLoginError"></div>
            </div>

            <div id="viewRegister" class="core-auth-view">
                <h2 class="core-h2">New Identity</h2>
                <input type="text" id="coreRegUser" class="core-input" placeholder="USERNAME (LOGIN)" autocomplete="off">
                <input type="text" id="coreRegDisplay" class="core-input" placeholder="REAL NAME (REQUIRED)" autocomplete="off">
                <p style="color:#627c85; font-size:11px; margin:-5px 0 15px;">* Real name required for verification</p>
                <input type="password" id="coreRegPass" class="core-input" placeholder="PASSWORD">
                <button id="coreBtnRegister" class="core-btn core-btn-primary">Initialize</button>
                <button class="core-btn core-btn-text" onclick="window.showCoreView('viewLanding')">Cancel</button>
                <div class="core-error" id="coreRegError"></div>
            </div>

            <div id="viewPending" class="core-auth-view">
                <h2 class="core-h2">Access Pending</h2>
                <div class="core-pending-icon">⏳</div>
                <p style="color:#627c85; font-size:14px;">Identity verified. Awaiting Admin approval.</p>
                <div style="background:rgba(255,255,255,0.05); padding:10px; margin-top:10px; color:var(--accent-primary); font-family:monospace;" id="corePendingUid">...</div>
                <button class="core-btn core-btn-secondary" style="margin-top:20px;" onclick="location.reload()">Check Status</button>
                <button class="core-btn core-btn-text" onclick="window.doCoreLogout()">Disconnect</button>
            </div>

            <div id="viewBanned" class="core-auth-view">
                <h2 class="core-h2" style="color:#ff2a2a;">ACCESS DENIED</h2>
                <div class="core-pending-icon" style="color:#ff2a2a;">🚫</div>
                <p style="color:#627c85;">Account permanently suspended.</p>
                <button class="core-btn core-btn-secondary" onclick="location.reload()">Re-Sync</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    setTimeout(() => {
        const nav = document.querySelector('.nav');
        if (nav && !document.getElementById('adminBtn')) {
            const link = document.createElement('a');
            link.href = 'admin.html';
            link.className = 'nav-link';
            link.id = 'adminBtn';
            link.style.display = 'none'; 
            link.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>';
            nav.appendChild(link);
        }
    }, 100);

    document.getElementById('btnShowLogin').onclick = () => window.showCoreView('viewLogin');
    document.getElementById('btnShowRegister').onclick = () => window.showCoreView('viewRegister');
    document.getElementById('coreBtnLogin').onclick = doLogin;
    document.getElementById('coreBtnRegister').onclick = doRegister;
}

// --- 4. LOGIC ---
window.showCoreView = (id) => {
    document.querySelectorAll('.core-auth-view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

window.doCoreLogout = () => {
    signOut(auth).then(() => location.reload());
};

const getEmail = (u) => u.trim() + EMAIL_DOMAIN;

async function doLogin() {
    const err = document.getElementById('coreLoginError');
    err.textContent = "VERIFYING...";
    try {
        await signInWithEmailAndPassword(auth, getEmail(document.getElementById('coreLoginUser').value), document.getElementById('coreLoginPass').value);
    } catch (e) {
        console.error(e);
        err.textContent = "INVALID IDENTITY";
    }
}

async function doRegister() {
    const u = document.getElementById('coreRegUser').value.trim();
    const d = document.getElementById('coreRegDisplay').value.trim();
    const p = document.getElementById('coreRegPass').value;
    const err = document.getElementById('coreRegError');

    if (!u || !d || !p) { err.textContent = "FIELDS MISSING"; return; }

    try {
        err.textContent = "INITIALIZING...";
        const cred = await createUserWithEmailAndPassword(auth, getEmail(u), p);
        const uid = cred.user.uid;

        const q = query(collection(db, "users"), where("username", "==", u));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            await deleteUser(cred.user);
            err.textContent = "USERNAME TAKEN";
            return;
        }

        await setDoc(doc(db, "users", uid), {
            displayName: d,
            username: u,
            createdAt: serverTimestamp(),
            role: 'unapproved'
        });

    } catch (e) {
        console.error(e);
        if(e.code === 'auth/email-already-in-use') {
            err.textContent = "ACCOUNT EXISTS";
        } else {
            err.textContent = "INIT FAILED: " + e.message;
        }
    }
}

// --- 5. INITIALIZATION ---
injectUI();

onAuthStateChanged(auth, async (user) => {
    const overlay = document.getElementById('authOverlay');
    const adminBtn = document.getElementById('adminBtn');

    if (user) {
        const docRef = doc(db, "users", user.uid);
        try {
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const role = data.role;

                if (role === 'user' || role === 'admin') {
                    document.body.classList.remove('logged-out');
                    overlay.classList.add('hidden');
                    
                    // FIX: Setting display to an empty string removes the 'none' 
                    // and allows the CSS 'grid' to perfectly center the icon!
                    if (role === 'admin' && adminBtn) adminBtn.style.display = '';
                    
                } else if (role === 'banned') {
                    document.body.classList.add('logged-out');
                    overlay.classList.remove('hidden');
                    window.showCoreView('viewBanned');
                } else {
                    document.body.classList.add('logged-out');
                    overlay.classList.remove('hidden');
                    document.getElementById('corePendingUid').textContent = "ID: " + user.uid;
                    window.showCoreView('viewPending');
                }
            } else {
                document.body.classList.add('logged-out');
                overlay.classList.remove('hidden');
                document.getElementById('corePendingUid').textContent = "NO DATA: " + user.uid;
                window.showCoreView('viewPending');
            }
        } catch (e) { console.error("Permission/Network Error:", e); }
    } else {
        document.body.classList.add('logged-out');
        overlay.classList.remove('hidden');
        if(adminBtn) adminBtn.style.display = 'none';
        window.showCoreView('viewLanding');
    }
});

// --- 6. GLOBAL THEME ENGINE ---
const OS_THEMES = {
    // Original Themes
    midnight: { primary: '#00f3ff', secondary: '#bc13fe' },
    matrix: { primary: '#00ff41', secondary: '#008f11' },
    bloodmoon: { primary: '#ff2a2a', secondary: '#ff8c00' },
    vaporwave: { primary: '#ff00c8', secondary: '#00f3ff' },
    solar: { primary: '#ffd700', secondary: '#ff8c00' },
    frost: { primary: '#ffffff', secondary: '#00f3ff' },
    
    // New Themes
    camden: { primary: '#ff9ebd', secondary: '#4a2511' },    // Camden Crispy Bacon (Pink/Brown)
    cyberpunk: { primary: '#fcee0a', secondary: '#ff003c' }, // Yellow/Red
    dracula: { primary: '#ff79c6', secondary: '#bd93f9' },   // Pink/Purple
    ocean: { primary: '#00b4d8', secondary: '#03045e' },     // Cyan/Deep Blue
    forest: { primary: '#aacc00', secondary: '#2d6a4f' },    // Lime/Forest Green
    outrun: { primary: '#ea00d9', secondary: '#711c91' },    // Neon Pink/Deep Purple
    gold: { primary: '#ffb703', secondary: '#fb8500' },      // Gold/Orange
    monochrome: { primary: '#ffffff', secondary: '#666666' },// White/Grey
    toxic: { primary: '#ccff00', secondary: '#00ff00' },     // Highlighter Yellow/Green
    sunset: { primary: '#ff7f50', secondary: '#6a0572' }     // Coral/Deep Violet
};

window.applyMidnightTheme = function(themeName, preventBroadcast = false) {
    const theme = OS_THEMES[themeName] || OS_THEMES.midnight;
    
    // Set the CSS variables globally on the document root
    document.documentElement.style.setProperty('--accent-primary', theme.primary);
    document.documentElement.style.setProperty('--accent-secondary', theme.secondary);
    localStorage.setItem('midnight_theme', themeName);

    // Break the infinite loop!
    if (preventBroadcast) return;

    // Cross-Frame Synchronization
    if (window.top !== window.self) {
        // We are an app. Tell the main OS window to update.
        try { window.top.applyMidnightTheme(themeName, false); } catch(e){}
    } else {
        // We are the OS window. Tell all apps to update AND force them to stay quiet.
        document.querySelectorAll('iframe').forEach(ifr => {
            try { ifr.contentWindow.applyMidnightTheme(themeName, true); } catch(e){}
        });
    }
};

// Auto-initialize theme on load (preventBroadcast = true stops network chatter)
window.applyMidnightTheme(localStorage.getItem('midnight_theme') || 'midnight', true);