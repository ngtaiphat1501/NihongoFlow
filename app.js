
let musicCtx = null;
let musicPlaying = false;
let schedulerTimer = null;
let petalInterval = null;
let windNode = null;
let musicVolumeNode = null;
let nextBeatTime = 0;
let beatCounter = 0;
let bgAudio = null;
let audioSource = null;
const defaultMusicUrl = 'bgmusic.mp3';

const chords = [
  [174.61, 220.00, 261.63, 329.63],
  [196.00, 246.94, 293.66, 392.00],
  [164.81, 196.00, 246.94, 329.63],
  [220.00, 261.63, 329.63, 392.00]
];

const bellNotes = [
  [440.00, 523.25, 587.33, 659.25, 783.99],
  [493.88, 587.33, 659.25, 783.99, 880.00],
  [329.63, 392.00, 440.00, 523.25, 659.25],
  [440.00, 523.25, 587.33, 659.25, 783.99]
];

let currentChordIdx = 0;

let currentTab = 'dashboard';
let learnedHiragana = JSON.parse(localStorage.getItem('learned_hiragana')) || [];
let learnedKatakana = JSON.parse(localStorage.getItem('learned_katakana')) || [];
let userStreak = parseInt(localStorage.getItem('user_streak')) || 0;
let userScore = parseInt(localStorage.getItem('user_score')) || 0; 
let totalQuizzesPlayed = parseInt(localStorage.getItem('total_quizzes')) || 0;
let correctQuizAnswers = parseInt(localStorage.getItem('correct_answers')) || 0;
let totalQuizQuestions = parseInt(localStorage.getItem('total_questions')) || 0;
let lastActiveDate = localStorage.getItem('last_active_date') || '';

let soundEffectsEnabled = localStorage.getItem('sound_effects') !== 'false';

let activeCourse = 'dekiru';
let activeCategory = 'lesson1';
let currentVocabList = [];
let activeRefCategory = 'numbers';

let quizState = {
  isActive: false,
  questions: [],
  currentQuestionIndex: 0,
  score: 0,
  timeStart: 0,
  timerInterval: null,
  correctStreak: 0,
  xpEarned: 0,
  userSelectedAnswers: []
};

let japaneseVoice = null;

document.addEventListener('DOMContentLoaded', () => {
  initSakuraPetals();
  initVoices();
  initStreak();
  updateStatsDisplay();

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  const toggleHiragana = document.getElementById('toggle-hiragana');
  const toggleKatakana = document.getElementById('toggle-katakana');

  toggleHiragana.addEventListener('change', () => renderAlphabetGrid('hiragana'));
  toggleKatakana.addEventListener('change', () => renderAlphabetGrid('katakana'));

  const toggleSoundBtn = document.getElementById('btn-toggle-sound');
  if (toggleSoundBtn) {
    toggleSoundBtn.addEventListener('click', toggleSoundEffects);
    updateSoundIcon();
  }

  const speedSlider = document.getElementById('speech-speed');
  const speedVal = document.getElementById('speech-speed-val');
  speedSlider.addEventListener('input', (e) => {
    speedVal.textContent = e.target.value + 'x';
  });

  document.getElementById('close-detail-btn').addEventListener('click', () => {
    document.getElementById('kana-detail-box').style.display = 'none';
  });

  document.getElementById('btn-shuffle-cards').addEventListener('click', shuffleVocabCards);

  document.querySelectorAll('.radio-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const quizType = card.getAttribute('data-quiz-type');
      const filterGroup = document.getElementById('quiz-vocab-filter-group');
      if (quizType === 'vocabulary') {
        filterGroup.classList.remove('hidden');
        populateQuizFilters();
      } else {
        filterGroup.classList.add('hidden');
      }
    });
  });

  document.querySelectorAll('.btn-length-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-length-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.getElementById('btn-start-quiz').addEventListener('click', setupAndStartQuiz);

  document.getElementById('btn-next-question').addEventListener('click', nextQuizQuestion);

  document.getElementById('btn-quit-quiz').addEventListener('click', quitQuiz);

  document.getElementById('btn-quiz-retry').addEventListener('click', () => {
    switchTab('quiz');
    document.getElementById('quiz-results-panel').classList.add('hidden');
    document.getElementById('quiz-setup-panel').classList.remove('hidden');
  });

  renderAlphabetGrid('hiragana');
  renderCourseChips();
  renderVocabCategories();
  renderFlashcards(activeCategory);

  document.querySelectorAll('#ref-category-chips .ref-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ref-category-chips .ref-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRefCategory = btn.getAttribute('data-ref');
      renderReferenceTable(activeRefCategory);
    });
  });

  renderReferenceTable(activeRefCategory);
  initSloganTypewriter();

  const toggleMusicBtn = document.getElementById('btn-toggle-music');
  const volumeSlider = document.getElementById('music-volume');
  const volumeVal = document.getElementById('music-volume-val');

  if (volumeSlider && volumeVal) {
    const savedPct = localStorage.getItem('music_volume_pct') || '40';
    volumeSlider.value = savedPct;
    volumeVal.textContent = savedPct + '%';

    volumeSlider.addEventListener('input', (e) => {
      const pct = parseInt(e.target.value);
      volumeVal.textContent = pct + '%';
      const vol = (pct / 100) * 0.3;
      if (musicVolumeNode && musicCtx) {
        musicVolumeNode.gain.setValueAtTime(vol, musicCtx.currentTime);
      }
      if (bgAudio) {
        bgAudio.volume = pct / 100;
      }
      localStorage.setItem('music_volume_pct', pct);
    });

    volumeSlider.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  if (toggleMusicBtn) {
    toggleMusicBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBackgroundMusic();
    });
    updateMusicButtonUI();

    if (localStorage.getItem('bg_music_enabled') === null) {
      localStorage.setItem('bg_music_enabled', 'true');
    }

    const musicWasEnabled = localStorage.getItem('bg_music_enabled') === 'true';
    if (musicWasEnabled) {
      const startMusicOnInteraction = () => {
        if (!musicPlaying && !musicCtx) {
          startBackgroundMusic();
        }
        document.removeEventListener('click', startMusicOnInteraction);
        document.removeEventListener('keydown', startMusicOnInteraction);
        document.removeEventListener('touchstart', startMusicOnInteraction);
      };

      document.addEventListener('click', startMusicOnInteraction);
      document.addEventListener('keydown', startMusicOnInteraction);
      document.addEventListener('touchstart', startMusicOnInteraction);
    }
  }

  const btnSaveMusic = document.getElementById('btn-save-music-url');
  const btnResetMusic = document.getElementById('btn-reset-music-url');
  const musicUrlInput = document.getElementById('music-url-input');

  if (musicUrlInput) {
    musicUrlInput.value = localStorage.getItem('custom_music_url') || '';
  }

  if (btnSaveMusic) {
    btnSaveMusic.addEventListener('click', () => {
      const url = musicUrlInput.value.trim();
      if (url === '') {
        localStorage.removeItem('custom_music_url');
        playAudioTone('correct');
        alert('Đã xóa nhạc nền tùy chỉnh. Hệ thống sẽ phát nhạc mặc định.');
        if (musicPlaying) {
          resetAudioSystem();
          startBackgroundMusic();
        }
        return;
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        alert('Vui lòng nhập một liên kết URL hợp lệ bắt đầu bằng http:// hoặc https://');
        return;
      }

      localStorage.setItem('custom_music_url', url);
      playAudioTone('correct');
      alert('Đã lưu cấu hình nhạc nền mới! Hệ thống đang tải và phát nhạc.');
      if (musicPlaying) {
        resetAudioSystem();
      }
      startBackgroundMusic();
    });
  }

  if (btnResetMusic) {
    btnResetMusic.addEventListener('click', () => {
      localStorage.removeItem('custom_music_url');
      if (musicUrlInput) {
        musicUrlInput.value = '';
      }
      playAudioTone('correct');
      alert('Đã khôi phục nhạc mặc định.');
      if (musicPlaying) {
        resetAudioSystem();
        startBackgroundMusic();
      }
    });
  }

  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('contact-name').value;
      const email = document.getElementById('contact-email').value;
      playAudioTone('correct');
      alert(`Cảm ơn ${name}! Ý kiến đóng góp của bạn đã được gửi thành công. Chúng tôi sẽ phản hồi qua email ${email} sớm nhất có thể.`);
      contactForm.reset();
    });
  }
});

