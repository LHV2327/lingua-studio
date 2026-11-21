// ==========================================================================
// LinguaStudio — Core Interactive Application Logic
// ==========================================================================

(function () {
  'use strict';

  // State Management
  const STATE = {
    uiLang: localStorage.getItem('lingua_ui_lang') || 'vi',
    currentLang: localStorage.getItem('lingua_selected_lang') || 'ja-JP',
    activeTab: localStorage.getItem('lingua_active_tab') || 'tab-alphabet',
    alphabetCategory: null,
    selectedSoundItem: null,
    expressionFilter: 'all',
    expressionSearchQuery: '',
    
    // Lab state
    labMode: 'curated', // 'curated' | 'custom'
    selectedLabIndex: 0,
    customLabSentence: null,
    ttsSpeed: 1.0,
    ttsLoop: false,
    
    // Recognition state
    isRecording: false,
    recognition: null,
    speechSupported: false,
    voicesLoaded: false,
    availableVoices: [],

    // Storage
    weakSpots: JSON.parse(localStorage.getItem('lingua_weak_spots') || '[]'),
    bookmarks: JSON.parse(localStorage.getItem('lingua_bookmarks') || '[]')
  };

  // DOM Elements Cache
  const DOM = {};

  function cacheDOMElements() {
    DOM.uiLangBtns = document.querySelectorAll('.ui-lang-btn');
    DOM.langPills = document.querySelectorAll('.lang-pill');
    DOM.navTabs = document.querySelectorAll('.nav-tab');
    DOM.tabPanes = document.querySelectorAll('.tab-pane');
    DOM.statusBanner = document.getElementById('statusBanner');
    DOM.statusText = document.getElementById('statusText');
    DOM.statusDismiss = document.getElementById('statusDismiss');
    
    // Header counters
    DOM.bookmarkCount = document.getElementById('bookmarkCount');
    DOM.weakSpotCount = document.getElementById('weakSpotCount');
    DOM.btnOpenBookmarks = document.getElementById('btnOpenBookmarks');
    DOM.btnOpenWeakSpots = document.getElementById('btnOpenWeakSpots');

    // Tab 1: Alphabet
    DOM.alphabetSubtitle = document.getElementById('alphabetSubtitle');
    DOM.alphabetSubFilters = document.getElementById('alphabetSubFilters');
    DOM.soundGrid = document.getElementById('soundGrid');
    DOM.gridCounter = document.getElementById('gridCounter');
    DOM.inspectChar = document.getElementById('inspectChar');
    DOM.inspectAudioBtn = document.getElementById('inspectAudioBtn');
    DOM.inspectRomaji = document.getElementById('inspectRomaji');
    DOM.inspectIpa = document.getElementById('inspectIpa');
    DOM.inspectGroup = document.getElementById('inspectGroup');
    DOM.inspectTitle = document.getElementById('inspectTitle');
    DOM.inspectMouthTip = document.getElementById('inspectMouthTip');
    DOM.inspectWordNative = document.getElementById('inspectWordNative');
    DOM.inspectWordReading = document.getElementById('inspectWordReading');
    DOM.inspectWordMeaning = document.getElementById('inspectWordMeaning');
    DOM.inspectWordPlayBtn = document.getElementById('inspectWordPlayBtn');
    DOM.inspectProTip = document.getElementById('inspectProTip');

    // Tab 2: Expressions
    DOM.expressionSearch = document.getElementById('expressionSearch');
    DOM.situationPills = document.getElementById('situationPills');
    DOM.expressionsList = document.getElementById('expressionsList');

    // Tab 3: Lab
    DOM.btnModeCurated = document.getElementById('btnModeCurated');
    DOM.btnModeCustom = document.getElementById('btnModeCustom');
    DOM.curatedView = document.getElementById('curatedView');
    DOM.customView = document.getElementById('customView');
    DOM.sentenceSelect = document.getElementById('sentenceSelect');
    DOM.sentenceTags = document.getElementById('sentenceTags');
    DOM.customTextInput = document.getElementById('customTextInput');
    DOM.btnApplyCustomText = document.getElementById('btnApplyCustomText');

    DOM.targetLevelBadge = document.getElementById('targetLevelBadge');
    DOM.labTargetText = document.getElementById('labTargetText');
    DOM.labTargetPhonetic = document.getElementById('labTargetPhonetic');
    DOM.labTargetTrans = document.getElementById('labTargetTrans');
    DOM.labAccentType = document.getElementById('labAccentType');
    DOM.labPitchTrack = document.getElementById('labPitchTrack');
    DOM.labPitchHintText = document.getElementById('labPitchHintText');
    DOM.labTipsContent = document.getElementById('labTipsContent');

    DOM.ttsSpeedSlider = document.getElementById('ttsSpeedSlider');
    DOM.speedValueDisplay = document.getElementById('speedValueDisplay');
    DOM.btnPlayNativeTts = document.getElementById('btnPlayNativeTts');
    DOM.btnPlayNativeSlow = document.getElementById('btnPlayNativeSlow');
    DOM.btnToggleLoop = document.getElementById('btnToggleLoop');
    DOM.loopStatusIcon = document.getElementById('loopStatusIcon');

    DOM.btnRecordMic = document.getElementById('btnRecordMic');
    DOM.recordingPrompt = document.getElementById('recordingPrompt');
    DOM.recordingSubhint = document.getElementById('recordingSubhint');
    DOM.recognitionStatusTag = document.getElementById('recognitionStatusTag');
    DOM.simMicWrapper = document.getElementById('simMicWrapper');
    DOM.simSpeechInput = document.getElementById('simSpeechInput');
    DOM.btnSimDiff = document.getElementById('btnSimDiff');

    DOM.evalResultsStage = document.getElementById('evalResultsStage');
    DOM.evalPlaceholder = document.getElementById('evalPlaceholder');
    DOM.scoreRingProgress = document.getElementById('scoreRingProgress');
    DOM.evalScoreNum = document.getElementById('evalScoreNum');
    DOM.evalGradeTitle = document.getElementById('evalGradeTitle');
    DOM.evalGradeFeedback = document.getElementById('evalGradeFeedback');
    DOM.metricMatchCount = document.getElementById('metricMatchCount');
    DOM.metricMissCount = document.getElementById('metricMissCount');
    DOM.diffChipGrid = document.getElementById('diffChipGrid');
    DOM.evalTranscriptText = document.getElementById('evalTranscriptText');
    DOM.btnSaveToWeakSpots = document.getElementById('btnSaveToWeakSpots');
    DOM.btnRetrySentence = document.getElementById('btnRetrySentence');

    // Drawers / Overlays
    DOM.weakSpotsOverlay = document.getElementById('weakSpotsOverlay');
    DOM.btnCloseWeakSpots = document.getElementById('btnCloseWeakSpots');
    DOM.btnCloseWeakSpotsBottom = document.getElementById('btnCloseWeakSpotsBottom');
    DOM.btnClearWeakSpots = document.getElementById('btnClearWeakSpots');
    DOM.weakSpotsList = document.getElementById('weakSpotsList');

    DOM.bookmarksOverlay = document.getElementById('bookmarksOverlay');
    DOM.btnCloseBookmarks = document.getElementById('btnCloseBookmarks');
    DOM.btnCloseBookmarksBottom = document.getElementById('btnCloseBookmarksBottom');
    DOM.btnClearBookmarks = document.getElementById('btnClearBookmarks');
    DOM.bookmarksList = document.getElementById('bookmarksList');
  }

  // ==========================================================================
  // UI Localization (VI / EN)
  // ==========================================================================

  function setUILanguage(lang) {
    if (lang !== 'vi' && lang !== 'en') lang = 'vi';
    STATE.uiLang = lang;
    localStorage.setItem('lingua_ui_lang', lang);

    document.documentElement.lang = lang;

    // Update switcher active state
    DOM.uiLangBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.uiLang === lang);
    });

    const dict = UI_I18N[lang] || UI_I18N.vi;

    // Update all elements with [data-i18n]
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    // Update inputs placeholders
    if (DOM.expressionSearch && dict.searchPlaceholder) {
      DOM.expressionSearch.placeholder = dict.searchPlaceholder;
    }
    if (DOM.customTextInput && dict.customTextPlaceholder) {
      DOM.customTextInput.placeholder = dict.customTextPlaceholder;
    }
    if (DOM.simSpeechInput && dict.simPlaceholder) {
      DOM.simSpeechInput.placeholder = dict.simPlaceholder;
    }

    // Update Loop label
    if (DOM.btnToggleLoop) {
      DOM.btnToggleLoop.innerHTML = `<span>🔁</span> ${dict.loop} ${STATE.ttsLoop ? (lang === 'vi' ? 'Bật' : 'On') : (lang === 'vi' ? 'Tắt' : 'Off')}`;
    }

    // Refresh active tab views so dynamic strings are translated
    renderActiveTab();
  }

  // ==========================================================================
  // Web Speech API: Text-to-Speech (TTS) Engine
  // ==========================================================================

  function initTts() {
    if (!('speechSynthesis' in window)) {
      showStatusBanner(STATE.uiLang === 'vi' 
        ? 'Trình duyệt của bạn không hỗ trợ Web Speech Synthesis. Tính năng phát âm sẽ bị tắt.'
        : 'Your browser does not support Web Speech Synthesis. Audio playback will be disabled.', true);
      return;
    }

    function populateVoices() {
      STATE.availableVoices = window.speechSynthesis.getVoices();
      STATE.voicesLoaded = STATE.availableVoices.length > 0;
    }

    populateVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = populateVoices;
    }
  }

  function getBestVoiceForLanguage(langCode) {
    if (!STATE.availableVoices.length) {
      STATE.availableVoices = window.speechSynthesis.getVoices();
    }

    // Try exact match
    let voice = STATE.availableVoices.find(v => v.lang === langCode);
    if (voice) return voice;

    // Try prefix match (e.g. 'ja', 'ko', 'zh', 'en')
    const prefix = langCode.split('-')[0];
    voice = STATE.availableVoices.find(v => v.lang.startsWith(prefix));
    return voice || null;
  }

  function speakText(text, langCode, speed = 1.0, onEndCallback = null) {
    if (!('speechSynthesis' in window)) {
      alert(STATE.uiLang === 'vi' ? 'Trình duyệt không hỗ trợ phát âm.' : 'Speech synthesis is not supported in this browser.');
      return;
    }

    // Cancel ongoing speech to avoid queue stacking
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

    utterance.onend = () => {
      if (STATE.ttsLoop) {
        setTimeout(() => speakText(text, langCode, speed, onEndCallback), 400);
      } else if (onEndCallback) {
        onEndCallback();
      }
    };

    utterance.onerror = (e) => {
      console.warn('TTS utterance error:', e);
    };

    window.speechSynthesis.speak(utterance);
  }

  // ==========================================================================
  // Web Speech API: Speech Recognition Engine
  // ==========================================================================

  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;

    if (!SpeechRecognition) {
      STATE.speechSupported = false;
      DOM.recognitionStatusTag.textContent = STATE.uiLang === 'vi' ? 'Chế độ mô phỏng' : 'Simulated Mode';
      DOM.recognitionStatusTag.style.background = 'rgba(245, 158, 11, 0.2)';
      DOM.recognitionStatusTag.style.color = 'var(--amber)';
      DOM.simMicWrapper.style.display = 'block';
      showStatusBanner(STATE.uiLang === 'vi'
        ? 'Trình duyệt chưa hỗ trợ SpeechRecognition trực tiếp (thường gặp trên Firefox/Safari). Khuyến nghị dùng Chrome/Edge hoặc nhập thủ công bên dưới.'
        : 'Native SpeechRecognition is not supported in this browser (common in Firefox/Safari). Use Chrome/Edge for live mic or test via manual input below.', false);
      return;
    }

    STATE.speechSupported = true;
    STATE.recognition = new SpeechRecognition();
    STATE.recognition.continuous = false;
    STATE.recognition.interimResults = false;
    STATE.recognition.maxAlternatives = 1;

    STATE.recognition.onstart = () => {
      STATE.isRecording = true;
      DOM.btnRecordMic.classList.add('is-recording');
      DOM.recognitionStatusTag.textContent = dict.listening || 'Listening...';
      DOM.recognitionStatusTag.className = 'lab-status-tag recording';
      DOM.recordingPrompt.textContent = dict.listening || 'Listening to your speech...';
      DOM.recordingSubhint.textContent = dict.speakClearly || 'Speak clearly now!';
    };

    STATE.recognition.onresult = (event) => {
      if (event.results && event.results.length > 0) {
        const transcript = event.results[0][0].transcript;
        processSpokenResult(transcript);
      }
    };

    STATE.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      stopRecordingUI();
      if (event.error === 'not-allowed') {
        showStatusBanner(STATE.uiLang === 'vi'
          ? 'Quyền truy cập micro bị từ chối. Vui lòng cấp quyền micro hoặc kiểm tra bằng cách nhập tay.'
          : 'Microphone permission denied. Please allow microphone access or test using manual input.', true);
        DOM.simMicWrapper.style.display = 'block';
      } else if (event.error === 'no-speech') {
        DOM.recordingPrompt.textContent = STATE.uiLang === 'vi' ? 'Không nghe thấy giọng nói. Nhấp lại micro để thử lại.' : 'No speech detected. Click mic to retry.';
      } else {
        DOM.recordingPrompt.textContent = `Lỗi nhận diện: ${event.error}`;
      }
    };

    STATE.recognition.onend = () => {
      stopRecordingUI();
    };
  }

  function toggleRecording() {
    if (!STATE.speechSupported) {
      DOM.simMicWrapper.style.display = 'block';
      DOM.simSpeechInput.focus();
      return;
    }

    if (STATE.isRecording) {
      STATE.recognition.stop();
    } else {
      try {
        STATE.recognition.lang = STATE.currentLang;
        STATE.recognition.start();
      } catch (err) {
        console.warn('Recognition start exception:', err);
        STATE.recognition.stop();
      }
    }
  }

  function stopRecordingUI() {
    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;
    STATE.isRecording = false;
    DOM.btnRecordMic.classList.remove('is-recording');
    DOM.recognitionStatusTag.textContent = dict.micReady || 'Mic Ready';
    DOM.recognitionStatusTag.className = 'lab-status-tag';
    DOM.recordingPrompt.textContent = dict.clickToRecord || 'Click to Record & Check Pronunciation';
    DOM.recordingSubhint.textContent = dict.speakClearly || 'Speak clearly in your headset or microphone';
  }

  // ==========================================================================
  // Phonetic & Word Diff Scoring Engine
  // ==========================================================================

  function normalizeText(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'。、！？「」…~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenizeText(str, langCode) {
    const clean = normalizeText(str);
    if (!clean) return [];

    if (langCode === 'en-US') {
      return clean.split(/\s+/).filter(Boolean);
    } else {
      // CJK or mixed
      if (clean.includes(' ')) {
        const parts = clean.split(' ');
        const tokens = [];
        parts.forEach(part => {
          if (part.length <= 2) {
            tokens.push(part);
          } else {
            for (let i = 0; i < part.length; i += 2) {
              tokens.push(part.slice(i, i + 2));
            }
          }
        });
        return tokens;
      } else {
        return clean.split('');
      }
    }
  }

  function calculateSpeechDiff(targetText, spokenText, langCode) {
    const targetTokens = tokenizeText(targetText, langCode);
    const spokenTokens = tokenizeText(spokenText, langCode);

    if (targetTokens.length === 0) {
      return { score: 0, matchedTokens: [], diffMap: [] };
    }

    const diffMap = [];
    let matchCount = 0;
    const spokenSet = [...spokenTokens];

    targetTokens.forEach(token => {
      const matchIndex = spokenSet.findIndex(st => st === token || st.includes(token) || token.includes(st));
      if (matchIndex !== -1) {
        matchCount++;
        diffMap.push({ token, status: 'matched' });
        spokenSet.splice(matchIndex, 1);
      } else {
        diffMap.push({ token, status: 'missed' });
      }
    });

    const score = Math.round((matchCount / targetTokens.length) * 100);

    return {
      score,
      matchCount,
      missCount: targetTokens.length - matchCount,
      diffMap,
      targetTokens,
      spokenTokens
    };
  }

  function processSpokenResult(transcript) {
    const currentTarget = getCurrentLabTarget();
    if (!currentTarget) return;

    const diffResult = calculateSpeechDiff(currentTarget.text, transcript, STATE.currentLang);
    renderEvaluationResults(diffResult, transcript, currentTarget);
  }

  function renderEvaluationResults(diffResult, transcript, currentTarget) {
    DOM.evalPlaceholder.style.display = 'none';
    DOM.evalResultsStage.style.display = 'flex';

    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (diffResult.score / 100) * circumference;

    DOM.scoreRingProgress.style.strokeDasharray = `${circumference}`;
    DOM.scoreRingProgress.style.strokeDashoffset = `${offset}`;

    if (diffResult.score >= 80) {
      DOM.scoreRingProgress.style.stroke = 'var(--emerald)';
    } else if (diffResult.score >= 60) {
      DOM.scoreRingProgress.style.stroke = 'var(--amber)';
    } else {
      DOM.scoreRingProgress.style.stroke = 'var(--rose)';
    }

    DOM.evalScoreNum.textContent = `${diffResult.score}%`;
    DOM.metricMatchCount.textContent = diffResult.matchCount;
    DOM.metricMissCount.textContent = diffResult.missCount;

    // Localized Grade feedback
    const isVi = STATE.uiLang === 'vi';
    if (diffResult.score >= 90) {
      DOM.evalGradeTitle.textContent = isVi ? '🌟 Đẳng cấp bản xứ!' : '🌟 Native-Level Mastery!';
      DOM.evalGradeFeedback.textContent = isVi 
        ? 'Ngữ điệu, cao độ và phát âm hoàn hảo. Hãy tiếp tục phát huy!' 
        : 'Flawless cadence, pitch, and phonetic accuracy. Keep it up!';
    } else if (diffResult.score >= 75) {
      DOM.evalGradeTitle.textContent = isVi ? '👏 Phát âm rất chuẩn!' : '👏 Great Pronunciation!';
      DOM.evalGradeFeedback.textContent = isVi 
        ? 'Rõ ràng và dễ hiểu. Hãy tinh chỉnh các âm màu đỏ được đánh dấu.' 
        : 'Clear and easily intelligible. Fine-tune the highlighted red syllables.';
    } else if (diffResult.score >= 50) {
      DOM.evalGradeTitle.textContent = isVi ? '💪 Nỗ lực tốt — Rèn luyện nhịp điệu' : '💪 Good Effort — Polish Rhythm';
      DOM.evalGradeFeedback.textContent = isVi 
        ? 'Bạn đã đọc đúng các từ chính. Thử luyện Shadowing ở tốc độ 0.7x để làm chủ các âm khó.' 
        : 'You hit key parts of the sentence. Try shadowing at 0.7x speed to lock in tricky sounds.';
    } else {
      DOM.evalGradeTitle.textContent = isVi ? '🎯 Tập trung vào âm cơ bản' : '🎯 Focus on Fundamentals';
      DOM.evalGradeFeedback.textContent = isVi 
        ? 'Xem kỹ hướng dẫn vị trí đặt lưỡi ở bên trái và nhắc lại theo giọng mẫu.' 
        : 'Review the mouth placement notes on the left and repeat after the native voice.';
    }

    // Render Diff Chips
    DOM.diffChipGrid.innerHTML = '';
    diffResult.diffMap.forEach(item => {
      const chip = document.createElement('div');
      chip.className = `diff-chip ${item.status}`;
      chip.innerHTML = `
        <span class="chip-text">${escapeHtml(item.token)}</span>
        <span class="chip-symbol">${item.status === 'matched' ? '✓' : '✗'}</span>
      `;
      DOM.diffChipGrid.appendChild(chip);
    });

    // Transcript display
    DOM.evalTranscriptText.textContent = `"${transcript || (isVi ? '(Yên lặng / Không rõ)' : '(Silence / Unintelligible)')}"`;

    // Store last evaluation data on DOM button
    DOM.btnSaveToWeakSpots.dataset.lastScore = diffResult.score;
    DOM.btnSaveToWeakSpots.dataset.lastSentence = JSON.stringify(currentTarget);
  }

  // ==========================================================================
  // Tab 1: Alphabet & Sound Chart Logic
  // ==========================================================================

  function renderAlphabetTab() {
    const langData = LINGUA_DATA[STATE.currentLang];
    if (!langData || !langData.alphabet) return;

    const alphabetData = langData.alphabet;
    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;

    DOM.alphabetSubtitle.textContent = STATE.uiLang === 'vi'
      ? `Khám phá các ký tự ${langData.name} (${langData.nativeName}), ký hiệu ngữ âm quốc tế IPA và hướng dẫn khẩu hình chi tiết.`
      : `Explore ${langData.name} (${langData.nativeName}) characters, phonetic IPA, and mouth mechanics.`;

    // Sub-filters (Categories)
    DOM.alphabetSubFilters.innerHTML = '';
    if (!STATE.alphabetCategory || !alphabetData.categories.find(c => c.id === STATE.alphabetCategory)) {
      STATE.alphabetCategory = alphabetData.categories[0].id;
    }

    alphabetData.categories.forEach(cat => {
      const pill = document.createElement('button');
      pill.className = `sub-pill ${cat.id === STATE.alphabetCategory ? 'active' : ''}`;
      // Localized category name
      const catName = cat['name_' + STATE.uiLang] || cat.name_vi || cat.name_en || cat.name;
      pill.textContent = catName;
      pill.addEventListener('click', () => {
        STATE.alphabetCategory = cat.id;
        // Reset selected tile to first item in new category
        const newItems = alphabetData.items.filter(item => item.category === cat.id);
        if (newItems.length > 0) {
          STATE.selectedSoundItem = newItems[0];
        }
        renderAlphabetTab();
      });
      DOM.alphabetSubFilters.appendChild(pill);
    });

    // Filter Items by active category
    const filteredItems = alphabetData.items.filter(item => item.category === STATE.alphabetCategory);
    const activeCatObj = alphabetData.categories.find(c => c.id === STATE.alphabetCategory) || alphabetData.categories[0];
    const activeCatName = activeCatObj['name_' + STATE.uiLang] || activeCatObj.name_vi || activeCatObj.name_en || activeCatObj.name;

    DOM.gridCounter.textContent = `${dict.showingSounds} ${filteredItems.length} ${dict.soundsIn} ${activeCatName}`;

    // Render Tiles Grid
    DOM.soundGrid.innerHTML = '';
    filteredItems.forEach((item) => {
      const tile = document.createElement('div');
      const isSelected = STATE.selectedSoundItem && STATE.selectedSoundItem.char === item.char;
      tile.className = `sound-tile ${isSelected ? 'active' : ''}`;
      tile.innerHTML = `
        <span class="tile-char">${escapeHtml(item.char)}</span>
        <span class="tile-romaji">${escapeHtml(item.romaji)}</span>
        <span class="tile-ipa">${escapeHtml(item.ipa)}</span>
        <span class="tile-audio-indicator">🔊</span>
      `;

      tile.addEventListener('click', () => {
        selectSoundTile(item);
        speakText(item.char, STATE.currentLang, 1.0);
      });

      DOM.soundGrid.appendChild(tile);
    });

    // Default select first item if none selected or if selected item not in current category
    if (!STATE.selectedSoundItem || !filteredItems.find(i => i.char === STATE.selectedSoundItem.char)) {
      if (filteredItems.length > 0) {
        selectSoundTile(filteredItems[0]);
      }
    } else {
      updateSoundInspector(STATE.selectedSoundItem);
    }
  }

  function selectSoundTile(item) {
    STATE.selectedSoundItem = item;
    const tiles = DOM.soundGrid.querySelectorAll('.sound-tile');
    tiles.forEach(tile => {
      const charEl = tile.querySelector('.tile-char');
      if (charEl && charEl.textContent === item.char) {
        tile.classList.add('active');
      } else {
        tile.classList.remove('active');
      }
    });

    updateSoundInspector(item);
  }

  function updateSoundInspector(item) {
    if (!item) return;

    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;

    DOM.inspectChar.textContent = item.char;
    DOM.inspectRomaji.textContent = item.romaji;
    DOM.inspectIpa.textContent = item.ipa;
    DOM.inspectGroup.textContent = item.group || (STATE.uiLang === 'vi' ? 'Âm vị' : 'Phoneme');
    DOM.inspectTitle.textContent = `${item.char} (${item.romaji})`;

    // Localized mouth placement tip
    const mouthTip = item['mouthTip_' + STATE.uiLang] || item.mouthTip_vi || item.mouthTip_en || item.mouthTip || '';
    DOM.inspectMouthTip.textContent = mouthTip;

    // Example word & meaning
    if (item.example) {
      DOM.inspectWordNative.textContent = item.example.word;
      DOM.inspectWordReading.textContent = item.example.reading;
      const wordMeaning = item.example['meaning_' + STATE.uiLang] || item.example.meaning_vi || item.example.meaning_en || item.example.meaning || '';
      DOM.inspectWordMeaning.textContent = wordMeaning;
    }

    // Set audio button handlers
    DOM.inspectAudioBtn.onclick = () => {
      speakText(item.char, STATE.currentLang, 1.0);
    };

    DOM.inspectWordPlayBtn.onclick = () => {
      if (item.example) {
        speakText(item.example.word, STATE.currentLang, 1.0);
      }
    };

    // Native Pro Tip localized
    const proTipsDict = (dict.proTips && dict.proTips[STATE.currentLang]) || (UI_I18N.vi.proTips && UI_I18N.vi.proTips[STATE.currentLang]);
    DOM.inspectProTip.textContent = proTipsDict || (STATE.uiLang === 'vi' ? 'Nghe nhiều lần để ghi nhớ vị trí cơ miệng của người bản xứ.' : 'Listen repeatedly to internalize native tongue placement.');
  }

  // ==========================================================================
  // Tab 2: Native Speaking Styles (Textbook vs Real Life)
  // ==========================================================================

  function renderExpressionsTab() {
    const langData = LINGUA_DATA[STATE.currentLang];
    if (!langData || !langData.expressions) return;

    const expressions = langData.expressions;
    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;

    // Unique situations
    const situations = ['all', ...new Set(expressions.map(e => e.situation))];

    // Render Situation Filter Pills
    DOM.situationPills.innerHTML = '';
    situations.forEach(sit => {
      const pill = document.createElement('button');
      pill.className = `situation-pill ${STATE.expressionFilter === sit ? 'active' : ''}`;
      
      let label = sit;
      if (sit === 'all') {
        label = dict.allSituations || 'All Situations';
      } else {
        // Look up localized situation name from first matching expression
        const matchExp = expressions.find(e => e.situation === sit);
        if (matchExp && matchExp['situation_' + STATE.uiLang]) {
          label = matchExp['situation_' + STATE.uiLang];
        }
      }

      pill.textContent = label;
      pill.addEventListener('click', () => {
        STATE.expressionFilter = sit;
        renderExpressionsTab();
      });
      DOM.situationPills.appendChild(pill);
    });

    // Filter expressions by situation & search query
    const q = STATE.expressionSearchQuery.toLowerCase().trim();
    const filtered = expressions.filter(exp => {
      const matchSit = STATE.expressionFilter === 'all' || exp.situation === STATE.expressionFilter;
      if (!matchSit) return false;
      if (!q) return true;

      const sitVi = (exp.situation_vi || '').toLowerCase();
      const sitEn = (exp.situation_en || exp.situation || '').toLowerCase();
      const scenVi = (exp.scenario_vi || '').toLowerCase();
      const scenEn = (exp.scenario_en || exp.scenario || '').toLowerCase();
      const formalText = (exp.formal.text || '').toLowerCase();
      const formalTrans = (exp.formal['translation_' + STATE.uiLang] || exp.formal.translation || '').toLowerCase();
      const casualText = (exp.casual.text || '').toLowerCase();
      const casualTrans = (exp.casual['translation_' + STATE.uiLang] || exp.casual.translation || '').toLowerCase();

      return (
        sitVi.includes(q) || sitEn.includes(q) ||
        scenVi.includes(q) || scenEn.includes(q) ||
        formalText.includes(q) || formalTrans.includes(q) ||
        casualText.includes(q) || casualTrans.includes(q)
      );
    });

    // Render Expression Cards
    DOM.expressionsList.innerHTML = '';
    if (filtered.length === 0) {
      DOM.expressionsList.innerHTML = `
        <div class="drawer-empty-state">
          <p>${STATE.uiLang === 'vi' ? 'Không tìm thấy mẫu câu phù hợp với' : 'No expressions found matching'} "${escapeHtml(q)}".</p>
        </div>
      `;
      return;
    }

    filtered.forEach(exp => {
      const isBookmarked = STATE.bookmarks.some(b => b.id === exp.id);
      const card = document.createElement('article');
      card.className = 'expression-group-card';

      const sitLabel = exp['situation_' + STATE.uiLang] || exp.situation;
      const scenarioTitle = exp['scenario_' + STATE.uiLang] || exp.scenario;
      const formalTrans = exp.formal['translation_' + STATE.uiLang] || exp.formal.translation;
      const casualTrans = exp.casual['translation_' + STATE.uiLang] || exp.casual.translation;
      const culturalNote = exp['culturalNote_' + STATE.uiLang] || exp.culturalNote;

      card.innerHTML = `
        <div class="card-top-bar">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="situation-badge">${escapeHtml(sitLabel)}</span>
            <h3 class="scenario-title">${escapeHtml(scenarioTitle)}</h3>
          </div>
          <div class="card-actions">
            <button class="btn-card-action ${isBookmarked ? 'bookmarked' : ''}" data-action="bookmark" title="Bookmark Phrase">
              <span>${isBookmarked ? (dict.saved || '★ Saved') : (dict.save || '☆ Save')}</span>
            </button>
            <button class="btn-card-action" data-action="practice-casual" title="Practice Casual in Lab">
              <span>🎙️ ${dict.practiceInLab || 'Practice in Lab'}</span>
            </button>
          </div>
        </div>

        <div class="comparison-grid">
          <!-- Formal / Textbook -->
          <div class="variant-card formal">
            <div class="variant-header">
              <span class="variant-tag">${escapeHtml(dict.textbookFormal || 'Textbook / Formal')}</span>
            </div>
            <p class="variant-text">${escapeHtml(exp.formal.text)}</p>
            <p class="variant-phonetic">${escapeHtml(exp.formal.phonetic)}</p>
            <p class="variant-translation">"${escapeHtml(formalTrans)}"</p>
            <div class="variant-audio-bar">
              <button class="btn-audio-pill" data-audio-text="${escapeHtml(exp.formal.text)}" data-speed="1.0">
                <span>🔊</span> 1.0x
              </button>
              <button class="btn-audio-pill" data-audio-text="${escapeHtml(exp.formal.text)}" data-speed="0.7">
                <span>🐢</span> 0.7x
              </button>
            </div>
          </div>

          <!-- Casual / Street -->
          <div class="variant-card casual">
            <div class="variant-header">
              <span class="variant-tag">${escapeHtml(dict.streetSlang || 'Street / Native Slang')}</span>
            </div>
            <p class="variant-text">${escapeHtml(exp.casual.text)}</p>
            <p class="variant-phonetic">${escapeHtml(exp.casual.phonetic)}</p>
            <p class="variant-translation">"${escapeHtml(casualTrans)}"</p>
            <div class="variant-audio-bar">
              <button class="btn-audio-pill" data-audio-text="${escapeHtml(exp.casual.text)}" data-speed="1.0">
                <span>🔊</span> 1.0x
              </button>
              <button class="btn-audio-pill" data-audio-text="${escapeHtml(exp.casual.text)}" data-speed="0.7">
                <span>🐢</span> 0.7x
              </button>
            </div>
          </div>
        </div>

        <!-- Cultural & Nuance Note -->
        <div class="cultural-nuance-card">
          <span class="nuance-icon">💡</span>
          <div class="nuance-content">
            <strong>${dict.culturalNuanceTitle || 'Cultural Nuance & Social Context:'}</strong>
            <p>${escapeHtml(culturalNote)}</p>
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        const audioBtn = e.target.closest('.btn-audio-pill');
        if (audioBtn) {
          const text = audioBtn.dataset.audioText;
          const speed = parseFloat(audioBtn.dataset.speed) || 1.0;
          speakText(text, STATE.currentLang, speed);
          return;
        }

        const actionBtn = e.target.closest('.btn-card-action');
        if (actionBtn) {
          const action = actionBtn.dataset.action;
          if (action === 'bookmark') {
            toggleBookmark(exp);
            renderExpressionsTab();
          } else if (action === 'practice-casual') {
            loadExpressionIntoLab(exp.casual.text, exp.casual.phonetic, casualTrans, sitLabel);
          }
        }
      });

      DOM.expressionsList.appendChild(card);
    });
  }

  function toggleBookmark(expression) {
    const idx = STATE.bookmarks.findIndex(b => b.id === expression.id);
    if (idx !== -1) {
      STATE.bookmarks.splice(idx, 1);
    } else {
      STATE.bookmarks.push({
        id: expression.id,
        lang: STATE.currentLang,
        situation: expression['situation_' + STATE.uiLang] || expression.situation,
        scenario: expression['scenario_' + STATE.uiLang] || expression.scenario,
        formal: {
          text: expression.formal.text,
          phonetic: expression.formal.phonetic,
          translation: expression.formal['translation_' + STATE.uiLang] || expression.formal.translation
        },
        casual: {
          text: expression.casual.text,
          phonetic: expression.casual.phonetic,
          translation: expression.casual['translation_' + STATE.uiLang] || expression.casual.translation
        },
        culturalNote: expression['culturalNote_' + STATE.uiLang] || expression.culturalNote,
        dateAdded: new Date().toLocaleDateString()
      });
    }

    localStorage.setItem('lingua_bookmarks', JSON.stringify(STATE.bookmarks));
    updateHeaderCounters();
  }

  function loadExpressionIntoLab(text, phonetic, translation, situation) {
    STATE.labMode = 'custom';
    STATE.customLabSentence = {
      id: 'custom_' + Date.now(),
      level: STATE.uiLang === 'vi' ? 'Tiếng lóng bản xứ' : 'Native Slang',
      text: text,
      phonetic: phonetic || '',
      translation: translation || '',
      pitchPattern: STATE.uiLang === 'vi' ? 'Nhịp điệu nói tự nhiên' : 'Natural Spoken Cadence',
      accentType: situation || 'Conversational',
      pitchGuide: [{ text: text, pitch: 'conversational', note: 'Colloquial flow' }],
      tips: STATE.uiLang === 'vi' ? 'Đọc theo nhịp điệu tự nhiên của người bản ngữ.' : 'Shadow with authentic casual intonation.'
    };

    DOM.customTextInput.value = text;
    switchTab('tab-lab');
    renderLabTab();
  }

  // ==========================================================================
  // Tab 3: Pronunciation & Shadowing Lab
  // ==========================================================================

  function renderLabTab() {
    const langData = LINGUA_DATA[STATE.currentLang];
    if (!langData || !langData.labSentences) return;

    // Toggle Mode UI
    if (STATE.labMode === 'curated') {
      DOM.btnModeCurated.classList.add('active');
      DOM.btnModeCustom.classList.remove('active');
      DOM.curatedView.style.display = 'block';
      DOM.customView.style.display = 'none';

      // Populate sentence select dropdown
      DOM.sentenceSelect.innerHTML = '';
      langData.labSentences.forEach((sentence, index) => {
        const opt = document.createElement('option');
        opt.value = index;
        const trans = sentence['translation_' + STATE.uiLang] || sentence.translation;
        opt.textContent = `[${sentence.level}] ${sentence.text} (${trans})`;
        if (index === STATE.selectedLabIndex) opt.selected = true;
        DOM.sentenceSelect.appendChild(opt);
      });
    } else {
      DOM.btnModeCurated.classList.remove('active');
      DOM.btnModeCustom.classList.add('active');
      DOM.curatedView.style.display = 'none';
      DOM.customView.style.display = 'block';
    }

    // Load active target
    const currentTarget = getCurrentLabTarget();
    if (!currentTarget) return;

    DOM.targetLevelBadge.textContent = currentTarget.level || (STATE.uiLang === 'vi' ? 'Thực hành' : 'Practice');
    DOM.labTargetText.textContent = currentTarget.text;
    DOM.labTargetPhonetic.textContent = currentTarget.phonetic || '';
    DOM.labTargetTrans.textContent = currentTarget['translation_' + STATE.uiLang] || currentTarget.translation || '';

    // Accent / Pitch Guide
    const pitchHint = currentTarget['pitchPattern_' + STATE.uiLang] || currentTarget.pitchPattern || 'Follow native inflection contour.';
    const tipsHint = currentTarget['tips_' + STATE.uiLang] || currentTarget.tips || 'Repeat multiple times focusing on linking and stress.';
    
    DOM.labAccentType.textContent = (UI_I18N[STATE.uiLang] || UI_I18N.vi).pitchContourTitle + ` ${currentTarget.accentType || ''}`;
    DOM.labPitchHintText.textContent = pitchHint;
    DOM.labTipsContent.textContent = tipsHint;

    // Render Pitch Blocks
    DOM.labPitchTrack.innerHTML = '';
    if (currentTarget.pitchGuide && currentTarget.pitchGuide.length > 0) {
      currentTarget.pitchGuide.forEach(p => {
        const block = document.createElement('div');
        const isHigh = p.pitch.includes('high') || p.pitch.includes('peak') || p.pitch.includes('stress');
        const isDrop = p.pitch.includes('drop') || p.pitch.includes('fall');
        block.className = `pitch-block ${isHigh ? 'pitch-high' : ''} ${isDrop ? 'pitch-drop' : ''}`;
        block.innerHTML = `
          <span class="pitch-block-text">${escapeHtml(p.text)}</span>
          <span class="pitch-block-note">${escapeHtml(p.note || p.pitch)}</span>
        `;
        DOM.labPitchTrack.appendChild(block);
      });
    } else {
      const block = document.createElement('div');
      block.className = 'pitch-block';
      block.innerHTML = `
        <span class="pitch-block-text">${escapeHtml(currentTarget.text)}</span>
        <span class="pitch-block-note">${STATE.uiLang === 'vi' ? 'Ngữ điệu tự nhiên' : 'Natural Intonation'}</span>
      `;
      DOM.labPitchTrack.appendChild(block);
    }
  }

  function getCurrentLabTarget() {
    if (STATE.labMode === 'custom' && STATE.customLabSentence) {
      return STATE.customLabSentence;
    }

    const langData = LINGUA_DATA[STATE.currentLang];
    if (langData && langData.labSentences && langData.labSentences.length > 0) {
      const idx = Math.min(STATE.selectedLabIndex, langData.labSentences.length - 1);
      return langData.labSentences[idx];
    }

    return null;
  }

  // ==========================================================================
  // Storage: Weak Spots & Bookmarks Drawers
  // ==========================================================================

  function updateHeaderCounters() {
    DOM.bookmarkCount.textContent = STATE.bookmarks.length;
    DOM.weakSpotCount.textContent = STATE.weakSpots.length;
  }

  function saveWeakSpot(sentenceObj, score) {
    if (!sentenceObj) return;

    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;
    const existingIndex = STATE.weakSpots.findIndex(w => w.text === sentenceObj.text && w.lang === STATE.currentLang);
    const trans = sentenceObj['translation_' + STATE.uiLang] || sentenceObj.translation || '';
    
    const item = {
      id: sentenceObj.id || 'ws_' + Date.now(),
      lang: STATE.currentLang,
      text: sentenceObj.text,
      phonetic: sentenceObj.phonetic || '',
      translation: trans,
      lastScore: score,
      date: new Date().toLocaleDateString()
    };

    if (existingIndex !== -1) {
      STATE.weakSpots[existingIndex] = item;
    } else {
      STATE.weakSpots.unshift(item);
    }

    localStorage.setItem('lingua_weak_spots', JSON.stringify(STATE.weakSpots));
    updateHeaderCounters();
    showStatusBanner(dict.savedWeakSpotAlert || `Saved "${sentenceObj.text}" to your Weak Spots list.`, false);
  }

  function renderWeakSpotsDrawer() {
    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;
    DOM.weakSpotsList.innerHTML = '';
    if (STATE.weakSpots.length === 0) {
      DOM.weakSpotsList.innerHTML = `
        <div class="drawer-empty-state">
          <p>${dict.noWeakSpots || 'No weak spots saved yet!'}</p>
        </div>
      `;
      return;
    }

    STATE.weakSpots.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'saved-item-card';
      card.innerHTML = `
        <div class="saved-item-top">
          <span class="saved-item-lang">${escapeHtml(item.lang)} • ${escapeHtml(item.date)}</span>
          <span class="saved-item-score">${STATE.uiLang === 'vi' ? 'Điểm:' : 'Score:'} ${item.lastScore}%</span>
        </div>
        <p class="saved-item-text">${escapeHtml(item.text)}</p>
        <p class="saved-item-phonetic">${escapeHtml(item.phonetic)}</p>
        <p class="saved-item-trans">"${escapeHtml(item.translation)}"</p>
        <div class="saved-item-actions">
          <button class="btn-item-drill" data-action="drill" data-index="${index}">
            <span>🎯</span> ${dict.drillInLab || 'Drill in Lab'}
          </button>
          <button class="btn-item-delete" data-action="delete" data-index="${index}" title="Remove">
            ✕ ${dict.remove || 'Remove'}
          </button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const action = btn.dataset.action;
        const idx = parseInt(btn.dataset.index, 10);

        if (action === 'delete') {
          STATE.weakSpots.splice(idx, 1);
          localStorage.setItem('lingua_weak_spots', JSON.stringify(STATE.weakSpots));
          updateHeaderCounters();
          renderWeakSpotsDrawer();
        } else if (action === 'drill') {
          const ws = STATE.weakSpots[idx];
          loadCustomSentenceToLab(ws.text, ws.phonetic, ws.translation, ws.lang);
          DOM.weakSpotsOverlay.classList.remove('open');
        }
      });

      DOM.weakSpotsList.appendChild(card);
    });
  }

  function renderBookmarksDrawer() {
    const dict = UI_I18N[STATE.uiLang] || UI_I18N.vi;
    DOM.bookmarksList.innerHTML = '';
    if (STATE.bookmarks.length === 0) {
      DOM.bookmarksList.innerHTML = `
        <div class="drawer-empty-state">
          <p>${dict.noBookmarks || 'No saved expressions yet.'}</p>
        </div>
      `;
      return;
    }

    STATE.bookmarks.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'saved-item-card';
      card.innerHTML = `
        <div class="saved-item-top">
          <span class="saved-item-lang">${escapeHtml(item.lang)} • ${escapeHtml(item.situation)}</span>
          <button class="btn-item-delete" data-action="delete" data-index="${index}" title="Remove bookmark">✕</button>
        </div>
        <div style="margin-top: 4px;">
          <strong style="font-size: 0.78rem; color: var(--cyan-light);">${dict.textbookFormal || 'Textbook:'}</strong>
          <p class="saved-item-text" style="font-size: 0.95rem;">${escapeHtml(item.formal.text)}</p>
        </div>
        <div style="margin-top: 6px;">
          <strong style="font-size: 0.78rem; color: var(--amber);">${dict.streetSlang || 'Street Native:'}</strong>
          <p class="saved-item-text" style="font-size: 0.95rem;">${escapeHtml(item.casual.text)}</p>
        </div>
        <div class="saved-item-actions">
          <button class="btn-item-drill" data-action="listen-casual" data-index="${index}">
            <span>🔊</span> ${dict.listenCasual || 'Listen Casual'}
          </button>
          <button class="btn-item-drill" data-action="drill" data-index="${index}">
            <span>🎙️</span> ${dict.drillInLab || 'Practice in Lab'}
          </button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const action = btn.dataset.action;
        const idx = parseInt(btn.dataset.index, 10);
        const bm = STATE.bookmarks[idx];

        if (action === 'delete') {
          STATE.bookmarks.splice(idx, 1);
          localStorage.setItem('lingua_bookmarks', JSON.stringify(STATE.bookmarks));
          updateHeaderCounters();
          renderBookmarksDrawer();
        } else if (action === 'listen-casual') {
          speakText(bm.casual.text, bm.lang, 1.0);
        } else if (action === 'drill') {
          loadCustomSentenceToLab(bm.casual.text, bm.casual.phonetic, bm.casual.translation, bm.lang);
          DOM.bookmarksOverlay.classList.remove('open');
        }
      });

      DOM.bookmarksList.appendChild(card);
    });
  }

  function loadCustomSentenceToLab(text, phonetic, translation, lang) {
    if (lang && lang !== STATE.currentLang) {
      switchLanguage(lang);
    }

    STATE.labMode = 'custom';
    STATE.customLabSentence = {
      id: 'ws_custom_' + Date.now(),
      level: STATE.uiLang === 'vi' ? 'Ôn tập câu khó' : 'Review Drill',
      text: text,
      phonetic: phonetic || '',
      translation: translation || '',
      pitchPattern: STATE.uiLang === 'vi' ? 'Tập trung vào nhịp điệu và độ rõ' : 'Focus on rhythm and clarity',
      accentType: STATE.uiLang === 'vi' ? 'Luyện tập trọng điểm' : 'Targeted Review',
      pitchGuide: [{ text: text, pitch: 'focus', note: 'Weak spot drill' }],
      tips: STATE.uiLang === 'vi' ? 'Tập shadowing chậm, sau đó kiểm tra phát âm qua micro.' : 'Practice shadowing slowly, then check pronunciation against mic.'
    };

    DOM.customTextInput.value = text;
    switchTab('tab-lab');
    renderLabTab();
  }

  // ==========================================================================
  // Navigation & Language Switching
  // ==========================================================================

  function switchLanguage(langCode) {
    if (!LINGUA_DATA[langCode]) return;

    STATE.currentLang = langCode;
    localStorage.setItem('lingua_selected_lang', langCode);

    DOM.langPills.forEach(pill => {
      const isTarget = pill.dataset.lang === langCode;
      pill.classList.toggle('active', isTarget);
      pill.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    // Reset tab-specific state completely so there are no residual categories/characters
    STATE.alphabetCategory = null;
    STATE.selectedSoundItem = null;
    STATE.selectedLabIndex = 0;
    STATE.customLabSentence = null;
    STATE.labMode = 'curated';

    // Rerender active view
    renderActiveTab();
  }

  function switchTab(tabId) {
    STATE.activeTab = tabId;
    localStorage.setItem('lingua_active_tab', tabId);

    DOM.navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    DOM.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    renderActiveTab();
  }

  function renderActiveTab() {
    if (STATE.activeTab === 'tab-alphabet') {
      renderAlphabetTab();
    } else if (STATE.activeTab === 'tab-expressions') {
      renderExpressionsTab();
    } else if (STATE.activeTab === 'tab-lab') {
      renderLabTab();
    }
  }

  function showStatusBanner(message, isError = false) {
    DOM.statusText.textContent = message;
    DOM.statusBanner.style.display = 'block';
    if (isError) {
      DOM.statusBanner.querySelector('.status-content').style.borderColor = 'var(--rose)';
      DOM.statusBanner.querySelector('.status-content').style.color = 'var(--rose-light)';
    } else {
      DOM.statusBanner.querySelector('.status-content').style.borderColor = 'rgba(6, 182, 212, 0.3)';
      DOM.statusBanner.querySelector('.status-content').style.color = 'var(--cyan-light)';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // Event Listeners Binding
  // ==========================================================================

  function bindEvents() {
    // UI Language Switcher (VI / EN)
    DOM.uiLangBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        setUILanguage(btn.dataset.uiLang);
      });
    });

    // Target Language switcher
    DOM.langPills.forEach(pill => {
      pill.addEventListener('click', () => {
        switchLanguage(pill.dataset.lang);
      });
    });

    // Nav tabs
    DOM.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
      });
    });

    // Status banner dismiss
    DOM.statusDismiss.addEventListener('click', () => {
      DOM.statusBanner.style.display = 'none';
    });

    // Header buttons (Drawers)
    DOM.btnOpenBookmarks.addEventListener('click', () => {
      renderBookmarksDrawer();
      DOM.bookmarksOverlay.classList.add('open');
    });

    DOM.btnCloseBookmarks.addEventListener('click', () => DOM.bookmarksOverlay.classList.remove('open'));
    DOM.btnCloseBookmarksBottom.addEventListener('click', () => DOM.bookmarksOverlay.classList.remove('open'));
    DOM.btnClearBookmarks.addEventListener('click', () => {
      const msg = (UI_I18N[STATE.uiLang] || UI_I18N.vi).confirmClearBookmarks || 'Clear all saved expressions?';
      if (confirm(msg)) {
        STATE.bookmarks = [];
        localStorage.setItem('lingua_bookmarks', '[]');
        updateHeaderCounters();
        renderBookmarksDrawer();
        renderExpressionsTab();
      }
    });

    DOM.btnOpenWeakSpots.addEventListener('click', () => {
      renderWeakSpotsDrawer();
      DOM.weakSpotsOverlay.classList.add('open');
    });

    DOM.btnCloseWeakSpots.addEventListener('click', () => DOM.weakSpotsOverlay.classList.remove('open'));
    DOM.btnCloseWeakSpotsBottom.addEventListener('click', () => DOM.weakSpotsOverlay.classList.remove('open'));
    DOM.btnClearWeakSpots.addEventListener('click', () => {
      const msg = (UI_I18N[STATE.uiLang] || UI_I18N.vi).confirmClearWeakSpots || 'Clear all weak spots review phrases?';
      if (confirm(msg)) {
        STATE.weakSpots = [];
        localStorage.setItem('lingua_weak_spots', '[]');
        updateHeaderCounters();
        renderWeakSpotsDrawer();
      }
    });

    // Tab 2 search input
    DOM.expressionSearch.addEventListener('input', (e) => {
      STATE.expressionSearchQuery = e.target.value;
      renderExpressionsTab();
    });

    // Tab 3 Lab Controls
    DOM.btnModeCurated.addEventListener('click', () => {
      STATE.labMode = 'curated';
      renderLabTab();
    });

    DOM.btnModeCustom.addEventListener('click', () => {
      STATE.labMode = 'custom';
      renderLabTab();
    });

    DOM.sentenceSelect.addEventListener('change', (e) => {
      STATE.selectedLabIndex = parseInt(e.target.value, 10);
      renderLabTab();
    });

    DOM.btnApplyCustomText.addEventListener('click', () => {
      const text = DOM.customTextInput.value.trim();
      if (!text) {
        alert(STATE.uiLang === 'vi' ? 'Vui lòng nhập văn bản vào ô cần luyện.' : 'Please enter some text in the custom input area.');
        return;
      }
      STATE.customLabSentence = {
        id: 'custom_' + Date.now(),
        level: STATE.uiLang === 'vi' ? 'Tự nhập' : 'Custom Text',
        text: text,
        phonetic: STATE.uiLang === 'vi' ? 'Văn bản người dùng nhập' : 'User Custom Input',
        translation: STATE.uiLang === 'vi' ? 'Câu mục tiêu tự chọn' : 'Custom Target Text',
        pitchPattern: STATE.uiLang === 'vi' ? 'Ngữ điệu câu tự nhập' : 'Custom Sentence Contour',
        accentType: STATE.uiLang === 'vi' ? 'Tùy chỉnh' : 'User Created',
        pitchGuide: [{ text: text, pitch: 'custom', note: 'Target text' }],
        tips: STATE.uiLang === 'vi' ? 'Luyện đọc theo câu và kiểm tra độ chính xác bằng micro.' : 'Shadow sentence and test speech recognition accuracy.'
      };
      renderLabTab();
    });

    // TTS Controls
    DOM.ttsSpeedSlider.addEventListener('input', (e) => {
      STATE.ttsSpeed = parseFloat(e.target.value);
      DOM.speedValueDisplay.textContent = `${STATE.ttsSpeed.toFixed(1)}x`;
    });

    DOM.btnPlayNativeTts.addEventListener('click', () => {
      const target = getCurrentLabTarget();
      if (target) {
        speakText(target.text, STATE.currentLang, STATE.ttsSpeed);
      }
    });

    DOM.btnPlayNativeSlow.addEventListener('click', () => {
      const target = getCurrentLabTarget();
      if (target) {
        speakText(target.text, STATE.currentLang, 0.7);
      }
    });

    DOM.btnToggleLoop.addEventListener('click', () => {
      STATE.ttsLoop = !STATE.ttsLoop;
      DOM.btnToggleLoop.classList.toggle('active', STATE.ttsLoop);
      const loopText = (UI_I18N[STATE.uiLang] || UI_I18N.vi).loop || 'Loop:';
      const statusText = STATE.ttsLoop ? (STATE.uiLang === 'vi' ? 'Bật' : 'On') : (STATE.uiLang === 'vi' ? 'Tắt' : 'Off');
      DOM.btnToggleLoop.innerHTML = `<span>🔁</span> ${loopText} ${statusText}`;
      if (!STATE.ttsLoop) {
        window.speechSynthesis.cancel();
      }
    });

    // Speech Recognition Controls
    DOM.btnRecordMic.addEventListener('click', () => {
      toggleRecording();
    });

    DOM.btnSimDiff.addEventListener('click', () => {
      const val = DOM.simSpeechInput.value.trim();
      if (!val) {
        alert(STATE.uiLang === 'vi' ? 'Vui lòng nhập câu bạn vừa nói để kiểm tra độ khớp.' : 'Please type what you said to test the phonetic diff engine.');
        return;
      }
      processSpokenResult(val);
    });

    DOM.btnSaveToWeakSpots.addEventListener('click', () => {
      const lastScore = parseInt(DOM.btnSaveToWeakSpots.dataset.lastScore, 10) || 0;
      const target = getCurrentLabTarget();
      saveWeakSpot(target, lastScore);
    });

    DOM.btnRetrySentence.addEventListener('click', () => {
      DOM.evalResultsStage.style.display = 'none';
      DOM.evalPlaceholder.style.display = 'flex';
      toggleRecording();
    });
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  function initApp() {
    cacheDOMElements();
    initTts();
    initSpeechRecognition();
    bindEvents();
    updateHeaderCounters();

    // Set initial active pill & tab
    DOM.langPills.forEach(pill => {
      pill.classList.toggle('active', pill.dataset.lang === STATE.currentLang);
    });

    DOM.navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === STATE.activeTab);
    });

    DOM.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === STATE.activeTab);
    });

    // Set UI language (default 'vi' or saved in localStorage)
    setUILanguage(STATE.uiLang);
  }

  // Kick off when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
