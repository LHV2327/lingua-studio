// ==========================================================================
// LinguaStudio Pro 2.0 — Core Interactive Application Logic
// ==========================================================================

(function () {
  'use strict';

  // Safe requestAnimationFrame / cancelAnimationFrame for all environments
  const safeRAF = (typeof window !== 'undefined' && window.requestAnimationFrame)
    ? window.requestAnimationFrame.bind(window)
    : (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (cb) => setTimeout(cb, 16));

  const safeCAF = (typeof window !== 'undefined' && window.cancelAnimationFrame)
    ? window.cancelAnimationFrame.bind(window)
    : (typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : (id) => clearTimeout(id));


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
                    (typeof LINGUA_DATA !== 'undefined' ? LINGUA_DATA : {});

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
    activeTab: getSafeStorage('lingua_active_tab', 'tab-campaign'),
    
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

    // Tab 4 Community (Online Community)
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
        if (stored) {
          const p = JSON.parse(stored);
          if (!p.pin) p.pin = '1234';
          if (!p.username) p.username = p.nickname || 'HocVien';
          if (!p.equippedFrame) p.equippedFrame = 'frame-default';
          if (!p.equippedTitle) p.equippedTitle = 'title-novice';
          return p;
        }
      } catch (e) {}
      const randId = 'user_' + Math.random().toString(36).substring(2, 9);
      const defaultProf = {
        userId: randId,
        username: 'HocVien',
        nickname: 'Học viên_' + Math.floor(100 + Math.random() * 900),
        avatar: '🦊',
        pin: '1234',
        nativeLang: 'vi',
        targetLang: 'ja',
        equippedFrame: 'frame-default',
        equippedTitle: 'title-novice'
      };
      localStorage.setItem('lingua_user_profile', JSON.stringify(defaultProf));
      return defaultProf;
    })(),
    coins: (function () {
      try {
        const stored = localStorage.getItem('lingua_coins');
        if (stored !== null) return parseInt(stored, 10);
      } catch (e) {}
      return 150;
    })(),
    inventory: (function () {
      try {
        const stored = localStorage.getItem('lingua_inventory');
        if (stored) return JSON.parse(stored);
      } catch (e) {}
      return {
        frames: ['frame-default'],
        titles: ['title-novice'],
        equippedFrame: 'frame-default',
        equippedTitle: 'title-novice'
      };
    })(),
    friends: JSON.parse(localStorage.getItem('lingua_friends') || '[]'),
    weakSpots: JSON.parse(localStorage.getItem('lingua_weak_spots') || '[]'),
    bookmarks: JSON.parse(localStorage.getItem('lingua_bookmarks') || '[]'),

    // Gamification (Duolingo & Renshuu inspired)
    gamification: (function () {
      try {
        const stored = localStorage.getItem('lingua_gamification');
        if (stored) return JSON.parse(stored);
      } catch (e) {}
      return {
        streak: 1,
        lastActiveDate: new Date().toISOString().slice(0, 10),
        xp: 120,
        level: 2,
        practicedItems: []
      };
    })(),

    // Quick Drill (Active Recall Quiz) State
    quiz: {
      active: false,
      type: 'sound',
      questions: [],
      currentIndex: 0,
      score: 0,
      streak: 0,
      maxStreak: 0,
      xpEarned: 0,
      missedItems: [],
      answered: false
    },

    // Tab 3 Shadowing Studio State
    labMode: 'curated', // 'curated' | 'custom'
    currentLabCustomSentence: null,
    flattenedLabSentences: [],

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

    // Gamification & Habit Loop Elements
    DOM.streakPill = document.getElementById('streakPill');
    DOM.streakCount = document.getElementById('streakCount');
    DOM.xpPill = document.getElementById('xpPill');
    DOM.xpCount = document.getElementById('xpCount');
    DOM.levelPill = document.getElementById('levelPill');
    DOM.levelBadge = document.getElementById('levelBadge');
    DOM.masteryBarFill = document.getElementById('masteryBarFill');
    DOM.xpToastContainer = document.getElementById('xpToastContainer');

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
    DOM.btnStartSoundQuiz = document.getElementById('btnStartSoundQuiz');

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
    DOM.btnStartExpQuiz = document.getElementById('btnStartExpQuiz');
    DOM.phrasesView = document.getElementById('phrasesView');
    DOM.sentencesView = document.getElementById('sentencesView');
    DOM.phrasesList = document.getElementById('phrasesList');
    DOM.situationPills = document.getElementById('situationPills');
    DOM.expressionsList = document.getElementById('expressionsList');

    // Tab 3: Lab
    DOM.btnModeCurated = document.getElementById('btnModeCurated');
    DOM.btnModeCustom = document.getElementById('btnModeCustom');
    DOM.curatedSentenceWrap = document.getElementById('curatedSentenceWrap');
    DOM.customSentenceWrap = document.getElementById('customSentenceWrap');
    DOM.customSentenceInput = document.getElementById('customSentenceInput');
    DOM.btnApplyCustomSentence = document.getElementById('btnApplyCustomSentence');
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

    // Modal: 5-Question Active Recall Drill (Quiz)
    DOM.quizModalOverlay = document.getElementById('quizModalOverlay');
    DOM.btnCloseQuizModal = document.getElementById('btnCloseQuizModal');
    DOM.quizTypeBadge = document.getElementById('quizTypeBadge');
    DOM.quizCounterBadge = document.getElementById('quizCounterBadge');
    DOM.quizProgressFill = document.getElementById('quizProgressFill');
    DOM.quizQuestionStage = document.getElementById('quizQuestionStage');
    DOM.quizComboPill = document.getElementById('quizComboPill');
    DOM.quizComboCount = document.getElementById('quizComboCount');
    DOM.btnQuizPlayAudio = document.getElementById('btnQuizPlayAudio');
    DOM.quizAudioBtnLabel = document.getElementById('quizAudioBtnLabel');
    DOM.quizPromptText = document.getElementById('quizPromptText');
    DOM.quizChoicesContainer = document.getElementById('quizChoicesContainer');
    DOM.quizFeedbackBanner = document.getElementById('quizFeedbackBanner');
    DOM.quizFeedbackIcon = document.getElementById('quizFeedbackIcon');
    DOM.quizFeedbackMsg = document.getElementById('quizFeedbackMsg');
    DOM.quizResultStage = document.getElementById('quizResultStage');
    DOM.quizResultHeroIcon = document.getElementById('quizResultHeroIcon');
    DOM.quizResultTitle = document.getElementById('quizResultTitle');
    DOM.quizResultSubtitle = document.getElementById('quizResultSubtitle');
    DOM.quizResultScore = document.getElementById('quizResultScore');
    DOM.quizResultXp = document.getElementById('quizResultXp');
    DOM.quizResultStreak = document.getElementById('quizResultStreak');
    DOM.quizMissedAlert = document.getElementById('quizMissedAlert');
    DOM.quizMissedText = document.getElementById('quizMissedText');
    DOM.btnQuizRetry = document.getElementById('btnQuizRetry');
    DOM.btnQuizFinish = document.getElementById('btnQuizFinish');

    DOM.toastContainer = document.getElementById('toastContainer');
    DOM.ambientCanvas = document.getElementById('ambientCanvas');

    // Procedural Audio Controls (SFX & Cultural BGM)
    DOM.btnToggleSfx = document.getElementById('btnToggleSfx');
    DOM.sfxIcon = document.getElementById('sfxIcon');
    DOM.btnToggleBgm = document.getElementById('btnToggleBgm');
    DOM.bgmIcon = document.getElementById('bgmIcon');
    DOM.btnAudioSettings = document.getElementById('btnAudioSettings');
    DOM.audioSettingsPopover = document.getElementById('audioSettingsPopover');
    DOM.btnCloseAudioSettings = document.getElementById('btnCloseAudioSettings');
    DOM.bgmVolumeSlider = document.getElementById('bgmVolumeSlider');
    DOM.bgmVolumeLabel = document.getElementById('bgmVolumeLabel');
    DOM.sfxVolumeSlider = document.getElementById('sfxVolumeSlider');
    DOM.sfxVolumeLabel = document.getElementById('sfxVolumeLabel');

    // Tab Campaign & 5-Stage Guided Quest Path
    DOM.tabBtnCampaign = document.getElementById('tabBtnCampaign');
    DOM.tabCampaign = document.getElementById('tab-campaign');
    DOM.campaignThemeBadge = document.getElementById('campaignThemeBadge');
    DOM.campaignCurrentLangLabel = document.getElementById('campaignCurrentLangLabel');
    DOM.campaignProgressText = document.getElementById('campaignProgressText');
    DOM.campaignTrackFill = document.getElementById('campaignTrackFill');
    DOM.questNodesList = document.getElementById('questNodesList');

    // Tab 1 Writing Pad
    DOM.tab1WritingCanvas = document.getElementById('tab1WritingCanvas');
    DOM.tab1CanvasWatermark = document.getElementById('tab1CanvasWatermark');
    DOM.btnToggleGuideTab1 = document.getElementById('btnToggleGuideTab1');
    DOM.btnClearCanvasTab1 = document.getElementById('btnClearCanvasTab1');

    // Tab 3 Sentence Picker
    DOM.curatedSentenceWrap = document.getElementById('curatedSentenceWrap');
    DOM.sentenceCardsScroller = document.getElementById('sentenceCardsScroller');
    DOM.labFilterPills = document.getElementById('labFilterPills');

    // Quest Lesson & 2D Battle Arena Modal
    DOM.questModalOverlay = document.getElementById('questModalOverlay');
    DOM.btnCloseQuestModal = document.getElementById('btnCloseQuestModal');
    DOM.questModalStageTag = document.getElementById('questModalStageTag');
    DOM.questModalTitle = document.getElementById('questModalTitle');
    DOM.questStepDot1 = document.getElementById('questStepDot1');
    DOM.questStepDot2 = document.getElementById('questStepDot2');
    DOM.questStepDot3 = document.getElementById('questStepDot3');
    DOM.questStep1Body = document.getElementById('questStep1Body');
    DOM.questStep2Body = document.getElementById('questStep2Body');
    DOM.questStep3Body = document.getElementById('questStep3Body');
    DOM.questStep1Desc = document.getElementById('questStep1Desc');
    DOM.questPreviewGrid = document.getElementById('questPreviewGrid');
    DOM.btnQuestGoStep2 = document.getElementById('btnQuestGoStep2');
    DOM.btnQuestBackStep1 = document.getElementById('btnQuestBackStep1');
    DOM.btnQuestGoStep3 = document.getElementById('btnQuestGoStep3');
    DOM.questWritingCanvas = document.getElementById('questWritingCanvas');
    DOM.canvasWatermarkGuide = document.getElementById('canvasWatermarkGuide');
    DOM.btnToggleGuideQuest = document.getElementById('btnToggleGuideQuest');
    DOM.btnClearCanvasQuest = document.getElementById('btnClearCanvasQuest');
    DOM.btnAudioWritingChar = document.getElementById('btnAudioWritingChar');
    DOM.btnPrevWritingChar = document.getElementById('btnPrevWritingChar');
    DOM.btnNextWritingChar = document.getElementById('btnNextWritingChar');
    DOM.writingTargetChar = document.getElementById('writingTargetChar');
    DOM.writingTargetReading = document.getElementById('writingTargetReading');
    DOM.writingTargetMeaning = document.getElementById('writingTargetMeaning');

    // Coins & Shop & Profile Elements
    DOM.coinsPill = document.getElementById('coinsPill');
    DOM.coinsCount = document.getElementById('coinsCount');
    DOM.btnOpenShop = document.getElementById('btnOpenShop');
    DOM.shopModalOverlay = document.getElementById('shopModalOverlay');
    DOM.btnCloseShopModal = document.getElementById('btnCloseShopModal');
    DOM.shopCoinsBalance = document.getElementById('shopCoinsBalance');
    DOM.shopTabFrames = document.getElementById('shopTabFrames');
    DOM.shopTabTitles = document.getElementById('shopTabTitles');
    DOM.shopItemsGrid = document.getElementById('shopItemsGrid');
    DOM.btnOpenUserProfile = document.getElementById('btnOpenUserProfile');
    DOM.headerUserAvatarWrap = document.getElementById('headerUserAvatarWrap');
    DOM.headerUserAvatarEmoji = document.getElementById('headerUserAvatarEmoji');
    DOM.headerUsername = document.getElementById('headerUsername');
    DOM.headerUserTitle = document.getElementById('headerUserTitle');
    DOM.profileModalAvatarWrap = document.getElementById('profileModalAvatarWrap');
    DOM.profileModalAvatarEmoji = document.getElementById('profileModalAvatarEmoji');
    DOM.profileModalEquippedTitle = document.getElementById('profileModalEquippedTitle');
    DOM.profileModalStats = document.getElementById('profileModalStats');
    DOM.profilePin = document.getElementById('profilePin');
    DOM.btnAnimateStrokesTab1 = document.getElementById('btnAnimateStrokesTab1');
    DOM.btnAnimateStrokesQuest = document.getElementById('btnAnimateStrokesQuest');

    // Daily Drill Elements
    DOM.btnStartDailyDrill = document.getElementById('btnStartDailyDrill');
    DOM.dailyDrillModalOverlay = document.getElementById('dailyDrillModalOverlay');
    DOM.btnCloseDailyDrill = document.getElementById('btnCloseDailyDrill');
    DOM.btnDailyDrillAudio = document.getElementById('btnDailyDrillAudio');
    DOM.btnFinishDailyDrill = document.getElementById('btnFinishDailyDrill');

    // Handwriting Verification Elements
    DOM.btnCheckWritingTab1 = document.getElementById('btnCheckWritingTab1');
    DOM.btnCheckWritingQuest = document.getElementById('btnCheckWritingQuest');
    DOM.questWritingScorePill = document.getElementById('questWritingScorePill');
    DOM.btnSkipWritingQuest = document.getElementById('btnSkipWritingQuest');

    // Community Voice & Audio
    DOM.btnVoiceRecord = document.getElementById('btnVoiceRecord');
    DOM.voiceRecordingTimer = document.getElementById('voiceRecordingTimer');
    DOM.voiceTimerSec = document.getElementById('voiceTimerSec');

    // Quest 4-Step Elements
    DOM.questStepDot4 = document.getElementById('questStepDot4');
    DOM.questStep4Body = document.getElementById('questStep4Body');
    DOM.btnQuestGoStep4 = document.getElementById('btnQuestGoStep4');
    DOM.btnQuestBackStep2 = document.getElementById('btnQuestBackStep2');
    DOM.warmupCounterText = document.getElementById('warmupCounterText');
    DOM.warmupProgressFill = document.getElementById('warmupProgressFill');
    DOM.btnWarmupAudioPrompt = document.getElementById('btnWarmupAudioPrompt');
    DOM.warmupPromptText = document.getElementById('warmupPromptText');
    DOM.warmupCueBadge = document.getElementById('warmupCueBadge');
    DOM.warmupAnswersGrid = document.getElementById('warmupAnswersGrid');
    DOM.warmupSuccessBanner = document.getElementById('warmupSuccessBanner');

    // 2D Canvas Battle Arena
    DOM.battlePlayerHearts = document.getElementById('battlePlayerHearts');
    DOM.battleBossName = document.getElementById('battleBossName');
    DOM.battleBossHpFill = document.getElementById('battleBossHpFill');
    DOM.battleBossHpText = document.getElementById('battleBossHpText');
    DOM.bossBattleCanvas = document.getElementById('bossBattleCanvas');
    DOM.battleHitFlash = document.getElementById('battleHitFlash');
    DOM.battleQuestionText = document.getElementById('battleQuestionText');
    DOM.battleCueBadge = document.getElementById('battleCueBadge');
    DOM.btnBattleAudioPrompt = document.getElementById('btnBattleAudioPrompt');
    DOM.battleAnswersGrid = document.getElementById('battleAnswersGrid');
    DOM.battleVictoryOverlay = document.getElementById('battleVictoryOverlay');
    DOM.btnFinishBattleVictory = document.getElementById('btnFinishBattleVictory');
    DOM.battleDefeatOverlay = document.getElementById('battleDefeatOverlay');
    DOM.btnRetryBattle = document.getElementById('btnRetryBattle');
  }

  // ==========================================================================
  
  // ==========================================================================
  // Dynamic Cultural Theme & Procedural Audio / Scenery Engines
  // ==========================================================================

  function getThemeKey(langCode) {
    if (!langCode) return 'ja';
    if (langCode.startsWith('ja')) return 'ja';
    if (langCode.startsWith('en')) return 'en';
    if (langCode.startsWith('ko')) return 'ko';
    if (langCode.startsWith('zh')) return 'zh';
    return 'ja';
  }

  function applyCulturalTheme(langCode) {
    const themeKey = getThemeKey(langCode);
    if (typeof document !== 'undefined' && document.body) {
      document.body.dataset.theme = themeKey;
    }
    if (typeof CulturalScenery !== 'undefined' && typeof CulturalScenery.setTheme === 'function') {
      CulturalScenery.setTheme(themeKey);
    }
    if (typeof BGMPlayer !== 'undefined' && typeof BGMPlayer.setTheme === 'function') {
      BGMPlayer.setTheme(langCode);
    }
  }

  // Procedural Web Audio API Sound Synthesizer (SFX)
  const SoundFX = {
    audioCtx: null,
    muted: getSafeStorage('lingua_sfx_muted', 'false') === 'true',
    volume: parseFloat(getSafeStorage('lingua_sfx_volume', '0.70')),

    getAudioContext() {
      if (!this.audioCtx && typeof window !== 'undefined') {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    },

    setVolume(val) {
      this.volume = Math.max(0, Math.min(1, val));
      try {
        localStorage.setItem('lingua_sfx_volume', String(this.volume));
      } catch (e) {}
    },

    toggleMute() {
      this.muted = !this.muted;
      try {
        localStorage.setItem('lingua_sfx_muted', String(this.muted));
      } catch (e) {}
      if (DOM.sfxIcon) {
        DOM.sfxIcon.textContent = this.muted ? '🔇' : '🔊';
      }
      showToast(this.muted ? (STATE.uiLang === 'vi' ? 'Đã tắt hiệu ứng âm thanh (SFX)' : 'SFX Muted') : (STATE.uiLang === 'vi' ? 'Đã bật hiệu ứng âm thanh (SFX)' : 'SFX Enabled'), 'info');
      return !this.muted;
    },

    playClick() {
      if (this.muted) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);
        const peak = 0.35 * this.volume;
        gain.gain.setValueAtTime(peak, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } catch (e) {}
    },

    playLaser() {
      if (this.muted) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.22);
        const peak = 0.45 * this.volume;
        gain.gain.setValueAtTime(peak, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } catch (e) {}
    },

    playCoins() {
      if (this.muted) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        [987.77, 1318.51].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          const peak = 0.38 * this.volume;
          gain.gain.setValueAtTime(peak, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.24);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.24);
        });
      } catch (e) {}
    },

    playHit() {
      if (this.muted) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.18);
        const peak = 0.55 * this.volume;
        gain.gain.setValueAtTime(peak, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } catch (e) {}
    },

    playCrit() {
      if (this.muted) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;
      try {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.05);
          const peak = 0.40 * this.volume;
          gain.gain.setValueAtTime(peak, ctx.currentTime + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.05);
          osc.stop(ctx.currentTime + i * 0.05 + 0.15);
        });
      } catch (e) {}
    },

    playHurt() {
      if (this.muted) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
        const peak = 0.50 * this.volume;
        gain.gain.setValueAtTime(peak, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } catch (e) {}
    },

    playVictory() {
      if (this.muted) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;
      try {
        const notes = [
          { f: 523.25, t: 0.0 },
          { f: 659.25, t: 0.12 },
          { f: 783.99, t: 0.24 },
          { f: 1046.5, t: 0.40 }
        ];
        notes.forEach(n => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(n.f, ctx.currentTime + n.t);
          const peak = 0.48 * this.volume;
          gain.gain.setValueAtTime(peak, ctx.currentTime + n.t);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.t + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + n.t);
          osc.stop(ctx.currentTime + n.t + 0.35);
        });
      } catch (e) {}
    }
  };

  // Pure Web Audio API Procedural Cultural Background Music Synthesizer (BGM)
  const BGMPlayer = {
    audioCtx: null,
    isPlaying: false,
    enabled: getSafeStorage('lingua_bgm_enabled', 'false') === 'true',
    volume: parseFloat(getSafeStorage('lingua_bgm_volume', '0.70')),
    currentTheme: 'ja',
    loopTimer: null,
    step: 0,
    masterGain: null,

    getAudioContext() {
      if (!this.audioCtx && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.audioCtx = new AudioCtx();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    },

    setVolume(val) {
      this.volume = Math.max(0, Math.min(1, val));
      try {
        localStorage.setItem('lingua_bgm_volume', String(this.volume));
      } catch (e) {}
      if (this.masterGain && this.audioCtx) {
        this.masterGain.gain.setValueAtTime(0.22 * this.volume, this.audioCtx.currentTime);
      }
    },

    init() {
      this.currentTheme = getThemeKey(STATE.currentLang);
      if (this.enabled) {
        const startOnInteract = () => {
          if (this.enabled && !this.isPlaying) {
            this.start();
          }
          window.removeEventListener('click', startOnInteract);
          window.removeEventListener('keydown', startOnInteract);
        };
        window.addEventListener('click', startOnInteract, { once: true });
        window.addEventListener('keydown', startOnInteract, { once: true });
      }
      this.updateUI();
    },

    toggle() {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      this.enabled = !this.enabled;
      try {
        localStorage.setItem('lingua_bgm_enabled', String(this.enabled));
      } catch (e) {}

      if (this.enabled) {
        this.start();
        showToast(STATE.uiLang === 'vi' ? 'Đã bật nhạc nền văn hóa 🎵' : 'Cultural BGM Enabled 🎵', 'info');
      } else {
        this.stop();
        showToast(STATE.uiLang === 'vi' ? 'Đã tắt nhạc nền' : 'BGM Muted', 'info');
      }
      this.updateUI();
    },

    updateUI() {
      if (DOM.bgmIcon) {
        DOM.bgmIcon.textContent = this.enabled ? '🎵' : '🔇';
      }
      if (DOM.btnToggleBgm) {
        DOM.btnToggleBgm.classList.toggle('active', this.enabled);
      }
    },

    setTheme(langCode) {
      this.currentTheme = getThemeKey(langCode);
      this.step = 0;
    },

    start() {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      if (this.isPlaying) return;
      this.isPlaying = true;
      this.step = 0;

      if (!this.masterGain) {
        this.masterGain = ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.22 * this.volume, ctx.currentTime);
        this.masterGain.connect(ctx.destination);
      }

      this.scheduleNextNote();
    },

    stop() {
      this.isPlaying = false;
      if (this.loopTimer) {
        clearTimeout(this.loopTimer);
        this.loopTimer = null;
      }
    },

    scheduleNextNote() {
      if (!this.isPlaying) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      let interval = 450;

      if (this.currentTheme === 'ja') {
        // Japanese Hirajoshi Koto melody
        const kotoScale = [220.0, 246.94, 261.63, 329.63, 349.23, 440.0, 493.88, 523.25];
        const melody = [0, 2, 3, 5, 4, 3, 2, 0, 3, 5, 7, 5, 4, 3, 2, 0];
        const noteIdx = melody[this.step % melody.length];
        const freq = kotoScale[noteIdx];
        this.playPluckNote(freq, 1.4, 'triangle');
        interval = (this.step % 4 === 3) ? 650 : 380;

      } else if (this.currentTheme === 'en') {
        // Lo-Fi Electric Piano Chords & Bell
        const chordProgressions = [
          [174.61, 220.0, 261.63, 329.63],
          [164.81, 196.0, 246.94, 293.66],
          [146.83, 174.61, 220.0, 261.63],
          [130.81, 164.81, 196.0, 246.94]
        ];
        const chordIdx = Math.floor(this.step / 4) % chordProgressions.length;
        const noteIdx = this.step % 4;
        const chord = chordProgressions[chordIdx];
        this.playRhodesNote(chord[noteIdx], 1.2);
        interval = 480;

      } else if (this.currentTheme === 'ko') {
        // Korean Gayageum Arpeggio
        const gayageumScale = [293.66, 329.63, 392.00, 440.00, 493.88, 587.33];
        const motif = [0, 1, 2, 4, 3, 2, 1, 0, 2, 3, 5, 4, 2, 1, 0, 2];
        const freq = gayageumScale[motif[this.step % motif.length]];
        this.playGayageumNote(freq, 1.5);
        interval = (this.step % 2 === 0) ? 360 : 520;

      } else if (this.currentTheme === 'zh') {
        // Chinese Guzheng Pentatonic Cascades
        const guzhengScale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];
        const motif = [0, 2, 3, 4, 5, 4, 3, 2, 1, 3, 4, 6, 5, 4, 3, 1];
        const freq = guzhengScale[motif[this.step % motif.length]];
        this.playGuzhengNote(freq, 1.3);
        interval = (this.step % 4 === 0) ? 550 : 320;
      }

      this.step++;
      this.loopTimer = setTimeout(() => this.scheduleNextNote(), interval);
    },

    playPluckNote(freq, duration, type = 'triangle') {
      const ctx = this.getAudioContext();
      if (!ctx || !this.masterGain) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      } catch (e) {}
    },

    playRhodesNote(freq, duration) {
      const ctx = this.getAudioContext();
      if (!ctx || !this.masterGain) return;
      try {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, ctx.currentTime);
        osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + duration);
        osc2.stop(ctx.currentTime + duration);
      } catch (e) {}
    },

    playGayageumNote(freq, duration) {
      const ctx = this.getAudioContext();
      if (!ctx || !this.masterGain) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq * 0.98, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(freq, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      } catch (e) {}
    },

    playGuzhengNote(freq, duration) {
      const ctx = this.getAudioContext();
      if (!ctx || !this.masterGain) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + duration);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      } catch (e) {}
    }
  };

  // Interactive HTML5 Canvas Writing Pad with Touch & Mouse support
  class WritingPad {
    constructor(canvas, watermarkEl) {
      this.canvas = canvas;
      this.watermarkEl = watermarkEl;
      this.ctx = canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
      this.isDrawing = false;
      this.hasDrawn = false;
      this.currentChar = '';
      this.isAnimating = false;
      this.animId = null;
      this.initEvents();
    }

    initEvents() {
      if (!this.canvas || !this.ctx) return;
      const getPos = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
        };
      };

      const start = (e) => {
        if (this.isAnimating) this.cancelAnimation();
        if (e.cancelable && e.type === 'touchstart') e.preventDefault();
        this.isDrawing = true;
        this.hasDrawn = true;
        const pos = getPos(e);
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
        this.ctx.lineWidth = 6;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#e11d48';
        this.ctx.shadowColor = 'rgba(225, 29, 72, 0.4)';
        this.ctx.shadowBlur = 4;
      };

      const move = (e) => {
        if (!this.isDrawing) return;
        if (e.cancelable && e.type === 'touchmove') e.preventDefault();
        const pos = getPos(e);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
      };

      const stop = () => {
        if (this.isDrawing) {
          this.isDrawing = false;
          this.ctx.closePath();
        }
      };

      this.canvas.addEventListener('mousedown', start);
      this.canvas.addEventListener('mousemove', move);
      this.canvas.addEventListener('mouseup', stop);
      this.canvas.addEventListener('mouseleave', stop);

      this.canvas.addEventListener('touchstart', start, { passive: false });
      this.canvas.addEventListener('touchmove', move, { passive: false });
      this.canvas.addEventListener('touchend', stop);
    }

    clear() {
      this.cancelAnimation();
      if (!this.ctx || !this.canvas) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.hasDrawn = false;
      if (this.currentChar) {
        this.drawStrokeGuides(this.currentChar);
      }
    }

    checkHandwritingAccuracy(targetChar) {
      if (!this.canvas || !this.ctx) return { score: 100, pass: true, message: 'Rất tốt!' };
      const char = targetChar || this.currentChar;
      if (!char) return { score: 100, pass: true, message: 'Rất tốt!' };

      const W = this.canvas.width;
      const H = this.canvas.height;

      // Offscreen canvas for template comparison
      const offCanvas = document.createElement('canvas');
      offCanvas.width = W;
      offCanvas.height = H;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return { score: 80, pass: true, message: 'Nét viết tốt!' };

      offCtx.fillStyle = '#000000';
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.font = `bold ${Math.round(W * 0.65)}px "Noto Sans JP", "Noto Sans KR", "Noto Sans SC", sans-serif`;
      offCtx.fillText(char, W / 2, H / 2);

      const templateData = offCtx.getImageData(0, 0, W, H).data;
      const userData = this.ctx.getImageData(0, 0, W, H).data;

      let templatePixels = 0;
      let userPixels = 0;
      let matchPixels = 0;

      const step = 2;
      let uMinX = W, uMaxX = 0, uMinY = H, uMaxY = 0;

      for (let y = 0; y < H; y += step) {
        const row = y * W * 4;
        for (let x = 0; x < W; x += step) {
          const idx = row + x * 4;
          const isTemplate = templateData[idx + 3] > 40;
          const isUser = userData[idx + 3] > 40;

          if (isTemplate) templatePixels++;
          if (isUser) {
            userPixels++;
            if (x < uMinX) uMinX = x;
            if (x > uMaxX) uMaxX = x;
            if (y < uMinY) uMinY = y;
            if (y > uMaxY) uMaxY = y;
          }
          if (isTemplate && isUser) matchPixels++;
        }
      }

      if (userPixels < 25) {
        return {
          score: 0,
          pass: false,
          message: STATE.uiLang === 'vi' ? 'Bạn chưa viết chữ lên bảng!' : 'No strokes drawn on canvas!'
        };
      }

      // Coverage with dilation factor
      const coverage = Math.min(1.0, (matchPixels / Math.max(1, templatePixels)) * 1.55);
      const overdraw = userPixels / Math.max(1, templatePixels);
      let penalty = 0;
      if (overdraw > 2.2) penalty += Math.min(40, (overdraw - 2.2) * 20);

      const span = Math.max(uMaxX - uMinX, uMaxY - uMinY);
      if (span < W * 0.22) penalty += 30;

      const rawScore = Math.round((coverage * 100) - penalty);
      const score = Math.max(5, Math.min(99, rawScore));
      const pass = score >= 55;

      let message = '';
      if (score >= 80) {
        message = STATE.uiLang === 'vi' ? 'Xuất sắc! Nét viết rất chuẩn xác.' : 'Excellent! Highly accurate strokes.';
      } else if (score >= 55) {
        message = STATE.uiLang === 'vi' ? 'Đạt chuẩn! Nét vẽ đã đúng hướng.' : 'Passed! Good stroke flow.';
      } else {
        message = STATE.uiLang === 'vi' ? 'Chưa đạt 55%. Hãy đồ theo các chấm số ①②③ nhé!' : 'Below 55%. Trace numbered dots ①②③!';
      }

      return { score, pass, message };
    }

    setGuide(char) {
      this.currentChar = char || '';
      if (this.watermarkEl) {
        this.watermarkEl.textContent = this.currentChar;
      }
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawStrokeGuides(this.currentChar);
      }
    }

    toggleGuide() {
      if (this.watermarkEl) {
        this.watermarkEl.classList.toggle('hide');
      }
    }

    cancelAnimation() {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
      this.isAnimating = false;
    }

    drawStrokeGuides(char) {
      if (!this.ctx || !this.canvas || !char) return;
      const strokeData = typeof getStrokeData === 'function' ? getStrokeData(char) : null;
      if (!strokeData || !strokeData.length) return;

      const W = this.canvas.width;
      const H = this.canvas.height;

      strokeData.forEach((stroke, idx) => {
        if (!stroke || stroke.length < 2) return;

        // 1. Draw dashed guide path
        this.ctx.save();
        this.ctx.setLineDash([5, 5]);
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = 'rgba(225, 29, 72, 0.45)';
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        const startX = (stroke[0][0] / 100) * W;
        const startY = (stroke[0][1] / 100) * H;
        this.ctx.moveTo(startX, startY);

        for (let i = 1; i < stroke.length; i++) {
          const px = (stroke[i][0] / 100) * W;
          const py = (stroke[i][1] / 100) * H;
          this.ctx.lineTo(px, py);
        }
        this.ctx.stroke();

        // 2. Draw directional arrow near start/mid of stroke
        const p1X = (stroke[1][0] / 100) * W;
        const p1Y = (stroke[1][1] / 100) * H;
        const angle = Math.atan2(p1Y - startY, p1X - startX);
        const midX = (startX + p1X) / 2;
        const midY = (startY + p1Y) / 2;
        const arrowLen = 7;

        this.ctx.setLineDash([]);
        this.ctx.fillStyle = 'rgba(225, 29, 72, 0.7)';
        this.ctx.beginPath();
        this.ctx.moveTo(midX + Math.cos(angle) * arrowLen, midY + Math.sin(angle) * arrowLen);
        this.ctx.lineTo(
          midX + Math.cos(angle + 2.5) * arrowLen,
          midY + Math.sin(angle + 2.5) * arrowLen
        );
        this.ctx.lineTo(
          midX + Math.cos(angle - 2.5) * arrowLen,
          midY + Math.sin(angle - 2.5) * arrowLen
        );
        this.ctx.closePath();
        this.ctx.fill();

        // 3. Draw numbered starting circle (①, ②, ③...)
        this.ctx.beginPath();
        this.ctx.arc(startX, startY, 11, 0, Math.PI * 2);
        this.ctx.fillStyle = '#e11d48';
        this.ctx.shadowColor = 'rgba(225, 29, 72, 0.6)';
        this.ctx.shadowBlur = 4;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(String(idx + 1), startX, startY);

        this.ctx.restore();
      });
    }

    animateStrokes(onComplete) {
      if (!this.ctx || !this.canvas || !this.currentChar) return;
      const strokeData = typeof getStrokeData === 'function' ? getStrokeData(this.currentChar) : null;
      if (!strokeData || !strokeData.length) return;

      this.cancelAnimation();
      this.isAnimating = true;

      // Clear canvas to start fresh animation
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const W = this.canvas.width;
      const H = this.canvas.height;
      let strokeIndex = 0;
      let segmentIndex = 0;
      let progress = 0;
      const speed = 0.045; // interpolation step per frame

      // Keep previously completed strokes drawn
      const completedStrokes = [];

      const animateFrame = () => {
        if (!this.isAnimating) return;

        // Clear canvas for next frame
        this.ctx.clearRect(0, 0, W, H);

        // Re-draw all fully completed strokes
        this.ctx.save();
        this.ctx.lineWidth = 6;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#e11d48';
        this.ctx.shadowColor = 'rgba(225, 29, 72, 0.4)';
        this.ctx.shadowBlur = 4;

        completedStrokes.forEach(st => {
          this.ctx.beginPath();
          this.ctx.moveTo(st[0][0], st[0][1]);
          for (let i = 1; i < st.length; i++) {
            this.ctx.lineTo(st[i][0], st[i][1]);
          }
          this.ctx.stroke();
        });

        // Draw current animating stroke
        const currentStroke = strokeData[strokeIndex];
        if (currentStroke && currentStroke.length >= 2) {
          this.ctx.beginPath();
          const startPtX = (currentStroke[0][0] / 100) * W;
          const startPtY = (currentStroke[0][1] / 100) * H;
          this.ctx.moveTo(startPtX, startPtY);

          // Draw full previous segments of this stroke
          for (let i = 1; i <= segmentIndex; i++) {
            const px = (currentStroke[i][0] / 100) * W;
            const py = (currentStroke[i][1] / 100) * H;
            this.ctx.lineTo(px, py);
          }

          // Interpolate current segment
          const pA_X = (currentStroke[segmentIndex][0] / 100) * W;
          const pA_Y = (currentStroke[segmentIndex][1] / 100) * H;
          const pB_X = (currentStroke[segmentIndex + 1][0] / 100) * W;
          const pB_Y = (currentStroke[segmentIndex + 1][1] / 100) * H;

          const curX = pA_X + (pB_X - pA_X) * progress;
          const curY = pA_Y + (pB_Y - pA_Y) * progress;
          this.ctx.lineTo(curX, curY);
          this.ctx.stroke();

          // Draw animated brush tip glow
          this.ctx.beginPath();
          this.ctx.arc(curX, curY, 6, 0, Math.PI * 2);
          this.ctx.fillStyle = '#f59e0b';
          this.ctx.shadowColor = '#f59e0b';
          this.ctx.shadowBlur = 8;
          this.ctx.fill();
        }

        this.ctx.restore();

        // Advance progress
        progress += speed;
        if (progress >= 1) {
          progress = 0;
          segmentIndex++;
          if (segmentIndex >= strokeData[strokeIndex].length - 1) {
            // Completed current stroke
            const renderedStroke = strokeData[strokeIndex].map(pt => [(pt[0] / 100) * W, (pt[1] / 100) * H]);
            completedStrokes.push(renderedStroke);

            strokeIndex++;
            segmentIndex = 0;

            if (strokeIndex >= strokeData.length) {
              // Finished all strokes!
              this.isAnimating = false;
              setTimeout(() => {
                this.ctx.clearRect(0, 0, W, H);
                this.drawStrokeGuides(this.currentChar);
                if (typeof onComplete === 'function') onComplete();
              }, 400);
              return;
            }
          }
        }

        this.animId = requestAnimationFrame(animateFrame);
      };

      this.animId = requestAnimationFrame(animateFrame);
    }
  }

  let questWritingPadInstance = null;
  let tab1WritingPadInstance = null;

  // 60fps Illustrated Dynamic Cultural Scenery Engine
  const CulturalScenery = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    particles: [],
    theme: 'ja',
    animId: null,

    init(canvas) {
      if (!canvas || typeof canvas.getContext !== 'function') return;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.setTheme(getThemeKey(STATE.currentLang));
      this.loop();
    },

    resize() {
      if (!this.canvas) return;
      this.width = this.canvas.width = window.innerWidth;
      this.height = this.canvas.height = window.innerHeight;
      this.createParticles();
    },

    setTheme(theme) {
      this.theme = theme || 'ja';
      if (typeof document !== 'undefined' && document.body) {
        document.body.dataset.theme = this.theme;
      }
      this.createParticles();
    },

    createParticles() {
      this.particles = [];
      const count = Math.min(36, Math.floor(this.width / 35));
      for (let i = 0; i < count; i++) {
        if (this.theme === 'ja') {
          // Sakura petals
          this.particles.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            size: Math.random() * 8 + 6,
            speedX: Math.random() * 1.5 + 0.5,
            speedY: Math.random() * 1.2 + 0.8,
            angle: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.03,
            color: 'rgba(244, 63, 94, 0.45)'
          });
        } else if (this.theme === 'en') {
          // Soft clouds & light motes
          this.particles.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            radius: Math.random() * 3.5 + 1.5,
            speedX: (Math.random() - 0.5) * 0.4,
            speedY: -Math.random() * 0.5 - 0.2,
            color: 'rgba(59, 130, 246, 0.35)'
          });
        } else if (this.theme === 'ko') {
          // Pastel blossoms & sparkles
          this.particles.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            size: Math.random() * 6 + 4,
            speedX: (Math.random() - 0.5) * 0.6,
            speedY: -Math.random() * 0.6 - 0.3,
            angle: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.04,
            color: Math.random() > 0.5 ? 'rgba(236, 72, 153, 0.45)' : 'rgba(16, 185, 129, 0.4)'
          });
        } else if (this.theme === 'zh') {
          // Rising lanterns
          this.particles.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            width: Math.random() * 12 + 10,
            height: Math.random() * 16 + 14,
            speedY: -Math.random() * 0.7 - 0.4,
            swaySpeed: Math.random() * 0.02 + 0.01,
            swayAmp: Math.random() * 1.2 + 0.5,
            phase: Math.random() * Math.PI * 2,
            alpha: Math.random() * 0.5 + 0.35
          });
        }
      }
    },

    loop() {
      this.animId = safeRAF(() => this.loop());
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.width, this.height);

      try {
        this.renderScenerySilhouettes();
        this.renderParticles();
      } catch (e) {}
    },

    renderScenerySilhouettes() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      ctx.save();
      if (this.theme === 'ja') {
        // Mount Fuji Silhouette
        const fujiW = Math.min(640, w * 0.65);
        const fujiH = Math.min(230, h * 0.28);
        const fujiX = w * 0.5 - fujiW / 2;
        const fujiY = h;

        ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
        ctx.beginPath();
        ctx.moveTo(fujiX, fujiY);
        ctx.lineTo(fujiX + fujiW * 0.38, fujiY - fujiH);
        ctx.lineTo(fujiX + fujiW * 0.62, fujiY - fujiH);
        ctx.lineTo(fujiX + fujiW, fujiY);
        ctx.closePath();
        ctx.fill();

        // Snow Cap
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(fujiX + fujiW * 0.38, fujiY - fujiH);
        ctx.lineTo(fujiX + fujiW * 0.62, fujiY - fujiH);
        ctx.lineTo(fujiX + fujiW * 0.68, fujiY - fujiH * 0.7);
        ctx.lineTo(fujiX + fujiW * 0.32, fujiY - fujiH * 0.7);
        ctx.closePath();
        ctx.fill();

        // Torii Gate on Right
        const toriiX = Math.min(w - 120, w * 0.85);
        const toriiY = h - 100;
        ctx.fillStyle = 'rgba(230, 57, 70, 0.25)';
        ctx.fillRect(toriiX, toriiY, 80, 8);
        ctx.fillRect(toriiX + 8, toriiY + 16, 64, 6);
        ctx.fillRect(toriiX + 16, toriiY, 10, 100);
        ctx.fillRect(toriiX + 54, toriiY, 10, 100);

      } else if (this.theme === 'en') {
        // Detailed Big Ben + London Eye + Brooklyn Bridge / skyscrapers silhouette
        // 1. Skyscraper backdrop
        ctx.fillStyle = 'rgba(37, 99, 235, 0.06)';
        const bldCount = 18;
        const bldW = w / bldCount;
        for (let i = 0; i < bldCount; i++) {
          const bldH = 45 + ((i * 47) % 110);
          ctx.fillRect(i * bldW, h - bldH, bldW - 3, bldH);
        }

        // 2. Elizabeth Tower / Big Ben on the left
        const benX = Math.max(20, w * 0.12);
        const benW = 34;
        const benH = Math.min(180, h * 0.26);
        const benBaseY = h;
        const benTopY = benBaseY - benH;

        ctx.fillStyle = 'rgba(37, 99, 235, 0.16)';
        ctx.fillRect(benX, benTopY + 45, benW, benH - 45);
        ctx.fillRect(benX - 4, benTopY + 22, benW + 8, 26);
        ctx.beginPath();
        ctx.moveTo(benX - 2, benTopY + 22);
        ctx.lineTo(benX + benW / 2, benTopY);
        ctx.lineTo(benX + benW + 2, benTopY + 22);
        ctx.closePath();
        ctx.fill();
        // Glowing clock face
        ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.beginPath();
        ctx.arc(benX + benW / 2, benTopY + 35, 8, 0, Math.PI * 2);
        ctx.fill();

        // 3. London Eye observation wheel
        const eyeX = benX + 90;
        const eyeY = h - 75;
        const eyeR = 48;
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.16)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
          ctx.beginPath();
          ctx.moveTo(eyeX, eyeY);
          ctx.lineTo(eyeX + Math.cos(a) * eyeR, eyeY + Math.sin(a) * eyeR);
          ctx.stroke();
          ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
          ctx.beginPath();
          ctx.arc(eyeX + Math.cos(a) * eyeR, eyeY + Math.sin(a) * eyeR, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(eyeX - 18, h);
        ctx.lineTo(eyeX, eyeY);
        ctx.lineTo(eyeX + 18, h);
        ctx.stroke();

        // 4. Brooklyn Bridge Gothic suspension arches on the right
        const brX = Math.min(w - 220, w * 0.72);
        const brY = h;
        const towerH = 140;
        ctx.fillStyle = 'rgba(30, 64, 175, 0.14)';
        ctx.fillRect(brX, brY - towerH, 22, towerH);
        ctx.fillRect(brX + 100, brY - towerH, 22, towerH);
        ctx.strokeStyle = 'rgba(30, 64, 175, 0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(brX + 11, brY - towerH);
        ctx.quadraticCurveTo(brX + 61, brY - 45, brX + 111, brY - towerH);
        ctx.stroke();
        ctx.fillRect(brX - 30, brY - 40, 180, 6);

      } else if (this.theme === 'ko') {
        // Detailed Gyeongbokgung Palace (Hanok curved roofs) + Namsan Seoul Tower silhouette
        // 1. Namsan Seoul Tower
        const towerX = Math.min(w - 140, w * 0.82);
        const towerBaseY = h;
        ctx.fillStyle = 'rgba(236, 72, 153, 0.14)';
        ctx.fillRect(towerX - 4, towerBaseY - 180, 8, 180);
        ctx.fillRect(towerX - 14, towerBaseY - 145, 28, 16);
        ctx.fillRect(towerX - 10, towerBaseY - 128, 20, 8);
        ctx.fillRect(towerX - 1.5, towerBaseY - 215, 3, 35);
        ctx.fillStyle = 'rgba(236, 72, 153, 0.65)';
        ctx.beginPath();
        ctx.arc(towerX, towerBaseY - 215, 4, 0, Math.PI * 2);
        ctx.fill();

        // 2. Gyeongbokgung Palace Pavilion (Gyeonghoeru Hanok roof)
        const pX = Math.max(30, w * 0.1);
        const pY = h;
        ctx.fillStyle = 'rgba(236, 72, 153, 0.12)';
        ctx.fillRect(pX, pY - 24, 220, 24);
        for (let col = 0; col < 6; col++) {
          ctx.fillRect(pX + 20 + col * 36, pY - 70, 7, 46);
        }
        ctx.beginPath();
        ctx.moveTo(pX - 15, pY - 70);
        ctx.quadraticCurveTo(pX + 110, pY - 88, pX + 235, pY - 70);
        ctx.lineTo(pX + 215, pY - 92);
        ctx.quadraticCurveTo(pX + 110, pY - 102, pX + 5, pY - 92);
        ctx.closePath();
        ctx.fill();

        for (let col = 0; col < 4; col++) {
          ctx.fillRect(pX + 50 + col * 36, pY - 118, 6, 26);
        }
        ctx.beginPath();
        ctx.moveTo(pX + 10, pY - 118);
        ctx.quadraticCurveTo(pX + 110, pY - 140, pX + 210, pY - 118);
        ctx.lineTo(pX + 195, pY - 142);
        ctx.quadraticCurveTo(pX + 110, pY - 158, pX + 25, pY - 142);
        ctx.closePath();
        ctx.fill();

        // Fortress wall
        ctx.fillStyle = 'rgba(236, 72, 153, 0.08)';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, h - 35);
        ctx.quadraticCurveTo(w * 0.35, h - 55, w * 0.65, h - 30);
        ctx.lineTo(w, h - 45);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();

      } else if (this.theme === 'zh') {
        // Detailed Misty Ink-Wash Mountains + Multi-tier Pagoda silhouette + arched moon bridge
        // 1. Layered Karst Mountains
        ctx.fillStyle = 'rgba(220, 38, 38, 0.05)';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.quadraticCurveTo(w * 0.2, h - 220, w * 0.45, h);
        ctx.quadraticCurveTo(w * 0.7, h - 190, w, h);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(220, 38, 38, 0.08)';
        ctx.beginPath();
        ctx.moveTo(w * 0.05, h);
        ctx.quadraticCurveTo(w * 0.28, h - 160, w * 0.52, h);
        ctx.closePath();
        ctx.fill();

        // 2. 5-Tier Chinese Pagoda with upturned flying eaves & spire
        const pagodaX = Math.min(w - 160, w * 0.82);
        const pagodaBaseY = h - 25;
        ctx.fillStyle = 'rgba(220, 38, 38, 0.16)';
        for (let tier = 0; tier < 5; tier++) {
          const tierY = pagodaBaseY - tier * 24;
          const tierW = 56 - tier * 8;
          ctx.fillRect(pagodaX - tierW / 2 + 6, tierY - 12, tierW - 12, 12);
          ctx.beginPath();
          ctx.moveTo(pagodaX - tierW / 2 - 12, tierY - 16);
          ctx.quadraticCurveTo(pagodaX, tierY - 10, pagodaX + tierW / 2 + 12, tierY - 16);
          ctx.lineTo(pagodaX + tierW / 2 + 4, tierY - 21);
          ctx.quadraticCurveTo(pagodaX, tierY - 17, pagodaX - tierW / 2 - 4, tierY - 21);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillRect(pagodaX - 2, pagodaBaseY - 5 * 24 - 18, 4, 22);
        ctx.beginPath();
        ctx.arc(pagodaX, pagodaBaseY - 5 * 24 - 18, 4, 0, Math.PI * 2);
        ctx.fill();

        // 3. Moon Bridge arch
        const brX = Math.max(50, w * 0.16);
        const brY = h;
        ctx.fillStyle = 'rgba(220, 38, 38, 0.13)';
        ctx.beginPath();
        ctx.arc(brX + 75, brY, 75, Math.PI, 0);
        ctx.arc(brX + 75, brY, 52, 0, Math.PI, true);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },

    renderParticles() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      for (let p of this.particles) {
        if (this.theme === 'ja') {
          p.x += p.speedX + Math.sin(p.angle) * 0.5;
          p.y += p.speedY;
          p.angle += p.rotSpeed;
          if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
          if (p.x > w + 20) { p.x = -20; }

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (this.theme === 'en') {
          p.x += p.speedX;
          p.y += p.speedY;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
          ctx.save();
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (this.theme === 'ko') {
          p.x += p.speedX;
          p.y += p.speedY;
          p.angle += p.rotSpeed;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (this.theme === 'zh') {
          p.phase += p.swaySpeed;
          p.x += Math.sin(p.phase) * p.swayAmp;
          p.y += p.speedY;
          if (p.y < -30) { p.y = h + 30; p.x = Math.random() * w; }

          ctx.save();
          ctx.fillStyle = `rgba(220, 38, 38, ${p.alpha})`;
          ctx.beginPath();
          ctx.roundRect(p.x - p.width / 2, p.y, p.width, p.height, 4);
          ctx.fill();
          ctx.fillStyle = `rgba(251, 191, 36, ${p.alpha * 0.9})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y + p.height * 0.65, p.width * 0.28, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  };

  // REAL 60fps 2D Canvas Battle Arena Engine
  const BattleArena = {
    canvas: null,
    ctx: null,
    stage: null,
    questions: [],
    qIndex: 0,
    playerHearts: 3,
    bossMaxHp: 80,
    bossHp: 80,
    combo: 0,
    animId: null,
    projectiles: [],
    hitParticles: [],
    floatingTexts: [],
    screenShake: 0,
    bossHitTimer: 0,
    heroAttackTimer: 0,
    heroBob: 0,
    bossBob: 0,
    isAnswering: false,

    init(canvas) {
      if (!canvas || typeof canvas.getContext !== 'function') return;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
    },

    startBattle(stage) {
      this.stage = stage;
      this.questions = [...(stage.bossQuestions || [])];
      this.qIndex = 0;
      this.playerHearts = 3;
      this.bossMaxHp = stage.bossHp || 80;
      this.bossHp = this.bossMaxHp;
      this.combo = 0;
      this.projectiles = [];
      this.hitParticles = [];
      this.floatingTexts = [];
      this.screenShake = 0;
      this.isAnswering = false;

      if (DOM.battleBossName) {
        DOM.battleBossName.textContent = STATE.uiLang === 'vi' ? stage.bossNameVi : stage.bossNameEn;
      }
      this.updateHud();

      if (DOM.battleVictoryOverlay) DOM.battleVictoryOverlay.style.display = 'none';
      if (DOM.battleDefeatOverlay) DOM.battleDefeatOverlay.style.display = 'none';

      this.loadQuestion();
      this.startLoop();
    },

    updateHud() {
      if (DOM.battlePlayerHearts) {
        const hearts = DOM.battlePlayerHearts.querySelectorAll('.heart');
        hearts.forEach((h, i) => {
          h.classList.toggle('lost', i >= this.playerHearts);
        });
      }

      const pct = Math.max(0, Math.round((this.bossHp / this.bossMaxHp) * 100));
      if (DOM.battleBossHpFill) DOM.battleBossHpFill.style.width = `${pct}%`;
      if (DOM.battleBossHpText) DOM.battleBossHpText.textContent = `${Math.max(0, this.bossHp)} / ${this.bossMaxHp} HP`;
    },

    loadQuestion() {
      if (this.qIndex >= this.questions.length) {
        this.questions = [...(this.stage.bossQuestions || [])];
        this.qIndex = 0;
      }

      const q = this.questions[this.qIndex];
      if (!q) return;
      this.isAnswering = false;

      if (DOM.battleQuestionText) {
        DOM.battleQuestionText.textContent = STATE.uiLang === 'vi' ? q.promptVi : q.promptEn;
      }
      if (DOM.battleCueBadge) {
        DOM.battleCueBadge.textContent = q.cue || '';
      }

      if (DOM.battleAnswersGrid) {
        DOM.battleAnswersGrid.innerHTML = '';
        (q.options || []).forEach(opt => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'attack-choice-btn btn-tactile';
          btn.textContent = opt;
          btn.addEventListener('click', () => {
            this.handleAnswer(btn, opt, q);
          });
          DOM.battleAnswersGrid.appendChild(btn);
        });
      }

      if (DOM.btnBattleAudioPrompt) {
        DOM.btnBattleAudioPrompt.onclick = () => {
          playTargetLanguageAudio(q.cue || q.correct);
        };
      }
    },

    handleAnswer(btn, selected, q) {
      if (this.isAnswering) return;
      this.isAnswering = true;

      const isCorrect = selected === q.correct;
      const allBtns = DOM.battleAnswersGrid ? DOM.battleAnswersGrid.querySelectorAll('.attack-choice-btn') : [];

      if (isCorrect) {
        if (btn) {
          btn.classList.add('correct');
          btn.innerHTML = `✓ ${escapeHtml(selected)}`;
        }
        this.combo++;
        const isCrit = this.combo >= 2;
        const damage = isCrit ? 35 : 25;
        this.bossHp -= damage;
        this.heroAttackTimer = 16;

        if (isCrit) SoundFX.playCrit();
        else { SoundFX.playLaser(); setTimeout(() => SoundFX.playHit(), 180); }

        this.projectiles.push({
          x: 120,
          y: 145,
          targetX: 500,
          targetY: 145,
          speed: 24,
          radius: isCrit ? 12 : 8,
          damage: damage,
          isCrit: isCrit,
          color: isCrit ? '#f59e0b' : '#38bdf8'
        });

        this.updateHud();

        if (this.bossHp <= 0) {
          setTimeout(() => {
            this.handleVictory();
          }, 450);
          return;
        }

        this.qIndex++;
        setTimeout(() => this.loadQuestion(), 450);

      } else {
        if (btn) {
          btn.classList.add('wrong');
          btn.innerHTML = `✕ ${escapeHtml(selected)}`;
        }
        allBtns.forEach(b => {
          if (b.textContent.trim() === q.correct) {
            b.classList.add('correct');
          }
        });

        this.combo = 0;
        this.playerHearts--;
        SoundFX.playHurt();
        this.screenShake = 16;
        if (DOM.battleHitFlash) {
          DOM.battleHitFlash.classList.add('flash');
          setTimeout(() => DOM.battleHitFlash.classList.remove('flash'), 180);
        }

        this.floatingTexts.push({
          x: 110,
          y: 110,
          text: '-1 ❤️',
          color: '#ef4444',
          alpha: 1,
          vy: -1.2
        });

        this.updateHud();

        if (this.playerHearts <= 0) {
          setTimeout(() => {
            this.handleDefeat();
          }, 450);
          return;
        }

        this.qIndex++;
        setTimeout(() => this.loadQuestion(), 550);
      }
    },

    handleVictory() {
      SoundFX.playVictory();
      for (let i = 0; i < 40; i++) {
        this.hitParticles.push({
          x: 520,
          y: 130,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.5) * 12,
          radius: Math.random() * 6 + 3,
          color: Math.random() > 0.5 ? '#f59e0b' : '#ef4444',
          alpha: 1
        });
      }

      awardXP(50, STATE.uiLang === 'vi' ? 'Chiến thắng Boss Ải!' : 'Stage Boss Victory!');
      awardCoins(50, STATE.uiLang === 'vi' ? 'Chiến thắng Boss Ải!' : 'Stage Boss Victory!');
      markStageCompleted(this.stage.stageNum);

      if (DOM.battleVictoryOverlay) {
        DOM.battleVictoryOverlay.style.display = 'flex';
      }
    },

    handleDefeat() {
      if (DOM.battleDefeatOverlay) {
        DOM.battleDefeatOverlay.style.display = 'flex';
      }
    },

    startLoop() {
      if (this.animId) safeCAF(this.animId);
      const loop = () => {
        this.render();
        this.animId = safeRAF(loop);
      };
      this.animId = safeRAF(loop);
    },

    stopLoop() {
      if (this.animId) {
        safeCAF(this.animId);
        this.animId = null;
      }
    },

    render() {
      const ctx = this.ctx;
      if (!ctx || !this.canvas) return;
      const w = this.canvas.width;
      const h = this.canvas.height;

      ctx.save();
      if (this.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
        this.screenShake *= 0.88;
        if (this.screenShake < 0.5) this.screenShake = 0;
      }

      ctx.clearRect(0, 0, w, h);

      // Atmospheric Night/Twilight Arena Sky tailored to Country
      const theme = getThemeKey(STATE.currentLang);
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);

      if (theme === 'ja') {
        // Kyoto Moonlit Torii Twilight
        skyGrad.addColorStop(0, '#0f172a');
        skyGrad.addColorStop(0.6, '#2e1065');
        skyGrad.addColorStop(1, '#4c0519');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Radiant Moon
        ctx.fillStyle = 'rgba(254, 243, 199, 0.9)';
        ctx.shadowColor = 'rgba(254, 240, 138, 0.5)';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(w * 0.5, 45, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Silhouette of Mount Fuji in background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
        ctx.beginPath();
        ctx.moveTo(w * 0.25, h * 0.65);
        ctx.lineTo(w * 0.5, 55);
        ctx.lineTo(w * 0.75, h * 0.65);
        ctx.closePath();
        ctx.fill();

      } else if (theme === 'en') {
        // Moody Cobalt London Twilight with Big Ben glow
        skyGrad.addColorStop(0, '#020617');
        skyGrad.addColorStop(0.6, '#0f172a');
        skyGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Big Ben Tower silhouette
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(w * 0.48 - 12, 40, 24, h * 0.65 - 40);
        ctx.beginPath();
        ctx.moveTo(w * 0.48 - 14, 40);
        ctx.lineTo(w * 0.48, 15);
        ctx.lineTo(w * 0.48 + 14, 40);
        ctx.closePath();
        ctx.fill();
        // Golden glowing clock
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(w * 0.48, 50, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

      } else if (theme === 'ko') {
        // Seoul Hanok Twilight with Namsan Beacon
        skyGrad.addColorStop(0, '#09090b');
        skyGrad.addColorStop(0.6, '#1e1b4b');
        skyGrad.addColorStop(1, '#3b0764');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Radiant Violet Moon
        ctx.fillStyle = 'rgba(244, 232, 255, 0.85)';
        ctx.shadowColor = 'rgba(192, 132, 252, 0.5)';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(w * 0.5, 45, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

      } else {
        // Misty Karst Pagoda Chinese Twilight
        skyGrad.addColorStop(0, '#06101e');
        skyGrad.addColorStop(0.6, '#0f172a');
        skyGrad.addColorStop(1, '#1c1917');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Floating Sky Lanterns in background
        ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
        ctx.shadowBlur = 10;
        [[w * 0.35, 40], [w * 0.5, 25], [w * 0.65, 50]].forEach(([lx, ly]) => {
          ctx.fillRect(lx - 5, ly - 7, 10, 14);
        });
        ctx.shadowBlur = 0;
      }

      // Battle Floor Platform (Perspective Stone Pavers / Glowing Battle Grid)
      const floorY = h * 0.62;
      const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
      floorGrad.addColorStop(0, '#1e293b');
      floorGrad.addColorStop(0.4, '#0f172a');
      floorGrad.addColorStop(1, '#020617');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, floorY, w, h - floorY);

      // Glowing Horizon Line
      ctx.strokeStyle = theme === 'ja' ? 'rgba(244, 63, 94, 0.45)' :
                        theme === 'en' ? 'rgba(56, 189, 248, 0.45)' :
                        theme === 'ko' ? 'rgba(236, 72, 153, 0.45)' : 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(w, floorY);
      ctx.stroke();

      // Perspective Grid Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      const vPointX = w * 0.5;
      for (let gx = -100; gx <= w + 100; gx += 50) {
        ctx.beginPath();
        ctx.moveTo(gx, h);
        ctx.lineTo(vPointX + (gx - vPointX) * 0.15, floorY);
        ctx.stroke();
      }
      [0.72, 0.84, 0.94].forEach(pct => {
        ctx.beginPath();
        ctx.moveTo(0, h * pct);
        ctx.lineTo(w, h * pct);
        ctx.stroke();
      });

      // Render Player Hero Knight / Shiba-Cat Mage
      this.heroBob = Math.sin(Date.now() * 0.005) * 4;
      const heroX = 110;
      const heroY = 155 + this.heroBob;
      const isAttacking = (this.heroAttackTimer || 0) > 0;
      if (this.heroAttackTimer > 0) this.heroAttackTimer--;

      this.renderHeroKnight(heroX, heroY, isAttacking);

      // Render Boss Sprite
      this.bossBob = Math.cos(Date.now() * 0.004) * 5;
      const bossX = 510;
      const bossY = 145 + this.bossBob;
      const isHit = this.bossHitTimer > 0;
      if (this.bossHitTimer > 0) this.bossHitTimer--;

      this.renderBossSprite(bossX, bossY, isHit);

      // Projectiles
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.x += p.speed;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (p.x >= p.targetX) {
          this.bossHitTimer = 8;
          for (let j = 0; j < 14; j++) {
            this.hitParticles.push({
              x: p.targetX,
              y: p.targetY,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              radius: Math.random() * 4 + 2,
              color: p.color,
              alpha: 1
            });
          }
          this.floatingTexts.push({
            x: p.targetX + (Math.random() - 0.5) * 30,
            y: p.targetY - 20,
            text: `-${p.damage}${p.isCrit ? ' CRIT!' : ''}`,
            color: p.isCrit ? '#d97706' : '#e11d48',
            alpha: 1,
            vy: -1.4
          });
          this.projectiles.splice(i, 1);
        }
      }

      // Hit Particles
      for (let i = this.hitParticles.length - 1; i >= 0; i--) {
        const pt = this.hitParticles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.04;
        if (pt.alpha <= 0) {
          this.hitParticles.splice(i, 1);
          continue;
        }
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Floating Texts
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.025;
        if (ft.alpha <= 0) {
          this.floatingTexts.splice(i, 1);
          continue;
        }
        ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = ft.alpha;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    },

    renderHeroKnight(x, y, isAttacking) {
      const ctx = this.ctx;
      ctx.save();

      // Floor Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(x, 200, 26, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Flowing Hero Cloak (fluttering in wind)
      const cloakFlap = Math.sin(Date.now() * 0.008) * 6;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 6);
      ctx.quadraticCurveTo(x - 30, y + 10 + cloakFlap, x - 34, y + 36 + cloakFlap);
      ctx.lineTo(x - 8, y + 26);
      ctx.closePath();
      ctx.fill();

      // Hero Body / Armor
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(x - 14, y - 4, 28, 30, 8);
      ctx.fill();

      // Golden Armor Insignia / Crest
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(x, y + 8, 5, 0, Math.PI * 2);
      ctx.fill();

      // Cute Hero Boots
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x - 6, y + 30, 5, 0, Math.PI * 2);
      ctx.arc(x + 6, y + 30, 5, 0, Math.PI * 2);
      ctx.fill();

      // Cute Fluffy Shiba/Cat Head
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x, y - 14, 20, 0, Math.PI * 2);
      ctx.fill();

      // Shiba Ears (pointing up with wiggle)
      const earWiggle = Math.sin(Date.now() * 0.006) * 2;
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(x - 16, y - 24);
      ctx.lineTo(x - 12 + earWiggle, y - 38);
      ctx.lineTo(x - 4, y - 28);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 4, y - 28);
      ctx.lineTo(x + 12 - earWiggle, y - 38);
      ctx.lineTo(x + 16, y - 24);
      ctx.closePath();
      ctx.fill();

      // Pink Inner Ear
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(x - 14, y - 26);
      ctx.lineTo(x - 12, y - 34);
      ctx.lineTo(x - 6, y - 28);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 6, y - 28);
      ctx.lineTo(x + 12, y - 34);
      ctx.lineTo(x + 14, y - 26);
      ctx.closePath();
      ctx.fill();

      // Anime Eyes with Glistening Catchlights
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x - 6, y - 14, 4, 0, Math.PI * 2);
      ctx.arc(x + 6, y - 14, 4, 0, Math.PI * 2);
      ctx.fill();
      // White Catchlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x - 7, y - 16, 1.8, 0, Math.PI * 2);
      ctx.arc(x + 5, y - 16, 1.8, 0, Math.PI * 2);
      ctx.arc(x - 5, y - 13, 0.9, 0, Math.PI * 2);
      ctx.arc(x + 7, y - 13, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Blush Cheeks
      ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
      ctx.beginPath();
      ctx.arc(x - 11, y - 9, 3.5, 0, Math.PI * 2);
      ctx.arc(x + 11, y - 9, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Cute Smile
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y - 8, 3, 0.1, Math.PI - 0.1);
      ctx.stroke();

      // Held Glowing Magic Staff / Knight Sword
      if (isAttacking) {
        // Attack Swing Forward
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 4);
        ctx.lineTo(x + 38, y - 8);
        ctx.stroke();

        // Energy Arc Slash
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(x + 28, y - 6, 26, -0.6, 1.2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Idle Weapon Stance
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(x + 14, y + 16);
        ctx.lineTo(x + 20, y - 18);
        ctx.stroke();

        // Glowing Crystal Tip
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x + 20, y - 20, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    },

    renderBossSprite(x, y, isHit) {
      const ctx = this.ctx;
      const bType = (this.stage && this.stage.bossType) || 'slime';

      ctx.save();

      // Floor Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(x, 202, 38, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      if (isHit) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20;
      }

      if (bType === 'slime') {
        // Slime: Crowned Glossy Jelly with Squash-and-Stretch Wobble
        const wobble = Math.sin(Date.now() * 0.006) * 3;
        if (!isHit) {
          const sGrad = ctx.createRadialGradient(x - 8, y + 2, 6, x, y + 8, 38);
          sGrad.addColorStop(0, '#34d399');
          sGrad.addColorStop(1, '#059669');
          ctx.fillStyle = sGrad;
        }
        ctx.beginPath();
        ctx.ellipse(x, y + 10, 40 + wobble, 32 - wobble, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glossy bubble reflections
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.ellipse(x - 14, y - 4, 12, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 16, y - 2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Angry Slanted Eyes
        ctx.fillStyle = isHit ? '#ffffff' : '#064e3b';
        ctx.beginPath();
        ctx.arc(x - 14, y + 8, 5, 0, Math.PI * 2);
        ctx.arc(x + 14, y + 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - 12, y + 6, 2, 0, Math.PI * 2);
        ctx.arc(x + 16, y + 6, 2, 0, Math.PI * 2);
        ctx.fill();

        // Royal Golden Crown with Rubies
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(x - 18, y - 20);
        ctx.lineTo(x - 22, y - 36);
        ctx.lineTo(x - 8, y - 28);
        ctx.lineTo(x, y - 40);
        ctx.lineTo(x + 8, y - 28);
        ctx.lineTo(x + 22, y - 36);
        ctx.lineTo(x + 18, y - 20);
        ctx.closePath();
        ctx.fill();
        // Red Ruby Gems
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y - 26, 3, 0, Math.PI * 2);
        ctx.arc(x - 14, y - 24, 2.5, 0, Math.PI * 2);
        ctx.arc(x + 14, y - 24, 2.5, 0, Math.PI * 2);
        ctx.fill();

      } else if (bType === 'kitsune') {
        // Kitsune: 3-Tailed Mystic Fox with 3 Orbiting Fox-Fire Wisps
        // 3 Animated Swaying Tails
        const tTime = Date.now() * 0.005;
        [-0.4, 0, 0.4].forEach((angleOffset, idx) => {
          const tWiggle = Math.sin(tTime + idx * 1.2) * 8;
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.moveTo(x - 8, y + 16);
          ctx.quadraticCurveTo(x + 35 + tWiggle, y + angleOffset * 60, x + 55 + tWiggle, y - 20 + angleOffset * 40);
          ctx.quadraticCurveTo(x + 30, y + 30, x - 8, y + 24);
          ctx.closePath();
          ctx.fill();
          // White tail tip
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x + 55 + tWiggle, y - 20 + angleOffset * 40, 8, 0, Math.PI * 2);
          ctx.fill();
        });

        // Mystic Fox Head
        if (!isHit) ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(x - 30, y - 10);
        ctx.lineTo(x, y + 28);
        ctx.lineTo(x + 30, y - 10);
        ctx.closePath();
        ctx.fill();

        // Pointed Ears with Black Tips
        ctx.fillStyle = '#c2410c';
        ctx.beginPath();
        ctx.moveTo(x - 28, y - 10);
        ctx.lineTo(x - 20, y - 46);
        ctx.lineTo(x - 4, y - 14);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 28, y - 10);
        ctx.lineTo(x + 20, y - 46);
        ctx.lineTo(x + 4, y - 14);
        ctx.closePath();
        ctx.fill();

        // Ceremonial Forehead Markings
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(x, y - 4, 4, 0, Math.PI * 2);
        ctx.fill();

        // Sharp Mask Eyes
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(x - 12, y + 6, 6, 2.5, 0.2, 0, Math.PI * 2);
        ctx.ellipse(x + 12, y + 6, 6, 2.5, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // 3 Animated Orbiting Fox-Fire Spirit Wisps
        for (let i = 0; i < 3; i++) {
          const wAngle = tTime * 1.5 + (i * Math.PI * 2) / 3;
          const wX = x + Math.cos(wAngle) * 48;
          const wY = y + Math.sin(wAngle) * 26;
          ctx.fillStyle = 'rgba(6, 182, 212, 0.85)';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(wX, wY, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

      } else if (bType === 'golem') {
        // Golem: Cracked Granite Titan with Glowing Neon Rune Fissures
        if (!isHit) ctx.fillStyle = '#475569';
        // Massive Torso
        ctx.beginPath();
        ctx.roundRect(x - 38, y - 20, 76, 56, 14);
        ctx.fill();
        // Head
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(x - 22, y - 46, 44, 28, 8);
        ctx.fill();

        // Glowing Rune Energy Cracks
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(x - 26, y - 6);
        ctx.lineTo(x - 8, y + 12);
        ctx.lineTo(x + 6, y - 2);
        ctx.lineTo(x + 24, y + 16);
        ctx.stroke();

        // Glowing Core Eye in Chest
        const pulse = Math.sin(Date.now() * 0.008) * 3;
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(x, y + 10, 10 + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(x, y + 10, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Hovering Stone Fists
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.roundRect(x - 56, y + 8, 16, 22, 6);
        ctx.roundRect(x + 40, y + 8, 16, 22, 6);
        ctx.fill();

      } else if (bType === 'oni') {
        // Oni: Fierce Red Demon with Spiked Kanabo Club & Fangs
        if (!isHit) ctx.fillStyle = '#b91c1c';
        // Muscular Body
        ctx.beginPath();
        ctx.roundRect(x - 34, y - 16, 68, 56, 16);
        ctx.fill();

        // Sharp Ivory Horns
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(x - 22, y - 16);
        ctx.lineTo(x - 28, y - 48);
        ctx.lineTo(x - 10, y - 20);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 22, y - 16);
        ctx.lineTo(x + 28, y - 48);
        ctx.lineTo(x + 10, y - 20);
        ctx.closePath();
        ctx.fill();

        // Glowing Yellow Eyes
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(x - 12, y + 2, 5, 0, Math.PI * 2);
        ctx.arc(x + 12, y + 2, 5, 0, Math.PI * 2);
        ctx.fill();

        // Sharp Lower Fangs
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x - 8, y + 24);
        ctx.lineTo(x - 5, y + 14);
        ctx.lineTo(x - 2, y + 24);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 24);
        ctx.lineTo(x + 5, y + 14);
        ctx.lineTo(x + 8, y + 24);
        ctx.closePath();
        ctx.fill();

        // Heavy Spiked Iron Kanabo Club resting on shoulder
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(x + 24, y + 36);
        ctx.lineTo(x + 44, y - 36);
        ctx.lineTo(x + 52, y - 32);
        ctx.lineTo(x + 30, y + 40);
        ctx.closePath();
        ctx.fill();
        // Spikes on club
        ctx.fillStyle = '#94a3b8';
        [-20, -6, 8].forEach(sy => {
          ctx.beginPath();
          ctx.arc(x + 42, y + sy, 3, 0, Math.PI * 2);
          ctx.fill();
        });

      } else if (bType === 'dragon') {
        // Dragon: Winged Oriental Dragon with Antlers, Whiskers & Scales
        if (!isHit) {
          const dGrad = ctx.createLinearGradient(x - 30, y, x + 30, y);
          dGrad.addColorStop(0, '#dc2626');
          dGrad.addColorStop(1, '#991b1b');
          ctx.fillStyle = dGrad;
        }
        // Coiling Body
        ctx.beginPath();
        ctx.arc(x, y + 6, 38, 0, Math.PI * 2);
        ctx.fill();

        // Coiling Dragon Tail
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(x + 30, y + 14);
        ctx.quadraticCurveTo(x + 56, y + 28, x + 62, y - 6);
        ctx.stroke();

        // Golden Antlers
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(x - 10, y - 28);
        ctx.lineTo(x - 22, y - 56);
        ctx.lineTo(x - 4, y - 34);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 10, y - 28);
        ctx.lineTo(x + 22, y - 56);
        ctx.lineTo(x + 4, y - 34);
        ctx.closePath();
        ctx.fill();

        // Piercing Emerald Eyes
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x - 14, y - 2, 5, 0, Math.PI * 2);
        ctx.arc(x + 14, y - 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Long Imperial Whiskers
        const wSway = Math.sin(Date.now() * 0.007) * 4;
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 18, y + 14);
        ctx.quadraticCurveTo(x - 40, y + 20 + wSway, x - 54, y + 6 + wSway);
        ctx.moveTo(x + 18, y + 14);
        ctx.quadraticCurveTo(x + 40, y + 20 - wSway, x + 54, y + 6 - wSway);
        ctx.stroke();

        // Small flame spark escaping snout
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(x + Math.sin(Date.now() * 0.01) * 6, y + 36, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  };

  // Campaign & 5-Stage Guided Quest Path Controller
  function getCampaignProgress() {
    try {
      const raw = localStorage.getItem('lingua_campaign_progress');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      'ja': { unlocked: 1, completed: [] },
      'en': { unlocked: 1, completed: [] },
      'ko': { unlocked: 1, completed: [] },
      'zh': { unlocked: 1, completed: [] }
    };
  }

  function saveCampaignProgress(prog) {
    try {
      localStorage.setItem('lingua_campaign_progress', JSON.stringify(prog));
    } catch (e) {}
  }

  function markStageCompleted(stageNum) {
    const themeKey = getThemeKey(STATE.currentLang);
    const prog = getCampaignProgress();
    if (!prog[themeKey]) prog[themeKey] = { unlocked: 1, completed: [] };

    if (!prog[themeKey].completed.includes(stageNum)) {
      prog[themeKey].completed.push(stageNum);
    }
    if (stageNum >= prog[themeKey].unlocked && stageNum < 5) {
      prog[themeKey].unlocked = stageNum + 1;
    }
    saveCampaignProgress(prog);
    renderCampaignPath();
  }

  function renderCampaignPath() {
    const themeKey = getThemeKey(STATE.currentLang);
    const campaigns = (typeof window !== 'undefined' && (window.QUEST_CAMPAIGNS || QUEST_CAMPAIGNS)) ||
                      (typeof QUEST_CAMPAIGNS !== 'undefined' ? QUEST_CAMPAIGNS : {});
    const stages = campaigns[STATE.currentLang] || campaigns[themeKey] || [];
    const prog = getCampaignProgress();
    const currentProg = prog[themeKey] || { unlocked: 1, completed: [] };

    const themeTitles = {
      'ja': { badge: '🇯🇵 Xứ Sở Hoa Anh Đào & Núi Phú Sĩ', name: 'Tiếng Nhật (Nihongo)' },
      'en': { badge: '🇺🇸 Thành Phố Không Ngủ & Studio Hiện Đại', name: 'Tiếng Anh (English)' },
      'ko': { badge: '🇰🇷 Seoul Dancheong & Tháp Namsan', name: 'Tiếng Hàn (Hangul)' },
      'zh': { badge: '🇨🇳 Thủy Mặc Giang Nam & Lễ Hội Hoa Đăng', name: 'Tiếng Trung (Zhongwen)' }
    };

    if (DOM.campaignThemeBadge && themeTitles[themeKey]) {
      DOM.campaignThemeBadge.textContent = themeTitles[themeKey].badge;
    }
    if (DOM.campaignCurrentLangLabel && themeTitles[themeKey]) {
      DOM.campaignCurrentLangLabel.textContent = themeTitles[themeKey].name;
    }

    const totalStages = stages.length || 12;
    const completedCount = currentProg.completed ? currentProg.completed.length : 0;
    const progressPercent = Math.min(100, Math.round((completedCount / totalStages) * 100));
    if (DOM.campaignProgressText) {
      DOM.campaignProgressText.textContent = STATE.uiLang === 'vi' 
        ? `Tiến độ: ${completedCount} / ${totalStages} ải (Đạt ${progressPercent}%)` 
        : `Progress: ${completedCount} / ${totalStages} stages (${progressPercent}%)`;
    }
    if (DOM.campaignTrackFill) {
      DOM.campaignTrackFill.style.width = `${Math.max(6, progressPercent)}%`;
    }

    // Render Quest Nodes into #questNodesList
    if (!DOM.questNodesList) return;
    DOM.questNodesList.innerHTML = '';

    // Node coordinate map along winding 2400px SVG path
    const nodeCoords = [
      { top: 60, left: 50 },
      { top: 230, left: 80 },
      { top: 410, left: 20 },
      { top: 590, left: 80 },
      { top: 770, left: 50 },
      { top: 1000, left: 20 },
      { top: 1180, left: 80 },
      { top: 1360, left: 25 },
      { top: 1540, left: 50 },
      { top: 1770, left: 80 },
      { top: 1950, left: 20 },
      { top: 2150, left: 50 }
    ];

    const chapterDefinitions = [
      { atIdx: 0, top: 0, vi: 'Chương 1: Nền tảng Chữ cái & Âm vị', en: 'Chapter 1: Alphabet & Phonetics' },
      { atIdx: 5, top: 890, vi: 'Chương 2: Từ vựng & Cụm từ sống còn', en: 'Chapter 2: Essential Chunks & Everyday Words' },
      { atIdx: 9, top: 1660, vi: 'Chương 3: Giao tiếp Thực chiến & Tiếng lóng', en: 'Chapter 3: Native Conversations & Slang' }
    ];

    stages.forEach((stage, idx) => {
      // Insert Chapter Divider if matching index
      const chapter = chapterDefinitions.find(c => c.atIdx === idx);
      if (chapter) {
        const divEl = document.createElement('div');
        divEl.className = 'quest-chapter-divider tactile-card';
        divEl.style.position = 'absolute';
        divEl.style.top = `${chapter.top}px`;
        divEl.style.left = '50%';
        divEl.style.transform = 'translateX(-50%)';
        const chName = STATE.uiLang === 'vi' ? chapter.vi : chapter.en;
        divEl.innerHTML = `
          <div class="chapter-badge-title">
            <span class="chapter-number-pill">${idx === 0 ? 'CH 1' : idx === 5 ? 'CH 2' : 'CH 3'}</span>
            <span class="chapter-name-text">${escapeHtml(chName)}</span>
          </div>
          <span class="chapter-status-tag">${idx < completedCount ? '⭐ Đang học' : '🔒 Mục tiêu'}</span>
        `;
        DOM.questNodesList.appendChild(divEl);
      }

      const stageNum = stage.stageNum || idx + 1;
      const isCompleted = currentProg.completed && currentProg.completed.includes(stageNum);
      const isUnlocked = isCompleted || (stageNum <= currentProg.unlocked);

      const nodeWrap = document.createElement('div');
      nodeWrap.className = `quest-node-item node-${stageNum} ${isCompleted ? 'completed' : isUnlocked ? 'unlocked' : 'locked'}`;

      if (nodeCoords[idx]) {
        nodeWrap.style.top = `${nodeCoords[idx].top}px`;
        nodeWrap.style.left = `${nodeCoords[idx].left}%`;
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quest-node-btn btn-tactile';
      btn.innerHTML = isCompleted ? (stage.icon || '⭐') : isUnlocked ? (stage.icon || '⚔️') : '🔒';
      btn.title = STATE.uiLang === 'vi' ? stage.titleVi : stage.titleEn;

      if (isCompleted) {
        const star = document.createElement('div');
        star.className = 'node-star-badge';
        star.textContent = '⭐';
        btn.appendChild(star);
      }

      // Floating Info Card
      const infoCard = document.createElement('div');
      infoCard.className = 'quest-node-info-card';
      const stageTitle = STATE.uiLang === 'vi' ? stage.titleVi : stage.titleEn;
      const bossName = STATE.uiLang === 'vi' ? stage.bossNameVi : stage.bossNameEn;
      const actionText = isCompleted ? (STATE.uiLang === 'vi' ? 'Xem lại ⭐' : 'Review ⭐') : (isUnlocked ? (STATE.uiLang === 'vi' ? 'Bắt đầu ⚔️' : 'Play ⚔️') : '🔒 Khóa');

      infoCard.innerHTML = `
        <div class="node-info-title">${escapeHtml(stageTitle)}</div>
        <div class="node-info-boss">⚔️ ${escapeHtml(bossName)} • <span style="font-weight:800">${actionText}</span></div>
      `;

      const launchStage = () => {
        if (!isUnlocked) {
          showToast(STATE.uiLang === 'vi' ? 'Hãy hoàn thành ải trước đó để mở khóa ải này!' : 'Complete the previous stage to unlock this stage!', 'warning');
          return;
        }
        openQuestLessonModal(stage);
      };

      btn.addEventListener('click', launchStage);
      infoCard.addEventListener('click', launchStage);

      nodeWrap.appendChild(btn);
      nodeWrap.appendChild(infoCard);
      DOM.questNodesList.appendChild(nodeWrap);
    });
  }

  // 3-Step Playable Lesson Modal Controller
  let CURRENT_QUEST_STAGE = null;
  let CURRENT_QUEST_CHAR_INDEX = 0;

  function openQuestLessonModal(stage) {
    CURRENT_QUEST_STAGE = stage;
    CURRENT_QUEST_CHAR_INDEX = 0;

    if (DOM.questModalStageTag) DOM.questModalStageTag.textContent = `ẢI ${stage.stageNum}`;
    if (DOM.questModalTitle) DOM.questModalTitle.textContent = STATE.uiLang === 'vi' ? stage.titleVi : stage.titleEn;
    if (DOM.questStep1Desc) DOM.questStep1Desc.textContent = STATE.uiLang === 'vi' ? stage.descVi : stage.descEn;

    if (DOM.questPreviewGrid) {
      DOM.questPreviewGrid.innerHTML = '';
      (stage.items || []).forEach(item => {
        const card = document.createElement('div');
        card.className = 'quest-preview-card tactile-card';
        card.innerHTML = `
          <span class="preview-char">${escapeHtml(item.char)}</span>
          <span class="preview-reading">${escapeHtml(item.reading || '')}</span>
          <span class="preview-meaning">${escapeHtml(STATE.uiLang === 'vi' ? item.meaningVi : item.meaningEn)}</span>
        `;
        card.addEventListener('click', () => {
          playTargetLanguageAudio(item.char);
          SoundFX.playClick();
        });
        DOM.questPreviewGrid.appendChild(card);
      });
    }

    switchQuestStep(1);
    if (DOM.questModalOverlay) {
      DOM.questModalOverlay.classList.add('open');
      DOM.questModalOverlay.style.display = 'flex';
    }
  }

  function switchQuestStep(stepNum) {
    if (DOM.questStepDot1) {
      DOM.questStepDot1.classList.toggle('active', stepNum === 1);
      DOM.questStepDot1.classList.toggle('completed', stepNum > 1);
    }
    if (DOM.questStepDot2) {
      DOM.questStepDot2.classList.toggle('active', stepNum === 2);
      DOM.questStepDot2.classList.toggle('completed', stepNum > 2);
    }
    if (DOM.questStepDot3) {
      DOM.questStepDot3.classList.toggle('active', stepNum === 3);
      DOM.questStepDot3.classList.toggle('completed', stepNum > 3);
    }
    if (DOM.questStepDot4) {
      DOM.questStepDot4.classList.toggle('active', stepNum === 4);
    }

    if (DOM.questStep1Body) DOM.questStep1Body.style.display = stepNum === 1 ? 'block' : 'none';
    if (DOM.questStep2Body) DOM.questStep2Body.style.display = stepNum === 2 ? 'block' : 'none';
    if (DOM.questStep3Body) DOM.questStep3Body.style.display = stepNum === 3 ? 'block' : 'none';
    if (DOM.questStep4Body) DOM.questStep4Body.style.display = stepNum === 4 ? 'block' : 'none';

    if (stepNum === 2) {
      if (!questWritingPadInstance && DOM.questWritingCanvas) {
        questWritingPadInstance = new WritingPad(DOM.questWritingCanvas, DOM.canvasWatermarkGuide);
      }
      loadWritingChar();
    } else if (stepNum === 3) {
      BattleArena.stopLoop();
      WarmupQuiz.start(CURRENT_QUEST_STAGE);
    } else if (stepNum === 4) {
      if (DOM.bossBattleCanvas) {
        BattleArena.init(DOM.bossBattleCanvas);
        BattleArena.startBattle(CURRENT_QUEST_STAGE);
      }
    } else {
      BattleArena.stopLoop();
    }
  }


  // ==========================================================================
  // Daily Endless Drill Manager (Infinite Random Mixed Practice)
  // ==========================================================================
  const DailyDrillManager = {
    questions: [],
    currentIndex: 0,
    score: 0,
    totalQuestions: 10,
    answered: false,

    start() {
      this.currentIndex = 0;
      this.score = 0;
      this.answered = false;
      this.questions = this.generateQuestions();

      if (!this.questions.length) {
        showToast(STATE.uiLang === 'vi' ? 'Chưa đủ dữ liệu ôn tập cho ngôn ngữ này!' : 'Not enough drill data for this language!', 'warning');
        return;
      }

      const modal = document.getElementById('dailyDrillModalOverlay');
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('open');
      }

      const questionBox = document.getElementById('dailyDrillQuestionBox');
      const summaryCard = document.getElementById('dailyDrillSummaryCard');
      if (questionBox) questionBox.style.display = 'block';
      if (summaryCard) summaryCard.style.display = 'none';

      this.renderQuestion();
    },

    close() {
      const modal = document.getElementById('dailyDrillModalOverlay');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('open');
      }
    },

    generateQuestions() {
      const currentLang = STATE.currentLang;
      const langObj = (typeof LANG_DATA !== 'undefined' && (LANG_DATA[currentLang] || LANG_DATA[getThemeKey(currentLang)])) || {};
      const alphaData = langObj.alphabet || [];
      const phraseData = langObj.phrases || [];
      const exprData = langObj.expressions || [];

      let pool = [];
      if (Array.isArray(alphaData)) {
        alphaData.forEach(sub => {
          if (sub.items && Array.isArray(sub.items)) {
            pool.push(...sub.items);
          }
        });
      }
      if (Array.isArray(phraseData)) {
        phraseData.forEach(sub => {
          if (sub.items && Array.isArray(sub.items)) {
            pool.push(...sub.items);
          }
        });
      }
      if (Array.isArray(exprData)) {
        exprData.forEach(sub => {
          if (sub.items && Array.isArray(sub.items)) {
            pool.push(...sub.items);
          }
        });
      }

      if (pool.length < 4) {
        pool = [
          { char: 'あ', reading: 'a', meaningVi: 'Âm a', meaningEn: 'Sound a' },
          { char: 'い', reading: 'i', meaningVi: 'Âm i', meaningEn: 'Sound i' },
          { char: 'う', reading: 'u', meaningVi: 'Âm u', meaningEn: 'Sound u' },
          { char: 'え', reading: 'e', meaningVi: 'Âm e', meaningEn: 'Sound e' },
          { char: 'お', reading: 'o', meaningVi: 'Âm o', meaningEn: 'Sound o' }
        ];
      }

      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.min(this.totalQuestions, shuffled.length));

      return selected.map(item => {
        const correctText = STATE.uiLang === 'vi' 
          ? (item.meaningVi || item.meaning_vi || item.meaning || item.reading || item.romaji || item.char)
          : (item.meaningEn || item.meaning_en || item.meaning || item.reading || item.romaji || item.char);

        const distractors = pool
          .filter(p => p !== item)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .map(p => STATE.uiLang === 'vi' 
            ? (p.meaningVi || p.meaning_vi || p.meaning || p.reading || p.romaji || p.char)
            : (p.meaningEn || p.meaning_en || p.meaning || p.reading || p.romaji || p.char)
          );

        const options = Array.from(new Set([correctText, ...distractors])).sort(() => 0.5 - Math.random());

        return {
          prompt: item.char || item.text || item.phrase || item.word || '',
          reading: item.reading || item.romaji || item.ipa || '',
          correctText,
          options
        };
      });
    },

    renderQuestion() {
      if (this.currentIndex >= this.questions.length) {
        this.showSummary();
        return;
      }

      this.answered = false;
      const q = this.questions[this.currentIndex];

      const countBadge = document.getElementById('dailyDrillCountBadge');
      if (countBadge) countBadge.textContent = `${this.currentIndex + 1} / ${this.questions.length}`;

      const progressFill = document.getElementById('dailyDrillProgressFill');
      if (progressFill) {
        const pct = (this.currentIndex / this.questions.length) * 100;
        progressFill.style.width = `${pct}%`;
      }

      const promptTarget = document.getElementById('dailyDrillPromptTarget');
      if (promptTarget) promptTarget.textContent = q.prompt;

      const audioBtn = document.getElementById('btnDailyDrillAudio');
      if (audioBtn) {
        audioBtn.onclick = () => {
          playTargetLanguageAudio(q.prompt);
        };
      }

      const optionsContainer = document.getElementById('dailyDrillOptions');
      if (optionsContainer) {
        optionsContainer.innerHTML = '';
        q.options.forEach(opt => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'drill-option-btn';
          btn.textContent = opt;

          btn.addEventListener('click', () => {
            if (this.answered) return;
            this.answered = true;

            const isCorrect = opt === q.correctText;
            if (isCorrect) {
              btn.classList.add('correct');
              this.score++;
              SoundFX.playCorrect();
            } else {
              btn.classList.add('wrong');
              SoundFX.playWrong();
              optionsContainer.querySelectorAll('.drill-option-btn').forEach(b => {
                if (b.textContent === q.correctText) b.classList.add('correct');
              });
            }

            setTimeout(() => {
              this.currentIndex++;
              this.renderQuestion();
            }, 750);
          });

          optionsContainer.appendChild(btn);
        });
      }
    },

    showSummary() {
      const questionBox = document.getElementById('dailyDrillQuestionBox');
      const summaryCard = document.getElementById('dailyDrillSummaryCard');
      const progressFill = document.getElementById('dailyDrillProgressFill');
      if (progressFill) progressFill.style.width = '100%';

      if (questionBox) questionBox.style.display = 'none';
      if (summaryCard) summaryCard.style.display = 'block';

      const scoreMeta = document.getElementById('dailyDrillScoreMeta');
      if (scoreMeta) {
        scoreMeta.textContent = STATE.uiLang === 'vi'
          ? `Bạn đã hoàn thành xuất sắc: Đúng ${this.score} / ${this.questions.length} câu hỏi!`
          : `Great job! You got ${this.score} / ${this.questions.length} questions correct!`;
      }

      awardXP(30, 'Ôn tập hàng ngày');
      awardCoins(25, 'Ôn tập hàng ngày');
      SoundFX.playVictory();
    }
  };

  // Warm-up Quiz (Step 3) Engine
  const WarmupQuiz = {
    questions: [],
    currentIndex: 0,
    score: 0,
    stage: null,
    answered: false,

    start(stage) {
      this.stage = stage;
      this.currentIndex = 0;
      this.score = 0;
      this.answered = false;
      this.questions = this.generateQuestions(stage);

      if (DOM.warmupSuccessBanner) DOM.warmupSuccessBanner.style.display = 'none';
      if (DOM.btnQuestGoStep4) DOM.btnQuestGoStep4.disabled = true;

      this.renderQuestion();
    },

    generateQuestions(stage) {
      const items = (stage && stage.items && stage.items.length) ? stage.items : [
        { char: 'あ', reading: 'a', meaningVi: 'Âm a', meaningEn: 'Sound a' },
        { char: 'い', reading: 'i', meaningVi: 'Âm i', meaningEn: 'Sound i' },
        { char: 'う', reading: 'u', meaningVi: 'Âm u', meaningEn: 'Sound u' }
      ];

      return [0, 1, 2].map(idx => {
        const item = items[idx % items.length];
        const correct = item.reading || (STATE.uiLang === 'vi' ? item.meaningVi : item.meaningEn);

        // Generate 3 distractors
        const otherItems = items.filter(it => it.char !== item.char);
        const distractors = ['ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra']
          .filter(d => d !== correct)
          .slice(0, 3);

        const answers = [correct, ...distractors].sort(() => Math.random() - 0.5);
        return {
          char: item.char,
          speechText: item.char,
          correct: correct,
          answers: answers
        };
      });
    },

    renderQuestion() {
      if (this.currentIndex >= this.questions.length) {
        this.finishQuiz();
        return;
      }

      this.answered = false;
      const q = this.questions[this.currentIndex];

      if (DOM.warmupCounterText) {
        DOM.warmupCounterText.textContent = `Câu ${this.currentIndex + 1} / ${this.questions.length}`;
      }
      if (DOM.warmupProgressFill) {
        const pct = Math.round(((this.currentIndex) / this.questions.length) * 100);
        DOM.warmupProgressFill.style.width = `${Math.max(10, pct)}%`;
      }
      if (DOM.warmupCueBadge) {
        DOM.warmupCueBadge.textContent = q.char;
      }
      if (DOM.btnWarmupAudioPrompt) {
        DOM.btnWarmupAudioPrompt.onclick = () => {
          speakText(q.speechText, STATE.currentLang, 1.0);
        };
      }

      if (DOM.warmupAnswersGrid) {
        DOM.warmupAnswersGrid.innerHTML = '';
        q.answers.forEach(ans => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'warmup-answer-btn';
          btn.textContent = ans;

          btn.addEventListener('click', () => {
            if (this.answered) return;
            this.handleAnswer(btn, ans === q.correct, q.correct);
          });

          DOM.warmupAnswersGrid.appendChild(btn);
        });
      }
    },

    handleAnswer(btn, isCorrect, correctAns) {
      this.answered = true;

      if (isCorrect) {
        btn.classList.add('correct');
        SoundFX.playLaser();
        this.score++;
      } else {
        btn.classList.add('wrong');
        SoundFX.playHit();
        // Highlight correct button
        if (DOM.warmupAnswersGrid) {
          DOM.warmupAnswersGrid.querySelectorAll('.warmup-answer-btn').forEach(b => {
            if (b.textContent === correctAns) b.classList.add('correct');
          });
        }
      }

      setTimeout(() => {
        this.currentIndex++;
        this.renderQuestion();
      }, 700);
    },

    finishQuiz() {
      if (DOM.warmupProgressFill) DOM.warmupProgressFill.style.width = '100%';
      if (DOM.warmupSuccessBanner) DOM.warmupSuccessBanner.style.display = 'block';
      if (DOM.btnQuestGoStep4) DOM.btnQuestGoStep4.disabled = false;

      awardXP(20, STATE.uiLang === 'vi' ? 'Hoàn thành Khởi động ải' : 'Warm-up Complete');
      awardCoins(20, STATE.uiLang === 'vi' ? 'Hoàn thành Khởi động ải' : 'Warm-up Complete');
      SoundFX.playVictory();
    }
  };

  function loadWritingChar() {
    if (!CURRENT_QUEST_STAGE || !CURRENT_QUEST_STAGE.items) return;
    const items = CURRENT_QUEST_STAGE.items;
    if (CURRENT_QUEST_CHAR_INDEX < 0) CURRENT_QUEST_CHAR_INDEX = 0;
    if (CURRENT_QUEST_CHAR_INDEX >= items.length) CURRENT_QUEST_CHAR_INDEX = items.length - 1;

    const item = items[CURRENT_QUEST_CHAR_INDEX];
    if (!item) return;

    if (DOM.writingTargetChar) DOM.writingTargetChar.textContent = item.char;
    if (DOM.writingTargetReading) DOM.writingTargetReading.textContent = item.reading || '';
    if (DOM.writingTargetMeaning) DOM.writingTargetMeaning.textContent = STATE.uiLang === 'vi' ? item.meaningVi : item.meaningEn;

    if (questWritingPadInstance) {
      questWritingPadInstance.clear();
      questWritingPadInstance.setGuide(item.char);
    }
  }

  function closeQuestModal() {
    BattleArena.stopLoop();
    if (DOM.questModalOverlay) {
      DOM.questModalOverlay.classList.remove('open');
      DOM.questModalOverlay.style.display = 'none';
    }
  }


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
    STATE.currentSelectedLabSentenceId = null;
    STATE.currentLabCustomSentence = null;

    applyCulturalTheme(langCode);
    updateDropdownTriggerUI();
    renderLangDropdownMenu();
    toggleLanguageDropdown(false);

    // Re-render Tab content AND update Tab 3 immediately!
    renderActiveTab();
    renderTabLab();
    renderCampaignPath();

    // Show toast confirmation
    const lang = getLanguageInfo(langCode);
    const name = STATE.uiLang === 'vi' ? lang.nameVi : lang.nameEn;
    showToast(`${lang.flag} ${STATE.uiLang === 'vi' ? 'Đã chuyển sang' : 'Switched to'} ${name}`);
  }

  // ==========================================================================
  // Gamification & Habit Loop System (Duolingo & Renshuu inspired)
  // ==========================================================================

  function saveGamification() {
    try {
      localStorage.setItem('lingua_gamification', JSON.stringify(STATE.gamification));
    } catch (e) {}
  }

  function checkAndUpdateDailyStreak() {
    const today = new Date().toISOString().slice(0, 10);
    const last = STATE.gamification.lastActiveDate;
    if (!last) {
      STATE.gamification.lastActiveDate = today;
      STATE.gamification.streak = 1;
    } else if (last !== today) {
      const lastDate = new Date(last);
      const currentDate = new Date(today);
      const diffTime = Math.abs(currentDate - lastDate);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        STATE.gamification.streak = (STATE.gamification.streak || 0) + 1;
      } else if (diffDays > 1) {
        STATE.gamification.streak = 1;
      }
      STATE.gamification.lastActiveDate = today;
    }
    saveGamification();
    updateGamificationUI();
  }

  function awardXP(amount, reason = '') {
    if (typeof STATE.gamification.xp !== 'number') STATE.gamification.xp = 0;
    STATE.gamification.xp += amount;
    STATE.gamification.level = Math.floor(STATE.gamification.xp / 100) + 1;
    saveGamification();
    updateGamificationUI();
    showFloatingXPToast(amount, reason);
    syncUserProfileToFirebase();
  }

  function awardCoins(amount, reason = '') {
    if (typeof STATE.coins !== 'number') STATE.coins = 0;
    STATE.coins += amount;
    localStorage.setItem('lingua_coins', String(STATE.coins));
    updateCoinsUI();
    showFloatingCoinsToast(amount, reason);
    SoundFX.playCoins();
    syncUserProfileToFirebase();
  }

  function updateCoinsUI() {
    if (DOM.coinsCount) DOM.coinsCount.textContent = STATE.coins || 0;
    if (DOM.shopCoinsBalance) DOM.shopCoinsBalance.textContent = STATE.coins || 0;
    if (DOM.profileModalStats) {
      DOM.profileModalStats.textContent = `Cấp ${STATE.gamification.level || 1} • ${STATE.gamification.xp || 0} XP • ${STATE.coins || 0} 🪙`;
    }
  }

  function showFloatingCoinsToast(amount, reason) {
    if (!DOM.xpToastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'xp-toast coin-toast';
    const reasonText = reason ? ` • ${reason}` : '';
    toast.textContent = `+${amount} 🪙${reasonText}`;
    toast.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
    toast.style.color = '#fff';
    toast.style.borderColor = '#b45309';
    DOM.xpToastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 1200);
  }

  // Cosmetics Shop System
  let activeShopTab = 'frames';

  function openShopModal() {
    if (!DOM.shopModalOverlay) return;
    updateCoinsUI();
    renderShopItems();
    DOM.shopModalOverlay.style.display = 'flex';
  }

  function closeShopModal() {
    if (DOM.shopModalOverlay) DOM.shopModalOverlay.style.display = 'none';
  }

  function renderShopItems() {
    if (!DOM.shopItemsGrid || typeof SHOP_ITEMS === 'undefined') return;

    if (DOM.shopTabFrames) DOM.shopTabFrames.classList.toggle('active', activeShopTab === 'frames');
    if (DOM.shopTabTitles) DOM.shopTabTitles.classList.toggle('active', activeShopTab === 'titles');

    const items = SHOP_ITEMS.filter(it => it.category === activeShopTab);
    DOM.shopItemsGrid.innerHTML = '';

    items.forEach(item => {
      const isOwned = (STATE.inventory[activeShopTab] || []).includes(item.id);
      const isEquipped = activeShopTab === 'frames'
        ? STATE.inventory.equippedFrame === item.id
        : STATE.inventory.equippedTitle === item.id;

      const card = document.createElement('div');
      card.className = 'shop-item-card';

      let previewHtml = '';
      if (item.category === 'frames') {
        previewHtml = `<div class="user-avatar-framed ${item.id}" style="width:48px; height:48px; font-size:1.6rem;"><span class="avatar-emoji">🦊</span></div>`;
      } else {
        previewHtml = `<div class="shop-item-preview"><span class="avatar-emoji">${item.icon}</span></div>`;
      }

      let actionBtnHtml = '';
      if (isEquipped) {
        actionBtnHtml = `<button type="button" class="btn-shop-action equipped" disabled>✓ Đang dùng</button>`;
      } else if (isOwned) {
        actionBtnHtml = `<button type="button" class="btn-shop-action equip" data-id="${item.id}" data-cat="${item.category}">Trang bị</button>`;
      } else {
        actionBtnHtml = `<button type="button" class="btn-shop-action buy" data-id="${item.id}" data-cat="${item.category}">Mua (${item.price} 🪙)</button>`;
      }

      const name = STATE.uiLang === 'vi' ? item.nameVi : item.nameEn;
      const desc = STATE.uiLang === 'vi' ? item.descVi : item.descEn;

      card.innerHTML = `
        <div class="shop-item-top">
          ${previewHtml}
          <div class="shop-item-meta">
            <h4 class="shop-item-name">${name}</h4>
            <p class="shop-item-desc">${desc}</p>
          </div>
        </div>
        <div class="shop-item-bottom">
          <span class="shop-item-price">${item.price} 🪙</span>
          ${actionBtnHtml}
        </div>
      `;

      DOM.shopItemsGrid.appendChild(card);
    });

    // Wire action buttons
    DOM.shopItemsGrid.querySelectorAll('.btn-shop-action.buy').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.id;
        const itemCat = btn.dataset.cat;
        buyShopItem(itemId, itemCat);
      });
    });

    DOM.shopItemsGrid.querySelectorAll('.btn-shop-action.equip').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.id;
        const itemCat = btn.dataset.cat;
        equipShopItem(itemId, itemCat);
      });
    });
  }

  function buyShopItem(itemId, itemCat) {
    const item = SHOP_ITEMS.find(it => it.id === itemId);
    if (!item) return;

    if ((STATE.coins || 0) < item.price) {
      showToast(STATE.uiLang === 'vi' ? 'Bạn không đủ Lingua Coins! Hãy làm thêm bài tập để tích lũy.' : 'Not enough Lingua Coins!', 'error');
      return;
    }

    STATE.coins -= item.price;
    localStorage.setItem('lingua_coins', String(STATE.coins));

    if (!STATE.inventory[itemCat]) STATE.inventory[itemCat] = [];
    if (!STATE.inventory[itemCat].includes(itemId)) {
      STATE.inventory[itemCat].push(itemId);
    }
    localStorage.setItem('lingua_inventory', JSON.stringify(STATE.inventory));

    SoundFX.playCoins();
    showToast(STATE.uiLang === 'vi' ? `Đã mua thành công ${item.nameVi}!` : `Purchased ${item.nameEn}!`);
    updateCoinsUI();
    renderShopItems();
    syncUserProfileToFirebase();
  }

  function equipShopItem(itemId, itemCat) {
    const item = SHOP_ITEMS.find(it => it.id === itemId);
    if (!item) return;

    if (itemCat === 'frames') {
      STATE.inventory.equippedFrame = itemId;
      STATE.userProfile.equippedFrame = itemId;
    } else {
      STATE.inventory.equippedTitle = itemId;
      STATE.userProfile.equippedTitle = itemId;
    }

    localStorage.setItem('lingua_inventory', JSON.stringify(STATE.inventory));
    localStorage.setItem('lingua_user_profile', JSON.stringify(STATE.userProfile));

    SoundFX.playClick();
    showToast(STATE.uiLang === 'vi' ? `Đã trang bị ${item.nameVi}!` : `Equipped ${item.nameEn}!`);
    updateUserProfileBadge();
    renderShopItems();
    syncUserProfileToFirebase();
  }

  function getEquippedTitleName() {
    if (typeof SHOP_ITEMS !== 'undefined') {
      const found = SHOP_ITEMS.find(it => it.id === (STATE.inventory ? STATE.inventory.equippedTitle : ''));
      if (found) return STATE.uiLang === 'vi' ? found.nameVi : found.nameEn;
    }
    return STATE.uiLang === 'vi' ? 'Tân thủ' : 'Novice';
  }

  function updateGamificationUI() {
    if (DOM.streakCount) DOM.streakCount.textContent = STATE.gamification.streak || 1;
    if (DOM.xpCount) DOM.xpCount.textContent = STATE.gamification.xp || 0;
    if (DOM.levelBadge) DOM.levelBadge.textContent = `Lv.${STATE.gamification.level || 1}`;
    if (DOM.masteryBarFill) {
      const xpInLevel = (STATE.gamification.xp || 0) % 100;
      DOM.masteryBarFill.style.width = `${xpInLevel}%`;
    }
  }

  function showFloatingXPToast(amount, reason) {
    if (!DOM.xpToastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'xp-toast';
    const reasonText = reason ? ` • ${reason}` : '';
    toast.textContent = `+${amount} XP${reasonText}`;
    DOM.xpToastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 1200);
  }

  function trackItemPractice(key, label) {
    if (!key) return;
    if (!STATE.gamification.practicedItems) STATE.gamification.practicedItems = [];
    if (!STATE.gamification.practicedItems.includes(key)) {
      STATE.gamification.practicedItems.push(key);
      // Passive XP farming removed per strict XP rules
    }
  }

  // ==========================================================================
  // Active Recall Quiz Engine (Tab 1 & Tab 2 Quick Drills)
  // ==========================================================================

  function startSoundQuiz() {
    const langData = LANG_DATA[STATE.currentLang];
    if (!langData || !langData.alphabet) {
      showToast(STATE.uiLang === 'vi' ? 'Chưa có dữ liệu bảng âm.' : 'No alphabet data available.');
      return;
    }

    const alphabetTabs = normalizeAlphabetData(langData.alphabet);
    const pool = [];
    alphabetTabs.forEach(sub => {
      (sub.items || []).forEach(it => {
        if (it && it.char) pool.push(it);
      });
    });

    if (pool.length < 4) {
      showToast(STATE.uiLang === 'vi' ? 'Dữ liệu quá ít để tạo bài luyện.' : 'Not enough data for quiz.');
      return;
    }

    // Pick 5 random questions
    const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
    const questions = shuffledPool.slice(0, Math.min(5, shuffledPool.length)).map(target => {
      const distractors = pool.filter(it => it.char !== target.char).sort(() => 0.5 - Math.random()).slice(0, 3);
      const choices = [target, ...distractors].sort(() => 0.5 - Math.random());
      return {
        target,
        speechText: target.speechText || target.char,
        prompt: STATE.uiLang === 'vi' ? 'Nghe âm thanh và chọn chữ cái / ký tự đúng:' : 'Listen and choose the matching character:',
        choices: choices.map(c => ({
          display: c.char,
          phonetic: c.phonetic || c.romaji || (c.ipa ? `/${c.ipa}/` : ''),
          isCorrect: c.char === target.char,
          raw: c
        }))
      };
    });

    STATE.quiz = {
      active: true,
      type: 'sound',
      questions,
      currentIndex: 0,
      score: 0,
      streak: 0,
      maxStreak: 0,
      xpEarned: 0,
      missedItems: [],
      answered: false
    };

    openQuizModal();
  }

  function startExpQuiz() {
    const langData = LANG_DATA[STATE.currentLang];
    if (!langData) {
      showToast(STATE.uiLang === 'vi' ? 'Chưa có dữ liệu giao tiếp.' : 'No expression data available.');
      return;
    }

    const pool = [];
    (langData.phrases || []).forEach(p => {
      if (p.target) {
        pool.push({
          text: p.target,
          phonetic: p.phonetic || '',
          vi: p.vi,
          en: p.en,
          speechText: p.speechText || p.target
        });
      }
    });
    (langData.expressions || []).forEach(e => {
      if (e.casual && e.casual.text) {
        pool.push({
          text: e.casual.text,
          phonetic: e.casual.phonetic || '',
          vi: e.casual.vi,
          en: e.casual.en,
          speechText: e.casual.speechText || e.casual.text
        });
      }
      if (e.formal && e.formal.text) {
        pool.push({
          text: e.formal.text,
          phonetic: e.formal.phonetic || '',
          vi: e.formal.vi,
          en: e.formal.en,
          speechText: e.formal.speechText || e.formal.text
        });
      }
    });

    if (pool.length < 4) {
      showToast(STATE.uiLang === 'vi' ? 'Dữ liệu quá ít để tạo bài luyện.' : 'Not enough data for quiz.');
      return;
    }

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const questions = shuffled.slice(0, Math.min(5, shuffled.length)).map(target => {
      const distractors = pool.filter(p => p.text !== target.text).sort(() => 0.5 - Math.random()).slice(0, 3);
      const choices = [target, ...distractors].sort(() => 0.5 - Math.random());
      return {
        target,
        speechText: target.speechText || target.text,
        prompt: STATE.uiLang === 'vi' ? 'Nghe phát âm và chọn ý nghĩa chính xác:' : 'Listen and choose the correct meaning:',
        choices: choices.map(c => ({
          display: STATE.uiLang === 'vi' ? c.vi : c.en,
          phonetic: c.text,
          isCorrect: c.text === target.text,
          raw: c
        }))
      };
    });

    STATE.quiz = {
      active: true,
      type: 'expression',
      questions,
      currentIndex: 0,
      score: 0,
      streak: 0,
      maxStreak: 0,
      xpEarned: 0,
      missedItems: [],
      answered: false
    };

    openQuizModal();
  }

  function openQuizModal() {
    if (!DOM.quizModalOverlay) return;
    DOM.quizModalOverlay.style.display = 'flex';
    if (DOM.quizQuestionStage) DOM.quizQuestionStage.style.display = 'block';
    if (DOM.quizResultStage) DOM.quizResultStage.style.display = 'none';

    if (DOM.quizTypeBadge) {
      DOM.quizTypeBadge.textContent = STATE.quiz.type === 'sound'
        ? (STATE.uiLang === 'vi' ? '⚡ Phản xạ Âm & Chữ' : '⚡ Sound & Script Drill')
        : (STATE.uiLang === 'vi' ? '⚡ Phản xạ Giao tiếp' : '⚡ Expression Drill');
    }

    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    const q = STATE.quiz.questions[STATE.quiz.currentIndex];
    if (!q) {
      showQuizResults();
      return;
    }

    STATE.quiz.answered = false;

    // Progress fill & counter
    if (DOM.quizProgressFill) {
      const pct = ((STATE.quiz.currentIndex) / STATE.quiz.questions.length) * 100;
      DOM.quizProgressFill.style.width = `${pct}%`;
    }
    if (DOM.quizCounterBadge) {
      DOM.quizCounterBadge.textContent = `${STATE.uiLang === 'vi' ? 'Câu' : 'Question'} ${STATE.quiz.currentIndex + 1} / ${STATE.quiz.questions.length}`;
    }

    // Combo pill
    if (DOM.quizComboPill && DOM.quizComboCount) {
      if (STATE.quiz.streak >= 2) {
        DOM.quizComboPill.style.display = 'inline-flex';
        DOM.quizComboCount.textContent = STATE.quiz.streak;
      } else {
        DOM.quizComboPill.style.display = 'none';
      }
    }

    if (DOM.quizPromptText) DOM.quizPromptText.textContent = q.prompt;

    // Reset feedback banner
    if (DOM.quizFeedbackBanner) {
      DOM.quizFeedbackBanner.style.display = 'none';
      DOM.quizFeedbackBanner.className = 'quiz-feedback-banner';
    }

    // Auto play audio
    speakText(q.speechText, STATE.currentLang, 1.0);

    // Render choice buttons
    if (DOM.quizChoicesContainer) {
      DOM.quizChoicesContainer.innerHTML = '';
      q.choices.forEach(ch => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-choice-btn';
        btn.innerHTML = `<span class="quiz-choice-text">${ch.display}</span>${ch.phonetic ? `<span class="quiz-choice-phonetic">${ch.phonetic}</span>` : ''}`;

        btn.addEventListener('click', () => {
          handleQuizChoiceSelected(btn, ch, q);
        });

        DOM.quizChoicesContainer.appendChild(btn);
      });
    }
  }

  function handleQuizChoiceSelected(btn, choice, question) {
    if (STATE.quiz.answered) return;
    STATE.quiz.answered = true;

    // Disable all choice buttons
    if (DOM.quizChoicesContainer) {
      DOM.quizChoicesContainer.querySelectorAll('.quiz-choice-btn').forEach(b => b.disabled = true);
    }

    if (choice.isCorrect) {
      btn.classList.add('correct');
      STATE.quiz.score++;
      STATE.quiz.streak++;
      if (STATE.quiz.streak > STATE.quiz.maxStreak) {
        STATE.quiz.maxStreak = STATE.quiz.streak;
      }
      awardXP(10, STATE.uiLang === 'vi' ? 'Đúng câu hỏi quiz' : 'Correct quiz answer');
      STATE.quiz.xpEarned += 10;

      if (DOM.quizFeedbackBanner && DOM.quizFeedbackIcon && DOM.quizFeedbackMsg) {
        DOM.quizFeedbackBanner.className = 'quiz-feedback-banner correct';
        DOM.quizFeedbackIcon.textContent = '🎉';
        DOM.quizFeedbackMsg.textContent = STATE.uiLang === 'vi' ? 'Chính xác! (+10 XP)' : 'Correct! (+10 XP)';
        DOM.quizFeedbackBanner.style.display = 'flex';
      }

      setTimeout(() => {
        STATE.quiz.currentIndex++;
        renderQuizQuestion();
      }, 850);

    } else {
      btn.classList.add('incorrect');
      // Highlight the correct one
      if (DOM.quizChoicesContainer) {
        const buttons = DOM.quizChoicesContainer.querySelectorAll('.quiz-choice-btn');
        question.choices.forEach((c, idx) => {
          if (c.isCorrect && buttons[idx]) {
            buttons[idx].classList.add('correct');
          }
        });
      }

      STATE.quiz.streak = 0;
      if (DOM.quizComboPill) DOM.quizComboPill.style.display = 'none';

      // Auto-add to Weak Spots
      const missed = question.target;
      addToWeakSpotsAuto(missed);
      STATE.quiz.missedItems.push(missed);

      if (DOM.quizFeedbackBanner && DOM.quizFeedbackIcon && DOM.quizFeedbackMsg) {
        DOM.quizFeedbackBanner.className = 'quiz-feedback-banner incorrect';
        DOM.quizFeedbackIcon.textContent = '🎯';
        DOM.quizFeedbackMsg.textContent = STATE.uiLang === 'vi'
          ? 'Chưa chính xác! Đã thêm vào mục Cần sửa 🎯'
          : 'Not quite! Automatically added to Weak Spots 🎯';
        DOM.quizFeedbackBanner.style.display = 'flex';
      }

      setTimeout(() => {
        STATE.quiz.currentIndex++;
        renderQuizQuestion();
      }, 1400);
    }
  }

  function addToWeakSpotsAuto(item) {
    if (!item) return;
    const char = item.char || item.text;
    const romaji = item.phonetic || item.romaji || (item.ipa ? `/${item.ipa}/` : '');
    const vi = item.meaningVi || item.vi || (item.example ? (item.example.meaning_vi || item.example.vi) : '') || '';
    const en = item.meaningEn || item.en || (item.example ? (item.example.meaning_en || item.example.en) : '') || '';

    const exists = STATE.weakSpots.some(w => (w.char || w.text) === char);
    if (!exists) {
      STATE.weakSpots.push({
        char,
        romaji,
        vi,
        en,
        lang: STATE.currentLang,
        savedAt: Date.now()
      });
      localStorage.setItem('lingua_weak_spots', JSON.stringify(STATE.weakSpots));
      updateBadges();
    }
  }

  function showQuizResults() {
    if (DOM.quizQuestionStage) DOM.quizQuestionStage.style.display = 'none';
    if (DOM.quizResultStage) DOM.quizResultStage.style.display = 'flex';

    if (DOM.quizProgressFill) DOM.quizProgressFill.style.width = '100%';

    const total = STATE.quiz.questions.length;
    const score = STATE.quiz.score;

    if (DOM.quizResultScore) DOM.quizResultScore.textContent = `${score}/${total}`;
    if (DOM.quizResultXp) DOM.quizResultXp.textContent = `+${STATE.quiz.xpEarned} XP`;
    if (DOM.quizResultStreak) DOM.quizResultStreak.textContent = `${STATE.quiz.maxStreak}`;

    if (DOM.quizMissedAlert) {
      if (STATE.quiz.missedItems.length > 0) {
        DOM.quizMissedAlert.style.display = 'flex';
      } else {
        DOM.quizMissedAlert.style.display = 'none';
      }
    }

    if (score >= 4) {
      triggerConfettiBurst();
    }
  }

  function closeQuizModal() {
    if (DOM.quizModalOverlay) DOM.quizModalOverlay.style.display = 'none';
    if (DOM.quizFeedbackBanner) DOM.quizFeedbackBanner.style.display = 'none';
    STATE.quiz.active = false;
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

    const UtteranceClass = (typeof window !== 'undefined' && window.SpeechSynthesisUtterance) || (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null);
    if (!UtteranceClass) return;
    const utterance = new UtteranceClass(text);
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

  function normalizeAlphabetData(alphabetRaw) {
    if (!alphabetRaw) return [];

    // Case 1: Standard Array of Sub-tabs [{ id, labelVi, labelEn, items: [...] }]
    if (Array.isArray(alphabetRaw)) {
      return alphabetRaw.map(tab => ({
        id: tab.id,
        labelVi: tab.labelVi || tab.name_vi || tab.id,
        labelEn: tab.labelEn || tab.name_en || tab.id,
        descriptionVi: tab.descriptionVi || tab.description_vi || '',
        descriptionEn: tab.descriptionEn || tab.description_en || '',
        items: Array.isArray(tab.items) ? tab.items : []
      }));
    }

    // Case 2: Object with categories and items: { categories: [...], items: [...] }
    if (alphabetRaw.categories && Array.isArray(alphabetRaw.categories) && Array.isArray(alphabetRaw.items)) {
      return alphabetRaw.categories.map(cat => ({
        id: cat.id,
        labelVi: cat.name_vi || cat.labelVi || cat.id,
        labelEn: cat.name_en || cat.labelEn || cat.id,
        descriptionVi: cat.description_vi || cat.descriptionVi || '',
        descriptionEn: cat.description_en || cat.descriptionEn || '',
        items: alphabetRaw.items.filter(it => it.category === cat.id)
      }));
    }

    // Case 3: Object with category keys { [key]: [...] }
    if (typeof alphabetRaw === 'object') {
      return Object.keys(alphabetRaw).map(catKey => {
        const items = Array.isArray(alphabetRaw[catKey]) ? alphabetRaw[catKey] : [];
        return {
          id: catKey,
          labelVi: catKey,
          labelEn: catKey,
          descriptionVi: '',
          descriptionEn: '',
          items: items
        };
      });
    }

    return [];
  }

  function renderTabAlphabet() {
    const langData = LANG_DATA[STATE.currentLang];
    if (!langData || !langData.alphabet) return;

    const subTabs = normalizeAlphabetData(langData.alphabet);
    if (!subTabs.length) return;

    // Render Sub-tabs based on categories present
    renderAlphabetSubTabs(subTabs);

    // Filter items by category & search query
    let currentSubTab = subTabs.find(t => t.id === STATE.alphabetCategory);
    if (!currentSubTab) {
      currentSubTab = subTabs[0];
      STATE.alphabetCategory = currentSubTab.id;
    }

    const allItems = currentSubTab.items || [];
    const query = (DOM.soundSearchInput && typeof DOM.soundSearchInput.value === 'string' ? DOM.soundSearchInput.value : '').trim().toLowerCase();

    const filteredItems = allItems.filter(item => {
      if (!query) return true;
      const charMatch = (item.char || '').toLowerCase().includes(query);
      const romajiMatch = (item.romaji || '').toLowerCase().includes(query);
      const ipaMatch = (item.ipa || '').toLowerCase().includes(query);
      const meaningVi = (item.meaningVi || item.meaning_vi || '').toLowerCase().includes(query);
      const meaningEn = (item.meaningEn || item.meaning_en || '').toLowerCase().includes(query);
      const groupVi = (item.groupVi || item.group_vi || '').toLowerCase().includes(query);
      const groupEn = (item.groupEn || item.group_en || '').toLowerCase().includes(query);
      return charMatch || romajiMatch || ipaMatch || meaningVi || meaningEn || groupVi || groupEn;
    });

    // Update stats text
    if (DOM.soundStatsText) {
      DOM.soundStatsText.textContent = `${STATE.uiLang === 'vi' ? 'Hiển thị' : 'Showing'} ${filteredItems.length} ${STATE.uiLang === 'vi' ? 'âm / chữ' : 'sounds'}`;
    }

    // Render grid
    if (!DOM.soundsGrid) return;
    DOM.soundsGrid.innerHTML = '';

    filteredItems.forEach(item => {
      const isSelected = STATE.selectedSoundItem && STATE.selectedSoundItem.char === item.char;
      const card = document.createElement('div');
      const charLen = item.char ? item.char.length : 0;
      let sizeClass = '';
      if (charLen > 5) sizeClass = 'char-extra-long';
      else if (charLen > 2) sizeClass = 'char-long';

      card.className = `sound-card ${sizeClass} ${isSelected ? 'active' : ''}`.trim();

      const cleanIpa = item.ipa ? item.ipa.replace(/^\/|\[|\/|\]$/g, '') : '';
      const ipaHtml = cleanIpa ? `<span class="card-ipa">/${cleanIpa}/</span>` : '';
      const romajiHtml = item.romaji ? `<span class="card-romaji">${item.romaji}</span>` : '';

      card.innerHTML = `
        <span class="card-char">${item.char || ''}</span>
        ${romajiHtml}
        ${ipaHtml}
      `;

      card.addEventListener('click', () => {
        selectSoundItem(item);
        // Play audio immediately on card click
        speakText(item.speechText || item.char, STATE.currentLang, 1.0);
        trackItemPractice(item.char, STATE.uiLang === 'vi' ? 'Luyện âm mới' : 'Practiced sound');
      });

      DOM.soundsGrid.appendChild(card);
    });

    // Auto-select first item if none selected or if previously selected item is not in current view
    const currentSelectedInFiltered = STATE.selectedSoundItem && filteredItems.find(i => i.char === STATE.selectedSoundItem.char);
    if (!currentSelectedInFiltered && filteredItems.length > 0) {
      selectSoundItem(filteredItems[0], false);
    } else if (currentSelectedInFiltered) {
      updateInspectorCard(currentSelectedInFiltered);
    }
  }

  function renderAlphabetSubTabs(subTabs) {
    if (!DOM.alphabetSubTabs) return;
    DOM.alphabetSubTabs.innerHTML = '';

    subTabs.forEach(subTab => {
      const isActive = subTab.id === STATE.alphabetCategory;
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `subtab-pill ${isActive ? 'active' : ''}`;
      pill.textContent = STATE.uiLang === 'vi' ? (subTab.labelVi || subTab.id) : (subTab.labelEn || subTab.id);

      pill.addEventListener('click', () => {
        STATE.alphabetCategory = subTab.id;
        STATE.selectedSoundItem = null;
        renderTabAlphabet();
      });

      DOM.alphabetSubTabs.appendChild(pill);
    });
  }

  function selectSoundItem(item, shouldScroll = false) {
    STATE.selectedSoundItem = item;
    if (tab1WritingPadInstance) {
      tab1WritingPadInstance.clear();
      tab1WritingPadInstance.setGuide(item ? item.char : '');
    }

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

  // ==========================================================================
  // Friendly Front-View Cartoon Mouth Visualizer Engine
  // ==========================================================================
  function updateCartoonMouth(item) {
    if (!item) return;

    const cavity = document.getElementById('cartoonMouthCavity');
    const outerLips = document.getElementById('cartoonOuterLips');
    const tongue = document.getElementById('cartoonTongue');
    const lowerTeeth = document.getElementById('cartoonLowerTeeth');

    const tagLip = document.getElementById('mouthTagLip');
    const tagTongue = document.getElementById('mouthTagTongue');
    const tagAir = document.getElementById('mouthTagAir');
    const waveLabel = document.getElementById('miniSoundwaveLabel');

    const str = ((item.romaji || '') + ' ' + (item.ipa || '') + ' ' + (item.char || '')).toLowerCase();

    if (/[mpb]/.test(str)) {
      // Bilabial: Closed lips
      if (cavity) cavity.setAttribute('d', 'M 60 75 Q 120 74 180 75 Q 120 76 60 75 Z');
      if (outerLips) outerLips.setAttribute('d', 'M 55 75 Q 90 71 120 73 Q 150 71 185 75 Q 150 82 120 81 Q 90 82 55 75 Z');
      if (tongue) tongue.setAttribute('d', 'M 90 80 Q 120 78 150 80 Q 135 84 120 84 Q 105 84 90 80 Z');
      if (lowerTeeth) lowerTeeth.setAttribute('opacity', '0');

      if (tagLip) tagLip.textContent = STATE.uiLang === 'vi' ? 'Hai môi khép chặt' : 'Lips pressed together';
      if (tagTongue) tagTongue.textContent = STATE.uiLang === 'vi' ? 'Thả lỏng đáy hàm' : 'Resting low';
      if (tagAir) tagAir.textContent = STATE.uiLang === 'vi' ? 'Tích khí bật dứt khoát' : 'Plosive / Nasal burst';
      if (waveLabel) waveLabel.textContent = STATE.uiLang === 'vi' ? 'Âm môi bật dứt khoát' : 'Crisp bilabial burst';
    } else if (/[iy]|ee|ch|sh|zh|ji/.test(str)) {
      // Flat smile / Spread lips
      if (cavity) cavity.setAttribute('d', 'M 45 70 Q 120 62 195 70 Q 192 84 120 86 Q 48 84 45 70 Z');
      if (outerLips) outerLips.setAttribute('d', 'M 38 70 Q 90 60 120 63 Q 150 60 202 70 Q 160 92 120 90 Q 80 92 38 70 Z');
      if (tongue) tongue.setAttribute('d', 'M 75 75 Q 120 70 165 75 Q 150 84 120 84 Q 90 84 75 75 Z');
      if (lowerTeeth) lowerTeeth.setAttribute('opacity', '0.9');

      if (tagLip) tagLip.textContent = STATE.uiLang === 'vi' ? 'Môi dẹt kéo sang hai bên' : 'Spread wide in smile';
      if (tagTongue) tagTongue.textContent = STATE.uiLang === 'vi' ? 'Đầu lưỡi nâng vòm cứng' : 'Raised near hard palate';
      if (tagAir) tagAir.textContent = STATE.uiLang === 'vi' ? 'Hơi ép qua kẽ răng' : 'Friction through teeth';
      if (waveLabel) waveLabel.textContent = STATE.uiLang === 'vi' ? 'Cao độ thanh sáng' : 'High bright pitch';
    } else if (/[uow]|oo|ou/.test(str)) {
      // Rounded / Puckered lips
      if (cavity) cavity.setAttribute('d', 'M 90 68 Q 120 52 150 68 Q 155 96 120 100 Q 85 96 90 68 Z');
      if (outerLips) outerLips.setAttribute('d', 'M 82 68 Q 105 50 120 54 Q 135 50 158 68 Q 145 106 120 106 Q 95 106 82 68 Z');
      if (tongue) tongue.setAttribute('d', 'M 100 86 Q 120 80 140 86 Q 135 98 120 98 Q 105 98 100 86 Z');
      if (lowerTeeth) lowerTeeth.setAttribute('opacity', '0');

      if (tagLip) tagLip.textContent = STATE.uiLang === 'vi' ? 'Môi tròn chúm về trước' : 'Rounded & protruded';
      if (tagTongue) tagTongue.textContent = STATE.uiLang === 'vi' ? 'Cuống lưỡi nâng vòm mềm' : 'Retracted back';
      if (tagAir) tagAir.textContent = STATE.uiLang === 'vi' ? 'Cộng hưởng khoang miệng' : 'Oral resonance';
      if (waveLabel) waveLabel.textContent = STATE.uiLang === 'vi' ? 'Âm trầm sâu ấm' : 'Deep rounded tone';
    } else if (/th|[tdsznlr]|ts/.test(str)) {
      // Dental / Tongue tip touching teeth
      if (cavity) cavity.setAttribute('d', 'M 55 68 Q 120 54 185 68 Q 180 88 120 92 Q 60 88 55 68 Z');
      if (outerLips) outerLips.setAttribute('d', 'M 48 68 Q 90 56 120 60 Q 150 56 192 68 Q 155 98 120 96 Q 85 98 48 68 Z');
      if (tongue) tongue.setAttribute('d', 'M 85 76 Q 120 64 155 76 Q 145 88 120 88 Q 95 88 85 76 Z');
      if (lowerTeeth) lowerTeeth.setAttribute('opacity', '0.7');

      if (tagLip) tagLip.textContent = STATE.uiLang === 'vi' ? 'Mở hé tự nhiên' : 'Slightly open';
      if (tagTongue) tagTongue.textContent = STATE.uiLang === 'vi' ? 'Đầu lưỡi chạm chân răng' : 'Tip at teeth / alveolar';
      if (tagAir) tagAir.textContent = STATE.uiLang === 'vi' ? 'Bật gió qua kẽ răng' : 'Fricative dental flow';
      if (waveLabel) waveLabel.textContent = STATE.uiLang === 'vi' ? 'Âm sắc xát / bật dứt khoát' : 'Sharp dental burst';
    } else {
      // Open natural (a, ha, e, etc.)
      if (cavity) cavity.setAttribute('d', 'M 65 62 Q 120 40 175 62 Q 185 98 120 106 Q 55 98 65 62 Z');
      if (outerLips) outerLips.setAttribute('d', 'M 55 62 Q 90 48 120 54 Q 150 48 185 62 Q 150 116 120 114 Q 90 116 55 62 Z');
      if (tongue) tongue.setAttribute('d', 'M 85 88 Q 120 78 155 88 Q 140 104 120 104 Q 100 104 85 88 Z');
      if (lowerTeeth) lowerTeeth.setAttribute('opacity', '0.8');

      if (tagLip) tagLip.textContent = STATE.uiLang === 'vi' ? 'Mở rộng tự nhiên' : 'Open wide naturally';
      if (tagTongue) tagTongue.textContent = STATE.uiLang === 'vi' ? 'Hạ thấp đáy khoang miệng' : 'Resting low';
      if (tagAir) tagAir.textContent = STATE.uiLang === 'vi' ? 'Luồng hơi tự do' : 'Free vocal airflow';
      if (waveLabel) waveLabel.textContent = STATE.uiLang === 'vi' ? 'Âm vang khoang miệng' : 'Full resonant vowel';
    }
  }

  function setCartoonMouthSpeaking(isSpeaking) {
    const stage = document.querySelector('.cartoon-mouth-stage');
    const waveWrap = document.getElementById('miniSoundwaveWrap');
    if (stage) stage.classList.toggle('speaking', !!isSpeaking);
    if (waveWrap) waveWrap.classList.toggle('speaking', !!isSpeaking);
  }

  function updateInspectorCard(item) {
    if (!DOM.inspectorDetail || !DOM.inspectorEmptyState || !item) return;

    DOM.inspectorEmptyState.style.display = 'none';
    DOM.inspectorDetail.style.display = 'block';

    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;

    if (DOM.inspectChar) {
      DOM.inspectChar.textContent = item.char || '';
      const charLen = (item.char || '').length;
      DOM.inspectChar.classList.toggle('char-long', charLen > 2 && charLen <= 5);
      DOM.inspectChar.classList.toggle('char-extra-long', charLen > 5);
    }

    // IPA / Romaji badge
    let readingStr = '';
    const cleanIpa = item.ipa ? item.ipa.replace(/^\/|\[|\/|\]$/g, '') : '';
    if (item.romaji && cleanIpa) {
      readingStr = `${item.romaji} /${cleanIpa}/`;
    } else if (item.romaji) {
      readingStr = item.romaji;
    } else if (cleanIpa) {
      readingStr = `/${cleanIpa}/`;
    }

    if (DOM.inspectRomaji) {
      DOM.inspectRomaji.textContent = readingStr;
      DOM.inspectRomaji.style.display = readingStr ? 'inline-block' : 'none';
    }

    if (DOM.inspectTitle) {
      const group = STATE.uiLang === 'vi' ? (item.groupVi || item.group_vi || '') : (item.groupEn || item.group_en || '');
      DOM.inspectTitle.textContent = group ? `${item.char} • ${group}` : item.char;
    }
    
    // Meaning or Type
    const meaning = STATE.uiLang === 'vi' ? (item.meaningVi || item.meaning_vi || '') : (item.meaningEn || item.meaning_en || '');
    if (DOM.inspectType) {
      DOM.inspectType.textContent = meaning || (cleanIpa ? `IPA: /${cleanIpa}/` : (item.romaji || ''));
    }

    // Mouth tip
    const tip = STATE.uiLang === 'vi' ? (item.mouthTipVi || item.mouthTip_vi || '') : (item.mouthTipEn || item.mouthTip_en || '');
    if (DOM.inspectMouthTip) {
      DOM.inspectMouthTip.textContent = tip || (STATE.uiLang === 'vi' ? 'Thả lỏng quai hàm, phát âm rõ ràng và dứt khoát.' : 'Relax your jaw and pronounce clearly.');
    }

    // Update friendly front-view cartoon mouth & quick tags
    updateCartoonMouth(item);

    // Example words
    if (DOM.exampleWordsList) {
      DOM.exampleWordsList.innerHTML = '';
      const examples = (item.examples && item.examples.length > 0) ? item.examples : (item.example ? [{
        word: item.example.word,
        reading: item.example.reading,
        vi: item.example.meaning_vi || item.example.vi,
        en: item.example.meaning_en || item.example.en
      }] : []);

      if (examples.length > 0) {
        examples.forEach(ex => {
          const meaningText = STATE.uiLang === 'vi' ? (ex.vi || ex.meaning_vi || '') : (ex.en || ex.meaning_en || '');
          const wordRow = document.createElement('div');
          wordRow.className = 'example-word-row';
          wordRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:10px; margin-bottom:6px;';
          wordRow.innerHTML = `
            <div>
              <strong style="color:var(--text-highlight, #0f172a); font-size:1rem;">${ex.word || ''}</strong>
              <span style="color:var(--cyan-light); font-size:0.8rem; margin-left:6px; font-family:var(--font-mono);">${ex.reading || ''}</span>
              <p style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">${meaningText || ''}</p>
            </div>
            <button type="button" class="icon-btn-round" title="${dict.listenNormal || 'Nghe'}">
              <span>▶</span>
            </button>
          `;

          const playBtn = wordRow.querySelector('button');
          if (playBtn) {
            playBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              speakText(ex.word, STATE.currentLang, 1.0);
            });
          }

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
    setCartoonMouthSpeaking(isPlaying);
    if (!DOM.vAcousticStatus) return;
    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;

    if (isPlaying) {
      DOM.vAcousticStatus.textContent = dict.acousticSpeaking || 'Đang phát âm...';
    } else {
      DOM.vAcousticStatus.textContent = dict.acousticReady || 'Sẵn sàng';
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
          trackItemPractice(targetText, STATE.uiLang === 'vi' ? 'Luyện cụm từ' : 'Practiced phrase');
        });
      }

      // 0.7x TTS
      const btnSlow = card.querySelector('[data-speed="0.7"]');
      if (btnSlow) {
        btnSlow.addEventListener('click', (e) => {
          e.stopPropagation();
          speakText(targetText, STATE.currentLang, 0.7);
          trackItemPractice(targetText, STATE.uiLang === 'vi' ? 'Luyện cụm từ' : 'Practiced phrase');
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
          <div style="font-size:1.25rem; font-weight:800; color:var(--text-highlight, #0f172a); margin:4px 0;">${casualText}</div>
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

      if (btn1) btn1.addEventListener('click', () => {
        speakText(casualText, STATE.currentLang, 1.0);
        trackItemPractice(casualText, STATE.uiLang === 'vi' ? 'Luyện câu giao tiếp' : 'Practiced expression');
      });
      if (btnSlow) btnSlow.addEventListener('click', () => {
        speakText(casualText, STATE.currentLang, 0.7);
        trackItemPractice(casualText, STATE.uiLang === 'vi' ? 'Luyện câu giao tiếp' : 'Practiced expression');
      });
      if (btnFormal) btnFormal.addEventListener('click', () => {
        speakText(formalText, STATE.currentLang, 1.0);
        trackItemPractice(formalText, STATE.uiLang === 'vi' ? 'Luyện câu trang trọng' : 'Practiced formal expression');
      });

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
  // Tab 3: Phòng thu phát âm AI & Shadowing Studio
  // ==========================================================================

  function getAllLabSentencesForCurrentLang() {
    const langData = LANG_DATA[STATE.currentLang] || {};
    const groups = [
      {
        id: 'studio',
        name: STATE.uiLang === 'vi' ? '🎙️ Mẫu câu luyện âm cơ bản' : '🎙️ Studio Sentences',
        items: (langData.labSentences || []).map((s, idx) => ({
          id: `lab_${idx}`,
          category: 'studio',
          text: s.text || '',
          phonetic: s.phonetic || s.romaji || s.pinyin || '',
          vi: s.vi || s.translation_vi || s.meaning_vi || '',
          en: s.en || s.translation_en || s.meaning_en || '',
          speechText: s.speechText || s.text || ''
        }))
      },
      {
        id: 'phrases',
        name: STATE.uiLang === 'vi' ? '🧩 Cụm từ then chốt (Key Phrases)' : '🧩 Key Phrases & Chunks',
        items: (langData.phrases || []).map((p, idx) => ({
          id: `phrase_${p.id || idx}`,
          category: 'phrases',
          text: p.text || p.target || '',
          phonetic: p.phonetic || p.romaji || p.pinyin || '',
          vi: p.translation_vi || p.vi || p.meaning_vi || '',
          en: p.translation_en || p.en || p.meaning_en || '',
          speechText: p.speechText || p.text || p.target || ''
        }))
      },
      {
        id: 'expressions',
        name: STATE.uiLang === 'vi' ? '💬 Câu giao tiếp thực tế' : '💬 Native Expressions',
        items: (langData.expressions || []).flatMap((e, idx) => {
          const list = [];
          if (e.casual && e.casual.text) {
            list.push({
              id: `exp_${e.id || idx}_c`,
              category: 'expressions',
              text: e.casual.text || '',
              phonetic: e.casual.phonetic || e.casual.romaji || e.casual.pinyin || '',
              vi: `${e.casual.translation_vi || e.casual.vi || e.casual.meaning_vi || ''} [Thân mật]`,
              en: `${e.casual.translation_en || e.casual.en || e.casual.meaning_en || ''} [Casual]`,
              speechText: e.casual.speechText || e.casual.text || ''
            });
          }
          if (e.formal && e.formal.text) {
            list.push({
              id: `exp_${e.id || idx}_f`,
              category: 'expressions',
              text: e.formal.text || '',
              phonetic: e.formal.phonetic || e.formal.romaji || e.formal.pinyin || '',
              vi: `${e.formal.translation_vi || e.formal.vi || e.formal.meaning_vi || ''} [Lịch sự]`,
              en: `${e.formal.translation_en || e.formal.en || e.formal.meaning_en || ''} [Formal]`,
              speechText: e.formal.speechText || e.formal.text || ''
            });
          }
          return list;
        })
      }
    ];
    return groups;
  }

  STATE.labFilterCategory = STATE.labFilterCategory || 'all';

  function renderTabLab() {
    const groups = getAllLabSentencesForCurrentLang();
    STATE.flattenedLabSentences = [];

    let allItems = [];
    groups.forEach(g => {
      if (STATE.labFilterCategory === 'all' || STATE.labFilterCategory === g.id) {
        allItems = allItems.concat(g.items);
      }
      STATE.flattenedLabSentences = STATE.flattenedLabSentences.concat(g.items);
    });

    if (DOM.sentenceCardsScroller) {
      DOM.sentenceCardsScroller.innerHTML = '';
      allItems.forEach((item, displayIdx) => {
        const card = document.createElement('div');
        card.className = `sentence-picker-card tactile-card ${item.id === (STATE.currentSelectedLabSentenceId || '') ? 'active' : ''}`;
        if (!STATE.currentSelectedLabSentenceId && displayIdx === 0) {
          card.classList.add('active');
          STATE.currentSelectedLabSentenceId = item.id;
          updateLabTargetSentence(item);
        }

        const meaning = STATE.uiLang === 'vi' ? (item.vi || item.en) : (item.en || item.vi);
        const phoneticHtml = item.phonetic ? `<span class="picker-card-phonetic">${escapeHtml(item.phonetic)}</span>` : '';

        card.innerHTML = `
          <div class="picker-card-main">
            <span class="picker-card-text">${escapeHtml(item.text)}</span>
            ${phoneticHtml}
            <span class="picker-card-meaning">${escapeHtml(meaning)}</span>
          </div>
          <span class="picker-card-check">✓</span>
        `;

        card.addEventListener('click', () => {
          DOM.sentenceCardsScroller.querySelectorAll('.sentence-picker-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          STATE.currentSelectedLabSentenceId = item.id;
          updateLabTargetSentence(item);
          SoundFX.playClick();
        });

        DOM.sentenceCardsScroller.appendChild(card);
      });
    }

    if (STATE.labMode === 'custom' && STATE.currentLabCustomSentence) {
      updateLabTargetSentence(STATE.currentLabCustomSentence);
      if (DOM.curatedSentenceWrap) DOM.curatedSentenceWrap.style.display = 'none';
      if (DOM.customSentenceWrap) DOM.customSentenceWrap.style.display = 'flex';
      if (DOM.btnModeCustom) DOM.btnModeCustom.classList.add('active');
      if (DOM.btnModeCurated) DOM.btnModeCurated.classList.remove('active');
    } else {
      if (DOM.curatedSentenceWrap) DOM.curatedSentenceWrap.style.display = 'flex';
      if (DOM.customSentenceWrap) DOM.customSentenceWrap.style.display = 'none';
      if (DOM.btnModeCurated) DOM.btnModeCurated.classList.add('active');
      if (DOM.btnModeCustom) DOM.btnModeCustom.classList.remove('active');
    }
  }

  async function applyCustomSentence() {
    if (!DOM.customSentenceInput) return;
    const text = DOM.customSentenceInput.value.trim();
    if (!text) {
      showToast(STATE.uiLang === 'vi' ? 'Vui lòng nhập câu bạn muốn luyện phát âm.' : 'Please enter a sentence to practice.');
      return;
    }

    // Determine target language code for MyMemory
    const langMap = { 'ja-JP': 'ja', 'en-US': 'en', 'ko-KR': 'ko', 'zh-CN': 'zh' };
    const targetCode = langMap[STATE.currentLang] || 'ja';

    // Check if input is Vietnamese
    const isVietnamese = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text);

    if (isVietnamese && targetCode !== 'vi') {
      const origBtnText = DOM.btnApplyCustomSentence ? DOM.btnApplyCustomSentence.innerHTML : '';
      if (DOM.btnApplyCustomSentence) {
        DOM.btnApplyCustomSentence.innerHTML = '<span>⏳ Đang dịch...</span>';
        DOM.btnApplyCustomSentence.disabled = true;
      }

      showToast(STATE.uiLang === 'vi' ? `Đang tự động dịch sang ${targetCode.toUpperCase()}...` : `Translating to ${targetCode.toUpperCase()}...`, 'info');

      try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=vi|${targetCode}`);
        const data = await res.json();
        const translated = (data && data.responseData && data.responseData.translatedText) ? data.responseData.translatedText : null;

        if (translated) {
          const customItem = {
            id: 'custom_' + Date.now(),
            text: translated,
            phonetic: STATE.uiLang === 'vi' ? `Bản gốc: "${text}"` : `Original: "${text}"`,
            vi: text,
            en: text,
            speechText: translated
          };
          STATE.currentLabCustomSentence = customItem;
          updateLabTargetSentence(customItem);
          showToast(STATE.uiLang === 'vi' ? 'Đã dịch & áp dụng câu vào Phòng thu!' : 'Translated & loaded into Studio!');
          return;
        }
      } catch (err) {
        console.warn('Auto-translate error:', err);
      } finally {
        if (DOM.btnApplyCustomSentence) {
          DOM.btnApplyCustomSentence.innerHTML = origBtnText;
          DOM.btnApplyCustomSentence.disabled = false;
        }
      }
    }

    // Direct fallback if not Vietnamese or translation failed
    const customItem = {
      id: 'custom_' + Date.now(),
      text: text,
      phonetic: STATE.uiLang === 'vi' ? 'Câu tự nhập' : 'Custom Sentence',
      vi: text,
      en: text,
      speechText: text
    };

    STATE.currentLabCustomSentence = customItem;
    updateLabTargetSentence(customItem);
    showToast(STATE.uiLang === 'vi' ? 'Đã áp dụng câu luyện tập!' : 'Applied custom practice sentence!');
  }

  function updateLabTargetSentence(sentence) {
    if (!sentence) return;
    if (DOM.labTargetText) DOM.labTargetText.textContent = sentence.text;
    if (DOM.labTargetPhonetic) DOM.labTargetPhonetic.textContent = sentence.phonetic || '';
    if (DOM.labTargetMeaning) {
      DOM.labTargetMeaning.textContent = (STATE.uiLang === 'vi' ? sentence.vi : sentence.en) || sentence.text;
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
      STATE.waveformAnimId = safeRAF(render);
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
      STATE.waveformAnimId = safeRAF(renderSim);
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
      safeCAF(STATE.waveformAnimId);
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

  function tokenizeText(text, lang) {
    if (!text) return [];
    const cleanText = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'。、！？「」『』…]/g, '').trim();
    if (!cleanText) return [];

    // Use Intl.Segmenter if available for Japanese or Chinese
    if (typeof Intl !== 'undefined' && Intl.Segmenter && (lang === 'ja' || lang === 'zh')) {
      try {
        const segmenter = new Intl.Segmenter(lang, { granularity: 'word' });
        const segments = Array.from(segmenter.segment(cleanText))
          .map(s => s.segment.trim())
          .filter(Boolean);
        if (segments.length > 0) return segments;
      } catch (e) {}
    }

    // Whitespace splitting for languages with spaces
    const spaceTokens = cleanText.split(/\s+/).filter(Boolean);
    if (spaceTokens.length > 1 || lang === 'en' || lang === 'ko') {
      return spaceTokens;
    }

    // Fallback: character tokens if single word in Asian language
    return Array.from(cleanText);
  }

  function processLabSpokenResult(spokenTranscript) {
    const activeSentence = (STATE.labMode === 'custom' && STATE.currentLabCustomSentence)
      ? STATE.currentLabCustomSentence
      : (STATE.flattenedLabSentences ? STATE.flattenedLabSentences[STATE.selectedLabIndex] : null);

    const originalText = activeSentence ? activeSentence.text : (DOM.labTargetText ? DOM.labTargetText.textContent : '');
    if (!originalText) return;

    if (DOM.feedbackPlaceholder) DOM.feedbackPlaceholder.style.display = 'none';
    if (DOM.feedbackResults) DOM.feedbackResults.style.display = 'block';

    if (DOM.recognizedText) DOM.recognizedText.textContent = spokenTranscript;

    const lang = STATE.currentLang;
    const targetTokens = tokenizeText(originalText, lang);
    const spokenTokens = tokenizeText(spokenTranscript, lang);
    const spokenNorm = spokenTranscript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'。、！？]/g, '');

    let matchCount = 0;
    if (DOM.tokenChipsContainer) DOM.tokenChipsContainer.innerHTML = '';

    // Word-by-Word Diff Highlighting
    let diffHtml = '';
    targetTokens.forEach(token => {
      const tokenLower = token.toLowerCase();
      const isMatched = spokenTokens.some(s => s.toLowerCase().includes(tokenLower) || tokenLower.includes(s.toLowerCase()))
        || spokenNorm.includes(tokenLower);

      if (isMatched) matchCount++;

      // Diff span on target text
      diffHtml += `<span class="target-diff-word ${isMatched ? 'match' : 'miss'}">${token}</span> `;

      // Token chip
      const chip = document.createElement('span');
      chip.className = `token-chip ${isMatched ? 'correct' : 'imperfect'}`;
      chip.textContent = `${token} ${isMatched ? '✓' : '✗'}`;
      if (DOM.tokenChipsContainer) DOM.tokenChipsContainer.appendChild(chip);
    });

    if (DOM.labTargetText) {
      DOM.labTargetText.innerHTML = diffHtml || originalText;
    }

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

    // Award +20 XP for scoring >= 80% and Trigger Confetti Burst
    if (score >= 80) {
      awardXP(20, STATE.uiLang === 'vi' ? 'Phát âm chuẩn xác ≥80%' : 'Pronunciation score ≥80%');
      awardCoins(25, STATE.uiLang === 'vi' ? 'Phát âm chuẩn xác ≥80%' : 'Pronunciation score ≥80%');
      triggerConfettiBurst();
    }
  }

  // ==========================================================================
  // Tab 4: Real-time Online Community (Online Community)
  // ==========================================================================

  function initCommunityFirebase() {
    try {
      if (typeof firebase === 'undefined' || !firebase) {
        if (DOM.rtdbStatusText) {
          DOM.rtdbStatusText.textContent = STATE.uiLang === 'vi' ? '⚪ Chế độ ngoại tuyến' : '⚪ Offline mode';
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
            ? (STATE.uiLang === 'vi' ? '🟢 Phòng học trực tuyến' : '🟢 Online Classroom')
            : (STATE.uiLang === 'vi' ? '⚪ Đang kết nối lại...' : '⚪ Reconnecting...');
        }

        if (isConnected) {
          setupPresence(STATE.currentCommunityRoom);
        }
      });

      // Setup room listeners
      setupRoomCounts();
      attachRoomChatListener(STATE.currentCommunityRoom);
    } catch (err) {
      console.warn('Online Community init error:', err);
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
      onlineAt: (typeof firebase !== 'undefined' && firebase.database) ? firebase.database.ServerValue.TIMESTAMP : Date.now()
    };

    presenceRef.set(presenceData).catch(err => {
      console.warn('Presence set error:', err);
      if (err && err.code === 'PERMISSION_DENIED') {
        showToast(STATE.uiLang === 'vi' ? 'Trạng thái trực tuyến bị giới hạn (Quyền máy chủ).' : 'Presence sync limited (Permission denied).', 'info');
      }
    });
    presenceRef.onDisconnect().remove().catch(() => {});
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

  const RENDERED_MESSAGE_IDS = new Set();

  function attachRoomChatListener(room) {
    if (!STATE.rtdb || !DOM.chatStream) return;

    if (STATE.roomMessageRef) {
      STATE.roomMessageRef.off();
    }

    DOM.chatStream.innerHTML = '';
    RENDERED_MESSAGE_IDS.clear();

    const messagesRef = STATE.rtdb.ref(`/rooms/${room}/messages`).limitToLast(50);
    STATE.roomMessageRef = messagesRef;

    messagesRef.on('child_added', (snap) => {
      const msg = snap.val();
      if (!msg) return;
      const msgId = msg.id || snap.key;
      if (msgId && RENDERED_MESSAGE_IDS.has(msgId)) return;
      if (msgId) RENDERED_MESSAGE_IDS.add(msgId);
      renderChatMessageBubble({ ...msg, id: msgId });
    }, (err) => {
      console.warn('Firebase chat listen error:', err);
      if (err && err.code === 'PERMISSION_DENIED') {
        showToast(STATE.uiLang === 'vi' ? 'Phòng học đang ở chế độ cục bộ (Quyền máy chủ bị khóa).' : 'Chat room in local mode (Permission denied).', 'warning');
      }
    });
  }

  function renderChatMessageBubble(msg) {
    if (!DOM.chatStream) return;

    const isMine = msg.senderId === STATE.userProfile.userId;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isMine ? 'mine' : 'theirs'}`;

    const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    const frameClass = msg.equippedFrame ? `user-avatar-framed ${msg.equippedFrame}` : '';
    const titleTag = msg.equippedTitle ? `<span style="font-size:0.7rem; background:rgba(230,57,70,0.1); border:1px solid rgba(230,57,70,0.3); border-radius:4px; padding:1px 6px; margin-left:4px; font-weight:700; color:var(--primary-color,#e63946);">${escapeHtml(msg.equippedTitle)}</span>` : '';

    if (msg.type === 'voice' && msg.audioData) {
      const durationStr = `${msg.duration || 3}s`;
      bubble.innerHTML = `
        <div class="bubble-sender-row">
          <span style="display:inline-flex; align-items:center; gap:6px;">
            <span class="${frameClass}" style="width:24px; height:24px; font-size:0.95rem; display:inline-flex; align-items:center; justify-content:center;">${msg.avatar || '🦊'}</span>
            <strong>${msg.nickname || 'Learner'}</strong>
            ${titleTag}
          </span>
          <span>•</span>
          <span>${timeStr}</span>
        </div>
        <div class="voice-audio-bubble">
          <button type="button" class="btn-play-voice" title="Nghe tin nhắn thoại">▶</button>
          <div class="voice-waveform-track">
            <div class="voice-waveform-bar">
              <div class="voice-waveform-fill"></div>
            </div>
            <div class="voice-meta-row">
              <span>🎙️ Tin nhắn thoại</span>
              <span class="voice-duration">${durationStr}</span>
            </div>
          </div>
        </div>
      `;

      const playBtn = bubble.querySelector('.btn-play-voice');
      const waveFill = bubble.querySelector('.voice-waveform-fill');
      let currentAudio = null;

      playBtn.addEventListener('click', () => {
        if (currentAudio && !currentAudio.paused) {
          currentAudio.pause();
          playBtn.textContent = '▶';
          return;
        }

        try {
          currentAudio = new Audio(msg.audioData);
          playBtn.textContent = '⏸';

          currentAudio.ontimeupdate = () => {
            if (currentAudio.duration) {
              const pct = (currentAudio.currentTime / currentAudio.duration) * 100;
              if (waveFill) waveFill.style.width = `${pct}%`;
            }
          };

          currentAudio.onended = () => {
            playBtn.textContent = '▶';
            if (waveFill) waveFill.style.width = '0%';
          };

          currentAudio.play().catch(err => {
            console.warn('Audio play error:', err);
            playBtn.textContent = '▶';
          });
        } catch (e) {
          console.warn('Audio error:', e);
          playBtn.textContent = '▶';
        }
      });
    } else {
      bubble.innerHTML = `
        <div class="bubble-sender-row">
          <span style="display:inline-flex; align-items:center; gap:6px;">
            <span class="${frameClass}" style="width:24px; height:24px; font-size:0.95rem; display:inline-flex; align-items:center; justify-content:center;">${msg.avatar || '🦊'}</span>
            <strong>${msg.nickname || 'Learner'}</strong>
            ${titleTag}
          </span>
          <span>•</span>
          <span>${timeStr}</span>
        </div>
        <div class="bubble-text">${escapeHtml(msg.text || '')}</div>
        <div class="bubble-actions">
          <button type="button" class="btn-bubble-tts" title="Nghe phát âm">🔊</button>
        </div>
      `;

      const ttsBtn = bubble.querySelector('.btn-bubble-tts');
      ttsBtn.addEventListener('click', () => {
        const langMap = { ja: 'ja-JP', en: 'en-US', ko: 'ko-KR', zh: 'zh-CN' };
        speakText(msg.text, langMap[STATE.currentCommunityRoom] || 'ja-JP', 1.0);
      });
    }

    DOM.chatStream.appendChild(bubble);
    DOM.chatStream.scrollTop = DOM.chatStream.scrollHeight;
  }

  function sendChatMessage() {
    if (!DOM.chatTextInput) return;
    const text = DOM.chatTextInput.value.trim();
    if (!text) return;

    const clientMsgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const messageData = {
      id: clientMsgId,
      senderId: STATE.userProfile.userId,
      nickname: STATE.userProfile.nickname,
      avatar: STATE.userProfile.avatar,
      text: text,
      equippedTitle: typeof getEquippedTitleName === 'function' ? getEquippedTitleName() : '',
      equippedFrame: typeof getEquippedFrameId === 'function' ? getEquippedFrameId() : '',
      timestamp: Date.now()
    };

    DOM.chatTextInput.value = '';

    // 1. Instant optimistic render so user sees their message immediately with 0ms lag
    RENDERED_MESSAGE_IDS.add(clientMsgId);
    renderChatMessageBubble(messageData);

    // 2. Firebase write with visible error feedback if network offline or PERMISSION_DENIED
    if (STATE.rtdb && STATE.rtdbConnected) {
      STATE.rtdb.ref(`/rooms/${STATE.currentCommunityRoom}/messages`).push({
        ...messageData,
        timestamp: (typeof firebase !== 'undefined' && firebase.database) ? firebase.database.ServerValue.TIMESTAMP : Date.now()
      }).catch(err => {
        console.warn('Firebase message push failed:', err);
        const errText = (err && err.code === 'PERMISSION_DENIED')
          ? (STATE.uiLang === 'vi' ? 'Không thể lưu tin nhắn lên máy chủ (PERMISSION_DENIED). Tin nhắn đã hiển thị cục bộ.' : 'Server write error (PERMISSION_DENIED). Displayed locally.')
          : (STATE.uiLang === 'vi' ? 'Lỗi kết nối máy chủ. Tin nhắn đã hiển thị cục bộ.' : 'Network error. Displayed locally.');
        showToast(errText, 'warning');
      });
    } else {
      showToast(STATE.uiLang === 'vi' ? 'Chế độ ngoại tuyến: Tin nhắn hiển thị trên máy của bạn.' : 'Offline mode: Message displayed locally.', 'info');
    }
  }

  let mediaVoiceRecorder = null;
  let voiceAudioChunks = [];
  let voiceRecordTimerId = null;
  let voiceRecordSeconds = 0;
  let isRecordingRealVoice = false;

  function initChatVoiceDictation() {
    // Replaced by Real Audio Voice Recording
    const btnRecord = document.getElementById('btnVoiceRecord') || DOM.btnVoiceRecord;
    if (btnRecord) {
      btnRecord.addEventListener('click', toggleRealVoiceRecording);
    }
  }

  async function toggleRealVoiceRecording() {
    const btnRecord = document.getElementById('btnVoiceRecord') || DOM.btnVoiceRecord;
    const timerWrap = document.getElementById('voiceRecordingTimer') || DOM.voiceRecordingTimer;
    const timerSec = document.getElementById('voiceTimerSec') || DOM.voiceTimerSec;

    if (isRecordingRealVoice) {
      if (mediaVoiceRecorder && mediaVoiceRecorder.state !== 'inactive') {
        mediaVoiceRecorder.stop();
      }
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast(STATE.uiLang === 'vi' ? 'Trình duyệt chưa hỗ trợ thu âm qua Micro.' : 'Microphone recording not supported on this browser.', 'warning');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceAudioChunks = [];
      voiceRecordSeconds = 0;
      isRecordingRealVoice = true;

      if (btnRecord) btnRecord.classList.add('recording');
      if (timerWrap) timerWrap.style.display = 'inline-flex';
      if (timerSec) timerSec.textContent = '0:00';

      mediaVoiceRecorder = new MediaRecorder(stream);
      mediaVoiceRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          voiceAudioChunks.push(e.data);
        }
      };

      mediaVoiceRecorder.onstop = () => {
        clearInterval(voiceRecordTimerId);
        isRecordingRealVoice = false;
        if (btnRecord) btnRecord.classList.remove('recording');
        if (timerWrap) timerWrap.style.display = 'none';

        stream.getTracks().forEach(t => t.stop());

        if (!voiceAudioChunks.length || voiceRecordSeconds < 1) {
          showToast(STATE.uiLang === 'vi' ? 'Bản ghi âm quá ngắn.' : 'Recording too short.', 'info');
          return;
        }

        const audioBlob = new Blob(voiceAudioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          sendVoiceAudioMessage(reader.result, voiceRecordSeconds);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaVoiceRecorder.start(250);

      voiceRecordTimerId = setInterval(() => {
        voiceRecordSeconds++;
        const displaySec = voiceRecordSeconds < 10 ? `0:0${voiceRecordSeconds}` : `0:${voiceRecordSeconds}`;
        if (timerSec) timerSec.textContent = displaySec;

        if (voiceRecordSeconds >= 10) {
          if (mediaVoiceRecorder && mediaVoiceRecorder.state !== 'inactive') {
            mediaVoiceRecorder.stop();
          }
        }
      }, 1000);

      showToast(STATE.uiLang === 'vi' ? '🎙️ Đang ghi âm (tối đa 10s)... Bấm lại để gửi!' : '🎙️ Recording voice (max 10s)... Click again to send!');
    } catch (err) {
      console.warn('Microphone error:', err);
      showToast(STATE.uiLang === 'vi' ? 'Không thể truy cập Microphone để ghi âm.' : 'Cannot access microphone.', 'warning');
      isRecordingRealVoice = false;
      if (btnRecord) btnRecord.classList.remove('recording');
      if (timerWrap) timerWrap.style.display = 'none';
      if (voiceRecordTimerId) clearInterval(voiceRecordTimerId);
    }
  }

  function sendVoiceAudioMessage(base64Audio, duration) {
    const clientMsgId = 'voice_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const messageData = {
      id: clientMsgId,
      senderId: STATE.userProfile.userId,
      nickname: STATE.userProfile.nickname,
      avatar: STATE.userProfile.avatar,
      type: 'voice',
      audioData: base64Audio,
      duration: duration,
      equippedTitle: typeof getEquippedTitleName === 'function' ? getEquippedTitleName() : '',
      equippedFrame: typeof getEquippedFrameId === 'function' ? getEquippedFrameId() : '',
      timestamp: Date.now()
    };

    // 1. Instant optimistic render
    RENDERED_MESSAGE_IDS.add(clientMsgId);
    renderChatMessageBubble(messageData);

    // 2. Firebase write with visible error handling
    if (STATE.rtdb && STATE.rtdbConnected) {
      STATE.rtdb.ref(`/rooms/${STATE.currentCommunityRoom}/messages`).push({
        ...messageData,
        timestamp: (typeof firebase !== 'undefined' && firebase.database) ? firebase.database.ServerValue.TIMESTAMP : Date.now()
      }).catch(err => {
        console.warn('Voice push failed:', err);
        const errText = (err && err.code === 'PERMISSION_DENIED')
          ? (STATE.uiLang === 'vi' ? 'Không thể lưu tin nhắn thoại lên máy chủ (PERMISSION_DENIED). Đã phát cục bộ.' : 'Server write error (PERMISSION_DENIED). Played locally.')
          : (STATE.uiLang === 'vi' ? 'Lỗi kết nối máy chủ. Tin nhắn thoại lưu cục bộ.' : 'Network error. Voice played locally.');
        showToast(errText, 'warning');
      });
    } else {
      showToast(STATE.uiLang === 'vi' ? 'Chế độ ngoại tuyến: Tin nhắn thoại phát trên máy của bạn.' : 'Offline mode: Voice played locally.', 'info');
    }
    showToast(STATE.uiLang === 'vi' ? 'Đã gửi tin nhắn thoại thành công! 🎙️' : 'Voice message sent! 🎙️', 'success');
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
    const titleName = getEquippedTitleName();

    if (DOM.headerUserAvatarEmoji) DOM.headerUserAvatarEmoji.textContent = prof.avatar || '🦊';
    if (DOM.headerUserAvatarWrap) {
      DOM.headerUserAvatarWrap.className = 'user-avatar-framed ' + (STATE.inventory ? STATE.inventory.equippedFrame : 'frame-default');
    }
    if (DOM.headerUsername) DOM.headerUsername.textContent = prof.nickname || prof.username || 'Học viên';
    if (DOM.headerUserTitle) DOM.headerUserTitle.textContent = titleName;

    if (DOM.currentUserAvatar) DOM.currentUserAvatar.textContent = prof.avatar || '🦊';
    if (DOM.currentUserNickname) DOM.currentUserNickname.textContent = prof.nickname || 'Learner';
    if (DOM.currentUserMeta) {
      DOM.currentUserMeta.textContent = `${STATE.uiLang === 'vi' ? 'Bản xứ' : 'Native'}: ${(prof.nativeLang || 'vi').toUpperCase()} • ${STATE.uiLang === 'vi' ? 'Học' : 'Learn'}: ${(prof.targetLang || 'ja').toUpperCase()}`;
    }
  }

  function openProfileModal() {
    if (!DOM.profileModalOverlay) return;
    const prof = STATE.userProfile;

    if (DOM.profileNickname) DOM.profileNickname.value = prof.nickname || prof.username || '';
    if (DOM.profilePin) DOM.profilePin.value = prof.pin || '1234';
    if (DOM.profileNativeLang) DOM.profileNativeLang.value = prof.nativeLang || 'vi';
    if (DOM.profileTargetLang) DOM.profileTargetLang.value = prof.targetLang || 'ja';

    if (DOM.profileModalAvatarEmoji) DOM.profileModalAvatarEmoji.textContent = prof.avatar || '🦊';
    if (DOM.profileModalAvatarWrap) {
      DOM.profileModalAvatarWrap.className = 'user-avatar-framed large-framed ' + (STATE.inventory ? STATE.inventory.equippedFrame : 'frame-default');
    }
    if (DOM.profileModalEquippedTitle) {
      DOM.profileModalEquippedTitle.textContent = getEquippedTitleName();
    }
    if (DOM.profileModalStats) {
      DOM.profileModalStats.textContent = `Cấp ${STATE.gamification.level || 1} • ${STATE.gamification.xp || 0} XP • ${STATE.coins || 0} 🪙`;
    }

    // Highlight avatar
    document.querySelectorAll('.avatar-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.avatar === prof.avatar);
    });

    DOM.profileModalOverlay.classList.add('open');
    DOM.profileModalOverlay.style.display = 'flex';
  }

  function closeProfileModal() {
    if (DOM.profileModalOverlay) {
      DOM.profileModalOverlay.classList.remove('open');
      DOM.profileModalOverlay.style.display = 'none';
    }
  }

  function saveProfileModal(e) {
    if (e) e.preventDefault();
    const nickname = (DOM.profileNickname ? DOM.profileNickname.value : '').trim();
    if (!nickname) {
      showToast(STATE.uiLang === 'vi' ? 'Vui lòng nhập tên hiển thị!' : 'Please enter nickname!', 'error');
      return;
    }

    const pin = (DOM.profilePin ? DOM.profilePin.value : '').trim();
    if (pin && !/^[0-9]{4}$/.test(pin)) {
      showToast(STATE.uiLang === 'vi' ? 'Mã PIN bảo mật phải gồm đúng 4 chữ số!' : 'PIN must be exactly 4 digits!', 'error');
      return;
    }

    const activeAvatarEl = document.querySelector('.avatar-option.active');
    const avatar = activeAvatarEl ? activeAvatarEl.dataset.avatar : '🦊';
    const nativeLang = DOM.profileNativeLang ? DOM.profileNativeLang.value : 'vi';
    const targetLang = DOM.profileTargetLang ? DOM.profileTargetLang.value : 'ja';

    STATE.userProfile.username = nickname;
    STATE.userProfile.nickname = nickname;
    STATE.userProfile.pin = pin || '1234';
    STATE.userProfile.avatar = avatar;
    STATE.userProfile.nativeLang = nativeLang;
    STATE.userProfile.targetLang = targetLang;

    localStorage.setItem('lingua_user_profile', JSON.stringify(STATE.userProfile));
    updateUserProfileBadge();
    closeProfileModal();

    syncUserProfileToFirebase();
    // Re-announce presence with updated profile
    setupPresence(STATE.currentCommunityRoom);
    showToast(STATE.uiLang === 'vi' ? 'Đã lưu hồ sơ học viên thành công!' : 'Profile saved successfully!');
  }

  function syncUserProfileToFirebase() {
    if (STATE.rtdb && window.firebase && STATE.userProfile) {
      try {
        const username = STATE.userProfile.username || 'user';
        const cleanKey = username.replace(/[^a-zA-Z0-9_-]/g, '_');
        STATE.rtdb.ref('users/' + cleanKey).set({
          userId: STATE.userProfile.userId,
          username: STATE.userProfile.username,
          nickname: STATE.userProfile.nickname,
          avatar: STATE.userProfile.avatar,
          equippedFrame: STATE.inventory ? STATE.inventory.equippedFrame : 'frame-default',
          equippedTitle: getEquippedTitleName(),
          level: STATE.gamification.level || 1,
          xp: STATE.gamification.xp || 0,
          coins: STATE.coins || 0,
          lastSeen: Date.now()
        });
      } catch (e) {}
    }
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
            <strong style="color:var(--text-highlight, #0f172a); font-size:0.9rem;">${f.nickname}</strong>
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
    const updateEl = (el, val) => {
      if (!el) return;
      const oldVal = el.textContent;
      el.textContent = val;
      if (oldVal !== String(val)) {
        el.classList.remove('pop');
        void el.offsetWidth;
        el.classList.add('pop');
      }
    };

    updateEl(DOM.friendsCountBadge, STATE.friends.length);
    updateEl(DOM.bookmarkCountBadge, STATE.bookmarks.length);
    updateEl(DOM.weakSpotsCountBadge, STATE.weakSpots.length);
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
          <span style="font-size:1.8rem; font-weight:800; color:var(--text-highlight, #0f172a);">${b.char}</span>
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
    if (STATE.activeTab === 'tab-campaign') {
      renderCampaignPath();
    } else if (STATE.activeTab === 'tab-alphabet') {
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
    try {
      if (DOM.ambientCanvas && typeof CulturalScenery !== 'undefined') {
        CulturalScenery.init(DOM.ambientCanvas);
      }
    } catch (e) {
      console.warn('CulturalScenery init caught:', e);
    }
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
        safeRAF(renderConfetti);
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
        closeQuizModal();
        closeAllDrawers();
        closeQuestModal();
        closeQuestModal();
      }
    });

    function updateMasterAudioButtonState() {
      const isSfxMuted = SoundFX.muted;
      const isBgmMuted = !BGMPlayer.isPlaying;

      const masterIcon = document.getElementById('masterAudioIcon');
      if (masterIcon) {
        masterIcon.textContent = (isSfxMuted && isBgmMuted) ? '🔇' : '🔊';
      }

      const bgmLabel = document.getElementById('bgmStateLabel');
      if (bgmLabel) {
        bgmLabel.textContent = isBgmMuted
          ? (STATE.uiLang === 'vi' ? 'BGM: Tắt' : 'BGM: Off')
          : (STATE.uiLang === 'vi' ? 'BGM: Bật' : 'BGM: On');
      }
      if (DOM.btnToggleBgm) {
        DOM.btnToggleBgm.classList.toggle('muted', isBgmMuted);
      }

      const sfxLabel = document.getElementById('sfxStateLabel');
      if (sfxLabel) {
        sfxLabel.textContent = isSfxMuted
          ? (STATE.uiLang === 'vi' ? 'SFX: Tắt' : 'SFX: Off')
          : (STATE.uiLang === 'vi' ? 'SFX: Bật' : 'SFX: On');
      }
      if (DOM.btnToggleSfx) {
        DOM.btnToggleSfx.classList.toggle('muted', isSfxMuted);
      }
    }

    // Quick SFX Toggle
    if (DOM.btnToggleSfx) {
      DOM.btnToggleSfx.addEventListener('click', (e) => {
        e.stopPropagation();
        SoundFX.toggleMute();
        updateMasterAudioButtonState();
      });
    }

    // Quick BGM Toggle
    if (DOM.btnToggleBgm) {
      DOM.btnToggleBgm.addEventListener('click', (e) => {
        e.stopPropagation();
        BGMPlayer.toggle();
        updateMasterAudioButtonState();
      });
    }

    // Audio Settings Slider Button & Popover
    if (DOM.btnAudioSettings && DOM.audioSettingsPopover) {
      DOM.btnAudioSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = DOM.audioSettingsPopover.hasAttribute('hidden');
        if (isHidden) {
          DOM.audioSettingsPopover.removeAttribute('hidden');
        } else {
          DOM.audioSettingsPopover.setAttribute('hidden', '');
        }
      });

      if (DOM.btnCloseAudioSettings) {
        DOM.btnCloseAudioSettings.addEventListener('click', (e) => {
          e.stopPropagation();
          DOM.audioSettingsPopover.setAttribute('hidden', '');
        });
      }

      document.addEventListener('click', (e) => {
        if (DOM.audioSettingsPopover && !DOM.audioSettingsPopover.contains(e.target) && e.target !== DOM.btnAudioSettings) {
          DOM.audioSettingsPopover.setAttribute('hidden', '');
        }
      });
    }

    if (DOM.bgmVolumeSlider) {
      DOM.bgmVolumeSlider.value = Math.round(BGMPlayer.volume * 100);
      if (DOM.bgmVolumeLabel) DOM.bgmVolumeLabel.textContent = `${DOM.bgmVolumeSlider.value}%`;
      DOM.bgmVolumeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10) || 0;
        if (DOM.bgmVolumeLabel) DOM.bgmVolumeLabel.textContent = `${val}%`;
        BGMPlayer.setVolume(val / 100);
      });
    }

    if (DOM.sfxVolumeSlider) {
      DOM.sfxVolumeSlider.value = Math.round(SoundFX.volume * 100);
      if (DOM.sfxVolumeLabel) DOM.sfxVolumeLabel.textContent = `${DOM.sfxVolumeSlider.value}%`;
      DOM.sfxVolumeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10) || 0;
        if (DOM.sfxVolumeLabel) DOM.sfxVolumeLabel.textContent = `${val}%`;
        SoundFX.setVolume(val / 100);
      });
      DOM.sfxVolumeSlider.addEventListener('change', () => {
        SoundFX.playClick();
      });
    }

    // Tab 1 Writing Pad Tools
    if (DOM.btnClearCanvasTab1) {
      DOM.btnClearCanvasTab1.addEventListener('click', () => {
        if (tab1WritingPadInstance) tab1WritingPadInstance.clear();
      });
    }
    if (DOM.btnToggleGuideTab1) {
      DOM.btnToggleGuideTab1.addEventListener('click', () => {
        if (tab1WritingPadInstance) tab1WritingPadInstance.toggleGuide();
      });
    }

    // Tab 3 Sentence Filter Pills
    if (DOM.labFilterPills) {
      DOM.labFilterPills.querySelectorAll('.lab-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          DOM.labFilterPills.querySelectorAll('.lab-filter-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          STATE.labFilterCategory = pill.dataset.filter || 'all';
          renderTabLab();
          SoundFX.playClick();
        });
      });
    }

    // Shop & Profile Header Buttons
    if (DOM.btnOpenShop) {
      DOM.btnOpenShop.addEventListener('click', () => {
        openShopModal();
        SoundFX.playClick();
      });
    }
    if (DOM.btnCloseShopModal) {
      DOM.btnCloseShopModal.addEventListener('click', closeShopModal);
    }
    if (DOM.shopTabFrames) {
      DOM.shopTabFrames.addEventListener('click', () => {
        activeShopTab = 'frames';
        renderShopItems();
        SoundFX.playClick();
      });
    }
    if (DOM.shopTabTitles) {
      DOM.shopTabTitles.addEventListener('click', () => {
        activeShopTab = 'titles';
        renderShopItems();
        SoundFX.playClick();
      });
    }
    if (DOM.btnOpenUserProfile) {
      DOM.btnOpenUserProfile.addEventListener('click', () => {
        openProfileModal();
        SoundFX.playClick();
      });
    }

    // Stroke-Order Animation Buttons
    if (DOM.btnAnimateStrokesTab1) {
      DOM.btnAnimateStrokesTab1.addEventListener('click', () => {
        if (tab1WritingPadInstance) tab1WritingPadInstance.animateStrokes();
        SoundFX.playClick();
      });
    }
    if (DOM.btnAnimateStrokesQuest) {
      DOM.btnAnimateStrokesQuest.addEventListener('click', () => {
        if (questWritingPadInstance) questWritingPadInstance.animateStrokes();
        SoundFX.playClick();
      });
    }

    // Daily Endless Drill bindings
    if (DOM.btnStartDailyDrill) {
      DOM.btnStartDailyDrill.addEventListener('click', () => {
        DailyDrillManager.start();
        SoundFX.playClick();
      });
    }
    if (DOM.btnCloseDailyDrill) {
      DOM.btnCloseDailyDrill.addEventListener('click', () => {
        DailyDrillManager.close();
      });
    }
    if (DOM.btnFinishDailyDrill) {
      DOM.btnFinishDailyDrill.addEventListener('click', () => {
        DailyDrillManager.close();
      });
    }

    // Handwriting Verification bindings
    if (DOM.btnCheckWritingTab1) {
      DOM.btnCheckWritingTab1.addEventListener('click', () => {
        if (!tab1WritingPadInstance) return;
        const char = STATE.selectedSoundItem ? STATE.selectedSoundItem.char : '';
        const res = tab1WritingPadInstance.checkHandwritingAccuracy(char);
        if (res.pass) {
          awardXP(5, 'Luyện viết Tab 1');
          SoundFX.playCorrect();
          showToast(`✅ ${res.message} (${res.score}%)`, 'success');
        } else {
          SoundFX.playWrong();
          showToast(`⚡ ${res.message} (${res.score}%)`, 'info');
        }
      });
    }

    if (DOM.btnCheckWritingQuest) {
      DOM.btnCheckWritingQuest.addEventListener('click', () => {
        if (!questWritingPadInstance) return;
        const item = CURRENT_QUEST_STAGE && CURRENT_QUEST_STAGE.items ? CURRENT_QUEST_STAGE.items[CURRENT_QUEST_CHAR_INDEX] : null;
        const char = item ? item.char : '';
        const res = questWritingPadInstance.checkHandwritingAccuracy(char);

        if (DOM.questWritingScorePill) {
          DOM.questWritingScorePill.style.display = 'inline-flex';
          DOM.questWritingScorePill.textContent = `Điểm nét viết: ${res.score}% • ${res.message}`;
          DOM.questWritingScorePill.className = `writing-score-pill ${res.pass ? 'pass' : (res.score >= 35 ? 'retry' : 'low')}`;
        }

        if (res.pass) {
          if (DOM.btnQuestGoStep3) {
            DOM.btnQuestGoStep3.disabled = false;
            DOM.btnQuestGoStep3.classList.add('pulse-action');
          }
          awardXP(5, 'Luyện viết Ải');
          SoundFX.playCorrect();
          showToast(`🎉 Xuất sắc! Mở khóa Bước Khởi động (+5 XP)!`, 'success');
        } else {
          SoundFX.playWrong();
          showToast(res.message, 'info');
        }
      });
    }

    if (DOM.btnSkipWritingQuest) {
      DOM.btnSkipWritingQuest.addEventListener('click', () => {
        if (DOM.btnQuestGoStep3) {
          DOM.btnQuestGoStep3.disabled = false;
        }
        switchQuestStep(3);
        SoundFX.playClick();
        showToast(STATE.uiLang === 'vi' ? 'Đã bỏ qua bước viết. Sang Khởi động!' : 'Skipped writing step. Moving to Warm-up!', 'info');
      });
    }

    // Quest Lesson & 2D Battle Arena Modal Controls
    if (DOM.btnCloseQuestModal) {
      DOM.btnCloseQuestModal.addEventListener('click', closeQuestModal);
    }
    if (DOM.btnQuestGoStep2) {
      DOM.btnQuestGoStep2.addEventListener('click', () => {
        switchQuestStep(2);
        SoundFX.playClick();
      });
    }
    if (DOM.btnQuestBackStep1) {
      DOM.btnQuestBackStep1.addEventListener('click', () => {
        switchQuestStep(1);
        SoundFX.playClick();
      });
    }
    if (DOM.btnQuestGoStep3) {
      DOM.btnQuestGoStep3.addEventListener('click', () => {
        switchQuestStep(3);
        SoundFX.playClick();
      });
    }
    if (DOM.btnQuestBackStep2) {
      DOM.btnQuestBackStep2.addEventListener('click', () => {
        switchQuestStep(2);
        SoundFX.playClick();
      });
    }
    if (DOM.btnQuestGoStep4) {
      DOM.btnQuestGoStep4.addEventListener('click', () => {
        switchQuestStep(4);
        SoundFX.playClick();
      });
    }
    if (DOM.btnToggleGuideQuest) {
      DOM.btnToggleGuideQuest.addEventListener('click', () => {
        if (questWritingPadInstance) questWritingPadInstance.toggleGuide();
      });
    }
    if (DOM.btnClearCanvasQuest) {
      DOM.btnClearCanvasQuest.addEventListener('click', () => {
        if (questWritingPadInstance) questWritingPadInstance.clear();
      });
    }
    if (DOM.btnAudioWritingChar) {
      DOM.btnAudioWritingChar.addEventListener('click', () => {
        if (CURRENT_QUEST_STAGE && CURRENT_QUEST_STAGE.items && CURRENT_QUEST_STAGE.items[CURRENT_QUEST_CHAR_INDEX]) {
          playTargetLanguageAudio(CURRENT_QUEST_STAGE.items[CURRENT_QUEST_CHAR_INDEX].char);
        }
      });
    }
    if (DOM.btnPrevWritingChar) {
      DOM.btnPrevWritingChar.addEventListener('click', () => {
        CURRENT_QUEST_CHAR_INDEX--;
        loadWritingChar();
        SoundFX.playClick();
      });
    }
    if (DOM.btnNextWritingChar) {
      DOM.btnNextWritingChar.addEventListener('click', () => {
        CURRENT_QUEST_CHAR_INDEX++;
        loadWritingChar();
        SoundFX.playClick();
      });
    }
    if (DOM.btnFinishBattleVictory) {
      DOM.btnFinishBattleVictory.addEventListener('click', () => {
        closeQuestModal();
        renderCampaignPath();
      });
    }
    if (DOM.btnRetryBattle) {
      DOM.btnRetryBattle.addEventListener('click', () => {
        switchQuestStep(3);
      });
    }

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

    // Tab 1: Alphabet Search & Audio & Quick Drill
    if (DOM.soundSearchInput) {
      DOM.soundSearchInput.addEventListener('input', () => {
        renderTabAlphabet();
      });
    }

    if (DOM.btnStartSoundQuiz) {
      DOM.btnStartSoundQuiz.addEventListener('click', () => {
        startSoundQuiz();
      });
    }

    if (DOM.btnPlayNormal) {
      DOM.btnPlayNormal.addEventListener('click', () => {
        if (STATE.selectedSoundItem) speakText(STATE.selectedSoundItem.speechText || STATE.selectedSoundItem.char, STATE.currentLang, 1.0);
      });
    }

    if (DOM.btnPlaySlow) {
      DOM.btnPlaySlow.addEventListener('click', () => {
        if (STATE.selectedSoundItem) speakText(STATE.selectedSoundItem.speechText || STATE.selectedSoundItem.char, STATE.currentLang, 0.7);
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
          if (DOM.labTargetText) DOM.labTargetText.textContent = STATE.selectedSoundItem.speechText || STATE.selectedSoundItem.char;
          if (DOM.labTargetPhonetic) DOM.labTargetPhonetic.textContent = STATE.selectedSoundItem.romaji || (STATE.selectedSoundItem.ipa ? `/${STATE.selectedSoundItem.ipa}/` : '');
          if (DOM.labTargetMeaning) DOM.labTargetMeaning.textContent = (STATE.uiLang === 'vi' ? STATE.selectedSoundItem.meaningVi : STATE.selectedSoundItem.meaningEn) || STATE.selectedSoundItem.char;
        }
      });
    }

    // Tab 2: Expressions Subtabs Switcher & Quick Drill
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

    if (DOM.btnStartExpQuiz) {
      DOM.btnStartExpQuiz.addEventListener('click', () => {
        startExpQuiz();
      });
    }

    // Active Recall Quiz Modal Controls
    if (DOM.btnCloseQuizModal) {
      DOM.btnCloseQuizModal.addEventListener('click', closeQuizModal);
    }

    if (DOM.btnQuizPlayAudio) {
      DOM.btnQuizPlayAudio.addEventListener('click', () => {
        const q = STATE.quiz.questions[STATE.quiz.currentIndex];
        if (q && q.speechText) speakText(q.speechText, STATE.currentLang, 1.0);
      });
    }

    if (DOM.btnQuizRetry) {
      DOM.btnQuizRetry.addEventListener('click', () => {
        if (STATE.quiz.type === 'sound') startSoundQuiz();
        else startExpQuiz();
      });
    }

    if (DOM.btnQuizFinish) {
      DOM.btnQuizFinish.addEventListener('click', closeQuizModal);
    }

    // Tab 3: Lab Controls & Custom Sentence Shadowing
    if (DOM.btnModeCurated) {
      DOM.btnModeCurated.addEventListener('click', () => {
        STATE.labMode = 'curated';
        DOM.btnModeCurated.classList.add('active');
        if (DOM.btnModeCustom) DOM.btnModeCustom.classList.remove('active');
        if (DOM.curatedSentenceWrap) DOM.curatedSentenceWrap.style.display = 'flex';
        if (DOM.customSentenceWrap) DOM.customSentenceWrap.style.display = 'none';
        if (STATE.flattenedLabSentences && STATE.flattenedLabSentences[STATE.selectedLabIndex]) {
          updateLabTargetSentence(STATE.flattenedLabSentences[STATE.selectedLabIndex]);
        }
      });
    }

    if (DOM.btnModeCustom) {
      DOM.btnModeCustom.addEventListener('click', () => {
        STATE.labMode = 'custom';
        DOM.btnModeCustom.classList.add('active');
        if (DOM.btnModeCurated) DOM.btnModeCurated.classList.remove('active');
        if (DOM.curatedSentenceWrap) DOM.curatedSentenceWrap.style.display = 'none';
        if (DOM.customSentenceWrap) DOM.customSentenceWrap.style.display = 'flex';
        if (DOM.customSentenceInput) DOM.customSentenceInput.focus();
        if (STATE.currentLabCustomSentence) {
          updateLabTargetSentence(STATE.currentLabCustomSentence);
        }
      });
    }

    if (DOM.btnApplyCustomSentence) {
      DOM.btnApplyCustomSentence.addEventListener('click', applyCustomSentence);
    }

    if (DOM.customSentenceInput) {
      DOM.customSentenceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyCustomSentence();
        }
      });
    }

    if (DOM.labSentenceSelect) {
      DOM.labSentenceSelect.addEventListener('change', (e) => {
        STATE.selectedLabIndex = parseInt(e.target.value, 10) || 0;
        if (STATE.flattenedLabSentences && STATE.flattenedLabSentences[STATE.selectedLabIndex]) {
          updateLabTargetSentence(STATE.flattenedLabSentences[STATE.selectedLabIndex]);
        }
      });
    }

    if (DOM.btnLabListenNormal) {
      DOM.btnLabListenNormal.addEventListener('click', () => {
        const text = DOM.labTargetText ? DOM.labTargetText.textContent : '';
        speakText(text, STATE.currentLang, 1.0);
        trackItemPractice(text, STATE.uiLang === 'vi' ? 'Luyện nghe câu' : 'Practiced sentence');
      });
    }

    if (DOM.btnLabListenSlow) {
      DOM.btnLabListenSlow.addEventListener('click', () => {
        const text = DOM.labTargetText ? DOM.labTargetText.textContent : '';
        speakText(text, STATE.currentLang, 0.7);
        trackItemPractice(text, STATE.uiLang === 'vi' ? 'Luyện nghe chậm' : 'Practiced slow sentence');
      });
    }

    if (DOM.btnToggleRecord) {
      DOM.btnToggleRecord.addEventListener('click', toggleLabRecording);
    }

    if (DOM.btnSaveLabWeakSpot) {
      DOM.btnSaveLabWeakSpot.addEventListener('click', () => {
        const activeSentence = (STATE.labMode === 'custom' && STATE.currentLabCustomSentence)
          ? STATE.currentLabCustomSentence
          : (STATE.flattenedLabSentences ? STATE.flattenedLabSentences[STATE.selectedLabIndex] : null);
        if (activeSentence) {
          addToWeakSpotsAuto({
            char: activeSentence.text,
            phonetic: activeSentence.phonetic || '',
            vi: activeSentence.vi || '',
            en: activeSentence.en || ''
          });
          showToast(STATE.uiLang === 'vi' ? 'Đã lưu câu vào mục Cần sửa! 🎯' : 'Saved to weak points! 🎯');
        }
      });
    }

    if (DOM.btnNextLabSentence) {
      DOM.btnNextLabSentence.addEventListener('click', () => {
        if (STATE.flattenedLabSentences && STATE.flattenedLabSentences.length > 0) {
          STATE.selectedLabIndex = (STATE.selectedLabIndex + 1) % STATE.flattenedLabSentences.length;
          if (DOM.labSentenceSelect) DOM.labSentenceSelect.value = STATE.selectedLabIndex;
          updateLabTargetSentence(STATE.flattenedLabSentences[STATE.selectedLabIndex]);
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

    // Dismiss drawer when clicking on dark backdrop
    [DOM.weakSpotsOverlay, DOM.bookmarksOverlay, DOM.friendsOverlay, DOM.quizModalOverlay].forEach(overlay => {
      if (overlay) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            if (overlay === DOM.quizModalOverlay) closeQuizModal();
            else overlay.classList.remove('open');
          }
        });
      }
    });
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
    try { cacheDOMElements(); } catch (e) { console.warn('cacheDOMElements error:', e); }
    try { checkAndUpdateDailyStreak(); } catch (e) {}
    try { applyCulturalTheme(STATE.currentLang); } catch (e) {}
    try { initTts(); } catch (e) {}
    try { initSpeechRecognition(); } catch (e) {}
    try { initChatVoiceDictation(); } catch (e) {}
    try { initAmbientCanvas(); } catch (e) {}

    try {
      if (DOM.tab1WritingCanvas) {
        tab1WritingPadInstance = new WritingPad(DOM.tab1WritingCanvas, DOM.tab1CanvasWatermark);
      }
    } catch (e) {}

    try { bindEventListeners(); } catch (e) { console.error('bindEventListeners error:', e); }
    try { setUILanguage(STATE.uiLang); } catch (e) {}
    try { renderTabLab(); } catch (e) { console.error('renderTabLab error:', e); }
    try { renderCampaignPath(); } catch (e) { console.error('renderCampaignPath error:', e); }
    try { switchTab(STATE.activeTab); } catch (e) { console.error('switchTab error:', e); }

    try {
      if (DOM.sfxIcon && typeof SoundFX !== 'undefined') {
        DOM.sfxIcon.textContent = SoundFX.muted ? '🔇' : '🔊';
      }
      if (typeof BGMPlayer !== 'undefined') {
        BGMPlayer.init();
      }
    } catch (e) {}

    safeRAF(() => {
      try { updateNavIndicator(); } catch (e) {}
    });
    setTimeout(() => {
      try { updateNavIndicator(); } catch (e) {}
    }, 100);

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