function initVoices() {
  if ('speechSynthesis' in window) {
    const populateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const jaVoices = voices.filter(voice => voice.lang.startsWith('ja') || voice.lang === 'ja-JP');

      const select = document.getElementById('voice-select');
      if (!select) return;
      select.innerHTML = '';

      if (jaVoices.length === 0) {
        select.innerHTML = '<option value="none">Giọng mặc định</option>';
        return;
      }

      jaVoices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;

        let genderLabel = 'Nữ';
        const lowerName = voice.name.toLowerCase();
        if (lowerName.includes('ichiro') || lowerName.includes('keita') || lowerName.includes('male') || lowerName.includes('nam')) {
          genderLabel = 'Nam';
        }

        option.textContent = `Giọng ${genderLabel} (${voice.name.replace('Microsoft', '').trim()})`;
        select.appendChild(option);
      });

      japaneseVoice = jaVoices[0];

      select.onchange = (e) => {
        if (e.target.value !== 'none') {
          japaneseVoice = jaVoices[parseInt(e.target.value)];
        }
      };
    };

    window.speechSynthesis.onvoiceschanged = populateVoices;
    populateVoices();
  }
}

function speakJapanese(text) {
  if ('speechSynthesis' in window) {

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (japaneseVoice) {
      utterance.voice = japaneseVoice;
    } else {
      utterance.lang = 'ja-JP'; 
    }

    const speed = parseFloat(document.getElementById('speech-speed').value);
    utterance.rate = speed;

    window.speechSynthesis.speak(utterance);
  } else {
    alert('Trình duyệt của bạn không hỗ trợ phát âm âm thanh Web Speech.');
  }
}

function playAudioTone(type) {
  if (!soundEffectsEnabled) return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();
  const now = ctx.currentTime;

  if (type === 'correct') {

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); 
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12); 
    gain2.gain.setValueAtTime(0.12, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } else if (type === 'wrong') {

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(140.00, now);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(143.00, now); 

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.55);
    osc2.stop(now + 0.55);
  } else if (type === 'victory') {

    const notes = [261.63, 329.63, 392.00, 523.25]; 
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }, idx * 100);
    });
  }
}

function toggleSoundEffects() {
  soundEffectsEnabled = !soundEffectsEnabled;
  localStorage.setItem('sound_effects', soundEffectsEnabled);
  updateSoundIcon();
}

function updateSoundIcon() {
  const icon = document.getElementById('sound-icon');
  icon.textContent = soundEffectsEnabled ? '🔊' : '🔇';
  icon.parentElement.title = soundEffectsEnabled ? 'Tắt hiệu ứng âm thanh' : 'Bật hiệu ứng âm thanh';
}

