/**
 * UNIVERSITY NOTES - CUSTOM APP STORE CLIENT SCRIPT
 * Dynamically fetches published release metadata from Firebase Firestore,
 * renders download buttons, SHA-256 checksums, release history, QR codes,
 * categorized release notes badges, DevTools protection, and secret admin triggers.
 */

// Firebase Configuration for Store Client
const firebaseConfig = {
    apiKey: "AIzaSyDoZ4oNDkJstIJYbBawEkCiTpxDYVUWQMk",
    authDomain: "university-notes-app.firebaseapp.com",
    projectId: "university-notes-app",
    storageBucket: "university-notes-app.firebasestorage.app",
    messagingSenderId: "858829691206",
    appId: "1:858829691206:android:685bb6273899da7cb9ad47"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Global Store State
let latestRelease = null;
let secretTapCount = 0;
let secretTapTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    setupDevToolsProtection();
    initStore();
    setupSecretKeyboardShortcut();
});

/**
 * F12 DevTools Protection & Security Warning Banner
 */
function setupDevToolsProtection() {
    console.clear();
    console.log("%c⛔ STOP!", "color: #EF4444; font-size: 40px; font-weight: 900; -webkit-text-stroke: 1px black;");
    console.log(
        "%cTHIS IS A RESTRICTED SECURITY CONSOLE!\nIf someone told you to copy-paste code here, it is 100% a scam.\nPasting code into this console can compromise your account or session.\n\nUniversity Notes Platform Security Active © 2026",
        "color: #F59E0B; font-size: 14px; font-weight: bold; font-family: monospace;"
    );

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    document.addEventListener('keydown', (e) => {
        if (
            e.key === 'F12' ||
            ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
            ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u'))
        ) {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
                return; // Allow secret admin entrance shortcut
            }
            e.preventDefault();
            console.clear();
            return false;
        }
    });

    setInterval(() => {
        console.clear();
    }, 5000);
}

async function initStore() {
    try {
        await fetchLatestRelease();
        await fetchReleaseHistory();
    } catch (err) {
        console.error("Error initializing store:", err);
    }
}

/**
 * Fetch the latest published release and update policy
 */
async function fetchLatestRelease() {
    try {
        const policyDoc = await db.collection("settings").doc("update_policy").get();
        let policyData = policyDoc.exists ? policyDoc.data() : null;

        const snapshot = await db.collection("app_releases")
            .where("status", "==", "published")
            .orderBy("versionCode", "desc")
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const releaseDoc = snapshot.docs[0];
            latestRelease = { id: releaseDoc.id, ...releaseDoc.data() };
        } else if (policyData) {
            latestRelease = {
                versionCode: policyData.latestVersionCode || 1,
                versionName: policyData.latestVersionName || "1.0",
                apkUrl: policyData.downloadUrl || "",
                sha256Checksum: policyData.sha256Checksum || "",
                releaseNotes: policyData.releaseNotes || "Initial release",
                fileSizeBytes: 28000000
            };
        }

        if (latestRelease) {
            renderStoreHeader(latestRelease);
        }
    } catch (error) {
        console.warn("Could not load dynamic release from Firestore, using fallback defaults:", error);
    }
}

/**
 * Render dynamic Store header elements on index.html
 */
function renderStoreHeader(release) {
    // Version Badge
    const badgeEl = document.getElementById("store-version-badge");
    if (badgeEl) {
        badgeEl.textContent = `v${release.versionName || '1.0'} (${release.versionCode || 1})`;
        badgeEl.classList.remove("hidden");
    }

    // Size Label
    const sizeEl = document.getElementById("store-apk-size");
    if (sizeEl) {
        const sizeMb = release.fileSizeBytes
            ? (release.fileSizeBytes / (1024 * 1024)).toFixed(1) + " MB"
            : "28.5 MB";
        sizeEl.textContent = sizeMb;
    }

    // Download Button Target
    const downloadLink = document.getElementById("main-apk-download-btn");
    if (downloadLink && release.apkUrl) {
        downloadLink.href = release.apkUrl;
        downloadLink.onclick = () => logDownloadEvent(release.versionCode || 1);
    }

    // SHA-256 Fingerprint Display
    const shaEl = document.getElementById("store-sha256-text");
    if (shaEl && release.sha256Checksum) {
        shaEl.textContent = release.sha256Checksum;
    }

    // Categorized Release Notes
    const notesEl = document.getElementById("store-release-notes");
    if (notesEl && release.releaseNotes) {
        notesEl.innerHTML = formatCategorizedNotes(release.releaseNotes);
    }

    // QR Code Generation
    generateQRCode(release.apkUrl || window.location.href);
}

