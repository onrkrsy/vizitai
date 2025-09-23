(() => {
  // Global config state
  let appConfig = { audioEnabled: false };
  
  // Load config from server
  async function loadConfig() {
    try {
      const response = await fetch('/api/config');
      appConfig = await response.json();
      initializeAudioFeatures();
    } catch (error) {
      console.warn('Config yüklenemedi, ses özellikleri devre dışı:', error);
      initializeAudioFeatures();
    }
  }

  // Initialize audio features based on config
  function initializeAudioFeatures() {
    const audioElements = document.querySelectorAll('.audio-feature');
    audioElements.forEach(element => {
      if (appConfig.audioEnabled) {
        element.classList.remove('hidden');
      } else {
        element.classList.add('hidden');
      }
    });

    // Update placeholder text based on audio availability
    if (messageInput) {
      messageInput.placeholder = appConfig.audioEnabled 
        ? "Mesajınızı yazın veya mikrofonla aktarın"
        : "Mesajınızı yazın";
    }

    // Initialize speech recognition if audio is enabled
    if (appConfig.audioEnabled) {
      initSpeechRecognition();
    }
  }

  const form = document.getElementById('scenario-form');
  const startBtn = document.getElementById('startBtn');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const holdToTalkBtn = document.getElementById('holdToTalkBtn');
  const recordHint = document.getElementById('recordHint');
  const chat = document.getElementById('chat');
  const emptyState = document.getElementById('emptyState');
  const recordIndicator = document.getElementById('recordIndicator');
  const doctorProfile = document.getElementById('doctorProfile');
  const doctorName = document.getElementById('doctorName');
  const doctorSpecialty = document.getElementById('doctorSpecialty');
  const doctorPersonality = document.getElementById('doctorPersonality');
  const doctorStatus = document.getElementById('doctorStatus');
  const typingIndicator = document.getElementById('typingIndicator');
  const speakingIndicator = document.getElementById('speakingIndicator');
  const doctorAvatar = document.getElementById('doctorAvatar');
  const doctorAnimation = document.getElementById('doctorAnimation');
  const toggleTrainingBtn = document.getElementById('toggleTraining');
  const toggleTTSBtn = document.getElementById('toggleTTS');
  const trainingPanel = document.getElementById('trainingPanel');
  const trainingCloseBtn = trainingPanel?.querySelector('[data-action="close-training"]');
  const sessionTitle = document.getElementById('session-title');
  const headerStatusDot = document.querySelector('.status-chip .status-dot');
  const headerStatusText = document.querySelector('.status-chip .status-text');
  const layout = document.querySelector('.layout');
  const mobileBackBtn = document.getElementById('mobileBackBtn');
  const mobileContinueBtn = document.getElementById('mobileContinueBtn');
  const personalityLabels = {
    acik_fikirli: 'Açık fikirli',
    skeptik: 'Şüpheci',
    mesgul: 'Meşgul',
    detayci: 'Detaycı'
  };

  const specialtyLabels = {
    dahiliye: 'Dahiliye',
    kardiyoloji: 'Kardiyoloji',
    onkoloji: 'Onkoloji',
    endokrinoloji: 'Endokrinoloji', 
    dermatoloji: 'Dermokozmetik (Akne ve Güneş Koruma)'
  };

  const specialtyNames = {
    dahiliye: 'Ahmet Sevgi',
    kardiyoloji: 'Mehmet Yılmaz',
    onkoloji: 'Ayşe Demir',
    endokrinoloji: 'Can Özkan',
    dermatoloji: 'Elif Kaya'
  };

  const specialtyAvatars = {
    dahiliye: '🩺',
    kardiyoloji: '❤️',
    onkoloji: '🧬',
    endokrinoloji: '🧪',
    dermatoloji: '🧴'
  };

  const mobileFlowQuery = window.matchMedia('(max-width: 820px)');

  let sessionId = null;
  let recognitionSupported = false;
  let recognition = null;
  let isRecording = false;
  let collectedTranscript = '';
  let insecureContext = false;
  let micStream = null;
  let receivedAnyResult = false;
  let recognitionPrewarmed = false;
  let backgroundRecognitionEnabled = false;
  let isCapturingHold = false;
  let currentConfig = null;
  let ttsEnabled = false;
  let isMobileFlow = mobileFlowQuery.matches;
  let currentMobileView = 'setup';

  function setMobileView(view) {
    currentMobileView = view;
    if (layout) {
      layout.dataset.view = view;
    }
  }

  function refreshMobileControls() {
    const hasSession = Boolean(sessionId);
    if (mobileContinueBtn) {
      mobileContinueBtn.classList.toggle('hidden', !hasSession);
    }
    if (mobileBackBtn) {
      if (hasSession) {
        mobileBackBtn.removeAttribute('disabled');
      } else {
        mobileBackBtn.setAttribute('disabled', 'disabled');
      }
    }
  }

  function autosizeTextarea() {
    if (!messageInput) return;
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 160) + 'px';
  }

  function handleMobileFlowChange(event) {
    isMobileFlow = event.matches;
    if (isMobileFlow) {
      setMobileView(sessionId ? 'session' : 'setup');
    } else {
      setMobileView('setup');
    }
    refreshMobileControls();
  }



  function setDoctorStatus(label, variant = 'idle') {
    if (!doctorStatus) return;
    const classList = ['status-pill'];
    classList.push(variant);
    doctorStatus.className = classList.join(' ');
    doctorStatus.textContent = label;
  }

  function setHeaderStatus(label, variant = 'idle') {
    if (headerStatusDot) {
      headerStatusDot.classList.remove('status-idle', 'status-busy', 'status-offline');
      headerStatusDot.classList.add(`status-${variant}`);
    }
    if (headerStatusText) {
      headerStatusText.textContent = label;
    }
  }

  function showDoctorProfile() {
    doctorProfile?.classList.remove('hidden');
  }

  function hideDoctorProfile() {
    doctorProfile?.classList.add('hidden');
  }

  function hideEmptyState() {
    emptyState?.classList.add('hidden');
  }

  function showEmptyState() {
    emptyState?.classList.remove('hidden');
  }

  function resetConversation() {
    sessionId = null;
    chat.innerHTML = '';
    showEmptyState();
    typingIndicator?.classList.add('hidden');
    speakingIndicator?.classList.add('hidden');
    recordIndicator?.classList?.add('hidden');
    setDoctorStatus('Hazır', 'idle');
    cancelActiveSpeech();
    backgroundRecognitionEnabled = false;
    stopGlobalRecognition();
    if (doctorAnimation) {
      doctorAnimation.classList.remove('active');
    }
    hideDoctorProfile();
    if (doctorName) doctorName.textContent = '-';
    if (doctorSpecialty) doctorSpecialty.textContent = '-';
    if (doctorPersonality) doctorPersonality.textContent = '-';
    if (doctorAvatar) doctorAvatar.textContent = '🩺';
    if (window.TrainingManager) {
      window.TrainingManager.reset?.();
      window.TrainingManager.hideTrainingPanel();
    }
    toggleTrainingBtn?.setAttribute('disabled', 'disabled');
    toggleTTSBtn?.setAttribute('disabled', 'disabled');
    toggleTTSBtn?.classList.add('disabled');
    ttsEnabled = false;
    if (toggleTTSBtn) {
      toggleTTSBtn.textContent = '🔇';
      toggleTTSBtn.title = 'Sesli yanıt kapalı - açmak için tıklayın';
    }
    sendBtn.disabled = true;
    holdToTalkBtn.disabled = true;
    recordHint?.classList?.add('hidden');
    setHeaderStatus('Oturum hazır', 'idle');
    if (sessionTitle) {
      sessionTitle.textContent = 'Oturumu Başlatın';
    }
    currentConfig = null;
    setMobileView('setup');
    refreshMobileControls();
  }

  function parseDoctorResponse(text) {
    const actionMatch = text.match(/\[AKSIYON:\s*([^\]]+)\]/i);
    const speechMatch = text.match(/\[KONUŞMA:\s*([^\]]+)\]/i);

    if (actionMatch && speechMatch) {
      return {
        action: actionMatch[1].trim(),
        speech: speechMatch[1].trim(),
        hasAction: true
      };
    }

    return {
      action: null,
      speech: text.trim(),
      hasAction: false
    };
  }

  function addBubble(text, role) {
    const div = document.createElement('div');
    div.className = `bubble ${role}`;

    if (role === 'meta') {
      div.textContent = text;
      div.setAttribute('role', 'status');
    } else {
      const header = document.createElement('div');
      header.className = 'bubble-header';

      const avatarEl = document.createElement('span');
      avatarEl.className = 'bubble-avatar';
      avatarEl.textContent = role === 'user' ? '🧑‍💼' : (doctorAvatar?.textContent || '🩺');

      const nameEl = document.createElement('span');
      nameEl.className = 'bubble-name';
      nameEl.textContent = role === 'user' ? 'Mümessil' : `Dr. ${doctorName?.textContent || 'Doktor'}`;

      const timeEl = document.createElement('span');
      timeEl.className = 'bubble-time';
      timeEl.textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      header.append(avatarEl, nameEl, timeEl);

      const content = document.createElement('div');
      content.className = 'bubble-content';

      if (role === 'assistant') {
        const parsed = parseDoctorResponse(text);
        content.textContent = parsed.speech;

        if (parsed.hasAction) {
          const actionBtn = document.createElement('button');
          actionBtn.type = 'button';
          actionBtn.className = 'action-details-btn';
          actionBtn.textContent = 'Detay';
          actionBtn.title = 'Doktorun hareketini göster';

          const actionPopup = document.createElement('div');
          actionPopup.className = 'action-popup hidden';
          actionPopup.textContent = parsed.action;

          actionBtn.addEventListener('click', (evt) => {
            evt.stopPropagation();
            actionPopup.classList.toggle('hidden');
          });

          document.addEventListener('click', () => {
            actionPopup.classList.add('hidden');
          }, { once: true });

          div.append(actionBtn, actionPopup);
        }
      } else {
        content.textContent = text;
      }

      div.append(header, content);
    }

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    if (role !== 'meta') {
      hideEmptyState();
    }

    if (window.TrainingManager) {
      window.TrainingManager.addMessage(role);
      window.TrainingManager.analyzeMessage(text, role);
    }
  }

  function addMeta(text) {
    addBubble(text, 'meta');
  }

  function updateDoctorProfile(config) {
    if (!config) return;

    const name = specialtyNames[config.specialty] || 'Ali Veli';
    const specialty = specialtyLabels[config.specialty] || 'Genel';
    const personality = personalityLabels[config.personality] || 'Nötr';
    const avatar = specialtyAvatars[config.specialty] || '🩺';

    if (doctorName) doctorName.textContent = name;
    if (doctorSpecialty) doctorSpecialty.textContent = specialty;
    if (doctorPersonality) doctorPersonality.textContent = personality;
    if (doctorAvatar) doctorAvatar.textContent = avatar;

    setDoctorStatus('Hazır', 'idle');
    showDoctorProfile();
    if (sessionTitle) {
      sessionTitle.textContent = `${specialty} görüşmesi`;
    }
  }

  function showTypingIndicator() {
    typingIndicator?.classList.remove('hidden');
    setDoctorStatus('Düşünüyor', 'thinking');
    doctorAnimation?.classList.add('active');
  }

  function hideTypingIndicator() {
    typingIndicator?.classList.add('hidden');
    setDoctorStatus('Hazır', 'idle');
    doctorAnimation?.classList.remove('active');
  }

  function showSpeakingIndicator() {
    speakingIndicator?.classList.remove('hidden');
    setDoctorStatus('Konuşuyor', 'speaking');
    doctorAnimation?.classList.add('active');
  }

  function hideSpeakingIndicator() {
    speakingIndicator?.classList.add('hidden');
    setDoctorStatus('Hazır', 'idle');
    doctorAnimation?.classList.remove('active');
  }

  function cancelActiveSpeech() {
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (err) {
      console.warn('Speech cancellation failed', err);
    }
  }

  async function playTTS(text, personality) {
    try {
      if (!ttsEnabled || !appConfig.audioEnabled) return;
      if (!window.speechSynthesis) {
        console.warn('Speech synthesis not supported');
        return;
      }

      const parsed = parseDoctorResponse(text);
      if (!parsed.speech) return;

      const { ssml, config } = await window.ApiClient.tts(parsed.speech, personality);
      void ssml; // currently unused but kept for future SSML engine integration

      const utterance = new SpeechSynthesisUtterance(parsed.speech);
      utterance.lang = 'tr-TR';
      utterance.rate = config?.rate ?? 1;
      utterance.pitch = config?.pitch ?? 1;
      utterance.volume = config?.volume ?? 1;
      utterance.onstart = () => showSpeakingIndicator();
      utterance.onend = () => hideSpeakingIndicator();
      utterance.onerror = () => hideSpeakingIndicator();

      cancelActiveSpeech();
    backgroundRecognitionEnabled = false;
    stopGlobalRecognition();
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('TTS error', err);
      hideSpeakingIndicator();
    }
  }

  function toggleTTS() {
    ttsEnabled = !ttsEnabled;
    if (!toggleTTSBtn) return;

    if (ttsEnabled) {
      toggleTTSBtn.textContent = '🔊';
      toggleTTSBtn.title = 'Sesli yanıt açık - kapatmak için tıklayın';
      toggleTTSBtn.classList.remove('disabled');
    } else {
      cancelActiveSpeech();
    backgroundRecognitionEnabled = false;
    stopGlobalRecognition();
      toggleTTSBtn.textContent = '🔇';
      toggleTTSBtn.title = 'Sesli yanıt kapalı - açmak için tıklayın';
      toggleTTSBtn.classList.add('disabled');
      hideSpeakingIndicator();
    }
  }

  async function startSimulation(event) {
    event.preventDefault();
    resetConversation();
    startBtn.disabled = true;
    sendBtn.disabled = true;
    holdToTalkBtn.disabled = true;
    addMeta('Senaryo başlatılıyor...');

    const config = window.ScenarioManager.collectConfig();
    currentConfig = config;

    try {
      updateDoctorProfile(config);
      showTypingIndicator();
      setHeaderStatus('Simülasyon başlatılıyor', 'busy');

      const { sessionId: sid, message } = await window.ApiClient.start(config);
      sessionId = sid;
      setMobileView('session');
      refreshMobileControls();

      chat.innerHTML = '';
      hideTypingIndicator();
      addBubble(message, 'assistant');
      setHeaderStatus('Simülasyon aktif', 'busy');
      sendBtn.disabled = false;
      toggleTrainingBtn?.removeAttribute('disabled');
      toggleTTSBtn?.removeAttribute('disabled');
      toggleTTSBtn?.classList.remove('disabled');

      if (window.TrainingManager) {
        window.TrainingManager.startSession();
        window.TrainingManager.showTrainingPanel();
      }

      setTimeout(() => playTTS(message, config.personality), 500);

      if (recognitionSupported) {
        holdToTalkBtn.disabled = false;
        recordHint?.classList?.remove('hidden');
        ensureMicPermission().then(() => prewarmRecognition()).catch(() => {});
        backgroundRecognitionEnabled = true;
        startGlobalRecognition();
      }

      sessionStorage.setItem('sessionId', sessionId);
      sessionStorage.setItem('config', JSON.stringify(config));
    } catch (err) {
      console.error(err);
      addMeta('Başlatma başarısız. Lütfen tekrar deneyin.');
      setHeaderStatus('Oturum hazır', 'idle');
    } finally {
      startBtn.disabled = false;
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !sessionId) return;

    messageInput.value = '';
    autosizeTextarea();
    addBubble(text, 'user');
    sendBtn.disabled = true;

    try {
      showTypingIndicator();
      const { message } = await window.ApiClient.message(sessionId, text);
      hideTypingIndicator();
      addBubble(message, 'assistant');
      setTimeout(() => playTTS(message, currentConfig?.personality), 300);
    } catch (err) {
      console.error(err);
      hideTypingIndicator();
      addMeta('Mesaj gönderilemedi. İnternet bağlantınızı kontrol edin.');
    } finally {
      sendBtn.disabled = false;
    }
  }

  async function sendTextDirect(text) {
    const clean = (text || '').trim();
    if (!clean || !sessionId) return;

    addBubble(clean, 'user');
    sendBtn.disabled = true;

    try {
      showTypingIndicator();
      const { message } = await window.ApiClient.message(sessionId, clean);
      hideTypingIndicator();
      addBubble(message, 'assistant');
      setTimeout(() => playTTS(message, currentConfig?.personality), 300);
    } catch (err) {
      console.error(err);
      hideTypingIndicator();
      addMeta('Mesaj gönderilemedi.');
    } finally {
      sendBtn.disabled = false;
    }
  }

  function startGlobalRecognition() {
    if (!recognitionSupported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!recognition) {
      recognition = new SR();
      recognition.lang = (navigator.language && navigator.language.startsWith('tr')) ? navigator.language : 'tr-TR';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        receivedAnyResult = false;
      };

      recognition.onerror = (err) => {
        console.warn('Recognition error', err);
        if (err.error === 'not-allowed') {
          recognitionSupported = false;
          addMeta('Mikrofon izni reddedildi.');
        }
      };

      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        if (!result) return;

        const transcript = result[0].transcript.trim();
        if (!transcript) return;

        receivedAnyResult = true;

        if (result.isFinal) {
          collectedTranscript += `${transcript} `;
          if (isRecording) {
            messageInput.value = collectedTranscript.trim();
            autosizeTextarea();
          }
        } else if (isRecording) {
          messageInput.value = `${collectedTranscript}${transcript}`.trim();
          autosizeTextarea();
        }
      };

      recognition.onend = () => {
        if (backgroundRecognitionEnabled && !isRecording) {
          try {
            recognition.start();
          } catch (err) {
            console.warn('Restart recognition failed', err);
          }
        }
      };
    }

    try {
      recognition.start();
    } catch (err) {
      // swallow restart errors
    }
  }

  function stopGlobalRecognition() {
    if (!recognition) return;
    try {
      recognition.onend = null;
      recognition.stop();
    } catch (_) {
      // ignore
    }
  }

  async function ensureMicPermission() {
    try {
      if (micStream) return true;
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      return true;
    } catch (err) {
      console.error('getUserMedia error', err);
      addMeta('Mikrofon izni gerekli. Tarayıcı ayarlarından erişime izin verin.');
      return false;
    }
  }

  function prewarmRecognition() {
    try {
      if (!recognitionSupported || recognitionPrewarmed) return;
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const warm = new SR();
      warm.lang = (navigator.language && navigator.language.startsWith('tr')) ? navigator.language : 'tr-TR';
      warm.interimResults = false;
      warm.continuous = false;
      warm.onstart = () => {
        setTimeout(() => {
          try { warm.stop(); } catch (_) {}
        }, 150);
      };
      warm.onend = () => {
        recognitionPrewarmed = true;
      };
      warm.onerror = () => {};
      warm.start();
    } catch (err) {
      console.warn('Prewarm failed', err);
    }
  }

  async function startRecording(event) {
    if (!sessionId) {
      addMeta('Önce senaryoyu başlatın.');
      return;
    }
    if (!recognitionSupported || isRecording) return;
    if (!recognitionPrewarmed) {
      const ok = await ensureMicPermission();
      if (!ok) return;
    }

    collectedTranscript = '';
    receivedAnyResult = false;
    isRecording = true;
    isCapturingHold = true;
    holdToTalkBtn.classList.add('recording');
    addMeta('Dinliyor... basılı tutun.');
    recordIndicator?.classList?.remove('hidden');
    startGlobalRecognition();
  }

  async function stopRecording() {
    if (!recognitionSupported || !isRecording) return;

    isCapturingHold = false;
    isRecording = false;
    holdToTalkBtn.classList.remove('recording');
    recordIndicator?.classList?.add('hidden');

    const finalText = (messageInput.value || collectedTranscript || '').trim();
    messageInput.value = '';
    autosizeTextarea();

    if (!finalText) {
      addMeta(receivedAnyResult ? 'Gönderilecek bir metin oluşmadı.' : 'Tanınabilir bir konuşma algılanmadı.');
      return;
    }

    await sendTextDirect(finalText);
  }

  function initSpeechRecognition() {
    // Only initialize if audio is enabled
    if (!appConfig.audioEnabled) {
      recognitionSupported = false;
      return;
    }
    
    try {
      const hasAPI = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      const secure = window.isSecureContext;
      recognitionSupported = hasAPI && secure;
      insecureContext = !secure;

      if (!hasAPI) {
        addMeta('Tarayıcınız mikrofon ile konuşmayı desteklemiyor.');
      } else if (!secure) {
        addMeta('Mikrofonu kullanmak için HTTPS üzerinden açın.');
      }

      if (!recognitionSupported) {
        holdToTalkBtn?.setAttribute('disabled', 'disabled');
        recordHint?.classList?.add('hidden');
      }
    } catch (err) {
      console.warn('Speech init failed', err);
      recognitionSupported = false;
    }
  }

  function handleTextareaInput() {
    autosizeTextarea();
    if (messageInput && sendBtn) {
      const hasText = messageInput.value.trim().length > 0;
      sendBtn.disabled = !hasText || !sessionId;
    }
  }

  function init() {
    loadConfig(); // Load config first
    resetConversation();
    window.ScenarioManager.initSelectors();

    form?.addEventListener('submit', startSimulation);
    messageForm?.addEventListener('submit', sendMessage);
    messageInput?.addEventListener('input', handleTextareaInput);

    if (toggleTrainingBtn) {
      toggleTrainingBtn.addEventListener('click', () => {
        if (window.TrainingManager) {
          window.TrainingManager.toggleTrainingPanel();
        }
      });
    }

    if (trainingCloseBtn) {
      trainingCloseBtn.addEventListener('click', () => {
        if (window.TrainingManager) {
          window.TrainingManager.hideTrainingPanel();
        }
      });
    }

    if (toggleTTSBtn) {
      toggleTTSBtn.addEventListener('click', toggleTTS);
      toggleTTSBtn.textContent = '🔇';
      toggleTTSBtn.title = 'Sesli yanıt kapalı - açmak için tıklayın';
    }
    if (mobileBackBtn) {
      mobileBackBtn.addEventListener('click', () => {
        setMobileView('setup');
        try {
          startBtn?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (_) {
          // ignore scroll issues
        }
        startBtn?.focus();
      });
    }

    if (mobileContinueBtn) {
      mobileContinueBtn.addEventListener('click', () => {
        setMobileView('session');
        try {
          chat?.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
        } catch (_) {
          chat.scrollTop = chat.scrollHeight;
        }
        messageInput?.focus();
      });
    }

    if (typeof mobileFlowQuery.addEventListener === 'function') {
      mobileFlowQuery.addEventListener('change', handleMobileFlowChange);
    } else if (typeof mobileFlowQuery.addListener === 'function') {
      mobileFlowQuery.addListener(handleMobileFlowChange);
    }

    handleMobileFlowChange(mobileFlowQuery);


    holdToTalkBtn?.addEventListener('mousedown', startRecording);
    document.addEventListener('mouseup', stopRecording);
    holdToTalkBtn?.addEventListener('touchstart', startRecording, { passive: false });
    holdToTalkBtn?.addEventListener('touchend', stopRecording, { passive: true });

    document.addEventListener('keydown', (event) => {
      if (event.target === messageInput) return;
      if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        if (recognitionSupported && !isRecording && sessionId) {
          startRecording();
        }
      }
    });

    document.addEventListener('keyup', (event) => {
      if (event.code === 'Space' && isRecording) {
        event.preventDefault();
        stopRecording();
      }
    });
  }

  init();
})();