function initStreak() {
  const today = new Date().toDateString();

  if (lastActiveDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (lastActiveDate === yesterdayStr) {

      userStreak += 1;
      localStorage.setItem('user_streak', userStreak);
    } else if (lastActiveDate !== today) {

      userStreak = 1;
      localStorage.setItem('user_streak', userStreak);
    }
  } else {

    userStreak = 1;
    localStorage.setItem('user_streak', userStreak);
  }

  localStorage.setItem('last_active_date', today);
  document.getElementById('user-streak').textContent = userStreak;
}

function updateStatsDisplay() {
  document.getElementById('user-streak').textContent = userStreak;
  document.getElementById('user-score').textContent = userScore;

  const hProgress = Math.min(100, Math.round((learnedHiragana.length / 46) * 100));
  const kProgress = Math.min(100, Math.round((learnedKatakana.length / 46) * 100));

  document.getElementById('hiragana-progress-text').textContent = `${learnedHiragana.length}/46`;
  document.getElementById('hiragana-progress-bar').style.width = `${hProgress}%`;

  document.getElementById('katakana-progress-text').textContent = `${learnedKatakana.length}/46`;
  document.getElementById('katakana-progress-bar').style.width = `${kProgress}%`;

  let quizAccuracy = 0;
  if (totalQuizQuestions > 0) {
    quizAccuracy = Math.round((correctQuizAnswers / totalQuizQuestions) * 100);
  }
  document.getElementById('accuracy-progress-text').textContent = `${quizAccuracy}%`;
  document.getElementById('accuracy-progress-bar').style.width = `${quizAccuracy}%`;
}

function addXP(amount) {
  userScore += amount;
  localStorage.setItem('user_score', userScore);
  updateStatsDisplay();
}

function switchTab(tabId) {
  currentTab = tabId;

  document.querySelectorAll('.nav-item').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    if (pane.id === `tab-${tabId}`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });

  if (tabId === 'dashboard') {
    updateStatsDisplay();
  }

  document.getElementById('kana-detail-box').style.display = 'none';
}

function renderAlphabetGrid(type) {
  const container = document.getElementById('kana-cells-grid');
  container.innerHTML = '';

  const data = type === 'hiragana' ? hiraganaData : katakanaData;
  const learnedList = type === 'hiragana' ? learnedHiragana : learnedKatakana;

  data.forEach((item, index) => {
    if (item.kana === '') {

      const spacer = document.createElement('div');
      spacer.className = 'kana-cell-empty';
      container.appendChild(spacer);
    } else {

      const cell = document.createElement('div');
      cell.className = 'kana-cell';
      if (learnedList.includes(item.kana)) {
        cell.classList.add('learned');
      }

      cell.innerHTML = `
        <span class="kana-char">${item.kana}</span>
        <span class="kana-romaji">${item.romaji}</span>
      `;

      cell.addEventListener('click', () => {

        document.querySelectorAll('.kana-cell').forEach(c => c.classList.remove('active-playing'));
        cell.classList.add('active-playing');

        speakJapanese(item.kana);

        showKanaDetail(item, type, cell);
      });

      container.appendChild(cell);
    }
  });
}

function showKanaDetail(item, type, cellElement) {
  const box = document.getElementById('kana-detail-box');
  const dKana = document.getElementById('detail-kana');
  const dRomaji = document.getElementById('detail-romaji');
  const speakBtn = document.getElementById('detail-speak-btn');
  const learnedBtn = document.getElementById('detail-mark-learned-btn');

  box.style.display = 'block';
  dKana.textContent = item.kana;
  dRomaji.textContent = `Romaji: ${item.romaji.toUpperCase()}`;

  speakBtn.onclick = () => speakJapanese(item.kana);

  const learnedList = type === 'hiragana' ? learnedHiragana : learnedKatakana;
  const storageKey = type === 'hiragana' ? 'learned_hiragana' : 'learned_katakana';

  if (learnedList.includes(item.kana)) {
    learnedBtn.textContent = '❌ Hủy đánh dấu thuộc';
    learnedBtn.className = 'btn btn-danger';
  } else {
    learnedBtn.textContent = '✅ Đánh dấu đã thuộc';
    learnedBtn.className = 'btn btn-secondary';
  }

  learnedBtn.onclick = () => {
    let list = type === 'hiragana' ? learnedHiragana : learnedKatakana;

    if (list.includes(item.kana)) {
      list = list.filter(k => k !== item.kana);
      cellElement.classList.remove('learned');
      addXP(-5); 
    } else {
      list.push(item.kana);
      cellElement.classList.add('learned');
      addXP(10); 
      playAudioTone('correct');
    }

    if (type === 'hiragana') {
      learnedHiragana = list;
      localStorage.setItem('learned_hiragana', JSON.stringify(learnedHiragana));
    } else {
      learnedKatakana = list;
      localStorage.setItem('learned_katakana', JSON.stringify(learnedKatakana));
    }

    showKanaDetail(item, type, cellElement);
  };
}

function renderCourseChips() {
  const container = document.getElementById('vocab-course-chips');
  if (!container) return;
  container.innerHTML = '';

  courses.forEach(course => {
    const chip = document.createElement('button');
    chip.className = `course-chip ${course.id === activeCourse ? 'active' : ''}`;
    chip.textContent = course.name;
    chip.addEventListener('click', () => {
      document.querySelectorAll('.course-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCourse = course.id;

      const filteredCats = vocabularyCategories.filter(c => c.courseId === activeCourse);
      if (filteredCats.length > 0) {
        activeCategory = filteredCats[0].id;
      }

      renderVocabCategories();
      renderFlashcards(activeCategory);
    });
    container.appendChild(chip);
  });
}

function renderVocabCategories() {
  const container = document.getElementById('vocab-category-chips');
  if (!container) return;
  container.innerHTML = '';

  const filteredCats = vocabularyCategories.filter(cat => cat.courseId === activeCourse);

  filteredCats.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = `category-chip ${cat.id === activeCategory ? 'active' : ''}`;
    chip.innerHTML = `
      <span class="chip-icon">${cat.icon}</span>
      <span>${cat.name}</span>
    `;

    chip.addEventListener('click', () => {
      document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCategory = cat.id;
      renderFlashcards(cat.id);
    });

    container.appendChild(chip);
  });
}

