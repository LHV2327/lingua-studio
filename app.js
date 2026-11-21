// ==========================================================================
// LinguaStudio Pro 2.0 — Core Interactive Application Logic
// ==========================================================================

(function () {
  'use strict';

  // Firebase Realtime Database Configuration
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDummyKeyForCompatClientSetupOnly",
    authDomain: "linguastudio-3b453.firebaseapp.com",
    databaseURL: "https://linguastudio-3b453-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "linguastudio-3b453",
    storageBucket: "linguastudio-3b453.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
  };

  // Target Languages Configuration for Scalable Selector
  const LANGUAGES = (typeof window !== 'undefined' && window.LANGUAGES) || [
    { code: 'ja-JP', flag: '🇯🇵', nameVi: 'Tiếng Nhật', nameEn: 'Japanese', native: '日本語' },
    { code: 'en-US', flag: '🇺🇸', nameVi: 'Tiếng Anh', nameEn: 'English', native: 'English' },
    { code: 'ko-KR', flag: '🇰🇷', nameVi: 'Tiếng Hàn', nameEn: 'Korean', native: '한국어' },
    { code: 'zh-CN', flag: '🇨🇳', nameVi: 'Tiếng Trung', nameEn: 'Chinese', native: '中文' }
  ];

  // Resolve Dataset safely from window or globals
  const LANG_DATA = (typeof window !== 'undefined' && (window.LANG_DATA || window.LINGUA_DATA)) ||
                    (typeof LINGUA_DATA !== 'undefined' ? LINGUA_DATA :
                    (typeof LANG_DATA !== 'undefined' ? LANG_DATA : {}));

  // Safe localStorage helper
  function getSafeStorage(key, defaultVal) {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key) || defaultVal;
      }
    } catch (e) {}
    return defaultVal;
  }

  // State Management
  const STATE = {
    uiLang: getSafeStorage('lingua_ui_lang', 'vi'),
    currentLang: getSafeStorage('lingua_selected_lang', 'ja-JP'),
    activeTab: getSafeStorage('lingua_active_tab', 'tab-alphabet'),
    
    // Tab 1 Alphabet
    alphabetCategory: null,
    selectedSoundItem: null,
    soundSearchQuery: '',
    
    // Tab 2 Expressions
    activeExpSubTab: 'phrases', // 'phrases' | 'sentences'
    selectedExpCategory: 'all',
    
    // Tab 3 Lab
    selectedLabIndex: 0,
    ttsSpeed: 1.0,
    isRecording: false,
    recognition: null,
    speechSupported: false,
    audioContext: null,
    analyser: null,
    mediaStream: null,
    waveformAnimId: null,

    // Tab 4 Community (Firebase RTDB)
    rtdb: null,
    rtdbConnected: false,
    currentCommunityRoom: 'ja', // 'ja' | 'en' | 'ko' | 'zh'
    currentPresenceRef: null,
    roomMessageRef: null,
    chatDictationRecognition: null,
    isChatDictating: false,

    // Storage: User Profile, Friends, Weak Spots, Bookmarks
    userProfile: (function () {
      try {
        const stored = localStorage.getItem('lingua_user_profile');
        if (stored) return JSON.parse(stored);
      } catch (e) {}
      const randId = 'user_' + Math.random().toString(36).substring(2, 9);
      const defaultProf = {
        userId: randId,
        nickname: 'Học viên_' + Math.floor(100 + Math.random() * 900),
        avatar: '🐱',
        nativeLang: 'vi',
        targetLang: 'ja'
      };
      localStorage.setItem('lingua_user_profile', JSON.stringify(defaultProf));
      return defaultProf;
    })(),
    friends: JSON.parse(localStorage.getItem('lingua_friends') || '[]'),
    weakSpots: JSON.parse(localStorage.getItem('lingua_weak_spots') || '[]'),
    bookmarks: JSON.parse(localStorage.getItem('lingua_bookmarks') || '[]'),

    // TTS voices
    voicesLoaded: false,
    availableVoices: []
  };

  // DOM Elements Cache
  const DOM = {};

  function cacheDOMElements() {
    // Header & Dropdown
    DOM.appSubtitle = document.getElementById('appSubtitle');
    DOM.langDropdownWrapper = document.getElementById('langDropdownWrapper');
    DOM.langDropdownTrigger = document.getElementById('langDropdownTrigger');
    DOM.triggerFlag = document.getElementById('triggerFlag');
    DOM.triggerName = document.getElementById('triggerName');
    DOM.triggerNative = document.getElementById('triggerNative');
    DOM.langDropdownMenu = document.getElementById('langDropdownMenu');

    DOM.btnOpenFriends = document.getElementById('btnOpenFriends');
    DOM.friendsCountBadge = document.getElementById('friendsCountBadge');
    DOM.btnOpenBookmarks = document.getElementById('btnOpenBookmarks');
    DOM.bookmarkCountBadge = document.getElementById('bookmarkCountBadge');
    DOM.btnOpenWeakSpots = document.getElementById('btnOpenWeakSpots');
    DOM.weakSpotsCountBadge = document.getElementById('weakSpotsCountBadge');
    DOM.localeBtns = document.querySelectorAll('.locale-btn');

    // Navigation Tabs
    DOM.navIndicatorPill = document.getElementById('navIndicatorPill');
    DOM.navTabs = document.querySelectorAll('.nav-tab');
    DOM.tabPanes = document.querySelectorAll('.tab-pane');

    // Tab 1: Alphabet
    DOM.alphabetSubTabs = document.getElementById('alphabetSubTabs');
    DOM.soundSearchInput = document.getElementById('soundSearchInput');
    DOM.soundStatsText = document.getElementById('soundStatsText');
    DOM.soundsGrid = document.getElementById('soundsGrid');

    DOM.inspectorCard = document.getElementById('inspectorCard');
    DOM.inspectorEmptyState = document.getElementById('inspectorEmptyState');
    DOM.inspectorDetail = document.getElementById('inspectorDetail');
    DOM.inspectChar = document.getElementById('inspectChar');
    DOM.inspectRomaji = document.getElementById('inspectRomaji');
    DOM.inspectTitle = document.getElementById('inspectTitle');
    DOM.inspectType = document.getElementById('inspectType');
    DOM.btnToggleBookmark = document.getElementById('btnToggleBookmark');
    DOM.bookmarkIcon = document.getElementById('bookmarkIcon');
    DOM.btnToggleWeakSpot = document.getElementById('btnToggleWeakSpot');
    DOM.weakSpotIcon = document.getElementById('weakSpotIcon');

    DOM.articulatoryVisualizer = document.getElementById('articulatoryVisualizer');
    DOM.vAcousticStatus = document.getElementById('vAcousticStatus');
    DOM.articulationSvg = document.getElementById('articulationSvg');
    DOM.tongueShape = document.getElementById('tongueShape');
    DOM.resonanceAir = document.getElementById('resonanceAir');
    DOM.acousticWave1 = document.getElementById('acousticWave1');
    DOM.acousticWave2 = document.getElementById('acousticWave2');
    DOM.inspectMouthTip = document.getElementById('inspectMouthTip');

    DOM.btnPlayNormal = document.getElementById('btnPlayNormal');
    DOM.btnPlaySlow = document.getElementById('btnPlaySlow');
    DOM.exampleWordsList = document.getElementById('exampleWordsList');
    DOM.btnPracticeThisInLab = document.getElementById('btnPracticeThisInLab');

    // Tab 2: Expressions
    DOM.expSubTabPhrases = document.getElementById('expSubTabPhrases');
    DOM.expSubTabSentences = document.getElementById('expSubTabSentences');
    DOM.phrasesView = document.getElementById('phrasesView');
    DOM.sentencesView = document.getElementById('sentencesView');
    DOM.phrasesList = document.getElementById('phrasesList');
    DOM.situationPills = document.getElementById('situationPills');
    DOM.expressionsList = document.getElementById('expressionsList');

    // Tab 3: Lab
    DOM.labSentenceSelect = document.getElementById('labSentenceSelect');
    DOM.labTargetText = document.getElementById('labTargetText');
    DOM.labTargetPhonetic = document.getElementById('labTargetPhonetic');
    DOM.labTargetMeaning = document.getElementById('labTargetMeaning');
    DOM.btnLabListenNormal = document.getElementById('btnLabListenNormal');
    DOM.btnLabListenSlow = document.getElementById('btnLabListenSlow');

    DOM.micWaveformCanvas = document.getElementById('micWaveformCanvas');
    DOM.btnToggleRecord = document.getElementById('btnToggleRecord');
    DOM.micIconSymbol = document.getElementById('micIconSymbol');
    DOM.micStatusText = document.getElementById('micStatusText');
    DOM.recStatusBanner = document.getElementById('recStatusBanner');
    DOM.recStatusMessage = document.getElementById('recStatusMessage');

    DOM.labFeedbackPanel = document.getElementById('labFeedbackPanel');
    DOM.feedbackPlaceholder = document.getElementById('feedbackPlaceholder');
    DOM.feedbackResults = document.getElementById('feedbackResults');
    DOM.scoreCircleFill = document.getElementById('scoreCircleFill');
    DOM.scoreNumber = document.getElementById('scoreNumber');
    DOM.scoreRatingBadge = document.getElementById('scoreRatingBadge');
    DOM.scoreFeedbackSummary = document.getElementById('scoreFeedbackSummary');
    DOM.recognizedText = document.getElementById('recognizedText');
    DOM.tokenChipsContainer = document.getElementById('tokenChipsContainer');
    DOM.coachingAdviceText = document.getElementById('coachingAdviceText');
    DOM.btnSaveLabWeakSpot = document.getElementById('btnSaveLabWeakSpot');
    DOM.btnNextLabSentence = document.getElementById('btnNextLabSentence');

    // Tab 4: Community
    DOM.rtdbConnectionPill = document.getElementById('rtdbConnectionPill');
    DOM.rtdbStatusText = document.getElementById('rtdbStatusText');
    DOM.totalOnlineCount = document.getElementById('totalOnlineCount');
    DOM.btnEditProfile = document.getElementById('btnEditProfile');
    DOM.currentUserAvatar = document.getElementById('currentUserAvatar');
    DOM.currentUserNickname = document.getElementById('currentUserNickname');
    DOM.currentUserMeta = document.getElementById('currentUserMeta');

    DOM.roomCards = document.querySelectorAll('.room-card');
    DOM.roomCountJa = document.getElementById('roomCount-ja');
    DOM.roomCountEn = document.getElementById('roomCount-en');
    DOM.roomCountKo = document.getElementById('roomCount-ko');
    DOM.roomCountZh = document.getElementById('roomCount-zh');

    DOM.chatRoomFlag = document.getElementById('chatRoomFlag');
    DOM.chatRoomTitle = document.getElementById('chatRoomTitle');
    DOM.chatRoomTopic = document.getElementById('chatRoomTopic');
    DOM.btnToggleOnlineList = document.getElementById('btnToggleOnlineList');
    DOM.chatStream = document.getElementById('chatStream');
    DOM.chatMessageForm = document.getElementById('chatMessageForm');
    DOM.btnVoiceDictate = document.getElementById('btnVoiceDictate');
    DOM.chatTextInput = document.getElementById('chatTextInput');
    DOM.btnSendMessage = document.getElementById('btnSendMessage');

    DOM.onlineUsersSidebar = document.getElementById('onlineUsersSidebar');
    DOM.sidebarRoomCount = document.getElementById('sidebarRoomCount');
    DOM.onlineUsersList = document.getElementById('onlineUsersList');

    // Overlays & Drawers
    DOM.weakSpotsOverlay = document.getElementById('weakSpotsOverlay');
    DOM.btnCloseWeakSpots = document.getElementById('btnCloseWeakSpots');
    DOM.weakSpotsList = document.getElementById('weakSpotsList');
    DOM.btnClearWeakSpots = document.getElementById('btnClearWeakSpots');

    DOM.bookmarksOverlay = document.getElementById('bookmarksOverlay');
    DOM.btnCloseBookmarks = document.getElementById('btnCloseBookmarks');
    DOM.bookmarksList = document.getElementById('bookmarksList');
    DOM.btnClearBookmarks = document.getElementById('btnClearBookmarks');

    DOM.friendsOverlay = document.getElementById('friendsOverlay');
    DOM.btnCloseFriends = document.getElementById('btnCloseFriends');
    DOM.friendsList = document.getElementById('friendsList');

    DOM.profileModalOverlay = document.getElementById('profileModalOverlay');
    DOM.btnCloseProfileModal = document.getElementById('btnCloseProfileModal');
    DOM.profileForm = document.getElementById('profileForm');
    DOM.profileNickname = document.getElementById('profileNickname');
    DOM.avatarSelector = document.getElementById('avatarSelector');
    DOM.profileNativeLang = document.getElementById('profileNativeLang');
    DOM.profileTargetLang = document.getElementById('profileTargetLang');
    DOM.btnCancelProfile = document.getElementById('btnCancelProfile');

    DOM.toastContainer = document.getElementById('toastContainer');
    DOM.ambientCanvas = document.getElementById('ambientCanvas');
  }

  // ==========================================================================
  // Localization System (VI / EN)
  // ==========================================================================

  function setUILanguage(lang) {
    if (lang !== 'vi' && lang !== 'en') lang = 'vi';
    STATE.uiLang = lang;
    localStorage.setItem('lingua_ui_lang', lang);
    document.documentElement.lang = lang;

    // Update switcher buttons
    if (DOM.localeBtns) {
      DOM.localeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.locale === lang);
      });
    }

    const dict = UI_I18N[lang] || UI_I18N.vi;

    // Localize [data-i18n]
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    // Localize [data-i18n-placeholder]
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (dict[key]) {
        el.placeholder = dict[key];
      }
    });

    // Update Dropdown trigger label & options
    updateDropdownTriggerUI();
    renderLangDropdownMenu();

    // Re-render active tab view
    renderActiveTab();
    updateBadges();
    updateUserProfileBadge();
  }

  // ==========================================================================
  // Scalable Language Dropdown Selector
  // ==========================================================================

  function getLanguageInfo(code) {
    return LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
  }

  function updateDropdownTriggerUI() {
    const lang = getLanguageInfo(STATE.currentLang);
    if (!lang) return;
    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;
    const name = STATE.uiLang === 'vi' ? lang.nameVi : lang.nameEn;

    if (DOM.triggerFlag) DOM.triggerFlag.textContent = lang.flag;
    if (DOM.triggerName) DOM.triggerName.textContent = name;
    if (DOM.triggerNative) DOM.triggerNative.textContent = lang.native;
  }

  function renderLangDropdownMenu() {
    if (!DOM.langDropdownMenu) return;
    DOM.langDropdownMenu.innerHTML = '';

    LANGUAGES.forEach(lang => {
      const isActive = lang.code === STATE.currentLang;
      const name = STATE.uiLang === 'vi' ? lang.nameVi : lang.nameEn;

      const itemBtn = document.createElement('button');
      itemBtn.type = 'button';
      itemBtn.className = `lang-menu-item ${isActive ? 'active' : ''}`;
      itemBtn.setAttribute('role', 'option');
      itemBtn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      itemBtn.innerHTML = `
        <div class="menu-item-left">
          <span class="menu-item-flag">${lang.flag}</span>
          <span class="menu-item-name">${name}</span>
        </div>
        <span class="menu-item-native">${lang.native}</span>
      `;

      itemBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectLanguage(lang.code);
      });

      DOM.langDropdownMenu.appendChild(itemBtn);
    });
  }

  function toggleLanguageDropdown(forceOpen) {
    if (!DOM.langDropdownWrapper) return;
    const shouldOpen = forceOpen !== undefined 
      ? forceOpen 
      : !DOM.langDropdownWrapper.classList.contains('open');

    DOM.langDropdownWrapper.classList.toggle('open', shouldOpen);
    DOM.langDropdownTrigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  }

  function selectLanguage(langCode) {
    if (STATE.currentLang === langCode) {
      toggleLanguageDropdown(false);
      return;
    }

    STATE.currentLang = langCode;
    localStorage.setItem('lingua_selected_lang', langCode);

    // Reset sub-category and selection
    STATE.alphabetCategory = null;
    STATE.selectedSoundItem = null;
    STATE.selectedLabIndex = 0;

    updateDropdownTriggerUI();
    renderLangDropdownMenu();
    toggleLanguageDropdown(false);

    // Re-render Tab content
    renderActiveTab();

    // Show toast confirmation
    const lang = getLanguageInfo(langCode);
    const name = STATE.uiLang === 'vi' ? lang.nameVi : lang.nameEn;
    showToast(`${lang.flag} ${STATE.uiLang === 'vi' ? 'Đã chuyển sang' : 'Switched to'} ${name}`);
  }

  // ==========================================================================
  // Web Speech API: Text-to-Speech (TTS) Engine
  // ==========================================================================

  function initTts() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    function populateVoices() {
      STATE.availableVoices = window.speechSynthesis.getVoices();
      STATE.voicesLoaded = STATE.availableVoices.length > 0;
    }

    populateVoices();
    if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }
  }

  function getBestVoiceForLanguage(langCode) {
    if (!STATE.availableVoices.length && 'speechSynthesis' in window) {
      STATE.availableVoices = window.speechSynthesis.getVoices();
    }

    // Exact match
    let voice = STATE.availableVoices.find(v => v.lang === langCode);
    if (voice) return voice;

    // Prefix match (ja, en, ko, zh)
    const prefix = langCode.split('-')[0];
    voice = STATE.availableVoices.find(v => v.lang.toLowerCase().startsWith(prefix));
    return voice || null;
  }

  function speakText(text, langCode, speed = 1.0, onStart = null, onEnd = null) {
    if (!('speechSynthesis' in window)) {
      showToast(STATE.uiLang === 'vi' ? 'Trình duyệt không hỗ trợ Web Speech TTS.' : 'TTS not supported.');
      return;
    }

    window.speechSynthesis.cancel();
    if (!text || !text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode || STATE.currentLang;
    utterance.rate = Math.max(0.5, Math.min(2.0, speed));
    utterance.pitch = 1.0;

    const matchedVoice = getBestVoiceForLanguage(utterance.lang);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      animateArticulation(true);
      if (onStart) onStart();
    };

    utterance.onend = () => {
      animateArticulation(false);
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      animateArticulation(false);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  // ==========================================================================
  // Tab 1: Alphabet & Sound Chart + Animated Articulation Visualizer
  // ==========================================================================

  function renderTabAlphabet() {
    const langData = LANG_DATA[STATE.currentLang];
    if (!langData || !langData.alphabet) return;

    // Render Sub-tabs based on categories present
    renderAlphabetSubTabs(langData.alphabet);

    // Filter items by category & search query
    const activeCategory = STATE.alphabetCategory || Object.keys(langData.alphabet)[0];
    STATE.alphabetCategory = activeCategory;

    const allItems = langData.alphabet[activeCategory] || [];
    const query = (DOM.soundSearchInput && typeof DOM.soundSearchInput.value === 'string' ? DOM.soundSearchInput.value : '').trim().toLowerCase();

    const filteredItems = allItems.filter(item => {
      if (!query) return true;
      const charMatch = (item.char || '').toLowerCase().includes(query);
      const romajiMatch = (item.romaji || '').toLowerCase().includes(query);
      const ipaMatch = (item.ipa || '').toLowerCase().includes(query);
      const meaningVi = (item.meaningVi || '').toLowerCase().includes(query);
      const meaningEn = (item.meaningEn || '').toLowerCase().includes(query);
      return charMatch || romajiMatch || ipaMatch || meaningVi || meaningEn;
    });

    // Update stats text
    if (DOM.soundStatsText) {
      const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;
      DOM.soundStatsText.textContent = `${STATE.uiLang === 'vi' ? 'Hiển thị' : 'Showing'} ${filteredItems.length} ${STATE.uiLang === 'vi' ? 'âm / chữ' : 'sounds'}`;
    }

    // Render grid
    if (!DOM.soundsGrid) return;
    DOM.soundsGrid.innerHTML = '';

    filteredItems.forEach(item => {
      const isSelected = STATE.selectedSoundItem && STATE.selectedSoundItem.char === item.char;
      const card = document.createElement('div');
      card.className = `sound-card ${isSelected ? 'active' : ''}`;
      card.innerHTML = `
        <span class="card-char">${item.char}</span>
        <span class="card-romaji">${item.romaji || ''}</span>
        <span class="card-ipa">${item.ipa ? `/${item.ipa}/` : ''}</span>
      `;

      card.addEventListener('click', () => {
        selectSoundItem(item);
        // Play audio immediately on card click
        speakText(item.char, STATE.currentLang, 1.0);
      });

      DOM.soundsGrid.appendChild(card);
    });

    // Auto-select first item if none selected
    if (!STATE.selectedSoundItem && filteredItems.length > 0) {
      selectSoundItem(filteredItems[0], false);
    } else if (STATE.selectedSoundItem) {
      updateInspectorCard(STATE.selectedSoundItem);
    }
  }

  function renderAlphabetSubTabs(alphabetObj) {
    if (!DOM.alphabetSubTabs) return;
    DOM.alphabetSubTabs.innerHTML = '';

    const categories = Object.keys(alphabetObj);
    if (!STATE.alphabetCategory || !categories.includes(STATE.alphabetCategory)) {
      STATE.alphabetCategory = categories[0];
    }

    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;

    categories.forEach(catKey => {
      const isActive = catKey === STATE.alphabetCategory;
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `subtab-pill ${isActive ? 'active' : ''}`;
      
      // Determine label
      let label = catKey;
      if (catKey === 'a-z') label = dict.subtabAlphabetAZ || 'Bảng chữ cái A–Z';
      else if (catKey === 'vowels') label = dict.vowels || 'Nguyên âm';
      else if (catKey === 'consonants') label = dict.consonants || 'Phụ âm';
      else if (catKey === 'double_consonants') label = dict.doubleConsonants || 'Phụ âm đôi';
      else if (catKey === 'tones') label = dict.tones || 'Thanh điệu';
      else if (catKey === 'initials') label = dict.initials || 'Thanh mẫu';
      else if (catKey === 'finals') label = dict.finals || 'Vận mẫu';
      else if (catKey === 'radicals') label = dict.radicalsAndBasicChars || 'Chữ Hán & Bộ thủ cơ bản';
      else if (catKey === 'hiragana') label = 'Hiragana (ひらがな)';
      else if (catKey === 'katakana') label = 'Katakana (カタカナ)';

      pill.textContent = label;

      pill.addEventListener('click', () => {
        STATE.alphabetCategory = catKey;
        STATE.selectedSoundItem = null;
        renderTabAlphabet();
      });

      DOM.alphabetSubTabs.appendChild(pill);
    });
  }

  function selectSoundItem(item, shouldScroll = false) {
    STATE.selectedSoundItem = item;

    // Highlight card
    document.querySelectorAll('.sound-card').forEach(card => {
      const charEl = card.querySelector('.card-char');
      if (charEl && charEl.textContent === item.char) {
        card.classList.add('active');
        if (shouldScroll) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        card.classList.remove('active');
      }
    });

    updateInspectorCard(item);
  }

  function updateInspectorCard(item) {
    if (!DOM.inspectorDetail || !DOM.inspectorEmptyState) return;

    DOM.inspectorEmptyState.style.display = 'none';
    DOM.inspectorDetail.style.display = 'block';

    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;

    if (DOM.inspectChar) DOM.inspectChar.textContent = item.char;
    if (DOM.inspectRomaji) DOM.inspectRomaji.textContent = item.romaji ? `${item.romaji} ${item.ipa ? `/${item.ipa}/` : ''}` : '';
    if (DOM.inspectTitle) DOM.inspectTitle.textContent = item.char;
    
    // Meaning or Type
    const meaning = STATE.uiLang === 'vi' ? (item.meaningVi || '') : (item.meaningEn || '');
    if (DOM.inspectType) {
      DOM.inspectType.textContent = meaning || (item.ipa ? `IPA: /${item.ipa}/` : (item.romaji || ''));
    }

    // Mouth tip
    const tip = STATE.uiLang === 'vi' ? (item.mouthTipVi || '') : (item.mouthTipEn || '');
    if (DOM.inspectMouthTip) {
      DOM.inspectMouthTip.textContent = tip || (STATE.uiLang === 'vi' ? 'Thả lỏng quai hàm, phát âm rõ ràng và dứt khoát.' : 'Relax your jaw and pronounce clearly.');
    }

    // Example words
    if (DOM.exampleWordsList) {
      DOM.exampleWordsList.innerHTML = '';
      if (item.examples && item.examples.length > 0) {
        item.examples.forEach(ex => {
          const meaningText = STATE.uiLang === 'vi' ? ex.vi : ex.en;
          const wordRow = document.createElement('div');
          wordRow.className = 'example-word-row';
          wordRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:10px; margin-bottom:6px;';
          wordRow.innerHTML = `
            <div>
              <strong style="color:#fff; font-size:1rem;">${ex.word}</strong>
              <span style="color:var(--cyan-light); font-size:0.8rem; margin-left:6px; font-family:var(--font-mono);">${ex.reading || ''}</span>
              <p style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">${meaningText || ''}</p>
            </div>
            <button type="button" class="icon-btn-round" title="${dict.listenNormal || 'Nghe'}">
              <span>▶</span>
            </button>
          `;

          const playBtn = wordRow.querySelector('button');
          playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            speakText(ex.word, STATE.currentLang, 1.0);
          });

          DOM.exampleWordsList.appendChild(wordRow);
        });
      } else {
        DOM.exampleWordsList.innerHTML = `<p style="font-size:0.8rem; color:var(--text-dim);">${STATE.uiLang === 'vi' ? 'Chưa có từ mẫu cho âm này.' : 'No example words available.'}</p>`;
      }
    }

    // Update bookmark & weakspot icons
    const isBookmarked = STATE.bookmarks.some(b => b.char === item.char && b.lang === STATE.currentLang);
    const isWeakSpot = STATE.weakSpots.some(w => w.char === item.char && w.lang === STATE.currentLang);

    if (DOM.btnToggleBookmark) DOM.btnToggleBookmark.classList.toggle('active', isBookmarked);
    if (DOM.btnToggleWeakSpot) DOM.btnToggleWeakSpot.classList.toggle('active', isWeakSpot);
  }

  function animateArticulation(isPlaying) {
    if (!DOM.vAcousticStatus) return;
    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;

    if (isPlaying) {
      DOM.vAcousticStatus.textContent = dict.acousticSpeaking || 'Đang phát âm...';
      DOM.vAcousticStatus.style.color = 'var(--emerald-light)';
      if (DOM.resonanceAir) DOM.resonanceAir.setAttribute('fill', 'rgba(6,182,212,0.6)');
      if (DOM.acousticWave1) DOM.acousticWave1.style.animation = 'waveFlow 1s linear infinite';
    } else {
      DOM.vAcousticStatus.textContent = dict.acousticReady || 'Sẵn sàng';
      DOM.vAcousticStatus.style.color = 'var(--text-dim)';
      if (DOM.resonanceAir) DOM.resonanceAir.setAttribute('fill', 'rgba(6,182,212,0.2)');
      if (DOM.acousticWave1) DOM.acousticWave1.style.animation = 'waveFlow 3s linear infinite';
    }
  }

  // ==========================================================================
  // Tab 2: Giao tiếp bản xứ (Key Phrases vs Full Sentences)
  // ==========================================================================

  function renderTabExpressions() {
    const langData = LANG_DATA[STATE.currentLang];
    if (!langData) return;

    // Toggle subtab views
    const isPhrases = STATE.activeExpSubTab === 'phrases';
    if (DOM.expSubTabPhrases) DOM.expSubTabPhrases.classList.toggle('active', isPhrases);
    if (DOM.expSubTabSentences) DOM.expSubTabSentences.classList.toggle('active', !isPhrases);

    if (DOM.phrasesView) DOM.phrasesView.style.display = isPhrases ? 'block' : 'none';
    if (DOM.sentencesView) DOM.sentencesView.style.display = isPhrases ? 'none' : 'block';

    if (isPhrases) {
      renderKeyPhrases(langData.phrases || []);
    } else {
      renderFullSentences(langData.expressions || []);
    }
  }

  function renderKeyPhrases(phrases) {
    if (!DOM.phrasesList) return;
    DOM.phrasesList.innerHTML = '';

    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;

    phrases.forEach(phrase => {
      const targetText = phrase.target || phrase.text || '';
      const phoneticText = phrase.phonetic || phrase.romaji || '';
      const meaningText = STATE.uiLang === 'vi' 
        ? (phrase.translation_vi || phrase.vi || '') 
        : (phrase.translation_en || phrase.en || '');
      const notesText = STATE.uiLang === 'vi' 
        ? (phrase.usageTip_vi || phrase.notesVi || '') 
        : (phrase.usageTip_en || phrase.notesEn || '');
      const categoryText = STATE.uiLang === 'vi' 
        ? (phrase.situation_vi || phrase.category || 'Cụm từ then chốt') 
        : (phrase.situation_en || phrase.category || 'Key Phrase');

      const card = document.createElement('div');
      card.className = 'phrase-card';
      card.innerHTML = `
        <span class="phrase-badge">${categoryText}</span>
        <div class="phrase-target">${targetText}</div>
        <div class="phrase-phonetic">${phoneticText}</div>
        <div class="phrase-meaning">${meaningText}</div>
        ${notesText ? `<div class="phrase-notes">${notesText}</div>` : ''}
        <div class="phrase-audio-row">
          <button type="button" class="btn-phrase-audio" data-speed="1.0">
            <span>▶ 1.0x</span>
          </button>
          <button type="button" class="btn-phrase-audio" data-speed="0.7">
            <span>🐢 0.7x</span>
          </button>
          <button type="button" class="btn-phrase-lab">
            <span>🎙️ ${dict.drillInLab || 'Luyện trong Lab'}</span>
          </button>
        </div>
      `;

      // 1.0x TTS
      const btn1 = card.querySelector('[data-speed="1.0"]');
      if (btn1) {
        btn1.addEventListener('click', (e) => {
          e.stopPropagation();
          speakText(targetText, STATE.currentLang, 1.0);
        });
      }

      // 0.7x TTS
      const btnSlow = card.querySelector('[data-speed="0.7"]');
      if (btnSlow) {
        btnSlow.addEventListener('click', (e) => {
          e.stopPropagation();
          speakText(targetText, STATE.currentLang, 0.7);
        });
      }

      // Drill in Lab
      const btnLab = card.querySelector('.btn-phrase-lab');
      if (btnLab) {
        btnLab.addEventListener('click', (e) => {
          e.stopPropagation();
          practicePhraseInLab({
            target: targetText,
            phonetic: phoneticText,
            meaningVi: phrase.translation_vi || phrase.vi || '',
            meaningEn: phrase.translation_en || phrase.en || ''
          });
        });
      }

      // 3D Tilt on mouse move
      initCard3DTilt(card);

      DOM.phrasesList.appendChild(card);
    });
  }

  function renderFullSentences(expressions) {
    if (!DOM.situationPills || !DOM.expressionsList) return;
    DOM.situationPills.innerHTML = '';
    DOM.expressionsList.innerHTML = '';

    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;

    // Collect all categories
    const rawCategories = expressions.map(e => {
      return STATE.uiLang === 'vi' ? (e.situation_vi || e.category) : (e.situation_en || e.category);
    }).filter(Boolean);
    const categories = ['all', ...new Set(rawCategories)];

    // Render category filter pills
    categories.forEach(cat => {
      const isActive = cat === STATE.selectedExpCategory;
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `situation-pill ${isActive ? 'active' : ''}`;
      pill.textContent = cat === 'all' ? (dict.allCategories || 'Tất cả') : cat;

      pill.addEventListener('click', () => {
        STATE.selectedExpCategory = cat;
        renderFullSentences(expressions);
      });

      DOM.situationPills.appendChild(pill);
    });

    // Filter expressions
    const filtered = expressions.filter(e => {
      if (STATE.selectedExpCategory === 'all') return true;
      const cat = STATE.uiLang === 'vi' ? (e.situation_vi || e.category) : (e.situation_en || e.category);
      return cat === STATE.selectedExpCategory;
    });

    filtered.forEach(exp => {
      const card = document.createElement('div');
      card.className = 'expression-card';

      const catLabel = STATE.uiLang === 'vi' ? (exp.situation_vi || exp.category || '') : (exp.situation_en || exp.category || '');
      const scenarioText = STATE.uiLang === 'vi' ? (exp.scenario_vi || exp.contextVi || '') : (exp.scenario_en || exp.contextEn || '');
      const culturalNote = STATE.uiLang === 'vi' ? (exp.culturalNote_vi || '') : (exp.culturalNote_en || '');

      // Casual object or string
      const casualText = typeof exp.casual === 'object' ? (exp.casual.text || '') : (exp.casual || '');
      const casualPhonetic = typeof exp.casual === 'object' ? (exp.casual.phonetic || '') : (exp.casualPhonetic || '');
      const casualMeaning = typeof exp.casual === 'object' ? (STATE.uiLang === 'vi' ? exp.casual.translation_vi : exp.casual.translation_en) : (STATE.uiLang === 'vi' ? exp.vi : exp.en);
      const casualTag = typeof exp.casual === 'object' ? (STATE.uiLang === 'vi' ? exp.casual.tag_vi : exp.casual.tag_en) : (dict.casualStreet || 'Bản xứ / Giao tiếp đời thường');

      // Formal / Textbook object or string
      const formalObj = exp.formal || exp.textbook;
      const formalText = typeof formalObj === 'object' ? (formalObj.text || '') : (formalObj || '');
      const formalPhonetic = typeof formalObj === 'object' ? (formalObj.phonetic || '') : (exp.textbookPhonetic || '');
      const formalTag = typeof formalObj === 'object' ? (STATE.uiLang === 'vi' ? formalObj.tag_vi : formalObj.tag_en) : (dict.textbookFormal || 'Sách giáo khoa / Trang trọng');

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span class="phrase-badge">${catLabel}</span>
          ${scenarioText ? `<span style="font-size:0.8rem; color:var(--text-dim);">${scenarioText}</span>` : ''}
        </div>

        <!-- Casual / Slang (Highlighted) -->
        <div style="background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.3); border-radius:12px; padding:12px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:0.72rem; color:var(--primary-light); font-weight:700; text-transform:uppercase;">${casualTag}</div>
            ${casualMeaning ? `<span style="font-size:0.78rem; color:var(--text-muted);">${casualMeaning}</span>` : ''}
          </div>
          <div style="font-size:1.25rem; font-weight:800; color:#fff; margin:4px 0;">${casualText}</div>
          <div style="font-size:0.84rem; color:var(--cyan-light); font-family:var(--font-mono);">${casualPhonetic}</div>
          <div style="display:flex; gap:8px; margin-top:8px;">
            <button type="button" class="btn-phrase-audio btn-casual-1" style="padding:4px 10px; font-size:0.75rem;">▶ 1.0x</button>
            <button type="button" class="btn-phrase-audio btn-casual-slow" style="padding:4px 10px; font-size:0.75rem;">🐢 0.7x</button>
          </div>
        </div>

        <!-- Textbook Formal -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:12px; padding:10px 12px; margin-bottom:10px;">
          <div style="font-size:0.72rem; color:var(--text-dim); font-weight:700;">${formalTag}</div>
          <div style="font-size:1rem; font-weight:600; color:var(--text-main); margin:2px 0;">${formalText}</div>
          <div style="font-size:0.8rem; color:var(--text-muted); font-family:var(--font-mono);">${formalPhonetic}</div>
          <div style="display:flex; gap:8px; margin-top:6px;">
            <button type="button" class="btn-phrase-audio btn-formal-1" style="padding:3px 8px; font-size:0.72rem;">▶ 1.0x</button>
          </div>
        </div>

        ${culturalNote ? `<div style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; padding:8px 12px; background:rgba(245,158,11,0.08); border-left:3px solid var(--amber-light); border-radius:0 8px 8px 0;">💡 <strong>${STATE.uiLang === 'vi' ? 'Ghi chú văn hóa:' : 'Cultural Note:'}</strong> ${culturalNote}</div>` : ''}
      `;

      // Attach audio buttons
      const btn1 = card.querySelector('.btn-casual-1');
      const btnSlow = card.querySelector('.btn-casual-slow');
      const btnFormal = card.querySelector('.btn-formal-1');

      if (btn1) btn1.addEventListener('click', () => speakText(casualText, STATE.currentLang, 1.0));
      if (btnSlow) btnSlow.addEventListener('click', () => speakText(casualText, STATE.currentLang, 0.7));
      if (btnFormal) btnFormal.addEventListener('click', () => speakText(formalText, STATE.currentLang, 1.0));

      initCard3DTilt(card);
      DOM.expressionsList.appendChild(card);
    });
  }

  function practicePhraseInLab(phrase) {
    // Switch to Tab 3
    switchTab('tab-lab');

    // Set custom target text
    if (DOM.labTargetText) DOM.labTargetText.textContent = phrase.target;
    if (DOM.labTargetPhonetic) DOM.labTargetPhonetic.textContent = phrase.phonetic || '';
    if (DOM.labTargetMeaning) DOM.labTargetMeaning.textContent = STATE.uiLang === 'vi' ? phrase.vi : phrase.en;

    showToast(STATE.uiLang === 'vi' ? `Đã nạp cụm từ: "${phrase.target}" vào Lab!` : `Loaded "${phrase.target}" into Lab!`);
  }

  // ==========================================================================
  // Tab 3: Phòng thu phát âm AI & Live Waveform Canvas
  // ==========================================================================

  function renderTabLab() {
    const langData = LANG_DATA[STATE.currentLang];
    if (!langData || !langData.labSentences) return;

    const sentences = langData.labSentences;
    if (!DOM.labSentenceSelect) return;
    DOM.labSentenceSelect.innerHTML = '';

    sentences.forEach((s, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${s.text} (${s.phonetic || ''})`;
      DOM.labSentenceSelect.appendChild(opt);
    });

    if (STATE.selectedLabIndex >= sentences.length) {
      STATE.selectedLabIndex = 0;
    }
    DOM.labSentenceSelect.value = STATE.selectedLabIndex;

    updateLabTargetSentence(sentences[STATE.selectedLabIndex]);
  }

  function updateLabTargetSentence(sentence) {
    if (!sentence) return;
    if (DOM.labTargetText) DOM.labTargetText.textContent = sentence.text;
    if (DOM.labTargetPhonetic) DOM.labTargetPhonetic.textContent = sentence.phonetic || '';
    if (DOM.labTargetMeaning) {
      DOM.labTargetMeaning.textContent = STATE.uiLang === 'vi' ? sentence.vi : sentence.en;
    }

    // Reset feedback placeholder
    if (DOM.feedbackPlaceholder) DOM.feedbackPlaceholder.style.display = 'block';
    if (DOM.feedbackResults) DOM.feedbackResults.style.display = 'none';
  }

  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      STATE.speechSupported = false;
      return;
    }

    STATE.speechSupported = true;
    STATE.recognition = new SpeechRecognition();
    STATE.recognition.continuous = false;
    STATE.recognition.interimResults = false;
    STATE.recognition.maxAlternatives = 1;

    STATE.recognition.onstart = () => {
      STATE.isRecording = true;
      if (DOM.btnToggleRecord) DOM.btnToggleRecord.classList.add('recording');
      if (DOM.micIconSymbol) DOM.micIconSymbol.textContent = '⏹️';
      if (DOM.micStatusText) {
        DOM.micStatusText.textContent = STATE.uiLang === 'vi' ? 'Đang lắng nghe...' : 'Listening...';
      }
      if (DOM.recStatusMessage) {
        DOM.recStatusMessage.textContent = STATE.uiLang === 'vi' ? 'Hãy đọc rõ ràng câu mẫu ở trên!' : 'Speak the sentence clearly!';
      }
      startWaveformVisualizer();
    };

    STATE.recognition.onresult = (event) => {
      if (event.results && event.results.length > 0) {
        const transcript = event.results[0][0].transcript;
        processLabSpokenResult(transcript);
      }
    };

    STATE.recognition.onerror = (event) => {
      stopRecordingUI();
      if (DOM.recStatusMessage) {
        DOM.recStatusMessage.textContent = `${STATE.uiLang === 'vi' ? 'Lỗi mic' : 'Mic error'}: ${event.error}`;
      }
    };

    STATE.recognition.onend = () => {
      stopRecordingUI();
    };
  }

  function toggleLabRecording() {
    if (!STATE.speechSupported) {
      showToast(STATE.uiLang === 'vi' ? 'Trình duyệt chưa hỗ trợ SpeechRecognition. Hãy dùng Chrome/Edge.' : 'SpeechRecognition not supported in this browser.');
      return;
    }

    if (STATE.isRecording) {
      STATE.recognition.stop();
    } else {
      try {
        STATE.recognition.lang = STATE.currentLang;
        STATE.recognition.start();
      } catch (err) {
        console.warn('SpeechRecognition start err:', err);
        STATE.recognition.stop();
      }
    }
  }

  function stopRecordingUI() {
    STATE.isRecording = false;
    if (DOM.btnToggleRecord) DOM.btnToggleRecord.classList.remove('recording');
    if (DOM.micIconSymbol) DOM.micIconSymbol.textContent = '🎙️';
    if (DOM.micStatusText) {
      DOM.micStatusText.textContent = STATE.uiLang === 'vi' ? 'Nhấn để Nói' : 'Press to Speak';
    }
    stopWaveformVisualizer();
  }

  // Live Fluid Waveform Visualizer on Canvas
  function startWaveformVisualizer() {
    const canvas = DOM.micWaveformCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Try Web Audio API if user has mic stream
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        STATE.mediaStream = stream;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        STATE.audioContext = new AudioCtx();
        const source = STATE.audioContext.createMediaStreamSource(stream);
        STATE.analyser = STATE.audioContext.createAnalyser();
        STATE.analyser.fftSize = 256;
        source.connect(STATE.analyser);
        drawAudioWaveform();
      }).catch(() => {
        // Fallback to animated simulated sine waveform
        drawSimulatedWaveform();
      });
    } else {
      drawSimulatedWaveform();
    }
  }

  function drawAudioWaveform() {
    const canvas = DOM.micWaveformCanvas;
    if (!canvas || !STATE.isRecording) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const bufferLength = STATE.analyser ? STATE.analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    function render() {
      if (!STATE.isRecording) return;
      STATE.waveformAnimId = requestAnimationFrame(render);
      if (STATE.analyser) {
        STATE.analyser.getByteTimeDomainData(dataArray);
      }

      ctx.clearRect(0, 0, width, height);

      // Gradient wave stroke
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, '#6366f1');
      grad.addColorStop(0.5, '#06b6d4');
      grad.addColorStop(1, '#10b981');

      ctx.lineWidth = 3;
      ctx.strokeStyle = grad;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }

    render();
  }

  function drawSimulatedWaveform() {
    const canvas = DOM.micWaveformCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let phase = 0;

    function renderSim() {
      if (!STATE.isRecording) return;
      STATE.waveformAnimId = requestAnimationFrame(renderSim);
      phase += 0.12;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 3;
      ctx.strokeStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.beginPath();

      for (let x = 0; x < width; x += 4) {
        const y = height / 2 + Math.sin(x * 0.05 + phase) * 22 * Math.sin(x * 0.02);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    renderSim();
  }

  function stopWaveformVisualizer() {
    if (STATE.waveformAnimId) {
      cancelAnimationFrame(STATE.waveformAnimId);
      STATE.waveformAnimId = null;
    }
    if (STATE.mediaStream) {
      STATE.mediaStream.getTracks().forEach(t => t.stop());
      STATE.mediaStream = null;
    }
    if (STATE.audioContext) {
      STATE.audioContext.close().catch(() => {});
      STATE.audioContext = null;
    }

    // Reset canvas to flat baseline
    const canvas = DOM.micWaveformCanvas;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }
  }

  function processLabSpokenResult(spokenTranscript) {
    const targetText = (DOM.labTargetText ? DOM.labTargetText.textContent : '').trim();
    if (!targetText) return;

    if (DOM.feedbackPlaceholder) DOM.feedbackPlaceholder.style.display = 'none';
    if (DOM.feedbackResults) DOM.feedbackResults.style.display = 'block';

    if (DOM.recognizedText) DOM.recognizedText.textContent = spokenTranscript;

    // Simple Token Matching Score
    const targetNorm = targetText.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'。、！？]/g, '');
    const spokenNorm = spokenTranscript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'。、！？]/g, '');

    const targetTokens = targetNorm.split(/\s+/).filter(Boolean);
    const spokenTokens = spokenNorm.split(/\s+/).filter(Boolean);

    let matchCount = 0;
    if (DOM.tokenChipsContainer) DOM.tokenChipsContainer.innerHTML = '';

    targetTokens.forEach(token => {
      const isMatched = spokenTokens.some(s => s.includes(token) || token.includes(s));
      if (isMatched) matchCount++;

      const chip = document.createElement('span');
      chip.className = `token-chip ${isMatched ? 'correct' : 'imperfect'}`;
      chip.textContent = `${token} ${isMatched ? '✓' : '✗'}`;
      if (DOM.tokenChipsContainer) DOM.tokenChipsContainer.appendChild(chip);
    });

    const score = targetTokens.length > 0 
      ? Math.min(100, Math.round((matchCount / targetTokens.length) * 100))
      : 80;

    // Update Score Circle Fill
    if (DOM.scoreNumber) DOM.scoreNumber.textContent = score;
    if (DOM.scoreCircleFill) {
      const radius = 40;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (score / 100) * circumference;
      DOM.scoreCircleFill.style.strokeDashoffset = offset;
      DOM.scoreCircleFill.style.stroke = score >= 80 ? 'var(--emerald)' : (score >= 50 ? 'var(--amber)' : 'var(--rose)');
    }

    // Rating Badge & Coaching Advice
    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;
    let rating = dict.ratingExcellent || 'Xuất sắc';
    let summary = dict.speechSummaryGreat || 'Phát âm rất tự nhiên và chuẩn xác!';
    let advice = dict.adviceGood || 'Khẩu hình và cao độ của bạn rất tốt. Hãy tiếp tục duy trì!';

    if (score < 80 && score >= 50) {
      rating = dict.ratingGood || 'Khá tốt';
      summary = dict.speechSummaryPass || 'Phát âm cơ bản tốt, cần lưu ý dứt khoát hơn ở phần đuôi câu.';
      advice = dict.adviceNeedsWork || 'Hãy chú ý mở rộng khẩu hình ở các nguyên âm và giữ hơi đều đặn.';
    } else if (score < 50) {
      rating = dict.ratingNeedsWork || 'Cần luyện thêm';
      summary = dict.speechSummaryNeedsWork || 'Chưa nhận diện rõ ràng. Hãy nghe lại bản xứ 0.7x và thử lại.';
      advice = dict.adviceNeedsWork || 'Hãy nói chậm lại và hướng mic gần miệng hơn.';
    }

    if (DOM.scoreRatingBadge) DOM.scoreRatingBadge.textContent = rating;
    if (DOM.scoreFeedbackSummary) DOM.scoreFeedbackSummary.textContent = summary;
    if (DOM.coachingAdviceText) DOM.coachingAdviceText.textContent = advice;

    // Trigger Confetti Burst if score >= 80%
    if (score >= 80) {
      triggerConfettiBurst();
    }
  }

  // ==========================================================================
  // Tab 4: Real-time Online Community (Firebase RTDB)
  // ==========================================================================

  function initCommunityFirebase() {
    try {
      if (typeof firebase === 'undefined' || !firebase) {
        console.warn('Firebase SDK not loaded.');
        if (DOM.rtdbStatusText) {
          DOM.rtdbStatusText.textContent = STATE.uiLang === 'vi' ? 'Chế độ ngoại tuyến (Firebase SDK không khả dụng)' : 'Offline mode (Firebase SDK unavailable)';
        }
        return;
      }

      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }

      STATE.rtdb = firebase.database();

      // Listen to connection status
      const connectedRef = STATE.rtdb.ref('.info/connected');
      connectedRef.on('value', (snap) => {
        const isConnected = !!snap.val();
        STATE.rtdbConnected = isConnected;

        if (DOM.rtdbStatusText) {
          DOM.rtdbStatusText.textContent = isConnected
            ? (STATE.uiLang === 'vi' ? 'Đã kết nối Firebase RTDB' : 'Connected to Firebase RTDB')
            : (STATE.uiLang === 'vi' ? 'Mất kết nối RTDB...' : 'RTDB Disconnected...');
        }

        if (isConnected) {
          setupPresence(STATE.currentCommunityRoom);
        }
      });

      // Setup room listeners
      setupRoomCounts();
      attachRoomChatListener(STATE.currentCommunityRoom);
    } catch (err) {
      console.warn('Firebase RTDB init error:', err);
      STATE.rtdbConnected = false;
      if (DOM.rtdbStatusText) {
        DOM.rtdbStatusText.textContent = STATE.uiLang === 'vi' ? 'Chế độ ngoại tuyến' : 'Offline mode';
      }
    }
  }

  function setupPresence(room) {
    if (!STATE.rtdb || !STATE.userProfile) return;

    // Clean up previous presence
    if (STATE.currentPresenceRef) {
      STATE.currentPresenceRef.remove().catch(() => {});
    }

    const presenceRef = STATE.rtdb.ref(`/presence/${room}/${STATE.userProfile.userId}`);
    STATE.currentPresenceRef = presenceRef;

    const presenceData = {
      userId: STATE.userProfile.userId,
      nickname: STATE.userProfile.nickname,
      avatar: STATE.userProfile.avatar,
      nativeLang: STATE.userProfile.nativeLang,
      targetLang: STATE.userProfile.targetLang,
      onlineAt: firebase.database.ServerValue.TIMESTAMP
    };

    presenceRef.set(presenceData);
    presenceRef.onDisconnect().remove();
  }

  function setupRoomCounts() {
    if (!STATE.rtdb) return;

    const rooms = ['ja', 'en', 'ko', 'zh'];
    let roomCounts = { ja: 0, en: 0, ko: 0, zh: 0 };

    rooms.forEach(r => {
      STATE.rtdb.ref(`/presence/${r}`).on('value', (snap) => {
        const val = snap.val() || {};
        const count = Object.keys(val).length;
        roomCounts[r] = count;

        // Update card count
        const badgeEl = document.getElementById(`roomCount-${r}`);
        if (badgeEl) badgeEl.textContent = `${count} online`;

        // Update total count
        const total = Object.values(roomCounts).reduce((a, b) => a + b, 0);
        if (DOM.totalOnlineCount) DOM.totalOnlineCount.textContent = total;

        // Update online users list if this is active room
        if (r === STATE.currentCommunityRoom) {
          renderOnlineUsersList(val);
        }
      });
    });
  }

  function renderOnlineUsersList(usersMap) {
    if (!DOM.onlineUsersList) return;
    DOM.onlineUsersList.innerHTML = '';

    const users = Object.values(usersMap || {});
    if (DOM.sidebarRoomCount) DOM.sidebarRoomCount.textContent = users.length;

    if (users.length === 0) {
      DOM.onlineUsersList.innerHTML = `<p style="font-size:0.8rem; color:var(--text-dim); text-align:center; padding:16px;">${STATE.uiLang === 'vi' ? 'Chưa có ai khác online.' : 'No one else online right now.'}</p>`;
      return;
    }

    users.forEach(u => {
      const isMe = u.userId === STATE.userProfile.userId;
      const isFriend = STATE.friends.some(f => f.userId === u.userId);

      const item = document.createElement('div');
      item.className = 'online-user-item';
      item.innerHTML = `
        <div class="user-item-left">
          <span class="user-item-avatar">${u.avatar || '👤'}</span>
          <div>
            <div class="user-item-name">${u.nickname} ${isMe ? '<small style="color:var(--primary-light);">(Bạn)</small>' : ''}</div>
            <div class="user-item-meta">Bản xứ: ${(u.nativeLang || 'vi').toUpperCase()} • Học: ${(u.targetLang || 'ja').toUpperCase()}</div>
          </div>
        </div>
        ${!isMe ? `
          <button type="button" class="btn-add-friend ${isFriend ? 'is-friend' : ''}">
            ${isFriend ? '✓ Bạn học' : '+ Kết bạn'}
          </button>
        ` : ''}
      `;

      if (!isMe && !isFriend) {
        const btn = item.querySelector('.btn-add-friend');
        btn.addEventListener('click', () => {
          addFriend(u);
          btn.classList.add('is-friend');
          btn.textContent = '✓ Bạn học';
        });
      }

      DOM.onlineUsersList.appendChild(item);
    });
  }

  function attachRoomChatListener(room) {
    if (!STATE.rtdb || !DOM.chatStream) return;

    if (STATE.roomMessageRef) {
      STATE.roomMessageRef.off();
    }

    DOM.chatStream.innerHTML = '';

    const messagesRef = STATE.rtdb.ref(`/rooms/${room}/messages`).limitToLast(50);
    STATE.roomMessageRef = messagesRef;

    messagesRef.on('child_added', (snap) => {
      const msg = snap.val();
      if (!msg) return;
      renderChatMessageBubble(msg);
    });
  }

  function renderChatMessageBubble(msg) {
    if (!DOM.chatStream) return;

    const isMine = msg.senderId === STATE.userProfile.userId;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isMine ? 'mine' : 'theirs'}`;

    const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    bubble.innerHTML = `
      <div class="bubble-sender-row">
        <span>${msg.avatar || '👤'} ${msg.nickname || 'Learner'}</span>
        <span>•</span>
        <span>${timeStr}</span>
      </div>
      <div class="bubble-text">${escapeHtml(msg.text)}</div>
      <div class="bubble-actions">
        <button type="button" class="btn-bubble-tts" title="Nghe phát âm">🔊</button>
      </div>
    `;

    // TTS button on chat bubble
    const ttsBtn = bubble.querySelector('.btn-bubble-tts');
    ttsBtn.addEventListener('click', () => {
      const langMap = { ja: 'ja-JP', en: 'en-US', ko: 'ko-KR', zh: 'zh-CN' };
      speakText(msg.text, langMap[STATE.currentCommunityRoom] || 'ja-JP', 1.0);
    });

    DOM.chatStream.appendChild(bubble);
    DOM.chatStream.scrollTop = DOM.chatStream.scrollHeight;
  }

  function sendChatMessage() {
    if (!STATE.rtdb || !DOM.chatTextInput) return;
    const text = DOM.chatTextInput.value.trim();
    if (!text) return;

    const messageData = {
      senderId: STATE.userProfile.userId,
      nickname: STATE.userProfile.nickname,
      avatar: STATE.userProfile.avatar,
      text: text,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    STATE.rtdb.ref(`/rooms/${STATE.currentCommunityRoom}/messages`).push(messageData);
    DOM.chatTextInput.value = '';
  }

  function initChatVoiceDictation() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    STATE.chatDictationRecognition = new SpeechRecognition();
    STATE.chatDictationRecognition.continuous = false;
    STATE.chatDictationRecognition.interimResults = false;

    STATE.chatDictationRecognition.onstart = () => {
      STATE.isChatDictating = true;
      if (DOM.btnVoiceDictate) DOM.btnVoiceDictate.classList.add('recording');
      showToast(STATE.uiLang === 'vi' ? 'Đang nghe tin nhắn của bạn...' : 'Listening to your voice...');
    };

    STATE.chatDictationRecognition.onresult = (event) => {
      if (event.results && event.results.length > 0) {
        const text = event.results[0][0].transcript;
        if (DOM.chatTextInput) {
          DOM.chatTextInput.value = (DOM.chatTextInput.value + ' ' + text).trim();
          DOM.chatTextInput.focus();
        }
      }
    };

    STATE.chatDictationRecognition.onerror = () => {
      stopChatDictation();
    };

    STATE.chatDictationRecognition.onend = () => {
      stopChatDictation();
    };
  }

  function toggleChatVoiceDictation() {
    if (!STATE.chatDictationRecognition) {
      showToast(STATE.uiLang === 'vi' ? 'Trình duyệt chưa hỗ trợ nhận diện giọng nói.' : 'Speech recognition not supported.');
      return;
    }

    if (STATE.isChatDictating) {
      STATE.chatDictationRecognition.stop();
    } else {
      const langMap = { ja: 'ja-JP', en: 'en-US', ko: 'ko-KR', zh: 'zh-CN' };
      STATE.chatDictationRecognition.lang = langMap[STATE.currentCommunityRoom] || 'ja-JP';
      STATE.chatDictationRecognition.start();
    }
  }

  function stopChatDictation() {
    STATE.isChatDictating = false;
    if (DOM.btnVoiceDictate) DOM.btnVoiceDictate.classList.remove('recording');
  }

  function selectCommunityRoom(room) {
    if (STATE.currentCommunityRoom === room) return;
    STATE.currentCommunityRoom = room;

    // Update active room card
    if (DOM.roomCards) {
      DOM.roomCards.forEach(card => {
        card.classList.toggle('active', card.dataset.room === room);
      });
    }

    // Update chat header
    const roomInfo = {
      ja: { flag: '🇯🇵', title: 'Phòng Tiếng Nhật (日本語)', topic: 'Luyện phát âm Kana & đàm thoại Tokyo' },
      en: { flag: '🇺🇸', title: 'Phòng Tiếng Anh (English)', topic: 'IPA, ngữ điệu & Slang đường phố Mỹ' },
      ko: { flag: '🇰🇷', title: 'Phòng Tiếng Hàn (한국어)', topic: 'Hangul, âm bật hơi & đàm thoại Seoul' },
      zh: { flag: '🇨🇳', title: 'Phòng Tiếng Trung (中文)', topic: '4 Thanh điệu, Pinyin & Chữ Hán cơ bản' }
    }[room];

    if (roomInfo) {
      if (DOM.chatRoomFlag) DOM.chatRoomFlag.textContent = roomInfo.flag;
      if (DOM.chatRoomTitle) DOM.chatRoomTitle.textContent = roomInfo.title;
      if (DOM.chatRoomTopic) DOM.chatRoomTopic.textContent = roomInfo.topic;
    }

    // Switch presence and messages
    setupPresence(room);
    attachRoomChatListener(room);
  }

  // ==========================================================================
  // User Profile & Friends System
  // ==========================================================================

  function updateUserProfileBadge() {
    const prof = STATE.userProfile;
    if (!prof) return;

    if (DOM.currentUserAvatar) DOM.currentUserAvatar.textContent = prof.avatar || '🐱';
    if (DOM.currentUserNickname) DOM.currentUserNickname.textContent = prof.nickname;
    if (DOM.currentUserMeta) {
      DOM.currentUserMeta.textContent = `${STATE.uiLang === 'vi' ? 'Bản xứ' : 'Native'}: ${prof.nativeLang.toUpperCase()} • ${STATE.uiLang === 'vi' ? 'Học' : 'Learn'}: ${prof.targetLang.toUpperCase()}`;
    }
  }

  function openProfileModal() {
    if (!DOM.profileModalOverlay) return;
    const prof = STATE.userProfile;

    if (DOM.profileNickname) DOM.profileNickname.value = prof.nickname;
    if (DOM.profileNativeLang) DOM.profileNativeLang.value = prof.nativeLang;
    if (DOM.profileTargetLang) DOM.profileTargetLang.value = prof.targetLang;

    // Highlight avatar
    document.querySelectorAll('.avatar-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.avatar === prof.avatar);
    });

    DOM.profileModalOverlay.classList.add('open');
  }

  function closeProfileModal() {
    if (DOM.profileModalOverlay) DOM.profileModalOverlay.classList.remove('open');
  }

  function saveProfileModal(e) {
    if (e) e.preventDefault();
    const nickname = (DOM.profileNickname ? DOM.profileNickname.value : '').trim();
    if (!nickname) return;

    const activeAvatarEl = document.querySelector('.avatar-option.active');
    const avatar = activeAvatarEl ? activeAvatarEl.dataset.avatar : '🐱';
    const nativeLang = DOM.profileNativeLang ? DOM.profileNativeLang.value : 'vi';
    const targetLang = DOM.profileTargetLang ? DOM.profileTargetLang.value : 'ja';

    STATE.userProfile.nickname = nickname;
    STATE.userProfile.avatar = avatar;
    STATE.userProfile.nativeLang = nativeLang;
    STATE.userProfile.targetLang = targetLang;

    localStorage.setItem('lingua_user_profile', JSON.stringify(STATE.userProfile));
    updateUserProfileBadge();
    closeProfileModal();

    // Re-announce presence with updated profile
    setupPresence(STATE.currentCommunityRoom);
    showToast(STATE.uiLang === 'vi' ? 'Đã lưu hồ sơ thành công!' : 'Profile saved successfully!');
  }

  function addFriend(user) {
    if (STATE.friends.some(f => f.userId === user.userId)) return;

    STATE.friends.push({
      userId: user.userId,
      nickname: user.nickname,
      avatar: user.avatar,
      nativeLang: user.nativeLang,
      targetLang: user.targetLang,
      addedAt: Date.now()
    });

    localStorage.setItem('lingua_friends', JSON.stringify(STATE.friends));
    updateBadges();
    triggerConfettiBurst();
    showToast(`${STATE.uiLang === 'vi' ? 'Đã kết bạn với' : 'Added friend'} ${user.nickname}! 🎉`);
  }

  function renderFriendsDrawer() {
    if (!DOM.friendsList) return;
    DOM.friendsList.innerHTML = '';

    if (STATE.friends.length === 0) {
      DOM.friendsList.innerHTML = `<p style="text-align:center; color:var(--text-dim); padding:40px 10px;">${STATE.uiLang === 'vi' ? 'Bạn chưa có bạn học nào. Hãy bấm "+ Kết bạn" trong phòng chat!' : 'No friends added yet. Click "+ Add Friend" in chat!'}</p>`;
      return;
    }

    STATE.friends.forEach((f, idx) => {
      const item = document.createElement('div');
      item.className = 'saved-item-card';
      item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:12px; margin-bottom:8px;';
      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:1.5rem;">${f.avatar || '👤'}</span>
          <div>
            <strong style="color:#fff; font-size:0.9rem;">${f.nickname}</strong>
            <p style="font-size:0.72rem; color:var(--text-dim); margin-top:2px;">Bản xứ: ${(f.nativeLang||'vi').toUpperCase()} • Học: ${(f.targetLang||'ja').toUpperCase()}</p>
          </div>
        </div>
        <button type="button" class="btn-item-delete" style="background:transparent; border:none; color:var(--rose-light); cursor:pointer;">✕</button>
      `;

      item.querySelector('.btn-item-delete').addEventListener('click', () => {
        STATE.friends.splice(idx, 1);
        localStorage.setItem('lingua_friends', JSON.stringify(STATE.friends));
        updateBadges();
        renderFriendsDrawer();
      });

      DOM.friendsList.appendChild(item);
    });
  }

  // ==========================================================================
  // Bookmarks & Weak Spots System
  // ==========================================================================

  function toggleCurrentBookmark() {
    if (!STATE.selectedSoundItem) return;
    const item = STATE.selectedSoundItem;
    const idx = STATE.bookmarks.findIndex(b => b.char === item.char && b.lang === STATE.currentLang);

    if (idx >= 0) {
      STATE.bookmarks.splice(idx, 1);
      showToast(STATE.uiLang === 'vi' ? 'Đã bỏ lưu âm.' : 'Removed from bookmarks.');
    } else {
      STATE.bookmarks.push({
        char: item.char,
        romaji: item.romaji,
        ipa: item.ipa,
        lang: STATE.currentLang,
        savedAt: Date.now()
      });
      showToast(STATE.uiLang === 'vi' ? 'Đã lưu vào Sổ tay! ⭐' : 'Saved to bookmarks! ⭐');
    }

    localStorage.setItem('lingua_bookmarks', JSON.stringify(STATE.bookmarks));
    updateBadges();
    if (DOM.btnToggleBookmark) DOM.btnToggleBookmark.classList.toggle('active', idx < 0);
  }

  function toggleCurrentWeakSpot() {
    if (!STATE.selectedSoundItem) return;
    const item = STATE.selectedSoundItem;
    const idx = STATE.weakSpots.findIndex(w => w.char === item.char && w.lang === STATE.currentLang);

    if (idx >= 0) {
      STATE.weakSpots.splice(idx, 1);
      showToast(STATE.uiLang === 'vi' ? 'Đã bỏ đánh dấu cần sửa.' : 'Removed from weak points.');
    } else {
      STATE.weakSpots.push({
        char: item.char,
        romaji: item.romaji,
        ipa: item.ipa,
        lang: STATE.currentLang,
        savedAt: Date.now()
      });
      showToast(STATE.uiLang === 'vi' ? 'Đã đánh dấu cần luyện lại! 🎯' : 'Marked for practice! 🎯');
    }

    localStorage.setItem('lingua_weak_spots', JSON.stringify(STATE.weakSpots));
    updateBadges();
    if (DOM.btnToggleWeakSpot) DOM.btnToggleWeakSpot.classList.toggle('active', idx < 0);
  }

  function updateBadges() {
    if (DOM.friendsCountBadge) DOM.friendsCountBadge.textContent = STATE.friends.length;
    if (DOM.bookmarkCountBadge) DOM.bookmarkCountBadge.textContent = STATE.bookmarks.length;
    if (DOM.weakSpotsCountBadge) DOM.weakSpotsCountBadge.textContent = STATE.weakSpots.length;
  }

  function renderBookmarksDrawer() {
    if (!DOM.bookmarksList) return;
    DOM.bookmarksList.innerHTML = '';

    if (STATE.bookmarks.length === 0) {
      DOM.bookmarksList.innerHTML = `<p style="text-align:center; color:var(--text-dim); padding:40px 10px;">${STATE.uiLang === 'vi' ? 'Chưa có âm nào được lưu.' : 'No saved bookmarks yet.'}</p>`;
      return;
    }

    STATE.bookmarks.forEach((b, idx) => {
      const item = document.createElement('div');
      item.className = 'saved-item-card';
      item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:12px; margin-bottom:8px;';
      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:1.8rem; font-weight:800; color:#fff;">${b.char}</span>
          <div>
            <strong style="color:var(--primary-light); font-family:var(--font-mono);">${b.romaji || ''} ${b.ipa ? `/${b.ipa}/` : ''}</strong>
            <p style="font-size:0.72rem; color:var(--text-dim); margin-top:2px;">${b.lang}</p>
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn-play-item" style="background:var(--primary); border:none; color:#fff; padding:4px 8px; border-radius:6px; cursor:pointer;">▶</button>
          <button type="button" class="btn-del-item" style="background:transparent; border:none; color:var(--rose-light); cursor:pointer;">✕</button>
        </div>
      `;

      item.querySelector('.btn-play-item').addEventListener('click', () => speakText(b.char, b.lang, 1.0));
      item.querySelector('.btn-del-item').addEventListener('click', () => {
        STATE.bookmarks.splice(idx, 1);
        localStorage.setItem('lingua_bookmarks', JSON.stringify(STATE.bookmarks));
        updateBadges();
        renderBookmarksDrawer();
      });

      DOM.bookmarksList.appendChild(item);
    });
  }

  function renderWeakSpotsDrawer() {
    if (!DOM.weakSpotsList) return;
    DOM.weakSpotsList.innerHTML = '';

    if (STATE.weakSpots.length === 0) {
      DOM.weakSpotsList.innerHTML = `<p style="text-align:center; color:var(--text-dim); padding:40px 10px;">${STATE.uiLang === 'vi' ? 'Không có điểm nào cần sửa. Xuất sắc!' : 'No weak points saved. Great job!'}</p>`;
      return;
    }

    STATE.weakSpots.forEach((w, idx) => {
      const item = document.createElement('div');
      item.className = 'saved-item-card';
      item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:12px; margin-bottom:8px;';
      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:1.8rem; font-weight:800; color:var(--rose-light);">${w.char}</span>
          <div>
            <strong style="color:var(--cyan-light); font-family:var(--font-mono);">${w.romaji || ''} ${w.ipa ? `/${w.ipa}/` : ''}</strong>
            <p style="font-size:0.72rem; color:var(--text-dim); margin-top:2px;">${w.lang}</p>
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn-play-item" style="background:var(--primary); border:none; color:#fff; padding:4px 8px; border-radius:6px; cursor:pointer;">▶</button>
          <button type="button" class="btn-del-item" style="background:transparent; border:none; color:var(--rose-light); cursor:pointer;">✕</button>
        </div>
      `;

      item.querySelector('.btn-play-item').addEventListener('click', () => speakText(w.char, w.lang, 1.0));
      item.querySelector('.btn-del-item').addEventListener('click', () => {
        STATE.weakSpots.splice(idx, 1);
        localStorage.setItem('lingua_weak_spots', JSON.stringify(STATE.weakSpots));
        updateBadges();
        renderWeakSpotsDrawer();
      });

      DOM.weakSpotsList.appendChild(item);
    });
  }

  // ==========================================================================
  // Navigation & Tabs System
  // ==========================================================================

  function switchTab(tabId) {
    STATE.activeTab = tabId;
    localStorage.setItem('lingua_active_tab', tabId);

    // Update Tab Buttons
    if (DOM.navTabs) {
      DOM.navTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
      });
    }

    // Update Tab Panes
    if (DOM.tabPanes) {
      DOM.tabPanes.forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId);
      });
    }

    updateNavIndicator();
    renderActiveTab();
  }

  function updateNavIndicator() {
    if (!DOM.navIndicatorPill) return;
    const activeTabEl = document.querySelector('.nav-tab.active');
    if (!activeTabEl) return;

    DOM.navIndicatorPill.style.left = `${activeTabEl.offsetLeft}px`;
    DOM.navIndicatorPill.style.top = `${activeTabEl.offsetTop}px`;
    DOM.navIndicatorPill.style.width = `${activeTabEl.offsetWidth}px`;
    DOM.navIndicatorPill.style.height = `${activeTabEl.offsetHeight}px`;
  }

  function renderActiveTab() {
    if (STATE.activeTab === 'tab-alphabet') {
      renderTabAlphabet();
    } else if (STATE.activeTab === 'tab-expressions') {
      renderTabExpressions();
    } else if (STATE.activeTab === 'tab-lab') {
      renderTabLab();
    } else if (STATE.activeTab === 'tab-community') {
      // Community tab is reactive via Firebase
      updateUserProfileBadge();
    }
  }

  // ==========================================================================
  // Motion Design: Ambient Canvas, 3D Tilt, Confetti Bursts
  // ==========================================================================

  function initAmbientCanvas() {
    const canvas = DOM.ambientCanvas;
    if (!canvas || typeof canvas.getContext !== 'function') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = Math.min(32, Math.floor(width / 40));

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.4 + 0.1
      });
    }

    function renderAmbient() {
      // Respect prefers-reduced-motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      requestAnimationFrame(renderAmbient);
      ctx.clearRect(0, 0, width, height);

      // Draw subtle particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.fillStyle = `rgba(99, 102, 241, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Subtle connection lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.08 * (1 - dist / 110)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    renderAmbient();
  }

  function initCard3DTilt(card) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      const rotateX = (y / (rect.height / 2)) * -6;
      const rotateY = (x / (rect.width / 2)) * 6;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });
  }

  function triggerConfettiBurst() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; pointer-events:none; z-index:9999;';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const confetti = [];
    const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#f43f5e'];

    for (let i = 0; i < 65; i++) {
      confetti.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        alpha: 1
      });
    }

    let frames = 0;
    function renderConfetti() {
      frames++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      confetti.forEach(c => {
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.35; // gravity
        c.rotation += c.rotationSpeed;
        c.alpha -= 0.015;

        if (c.alpha > 0) {
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate((c.rotation * Math.PI) / 180);
          ctx.fillStyle = c.color;
          ctx.globalAlpha = Math.max(0, c.alpha);
          ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
          ctx.restore();
        }
      });

      if (frames < 70) {
        requestAnimationFrame(renderConfetti);
      } else {
        canvas.remove();
      }
    }

    renderConfetti();
  }

  function showToast(message) {
    if (!DOM.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✨</span><span>${escapeHtml(message)}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // Event Listeners Binding
  // ==========================================================================

  function bindEventListeners() {
    // Language Dropdown Trigger
    if (DOM.langDropdownTrigger) {
      DOM.langDropdownTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLanguageDropdown();
      });
    }

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (DOM.langDropdownWrapper && !DOM.langDropdownWrapper.contains(e.target)) {
        toggleLanguageDropdown(false);
      }
    });

    // Close dropdown on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        toggleLanguageDropdown(false);
        closeProfileModal();
        closeAllDrawers();
      }
    });

    // UI Locale Switcher (VI / EN)
    if (DOM.localeBtns) {
      DOM.localeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          setUILanguage(btn.dataset.locale);
        });
      });
    }

    // Navigation Tabs
    if (DOM.navTabs) {
      DOM.navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          switchTab(tab.dataset.tab);
        });
      });
    }

    window.addEventListener('resize', updateNavIndicator);

    // Tab 1: Alphabet Search & Audio
    if (DOM.soundSearchInput) {
      DOM.soundSearchInput.addEventListener('input', () => {
        renderTabAlphabet();
      });
    }

    if (DOM.btnPlayNormal) {
      DOM.btnPlayNormal.addEventListener('click', () => {
        if (STATE.selectedSoundItem) speakText(STATE.selectedSoundItem.char, STATE.currentLang, 1.0);
      });
    }

    if (DOM.btnPlaySlow) {
      DOM.btnPlaySlow.addEventListener('click', () => {
        if (STATE.selectedSoundItem) speakText(STATE.selectedSoundItem.char, STATE.currentLang, 0.7);
      });
    }

    if (DOM.btnToggleBookmark) {
      DOM.btnToggleBookmark.addEventListener('click', toggleCurrentBookmark);
    }

    if (DOM.btnToggleWeakSpot) {
      DOM.btnToggleWeakSpot.addEventListener('click', toggleCurrentWeakSpot);
    }

    if (DOM.btnPracticeThisInLab) {
      DOM.btnPracticeThisInLab.addEventListener('click', () => {
        if (STATE.selectedSoundItem) {
          switchTab('tab-lab');
          if (DOM.labTargetText) DOM.labTargetText.textContent = STATE.selectedSoundItem.char;
          if (DOM.labTargetPhonetic) DOM.labTargetPhonetic.textContent = STATE.selectedSoundItem.romaji || '';
          if (DOM.labTargetMeaning) DOM.labTargetMeaning.textContent = STATE.selectedSoundItem.char;
        }
      });
    }

    // Tab 2: Expressions Subtabs Switcher
    if (DOM.expSubTabPhrases) {
      DOM.expSubTabPhrases.addEventListener('click', () => {
        STATE.activeExpSubTab = 'phrases';
        renderTabExpressions();
      });
    }

    if (DOM.expSubTabSentences) {
      DOM.expSubTabSentences.addEventListener('click', () => {
        STATE.activeExpSubTab = 'sentences';
        renderTabExpressions();
      });
    }

    // Tab 3: Lab Controls
    if (DOM.labSentenceSelect) {
      DOM.labSentenceSelect.addEventListener('change', (e) => {
        STATE.selectedLabIndex = parseInt(e.target.value, 10) || 0;
        const langData = LANG_DATA[STATE.currentLang];
        if (langData && langData.labSentences) {
          updateLabTargetSentence(langData.labSentences[STATE.selectedLabIndex]);
        }
      });
    }

    if (DOM.btnLabListenNormal) {
      DOM.btnLabListenNormal.addEventListener('click', () => {
        const text = DOM.labTargetText ? DOM.labTargetText.textContent : '';
        speakText(text, STATE.currentLang, 1.0);
      });
    }

    if (DOM.btnLabListenSlow) {
      DOM.btnLabListenSlow.addEventListener('click', () => {
        const text = DOM.labTargetText ? DOM.labTargetText.textContent : '';
        speakText(text, STATE.currentLang, 0.7);
      });
    }

    if (DOM.btnToggleRecord) {
      DOM.btnToggleRecord.addEventListener('click', toggleLabRecording);
    }

    if (DOM.btnSaveLabWeakSpot) {
      DOM.btnSaveLabWeakSpot.addEventListener('click', () => {
        const text = DOM.labTargetText ? DOM.labTargetText.textContent : '';
        if (text) {
          STATE.weakSpots.push({ char: text, romaji: '', ipa: '', lang: STATE.currentLang, savedAt: Date.now() });
          localStorage.setItem('lingua_weak_spots', JSON.stringify(STATE.weakSpots));
          updateBadges();
          showToast(STATE.uiLang === 'vi' ? 'Đã lưu câu vào mục Cần sửa! 🎯' : 'Saved to weak points! 🎯');
        }
      });
    }

    if (DOM.btnNextLabSentence) {
      DOM.btnNextLabSentence.addEventListener('click', () => {
        const langData = LANG_DATA[STATE.currentLang];
        if (langData && langData.labSentences) {
          STATE.selectedLabIndex = (STATE.selectedLabIndex + 1) % langData.labSentences.length;
          if (DOM.labSentenceSelect) DOM.labSentenceSelect.value = STATE.selectedLabIndex;
          updateLabTargetSentence(langData.labSentences[STATE.selectedLabIndex]);
        }
      });
    }

    // Tab 4: Community Controls
    if (DOM.roomCards) {
      DOM.roomCards.forEach(card => {
        card.addEventListener('click', () => {
          selectCommunityRoom(card.dataset.room);
        });
      });
    }

    if (DOM.chatMessageForm) {
      DOM.chatMessageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendChatMessage();
      });
    }

    if (DOM.btnVoiceDictate) {
      DOM.btnVoiceDictate.addEventListener('click', toggleChatVoiceDictation);
    }

    if (DOM.btnEditProfile) {
      DOM.btnEditProfile.addEventListener('click', openProfileModal);
    }

    if (DOM.btnCloseProfileModal) {
      DOM.btnCloseProfileModal.addEventListener('click', closeProfileModal);
    }

    if (DOM.btnCancelProfile) {
      DOM.btnCancelProfile.addEventListener('click', closeProfileModal);
    }

    if (DOM.profileForm) {
      DOM.profileForm.addEventListener('submit', saveProfileModal);
    }

    // Avatar options in Profile Modal
    document.querySelectorAll('.avatar-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Drawers toggle
    if (DOM.btnOpenFriends) {
      DOM.btnOpenFriends.addEventListener('click', () => {
        renderFriendsDrawer();
        if (DOM.friendsOverlay) DOM.friendsOverlay.classList.add('open');
      });
    }
    if (DOM.btnCloseFriends) {
      DOM.btnCloseFriends.addEventListener('click', () => {
        if (DOM.friendsOverlay) DOM.friendsOverlay.classList.remove('open');
      });
    }

    if (DOM.btnOpenBookmarks) {
      DOM.btnOpenBookmarks.addEventListener('click', () => {
        renderBookmarksDrawer();
        if (DOM.bookmarksOverlay) DOM.bookmarksOverlay.classList.add('open');
      });
    }
    if (DOM.btnCloseBookmarks) {
      DOM.btnCloseBookmarks.addEventListener('click', () => {
        if (DOM.bookmarksOverlay) DOM.bookmarksOverlay.classList.remove('open');
      });
    }
    if (DOM.btnClearBookmarks) {
      DOM.btnClearBookmarks.addEventListener('click', () => {
        STATE.bookmarks = [];
        localStorage.setItem('lingua_bookmarks', '[]');
        updateBadges();
        renderBookmarksDrawer();
      });
    }

    if (DOM.btnOpenWeakSpots) {
      DOM.btnOpenWeakSpots.addEventListener('click', () => {
        renderWeakSpotsDrawer();
        if (DOM.weakSpotsOverlay) DOM.weakSpotsOverlay.classList.add('open');
      });
    }
    if (DOM.btnCloseWeakSpots) {
      DOM.btnCloseWeakSpots.addEventListener('click', () => {
        if (DOM.weakSpotsOverlay) DOM.weakSpotsOverlay.classList.remove('open');
      });
    }
    if (DOM.btnClearWeakSpots) {
      DOM.btnClearWeakSpots.addEventListener('click', () => {
        STATE.weakSpots = [];
        localStorage.setItem('lingua_weak_spots', '[]');
        updateBadges();
        renderWeakSpotsDrawer();
      });
    }
  }

  function closeAllDrawers() {
    if (DOM.weakSpotsOverlay) DOM.weakSpotsOverlay.classList.remove('open');
    if (DOM.bookmarksOverlay) DOM.bookmarksOverlay.classList.remove('open');
    if (DOM.friendsOverlay) DOM.friendsOverlay.classList.remove('open');
  }

  // ==========================================================================
  // Initialization Routine
  // ==========================================================================

  function initApp() {
    cacheDOMElements();
    initTts();
    initSpeechRecognition();
    initChatVoiceDictation();
    initAmbientCanvas();

    bindEventListeners();
    setUILanguage(STATE.uiLang);
    switchTab(STATE.activeTab);

    // Ensure indicator pill aligns after layout reflow
    requestAnimationFrame(() => {
      updateNavIndicator();
    });
    setTimeout(updateNavIndicator, 100);

    try {
      initCommunityFirebase();
    } catch (err) {
      console.warn('Firebase init caught in initApp:', err);
    }
  }

  // Bootstrap when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
