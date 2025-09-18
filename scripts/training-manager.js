window.TrainingManager = (() => {
  let startTime = null;
  let messageCount = 0;
  let satisfactionScore = 50;
  let suggestions = [];
  let updateInterval = null;

  function startSession() {
    startTime = Date.now();
    messageCount = 0;
    satisfactionScore = 50;
    suggestions = [];
    updateDisplay();
    
    // Start timer for conversation time
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

  function addMessage(role) {
    if (role === 'user') {
      messageCount++;
      updateDisplay();
    }
  }

  function updateSatisfaction(change) {
    satisfactionScore = Math.max(0, Math.min(100, satisfactionScore + change));
    updateDisplay();
  }

  function addSuggestion(suggestion) {
    if (!suggestions.includes(suggestion)) {
      suggestions.push(suggestion);
      updateSuggestions();
    }
  }

  function updateDisplay() {
    const timeEl = document.getElementById('conversationTime');
    const countEl = document.getElementById('messageCount');
    const satisfactionEl = document.getElementById('satisfactionFill');

    if (timeEl && startTime) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    if (countEl) {
      countEl.textContent = messageCount;
    }

    if (satisfactionEl) {
      satisfactionEl.style.width = `${satisfactionScore}%`;
    }
  }

  function updateSuggestions() {
    const listEl = document.getElementById('suggestionsList');
    if (listEl) {
      listEl.innerHTML = suggestions.map(s => `<li>${s}</li>`).join('');
    }
  }

  function analyzeMessage(message, role) {
    if (role === 'user') {
      // Basit analiz - gerçek uygulamada daha sofistike olabilir
      if (message.includes('?')) {
        updateSatisfaction(5);
        if (message.includes('nasıl') || message.includes('neden') || message.includes('hangi')) {
          addSuggestion('✅ Açık uçlu sorular soruyorsunuz - harika!');
        }
      }
      
      if (message.length < 20) {
        addSuggestion('💡 Mesajlarınızı biraz daha detaylandırabilirsiniz');
      }
      
      if (message.includes('yan etki') || message.includes('güvenlik') || message.includes('kontrendikasyon')) {
        addSuggestion('✅ Güvenlik konularını ele alıyorsunuz - doktorlar bunu takdir eder');
        updateSatisfaction(10);
      }

      if (message.includes('hasta') || message.includes('deneyim') || message.includes('vaka')) {
        addSuggestion('✅ Hasta deneyimlerinden bahsediyorsunuz - etkili bir yaklaşım');
        updateSatisfaction(8);
      }

      if (message.includes('maliyet') || message.includes('fiyat') || message.includes('ekonomik')) {
        addSuggestion('✅ Maliyet-etkinlik konusunu ele alıyorsunuz');
        updateSatisfaction(7);
      }

      // Negatif puanlar
      if (message.includes('satın al') || message.includes('satış')) {
        addSuggestion('⚠️ Doğrudan satış dilinden kaçının, tıbbi faydalara odaklanın');
        updateSatisfaction(-5);
      }

      if (message.length > 200) {
        addSuggestion('💡 Mesajlarınızı daha kısa tutarak doktorun dikkatini koruyun');
        updateSatisfaction(-3);
      }
    }
  }

  function showTrainingPanel() {
    const panel = document.getElementById('trainingPanel');
    if (panel) {
      panel.classList.remove('hidden');
    }
  }

  function hideTrainingPanel() {
    const panel = document.getElementById('trainingPanel');
    if (panel) {
      panel.classList.add('hidden');
    }
  }

  function toggleTrainingPanel() {
    const panel = document.getElementById('trainingPanel');
    const content = document.getElementById('trainingContent');
    const toggleBtn = document.getElementById('toggleTraining');
    
    if (panel && content && toggleBtn) {
      if (content.style.display === 'none') {
        content.style.display = 'grid';
        toggleBtn.textContent = '📈';
      } else {
        content.style.display = 'none';
        toggleBtn.textContent = '📊';
      }
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
    addMessage,
    updateSatisfaction,
    addSuggestion,
    analyzeMessage,
    showTrainingPanel,
    hideTrainingPanel,
    toggleTrainingPanel,
    getSessionStats
  };
})();