function populateQuizFilters() {
  const courseSelect = document.getElementById('quiz-course-select');
  const catSelect = document.getElementById('quiz-category-select');
  if (!courseSelect || !catSelect) return;

  courseSelect.innerHTML = '<option value="all">Tất cả khóa học</option>';
  courses.forEach(c => {
    courseSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });

  const updateCategories = () => {
    const courseId = courseSelect.value;
    catSelect.innerHTML = '<option value="all">Tất cả bài học</option>';

    const cats = courseId === 'all' 
      ? vocabularyCategories 
      : vocabularyCategories.filter(c => c.courseId === courseId);

    cats.forEach(cat => {
      catSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
  };

  courseSelect.onchange = updateCategories;
  updateCategories();
}

function renderFlashcards(categoryId) {
  const grid = document.getElementById('flashcards-grid');
  grid.innerHTML = '';

  const category = vocabularyCategories.find(c => c.id === categoryId);
  if (!category) return;

  currentVocabList = [...category.words];
  document.getElementById('vocab-display-count').textContent = `Chủ đề ${category.name}: ${currentVocabList.length} từ`;

  currentVocabList.forEach(word => {
    const card = document.createElement('div');
    card.className = 'flashcard';

    card.innerHTML = `
      <div class="flashcard-inner">
        <div class="flashcard-front">
          <span class="card-audio-hint">Nhấp nghe âm thanh</span>
          <div class="card-kana">${word.kana}</div>
          ${word.kanji !== word.kana ? `<div class="card-kanji">${word.kanji}</div>` : ''}
          <button class="btn-speak-card" title="Phát âm tiếng Nhật">🔊</button>
          <span class="card-flip-prompt">Lật thẻ để xem nghĩa ➔</span>
        </div>
        <div class="flashcard-back">
          <span class="card-back-icon">${category.icon}</span>
          <div class="card-meaning">${word.meaning}</div>
          <div class="card-romaji">Romaji: ${word.romaji}</div>
          <span class="card-flip-prompt">➔ Lật lại</span>
        </div>
      </div>
    `;

    const speakBtn = card.querySelector('.btn-speak-card');
    speakBtn.addEventListener('click', (e) => {
      e.stopPropagation(); 
      speakJapanese(word.kana);
    });

    card.addEventListener('click', () => {
      card.classList.toggle('flipped');
    });

    grid.appendChild(card);
  });
}

function shuffleVocabCards() {
  if (currentVocabList.length <= 1) return;

  for (let i = currentVocabList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [currentVocabList[i], currentVocabList[j]] = [currentVocabList[j], currentVocabList[i]];
  }

  const grid = document.getElementById('flashcards-grid');
  grid.innerHTML = '';
  const category = vocabularyCategories.find(c => c.id === activeCategory);

  currentVocabList.forEach(word => {
    const card = document.createElement('div');
    card.className = 'flashcard';

    card.innerHTML = `
      <div class="flashcard-inner">
        <div class="flashcard-front">
          <span class="card-audio-hint">Nhấp nghe âm thanh</span>
          <div class="card-kana">${word.kana}</div>
          ${word.kanji !== word.kana ? `<div class="card-kanji">${word.kanji}</div>` : ''}
          <button class="btn-speak-card">🔊</button>
          <span class="card-flip-prompt">Lật thẻ để xem nghĩa ➔</span>
        </div>
        <div class="flashcard-back">
          <span class="card-back-icon">${category.icon}</span>
          <div class="card-meaning">${word.meaning}</div>
          <div class="card-romaji">Romaji: ${word.romaji}</div>
          <span class="card-flip-prompt">➔ Lật lại</span>
        </div>
      </div>
    `;

    const speakBtn = card.querySelector('.btn-speak-card');
    speakBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakJapanese(word.kana);
    });

    card.addEventListener('click', () => {
      card.classList.toggle('flipped');
    });

    grid.appendChild(card);
  });

  grid.style.transform = 'scale(0.98)';
  setTimeout(() => { grid.style.transform = 'scale(1)'; }, 100);
}