/**
 * Format release notes text into color-coded category pills
 */
function formatCategorizedNotes(text) {
    if (!text) return '';
    let formatted = text;

    formatted = formatted.replace(/✨ New Feature:/g, '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 mr-1">✨ New Feature</span>');
    formatted = formatted.replace(/🐛 Bug Fix:/g, '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 mr-1">🐛 Bug Fix</span>');
    formatted = formatted.replace(/⚡ Performance:/g, '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mr-1">⚡ Performance</span>');
    formatted = formatted.replace(/🔒 Security:/g, '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 mr-1">🔒 Security</span>');

    return formatted.replace(/\n/g, '<br>');
}

/**
 * Fetch and render historical releases list
 */
async function fetchReleaseHistory() {
    const historyContainer = document.getElementById("release-history-container");
    if (!historyContainer) return;

    try {
        const snapshot = await db.collection("app_releases")
            .where("status", "==", "published")
            .orderBy("versionCode", "desc")
            .get();

        if (snapshot.empty) {
            historyContainer.innerHTML = `<p class="text-slate-500 text-sm italic">No previous releases logged.</p>`;
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const rel = doc.data();
            const dateStr = rel.publishedAt ? new Date(rel.publishedAt.seconds * 1000).toLocaleDateString() : 'Recent';
            const mb = rel.fileSizeBytes ? (rel.fileSizeBytes / (1024 * 1024)).toFixed(1) + ' MB' : '';

            html += `
                <div class="p-5 glass-card rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3 border border-white/10">
                    <div>
                        <div class="flex items-center space-x-3 mb-2">
                            <span class="font-bold text-white text-lg">v${rel.versionName || rel.versionCode}</span>
                            <span class="px-2.5 py-0.5 text-xs bg-primary/20 text-primary border border-primary/30 rounded-full font-semibold">Build ${rel.versionCode}</span>
                            <span class="text-xs text-slate-400">${dateStr}</span>
                        </div>
                        <div class="text-sm text-slate-300 leading-relaxed">${formatCategorizedNotes(rel.releaseNotes || 'General stability and performance enhancements.')}</div>
                        ${rel.sha256Checksum ? `<p class="text-[11px] font-mono text-slate-500 mt-2 truncate max-w-md">SHA-256: ${rel.sha256Checksum}</p>` : ''}
                    </div>
                    ${rel.apkUrl ? `
                        <a href="${rel.apkUrl}" download class="px-4 py-2.5 bg-slate-800 hover:bg-primary text-white text-xs font-semibold rounded-xl border border-white/10 transition-all text-center self-start md:self-auto flex items-center space-x-2 shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            <span>Download (${mb})</span>
                        </a>
                    ` : ''}
                </div>
            `;
        });
        historyContainer.innerHTML = html;
    } catch (e) {
        console.warn("Could not load release history:", e);
    }
}

/**
 * Generate QR code using Google Chart API or fallback
 */
function generateQRCode(url) {
    const qrImg = document.getElementById("store-qr-code-img");
    if (qrImg) {
        const encodedUrl = encodeURIComponent(url);
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedUrl}`;
    }
}

/**
 * Log download analytics event
 */
async function logDownloadEvent(versionCode) {
    try {
        await db.collection("distribution_analytics").add({
            eventType: "download_start",
            versionCode: versionCode,
            userAgent: navigator.userAgent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.log("Analytics log skipped:", e);
    }
}

function copySHA256() {
    const text = document.getElementById("store-sha256-text")?.textContent;
    if (text) {
        navigator.clipboard.writeText(text).then(() => {
            alert("SHA-256 Checksum copied to clipboard!");
        });
    }
}

function openInstallAssistant() {
    document.getElementById("install-assistant-modal")?.classList.remove("hidden");
}

function closeInstallAssistant() {
    document.getElementById("install-assistant-modal")?.classList.add("hidden");
}

/**
 * SECRET ADMIN ENTRANCE TRIGGERS
 */
function handleSecretAdminTap() {
    secretTapCount++;
    clearTimeout(secretTapTimer);

    if (secretTapCount >= 5) {
        secretTapCount = 0;
        window.location.href = "admin.html";
    } else {
        secretTapTimer = setTimeout(() => {
            secretTapCount = 0;
        }, 3000);
    }
}

function setupSecretKeyboardShortcut() {
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
            e.preventDefault();
            window.location.href = "admin.html";
        }
    });
}
