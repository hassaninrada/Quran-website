document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    console.log("Quran App v3 Initializing...");
    // --- State Management ---
    const state = {
        currentSurah: 1,
        darkMode: localStorage.getItem('theme') === 'dark',
        surahList: [],
        quranData: {}, // Cache for Surah details
        isSignup: true
    };

    // --- DOM Elements ---
    const themeToggle = document.getElementById('themeToggle');
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    const surahListEl = document.getElementById('surahList');
    const quranContainer = document.getElementById('quranContainer');
    const currentSurahNameEl = document.getElementById('currentSurahName');
    const globalSearch = document.getElementById('globalSearch');
    const surahSearch = document.getElementById('surahSearch');

    // Auth Elements
    const authBtn = document.getElementById('authBtn');
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const authFooterText = document.getElementById('authFooterText');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const surahSidebar = document.querySelector('.surah-sidebar');

    // --- Mobile Sidebar Toggle ---
    if (mobileMenuBtn && surahSidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            surahSidebar.classList.toggle('open');
            const icon = mobileMenuBtn.querySelector('i');
            if (surahSidebar.classList.contains('open')) {
                icon.setAttribute('data-lucide', 'x');
            } else {
                icon.setAttribute('data-lucide', 'menu');
            }
            lucide.createIcons();
        });
    }

    // --- Theme Handling ---
    function updateTheme() {
        if (state.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    }
    updateTheme();

    themeToggle.addEventListener('click', () => {
        state.darkMode = !state.darkMode;
        updateTheme();
    });

    // --- Navigation ---
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Strict Login Check
            if (!localStorage.getItem('user')) {
                navigateTo('auth');
                return;
            }

            navButtons.forEach(b => b.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const pageId = btn.dataset.page;
            const targetPage = document.getElementById(pageId === 'home' ? 'homePage' : (pageId === 'read-quran' ? 'readPage' : 'trackerPage'));
            if (targetPage) targetPage.classList.add('active');
        });
    });

    window.navigateTo = (pageId) => {
        // Strict Login Check for programmatic navigation
        if (pageId !== 'auth' && !localStorage.getItem('user')) {
            pageId = 'auth';
        }

        if (pageId === 'auth') {
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById('authPage').classList.add('active');
            navButtons.forEach(b => b.classList.remove('active'));
            return;
        }

        const btn = document.querySelector(`.nav-btn[data-page="${pageId}"]`);
        if (btn) btn.click();

        // Update stats when entering tracker
        if (pageId === 'tracker') updateTrackerUI();

        // Auto-load Surah if Reading page is empty
        if (pageId === 'read-quran') {
            const container = document.getElementById('quranContainer');
            // Check if loading or empty
            if (!container.innerHTML.includes('ayah-card')) {
                const lastSurah = state.currentSurah || 1;
                const surahObj = state.surahList.find(s => s.number == lastSurah);
                const name = surahObj ? surahObj.englishName : "Al-Fatiha";
                loadSurah(lastSurah, name);
            }
        }
    };

    window.handleGetStarted = () => {
        const user = localStorage.getItem('user');
        if (user) {
            // User is logged in, go to reading
            navigateTo('read-quran');
        } else {
            // User is not logged in, go to Sign Up
            state.isSignup = true;
            renderAuthForm();
            navigateTo('auth');

            // Optional: Scroll to top of auth form
            document.querySelector('.auth-card').scrollIntoView({ behavior: 'smooth' });
        }
    };

    // --- Database Helper ---
    function getDB() {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            return firebase.firestore();
        }
        return null;
    }

    // --- Tracker Logic ---
    function updateTrackerUI() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const streak = user.streak || 0;
        const readCount = user.readAyahs ? user.readAyahs.length : 0;

        document.getElementById('streakValue').textContent = streak;
        document.getElementById('ayahsReadValue').textContent = readCount;
    }

    window.markAsRead = (ayahKey) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            alert("Please sign in to track progress.");
            return;
        }

        user.readAyahs = user.readAyahs || [];
        if (!user.readAyahs.includes(ayahKey)) {
            user.readAyahs.push(ayahKey);

            // Simple streak logic (if read today)
            const today = new Date().toDateString();
            if (user.lastReadDate !== today) {
                user.streak = (user.streak || 0) + 1;
                user.lastReadDate = today;
            }

            localStorage.setItem('user', JSON.stringify(user));

            // SYNC TO DB
            const db = getDB();
            if (db && user.email) {
                // Use email as ID (sanitized) or just a hash. For demo simplicity:
                const docId = user.email.replace(/\./g, '_');
                db.collection('users').doc(docId).set({
                    readAyahs: user.readAyahs,
                    streak: user.streak,
                    lastReadDate: user.lastReadDate,
                    username: user.username
                }, { merge: true });
            }

            alert("Marked as read! Streak updated.");

            // Visual feedback
            const btn = document.querySelector(`button[data-ayah="${ayahKey}"]`);
            if (btn) {
                btn.classList.add('completed');
                btn.innerHTML = '<i data-lucide="check"></i> Read';
                lucide.createIcons();
            }
        }
    };

    // ... (Import logic remains existing) ...

    // --- Bookmarks Logic ---
    window.toggleBookmark = (ayahKey) => {
        let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        if (bookmarks.includes(ayahKey)) {
            bookmarks = bookmarks.filter(k => k !== ayahKey);
            alert("Bookmark removed.");
        } else {
            bookmarks.push(ayahKey);
            alert("Ayah bookmarked!");
        }
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));

        // SYNC TO DB
        const user = JSON.parse(localStorage.getItem('user'));
        const db = getDB();
        if (db && user && user.email) {
            const docId = user.email.replace(/\./g, '_');
            db.collection('users').doc(docId).update({
                bookmarks: bookmarks
            }).catch(err => console.log("DB Update Error", err));
        }

        // Update Icon
        const btn = document.querySelector(`button[data-bookmark="${ayahKey}"]`);
        if (btn) {
            btn.classList.toggle('active');
            lucide.createIcons();
        }
    }

    // --- Data Fetching ---
    // (Existing fetchSurahList... note that we need to keep context)

    // --- Data Parsing (Import) ---
    const importText = document.getElementById('importText');
    const processImportBtn = document.getElementById('processImportBtn');
    const importResult = document.getElementById('importResult');

    if (processImportBtn && importText && importResult) {
        processImportBtn.addEventListener('click', () => {
            const text = importText.value;
            if (!text) return;

            const lines = text.split('\n');
            let importedCount = 0;
            const customData = {};

            lines.forEach(line => {
                const parts = line.split('|');
                if (parts.length >= 3) {
                    const surahNum = parts[0].trim();
                    const ayahNum = parts[1].trim();
                    const ayahText = parts.slice(2).join('|').trim();

                    if (!customData[surahNum]) {
                        customData[surahNum] = {
                            number: surahNum,
                            name: `Surah ${surahNum} (Custom)`,
                            englishName: `Custom Surah ${surahNum}`,
                            ayahs: []
                        };
                    }

                    customData[surahNum].ayahs.push({
                        number: ayahNum,
                        text: ayahText,
                        audio: null
                    });
                    importedCount++;
                }
            });

            if (importedCount > 0) {
                state.customData = customData;
                localStorage.setItem('customData', JSON.stringify(customData));
                const customSurahs = Object.values(customData);
                importResult.textContent = `Successfully imported ${importedCount} Ayahs from ${customSurahs.length} Surahs.`;
                importResult.className = 'import-result success';
                fetchSurahList();
            } else {
                importResult.textContent = "Invalid format. Use: Surah|Ayah|Text";
                importResult.className = 'import-result error';
            }
        });
    }

    // --- Data Fetching ---
    async function fetchSurahList() {
        // Load custom data first
        const storedCustom = localStorage.getItem('customData');
        if (storedCustom) {
            state.customData = JSON.parse(storedCustom);
        }

        try {
            surahListEl.innerHTML = '<li class="loading-item">Fetching Surahs...</li>';

            // USE HTTPS
            const response = await fetch('https://api.alquran.cloud/v1/surah');
            const data = await response.json();

            if (data.code === 200) {
                state.surahList = data.data;

                if (state.customData) {
                    Object.values(state.customData).forEach(cSurah => {
                        const existing = state.surahList.find(s => s.number == cSurah.number);
                        if (existing) {
                            existing.hasCustom = true;
                        } else {
                            state.surahList.push(cSurah);
                        }
                    });
                }

                renderSurahList(state.surahList);
            }
        } catch (error) {
            console.error('Error fetching surahs:', error);
            surahListEl.innerHTML = '<li class="error-item">Failed to load. <br> <small>If using file://, CORS might block this.</small></li>';
        }
    }

    function renderSurahList(surahs) {
        surahListEl.innerHTML = '';
        surahs.forEach(surah => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${surah.number}. ${surah.englishName}</span>
                <span class="arabic-font">${surah.name}</span>
            `;
            li.onclick = () => {
                navigateTo('read-quran');
                loadSurah(surah.number, surah.englishName);
                // Close sidebar on mobile after selection
                if (surahSidebar) surahSidebar.classList.remove('open');
                if (mobileMenuBtn) {
                    const icon = mobileMenuBtn.querySelector('i');
                    if (icon) icon.setAttribute('data-lucide', 'menu');
                    lucide.createIcons();
                }
            };
            surahListEl.appendChild(li);
        });
    }

    async function loadSurah(number, name) {
        state.currentSurah = number;
        currentSurahNameEl.textContent = name;
        quranContainer.innerHTML = '<div class="loading-spinner">Loading Ayahs...</div>';

        // CHECK CUSTOM DATA FIRST
        if (state.customData && state.customData[number]) {
            // ... (Custom data logic remains same)
            const cSurah = state.customData[number];
            let html = '<div class="custom-notice">Showing Custom Imported Data</div>';
            cSurah.ayahs.forEach((ayah, index) => {
                html += `
                <div class="ayah-card fade-in-up" style="animation-delay: ${index * 0.05}s">
                    <div class="arabic-text">${ayah.text}</div>
                    <div class="ayah-actions">
                        <button class="icon-btn" onclick="startVoiceCheck('${ayah.text.replace(/'/g, "\\'")}', this)"><i data-lucide="mic"></i> Check Recitation</button>
                    </div>
                </div>
               `;
            });
            quranContainer.innerHTML = html;
            lucide.createIcons();
            return;
        }

        try {
            // USE HTTPS
            const response = await fetch(`https://api.alquran.cloud/v1/surah/${number}/editions/quran-uthmani,en.asad,ur.jalandhry`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // const data = await response.json(); // Removed duplicate

            if (data.code === 200) {
                renderAyahs(data.data, number);
            } else {
                throw new Error(data.status || 'API Error');
            }
        } catch (error) {
            console.error('Error loading surah:', error);
            let msg = `Failed to load content: ${error.message}.`;
            if (window.location.protocol === 'file:') {
                msg += " <br><b>NOTE:</b> You are running this file directly. Browsers often block API requests from 'file://'. Please use a local server (e.g., 'python -m http.server' or VS Code Live Server) or deploy to Firebase.";
            }
            quranContainer.innerHTML = `<div class="error-msg">${msg}</div>`;
        }
    }

    function renderAyahs(editions, surahNumber) {
        const arabic = editions[0].ayahs;
        const english = editions[1].ayahs;
        const urdu = editions[2].ayahs;

        let html = '';
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');

        arabic.forEach((ayah, index) => {
            const ayahKey = `${surahNumber}:${ayah.numberInSurah}`;
            const isBookmarked = bookmarks.includes(ayahKey);

            html += `
                <div class="ayah-card fade-in-up" id="ayah-${ayah.number}" style="animation-delay: ${index * 0.05}s">
                    <div class="arabic-text">${ayah.text}</div>
                    <div class="urdu-text">${urdu[index].text}</div>
                    <div class="translation-text">${english[index].text}</div>
                    <div class="ayah-actions">
                        <button class="icon-btn" onclick="playAudio(${ayah.number}, 'ayah-${ayah.number}')"><i data-lucide="play"></i></button>
                        <button class="icon-btn" onclick="startVoiceCheck('${ayah.text.replace(/'/g, "\\'")}', this)"><i data-lucide="mic"></i> Check</button>
                        <button class="icon-btn ${isBookmarked ? 'active' : ''}" data-bookmark="${ayahKey}" onclick="toggleBookmark('${ayahKey}')">
                            <i data-lucide="bookmark"></i>
                        </button>
                        <button class="secondary-btn small-btn" data-ayah="${ayahKey}" onclick="markAsRead('${ayahKey}')">
                            <i data-lucide="check-circle"></i> Mark Read
                        </button>
                    </div>
                </div>
            `;
        });
        quranContainer.innerHTML = html;
        lucide.createIcons();

        // Restore read state visual
        checkReadState();
    }

    function checkReadState() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.readAyahs) {
            user.readAyahs.forEach(ayahKey => {
                const btn = document.querySelector(`button[data-ayah="${ayahKey}"]`);
                if (btn) {
                    btn.classList.add('completed');
                    btn.innerHTML = '<i data-lucide="check"></i> Read';
                }
            });
            lucide.createIcons();
        }
    }

    // --- Audio Playback ---
    window.playAudio = (ayahNumber, elementId) => {
        // Remove previous highlight
        document.querySelectorAll('.ayah-card').forEach(card => card.classList.remove('playing'));

        const card = document.getElementById(elementId);
        if (card) card.classList.add('playing');

        const audioUrl = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${ayahNumber}.mp3`;
        const audio = new Audio(audioUrl);

        audio.onended = () => {
            if (card) card.classList.remove('playing');
        };

        audio.play().catch(err => {
            console.error("Audio Playback Error:", err);
            if (card) card.classList.remove('playing');
        });
    };

    // --- Search ---
    surahSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = state.surahList.filter(s =>
            s.englishName.toLowerCase().includes(term) ||
            String(s.number).includes(term)
        );
        renderSurahList(filtered);
    });

    globalSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value;
            if (!isNaN(query) && query > 0 && query <= 114) {
                const surah = state.surahList.find(s => s.number == query);
                if (surah) {
                    navigateTo('read-quran');
                    loadSurah(surah.number, surah.englishName);
                }
            } else {
                alert('Please search by Surah Number (1-114).');
            }
        }
    });

    // --- Auth Logic ---
    function renderAuthForm() {
        authForm.innerHTML = '';

        if (state.isSignup) {
            // Signup Form
            authTitle.textContent = "Create Account";
            authFooterText.textContent = "Already have an account?";
            toggleAuthMode.textContent = "Login";

            authForm.innerHTML = `
                <div class="input-group">
                    <label for="username">Username</label>
                    <div class="input-wrapper">
                        <i data-lucide="user"></i>
                        <input type="text" id="username" placeholder="Enter your name" required>
                    </div>
                </div>
                <div class="input-group">
                    <label for="email">Email</label>
                    <div class="input-wrapper">
                        <i data-lucide="mail"></i>
                        <input type="email" id="email" placeholder="hello@example.com" required>
                    </div>
                </div>
                <div class="input-group">
                    <label for="password">Password</label>
                    <div class="input-wrapper">
                        <i data-lucide="lock"></i>
                        <input type="password" id="password" placeholder="••••••••" required>
                    </div>
                </div>
                <button type="submit" class="primary-btn full-width">Sign Up</button>
            `;
        } else {
            // Login Form
            authTitle.textContent = "Welcome Back";
            authFooterText.textContent = "Don't have an account?";
            toggleAuthMode.textContent = "Create Account";

            authForm.innerHTML = `
                <div class="input-group">
                    <label for="email">Email</label>
                    <div class="input-wrapper">
                        <i data-lucide="mail"></i>
                        <input type="email" id="email" placeholder="hello@example.com" required>
                    </div>
                </div>
                <div class="input-group">
                    <label for="password">Password</label>
                    <div class="input-wrapper">
                        <i data-lucide="lock"></i>
                        <input type="password" id="password" placeholder="••••••••" required>
                    </div>
                </div>
                <button type="submit" class="primary-btn full-width">Login</button>
            `;
        }
        lucide.createIcons();
    }

    // Check Login State
    function checkUserSession() {
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            authBtn.textContent = userData.username;
            authBtn.onclick = () => {
                if (confirm("Log out?")) {
                    localStorage.removeItem('user');
                    window.location.reload();
                }
            };
        } else {
            // FORCE AUTH PAGE ON LOAD
            authBtn.textContent = "Sign In";
            // Hide main nav content initially
            pages.forEach(p => p.classList.remove('active'));
            navigateTo('auth');

            authBtn.onclick = () => {
                renderAuthForm();
                navigateTo('auth');
            };
        }
    }

    toggleAuthMode.addEventListener('click', (e) => {
        e.preventDefault();
        state.isSignup = !state.isSignup;
        renderAuthForm();
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Basic Validation
        if (password.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        try {
            let userCredential;
            let username = email.split('@')[0];

            if (state.isSignup) {
                const usernameInput = document.getElementById('username');
                if (usernameInput) username = usernameInput.value;

                // Real Firebase Sign Up
                userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);

                // Update Profile with Username
                if (userCredential.user) {
                    await userCredential.user.updateProfile({
                        displayName: username
                    });
                }
            } else {
                // Real Firebase Login
                userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            }

            const user = userCredential.user;

            // Sync to Local App State
            const appUser = {
                username: user.displayName || username,
                email: user.email,
                uid: user.uid,
                streak: 0
            };

            // Save to LocalStorage (as cache)
            localStorage.setItem('user', JSON.stringify(appUser));

            // Sync User to DB (Firestore)
            const db = getDB();
            if (db) {
                const docRef = db.collection('users').doc(appUser.email.replace(/\./g, '_'));
                const doc = await docRef.get();
                if (!doc.exists) {
                    await docRef.set(appUser);
                } else {
                    // Update local from DB
                    const data = doc.data();
                    localStorage.setItem('user', JSON.stringify({ ...appUser, ...data }));
                }
            }

            alert(state.isSignup ? "Account created successfully!" : "Logged in successfully!");
            navigateTo('home');
            checkUserSession();

        } catch (error) {
            console.error(error);
            let msg = error.message;
            if (error.code === 'auth/email-already-in-use') msg = "That email is already registered. Please login.";
            if (error.code === 'auth/wrong-password') msg = "Invalid password.";
            alert(`Authentication Failed: ${msg}`);
        }
    });

    // --- Voice Check (Enhanced) ---
    window.startVoiceCheck = (expectedText, btnElement) => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Speech recognition not supported. Try Chrome.");
            return;
        }

        const btn = btnElement || event.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="mic-2"></i> Listening...';
        btn.classList.add('listening');

        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'ar-SA';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.start();

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const similarity = calculateSimilarity(transcript, expectedText);
            const percentage = Math.round(similarity * 100);

            btn.innerHTML = originalText;
            btn.classList.remove('listening');

            let feedbackMsg = "";

            // Logic for Surah Fatiha Unlock
            // In a real app, strict mode applies to specific Ayahs or whole Surah
            // Here, if they pass ANY Ayah of Surah 1 with >80%, we count it as "Progress"
            // For demo, we'll just say if they pass the check, they unlock.

            if (percentage >= 80) {
                feedbackMsg = `MashaAllah! Excellent (${percentage}%).`;
                // Mark Fatiha as read if we are in Surah 1
                if (state.currentSurah === 1) {
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    const today = new Date().toDateString();
                    if (user.lastFatihaDate !== today) {
                        user.lastFatihaDate = today;
                        localStorage.setItem('user', JSON.stringify(user));
                        feedbackMsg += "\n\nDAILY UNLOCK SUCCESSFUL! Apps Unblocked.";
                        // Confetti effect or sound could go here
                    }
                }
            } else {
                feedbackMsg = `Keep practicing (${percentage}%).`;
            }

            alert(`You said: "${transcript}"\n\n${feedbackMsg}`);
        };

        recognition.onerror = () => {
            btn.innerHTML = originalText;
            btn.classList.remove('listening');
            alert("Error recognizing speech.");
        };
    };

    function calculateSimilarity(s1, s2) {
        let longer = s1;
        let shorter = s2;
        if (s1.length < s2.length) { longer = s2; shorter = s1; }
        const longerLength = longer.length;
        if (longerLength === 0) return 1.0;
        return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
    }

    function editDistance(s1, s2) {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
        const costs = new Array();
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) costs[j] = j;
                else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }

    // --- Bookmarks Logic ---
    window.toggleBookmark = (ayahKey) => {
        let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        const btn = document.querySelector(`button[data-bookmark="${ayahKey}"]`);

        if (bookmarks.includes(ayahKey)) {
            bookmarks = bookmarks.filter(k => k !== ayahKey);
            if (btn) btn.classList.remove('active');
        } else {
            bookmarks.push(ayahKey);
            if (btn) btn.classList.add('active');
        }
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));

        // SYNC TO DB
        const user = JSON.parse(localStorage.getItem('user'));
        const db = getDB();
        if (db && user && user.email) {
            const docId = user.email.replace(/\./g, '_');
            db.collection('users').doc(docId).update({
                bookmarks: bookmarks
            }).catch(err => console.log("DB Update Error", err));
        }

        lucide.createIcons();
    }

    // --- Loading & Strict Mode ---
    window.addEventListener('load', () => {
        // Loading Screen Animation
        const loader = document.getElementById('loadingScreen');
        const fill = document.querySelector('.progress-fill');

        if (fill) fill.style.width = "100%";
        setTimeout(() => {
            if (loader) loader.classList.add('hidden');
            checkStrictMode();
        }, 1000);
    });

    // Fail-safe: Hide loader after 5 seconds regardless of load event
    setTimeout(() => {
        const loader = document.getElementById('loadingScreen');
        if (loader && !loader.classList.contains('hidden')) {
            console.log("Loading screen fail-safe triggered");
            loader.classList.add('hidden');
        }
    }, 5000);

    function checkStrictMode() {
        const user = JSON.parse(localStorage.getItem('user') || 'null');

        if (user) {
            const today = new Date().toDateString();

            // Check if all 7 Ayahs of Surah Al-Fatiha (1:1 to 1:7) are read
            const fatihaAyahs = ["1:1", "1:2", "1:3", "1:4", "1:5", "1:6", "1:7"];
            const readAyahs = user.readAyahs || [];
            const hasCompletedFatihaToday = fatihaAyahs.every(key => readAyahs.includes(key)) && user.lastFatihaDate === today;

            if (!hasCompletedFatihaToday) {
                const modal = document.getElementById('strictModal');
                const btn = document.getElementById('startUnlockBtn');

                modal.classList.remove('hidden');

                btn.onclick = () => {
                    modal.classList.add('hidden');
                    navigateTo('read-quran');
                    loadSurah(1, "Al-Fatiha");
                };
            }
        }
    }

    // --- Real Google Auth (Firebase) ---
    // Note: User MUST provide their own firebaseConfig in a separate file or update this object

    // Check if Firebase is available (loaded from CDN in HTML)
    const googleBtn = document.getElementById('googleBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            if (typeof firebase === 'undefined') {
                alert("Firebase SDK not loaded. Check internet.");
                return;
            }

            const provider = new firebase.auth.GoogleAuthProvider();

            try {
                const result = await firebase.auth().signInWithPopup(provider);
                const user = result.user;
                const db = getDB();

                let appUser = {
                    username: user.displayName,
                    email: user.email,
                    photo: user.photoURL,
                    streak: 0,
                    readAyahs: []
                };

                // Fetch existing data if any
                if (db) {
                    try {
                        const docId = user.email.replace(/\./g, '_');
                        const doc = await db.collection('users').doc(docId).get();
                        if (doc.exists) {
                            const data = doc.data();
                            appUser = { ...appUser, ...data }; // Merge DB data
                            if (data.bookmarks) {
                                localStorage.setItem('bookmarks', JSON.stringify(data.bookmarks));
                            }
                        }
                    } catch (dbError) {
                        console.warn("Firestore fetch failed (offline mode):", dbError);
                        // Continue with basic login
                    }
                }

                localStorage.setItem('user', JSON.stringify(appUser));
                alert(`Welcome, ${user.displayName}! Syncing your progress...`);
                window.location.reload();

            } catch (error) {
                console.error(error);
                alert(`Login Failed: ${error.message}`);
            }
        });
    }

    // Init
    checkUserSession();
    fetchSurahList();
});
