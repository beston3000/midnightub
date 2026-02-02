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
    .core-auth-content { width: 400px; padding: 40px; background: rgba(10, 15, 30, 0.95); border: 1px solid #00f3ff; box-shadow: 0 0 40px rgba(0, 243, 255, 0.15); text-align: center; position: relative; display: flex; flex-direction: column; gap: 15px; font-family: 'Rajdhani', sans-serif; }
    
    /* Elements */
    .core-auth-view { display: none; }
    .core-auth-view.active { display: block; animation: coreFadeIn 0.3s ease; }
    .core-h2 { font-family: 'Orbitron', sans-serif; color: #00f3ff; margin: 0 0 20px; letter-spacing: 2px; text-transform: uppercase; font-size: 24px; }
    .core-input { width: 100%; background: rgba(0, 0, 0, 0.4); border: 1px solid #627c85; color: #00f3ff; font-family: 'Space Grotesk', sans-serif; font-size: 16px; padding: 12px 15px; outline: none; margin-bottom: 10px; transition: 0.3s; box-sizing: border-box; }
    .core-input:focus { border-color: #00f3ff; background: rgba(0, 243, 255, 0.05); box-shadow: 0 0 15px rgba(0, 243, 255, 0.1); }
    
    /* Buttons */
    .core-btn { width: 100%; padding: 12px; border: none; font-family: 'Orbitron', sans-serif; font-weight: bold; cursor: pointer; text-transform: uppercase; transition: 0.3s; margin-bottom: 10px; }
    .core-btn-primary { background: #00f3ff; color: #000; }
    .core-btn-primary:hover { box-shadow: 0 0 20px #00f3ff; color: #fff; }
    .core-btn-secondary { background: transparent; border: 1px solid #00f3ff; color: #00f3ff; }
    .core-btn-secondary:hover { background: rgba(0, 243, 255, 0.1); }
    .core-btn-text { background: none; color: #627c85; font-size: 12px; margin-top: 10px; border: none; cursor: pointer; text-decoration: underline; }
    
    .core-error { color: #ff2a2a; font-size: 12px; margin-top: 15px; min-height: 18px; text-transform: uppercase; font-weight: bold; }
    .core-pending-icon { font-size: 40px; color: #bc13fe; margin-bottom: 20px; display: block; }
    
    /* System Message */
    .core-sys-msg { color: #bc13fe; font-size: 13px; font-weight: bold; margin-bottom: 20px; border: 1px solid #bc13fe; padding: 10px; background: rgba(188, 19, 254, 0.1); line-height: 1.4; text-shadow: 0 0 5px rgba(188, 19, 254, 0.5); }

    @keyframes coreFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`;

// --- 3. INJECT HTML ---
function injectUI() {
    // Inject CSS
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Inject HTML Overlay
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
                <div style="background:rgba(255,255,255,0.05); padding:10px; margin-top:10px; color:#00f3ff; font-family:monospace;" id="corePendingUid">...</div>
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

    // Inject Admin Button (Hammer) into Nav
    setTimeout(() => {
        const nav = document.querySelector('.nav');
        if (nav && !document.getElementById('adminBtn')) {
            const link = document.createElement('a');
            link.href = 'admin.html';
            link.className = 'nav-link';
            link.id = 'adminBtn';
            link.style.display = 'none'; // Hidden by default
            link.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>';
            nav.appendChild(link);
        }
    }, 100);

    // Bind Button Events
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
        
        // 1. Create Auth Account First (Gives permission to read DB)
        const cred = await createUserWithEmailAndPassword(auth, getEmail(u), p);
        const uid = cred.user.uid;

        // 2. Check for Existing Username in Firestore
        // (Now possible because we are authenticated)
        const q = query(collection(db, "users"), where("username", "==", u));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            // Username exists -> Rollback Auth
            await deleteUser(cred.user);
            err.textContent = "USERNAME TAKEN";
            return;
        }

        // 3. Create Firestore Document
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
// Run immediately
injectUI();

// Monitor Auth State
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
                    // SUCCESS
                    document.body.classList.remove('logged-out');
                    overlay.classList.add('hidden');
                    
                    if (role === 'admin' && adminBtn) {
                        adminBtn.style.display = 'flex';
                    }
                } else if (role === 'banned') {
                    document.body.classList.add('logged-out');
                    overlay.classList.remove('hidden');
                    window.showCoreView('viewBanned');
                } else {
                    // Unapproved
                    document.body.classList.add('logged-out');
                    overlay.classList.remove('hidden');
                    document.getElementById('corePendingUid').textContent = "ID: " + user.uid;
                    window.showCoreView('viewPending');
                }
            } else {
                // Auth exists but no Doc (Orphaned)
                // Treat as pending so they can ask an admin to fix it, or just to prevent error loops.
                console.error("No user doc found for " + user.uid);
                document.body.classList.add('logged-out');
                overlay.classList.remove('hidden');
                document.getElementById('corePendingUid').textContent = "NO DATA: " + user.uid;
                window.showCoreView('viewPending');
            }
        } catch (e) {
            console.error("Permission/Network Error:", e);
        }
    } else {
        // Logged Out
        document.body.classList.add('logged-out');
        overlay.classList.remove('hidden');
        if(adminBtn) adminBtn.style.display = 'none';
        window.showCoreView('viewLanding');
    }
});