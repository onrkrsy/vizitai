(() => {
  const form = document.getElementById('scenario-form');
  const startBtn = document.getElementById('startBtn');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const chat = document.getElementById('chat');

  let sessionId = null;

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
      sessionStorage.setItem('sessionId', sessionId);
      sessionStorage.setItem('config', JSON.stringify(config));
    } catch (err) {
      console.error(err);
      addMeta('Başlatma başarısız. Lütfen tekrar deneyin.');
    } finally {
      startBtn.disabled = false;
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !sessionId) return;
    messageInput.value = '';
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

  form.addEventListener('submit', startSimulation);
  messageForm.addEventListener('submit', sendMessage);

  // init
  window.ScenarioManager.initSelectors();
})();


