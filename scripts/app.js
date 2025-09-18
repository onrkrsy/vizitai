(() => {
  const form = document.getElementById('scenario-form');
  const startBtn = document.getElementById('startBtn');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const holdToTalkBtn = document.getElementById('holdToTalkBtn');
  const recordHint = document.getElementById('recordHint');
  const chat = document.getElementById('chat');
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
  let ttsEnabled = false; // Sesli cevap varsayılan olarak kapalı

  function parseDoctorResponse(text) {
    const actionMatch = text.match(/\[AKSIYON:\s*([^\]]+)\]/);
    const speechMatch = text.match(/\[KONUŞMA:\s*([^\]]+)\]/);
    
    if (actionMatch && speechMatch) {
      return {
        action: actionMatch[1].trim(),
        speech: speechMatch[1].trim(),
        hasAction: true
      };
    }
    
    // Fallback: if no format found, treat entire text as speech
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
    } else {
      const header = document.createElement('div');
      header.className = 'bubble-header';
      
      const avatar = document.createElement('span');
      avatar.className = 'bubble-avatar';
      avatar.textContent = role === 'user' ? '👤' : '👨‍⚕️';
      
      const name = document.createElement('span');
      name.className = 'bubble-name';
      name.textContent = role === 'user' ? 'Mümessil' : 'Dr. ' + (doctorName.textContent || 'Doktor');
      
      const time = document.createElement('span');
      time.className = 'bubble-time';
      time.textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      
      header.appendChild(avatar);
      header.appendChild(name);
      header.appendChild(time);
      
      const content = document.createElement('div');
      content.className = 'bubble-content';
      
      if (role === 'assistant') {
        const parsed = parseDoctorResponse(text);
        content.textContent = parsed.speech;
        
        // Add action details popup if action exists
        if (parsed.hasAction) {
          const actionBtn = document.createElement('button');
          actionBtn.className = 'action-details-btn';
          actionBtn.textContent = '📋';
          actionBtn.title = 'Doktor hareketleri';
          
          const actionPopup = document.createElement('div');
          actionPopup.className = 'action-popup hidden';
          actionPopup.textContent = parsed.action;
          
          actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            actionPopup.classList.toggle('hidden');
          });
          
          // Close popup when clicking outside
          document.addEventListener('click', () => {
            actionPopup.classList.add('hidden');
          });
          
          div.appendChild(actionBtn);
          div.appendChild(actionPopup);
        }
      } else {
        content.textContent = text;
      }
      
      div.appendChild(header);
      div.appendChild(content);
    }
    
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    
    // Eğitim analizi
    if (window.TrainingManager) {
      window.TrainingManager.addMessage(role);
      window.TrainingManager.analyzeMessage(text, role);
    }
  }

  function addMeta(text) {
    const div = document.createElement('div');
    div.className = 'bubble meta';
    div.textContent = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  function autosizeTextarea() {
    if (!messageInput) return;
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 160) + 'px';
  }

  function updateDoctorProfile(config) {
    if (!config) return;
    
    // Generate doctor name based on specialty
    const names = {
      'dahiliye': 'Ahmet Sevgi',
      'kardiyoloji': 'Mehmet Yılmaz',
      'onkoloji': 'Ayşe Demir',
      'endokrinoloji': 'Can Özkan'
    };
    
    doctorName.textContent = names[config.specialty] || 'Ali Veli';
    
    // Uzmanlık alanını düzgün formatla
    const specialtyLabels = {
      'dahiliye': 'Dahiliye',
      'kardiyoloji': 'Kardiyoloji', 
      'onkoloji': 'Onkoloji',
      'endokrinoloji': 'Endokrinoloji'
    };
    doctorSpecialty.textContent = specialtyLabels[config.specialty] || 'Genel';
    
    const personalityLabels = {
      'acik_fikirli': 'Açık Fikirli',
      'skeptik': 'Şüpheci', 
      'mesgul': 'Meşgul',
      'detayci': 'Detaycı'
    };
    
    doctorPersonality.textContent = personalityLabels[config.personality] || 'Nötr';
    doctorProfile.classList.remove('hidden');
  }

  function showTypingIndicator() {
    typingIndicator.classList.remove('hidden');
    doctorStatus.textContent = 'Düşünüyor';
    doctorStatus.className = 'status-indicator thinking';
    
    // Doktor animasyonu
    if (doctorAvatar) {
      doctorAvatar.classList.add('talking');
    }
    if (doctorAnimation) {
      doctorAnimation.classList.remove('hidden');
      doctorAnimation.classList.add('speaking');
    }
  }

  function hideTypingIndicator() {
    typingIndicator.classList.add('hidden');
    doctorStatus.textContent = 'Hazır';
    doctorStatus.className = 'status-indicator';
    
    // Doktor animasyonu
    if (doctorAvatar) {
      doctorAvatar.classList.remove('talking');
    }
    if (doctorAnimation) {
      doctorAnimation.classList.remove('speaking');
    }
  }

  function showSpeakingIndicator() {
    speakingIndicator.classList.remove('hidden');
    doctorStatus.textContent = 'Konuşuyor';
    doctorStatus.className = 'status-indicator busy';
    
    // Doktor animasyonu
    if (doctorAvatar) {
      doctorAvatar.classList.add('talking');
    }
    if (doctorAnimation) {
      doctorAnimation.classList.remove('hidden');
      doctorAnimation.classList.add('speaking');
    }
  }

  function hideSpeakingIndicator() {
    speakingIndicator.classList.add('hidden');
    doctorStatus.textContent = 'Hazır';
    doctorStatus.className = 'status-indicator';
    
    // Doktor animasyonu
    if (doctorAvatar) {
      doctorAvatar.classList.remove('talking');
    }
    if (doctorAnimation) {
      doctorAnimation.classList.remove('speaking');
    }
  }

  function toggleTTS() {
    ttsEnabled = !ttsEnabled;
    
    if (toggleTTSBtn) {
      if (ttsEnabled) {
        toggleTTSBtn.textContent = '🔊';
        toggleTTSBtn.classList.remove('disabled');
        toggleTTSBtn.title = 'Sesli cevap açık - tıklayarak kapatın';
      } else {
        toggleTTSBtn.textContent = '🔇';
        toggleTTSBtn.classList.add('disabled');
        toggleTTSBtn.title = 'Sesli cevap kapalı - tıklayarak açın';
      }
    }
    
    // Mevcut konuşmayı durdur
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  async function playTTS(text, personality) {
    try {
      if (!ttsEnabled) {
        console.log('TTS disabled by user');
        return;
      }
      
      if (!window.speechSynthesis) {
        console.warn('Speech synthesis not supported');
        return;
      }

      // Extract only the speech part for TTS
      const parsed = parseDoctorResponse(text);
      const speechText = parsed.speech;

      const { ssml, config } = await window.ApiClient.tts(speechText, personality);
      
      // Parse SSML and apply to speech synthesis
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = 'tr-TR';
      utterance.rate = config.rate;
      utterance.pitch = config.pitch;
      utterance.volume = config.volume;

      utterance.onstart = () => {
        showSpeakingIndicator();
      };

      utterance.onend = () => {
        hideSpeakingIndicator();
      };

      utterance.onerror = (e) => {
        console.warn('TTS error', e);
        hideSpeakingIndicator();
      };

      speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('TTS failed', err);
      // Fallback to basic speech synthesis
      try {
        const parsed = parseDoctorResponse(text);
        const speechText = parsed.speech;
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.lang = 'tr-TR';
        utterance.onstart = () => showSpeakingIndicator();
        utterance.onend = () => hideSpeakingIndicator();
        speechSynthesis.speak(utterance);
      } catch (fallbackErr) {
        console.warn('Fallback TTS failed', fallbackErr);
      }
    }
  }

  async function startSimulation(e) {
    e.preventDefault();
    chat.innerHTML = '';
    startBtn.disabled = true;
    messageInput.value = '';
    sendBtn.disabled = true;
    addMeta('Senaryo başlatılıyor...');

    const config = window.ScenarioManager.collectConfig();
    currentConfig = config;
    try {
      updateDoctorProfile(config);
      showTypingIndicator();
      const { sessionId: sid, message } = await window.ApiClient.start(config);
      sessionId = sid;
      chat.innerHTML = '';
      hideTypingIndicator();
      addBubble(message, 'assistant');
      
      // Eğitim panelini başlat
      if (window.TrainingManager) {
        window.TrainingManager.startSession();
        window.TrainingManager.showTrainingPanel();
      }
      
      // Auto-play TTS for opening message
      setTimeout(() => playTTS(message, config.personality), 500);
      sendBtn.disabled = false;
      if (recognitionSupported) {
        holdToTalkBtn.disabled = false;
        recordHint?.classList?.remove('hidden');
        // Preflight mic permission and prewarm recognizer to reduce first-start latency
        ensureMicPermission().then(() => prewarmRecognition()).catch(() => {});
        // Keep recognition warm in background to reduce latency
        backgroundRecognitionEnabled = true;
        startGlobalRecognition();
      }
      sessionStorage.setItem('sessionId', sessionId);
      sessionStorage.setItem('config', JSON.stringify(config));
    } catch (err) {
      console.error(err);
      addMeta('Başlatma başarısız. Lütfen tekrar deneyin.');
    } finally {
      startBtn.disabled = false;
    }
  }

  function startGlobalRecognition() {
    try {
      if (!recognitionSupported) return;
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!recognition) {
        recognition = new SR();
        recognition.lang = (navigator.language && navigator.language.startsWith('tr')) ? navigator.language : 'tr-TR';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          console.log('SpeechRecognition started');
        };
        recognition.onsoundstart = () => console.log('Sound started');
        recognition.onsoundend = () => console.log('Sound ended');
        recognition.onspeechstart = () => console.log('Speech started');
        recognition.onspeechend = () => console.log('Speech ended');

        recognition.onresult = (event) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              if (isCapturingHold) {
                collectedTranscript += result[0].transcript;
                receivedAnyResult = true;
              }
            } else {
              if (isCapturingHold) {
                interim += result[0].transcript;
              }
            }
          }
          if (isCapturingHold) {
            const displayText = (collectedTranscript + ' ' + interim).trim();
            messageInput.value = displayText;
            autosizeTextarea();
            console.log('STT interim/final:', { collectedTranscript, interim });
          }
        };

        recognition.onerror = (event) => {
          console.error('STT error', event);
          const err = event?.error || 'unknown';
          if (err === 'not-allowed' || err === 'service-not-allowed') {
            addMeta('Mikrofon izni reddedildi. Tarayıcı ayarlarını kontrol edin.');
          } else if (err === 'no-speech') {
            // benign in background mode
          } else if (err === 'audio-capture') {
            addMeta('Mikrofon bulunamadı veya kapalı.');
          } else {
            addMeta('Ses tanıma hatası.');
          }
        };

        recognition.onnomatch = () => {
          if (isCapturingHold) console.warn('No match from speech recognition');
        };

        recognition.onend = () => {
          console.log('Recognition ended');
          if (backgroundRecognitionEnabled) {
            setTimeout(() => {
              try { recognition.start(); } catch (_) {}
            }, 100);
          }
        };
      }
      try { recognition.start(); } catch (_) {}
    } catch (e) {
      console.warn('startGlobalRecognition failed', e);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
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
      // Auto-play TTS for assistant responses
      setTimeout(() => playTTS(message, currentConfig?.personality), 300);
    } catch (err) {
      console.error(err);
      hideTypingIndicator();
      addMeta('Mesaj gönderilemedi.');
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
      // Auto-play TTS for assistant responses
      setTimeout(() => playTTS(message, currentConfig?.personality), 300);
    } catch (err) {
      console.error(err);
      hideTypingIndicator();
      addMeta('Mesaj gönderilemedi.');
    } finally {
      sendBtn.disabled = false;
    }
  }

  function initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    // Security: SpeechRecognition generally requires secure context (HTTPS) except localhost
    const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    insecureContext = (location.protocol !== 'https:') && !isLocalhost;
    if (insecureContext) {
      recognitionSupported = false;
      holdToTalkBtn?.setAttribute('title', 'Güvenli bağlam gerekli (HTTPS veya localhost)');
      addMeta('Ses tanıma için HTTPS veya localhost gerekir.');
      console.warn('SpeechRecognition blocked due to insecure context');
      return;
    }
    if (!SR) {
      recognitionSupported = false;
      holdToTalkBtn?.setAttribute('title', 'Tarayıcı konuşma tanımayı desteklemiyor');
      addMeta('Tarayıcı konuşma tanımayı desteklemiyor.');
      console.warn('SpeechRecognition not supported');
      return;
    }
    recognitionSupported = true;
  }

  async function ensureMicPermission() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return true; // skip if not available
      if (micStream) return true;
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Do not keep it open unnecessarily; stop immediately, SR will capture itself
      try { micStream.getTracks().forEach(t => t.stop()); } catch (_) {}
      micStream = null;
      return true;
    } catch (e) {
      console.error('getUserMedia error', e);
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
        console.log('Prewarm SR started');
        setTimeout(() => {
          try { warm.stop(); } catch (_) {}
        }, 150);
      };
      warm.onend = () => {
        console.log('Prewarm SR ended');
        recognitionPrewarmed = true;
      };
      warm.onerror = (e) => {
        console.warn('Prewarm SR error', e);
      };
      warm.start();
    } catch (e) {
      console.warn('Prewarm failed', e);
    }
  }

  async function startRecording() {
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
    // Ensure background recognizer is running
    startGlobalRecognition();
  }

  async function stopRecording() {
    if (!recognitionSupported || !isRecording) return;
    try {
      // Stop capturing but keep recognition warmed
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
    } catch (e) {
      console.error('stopRecording error', e);
    }
  }

  form.addEventListener('submit', startSimulation);
  messageForm.addEventListener('submit', sendMessage);
  
  if (toggleTrainingBtn) {
    toggleTrainingBtn.addEventListener('click', () => {
      if (window.TrainingManager) {
        window.TrainingManager.toggleTrainingPanel();
      }
    });
  }

  if (toggleTTSBtn) {
    toggleTTSBtn.addEventListener('click', toggleTTS);
  }

  // Press-and-hold listeners
  holdToTalkBtn?.addEventListener('mousedown', startRecording);
  document.addEventListener('mouseup', stopRecording);
  holdToTalkBtn?.addEventListener('touchstart', startRecording, { passive: true });
  holdToTalkBtn?.addEventListener('touchend', stopRecording, { passive: true });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target === messageInput) return; // Don't interfere with typing
    
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      if (recognitionSupported && !isRecording && sessionId) {
        startRecording();
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && isRecording) {
      e.preventDefault();
      stopRecording();
    }
  });

  // init
  initSpeechRecognition();
  window.ScenarioManager.initSelectors();
  
  // TTS durumunu başlat
  if (toggleTTSBtn) {
    toggleTTSBtn.title = 'Sesli cevap kapalı - tıklayarak açın';
  }
})();