function setupAndStartQuiz() {
  const selectedTypeCard = document.querySelector('.radio-card.active');
  const selectedLengthBtn = document.querySelector('.btn-length-opt.active');

  const quizType = selectedTypeCard.getAttribute('data-quiz-type');
  const quizLength = parseInt(selectedLengthBtn.getAttribute('data-length'));

  let questionBase = [];

  if (quizType === 'hiragana') {

    questionBase = hiraganaData.filter(item => item.kana !== '');
  } else if (quizType === 'katakana') {
    questionBase = katakanaData.filter(item => item.kana !== '');
  } else if (quizType === 'listening') {

    questionBase = [
      ...hiraganaData.filter(item => item.kana !== ''),
      ...katakanaData.filter(item => item.kana !== '')
    ];
  } else if (quizType === 'vocabulary') {

    const filterCourse = document.getElementById('quiz-course-select').value;
    const filterCat = document.getElementById('quiz-category-select').value;

    let targetCategories = vocabularyCategories;
    if (filterCourse !== 'all') {
      targetCategories = targetCategories.filter(c => c.courseId === filterCourse);
    }
    if (filterCat !== 'all') {
      targetCategories = targetCategories.filter(c => c.id === filterCat);
    }

    targetCategories.forEach(cat => {
      questionBase = questionBase.concat(cat.words);
    });
  }

  if (questionBase.length < 4) {
    alert('Không đủ dữ liệu câu hỏi để thiết lập bài trắc nghiệm.');
    return;
  }

  quizState.questions = [];
  const selectedIndices = new Set();

  const actualLength = Math.min(quizLength, questionBase.length);

  while (selectedIndices.size < actualLength) {
    const rIdx = Math.floor(Math.random() * questionBase.length);
    selectedIndices.add(rIdx);
  }

  selectedIndices.forEach(idx => {
    const correctObj = questionBase[idx];

    const distractors = [];
    const pool = questionBase.filter((_, pIdx) => pIdx !== idx);
    const distIndices = new Set();

    while (distIndices.size < Math.min(3, pool.length)) {
      distIndices.add(Math.floor(Math.random() * pool.length));
    }

    distIndices.forEach(dIdx => distractors.push(pool[dIdx]));

    quizState.questions.push({
      item: correctObj,
      choices: shuffleArray([correctObj, ...distractors]),
      type: quizType
    });
  });

  quizState.isActive = true;
  quizState.currentQuestionIndex = 0;
  quizState.score = 0;
  quizState.xpEarned = 0;
  quizState.correctStreak = 0;
  quizState.timeStart = Date.now();
  quizState.userSelectedAnswers = [];

  document.getElementById('quiz-setup-panel').classList.add('hidden');
  document.getElementById('quiz-play-panel').classList.remove('hidden');

  renderQuizQuestion();
  startQuizTimer();
}

function shuffleArray(arr) {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function startQuizTimer() {
  const timerLbl = document.getElementById('quiz-timer');
  timerLbl.textContent = 'Thời gian: 00:00';

  if (quizState.timerInterval) clearInterval(quizState.timerInterval);

  quizState.timerInterval = setInterval(() => {
    const seconds = Math.floor((Date.now() - quizState.timeStart) / 1000);
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    timerLbl.textContent = `Thời gian: ${m}:${s}`;
  }, 1000);
}

function renderQuizQuestion() {
  const currentQ = quizState.questions[quizState.currentQuestionIndex];

  const progText = document.getElementById('quiz-progress-indicator');
  progText.textContent = `Câu hỏi: ${quizState.currentQuestionIndex + 1}/${quizState.questions.length}`;

  const progressPct = ((quizState.currentQuestionIndex + 1) / quizState.questions.length) * 100;
  document.getElementById('quiz-play-progress-bar').style.width = `${progressPct}%`;

  const qText = document.getElementById('quiz-question-display');
  const qSub = document.getElementById('quiz-question-subtext');
  const audioTrigger = document.getElementById('quiz-audio-trigger');
  const nextBtn = document.getElementById('btn-next-question');

  nextBtn.classList.add('hidden');

  if (currentQ.type === 'hiragana' || currentQ.type === 'katakana') {
    audioTrigger.classList.add('hidden');
    qText.textContent = currentQ.item.kana;
    qSub.textContent = 'Ký tự này có âm đọc Romaji nào bên dưới?';
  } else if (currentQ.type === 'listening') {
    audioTrigger.classList.remove('hidden');
    qText.textContent = '🎧';
    qSub.textContent = 'Hãy nghe âm thanh và chọn ký tự đúng!';

    speakJapanese(currentQ.item.kana);

    document.getElementById('quiz-audio-btn').onclick = () => speakJapanese(currentQ.item.kana);
  } else if (currentQ.type === 'vocabulary') {
    audioTrigger.classList.add('hidden');

    const reverseQuestion = Math.random() > 0.5;
    currentQ.isReverseVocab = reverseQuestion;

    if (reverseQuestion) {
      qText.textContent = currentQ.item.meaning;
      qSub.textContent = 'Nghĩa này tương ứng với từ vựng tiếng Nhật nào?';
    } else {
      qText.textContent = currentQ.item.kana;
      if (currentQ.item.kanji !== currentQ.item.kana) {
        qSub.textContent = `Từ vựng "${currentQ.item.kanji}" có nghĩa là gì?`;
      } else {
        qSub.textContent = 'Từ vựng này có nghĩa là gì?';
      }
    }
  }

  const inlineSpeakBtn = document.getElementById('quiz-inline-speak-btn');
  if (currentQ.type === 'vocabulary') {
    inlineSpeakBtn.classList.remove('hidden');

    inlineSpeakBtn.onclick = () => {
      speakJapanese(currentQ.item.kana);
    };

    if (!currentQ.isReverseVocab) {
      setTimeout(() => { speakJapanese(currentQ.item.kana); }, 200);
    }
  } else {
    inlineSpeakBtn.classList.add('hidden');
  }

  const optionsGrid = document.getElementById('quiz-options-grid');
  optionsGrid.innerHTML = '';

  currentQ.choices.forEach((choice, index) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option-btn';

    let displayLabel = '';

    if (currentQ.type === 'hiragana' || currentQ.type === 'katakana') {
      displayLabel = choice.romaji;
    } else if (currentQ.type === 'listening') {
      displayLabel = choice.kana;
    } else if (currentQ.type === 'vocabulary') {
      displayLabel = currentQ.isReverseVocab ? `${choice.kana} (${choice.meaning})` : choice.meaning;
    }

    const keyLabel = ['A', 'B', 'C', 'D'][index];
    btn.innerHTML = `
      <span>${displayLabel}</span>
      <span class="option-badge">${keyLabel}</span>
    `;

    btn.addEventListener('click', () => selectQuizAnswer(index, btn));
    optionsGrid.appendChild(btn);
  });
}

