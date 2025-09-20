window.TrainingManager = (() => {
  let startTime = null;
  let messageCount = 0;
  let satisfactionScore = 50;
  let suggestions = [];
  let updateInterval = null;
  let visible = false;

  const panel = document.getElementById('trainingPanel');
  const toggleBtn = document.getElementById('toggleTraining');
  const timeEl = document.getElementById('conversationTime');
  const countEl = document.getElementById('messageCount');
  const satisfactionEl = document.getElementById('satisfactionFill');
  const suggestionsEl = document.getElementById('suggestionsList');

  function startSession() {
    startTime = Date.now();
    messageCount = 0;
    satisfactionScore = 50;
    suggestions = [];
    updateDisplay();

    if (updateInterval) {
      clearInterval(updateInterval);
    }
    updateInterval = setInterval(updateDisplay, 1000);
  }

  function stopSession() {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }

  function reset() {
    stopSession();
    startTime = null;
    messageCount = 0;
    satisfactionScore = 50;
    suggestions = [];
    updateDisplay();
    hideTrainingPanel();
  }

  function addMessage(role) {
    if (role === 'user') {
      messageCount += 1;
      updateDisplay();
    }
  }

  function adjustSatisfaction(change) {
    satisfactionScore = Math.max(0, Math.min(100, satisfactionScore + change));
    updateDisplay();
  }

  function addSuggestion(entry) {
    if (!entry || suggestions.includes(entry)) return;
    suggestions.push(entry);
    updateSuggestions();
  }

  function updateDisplay() {
    if (timeEl) {
      if (!startTime) {
        timeEl.textContent = '0:00';
      } else {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    }

    if (countEl) {
      countEl.textContent = messageCount;
    }

    if (satisfactionEl) {
      satisfactionEl.style.width = `${satisfactionScore}%`;
    }
  }

  function updateSuggestions() {
    if (!suggestionsEl) return;
    suggestionsEl.innerHTML = suggestions.map((item) => `<li>${item}</li>`).join('');
  }

  function analyzeMessage(message, role) {
    if (role !== 'user' || !message) return;
    const lower = message.toLocaleLowerCase('tr-TR');

    if (message.includes('?')) {
      adjustSatisfaction(5);
      if (lower.includes('nasıl') || lower.includes('neden') || lower.includes('hangi')) {
        addSuggestion('Açık uçlu sorularla derinleşiyorsunuz, böyle devam edin.');
      }
    }

    if (message.length < 20) {
      addSuggestion('Yanıtlarınızı biraz daha detaylandırarak güven oluşturabilirsiniz.');
    }

    if (lower.includes('yan etki') || lower.includes('güvenlik') || lower.includes('kontrendikasyon')) {
      addSuggestion('Güvenlik konularını masaya yatırmanız doktorların güvenini artırır.');
      adjustSatisfaction(10);
    }

    if (lower.includes('hasta') || lower.includes('deneyim') || lower.includes('vaka')) {
      addSuggestion('Hasta deneyimlerine bağlamanız hikâyeyi güçlendiriyor.');
      adjustSatisfaction(8);
    }

    if (lower.includes('maliyet') || lower.includes('fiyat') || lower.includes('ekonomik')) {
      addSuggestion('Maliyet-etkinlik çerçevesini sunmanız karar sürecine yardımcı olur.');
      adjustSatisfaction(7);
    }

    if (lower.includes('satın al') || lower.includes('satış')) {
      addSuggestion('Doğrudan satış dili yerine klinik faydaya odaklanmayı deneyin.');
      adjustSatisfaction(-6);
    }

    if (message.length > 220) {
      addSuggestion('Mesajlarınızı daha kompakt tutarak dikkati canlı tutabilirsiniz.');
      adjustSatisfaction(-4);
    }
  }

  function showTrainingPanel() {
    if (!panel) return;
    panel.classList.remove('hidden');
    visible = true;
    if (toggleBtn) {
      toggleBtn.textContent = 'Rehberi Gizle';
      toggleBtn.setAttribute('aria-expanded', 'true');
    }
  }

  function hideTrainingPanel() {
    if (!panel) return;
    panel.classList.add('hidden');
    visible = false;
    if (toggleBtn) {
      toggleBtn.textContent = 'Performans Rehberi';
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  }

  function toggleTrainingPanel() {
    if (visible) {
      hideTrainingPanel();
    } else {
      showTrainingPanel();
    }
  }

  function getSessionStats() {
    return {
      duration: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
      messageCount,
      satisfactionScore,
      suggestions: [...suggestions]
    };
  }

  return {
    startSession,
    stopSession,
    reset,
    addMessage,
    analyzeMessage,
    adjustSatisfaction,
    addSuggestion,
    showTrainingPanel,
    hideTrainingPanel,
    toggleTrainingPanel,
    getSessionStats
  };
})();

