window.ScenarioManager = (() => {
  const selectors = {
    doctorType: document.getElementById('doctorType'),
    specialty: document.getElementById('specialty'),
    personality: document.getElementById('personality'),
    drugCategory: document.getElementById('drugCategory'),
    difficulty: document.getElementById('difficulty'),
  };

  async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Failed to load ' + path);
    return res.json();
  }

  async function initSelectors() {
    const [doctorTypes, specialties, personalities, categories, difficulties] = await Promise.all([
      loadJSON('/data/doctor-types.json'),
      loadJSON('/data/specialties.json'),
      loadJSON('/data/personalities.json'),
      loadJSON('/data/drug-categories.json'),
      loadJSON('/data/difficulties.json'),
    ]);

    fill(selectors.doctorType, doctorTypes);
    fill(selectors.specialty, specialties);
    fill(selectors.personality, personalities);
    fill(selectors.drugCategory, categories);
    fill(selectors.difficulty, difficulties);
  }

  function fill(selectEl, options) {
    selectEl.innerHTML = '';
    for (const opt of options) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      selectEl.appendChild(o);
    }
  }

  function collectConfig() {
    return {
      doctorType: selectors.doctorType.value,
      specialty: selectors.specialty.value,
      personality: selectors.personality.value,
      drugCategory: selectors.drugCategory.value,
      difficulty: selectors.difficulty.value,
    };
  }

  return { initSelectors, collectConfig };
})();