function selectQuizAnswer(selectedIndex, btnElement) {

  document.querySelectorAll('.quiz-option-btn').forEach(b => {
    b.classList.add('disabled');
  });

  const currentQ = quizState.questions[quizState.currentQuestionIndex];
  const correctChoiceIndex = currentQ.choices.findIndex(c => c === currentQ.item);

  if (selectedIndex === correctChoiceIndex) {
    btnElement.classList.add('correct');
    playAudioTone('correct');
    quizState.score += 1;
    quizState.correctStreak += 1;
    quizState.xpEarned += 10;

    if (quizState.correctStreak >= 3) {
      quizState.xpEarned += 5; 
    }
  } else {

    btnElement.classList.add('wrong');

    const optButtons = document.querySelectorAll('.quiz-option-btn');
    optButtons[correctChoiceIndex].classList.add('correct');

    playAudioTone('wrong');
    quizState.correctStreak = 0;
  }

  quizState.userSelectedAnswers.push(selectedIndex);

  document.getElementById('btn-next-question').classList.remove('hidden');
}

function nextQuizQuestion() {
  quizState.currentQuestionIndex += 1;

  if (quizState.currentQuestionIndex < quizState.questions.length) {
    renderQuizQuestion();
  } else {
    finishQuizAndShowResults();
  }
}

function finishQuizAndShowResults() {
  quizState.isActive = false;
  if (quizState.timerInterval) clearInterval(quizState.timerInterval);

  const timeSeconds = Math.floor((Date.now() - quizState.timeStart) / 1000);
  const m = Math.floor(timeSeconds / 60).toString();
  const s = (timeSeconds % 60).toString().padStart(2, '0');
  const timeStr = `${m}:${s}`;

  const pct = Math.round((quizState.score / quizState.questions.length) * 100);

  totalQuizzesPlayed += 1;
  correctQuizAnswers += quizState.score;
  totalQuizQuestions += quizState.questions.length;
  userScore += quizState.xpEarned;

  localStorage.setItem('total_quizzes', totalQuizzesPlayed);
  localStorage.setItem('correct_answers', correctQuizAnswers);
  localStorage.setItem('total_questions', totalQuizQuestions);
  localStorage.setItem('user_score', userScore);

  const headline = document.getElementById('results-headline');
  const resultsMedal = document.getElementById('results-medal');

  if (pct === 100) {
    headline.textContent = '🎉 Tuyệt hảo! Điểm tối đa!';
    resultsMedal.textContent = '👑';
  } else if (pct >= 80) {
    headline.textContent = '🌟 Rất xuất sắc! Chúc mừng bạn!';
    resultsMedal.textContent = '🏆';
  } else if (pct >= 50) {
    headline.textContent = '👍 Khá tốt! Hãy cố gắng thêm!';
    resultsMedal.textContent = '🎖️';
  } else {
    headline.textContent = '📚 Hãy kiên trì luyện tập nhé!';
    resultsMedal.textContent = '📖';
  }

  document.getElementById('results-summary').textContent = `Bạn đã trả lời đúng ${quizState.score} trên tổng số ${quizState.questions.length} câu.`;
  document.getElementById('results-score-xp').textContent = `+${quizState.xpEarned} XP`;
  document.getElementById('results-accuracy-pct').textContent = `${pct}%`;
  document.getElementById('results-time-taken').textContent = timeStr;

  document.getElementById('quiz-play-panel').classList.add('hidden');
  document.getElementById('quiz-results-panel').classList.remove('hidden');

  playAudioTone('victory');
  triggerConfetti();
  updateStatsDisplay();
}

function quitQuiz() {
  if (confirm('Bạn có chắc chắn muốn bỏ bài thi trắc nghiệm này? Kết quả sẽ không được lưu.')) {
    if (quizState.timerInterval) clearInterval(quizState.timerInterval);
    quizState.isActive = false;

    document.getElementById('quiz-play-panel').classList.add('hidden');
    document.getElementById('quiz-setup-panel').classList.remove('hidden');
  }
}

