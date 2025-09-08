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

  function addBubble(text, role) {
    const div = document.createElement('div');
    div.className = `bubble ${role}`;
    div.textContent = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
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

  async function startSimulation(e) {
    e.preventDefault();
    chat.innerHTML = '';
    startBtn.disabled = true;
    messageInput.value = '';
    sendBtn.disabled = true;
    addMeta('Senaryo başlatılıyor...');

    const config = window.ScenarioManager.collectConfig();
    try {
      const { sessionId: sid, message } = await window.ApiClient.start(config);
      sessionId = sid;
      chat.innerHTML = '';
      addBubble(message, 'assistant');
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
      const { message } = await window.ApiClient.message(sessionId, text);
      addBubble(message, 'assistant');
    } catch (err) {
      console.error(err);
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
      const { message } = await window.ApiClient.message(sessionId, clean);
      addBubble(message, 'assistant');
    } catch (err) {
      console.error(err);
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

  // Press-and-hold listeners
  holdToTalkBtn?.addEventListener('mousedown', startRecording);
  document.addEventListener('mouseup', stopRecording);
  holdToTalkBtn?.addEventListener('touchstart', startRecording, { passive: true });
  holdToTalkBtn?.addEventListener('touchend', stopRecording, { passive: true });

  // init
  initSpeechRecognition();
  window.ScenarioManager.initSelectors();
})();