function triggerConfetti() {
  const colors = ['#ff7eb9', '#7f00ff', '#00f2fe', '#00ff87', '#ffb703'];
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];

  for (let i = 0; i < 150; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height * 0.6,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.7) * 20 - 5,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
      decay: Math.random() * 0.02 + 0.01
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let alive = false;
    particles.forEach(p => {
      if (p.size > 0.1) {
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.45; 
        p.vx *= 0.98; 
        p.angle += p.spin;
        p.size -= p.decay;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (alive) {
      requestAnimationFrame(animate);
    } else {
      document.body.removeChild(canvas);
    }
  }

  animate();
}

function initSakuraPetals() {
  const container = document.getElementById('sakura-container');
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  let width = canvas.width = container.clientWidth;
  let height = canvas.height = container.clientHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = container.clientWidth;
    height = canvas.height = container.clientHeight;
  });

  const petals = [];
  const maxPetals = 25;

  class Petal {
    constructor() {
      this.reset();
      this.y = Math.random() * height; 
    }

    reset() {
      this.x = Math.random() * width;
      this.y = -20;
      this.size = Math.random() * 8 + 6;
      this.speedY = Math.random() * 1.2 + 0.6;
      this.speedX = Math.random() * 1.5 - 0.5;
      this.angle = Math.random() * Math.PI * 2;
      this.spin = Math.random() * 0.02 - 0.01;
      this.opacity = Math.random() * 0.4 + 0.3;
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX + Math.sin(this.y / 30) * 0.5;
      this.angle += this.spin;

      if (this.y > height + 20 || this.x > width + 20 || this.x < -20) {
        this.reset();
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 182, 193, ${this.opacity})`; 
      ctx.ellipse(0, 0, this.size, this.size / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 126, 185, ${this.opacity + 0.1})`;
      ctx.arc(this.size, 0, this.size / 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  for (let i = 0; i < maxPetals; i++) {
    petals.push(new Petal());
  }

  function loop() {
    ctx.clearRect(0, 0, width, height);
    petals.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(loop);
  }

  loop();
}

function renderReferenceTable(category) {
  const tableBody = document.getElementById('ref-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '';
  const data = referenceData[category];
  if (!data) return;

  data.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${item.label}</strong></td>
      <td>${item.kana}</td>
      <td>${item.romaji}</td>
      <td>${item.meaning}</td>
    `;

    row.addEventListener('click', () => {

      const cleanText = item.kana.split('(')[0].split('/')[0].trim();
      speakJapanese(cleanText);

      row.style.background = 'rgba(255, 126, 185, 0.15)';
      setTimeout(() => {
        row.style.background = '';
      }, 200);
    });

    tableBody.appendChild(row);
  });
}

function initSloganTypewriter() {
  const slogans = [
    "Hôm nay bạn muốn học gì thế? Hãy cùng luyện tập nào!",
    "Chinh phục tiếng Nhật dễ dàng cùng Nihongo Flow! 🌸",
    "Luyện đề Quiz phản xạ âm thanh chuẩn Nhật Bản! 🎯",
    "Ghi nhớ từ vựng N5 thông dụng bằng thẻ lật 3D sinh động! 📚",
    "Kiên trì học tập mỗi ngày - 継続は力なり (Kiên trì là sức mạnh)! 💪"
  ];

  const element = document.getElementById('slogan-display');
  if (!element) return;

  let sloganIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let delay = 100;

  function type() {
    const currentSlogan = slogans[sloganIndex];

    if (isDeleting) {
      element.textContent = currentSlogan.substring(0, charIndex - 1);
      charIndex--;
      delay = 30; 
    } else {
      element.textContent = currentSlogan.substring(0, charIndex + 1);
      charIndex++;
      delay = 60; 
    }

    if (!isDeleting && charIndex === currentSlogan.length) {
      isDeleting = true;
      delay = 3000; 
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      sloganIndex = (sloganIndex + 1) % slogans.length;
      delay = 500; 
    }

    setTimeout(type, delay);
  }

  type();
}

function startBackgroundMusic() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  if (!musicCtx) {
    musicCtx = new AudioContext();
    musicVolumeNode = musicCtx.createGain();

    const volumeSlider = document.getElementById('music-volume');
    const pct = volumeSlider ? parseInt(volumeSlider.value) : 40;
    const vol = (pct / 100) * 0.3;
    musicVolumeNode.gain.setValueAtTime(vol, musicCtx.currentTime);
    musicVolumeNode.connect(musicCtx.destination);

    createWindGen();

    const customUrl = localStorage.getItem('custom_music_url');
    const url = customUrl || defaultMusicUrl;

    playCustomMp3(url);
    petalInterval = setInterval(playPetalSparkle, 3200);
  }

  musicCtx.resume().then(() => {
    if (bgAudio) {
      const volumeSlider = document.getElementById('music-volume');
      const pct = volumeSlider ? parseInt(volumeSlider.value) : 40;
      bgAudio.volume = pct / 100;
      bgAudio.play().catch(err => {
        playLofiSynth();
      });
    } else {
      playLofiSynth();
    }
  });

  musicPlaying = true;
  updateMusicButtonUI();
}

function stopBackgroundMusic() {
  if (musicCtx) {
    musicCtx.suspend();
  }
  if (bgAudio) {
    bgAudio.pause();
  }
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  musicPlaying = false;
  updateMusicButtonUI();
}

function resetAudioSystem() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  if (petalInterval) {
    clearInterval(petalInterval);
    petalInterval = null;
  }
  if (bgAudio) {
    try {
      bgAudio.pause();
      bgAudio.src = '';
      bgAudio.load();
    } catch (e) {}
    bgAudio = null;
  }
  audioSource = null;
  if (windNode) {
    try { windNode.stop(); } catch(e) {}
    windNode = null;
  }
  if (musicCtx) {
    try { musicCtx.close(); } catch(e) {}
    musicCtx = null;
  }
  musicPlaying = false;
}

function playCustomMp3(url) {
  bgAudio = new Audio();
  bgAudio.src = url;
  bgAudio.loop = true;

  const volumeSlider = document.getElementById('music-volume');
  const pct = volumeSlider ? parseInt(volumeSlider.value) : 40;
  bgAudio.volume = pct / 100;

  bgAudio.addEventListener('error', (e) => {
    playLofiSynth();
  });

  bgAudio.play().catch(err => {
    playLofiSynth();
  });
}

function playLofiSynth() {
  if (schedulerTimer) return;
  nextBeatTime = musicCtx.currentTime + 0.1;
  beatCounter = 0;
  musicScheduler();
  schedulerTimer = setInterval(musicScheduler, 100);
}

function createWindGen() {
  const bufferSize = 2 * musicCtx.sampleRate;
  const noiseBuffer = musicCtx.createBuffer(1, bufferSize, musicCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const whiteNoise = musicCtx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;
  whiteNoise.loop = true;

  const windFilter = musicCtx.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.Q.setValueAtTime(1.5, musicCtx.currentTime);
  windFilter.frequency.setValueAtTime(400, musicCtx.currentTime);

  const windGain = musicCtx.createGain();
  windGain.gain.setValueAtTime(0.05, musicCtx.currentTime);

  whiteNoise.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(musicVolumeNode);

  whiteNoise.start();
  windNode = whiteNoise;

  modulateWindFilter(windFilter);
}

function modulateWindFilter(filter) {
  if (!musicCtx || !windNode) return;
  const now = musicCtx.currentTime;
  const targetFreq = 200 + Math.random() * 600;
  const time = 3 + Math.random() * 4;
  filter.frequency.exponentialRampToValueAtTime(targetFreq, now + time);
  setTimeout(() => modulateWindFilter(filter), time * 1000);
}

function playKick(time) {
  const osc = musicCtx.createOscillator();
  const gain = musicCtx.createGain();
  osc.connect(gain);
  gain.connect(musicVolumeNode);

  osc.frequency.setValueAtTime(100, time);
  osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);

  gain.gain.setValueAtTime(0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

  osc.start(time);
  osc.stop(time + 0.16);
}

function playSnare(time) {
  const bufferSize = musicCtx.sampleRate * 0.15;
  const buffer = musicCtx.createBuffer(1, bufferSize, musicCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = musicCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = musicCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;

  const gain = musicCtx.createGain();
  gain.gain.setValueAtTime(0.12, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(musicVolumeNode);

  noise.start(time);
  noise.stop(time + 0.15);
}

function playHihat(time) {
  const bufferSize = musicCtx.sampleRate * 0.04;
  const buffer = musicCtx.createBuffer(1, bufferSize, musicCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = musicCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = musicCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;

  const gain = musicCtx.createGain();
  gain.gain.setValueAtTime(0.04, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(musicVolumeNode);

  noise.start(time);
  noise.stop(time + 0.05);
}

function playPianoNote(freq, time) {
  const osc1 = musicCtx.createOscillator();
  const osc2 = musicCtx.createOscillator();
  const gainNode = musicCtx.createGain();
  const filterNode = musicCtx.createBiquadFilter();

  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, time);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, time);

  filterNode.type = 'lowpass';
  filterNode.frequency.setValueAtTime(600, time);
  filterNode.frequency.exponentialRampToValueAtTime(150, time + 0.8);

  gainNode.gain.setValueAtTime(0.001, time);
  gainNode.gain.linearRampToValueAtTime(0.12, time + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

  osc1.connect(filterNode);
  osc2.connect(filterNode);
  filterNode.connect(gainNode);
  gainNode.connect(musicVolumeNode);

  osc1.start(time);
  osc2.start(time);

  osc1.stop(time + 1.3);
  osc2.stop(time + 1.3);
}

function musicScheduler() {
  if (!musicCtx) return;
  while (nextBeatTime < musicCtx.currentTime + 0.2) {
    scheduleBeat(beatCounter, nextBeatTime);
    nextBeatTime += 0.395;
    beatCounter = (beatCounter + 1) % 32;
  }
}

function scheduleBeat(step, time) {
  const barIdx = Math.floor(step / 8);
  const noteIdx = step % 8;

  let chord;
  if (barIdx === 0) {
    chord = [155.56, 185.00, 233.08, 277.18, 349.23];
  } else if (barIdx === 1) {
    chord = [138.59, 174.61, 207.65, 233.08, 349.23];
  } else if (barIdx === 2) {
    chord = [123.47, 146.83, 185.00, 233.08, 293.66];
  } else {
    chord = [116.54, 138.59, 174.61, 207.65, 277.18];
  }

  const pianoMapping = [0, 1, 2, 3, 4, 2, 1, 2];
  const freq = chord[pianoMapping[noteIdx]];
  playPianoNote(freq, time);

  const kicks = [0, 7, 8, 15, 16, 23, 24, 31];
  const snares = [4, 12, 20, 28];
  const hats = [2, 6, 10, 14, 18, 22, 26, 30];

  if (kicks.includes(step)) {
    playKick(time);
  }
  if (snares.includes(step)) {
    playSnare(time);
  }
  if (hats.includes(step)) {
    playHihat(time);
  }
}

function playPetalSparkle() {
  if (!musicCtx || Math.random() > 0.4) return;

  const now = musicCtx.currentTime;
  const notes = [1046.50, 1174.66, 1396.91, 1567.98, 1760.00, 2093.00];
  const baseFreq = notes[Math.floor(Math.random() * notes.length)];

  for (let i = 0; i < 3; i++) {
    const timeOffset = i * 0.15;
    const freq = baseFreq * (1 - i * 0.15);

    const osc = musicCtx.createOscillator();
    const gain = musicCtx.createGain();
    const filter = musicCtx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + timeOffset);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, now + timeOffset);

    gain.gain.setValueAtTime(0.001, now + timeOffset);
    gain.gain.exponentialRampToValueAtTime(0.03, now + timeOffset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(musicVolumeNode);

    osc.start(now + timeOffset);
    osc.stop(now + timeOffset + 0.4);
  }
}

function toggleBackgroundMusic(e) {
  if (e) e.stopPropagation();
  if (musicPlaying) {
    stopBackgroundMusic();
    localStorage.setItem('bg_music_enabled', 'false');
  } else {
    startBackgroundMusic();
    localStorage.setItem('bg_music_enabled', 'true');
  }
}

function updateMusicButtonUI() {
  const container = document.querySelector('.music-volume-control');
  const btn = document.getElementById('btn-toggle-music');
  const icon = document.getElementById('music-icon');
  if (!btn || !icon) return;

  if (musicPlaying) {
    if (container) container.classList.add('playing');
    icon.textContent = '🔊';
    btn.title = 'Tắt nhạc nền chill';
  } else {
    if (container) container.classList.remove('playing');
    icon.textContent = '🔇';
    btn.title = 'Bật nhạc nền chill';
  }
}
