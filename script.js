// ============================================
// JEOPARDY GAME - Main JavaScript File
// ============================================

// Compatibility helpers for older Chrome / embedded browsers
(function() {
    if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
    }
    if (!Element.prototype.closest) {
        Element.prototype.closest = function(s) {
            let el = this;
            while (el && el.nodeType === 1) {
                if (el.matches(s)) return el;
                el = el.parentElement || el.parentNode;
            }
            return null;
        };
    }
    if (window.NodeList && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = Array.prototype.forEach;
    }
})();

// Surface startup errors (helps when hosted + cached)
window.addEventListener('error', function(e) {
    try {
        console.error('Script error:', e.error || e.message, e.filename, e.lineno);
    } catch (_) { /* ignore */ }
});

// Global variables to store game data
let gameData = null; // Will hold the questions from JSON
let playerScores = [0, 0, 0]; // Length matches playerNames during play
let playerNames = ['Player 1', 'Player 2', 'Player 3']; // 2–8 teams after setup
let currentPlayer = 1; // 1-based index into playerNames
let currentQuestion = null; // Store the currently selected question
let currentTile = null; // Store the tile element that was clicked
let gameStarted = false; // Track if the game has started
let timerDuration = 30; // Timer duration in seconds (default: 30)
let timerInterval = null; // Store the timer interval
let timeRemaining = 0; // Current time remaining
let finalJeopardyTimerDuration = 30; // Final Jeopardy clue timer duration (default: 30)
let finalJeopardyTimerInterval = null;
let finalJeopardyTimeRemaining = 0;
let dailyDoubleCount = 2; // Number of daily doubles (default: 2)
let dailyDoubleQuestions = []; // Array to store which questions are daily doubles
let currentWager = 0; // Current wager for daily double question
let hideDailyDoubles = true; // Whether to hide daily doubles until clicked (default: true)
let originalQuestionsData = null; // Store original questions data for reset
let finalJeopardyWagers = [0, 0, 0]; // Store Final Jeopardy wagers for each player
let finalJeopardyQuestion = null; // Store the Final Jeopardy question
let finalJeopardyAnswered = false; // Track if Final Jeopardy has been completed
let jeopardyThemeAudio = null; // Audio element for timer music (32 sec = 1.0x playback reference)
let musicVolume = 1; // 0–1, HTMLAudioElement.volume for timer theme (synced with start/settings sliders)
const MUSIC_VOLUME_STORAGE_KEY = 'jeopardy-music-volume';
let gameStats = { responses: [], finalJeopardy: [] }; // Track stats: { category, value, responseTimeSeconds, outcome, playerIndex }
let currentResponseTime = 0; // Time from question open to reveal (captured when Reveal Answer clicked)
let questionOpenedAt = null; // Timestamp when clue modal opened (for live response-time stats)
let statisticsModalOpen = false;
let statisticsRefreshTimer = null;
let statisticsModalSetupDone = false;
let twoRoundsMode = false; // When true, game has Round 2 after first Final Jeopardy
let round2Data = null; // Store Round 2 categories/questions (separate from Round 1)
let currentRound = 1; // 1 = Round 1, 2 = Round 2 (double points)
let round1FinalScores = [0, 0, 0]; // Store Round 1 scores when transitioning to Round 2 (length matches players)

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
const DEFAULT_BUZZER_ANSWER_DURATION = 10;
const FINAL_JEOPARDY_WAGER_TIMER_DURATION = 30;
const NARROW_BOARD_MAX_WIDTH = 1000;
const DEFAULT_BUZZER_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8'];
let buzzerAnswerDuration = DEFAULT_BUZZER_ANSWER_DURATION;
let playerSelectorDelegated = false;
let finalJeopardyAnswerDelegated = false;
let buzzerEnabled = true;
let buzzerContinueAfterAnswer = true;
let playerBuzzerKeys = ['1', '2', '3'];
let buzzerLocked = false;
let buzzerAnswerExpired = false;
let buzzerTimerInterval = null;
let buzzerTimeRemaining = 0;
let buzzInResponseTime = 0;
let mainTimeRemainingAtBuzz = 0;
let lastBuzzedPlayerIndex = -1;
let buzzedOutPlayers = [];
let buzzerKeyCaptureSlot = null;
let buzzerKeydownSetup = false;
let buzzerContinueBtnSetup = false;
let finalJeopardyWagerTimerInterval = null;
let finalJeopardyWagerTimeRemaining = 0;
let finalJeopardySetupDone = false;
let round2ModalSetupDone = false;
let boardLayoutMode = null;
let boardResizeHandlerSetup = false;
let boardResizeTimer = null;

// ============================================
// GAME QUESTIONS DATA
// ============================================
// Loaded from default-two-rounds-data.js (jeopardy_import_full_example_two_rounds)

// Wait for the page to fully load before running our code
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Initialize the game data (but don't create board yet)
        loadGameData();
        
        // Hide the game container initially
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.display = 'none';
        }
        
        // Set up the start screen
        setupStartScreen();
        
        setupMusicVolumeControls();
        
        // Set up help button (always visible)
        setupHelpButton();
    } catch (e) {
        try {
            console.error('Init failed:', e);
            const msg = (e && e.message) ? e.message : String(e);
            document.body.insertAdjacentHTML(
                'afterbegin',
                '<div style="background:#b00020;color:#fff;padding:10px;font-family:Arial, sans-serif;position:sticky;top:0;z-index:99999">' +
                '<strong>Startup error:</strong> ' + msg + ' (check Console for details)' +
                '</div>'
            );
        } catch (_) { /* ignore */ }
    }
});

// ============================================
// LOAD GAME DATA
// ============================================
function resetToDefaultGameData() {
    originalQuestionsData = JSON.parse(JSON.stringify(twoRoundsTemplateData.round1));
    applyTwoRoundsTemplate(false);
}

function loadGameData() {
    resetToDefaultGameData();
}

// ============================================
// FINAL JEOPARDY DATA (editor, separate from board)
// ============================================
function createEmptyFinalJeopardy() {
    return {
        category: 'Final Jeopardy',
        categoryVi: '',
        clue: '',
        answer: '',
        explanation: '',
        clueVi: '',
        answerVi: '',
        explanationVi: ''
    };
}

function ensureFinalJeopardyOnData(data) {
    if (!data) return;
    if (!data.finalJeopardy || typeof data.finalJeopardy !== 'object') {
        data.finalJeopardy = createEmptyFinalJeopardy();
    }
    const fj = data.finalJeopardy;
    if (!fj.category) fj.category = 'Final Jeopardy';
    if (!fj.hasOwnProperty('categoryVi')) fj.categoryVi = '';
    if (!fj.hasOwnProperty('clue')) fj.clue = '';
    if (!fj.hasOwnProperty('answer')) fj.answer = '';
    if (!fj.hasOwnProperty('explanation')) fj.explanation = '';
    if (!fj.hasOwnProperty('clueVi')) fj.clueVi = '';
    if (!fj.hasOwnProperty('answerVi')) fj.answerVi = '';
    if (!fj.hasOwnProperty('explanationVi')) fj.explanationVi = '';
}

function isFinalJeopardyConfigured(fj) {
    return !!(fj && String(fj.clue || '').trim() && String(fj.answer || '').trim());
}

function getGameDataForRound(roundNum) {
    if (roundNum === 2 && round2Data) return round2Data;
    return gameData;
}

function resolveFinalJeopardyQuestionFromBoard(data) {
    let highestValue = 0;
    let finalQuestion = null;
    let finalCategory = null;
    if (!data || !data.categories) return null;
    data.categories.forEach(function(category) {
        category.questions.forEach(function(question) {
            if (question.value > highestValue) {
                highestValue = question.value;
                finalQuestion = question;
                finalCategory = category;
            }
        });
    });
    if (!finalQuestion || !finalCategory) return null;
    return { category: finalCategory, question: finalQuestion };
}

// ============================================
// APPLY TWO ROUNDS TEMPLATE / DEFAULT QUESTIONS
// ============================================
function applyTwoRoundsTemplate(preserveRound1) {
    if (!preserveRound1) {
        gameData = JSON.parse(JSON.stringify(twoRoundsTemplateData.round1));
        questionsData.categories = gameData.categories;
    }
    round2Data = JSON.parse(JSON.stringify(twoRoundsTemplateData.round2));
    gameData.categories.forEach(category => {
        if (category.questions && Array.isArray(category.questions)) {
            category.questions.forEach(question => {
                if (!question.hasOwnProperty('explanation')) question.explanation = '';
                ensureBilingualQuestionFields(question);
            });
        }
    });
    round2Data.categories.forEach(category => {
        if (category.questions && Array.isArray(category.questions)) {
            category.questions.forEach(question => {
                if (!question.hasOwnProperty('explanation')) question.explanation = '';
                ensureBilingualQuestionFields(question);
            });
        }
    });
    normalizeGameDataBilingual(gameData);
    normalizeGameDataBilingual(round2Data);
    ensureFinalJeopardyOnData(gameData);
    ensureFinalJeopardyOnData(round2Data);
    buildQuestionEditor();
}

function hasRound2BoardData() {
    return !!(round2Data && round2Data.categories && round2Data.categories.length > 0);
}

function ensureRound2DataLoaded() {
    if (!twoRoundsMode) return false;
    if (!hasRound2BoardData()) {
        round2Data = JSON.parse(JSON.stringify(twoRoundsTemplateData.round2));
        ensureFinalJeopardyOnData(round2Data);
        normalizeGameDataBilingual(round2Data);
    }
    return hasRound2BoardData();
}

function shouldStartRound2AfterRound1Final() {
    return twoRoundsMode && currentRound === 1 && ensureRound2DataLoaded();
}

function applyDefaultQuestions() {
    const dataToUse = originalQuestionsData || questionsData;
    gameData = JSON.parse(JSON.stringify(dataToUse));
    round2Data = null;
    questionsData.categories = gameData.categories;
    gameData.categories.forEach(category => {
        if (category.questions && Array.isArray(category.questions)) {
            category.questions.forEach(question => {
                if (!question.hasOwnProperty('explanation')) question.explanation = '';
                ensureBilingualQuestionFields(question);
            });
        }
    });
    ensureFinalJeopardyOnData(gameData);
    normalizeGameDataBilingual(gameData);
    buildQuestionEditor();
}

// ============================================
// SET UP HELP BUTTON (Features & Instructions)
// ============================================
function setupHelpButton() {
    const helpModal = document.getElementById('help-modal');
    const helpCloseBtn = document.getElementById('help-close-btn');
    
    document.querySelectorAll('.js-help-open').forEach(function(helpBtn) {
        if (helpModal) {
            helpBtn.addEventListener('click', function() {
                helpModal.classList.add('show');
            });
        }
    });
    
    if (helpCloseBtn && helpModal) {
        helpCloseBtn.addEventListener('click', function() {
            helpModal.classList.remove('show');
        });
    }
    
    if (helpModal) {
        helpModal.addEventListener('click', function(e) {
            if (e.target === helpModal) {
                helpModal.classList.remove('show');
            }
        });
    }
    
    // Help modal: fetch → blob → synthetic <a download> (works when page is served over http(s)).
    // Must call preventDefault() synchronously: async handlers run after the browser has already followed the link.
    const helpDownloadHint = document.getElementById('help-download-hint');
    let helpDownloadHintTimer = null;
    document.querySelectorAll('.help-download-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
            const href = link.getAttribute('href');
            const filename = link.getAttribute('download') || (href && href.split('/').pop()) || 'download';
            if (!href || href.startsWith('http://') || href.startsWith('https://')) {
                return;
            }
            e.preventDefault();
            if (helpDownloadHint) {
                helpDownloadHint.hidden = true;
                helpDownloadHint.textContent = '';
            }
            if (helpDownloadHintTimer) {
                clearTimeout(helpDownloadHintTimer);
                helpDownloadHintTimer = null;
            }
            (async function() {
                try {
                    const response = await fetch(href);
                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status);
                    }
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.rel = 'noopener';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                } catch (err) {
                    if (helpDownloadHint) {
                        helpDownloadHint.textContent =
                            'This browser can’t auto-download when the game is opened as a file (double-clicked). Right-click a link above → “Save link as…”, or run the folder with a local web server (see note at the bottom of script.js).';
                        helpDownloadHint.hidden = false;
                        helpDownloadHintTimer = setTimeout(function() {
                            helpDownloadHint.hidden = true;
                        }, 14000);
                    }
                }
            })();
        });
    });
}

// ============================================
// PLAYERS & MULTIPLIERS (pregame / header / settings)
// ============================================
function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function escapeAttr(text) {
    return escapeHtml(text).replace(/"/g, '&quot;');
}

function findCsvColumnIndex(headers, candidates) {
    const normalized = headers.map(function(h) {
        return h.trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
    });
    for (let c = 0; c < candidates.length; c++) {
        const cand = String(candidates[c]).toLowerCase().replace(/\s+/g, '').replace(/_/g, '').replace(/[()]/g, '');
        const idx = normalized.findIndex(function(h) {
            return h === cand;
        });
        if (idx >= 0) {
            return idx;
        }
    }
    return -1;
}

function ensureCategoryBilingualFields(category) {
    if (!category || typeof category !== 'object') {
        return;
    }
    if (!category.hasOwnProperty('nameVi')) {
        category.nameVi = '';
    }
}

function ensureBilingualQuestionFields(question) {
    if (!question || typeof question !== 'object') {
        return;
    }
    if (!question.hasOwnProperty('clueVi')) {
        question.clueVi = '';
    }
    if (!question.hasOwnProperty('answerVi')) {
        question.answerVi = '';
    }
    if (!question.hasOwnProperty('explanationVi')) {
        question.explanationVi = '';
    }
}

function normalizeGameDataBilingual(data) {
    if (!data || !data.categories || !Array.isArray(data.categories)) {
        return;
    }
    data.categories.forEach(function(category) {
        ensureCategoryBilingualFields(category);
        if (category.questions && Array.isArray(category.questions)) {
            category.questions.forEach(ensureBilingualQuestionFields);
        }
    });
}

function setCategoryBilingualHtml(el, en, vi) {
    if (!el) {
        return;
    }
    const enS = en == null ? '' : String(en).trim();
    const viS = vi == null ? '' : String(vi).trim();
    if (viS) {
        el.innerHTML = '<span class="bilingual-line bilingual-en category-name-en">' + escapeHtml(enS) + '</span>' +
            '<span class="bilingual-line bilingual-vi category-name-vi">' + escapeHtml(viS) + '</span>';
    } else {
        el.textContent = enS;
    }
}

function setElementBilingualHtml(el, en, vi) {
    if (!el) {
        return;
    }
    const enS = en == null ? '' : String(en).trim();
    const viS = vi == null ? '' : String(vi).trim();
    if (viS) {
        el.innerHTML = '<span class="bilingual-line bilingual-en">' + escapeHtml(enS) + '</span>' +
            '<span class="bilingual-line bilingual-vi">' + escapeHtml(viS) + '</span>';
    } else {
        el.textContent = enS;
    }
}

function setExplanationBlockHtml(el, en, vi) {
    if (!el) {
        return;
    }
    const enS = (en || '').trim();
    const viS = (vi || '').trim();
    if (!enS && !viS) {
        el.style.display = 'none';
        el.innerHTML = '';
        return;
    }
    el.style.display = 'block';
    let inner = '<p><strong>Explanation:</strong></p>';
    if (viS) {
        inner += '<p class="bilingual-line bilingual-en">' + escapeHtml(enS) + '</p>';
        inner += '<p class="bilingual-line bilingual-vi">' + escapeHtml(viS) + '</p>';
    } else {
        inner += '<p>' + escapeHtml(enS) + '</p>';
    }
    el.innerHTML = inner;
}

function getPlayerCount() {
    return playerNames.length;
}

function isBuzzerEnabledOnSetup() {
    const el = document.getElementById('buzzer-enabled');
    return el ? el.checked : buzzerEnabled;
}

function formatBuzzerKeyLabel(key) {
    if (!key) return '—';
    if (key === ' ') return 'Space';
    if (key.length === 1) return key.toUpperCase();
    return key;
}

function getDefaultBuzzerKeyForSlot(slot) {
    return DEFAULT_BUZZER_KEYS[(slot - 1) % DEFAULT_BUZZER_KEYS.length];
}

function buildPregameBuzzerKeyRow(slot, keyValue) {
    const key = keyValue || getDefaultBuzzerKeyForSlot(slot);
    return (
        '<div class="player-buzzer-key-row buzzer-key-row" data-buzzer-row="' + slot + '">' +
        '<label>Buzzer key:</label>' +
        '<span class="buzzer-key-display" id="buzzer-key-display-' + slot + '" data-buzzer-key="' + escapeAttr(key) + '">' + escapeHtml(formatBuzzerKeyLabel(key)) + '</span>' +
        '<button type="button" class="btn editor-toggle buzzer-key-set-btn" data-buzzer-slot="' + slot + '">Set key</button>' +
        '</div>'
    );
}

function renderPregamePlayerRows(names, keys) {
    const list = document.getElementById('pregame-players-list');
    if (!list) return;
    const useNames = names && names.length >= MIN_PLAYERS ? names.slice() : ['Player 1', 'Player 2', 'Player 3'];
    const useKeys = keys && keys.length >= useNames.length
        ? keys.slice(0, useNames.length)
        : useNames.map(function(_, idx) { return getDefaultBuzzerKeyForSlot(idx + 1); });
    const showBuzzer = isBuzzerEnabledOnSetup();
    list.innerHTML = '';
    useNames.forEach(function(name, idx) {
        const slot = idx + 1;
        const row = document.createElement('div');
        row.className = 'player-setup-item';
        let html =
            '<div class="player-input-group">' +
            '<label for="pregame-player-name-' + slot + '">Player ' + slot + ' Name:</label>' +
            '<input type="text" id="pregame-player-name-' + slot + '" class="pregame-player-name" data-player-slot="' + slot + '" placeholder="Enter name" value="' + escapeAttr(name) + '">' +
            '</div>';
        if (showBuzzer) {
            html += buildPregameBuzzerKeyRow(slot, useKeys[idx]);
        }
        row.innerHTML = html;
        list.appendChild(row);
    });
    updateAddPregamePlayerButtonState();
}

function readPregameBuzzerKeys() {
    const list = document.getElementById('pregame-players-list');
    if (!list) return DEFAULT_BUZZER_KEYS.slice(0, MIN_PLAYERS);
    const names = readPregamePlayerNames();
    const keys = [];
    for (let i = 0; i < names.length; i++) {
        const slot = i + 1;
        const display = document.getElementById('buzzer-key-display-' + slot);
        const key = display ? (display.getAttribute('data-buzzer-key') || getDefaultBuzzerKeyForSlot(slot)) : getDefaultBuzzerKeyForSlot(slot);
        keys.push(normalizeBuzzerKey(key));
    }
    return keys;
}

function normalizeBuzzerKey(key) {
    if (!key) return '';
    if (key === ' ') return ' ';
    return key.length === 1 ? key.toLowerCase() : key;
}

function findBuzzerPlayerIndexForKey(key) {
    const normalized = normalizeBuzzerKey(key);
    for (let i = 0; i < playerBuzzerKeys.length; i++) {
        if (normalizeBuzzerKey(playerBuzzerKeys[i]) === normalized) {
            return i;
        }
    }
    return -1;
}

function readPregamePlayerNames() {
    const list = document.getElementById('pregame-players-list');
    if (!list) return ['Player 1', 'Player 2', 'Player 3'];
    const inputs = list.querySelectorAll('.pregame-player-name');
    const names = [];
    inputs.forEach(function(inp, idx) {
        const v = inp.value.trim();
        names.push(v || ('Player ' + (idx + 1)));
    });
    return names;
}

function updateAddPregamePlayerButtonState() {
    const list = document.getElementById('pregame-players-list');
    const btn = document.getElementById('add-pregame-player-btn');
    if (!list || !btn) return;
    btn.disabled = list.querySelectorAll('.pregame-player-name').length >= MAX_PLAYERS;
}

function addPregamePlayerRow() {
    const list = document.getElementById('pregame-players-list');
    if (!list || list.querySelectorAll('.pregame-player-name').length >= MAX_PLAYERS) return;
    const next = list.querySelectorAll('.pregame-player-name').length + 1;
    const row = document.createElement('div');
    row.className = 'player-setup-item';
    let html =
        '<div class="player-input-group">' +
        '<label for="pregame-player-name-' + next + '">Player ' + next + ' Name:</label>' +
        '<input type="text" id="pregame-player-name-' + next + '" class="pregame-player-name" data-player-slot="' + next + '" placeholder="Enter name" value="Player ' + next + '">' +
        '</div>';
    if (isBuzzerEnabledOnSetup()) {
        html += buildPregameBuzzerKeyRow(next, getDefaultBuzzerKeyForSlot(next));
    }
    row.innerHTML = html;
    list.appendChild(row);
    updateAddPregamePlayerButtonState();
}

function rebuildScoreboardAndSelector() {
    const n = getPlayerCount();
    const board = document.getElementById('score-board');
    const bar = document.getElementById('player-selector-bar');
    if (!board || !bar) return;
    let scoreHtml = '';
    let selHtml = '';
    for (let i = 1; i <= n; i++) {
        scoreHtml +=
            '<div class="player-score" id="player-' + i + '-score">' +
            '<div class="player-label">Player ' + i + '</div>' +
            '<div class="score-value" id="score-' + i + '">0</div></div>';
        selHtml += '<button type="button" class="player-btn" data-player="' + i + '">Player ' + i + '</button>';
    }
    board.innerHTML = scoreHtml;
    bar.innerHTML = selHtml;
}

function renderSettingsPlayersContainer() {
    const container = document.getElementById('settings-players-container');
    if (!container) return;
    const n = getPlayerCount();
    let html = '<div class="score-adjustments">';
    for (let i = 0; i < n; i++) {
        const num = i + 1;
        html +=
            '<div class="score-adjust-item">' +
            '<label for="settings-score-' + num + '">Player ' + num + ' Score:</label>' +
            '<input type="number" id="settings-score-' + num + '" class="score-input settings-player-score" data-player-index="' + i + '" value="' + (playerScores[i] || 0) + '">' +
            '</div>';
    }
    html += '</div><div class="name-changes" style="margin-top: 15px;">';
    for (let i = 0; i < n; i++) {
        const num = i + 1;
        html +=
            '<div class="name-change-item">' +
            '<label for="settings-name-' + num + '">Player ' + num + ':</label>' +
            '<input type="text" id="settings-name-' + num + '" class="name-input settings-player-name" data-player-index="' + i + '" placeholder="Enter name" value="' + escapeAttr(playerNames[i] || ('Player ' + num)) + '">' +
            '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
}

function buildFinalJeopardyWagersMarkup() {
    const n = getPlayerCount();
    let html = '';
    for (let i = 0; i < n; i++) {
        const num = i + 1;
        html +=
            '<div class="final-jeopardy-wager-item">' +
            '<label for="final-wager-' + num + '" id="final-wager-label-' + num + '">Player ' + num + ' (<span id="final-score-' + num + '">0</span>):</label>' +
            '<input type="number" id="final-wager-' + num + '" min="0" value="0" step="100" class="final-wager-input">' +
            '</div>';
    }
    return html;
}

function buildFinalJeopardyResultsMarkup() {
    const n = getPlayerCount();
    let html = '';
    for (let i = 0; i < n; i++) {
        const num = i + 1;
        html +=
            '<div class="final-result-item">' +
            '<span id="final-result-name-' + num + '"></span>' +
            '<span id="final-result-score-' + num + '"></span>' +
            '<div class="final-answer-buttons">' +
            '<button type="button" class="btn score-btn correct final-answer-btn" data-player="' + num + '" data-correct="true">Correct</button>' +
            '<button type="button" class="btn score-btn incorrect final-answer-btn" data-player="' + num + '" data-correct="false">Incorrect</button>' +
            '</div></div>';
    }
    return html;
}

// ============================================
// SET UP START SCREEN
// ============================================
function setupStartScreen() {
    renderPregamePlayerRows(null);
    setupBuzzerPregameControls();
    
    const addPlayerBtn = document.getElementById('add-pregame-player-btn');
    if (addPlayerBtn) {
        addPlayerBtn.addEventListener('click', function() {
            addPregamePlayerRow();
        });
    }
    
    // Get the start game button
    const startBtn = document.getElementById('start-game-btn');
    
    // When start button is clicked
    startBtn.addEventListener('click', function() {
        const names = readPregamePlayerNames();
        if (names.length < MIN_PLAYERS) {
            alert('Need at least ' + MIN_PLAYERS + ' players.');
            return;
        }
        
        playerNames = names;
        playerScores = new Array(playerNames.length).fill(0);
        finalJeopardyWagers = new Array(playerNames.length).fill(0);
        round1FinalScores = new Array(playerNames.length).fill(0);
        currentPlayer = 1;
        
        rebuildScoreboardAndSelector();
        
        // Get timer duration
        const timerInput = document.getElementById('timer-duration');
        timerDuration = parseInt(timerInput.value) || 30;
        if (timerDuration < 5) timerDuration = 5;
        if (timerDuration > 120) timerDuration = 120;
        
        const finalTimerInput = document.getElementById('final-timer-duration');
        finalJeopardyTimerDuration = parseInt(finalTimerInput ? finalTimerInput.value : '', 10) || 30;
        if (finalJeopardyTimerDuration < 5) finalJeopardyTimerDuration = 5;
        if (finalJeopardyTimerDuration > 300) finalJeopardyTimerDuration = 300;
        
        // Get daily double count
        const dailyDoubleInput = document.getElementById('daily-double-count');
        dailyDoubleCount = parseInt(dailyDoubleInput.value) || 0;
        if (dailyDoubleCount < 0) dailyDoubleCount = 0;
        if (dailyDoubleCount > 10) dailyDoubleCount = 10;
        
        // Get hide daily doubles setting
        const hideDailyDoublesInput = document.getElementById('hide-daily-doubles');
        hideDailyDoubles = hideDailyDoublesInput.checked;
        
        // Get two rounds mode
        const twoRoundsInput = document.getElementById('two-rounds-mode');
        twoRoundsMode = twoRoundsInput ? twoRoundsInput.checked : false;
        
        const buzzerEnabledInput = document.getElementById('buzzer-enabled');
        buzzerEnabled = buzzerEnabledInput ? buzzerEnabledInput.checked : true;
        const buzzerContinueInput = document.getElementById('buzzer-continue-timer');
        buzzerContinueAfterAnswer = buzzerContinueInput ? buzzerContinueInput.checked : true;
        
        const buzzerAnswerInput = document.getElementById('buzzer-answer-duration');
        buzzerAnswerDuration = clampBuzzerAnswerDuration(parseInt(buzzerAnswerInput ? buzzerAnswerInput.value : '', 10));
        
        if (buzzerEnabled) {
            playerBuzzerKeys = readPregameBuzzerKeys();
            const seen = {};
            for (let i = 0; i < playerBuzzerKeys.length; i++) {
                const k = playerBuzzerKeys[i];
                if (!k) {
                    alert('Player ' + (i + 1) + ' needs a buzzer key.');
                    return;
                }
                if (seen[k]) {
                    alert('Each team needs a unique buzzer key. "' + formatBuzzerKeyLabel(k) + '" is used more than once.');
                    return;
                }
                seen[k] = true;
            }
        } else {
            playerBuzzerKeys = [];
        }
        
        // If two rounds is enabled but we don't have Round 2 board data, load Round 2 from template
        if (twoRoundsMode) {
            ensureRound2DataLoaded();
        }
        
        const startScreen = document.getElementById('start-screen');
        const gameContainer = document.getElementById('game-container');
        
        startScreen.classList.add('is-exiting');
        setTimeout(function() {
            startScreen.classList.remove('show', 'is-exiting');
            if (gameContainer) {
                gameContainer.style.display = 'block';
                gameContainer.classList.add('is-entering');
                requestAnimationFrame(function() {
                    gameContainer.classList.remove('is-entering');
                });
            }
            gameStarted = true;
            document.body.classList.add('game-active');
            initializeGame();
        }, 260);
    });
    
    // When Two Rounds is enabled, automatically load the two-rounds template
    const twoRoundsInput = document.getElementById('two-rounds-mode');
    if (twoRoundsInput) {
        twoRoundsInput.addEventListener('change', function() {
            if (this.checked) {
                applyTwoRoundsTemplate(false);
            } else {
                applyDefaultQuestions();
            }
            buildFinalJeopardyEditor();
        });
    }
    
    // Set up editor toggle button
    const toggleEditorBtn = document.getElementById('toggle-editor-btn');
    toggleEditorBtn.addEventListener('click', function() {
        const editor = document.getElementById('question-editor');
        editor.classList.toggle('hidden');
        toggleEditorBtn.textContent = editor.classList.contains('hidden') ? 'Show Editor' : 'Hide Editor';
    });
    
    // Set up file import functionality
    setupFileImport();
    
    // Set up AI question generation
    setupAIGeneration();
}

// ============================================
// BUILD QUESTION EDITOR
// ============================================
function buildQuestionEditor() {
    const editorContainer = document.getElementById('editor-categories');
    editorContainer.innerHTML = ''; // Clear any existing content
    
    // Loop through each category
    gameData.categories.forEach((category, catIndex) => {
        // Create category section
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'editor-category';
        
        // Category name editor
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'editor-category-header';
        const categoryNameInput = document.createElement('input');
        categoryNameInput.type = 'text';
        categoryNameInput.className = 'editor-category-name';
        categoryNameInput.value = category.name;
        categoryNameInput.placeholder = 'Category Name';
        categoryNameInput.addEventListener('input', function() {
            gameData.categories[catIndex].name = this.value;
        });
        const categoryNameViLabel = document.createElement('label');
        categoryNameViLabel.textContent = 'Category (Vietnamese, optional):';
        const categoryNameViInput = document.createElement('input');
        categoryNameViInput.type = 'text';
        categoryNameViInput.className = 'editor-category-name-vi';
        categoryNameViInput.value = category.nameVi || '';
        categoryNameViInput.placeholder = 'Shown in yellow below English on the board';
        categoryNameViInput.addEventListener('input', function() {
            gameData.categories[catIndex].nameVi = this.value;
        });
        categoryHeader.appendChild(categoryNameInput);
        categoryHeader.appendChild(categoryNameViLabel);
        categoryHeader.appendChild(categoryNameViInput);
        categoryDiv.appendChild(categoryHeader);
        
        // Questions container
        const questionsDiv = document.createElement('div');
        questionsDiv.className = 'editor-questions';
        
        // Loop through questions in this category
        category.questions.forEach((question, qIndex) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'editor-question-item';
            
            // Value input
            const valueLabel = document.createElement('label');
            valueLabel.textContent = 'Value: $';
            const valueInput = document.createElement('input');
            valueInput.type = 'number';
            valueInput.className = 'editor-value';
            valueInput.value = question.value;
            valueInput.min = 100;
            valueInput.step = 100;
            valueInput.addEventListener('input', function() {
                gameData.categories[catIndex].questions[qIndex].value = parseInt(this.value) || 100;
            });
            
            // Clue input
            const clueLabel = document.createElement('label');
            clueLabel.textContent = 'Clue:';
            const clueInput = document.createElement('textarea');
            clueInput.className = 'editor-clue';
            clueInput.value = question.clue;
            clueInput.rows = 2;
            clueInput.addEventListener('input', function() {
                gameData.categories[catIndex].questions[qIndex].clue = this.value;
            });
            
            const clueViLabel = document.createElement('label');
            clueViLabel.textContent = 'Clue (Vietnamese, optional):';
            const clueViInput = document.createElement('textarea');
            clueViInput.className = 'editor-clue-vi';
            clueViInput.value = question.clueVi || '';
            clueViInput.rows = 2;
            clueViInput.placeholder = 'Optional Vietnamese clue — shown below English during play';
            clueViInput.addEventListener('input', function() {
                gameData.categories[catIndex].questions[qIndex].clueVi = this.value;
            });
            
            // Answer input
            const answerLabel = document.createElement('label');
            answerLabel.textContent = 'Answer:';
            const answerInput = document.createElement('textarea');
            answerInput.className = 'editor-answer';
            answerInput.value = question.answer;
            answerInput.rows = 2;
            answerInput.addEventListener('input', function() {
                gameData.categories[catIndex].questions[qIndex].answer = this.value;
            });
            
            const answerViLabel = document.createElement('label');
            answerViLabel.textContent = 'Answer (Vietnamese, optional):';
            const answerViInput = document.createElement('textarea');
            answerViInput.className = 'editor-answer-vi';
            answerViInput.value = question.answerVi || '';
            answerViInput.rows = 2;
            answerViInput.placeholder = 'Optional Vietnamese answer';
            answerViInput.addEventListener('input', function() {
                gameData.categories[catIndex].questions[qIndex].answerVi = this.value;
            });
            
            // Explanation input
            const explanationLabel = document.createElement('label');
            explanationLabel.textContent = 'Explanation (Optional):';
            const explanationInput = document.createElement('textarea');
            explanationInput.className = 'editor-explanation';
            explanationInput.value = question.explanation || '';
            explanationInput.rows = 2;
            explanationInput.placeholder = 'Optional explanation about the answer...';
            explanationInput.addEventListener('input', function() {
                if (!gameData.categories[catIndex].questions[qIndex].explanation) {
                    gameData.categories[catIndex].questions[qIndex].explanation = '';
                }
                gameData.categories[catIndex].questions[qIndex].explanation = this.value;
            });
            
            const explanationViLabel = document.createElement('label');
            explanationViLabel.textContent = 'Explanation / hint (Vietnamese, optional):';
            const explanationViInput = document.createElement('textarea');
            explanationViInput.className = 'editor-explanation-vi';
            explanationViInput.value = question.explanationVi || '';
            explanationViInput.rows = 2;
            explanationViInput.placeholder = 'Optional Vietnamese explanation';
            explanationViInput.addEventListener('input', function() {
                if (!gameData.categories[catIndex].questions[qIndex].explanationVi) {
                    gameData.categories[catIndex].questions[qIndex].explanationVi = '';
                }
                gameData.categories[catIndex].questions[qIndex].explanationVi = this.value;
            });
            
            // Assemble question editor
            questionDiv.appendChild(valueLabel);
            questionDiv.appendChild(valueInput);
            questionDiv.appendChild(clueLabel);
            questionDiv.appendChild(clueInput);
            questionDiv.appendChild(clueViLabel);
            questionDiv.appendChild(clueViInput);
            questionDiv.appendChild(answerLabel);
            questionDiv.appendChild(answerInput);
            questionDiv.appendChild(answerViLabel);
            questionDiv.appendChild(answerViInput);
            questionDiv.appendChild(explanationLabel);
            questionDiv.appendChild(explanationInput);
            questionDiv.appendChild(explanationViLabel);
            questionDiv.appendChild(explanationViInput);
            
            questionsDiv.appendChild(questionDiv);
        });
        
        categoryDiv.appendChild(questionsDiv);
        editorContainer.appendChild(categoryDiv);
    });
    
    buildFinalJeopardyEditor();
}

function buildFinalJeopardyEditor() {
    const host = document.getElementById('editor-final-jeopardy');
    if (!host) return;
    
    ensureFinalJeopardyOnData(gameData);
    if (round2Data) ensureFinalJeopardyOnData(round2Data);
    
    const twoRoundsOn = document.getElementById('two-rounds-mode') && document.getElementById('two-rounds-mode').checked;
    
    host.innerHTML =
        '<div class="editor-final-jeopardy-intro">' +
        '<h3 class="editor-fj-title">Final Jeopardy</h3>' +
        '<p class="editor-fj-hint">Set the Final Jeopardy clue here — separate from the game board. ' +
        'If clue and answer are left empty, the game uses the highest-value question on the board instead.</p>' +
        '</div>';
    
    host.appendChild(createFinalJeopardyEditorBlock('Round 1', gameData, 'fj-r1'));
    
    if (twoRoundsOn && round2Data) {
        host.appendChild(createFinalJeopardyEditorBlock('Round 2', round2Data, 'fj-r2'));
    }
}

function createFinalJeopardyEditorBlock(roundLabel, dataObject, idPrefix) {
    ensureFinalJeopardyOnData(dataObject);
    const fj = dataObject.finalJeopardy;
    
    const block = document.createElement('div');
    block.className = 'editor-final-jeopardy-block';
    
    const header = document.createElement('h4');
    header.className = 'editor-fj-round-title';
    header.textContent = roundLabel;
    block.appendChild(header);
    
    const grid = document.createElement('div');
    grid.className = 'editor-fj-fields';
    
    function addField(labelText, tag, className, value, key, rows) {
        const wrap = document.createElement('div');
        wrap.className = 'editor-fj-field';
        const label = document.createElement('label');
        label.setAttribute('for', idPrefix + '-' + key);
        label.textContent = labelText;
        const el = document.createElement(tag);
        el.id = idPrefix + '-' + key;
        el.className = className;
        if (tag === 'textarea') {
            el.rows = rows || 2;
            el.value = value;
        } else {
            el.type = 'text';
            el.value = value;
        }
        el.addEventListener('input', function() {
            dataObject.finalJeopardy[key] = this.value;
        });
        wrap.appendChild(label);
        wrap.appendChild(el);
        grid.appendChild(wrap);
    }
    
    addField('Category name:', 'input', 'editor-fj-category editor-category-name', fj.category, 'category', 1);
    addField('Category (Vietnamese, optional):', 'input', 'editor-fj-category-vi editor-category-name-vi', fj.categoryVi || '', 'categoryVi', 1);
    addField('Clue:', 'textarea', 'editor-fj-clue editor-clue', fj.clue, 'clue', 3);
    addField('Clue (Vietnamese, optional):', 'textarea', 'editor-fj-clue-vi editor-clue-vi', fj.clueVi || '', 'clueVi', 2);
    addField('Answer:', 'textarea', 'editor-fj-answer editor-answer', fj.answer, 'answer', 2);
    addField('Answer (Vietnamese, optional):', 'textarea', 'editor-fj-answer-vi editor-answer-vi', fj.answerVi || '', 'answerVi', 2);
    addField('Explanation (optional):', 'textarea', 'editor-fj-explanation editor-explanation', fj.explanation || '', 'explanation', 2);
    addField('Explanation (Vietnamese, optional):', 'textarea', 'editor-fj-explanation-vi editor-explanation-vi', fj.explanationVi || '', 'explanationVi', 2);
    
    block.appendChild(grid);
    return block;
}

// ============================================
// INITIALIZE GAME
// ============================================
function initializeGame() {
    gameStats = { responses: [], finalJeopardy: [] };
    statisticsModalOpen = false;
    if (statisticsRefreshTimer) {
        clearInterval(statisticsRefreshTimer);
        statisticsRefreshTimer = null;
    }
    // Create the game board
    createGameBoard();
    
    // Set up event listeners for score buttons
    setupScoreButtons();
    setupStatisticsModal();
    
    // Set up event listeners for modal buttons
    setupModalButtons();
    
    // Set up player selection buttons
    setupPlayerSelector();
    
    // Set up settings button
    setupSettings();
    
    // Set up daily double modal
    setupDailyDoubleModal();
    
    // Set up Final Jeopardy
    setupFinalJeopardy();
    
    // Set up skip to Final Jeopardy button
    setupSkipToFinalJeopardy();
    
    // Set up Round 2 modal
    setupRound2Modal();
    
    // Set up Final Scores modal (two rounds summary)
    setupFinalScoresModal();
    
    setupBuzzerInGame();
    
    setupGameBoardResizeHandler();
    
    // Initialize the display
    updateAllScores();
    updateCurrentPlayerDisplay();
    updatePlayerNames();
}

// ============================================
// ASSIGN DAILY DOUBLES
// ============================================
function assignDailyDoubles() {
    // Reset daily double array
    dailyDoubleQuestions = [];
    
    // Collect all questions with their category and index
    const allQuestions = [];
    gameData.categories.forEach((category, catIndex) => {
        category.questions.forEach((question, qIndex) => {
            allQuestions.push({
                category: category,
                catIndex: catIndex,
                question: question,
                qIndex: qIndex
            });
        });
    });
    
    // Shuffle the questions array for random selection
    for (let i = allQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
    }
    
    // Select random questions for daily doubles
    const dailyDoubleCountToAssign = Math.min(dailyDoubleCount, allQuestions.length);
    for (let i = 0; i < dailyDoubleCountToAssign; i++) {
        const selected = allQuestions[i];
        dailyDoubleQuestions.push({
            catIndex: selected.catIndex,
            qIndex: selected.qIndex
        });
    }
}

// ============================================
// GET EFFECTIVE QUESTION VALUE (doubled in Round 2)
// ============================================
function getQuestionValue(question) {
    return currentRound === 2 ? question.value * 2 : question.value;
}

// ============================================
// CHECK IF QUESTION IS DAILY DOUBLE
// ============================================
function isQuestionDailyDouble(category, questionIndex) {
    const catIndex = gameData.categories.indexOf(category);
    return dailyDoubleQuestions.some(dd => 
        dd.catIndex === catIndex && dd.qIndex === questionIndex
    );
}

function getBoardLayoutMode() {
    return window.matchMedia('(max-width: ' + NARROW_BOARD_MAX_WIDTH + 'px)').matches ? 'narrow' : 'wide';
}

function collectUsedTileKeys() {
    const keys = new Set();
    document.querySelectorAll('.question-tile.used').forEach(function(tile) {
        if (tile.dataset.tileId) {
            keys.add(tile.dataset.tileId);
        }
    });
    return keys;
}

function createQuestionTile(category, question, categoryIndex, questionIndex, options) {
    options = options || {};
    const compact = !!options.compact;
    const usedKeys = options.usedKeys || new Set();
    
    const tile = document.createElement('div');
    tile.className = 'question-tile' + (compact ? ' question-tile-narrow' : '');
    
    const isDailyDouble = isQuestionDailyDouble(category, questionIndex);
    
    if (isDailyDouble && !hideDailyDoubles) {
        tile.classList.add('daily-double');
        tile.classList.add('daily-double-visible');
        tile.textContent = 'DD';
    } else {
        tile.textContent = '$' + getQuestionValue(question);
    }
    
    tile.dataset.categoryIndex = categoryIndex;
    tile.dataset.questionIndex = questionIndex;
    tile.dataset.isDailyDouble = isDailyDouble ? 'true' : 'false';
    tile.dataset.tileId = 'cat-' + categoryIndex + '-q-' + questionIndex;
    
    tile._questionRef = question;
    tile._categoryRef = category;
    
    if (usedKeys.has(tile.dataset.tileId)) {
        tile.classList.add('used');
        tile.style.pointerEvents = 'none';
    } else {
        tile.setAttribute('tabindex', '0');
        tile.setAttribute('role', 'button');
        const valueLabel = (isDailyDouble && !hideDailyDoubles) ? 'Daily Double' : ('$' + getQuestionValue(question));
        tile.setAttribute('aria-label', category.name + ', ' + valueLabel);
    }
    
    function activateTile() {
        if (tile.classList.contains('used')) {
            return;
        }
        if (isDailyDouble) {
            openDailyDoubleModal(category, question, tile);
        } else {
            openQuestionModal(category, question, tile);
        }
    }
    
    tile.addEventListener('click', activateTile);
    tile.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            activateTile();
        }
    });
    
    return tile;
}

function createGameBoardWide(boardContainer, usedKeys) {
    const categoryRow = document.createElement('div');
    categoryRow.className = 'category-row';
    
    gameData.categories.forEach(function(category) {
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        setCategoryBilingualHtml(categoryHeader, category.name, category.nameVi);
        categoryRow.appendChild(categoryHeader);
    });
    
    boardContainer.appendChild(categoryRow);
    
    const maxQuestions = Math.max.apply(null, gameData.categories.map(function(cat) {
        return cat.questions.length;
    }));
    
    for (let i = 0; i < maxQuestions; i++) {
        const questionRow = document.createElement('div');
        questionRow.className = 'question-row';
        
        gameData.categories.forEach(function(category) {
            if (category.questions[i]) {
                const question = category.questions[i];
                const categoryIndex = gameData.categories.indexOf(category);
                questionRow.appendChild(createQuestionTile(category, question, categoryIndex, i, {
                    usedKeys: usedKeys
                }));
            } else {
                const emptyTile = document.createElement('div');
                emptyTile.className = 'question-tile is-placeholder';
                emptyTile.setAttribute('aria-hidden', 'true');
                questionRow.appendChild(emptyTile);
            }
        });
        
        boardContainer.appendChild(questionRow);
    }
}

function createGameBoardNarrow(boardContainer, usedKeys) {
    gameData.categories.forEach(function(category, categoryIndex) {
        const block = document.createElement('div');
        block.className = 'mobile-category-block';
        block.dataset.categoryIndex = String(categoryIndex);
        
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'mobile-category-toggle';
        toggleBtn.setAttribute('aria-expanded', 'false');
        
        const labelWrap = document.createElement('div');
        labelWrap.className = 'mobile-category-toggle-label';
        setCategoryBilingualHtml(labelWrap, category.name, category.nameVi);
        
        const chevron = document.createElement('span');
        chevron.className = 'mobile-category-chevron';
        chevron.setAttribute('aria-hidden', 'true');
        chevron.textContent = '\u25BC';
        
        toggleBtn.appendChild(labelWrap);
        toggleBtn.appendChild(chevron);
        
        const valuesPanel = document.createElement('div');
        valuesPanel.className = 'mobile-category-values';
        valuesPanel.id = 'mobile-category-values-' + categoryIndex;
        toggleBtn.setAttribute('aria-controls', valuesPanel.id);
        
        const valuesInner = document.createElement('div');
        valuesInner.className = 'mobile-category-values-inner';
        
        category.questions.forEach(function(question, questionIndex) {
            valuesInner.appendChild(createQuestionTile(category, question, categoryIndex, questionIndex, {
                compact: true,
                usedKeys: usedKeys
            }));
        });
        
        valuesPanel.appendChild(valuesInner);
        
        toggleBtn.addEventListener('click', function() {
            const isOpen = valuesPanel.classList.contains('is-open');
            boardContainer.querySelectorAll('.mobile-category-values.is-open').forEach(function(panel) {
                panel.classList.remove('is-open');
            });
            boardContainer.querySelectorAll('.mobile-category-toggle[aria-expanded="true"]').forEach(function(btn) {
                btn.setAttribute('aria-expanded', 'false');
            });
            boardContainer.querySelectorAll('.mobile-category-block.is-expanded').forEach(function(openBlock) {
                openBlock.classList.remove('is-expanded');
            });
            if (!isOpen) {
                valuesPanel.classList.add('is-open');
                toggleBtn.setAttribute('aria-expanded', 'true');
                block.classList.add('is-expanded');
            }
        });
        
        block.appendChild(toggleBtn);
        block.appendChild(valuesPanel);
        boardContainer.appendChild(block);
    });
}

function setupGameBoardResizeHandler() {
    if (boardResizeHandlerSetup) {
        return;
    }
    boardResizeHandlerSetup = true;
    window.addEventListener('resize', function() {
        if (!gameStarted) {
            return;
        }
        clearTimeout(boardResizeTimer);
        boardResizeTimer = setTimeout(function() {
            const mode = getBoardLayoutMode();
            if (mode !== boardLayoutMode) {
                const boardContainer = document.getElementById('game-board');
                if (boardContainer) {
                    boardContainer.classList.add('board-transitioning');
                }
                createGameBoard({ preserveDailyDoubles: true, preserveUsed: true });
                requestAnimationFrame(function() {
                    if (boardContainer) {
                        boardContainer.classList.remove('board-transitioning');
                    }
                });
            }
        }, 200);
    });
}

// ============================================
// CREATE THE GAME BOARD
// ============================================
function createGameBoard(options) {
    options = options || {};
    const boardContainer = document.getElementById('game-board');
    if (!boardContainer) {
        return;
    }
    
    const usedKeys = options.preserveUsed ? collectUsedTileKeys() : new Set();
    
    if (!options.preserveDailyDoubles || dailyDoubleQuestions.length === 0) {
        assignDailyDoubles();
    }
    
    boardContainer.innerHTML = '';
    
    if (!gameData || !gameData.categories || gameData.categories.length === 0) {
        boardContainer.innerHTML = '<p>No categories found in questions.json</p>';
        boardLayoutMode = null;
        return;
    }
    
    boardLayoutMode = getBoardLayoutMode();
    boardContainer.classList.remove('game-board-narrow', 'game-board-wide');
    boardContainer.classList.add(boardLayoutMode === 'narrow' ? 'game-board-narrow' : 'game-board-wide');
    boardContainer.style.setProperty('--board-columns', String(gameData.categories.length));
    
    if (boardLayoutMode === 'narrow') {
        createGameBoardNarrow(boardContainer, usedKeys);
    } else {
        createGameBoardWide(boardContainer, usedKeys);
    }
}

// ============================================
// OPEN DAILY DOUBLE MODAL
// ============================================
function openDailyDoubleModal(category, question, tile) {
    // Store references to the current question, category, and tile
    currentQuestion = question;
    currentQuestion.category = category; // Store category with question for later use
    currentTile = tile;
    currentWager = 0; // Reset wager
    
    // Get the daily double modal
    const dailyDoubleModal = document.getElementById('daily-double-modal');
    
    // Calculate maximum wager
    const currentScore = playerScores[currentPlayer - 1];
    const maxWager = currentScore < 500 ? 500 : currentScore;
    
    // Update the modal display
    document.getElementById('dd-current-score').textContent = currentScore;
    document.getElementById('dd-max-wager').textContent = maxWager;
    
    // Set wager input max and value
    const wagerInput = document.getElementById('daily-double-wager');
    wagerInput.max = maxWager;
    wagerInput.value = 0;
    wagerInput.min = 0;
    
    // Show the modal
    dailyDoubleModal.classList.add('show');
}

// ============================================
// SET UP DAILY DOUBLE MODAL
// ============================================
function setupDailyDoubleModal() {
    // Get the Next button
    const nextBtn = document.getElementById('dd-next-btn');
    
    // Add click event to Next button
    nextBtn.addEventListener('click', function() {
        // Get the wager amount
        const wagerInput = document.getElementById('daily-double-wager');
        const wager = parseInt(wagerInput.value) || 0;
        
        // Validate wager
        const currentScore = playerScores[currentPlayer - 1];
        const maxWager = currentScore < 500 ? 500 : currentScore;
        
        if (wager < 0) {
            currentWager = 0;
        } else if (wager > maxWager) {
            currentWager = maxWager;
        } else {
            currentWager = wager;
        }
        
        // Close daily double modal
        const dailyDoubleModal = document.getElementById('daily-double-modal');
        dailyDoubleModal.classList.remove('show');
        
        // Open the question modal with the wager stored
        // currentQuestion.category was stored in openDailyDoubleModal
        if (currentQuestion && currentQuestion.category) {
            openQuestionModal(currentQuestion.category, currentQuestion, currentTile);
        }
    });
    
    // Close modal when clicking outside
    const dailyDoubleModal = document.getElementById('daily-double-modal');
    dailyDoubleModal.addEventListener('click', function(event) {
        if (event.target === dailyDoubleModal) {
            dailyDoubleModal.classList.remove('show');
            // Reset wager if modal is closed
            currentWager = 0;
            currentQuestion = null;
            currentTile = null;
        }
    });
}

// ============================================
// OPEN QUESTION MODAL
// ============================================
function openQuestionModal(category, question, tile) {
    // Store references to the current question and tile
    currentQuestion = question;
    currentQuestion.category = category;
    currentTile = tile;
    
    // Get the modal element
    const modal = document.getElementById('question-modal');
    
    // Fill in the modal content
    setCategoryBilingualHtml(document.getElementById('modal-category'), category.name, category.nameVi);
    document.getElementById('modal-value').textContent = '$' + getQuestionValue(question);
    setElementBilingualHtml(document.getElementById('modal-clue'), question.clue, question.clueVi);
    setElementBilingualHtml(document.getElementById('modal-answer'), question.answer, question.answerVi);
    
    // Display explanation if it exists (English and/or Vietnamese)
    const explanationDiv = document.getElementById('modal-explanation');
    setExplanationBlockHtml(explanationDiv, question.explanation, question.explanationVi);
    
    // Hide the answer section initially
    const answerSection = document.getElementById('answer-section');
    answerSection.classList.add('hidden');
    
    // Show the reveal button and hide it after answer is revealed
    const revealBtn = document.getElementById('reveal-answer-btn');
    revealBtn.style.display = 'block';
    revealBtn.textContent = 'Reveal Answer';
    
    // Reset timer container (remove fade-out class if present)
    const timerContainer = document.querySelector('.timer-container');
    if (timerContainer) {
        timerContainer.classList.remove('fade-out');
    }
    
    // Reset response time tracking for this question
    currentResponseTime = 0;
    questionOpenedAt = Date.now();
    resetBuzzerQuestionState();
    
    // Start the timer
    startTimer();
    
    // Show the modal by adding the 'show' class
    modal.classList.add('show');
}

// ============================================
// SET UP MODAL BUTTONS
// ============================================
function setupModalButtons() {
    // Get the reveal answer button
    const revealBtn = document.getElementById('reveal-answer-btn');
    
    // When clicked, show the answer
    revealBtn.addEventListener('click', function() {
        const answerSection = document.getElementById('answer-section');
        answerSection.classList.remove('hidden'); // Show the answer
        
        // Capture response time (seconds from question open to reveal)
        if (buzzerEnabled && buzzerLocked) {
            const answerElapsed = buzzerAnswerDuration - buzzerTimeRemaining;
            currentResponseTime = buzzInResponseTime + (answerElapsed > 0 ? answerElapsed : 0);
        } else {
            currentResponseTime = timerDuration - timeRemaining;
        }
        
        // Hide the reveal button after showing the answer
        revealBtn.style.display = 'none';
        
        // Stop and fade out the timer
        stopTimer();
        stopBuzzerAnswerTimer();
        fadeOutTimer();
        fadeOutBuzzerTimer();
    });
    
    // Get the close modal button
    const closeBtn = document.getElementById('close-modal-btn');
    
    // When clicked, close the modal
    closeBtn.addEventListener('click', function() {
        closeModal();
    });
    
    // Also close the modal when clicking outside of it (on the dark overlay)
    const modal = document.getElementById('question-modal');
    modal.addEventListener('click', function(event) {
        // If the click was on the modal overlay itself (not the content box)
        if (event.target === modal) {
            closeModal();
        }
    });
}

// ============================================
// CLOSE THE MODAL
// ============================================
function closeModal() {
    // Stop the timer
    stopTimer();
    stopBuzzerAnswerTimer();
    resetBuzzerQuestionState();
    
    // Reset timer display
    const timerText = document.getElementById('timer-text');
    const timerBar = document.getElementById('timer-bar');
    
    if (timerText) {
        // Reset the text while preserving the span structure
        timerText.innerHTML = 'Time: <span id="timer-seconds">' + timerDuration + '</span>s';
        timerText.style.color = '';
    }
    
    if (timerBar) {
        timerBar.style.width = '100%';
        timerBar.style.backgroundColor = '#4caf50';
    }
    
    const timerContainer = document.querySelector('#question-modal .timer-container:not(.buzzer-timer-container)');
    if (timerContainer) {
        timerContainer.classList.remove('timer-urgent');
    }
    if (timerText) {
        timerText.classList.remove('timer-text-urgent');
    }
    
    const modal = document.getElementById('question-modal');
    modal.classList.remove('show'); // Hide the modal
    
    questionOpenedAt = null;
    
    // Note: We don't reset currentQuestion and currentTile here
    // They will be reset after the user answers (Correct/Incorrect)
    // This allows the score buttons to work even if the modal is closed
}

// ============================================
// TEAM BUZZER
// ============================================
function setupBuzzerPregameControls() {
    const buzzerCheckbox = document.getElementById('buzzer-enabled');
    const playersList = document.getElementById('pregame-players-list');
    
    if (buzzerCheckbox) {
        buzzerCheckbox.addEventListener('change', function() {
            const names = readPregamePlayerNames();
            const keys = readPregameBuzzerKeys();
            renderPregamePlayerRows(names, keys);
        });
    }
    
    if (playersList && !playersList._buzzerDelegated) {
        playersList._buzzerDelegated = true;
        playersList.addEventListener('click', function(event) {
            const btn = event.target.closest('.buzzer-key-set-btn');
            if (!btn) return;
            const slot = parseInt(btn.getAttribute('data-buzzer-slot'), 10);
            if (isNaN(slot)) return;
            startBuzzerKeyCapture(slot, btn);
        });
    }
}

function startBuzzerKeyCapture(slot, btn) {
    if (buzzerKeyCaptureSlot !== null) {
        cancelBuzzerKeyCapture();
    }
    buzzerKeyCaptureSlot = slot;
    btn.classList.add('listening');
    btn.textContent = 'Press a key…';
    
    document.addEventListener('keydown', onBuzzerKeyCaptureKeydown, true);
}

function cancelBuzzerKeyCapture() {
    document.removeEventListener('keydown', onBuzzerKeyCaptureKeydown, true);
    if (buzzerKeyCaptureSlot !== null) {
        const btn = document.querySelector('.buzzer-key-set-btn[data-buzzer-slot="' + buzzerKeyCaptureSlot + '"]');
        if (btn) {
            btn.classList.remove('listening');
            btn.textContent = 'Set key';
        }
    }
    buzzerKeyCaptureSlot = null;
}

function onBuzzerKeyCaptureKeydown(event) {
    if (buzzerKeyCaptureSlot === null) return;
    event.preventDefault();
    event.stopPropagation();
    
    if (event.key === 'Escape') {
        cancelBuzzerKeyCapture();
        return;
    }
    if (event.key === 'Tab' || event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Meta') {
        return;
    }
    
    const captured = normalizeBuzzerKey(event.key === ' ' ? ' ' : event.key);
    if (!captured) return;
    
    const display = document.getElementById('buzzer-key-display-' + buzzerKeyCaptureSlot);
    if (display) {
        display.setAttribute('data-buzzer-key', captured);
        display.textContent = formatBuzzerKeyLabel(captured);
    }
    
    cancelBuzzerKeyCapture();
}

function setupBuzzerInGame() {
    if (buzzerKeydownSetup) return;
    buzzerKeydownSetup = true;
    
    document.addEventListener('keydown', function(event) {
        if (!gameStarted || !buzzerEnabled || buzzerLocked || buzzerAnswerExpired) return;
        if (buzzerKeyCaptureSlot !== null) return;
        
        const questionModal = document.getElementById('question-modal');
        if (!questionModal || !questionModal.classList.contains('show')) return;
        
        if (isModalBlockingBuzzer()) return;
        if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT')) return;
        if (event.key === 'Tab' || event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Meta' || event.key === 'Escape') return;
        
        const playerIndex = findBuzzerPlayerIndexForKey(event.key === ' ' ? ' ' : event.key);
        if (playerIndex < 0 || buzzedOutPlayers.indexOf(playerIndex) >= 0) return;
        
        event.preventDefault();
        handleBuzzerPress(playerIndex);
    });
    
    setupBuzzerContinueButton();
}

function setupBuzzerContinueButton() {
    if (buzzerContinueBtnSetup) return;
    const btn = document.getElementById('buzzer-continue-timer-btn');
    if (!btn) return;
    buzzerContinueBtnSetup = true;
    btn.addEventListener('click', function() {
        continueBuzzerQuestionTimer();
    });
}

function isModalBlockingBuzzer() {
    const ids = ['settings-modal', 'statistics-modal', 'daily-double-modal', 'help-modal'];
    for (let i = 0; i < ids.length; i++) {
        const el = document.getElementById(ids[i]);
        if (el && el.classList.contains('show')) return true;
    }
    return false;
}

function clampBuzzerAnswerDuration(value) {
    const v = parseInt(value, 10);
    if (isNaN(v) || v < 3) return DEFAULT_BUZZER_ANSWER_DURATION;
    if (v > 60) return 60;
    return v;
}

function playBuzzerTone(startHz, endHz, durationSec, volume) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startHz, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, endHz), ctx.currentTime + durationSec * 0.4);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationSec);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + durationSec);
        osc.onended = function() { ctx.close(); };
    } catch (_) { /* ignore audio errors */ }
}

function playBuzzerBeepHigh() {
    playBuzzerTone(880, 660, 0.22, 0.35);
}

function playBuzzerBeepLow() {
    playBuzzerTone(280, 220, 0.35, 0.4);
}

function handleBuzzerPress(playerIndex) {
    if (buzzerLocked || buzzerAnswerExpired || playerIndex < 0 || playerIndex >= getPlayerCount()) return;
    if (buzzedOutPlayers.indexOf(playerIndex) >= 0) return;
    
    buzzerLocked = true;
    buzzerAnswerExpired = false;
    lastBuzzedPlayerIndex = playerIndex;
    mainTimeRemainingAtBuzz = timeRemaining;
    buzzInResponseTime = timerDuration - timeRemaining;
    
    hideBuzzerContinueButton();
    playBuzzerBeepHigh();
    stopTimer();
    
    currentPlayer = playerIndex + 1;
    updateCurrentPlayerDisplay();
    highlightBuzzedInPlayer(currentPlayer);
    
    const buzzerBox = document.getElementById('buzzer-answer-timer');
    const statusText = document.getElementById('buzzer-status-text');
    if (buzzerBox) buzzerBox.classList.remove('hidden');
    if (statusText) {
        statusText.textContent = (playerNames[playerIndex] || ('Player ' + currentPlayer)) + ' buzzed in!';
    }
    
    startBuzzerAnswerTimer();
}

function highlightBuzzedInPlayer(playerNum) {
    const n = getPlayerCount();
    for (let i = 1; i <= n; i++) {
        const btn = document.querySelector('.player-btn[data-player="' + i + '"]');
        const scoreBox = document.getElementById('player-' + i + '-score');
        if (btn) btn.classList.toggle('buzzed-in', i === playerNum);
        if (scoreBox) scoreBox.classList.toggle('buzzed-in', i === playerNum);
    }
}

function clearBuzzedInHighlight() {
    document.querySelectorAll('.buzzed-in').forEach(function(el) {
        el.classList.remove('buzzed-in');
    });
}

function hideBuzzerContinueButton() {
    const btn = document.getElementById('buzzer-continue-timer-btn');
    if (btn) btn.classList.add('hidden');
}

function showBuzzerContinueButton() {
    const btn = document.getElementById('buzzer-continue-timer-btn');
    if (btn) btn.classList.remove('hidden');
}

function resetBuzzerQuestionState() {
    buzzerLocked = false;
    buzzerAnswerExpired = false;
    buzzInResponseTime = 0;
    mainTimeRemainingAtBuzz = 0;
    lastBuzzedPlayerIndex = -1;
    buzzedOutPlayers = [];
    stopBuzzerAnswerTimer();
    clearBuzzedInHighlight();
    hideBuzzerContinueButton();
    
    const buzzerBox = document.getElementById('buzzer-answer-timer');
    if (buzzerBox) buzzerBox.classList.add('hidden');
    
    const statusText = document.getElementById('buzzer-status-text');
    if (statusText) statusText.textContent = '';
    
    const buzzerTimerText = document.getElementById('buzzer-timer-text');
    const buzzerTimerBar = document.getElementById('buzzer-timer-bar');
    if (buzzerTimerText) {
        buzzerTimerText.innerHTML = 'Answer: <span id="buzzer-timer-seconds">' + buzzerAnswerDuration + '</span>s';
        buzzerTimerText.style.color = '';
    }
    if (buzzerTimerBar) {
        buzzerTimerBar.style.width = '100%';
        buzzerTimerBar.style.backgroundColor = '#2196f3';
    }
    
    const buzzerContainer = document.getElementById('buzzer-answer-timer');
    if (buzzerContainer) buzzerContainer.classList.remove('fade-out');
}

function startBuzzerAnswerTimer() {
    stopBuzzerAnswerTimer();
    
    const buzzerTimerText = document.getElementById('buzzer-timer-text');
    if (buzzerTimerText) {
        buzzerTimerText.innerHTML = 'Answer: <span id="buzzer-timer-seconds">' + buzzerAnswerDuration + '</span>s';
        buzzerTimerText.style.color = '';
    }
    
    buzzerTimeRemaining = buzzerAnswerDuration;
    updateBuzzerAnswerTimerDisplay();
    
    buzzerTimerInterval = setInterval(function() {
        buzzerTimeRemaining--;
        updateBuzzerAnswerTimerDisplay();
        if (buzzerTimeRemaining <= 0) {
            stopBuzzerAnswerTimer();
            handleBuzzerAnswerTimerExpired();
        }
    }, 1000);
}

function stopBuzzerAnswerTimer() {
    if (buzzerTimerInterval) {
        clearInterval(buzzerTimerInterval);
        buzzerTimerInterval = null;
    }
}

function updateBuzzerAnswerTimerDisplay() {
    const timerSeconds = document.getElementById('buzzer-timer-seconds');
    const timerBar = document.getElementById('buzzer-timer-bar');
    
    if (timerSeconds) timerSeconds.textContent = buzzerTimeRemaining;
    if (timerBar) {
        const percentage = (buzzerTimeRemaining / buzzerAnswerDuration) * 100;
        timerBar.style.width = percentage + '%';
        if (buzzerTimeRemaining <= 3) {
            timerBar.style.backgroundColor = '#f44336';
        } else if (buzzerTimeRemaining <= 6) {
            timerBar.style.backgroundColor = '#ff9800';
        } else {
            timerBar.style.backgroundColor = '#2196f3';
        }
    }
}

function handleBuzzerAnswerTimerExpired() {
    buzzerLocked = false;
    buzzerAnswerExpired = true;
    
    playBuzzerBeepLow();
    
    const buzzerTimerText = document.getElementById('buzzer-timer-text');
    if (buzzerTimerText) {
        buzzerTimerText.textContent = 'Answer time\'s up!';
        buzzerTimerText.style.color = '#f44336';
    }
    
    const statusText = document.getElementById('buzzer-status-text');
    const playerName = lastBuzzedPlayerIndex >= 0
        ? (playerNames[lastBuzzedPlayerIndex] || ('Player ' + (lastBuzzedPlayerIndex + 1)))
        : 'Team';
    if (statusText) {
        statusText.textContent = playerName + ' — time\'s up. Mark incorrect or continue timer for other teams.';
    }
    
    if (buzzerContinueAfterAnswer) {
        showBuzzerContinueButton();
    }
}

function continueBuzzerQuestionTimer() {
    if (!buzzerAnswerExpired) return;
    
    if (lastBuzzedPlayerIndex >= 0 && buzzedOutPlayers.indexOf(lastBuzzedPlayerIndex) < 0) {
        buzzedOutPlayers.push(lastBuzzedPlayerIndex);
    }
    
    buzzerAnswerExpired = false;
    hideBuzzerContinueButton();
    clearBuzzedInHighlight();
    
    const buzzerBox = document.getElementById('buzzer-answer-timer');
    if (buzzerBox) buzzerBox.classList.add('hidden');
    
    const mainTimerContainer = document.querySelector('#question-modal .timer-container');
    if (mainTimerContainer) mainTimerContainer.classList.remove('fade-out');
    
    const statusText = document.getElementById('buzzer-status-text');
    if (statusText) {
        const remaining = buzzedOutPlayers.length;
        const total = getPlayerCount();
        if (remaining >= total) {
            statusText.textContent = 'All teams have buzzed. Reveal answer or close.';
        } else {
            statusText.textContent = 'Question timer resumed — other teams may buzz in.';
        }
    }
    
    if (mainTimeRemainingAtBuzz > 0) {
        resumeMainTimer(mainTimeRemainingAtBuzz);
    } else {
        const timerText = document.getElementById('timer-text');
        if (timerText) {
            timerText.textContent = 'Buzz in to answer';
            timerText.style.color = '';
        }
    }
}

function fadeOutBuzzerTimer() {
    const buzzerContainer = document.getElementById('buzzer-answer-timer');
    if (buzzerContainer && !buzzerContainer.classList.contains('hidden')) {
        buzzerContainer.classList.add('fade-out');
    }
}

// ============================================
// START TIMER
// ============================================
function startMainTimerInterval() {
    timerInterval = setInterval(function() {
        timeRemaining--;
        updateTimerDisplay();
        if (timeRemaining <= 0) {
            stopTimer();
            handleTimerExpired();
        }
    }, 1000);
}

function startTimerMusicFromElapsed(elapsedSeconds) {
    if (!jeopardyThemeAudio) {
        jeopardyThemeAudio = new Audio('Jeopardy Theme.mp3');
    }
    jeopardyThemeAudio.volume = musicVolume;
    const playbackRate = 32 / timerDuration;
    jeopardyThemeAudio.playbackRate = playbackRate;
    jeopardyThemeAudio.currentTime = Math.max(0, elapsedSeconds);
    jeopardyThemeAudio.play().catch(function() { /* Autoplay may be blocked */ });
}

function startTimer() {
    stopTimer();
    startTimerMusicFromElapsed(0);
    
    const timerText = document.getElementById('timer-text');
    if (timerText) {
        timerText.innerHTML = 'Time: <span id="timer-seconds">' + timerDuration + '</span>s';
        timerText.style.color = '';
    }
    
    timeRemaining = timerDuration;
    updateTimerDisplay();
    startMainTimerInterval();
}

function resumeMainTimer(remainingSeconds) {
    stopTimer();
    const elapsed = timerDuration - remainingSeconds;
    startTimerMusicFromElapsed(elapsed);
    
    const timerText = document.getElementById('timer-text');
    if (timerText) {
        timerText.innerHTML = 'Time: <span id="timer-seconds">' + remainingSeconds + '</span>s';
        timerText.style.color = '';
    }
    
    timeRemaining = remainingSeconds;
    updateTimerDisplay();
    startMainTimerInterval();
}

// ============================================
// STOP TIMER
// ============================================
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    // Stop Jeopardy theme
    if (jeopardyThemeAudio) {
        jeopardyThemeAudio.pause();
        jeopardyThemeAudio.currentTime = 0;
    }
}

// ============================================
// FINAL JEOPARDY TIMER
// ============================================
function startFinalJeopardyTimer() {
    stopFinalJeopardyTimer();
    
    const timerContainer = document.querySelector('#final-jeopardy-question-modal .timer-container');
    if (timerContainer) timerContainer.classList.remove('fade-out');
    
    const timerText = document.getElementById('fj-timer-text');
    if (timerText) {
        timerText.innerHTML = 'Time: <span id="fj-timer-seconds">' + finalJeopardyTimerDuration + '</span>s';
        timerText.style.color = '';
    }
    
    const timerBar = document.getElementById('fj-timer-bar');
    if (timerBar) {
        timerBar.style.width = '100%';
        timerBar.style.backgroundColor = '#4caf50';
    }
    
    finalJeopardyTimeRemaining = finalJeopardyTimerDuration;
    updateFinalJeopardyTimerDisplay();
    
    finalJeopardyTimerInterval = setInterval(function() {
        finalJeopardyTimeRemaining--;
        updateFinalJeopardyTimerDisplay();
        
        if (finalJeopardyTimeRemaining <= 0) {
            stopFinalJeopardyTimer();
            handleFinalJeopardyTimerExpired();
        }
    }, 1000);
}

function stopFinalJeopardyTimer() {
    if (finalJeopardyTimerInterval) {
        clearInterval(finalJeopardyTimerInterval);
        finalJeopardyTimerInterval = null;
    }
}

function updateFinalJeopardyTimerDisplay() {
    const timerSeconds = document.getElementById('fj-timer-seconds');
    const timerBar = document.getElementById('fj-timer-bar');
    
    if (timerSeconds) {
        timerSeconds.textContent = finalJeopardyTimeRemaining;
    }
    
    if (timerBar) {
        const percentage = (finalJeopardyTimeRemaining / finalJeopardyTimerDuration) * 100;
        timerBar.style.width = percentage + '%';
        
        if (percentage <= 25) {
            timerBar.style.backgroundColor = '#f44336';
        } else if (percentage <= 50) {
            timerBar.style.backgroundColor = '#ff9800';
        } else {
            timerBar.style.backgroundColor = '#4caf50';
        }
    }
}

function handleFinalJeopardyTimerExpired() {
    const timerText = document.getElementById('fj-timer-text');
    if (timerText) {
        timerText.textContent = 'Time\'s Up!';
        timerText.style.color = '#f44336';
    }
}

function fadeOutFinalJeopardyTimer() {
    const timerContainer = document.querySelector('#final-jeopardy-question-modal .timer-container');
    if (timerContainer) {
        timerContainer.classList.add('fade-out');
    }
}

// ============================================
// FINAL JEOPARDY WAGER TIMER
// ============================================
function hideFinalJeopardyWagerCategory() {
    const block = document.querySelector('.final-jeopardy-wager-category');
    if (block) {
        block.classList.add('hidden');
    }
}

function showFinalJeopardyWagerCategory() {
    if (!finalJeopardyQuestion) {
        return;
    }
    const block = document.querySelector('.final-jeopardy-wager-category');
    const nameEl = document.getElementById('final-jeopardy-wager-category-name');
    if (block && nameEl) {
        setCategoryBilingualHtml(
            nameEl,
            finalJeopardyQuestion.category.name,
            finalJeopardyQuestion.category.nameVi
        );
        block.classList.remove('hidden');
    }
}

function resetFinalJeopardyWagerTimerDisplay() {
    const timerText = document.getElementById('fj-wager-timer-text');
    const timerBar = document.getElementById('fj-wager-timer-bar');
    if (timerText) {
        timerText.innerHTML = 'Wager time: <span id="fj-wager-timer-seconds">' + FINAL_JEOPARDY_WAGER_TIMER_DURATION + '</span>s';
        timerText.style.color = '';
    }
    if (timerBar) {
        timerBar.style.width = '100%';
        timerBar.style.backgroundColor = '#4caf50';
    }
}

function startFinalJeopardyWagerTimer() {
    stopFinalJeopardyWagerTimer();
    resetFinalJeopardyWagerTimerDisplay();
    showFinalJeopardyWagerCategory();
    
    const startBtn = document.getElementById('final-jeopardy-wager-start-timer-btn');
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = 'Wager timer running…';
    }
    
    finalJeopardyWagerTimeRemaining = FINAL_JEOPARDY_WAGER_TIMER_DURATION;
    updateFinalJeopardyWagerTimerDisplay();
    
    finalJeopardyWagerTimerInterval = setInterval(function() {
        finalJeopardyWagerTimeRemaining--;
        updateFinalJeopardyWagerTimerDisplay();
        if (finalJeopardyWagerTimeRemaining <= 0) {
            stopFinalJeopardyWagerTimer();
            handleFinalJeopardyWagerTimerExpired();
        }
    }, 1000);
}

function stopFinalJeopardyWagerTimer() {
    if (finalJeopardyWagerTimerInterval) {
        clearInterval(finalJeopardyWagerTimerInterval);
        finalJeopardyWagerTimerInterval = null;
    }
}

function updateFinalJeopardyWagerTimerDisplay() {
    const timerSeconds = document.getElementById('fj-wager-timer-seconds');
    const timerBar = document.getElementById('fj-wager-timer-bar');
    
    if (timerSeconds) timerSeconds.textContent = finalJeopardyWagerTimeRemaining;
    if (timerBar) {
        const percentage = (finalJeopardyWagerTimeRemaining / FINAL_JEOPARDY_WAGER_TIMER_DURATION) * 100;
        timerBar.style.width = percentage + '%';
        if (finalJeopardyWagerTimeRemaining <= 5) {
            timerBar.style.backgroundColor = '#f44336';
        } else if (finalJeopardyWagerTimeRemaining <= 15) {
            timerBar.style.backgroundColor = '#ff9800';
        } else {
            timerBar.style.backgroundColor = '#4caf50';
        }
    }
}

function handleFinalJeopardyWagerTimerExpired() {
    playBuzzerBeepLow();
    
    const timerText = document.getElementById('fj-wager-timer-text');
    if (timerText) {
        timerText.textContent = 'Wager time\'s up!';
        timerText.style.color = '#f44336';
    }
    
    const startBtn = document.getElementById('final-jeopardy-wager-start-timer-btn');
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = 'Restart ' + FINAL_JEOPARDY_WAGER_TIMER_DURATION + 's Wager Timer';
    }
}

// ============================================
// UPDATE TIMER DISPLAY
// ============================================
function updateTimerDisplay() {
    const timerSeconds = document.getElementById('timer-seconds');
    const timerBar = document.getElementById('timer-bar');
    
    if (timerSeconds) {
        timerSeconds.textContent = timeRemaining;
    }
    
    const timerContainer = document.querySelector('#question-modal .timer-container:not(.buzzer-timer-container)');
    const timerText = document.getElementById('timer-text');
    if (timerBar) {
        // Calculate percentage remaining
        const percentage = (timeRemaining / timerDuration) * 100;
        timerBar.style.width = percentage + '%';
        
        // Change color based on time remaining
        if (percentage <= 25) {
            timerBar.style.backgroundColor = '#f44336'; // Red
        } else if (percentage <= 50) {
            timerBar.style.backgroundColor = '#ff9800'; // Orange
        } else {
            timerBar.style.backgroundColor = '#4caf50'; // Green
        }
    }
    if (timerContainer) {
        timerContainer.classList.toggle('timer-urgent', timeRemaining > 0 && timeRemaining <= Math.ceil(timerDuration * 0.25));
    }
    if (timerText) {
        timerText.classList.toggle('timer-text-urgent', timeRemaining > 0 && timeRemaining <= Math.ceil(timerDuration * 0.25));
    }
}

// ============================================
// HANDLE TIMER EXPIRED
// ============================================
function handleTimerExpired() {
    // Capture full timer duration as response time when time runs out
    currentResponseTime = timerDuration;
    
    const timerText = document.getElementById('timer-text');
    if (timerText) {
        timerText.textContent = 'Time\'s Up!';
        timerText.style.color = '#f44336';
    }
}

// ============================================
// FADE OUT TIMER
// ============================================
function fadeOutTimer() {
    const timerContainer = document.querySelector('.timer-container');
    if (timerContainer) {
        // Add fade-out class
        timerContainer.classList.add('fade-out');
    }
}

// ============================================
// RESPONSE TIME & STATISTICS HELPERS
// ============================================
function getResponseTimeSeconds() {
    if (currentResponseTime > 0) {
        return currentResponseTime;
    }
    if (buzzerEnabled && buzzerLocked) {
        const answerElapsed = Math.max(0, buzzerAnswerDuration - buzzerTimeRemaining);
        return buzzInResponseTime + answerElapsed;
    }
    if (typeof timeRemaining === 'number' && timerDuration > 0 && timeRemaining <= timerDuration) {
        return Math.max(0, timerDuration - timeRemaining);
    }
    if (questionOpenedAt) {
        return Math.max(0, Math.round((Date.now() - questionOpenedAt) / 1000));
    }
    return 0;
}

function recordGameResponse(outcome) {
    if (!currentQuestion || !currentTile) {
        return;
    }
    const category = currentQuestion.category || currentTile._categoryRef;
    if (!category || !category.name) {
        return;
    }
    const isDailyDouble = currentTile.dataset.isDailyDouble === 'true';
    const baseValue = getQuestionValue(currentQuestion);
    const points = isDailyDouble ? currentWager : baseValue;
    let pointsDelta = 0;
    if (outcome === 'correct') {
        pointsDelta = points;
    } else if (outcome === 'incorrect') {
        pointsDelta = -points;
    }
    gameStats.responses.push({
        category: category.name,
        value: baseValue,
        pointsDelta: pointsDelta,
        responseTimeSeconds: getResponseTimeSeconds(),
        outcome: outcome,
        playerIndex: outcome === 'no_answer' ? -1 : currentPlayer - 1,
        playerName: outcome === 'no_answer' ? null : playerNames[currentPlayer - 1],
        isDailyDouble: isDailyDouble,
        round: currentRound
    });
    refreshStatisticsIfOpen();
}

function refreshStatisticsIfOpen() {
    if (statisticsModalOpen) {
        renderStatistics();
    }
}

function formatFinalJeopardyStatsForPlayer(playerIndex) {
    const entries = gameStats.finalJeopardy.filter(function(f) {
        return f.playerIndex === playerIndex;
    });
    if (!entries.length) {
        return '—';
    }
    return entries.map(function(entry) {
        const roundLabel = (entry.round || 1) === 2 ? 'Round 2' : 'Round 1';
        const tagClass = entry.isCorrect ? 'stats-tag stats-tag-correct' : 'stats-tag stats-tag-incorrect';
        const tagText = entry.isCorrect ? 'Correct' : 'Incorrect';
        return roundLabel + ' <span class="' + tagClass + '">' + tagText + '</span>';
    }).join(' · ');
}

// ============================================
// SET UP SCORE BUTTONS
// ============================================
function setupScoreButtons() {
    // Get the correct and incorrect buttons
    const correctBtn = document.getElementById('correct-btn');
    const incorrectBtn = document.getElementById('incorrect-btn');
    
    // When correct button is clicked
    correctBtn.addEventListener('click', function() {
        if (currentQuestion && currentTile) {
            recordGameResponse('correct');
            
            // Check if this is a daily double
            const isDailyDouble = currentTile.dataset.isDailyDouble === 'true';
            
            if (isDailyDouble) {
                // For daily doubles, add the wager amount
                playerScores[currentPlayer - 1] += currentWager;
            } else {
                // For regular questions, add the question value (doubled in Round 2)
                playerScores[currentPlayer - 1] += getQuestionValue(currentQuestion);
            }
            
            updateAllScores({ animate: true });
            
            // Mark the tile as used
            markTileAsUsed();
            
            // Close the modal
            closeModal();
            
            // Reset the current question, tile, and wager references after answering
            currentQuestion = null;
            currentTile = null;
            currentWager = 0;
            
            // Check if all questions are used (Final Jeopardy time)
            checkForFinalJeopardy();
        }
    });
    
    // When incorrect button is clicked
    incorrectBtn.addEventListener('click', function() {
        if (currentQuestion && currentTile) {
            recordGameResponse('incorrect');
            
            // Check if this is a daily double
            const isDailyDouble = currentTile.dataset.isDailyDouble === 'true';
            
            if (isDailyDouble) {
                // For daily doubles, subtract the wager amount
                playerScores[currentPlayer - 1] -= currentWager;
            } else {
                // For regular questions, subtract the question value (doubled in Round 2)
                playerScores[currentPlayer - 1] -= getQuestionValue(currentQuestion);
            }
            
            updateAllScores({ animate: true });
            
            // Mark the tile as used
            markTileAsUsed();
            
            // Close the modal
            closeModal();
            
            // Reset the current question, tile, and wager references after answering
            currentQuestion = null;
            currentTile = null;
            currentWager = 0;
            
            // Check if all questions are used (Final Jeopardy time)
            checkForFinalJeopardy();
        }
    });
    
    // When no-answer (trash) button is clicked - no one answered, no score change
    const noAnswerBtn = document.getElementById('no-answer-btn');
    noAnswerBtn.addEventListener('click', function() {
        if (currentQuestion && currentTile) {
            recordGameResponse('no_answer');
            
            // Mark the tile as used (no score change)
            markTileAsUsed();
            
            // Close the modal
            closeModal();
            
            // Reset the current question, tile, and wager references
            currentQuestion = null;
            currentTile = null;
            currentWager = 0;
            
            // Check if all questions are used (Final Jeopardy time)
            checkForFinalJeopardy();
        }
    });
}

// ============================================
// SET UP PLAYER SELECTOR
// ============================================
function setupPlayerSelector() {
    const bar = document.getElementById('player-selector-bar');
    if (!bar || playerSelectorDelegated) return;
    playerSelectorDelegated = true;
    bar.addEventListener('click', function(event) {
        const button = event.target.closest('.player-btn');
        if (!button) return;
        const playerNum = parseInt(button.getAttribute('data-player'), 10);
        if (isNaN(playerNum) || playerNum < 1 || playerNum > getPlayerCount()) return;
        currentPlayer = playerNum;
        updateCurrentPlayerDisplay();
    });
}

// ============================================
// UPDATE ALL PLAYER SCORES DISPLAY
// ============================================
function updateAllScores(options) {
    options = options || {};
    const n = getPlayerCount();
    for (let i = 0; i < n; i++) {
        const scoreElement = document.getElementById('score-' + (i + 1));
        if (!scoreElement) {
            continue;
        }
        const newScore = playerScores[i];
        const oldScore = parseInt(scoreElement.textContent, 10) || 0;
        scoreElement.textContent = newScore;
        scoreElement.classList.toggle('is-negative', newScore < 0);
        if (options.animate && newScore !== oldScore) {
            scoreElement.classList.remove('score-up', 'score-down');
            void scoreElement.offsetWidth;
            scoreElement.classList.add(newScore > oldScore ? 'score-up' : 'score-down');
            setTimeout(function() {
                scoreElement.classList.remove('score-up', 'score-down');
            }, 650);
        }
    }
    refreshStatisticsIfOpen();
}

// ============================================
// UPDATE PLAYER NAMES DISPLAY
// ============================================
function updatePlayerNames() {
    const n = getPlayerCount();
    for (let i = 0; i < n; i++) {
        const playerScoreBox = document.getElementById('player-' + (i + 1) + '-score');
        if (playerScoreBox) {
            const labelElement = playerScoreBox.querySelector('.player-label');
            if (labelElement) {
                labelElement.textContent = playerNames[i];
            }
        }
    }
    
    const playerButtons = document.querySelectorAll('#player-selector-bar .player-btn');
    playerButtons.forEach(button => {
        const playerNum = parseInt(button.getAttribute('data-player'), 10);
        if (playerNum >= 1 && playerNum <= n) {
            button.textContent = playerNames[playerNum - 1];
        }
    });
}

// ============================================
// UPDATE CURRENT PLAYER DISPLAY
// ============================================
function updateCurrentPlayerDisplay() {
    // Update the current player name display
    const currentPlayerNameElement = document.getElementById('current-player-name');
    if (currentPlayerNameElement) {
        currentPlayerNameElement.textContent = playerNames[currentPlayer - 1];
    }
    
    const n = getPlayerCount();
    if (currentPlayer < 1) currentPlayer = 1;
    if (currentPlayer > n) currentPlayer = n;
    
    for (let i = 1; i <= n; i++) {
        const playerScoreBox = document.getElementById('player-' + i + '-score');
        if (playerScoreBox) {
            playerScoreBox.classList.remove('active');
        }
    }
    
    // Add highlight to current player
    const currentPlayerBox = document.getElementById('player-' + currentPlayer + '-score');
    if (currentPlayerBox) {
        currentPlayerBox.classList.add('active');
    }
    
    const playerButtons = document.querySelectorAll('#player-selector-bar .player-btn');
    playerButtons.forEach(button => {
        const playerNum = parseInt(button.getAttribute('data-player'), 10);
        if (playerNum === currentPlayer) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// ============================================
// SET UP SETTINGS
// ============================================
function setupSettings() {
    // Get the settings button
    const settingsBtn = document.getElementById('settings-btn');
    const statsBtn = document.getElementById('stats-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const applyBtn = document.getElementById('apply-settings-btn');
    const restartBtn = document.getElementById('restart-game-btn');
    const viewStatsBtn = document.getElementById('view-stats-btn');
    
    // Open settings modal when settings button is clicked
    settingsBtn.addEventListener('click', function() {
        openSettingsModal();
    });
    
    // Open statistics modal when stats button is clicked
    if (statsBtn) statsBtn.addEventListener('click', openStatisticsModal);
    if (viewStatsBtn) viewStatsBtn.addEventListener('click', function() { closeSettingsModal(); openStatisticsModal(); });
    
    // Close settings modal
    closeSettingsBtn.addEventListener('click', function() {
        closeSettingsModal();
    });
    
    // Close modal when clicking outside
    settingsModal.addEventListener('click', function(event) {
        if (event.target === settingsModal) {
            closeSettingsModal();
        }
    });
    
    // Apply settings button
    applyBtn.addEventListener('click', function() {
        applySettings();
    });
    
    // Restart game button
    restartBtn.addEventListener('click', function() {
        restartGame();
    });
}

// ============================================
// OPEN SETTINGS MODAL
// ============================================
function openSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    
    syncMusicVolumeSliders();
    renderSettingsPlayersContainer();
    
    document.getElementById('settings-timer-duration').value = timerDuration;
    const fjTimerEl = document.getElementById('settings-final-timer-duration');
    if (fjTimerEl) fjTimerEl.value = finalJeopardyTimerDuration;
    const buzzerAnswerEl = document.getElementById('settings-buzzer-answer-duration');
    if (buzzerAnswerEl) buzzerAnswerEl.value = buzzerAnswerDuration;
    
    settingsModal.classList.add('show');
}

// ============================================
// CLOSE SETTINGS MODAL
// ============================================
function closeSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    settingsModal.classList.remove('show');
}

// ============================================
// STATISTICS
// ============================================
function computeStatistics() {
    const r = gameStats.responses;
    const correct = r.filter(function(x) { return x.outcome === 'correct'; }).length;
    const incorrect = r.filter(function(x) { return x.outcome === 'incorrect'; }).length;
    const noAnswer = r.filter(function(x) { return x.outcome === 'no_answer'; }).length;
    const cluesResolved = r.length;
    const answered = correct + incorrect;
    
    const scored = r.filter(function(x) {
        return x.outcome === 'correct' || x.outcome === 'incorrect';
    });
    const times = scored
        .map(function(x) { return x.responseTimeSeconds; })
        .filter(function(t) { return typeof t === 'number' && t >= 0; });
    const avgTime = times.length ? (times.reduce(function(a, b) { return a + b; }, 0) / times.length).toFixed(1) : '—';
    const fastest = times.length ? Math.min.apply(null, times) : '—';
    const slowest = times.length ? Math.max.apply(null, times) : '—';
    
    let pointsScored = 0;
    let pointsLost = 0;
    r.forEach(function(x) {
        if (typeof x.pointsDelta === 'number') {
            if (x.pointsDelta > 0) {
                pointsScored += x.pointsDelta;
            } else if (x.pointsDelta < 0) {
                pointsLost += Math.abs(x.pointsDelta);
            }
        }
    });
    
    const byCategory = {};
    r.forEach(function(x) {
        if (!byCategory[x.category]) {
            byCategory[x.category] = { times: [], correct: 0, incorrect: 0, noAnswer: 0 };
        }
        if (x.outcome === 'no_answer') {
            byCategory[x.category].noAnswer++;
        } else {
            if (x.outcome === 'correct') {
                byCategory[x.category].correct++;
            }
            if (x.outcome === 'incorrect') {
                byCategory[x.category].incorrect++;
            }
            if (typeof x.responseTimeSeconds === 'number' && x.responseTimeSeconds >= 0) {
                byCategory[x.category].times.push(x.responseTimeSeconds);
            }
        }
    });
    
    const byRound = {};
    r.forEach(function(x) {
        const round = x.round || 1;
        if (!byRound[round]) {
            byRound[round] = { correct: 0, incorrect: 0, noAnswer: 0, total: 0 };
        }
        byRound[round].total++;
        if (x.outcome === 'correct') {
            byRound[round].correct++;
        } else if (x.outcome === 'incorrect') {
            byRound[round].incorrect++;
        } else {
            byRound[round].noAnswer++;
        }
    });
    
    const pc = Math.max(playerNames.length, 1);
    const byPlayer = Array.from({ length: pc }, function() {
        return { correct: 0, incorrect: 0, times: [], points: 0, byCategory: {} };
    });
    r.forEach(function(x) {
        if (x.outcome === 'no_answer') {
            return;
        }
        const i = x.playerIndex;
        if (i >= 0 && i < pc) {
            if (x.outcome === 'correct') {
                byPlayer[i].correct++;
            } else {
                byPlayer[i].incorrect++;
            }
            if (typeof x.pointsDelta === 'number') {
                byPlayer[i].points += x.pointsDelta;
            }
            if (typeof x.responseTimeSeconds === 'number' && x.responseTimeSeconds >= 0) {
                byPlayer[i].times.push(x.responseTimeSeconds);
            }
            if (!byPlayer[i].byCategory[x.category]) {
                byPlayer[i].byCategory[x.category] = { times: [], correct: 0, incorrect: 0 };
            }
            if (x.outcome === 'correct') {
                byPlayer[i].byCategory[x.category].correct++;
            }
            if (x.outcome === 'incorrect') {
                byPlayer[i].byCategory[x.category].incorrect++;
            }
            if (typeof x.responseTimeSeconds === 'number' && x.responseTimeSeconds >= 0) {
                byPlayer[i].byCategory[x.category].times.push(x.responseTimeSeconds);
            }
        }
    });
    
    const fj = gameStats.finalJeopardy;
    const fjCorrect = fj.filter(function(x) { return x.isCorrect; }).length;
    
    return {
        cluesResolved: cluesResolved,
        correct: correct,
        incorrect: incorrect,
        noAnswer: noAnswer,
        answered: answered,
        avgTime: avgTime,
        fastest: fastest,
        slowest: slowest,
        pointsScored: pointsScored,
        pointsLost: pointsLost,
        byCategory: byCategory,
        byRound: byRound,
        byPlayer: byPlayer,
        fjCorrect: fjCorrect,
        fjTotal: fj.length,
        currentRound: currentRound
    };
}

function renderStatistics() {
    const body = document.getElementById('statistics-body');
    const updatedEl = document.getElementById('stats-updated-at');
    if (!body) {
        return;
    }
    
    const s = computeStatistics();
    let html = '';
    
    if (s.cluesResolved === 0 && s.fjTotal === 0) {
        html = '<p class="stats-empty">No statistics yet. Play some questions to see live stats here.</p>';
    } else {
        html += '<div class="stats-section"><h3>Live Overview</h3>';
        html += '<ul class="stats-list">';
        html += '<li>Current round: <strong>Round ' + s.currentRound + '</strong></li>';
        html += '<li>Clues resolved: <strong>' + s.cluesResolved + '</strong></li>';
        html += '<li>Scored correct: <strong>' + s.correct + '</strong></li>';
        html += '<li>Scored incorrect: <strong>' + s.incorrect + '</strong></li>';
        html += '<li>No answer (pass): <strong>' + s.noAnswer + '</strong></li>';
        if (s.answered > 0) {
            const pct = ((s.correct / s.answered) * 100).toFixed(1);
            html += '<li>Accuracy (scored only): <strong>' + pct + '%</strong></li>';
        }
        if (s.cluesResolved > 0) {
            html += '<li>Points won on board: <strong>$' + s.pointsScored + '</strong></li>';
            html += '<li>Points lost on board: <strong>$' + s.pointsLost + '</strong></li>';
        }
        if (s.fjTotal > 0) {
            html += '<li>Final Jeopardy correct: <strong>' + s.fjCorrect + '/' + s.fjTotal + '</strong></li>';
        }
        html += '</ul></div>';
        
        const roundKeys = Object.keys(s.byRound).sort();
        if (roundKeys.length > 1 || (roundKeys.length === 1 && roundKeys[0] !== '1')) {
            html += '<div class="stats-section"><h3>By Round</h3><ul class="stats-list">';
            roundKeys.forEach(function(roundKey) {
                const d = s.byRound[roundKey];
                const scored = d.correct + d.incorrect;
                const pct = scored ? ((d.correct / scored) * 100).toFixed(1) : '—';
                html += '<li>Round ' + roundKey + ': <strong>' + d.correct + '</strong> correct, <strong>' + d.incorrect + '</strong> incorrect, <strong>' + d.noAnswer + '</strong> pass' +
                    (scored ? ' · accuracy <strong>' + pct + '%</strong>' : '') + '</li>';
            });
            html += '</ul></div>';
        }
        
        if (s.answered > 0) {
            html += '<div class="stats-section"><h3>Answer Speed</h3>';
            html += '<ul class="stats-list">';
            html += '<li>Average time (scored clues): <strong>' + s.avgTime + 's</strong></li>';
            html += '<li>Fastest scored answer: <strong>' + s.fastest + (s.fastest !== '—' ? 's' : '') + '</strong></li>';
            html += '<li>Slowest scored answer: <strong>' + s.slowest + (s.slowest !== '—' ? 's' : '') + '</strong></li>';
            html += '</ul></div>';
        }
        
        const cats = Object.keys(s.byCategory);
        if (cats.length > 0) {
            html += '<div class="stats-section"><h3>By Category</h3>';
            html += '<ul class="stats-list stats-category-list">';
            cats.forEach(function(cat) {
                const d = s.byCategory[cat];
                const scored = d.correct + d.incorrect;
                const avg = d.times.length ? (d.times.reduce(function(a, b) { return a + b; }, 0) / d.times.length).toFixed(1) : '—';
                const pct = scored ? ((d.correct / scored) * 100).toFixed(1) : '—';
                html += '<li><strong>' + escapeHtml(cat) + '</strong>: ' + d.correct + '/' + scored + ' correct';
                if (d.noAnswer) {
                    html += ', ' + d.noAnswer + ' pass';
                }
                html += ' (' + pct + '%';
                if (avg !== '—') {
                    html += ', ' + avg + 's avg';
                }
                html += ')</li>';
            });
            html += '</ul></div>';
        }
        
        html += '<div class="stats-section"><h3>Per Team</h3>';
        const teamCount = s.byPlayer.length;
        for (let i = 0; i < teamCount; i++) {
            const p = s.byPlayer[i];
            const teamAnswered = p.correct + p.incorrect;
            const avgT = p.times.length ? (p.times.reduce(function(a, b) { return a + b; }, 0) / p.times.length).toFixed(1) : '—';
            const fastT = p.times.length ? Math.min.apply(null, p.times) : '—';
            const slowT = p.times.length ? Math.max.apply(null, p.times) : '—';
            const pct = teamAnswered ? ((p.correct / teamAnswered) * 100).toFixed(1) : '—';
            const liveScore = playerScores[i] !== undefined ? playerScores[i] : 0;
            html += '<div class="stats-team-block"><h4>' + escapeHtml(playerNames[i] || ('Player ' + (i + 1))) + '</h4><ul class="stats-list">';
            html += '<li>Live score: <strong>$' + liveScore + '</strong></li>';
            html += '<li>Board points net: <strong>' + (p.points >= 0 ? '+' : '') + p.points + '</strong></li>';
            html += '<li>Correct: <strong>' + p.correct + '</strong> · Incorrect: <strong>' + p.incorrect + '</strong> · Accuracy: <strong>' + pct + '%</strong></li>';
            html += '<li>Avg: <strong>' + avgT + (avgT !== '—' ? 's' : '') + '</strong> · Fastest: <strong>' + fastT + (fastT !== '—' ? 's' : '') + '</strong> · Slowest: <strong>' + slowT + (slowT !== '—' ? 's' : '') + '</strong></li>';
            html += '<li>Final Jeopardy: ' + formatFinalJeopardyStatsForPlayer(i) + '</li>';
            const pCats = Object.keys(p.byCategory);
            if (pCats.length > 0) {
                html += '<li class="stats-team-cats">By category: ';
                html += pCats.map(function(c) {
                    const d = p.byCategory[c];
                    const catScored = d.correct + d.incorrect;
                    const avg = d.times.length ? (d.times.reduce(function(a, b) { return a + b; }, 0) / d.times.length).toFixed(1) : '—';
                    return escapeHtml(c) + ' ' + d.correct + '/' + catScored + ' (' + avg + 's avg)';
                }).join(' · ');
                html += '</li>';
            }
            html += '</ul></div>';
        }
        html += '</div>';
    }
    
    body.innerHTML = html;
    if (updatedEl) {
        const now = new Date();
        updatedEl.textContent = 'Updated ' + now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    }
}

function openStatisticsModal() {
    const modal = document.getElementById('statistics-modal');
    statisticsModalOpen = true;
    renderStatistics();
    modal.classList.add('show');
    if (statisticsRefreshTimer) {
        clearInterval(statisticsRefreshTimer);
    }
    statisticsRefreshTimer = setInterval(function() {
        if (statisticsModalOpen) {
            renderStatistics();
        }
    }, 2000);
}

function closeStatisticsModal() {
    statisticsModalOpen = false;
    if (statisticsRefreshTimer) {
        clearInterval(statisticsRefreshTimer);
        statisticsRefreshTimer = null;
    }
    document.getElementById('statistics-modal').classList.remove('show');
}

function setupStatisticsModal() {
    if (statisticsModalSetupDone) {
        return;
    }
    statisticsModalSetupDone = true;
    const closeBtn = document.getElementById('close-stats-btn');
    const modal = document.getElementById('statistics-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeStatisticsModal);
    if (modal) modal.addEventListener('click', function(e) {
        if (e.target === modal) closeStatisticsModal();
    });
}

// ============================================
// APPLY SETTINGS
// ============================================
function applySettings() {
    const n = getPlayerCount();
    for (let i = 0; i < n; i++) {
        const scoreEl = document.getElementById('settings-score-' + (i + 1));
        const nameEl = document.getElementById('settings-name-' + (i + 1));
        if (scoreEl) playerScores[i] = parseInt(scoreEl.value, 10) || 0;
        if (nameEl) {
            const nm = nameEl.value.trim();
            playerNames[i] = nm || playerNames[i] || ('Player ' + (i + 1));
        }
    }
    updateAllScores();
    updatePlayerNames();
    updateCurrentPlayerDisplay();
    
    // Update timer duration
    const newTimerDuration = parseInt(document.getElementById('settings-timer-duration').value) || 30;
    if (newTimerDuration >= 5 && newTimerDuration <= 120) {
        timerDuration = newTimerDuration;
        // If timer is currently running, restart it with new duration
        if (timerInterval) {
            startTimer();
        }
    }
    
    const settingsFinalTimerEl = document.getElementById('settings-final-timer-duration');
    const newFinalTimerDuration = parseInt(settingsFinalTimerEl ? settingsFinalTimerEl.value : '', 10) || 30;
    if (newFinalTimerDuration >= 5 && newFinalTimerDuration <= 300) {
        finalJeopardyTimerDuration = newFinalTimerDuration;
        if (finalJeopardyTimerInterval) {
            startFinalJeopardyTimer();
        }
    }
    
    const settingsBuzzerAnswerEl = document.getElementById('settings-buzzer-answer-duration');
    buzzerAnswerDuration = clampBuzzerAnswerDuration(parseInt(settingsBuzzerAnswerEl ? settingsBuzzerAnswerEl.value : '', 10));
    
    // Close the modal
    closeSettingsModal();
}

// ============================================
// RESTART GAME
// ============================================
function restartGame() {
    // Stop any running timer
    stopTimer();
    stopBuzzerAnswerTimer();
    stopFinalJeopardyWagerTimer();
    cancelBuzzerKeyCapture();
    stopFinalJeopardyTimer();
    
    // Reset game state
    playerNames = ['Player 1', 'Player 2', 'Player 3'];
    playerScores = [0, 0, 0];
    currentPlayer = 1;
    currentQuestion = null;
    gameStats = { responses: [], finalJeopardy: [] };
    statisticsModalOpen = false;
    if (statisticsRefreshTimer) {
        clearInterval(statisticsRefreshTimer);
        statisticsRefreshTimer = null;
    }
    currentTile = null;
    gameStarted = false;
    document.body.classList.remove('game-active');
    timerDuration = 30; // Reset to default
    finalJeopardyTimerDuration = 30;
    currentWager = 0; // Reset wager
    dailyDoubleCount = 2; // Reset daily double count
    dailyDoubleQuestions = []; // Reset daily double assignments
    hideDailyDoubles = true; // Reset hide daily doubles setting
    twoRoundsMode = true;
    round2Data = null;
    currentRound = 1;
    round1FinalScores = [0, 0, 0];
    buzzerEnabled = true;
    buzzerContinueAfterAnswer = true;
    buzzerAnswerDuration = DEFAULT_BUZZER_ANSWER_DURATION;
    playerBuzzerKeys = ['1', '2', '3'];
    buzzerLocked = false;
    buzzerAnswerExpired = false;
    
    resetToDefaultGameData();
    
    // Clear the game board
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    
    // Hide game container
    const gameContainer = document.getElementById('game-container');
    gameContainer.style.display = 'none';
    
    // Close settings modal
    closeSettingsModal();
    
    // Show start screen
    const startScreen = document.getElementById('start-screen');
    startScreen.classList.add('show');
    
    renderPregamePlayerRows(['Player 1', 'Player 2', 'Player 3']);
    const buzzerEnabledEl = document.getElementById('buzzer-enabled');
    if (buzzerEnabledEl) buzzerEnabledEl.checked = true;
    const buzzerContinueEl = document.getElementById('buzzer-continue-timer');
    if (buzzerContinueEl) buzzerContinueEl.checked = true;
    const buzzerAnswerDurEl = document.getElementById('buzzer-answer-duration');
    if (buzzerAnswerDurEl) buzzerAnswerDurEl.value = DEFAULT_BUZZER_ANSWER_DURATION;
    document.getElementById('timer-duration').value = 30;
    const finalTimerEl = document.getElementById('final-timer-duration');
    if (finalTimerEl) finalTimerEl.value = 30;
    document.getElementById('daily-double-count').value = 2;
    document.getElementById('hide-daily-doubles').checked = true;
    const twoRoundsCheckbox = document.getElementById('two-rounds-mode');
    if (twoRoundsCheckbox) twoRoundsCheckbox.checked = true;
    
    // Reset daily double count and settings
    dailyDoubleCount = 2;
    dailyDoubleQuestions = [];
    currentWager = 0;
    hideDailyDoubles = true;
    
    // Reset Final Jeopardy state
    finalJeopardyWagers = [0, 0, 0];
    finalJeopardyQuestion = null;
    finalJeopardyAnswered = false;
    finalJeopardySetupDone = false;
    round2ModalSetupDone = false;
    
    // Close Round 2 and Final Scores modals if open
    const round2Modal = document.getElementById('round2-intro-modal');
    if (round2Modal) round2Modal.classList.remove('show');
    const finalScoresModal = document.getElementById('final-scores-modal');
    if (finalScoresModal) finalScoresModal.classList.remove('show');
    
    // Reset file import inputs
    const importFileInput = document.getElementById('import-file-input');
    const importFileName = document.getElementById('import-file-name');
    const importQuestionsBtn = document.getElementById('import-questions-btn');
    const importStatus = document.getElementById('import-status');
    if (importFileInput) importFileInput.value = '';
    if (importFileName) importFileName.textContent = '';
    if (importQuestionsBtn) importQuestionsBtn.style.display = 'none';
    if (importStatus) {
        setImportStatus(importStatus, '', null);
    }
    
    // Reset AI generation inputs (but keep API key)
    const categoryInputs = document.getElementById('category-inputs');
    const generateStatus = document.getElementById('generate-status');
    const generateLoading = document.getElementById('generate-loading');
    if (categoryInputs) categoryInputs.value = '';
    if (generateStatus) {
        generateStatus.textContent = '';
        generateStatus.style.color = '';
    }
    if (generateLoading) generateLoading.style.display = 'none';
    
    // Re-enable generate button if it was disabled
    const generateBtn = document.getElementById('generate-questions-btn');
    if (generateBtn) generateBtn.disabled = false;
    
    syncMusicVolumeSliders();
    
    // Rebuild question editor
    buildQuestionEditor();
}

// ============================================
// MUSIC VOLUME (timer theme)
// ============================================
function loadMusicVolumeFromStorage() {
    try {
        const stored = localStorage.getItem(MUSIC_VOLUME_STORAGE_KEY);
        if (stored !== null) {
            const n = parseInt(stored, 10);
            if (!isNaN(n) && n >= 0 && n <= 100) {
                musicVolume = n / 100;
                return;
            }
        }
    } catch (e) { /* ignore */ }
    musicVolume = 1;
}

function saveMusicVolumeToStorage() {
    try {
        localStorage.setItem(MUSIC_VOLUME_STORAGE_KEY, String(Math.round(musicVolume * 100)));
    } catch (e) { /* ignore */ }
}

function syncMusicVolumeSliders() {
    const pct = Math.round(musicVolume * 100);
    const startSlider = document.getElementById('start-music-volume');
    const settingsSlider = document.getElementById('settings-music-volume');
    const startLabel = document.getElementById('start-music-volume-value');
    const settingsLabel = document.getElementById('settings-music-volume-value');
    if (startSlider) {
        startSlider.value = String(pct);
        startSlider.setAttribute('aria-valuenow', String(pct));
    }
    if (settingsSlider) {
        settingsSlider.value = String(pct);
        settingsSlider.setAttribute('aria-valuenow', String(pct));
    }
    if (startLabel) startLabel.textContent = pct + '%';
    if (settingsLabel) settingsLabel.textContent = pct + '%';
}

function applyMusicVolumeToAudio() {
    if (jeopardyThemeAudio) {
        jeopardyThemeAudio.volume = musicVolume;
    }
}

function setMusicVolumeFromPercent(percent) {
    let p = typeof percent === 'number' ? percent : parseInt(percent, 10);
    if (isNaN(p)) p = 100;
    p = Math.max(0, Math.min(100, p));
    musicVolume = p / 100;
    applyMusicVolumeToAudio();
    syncMusicVolumeSliders();
    saveMusicVolumeToStorage();
}

function setupMusicVolumeControls() {
    const startSlider = document.getElementById('start-music-volume');
    const settingsSlider = document.getElementById('settings-music-volume');
    function onVolumeInput(event) {
        setMusicVolumeFromPercent(event.target.value);
    }
    if (startSlider) startSlider.addEventListener('input', onVolumeInput);
    if (settingsSlider) settingsSlider.addEventListener('input', onVolumeInput);
    loadMusicVolumeFromStorage();
    syncMusicVolumeSliders();
}

function setImportStatus(element, message, type) {
    if (!element) {
        return;
    }
    element.textContent = message || '';
    element.classList.remove('is-success', 'is-error', 'is-warning');
    element.style.color = '';
    if (type === 'success') {
        element.classList.add('is-success');
    } else if (type === 'error') {
        element.classList.add('is-error');
    } else if (type === 'warning') {
        element.classList.add('is-warning');
    }
}

// ============================================
// SET UP FILE IMPORT
// ============================================
function setupFileImport() {
    const importFileInput = document.getElementById('import-file-input');
    const importFileBtn = document.getElementById('import-file-btn');
    const importQuestionsBtn = document.getElementById('import-questions-btn');
    const importFileName = document.getElementById('import-file-name');
    const importStatus = document.getElementById('import-status');
    
    let selectedFile = null;
    
    // When choose file button is clicked, trigger file input
    importFileBtn.addEventListener('click', function() {
        importFileInput.click();
    });
    
    // When a file is selected
    importFileInput.addEventListener('change', function(event) {
        selectedFile = event.target.files[0];
        if (selectedFile) {
            importFileName.textContent = selectedFile.name;
            importQuestionsBtn.style.display = 'inline-block';
            setImportStatus(importStatus, '', null);
        }
    });
    
    // When import button is clicked
    importQuestionsBtn.addEventListener('click', function() {
        if (!selectedFile) {
            setImportStatus(importStatus, 'Please select a file first.', 'warning');
            return;
        }
        
        const reader = new FileReader();
        const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
        
        reader.onload = function(e) {
            try {
                if (fileExtension === 'json') {
                    // Import JSON file
                    const importedData = JSON.parse(e.target.result);
                    
                    function ensureExplanations(data) {
                        if (data.categories && Array.isArray(data.categories)) {
                            data.categories.forEach(category => {
                                if (category.questions && Array.isArray(category.questions)) {
                                    category.questions.forEach(question => {
                                        if (!question.explanation) {
                                            question.explanation = '';
                                        }
                                        ensureBilingualQuestionFields(question);
                                    });
                                }
                            });
                        }
                        ensureFinalJeopardyOnData(data);
                        normalizeGameDataBilingual(data);
                    }
                    
                    if (importedData.round1 && importedData.round2) {
                        // Two-rounds format
                        ensureExplanations(importedData.round1);
                        ensureExplanations(importedData.round2);
                        gameData = importedData.round1;
                        round2Data = importedData.round2;
                        questionsData.categories = importedData.round1.categories;
                        buildQuestionEditor();
                        setImportStatus(importStatus, 'Questions imported! Round 1: ' + importedData.round1.categories.length + ' categories, Round 2: ' + importedData.round2.categories.length + ' categories.', 'success');
                    } else if (importedData.categories && Array.isArray(importedData.categories)) {
                        ensureExplanations(importedData);
                        gameData = importedData;
                        round2Data = null;
                        questionsData.categories = importedData.categories;
                        if (document.getElementById('two-rounds-mode') && document.getElementById('two-rounds-mode').checked) {
                            ensureRound2DataLoaded();
                        }
                        buildQuestionEditor();
                        setImportStatus(importStatus, 'Questions imported successfully! ' + importedData.categories.length + ' category/categories loaded.', 'success');
                    } else {
                        throw new Error('Invalid JSON format. Expected "categories" array or "round1"/"round2" objects.');
                    }
                } else if (fileExtension === 'csv') {
                    // Import CSV file
                    const csvText = e.target.result;
                    const importedData = parseCSV(csvText);
                    if (importedData) {
                        if (importedData.round1 && importedData.round2) {
                            ensureFinalJeopardyOnData(importedData.round1);
                            ensureFinalJeopardyOnData(importedData.round2);
                            normalizeGameDataBilingual(importedData.round1);
                            normalizeGameDataBilingual(importedData.round2);
                            // Two-rounds format
                            gameData = importedData.round1;
                            round2Data = importedData.round2;
                            questionsData.categories = importedData.round1.categories;
                            buildQuestionEditor();
                            setImportStatus(importStatus, 'Questions imported! Round 1: ' + importedData.round1.categories.length + ' categories, Round 2: ' + importedData.round2.categories.length + ' categories.', 'success');
                        } else if (importedData.categories && importedData.categories.length > 0) {
                            ensureFinalJeopardyOnData(importedData);
                            normalizeGameDataBilingual(importedData);
                            gameData = importedData;
                            round2Data = null;
                            questionsData.categories = importedData.categories;
                            if (document.getElementById('two-rounds-mode') && document.getElementById('two-rounds-mode').checked) {
                                ensureRound2DataLoaded();
                            }
                            buildQuestionEditor();
                            setImportStatus(importStatus, 'Questions imported successfully! ' + importedData.categories.length + ' category/categories loaded.', 'success');
                        } else {
                            throw new Error('Invalid CSV format or empty file.');
                        }
                    } else {
                        throw new Error('Invalid CSV format or empty file.');
                    }
                } else {
                    throw new Error('Unsupported file format. Please use CSV or JSON.');
                }
            } catch (error) {
                setImportStatus(importStatus, 'Error importing file: ' + error.message, 'error');
                console.error('Import error:', error);
            }
        };
        
        reader.onerror = function() {
            setImportStatus(importStatus, 'Error reading file.', 'error');
        };
        
        if (fileExtension === 'json') {
            reader.readAsText(selectedFile);
        } else if (fileExtension === 'csv') {
            reader.readAsText(selectedFile);
        }
    });
}

function safeTrim(value) {
    return (value === null || value === undefined) ? '' : String(value).trim();
}

// ============================================
// PARSE CSV FILE
// ============================================
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row.');
    }
    
    // Parse header
    const headers = parseCSVLine(lines[0]);
    const expectedHeaders = ['Type', 'Category', 'Value', 'Clue', 'Answer', 'Explanation', 'Round'];
    const headerIndexes = {};
    
    expectedHeaders.forEach(header => {
        const index = headers.findIndex(h => h.trim().toLowerCase() === header.toLowerCase());
        if (index === -1 && header !== 'Explanation' && header !== 'Round' && header !== 'Type') {
            throw new Error('Missing required column: ' + header);
        }
        headerIndexes[header.toLowerCase()] = index;
    });
    
    const hasRoundColumn = headerIndexes['round'] >= 0;
    const hasTypeColumn = headerIndexes['type'] >= 0;
    
    const idxCategoryVi = findCsvColumnIndex(headers, ['CategoryVI', 'Category (VI)', 'Category_VI']);
    const idxClueVi = findCsvColumnIndex(headers, ['ClueVI', 'Clue (VI)', 'Clue_VI']);
    const idxAnswerVi = findCsvColumnIndex(headers, ['AnswerVI', 'Answer (VI)', 'Answer_VI']);
    const idxExplanationVi = findCsvColumnIndex(headers, [
        'ExplanationVI', 'Explanation (VI)', 'Explanation_VI',
        'HintVI', 'Hint (VI)', 'Hint_VI'
    ]);
    
    const round1Map = {};
    const round2Map = {};
    let round1FinalJeopardy = null;
    let round2FinalJeopardy = null;
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        if (values.length < 4) {
            continue;
        }
        
        const rowTypeRaw = hasTypeColumn ? safeTrim(values[headerIndexes['type']]).toLowerCase() : 'board';
        const rowType = rowTypeRaw || 'board';
        const category = safeTrim(values[headerIndexes['category']]);
        const categoryVi = idxCategoryVi >= 0 && values[idxCategoryVi] !== undefined ? safeTrim(values[idxCategoryVi]) : '';
        const valueRaw = safeTrim(values[headerIndexes['value']]);
        const value = valueRaw === '' ? 0 : (parseInt(valueRaw, 10) || 100);
        const clue = safeTrim(values[headerIndexes['clue']]);
        const answer = safeTrim(values[headerIndexes['answer']]);
        const explanation = headerIndexes['explanation'] >= 0 ? safeTrim(values[headerIndexes['explanation']]) : '';
        const clueVi = idxClueVi >= 0 && values[idxClueVi] !== undefined ? safeTrim(values[idxClueVi]) : '';
        const answerVi = idxAnswerVi >= 0 && values[idxAnswerVi] !== undefined ? safeTrim(values[idxAnswerVi]) : '';
        const explanationVi = idxExplanationVi >= 0 && values[idxExplanationVi] !== undefined ? safeTrim(values[idxExplanationVi]) : '';
        const roundValRaw = hasRoundColumn ? safeTrim(values[headerIndexes['round']]).toLowerCase() : '1';
        const roundVal = roundValRaw || '1';
        const isRound2 = roundVal === '2' || roundVal === 'round2';
        
        const isFinalRow = rowType === 'final' || rowType === 'final jeopardy' || rowType === 'fj';
        
        if (isFinalRow) {
            if (!clue || !answer) continue;
            const fj = {
                category: category || 'Final Jeopardy',
                categoryVi: categoryVi,
                clue: clue,
                answer: answer,
                explanation: explanation,
                clueVi: clueVi,
                answerVi: answerVi,
                explanationVi: explanationVi
            };
            if (isRound2) {
                round2FinalJeopardy = fj;
            } else {
                round1FinalJeopardy = fj;
            }
            continue;
        }
        
        if (!category || !clue || !answer) {
            continue;
        }
        
        const categoriesMap = isRound2 ? round2Map : round1Map;
        if (!categoriesMap[category]) {
            categoriesMap[category] = { nameVi: '', questions: [] };
        }
        if (categoryVi) {
            categoriesMap[category].nameVi = categoryVi;
        }
        
        categoriesMap[category].questions.push({
            value: value,
            clue: clue,
            answer: answer,
            explanation: explanation,
            clueVi: clueVi,
            answerVi: answerVi,
            explanationVi: explanationVi
        });
    }
    
    function mapToCategories(map) {
        return Object.keys(map).map(function(categoryName) {
            const entry = map[categoryName];
            const questions = Array.isArray(entry) ? entry : (entry.questions || []);
            const nameVi = Array.isArray(entry) ? '' : (entry.nameVi || '');
            return {
                name: categoryName,
                nameVi: nameVi,
                questions: questions
            };
        });
    }
    
    function buildRoundData(categories, finalJeopardy) {
        const data = { categories: categories };
        if (finalJeopardy) {
            data.finalJeopardy = finalJeopardy;
        }
        ensureFinalJeopardyOnData(data);
        normalizeGameDataBilingual(data);
        return data;
    }
    
    const round1Categories = mapToCategories(round1Map);
    const round2Categories = mapToCategories(round2Map);
    
    if (round2Categories.length > 0 || round2FinalJeopardy) {
        return {
            round1: buildRoundData(round1Categories, round1FinalJeopardy),
            round2: buildRoundData(round2Categories, round2FinalJeopardy)
        };
    }
    
    return buildRoundData(round1Categories, round1FinalJeopardy);
}

// ============================================
// PARSE CSV LINE (HANDLE QUOTES AND COMMAS)
// ============================================
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add last field
    values.push(current);
    
    return values;
}

// ============================================
// SET UP AI QUESTION GENERATION
// ============================================
function setupAIGeneration() {
    const apiKeyInput = document.getElementById('api-key-input');
    const categoryInputs = document.getElementById('category-inputs');
    const questionsPerCategory = document.getElementById('questions-per-category');
    const modelSelect = document.getElementById('ai-model-select');
    const generateBtn = document.getElementById('generate-questions-btn');
    const generateStatus = document.getElementById('generate-status');
    const generateLoading = document.getElementById('generate-loading');
    
    // Load saved API key from localStorage
    const savedApiKey = localStorage.getItem('jeopardy_api_key');
    if (savedApiKey && apiKeyInput) {
        apiKeyInput.value = savedApiKey;
    }
    
    // Load saved model preference
    const savedModel = localStorage.getItem('jeopardy_ai_model');
    if (savedModel && modelSelect) {
        modelSelect.value = savedModel;
    }
    
    // Save API key when changed
    if (apiKeyInput) {
        apiKeyInput.addEventListener('blur', function() {
            if (this.value.trim()) {
                localStorage.setItem('jeopardy_api_key', this.value.trim());
            }
        });
    }
    
    // Save model selection when changed
    if (modelSelect) {
        modelSelect.addEventListener('change', function() {
            localStorage.setItem('jeopardy_ai_model', this.value);
        });
    }
    
    // Generate questions button
    if (generateBtn) {
        generateBtn.addEventListener('click', async function() {
            const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
            const categoriesText = categoryInputs ? categoryInputs.value.trim() : '';
            const questionsCount = parseInt(questionsPerCategory ? questionsPerCategory.value : '', 10) || 5;
            const selectedModel = modelSelect ? (modelSelect.value || 'gpt-3.5-turbo') : 'gpt-3.5-turbo';
            
            // Validate inputs
            if (!apiKey) {
                generateStatus.textContent = 'Please enter your OpenAI API key.';
                generateStatus.style.color = 'red';
                return;
            }
            
            if (!categoriesText) {
                generateStatus.textContent = 'Please enter at least one category.';
                generateStatus.style.color = 'red';
                return;
            }
            
            // Parse categories
            const categories = categoriesText.split('\n')
                .map(cat => cat.trim())
                .filter(cat => cat.length > 0);
            
            if (categories.length === 0) {
                generateStatus.textContent = 'Please enter at least one category.';
                generateStatus.style.color = 'red';
                return;
            }
            
            // Show loading state
            generateBtn.disabled = true;
            generateLoading.style.display = 'block';
            generateStatus.textContent = '';
            
            try {
                // Generate questions
                const generatedData = await generateQuestionsWithAI(apiKey, categories, questionsCount, selectedModel);
                
                // Update game data
                gameData = generatedData;
                questionsData.categories = generatedData.categories;
                ensureFinalJeopardyOnData(gameData);
                normalizeGameDataBilingual(gameData);
                
                // Rebuild editor
                buildQuestionEditor();
                
                // Show success
                generateStatus.textContent = 'Successfully generated ' + generatedData.categories.length + ' categories with ' + questionsCount + ' questions each!';
                generateStatus.style.color = 'green';
            } catch (error) {
                let errorMessage = error.message;
                
                // Provide helpful error messages
                if (errorMessage.includes('quota') || errorMessage.includes('exceeded')) {
                    errorMessage += '\n\nTip: If you\'re on a free trial, try:';
                    errorMessage += '\n1. Switch to "GPT-3.5 Turbo" model (more likely to work with free tier)';
                    errorMessage += '\n2. Add payment info at https://platform.openai.com/account/billing';
                    errorMessage += '\n3. Check your usage at https://platform.openai.com/usage';
                } else if (errorMessage.includes('401') || errorMessage.includes('invalid')) {
                    errorMessage += '\n\nTip: Check that your API key is correct and has not been revoked.';
                }
                
                generateStatus.innerHTML = 'Error: ' + errorMessage.replace(/\n/g, '<br>');
                generateStatus.style.color = 'red';
                console.error('AI Generation Error:', error);
            } finally {
                // Hide loading state
                generateBtn.disabled = false;
                generateLoading.style.display = 'none';
            }
        });
    }
}

// ============================================
// GENERATE QUESTIONS WITH AI
// ============================================
async function generateQuestionsWithAI(apiKey, categories, questionsPerCategory, model) {
    if (!model) model = 'gpt-3.5-turbo';
    const API_URL = 'https://api.openai.com/v1/chat/completions';
    
    // Create prompt for generating questions
    const pointValues = [];
    for (let i = 0; i < questionsPerCategory; i++) pointValues.push((i + 1) * 100);
    
    const prompt =
        'Generate Jeopardy-style questions and answers for the following categories: ' + categories.join(', ') + '.\n\n' +
        'For each category, generate exactly ' + questionsPerCategory + ' questions with the following point values: ' + pointValues.join(', ') + '.\n\n' +
        'Format requirements:\n' +
        '- Each question should have: value (point amount), clue (the question), answer (in Jeopardy format like \"What is...\" or \"Who is...\"), and explanation (optional educational context)\n' +
        '- Questions should increase in difficulty with point value\n' +
        '- Answers should be factual and accurate\n' +
        '- Clues should be clear and answerable\n\n' +
        'Return ONLY a valid JSON object in this exact format:\n' +
        '{\n' +
        '  \"categories\": [\n' +
        '    {\n' +
        '      \"name\": \"Category Name\",\n' +
        '      \"questions\": [\n' +
        '        {\n' +
        '          \"value\": 100,\n' +
        '          \"clue\": \"The question/clue text\",\n' +
        '          \"answer\": \"What is the answer?\",\n' +
        '          \"explanation\": \"Brief explanation about the answer\"\n' +
        '        }\n' +
        '      ]\n' +
        '    }\n' +
        '  ]\n' +
        '}\n\n' +
        'Do not include any text before or after the JSON. Only return the JSON object.';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that generates Jeopardy-style trivia questions in valid JSON format. Always return only valid JSON without any markdown formatting or extra text.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage =
                (errorData && errorData.error && errorData.error.message) ?
                    errorData.error.message :
                    'API Error: ' + response.status + ' ' + response.statusText;
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        const content =
            data && data.choices && data.choices[0] && data.choices[0].message ?
                data.choices[0].message.content :
                null;
        
        if (!content) {
            throw new Error('No content returned from API');
        }
        
        // Parse JSON response (may be wrapped in markdown code blocks)
        let jsonText = content.trim();
        
        // Remove markdown code blocks if present
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const generatedData = JSON.parse(jsonText);
        
        // Validate structure
        if (!generatedData.categories || !Array.isArray(generatedData.categories)) {
            throw new Error('Invalid response format: missing categories array');
        }
        
        // Ensure all questions have explanation field
        generatedData.categories.forEach(category => {
            if (category.questions && Array.isArray(category.questions)) {
                category.questions.forEach(question => {
                    if (!question.explanation) {
                        question.explanation = '';
                    }
                    ensureBilingualQuestionFields(question);
                });
            }
        });
        
        return generatedData;
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error('Failed to parse AI response. The AI may have returned invalid JSON.');
        }
        throw error;
    }
}

// ============================================
// MARK A TILE AS USED
// ============================================
function markTileAsUsed() {
    let tileToMark = null;
    
    // First, try to use the currentTile reference
    if (currentTile && currentTile.classList) {
        tileToMark = currentTile;
    } else if (currentQuestion) {
        // Fallback: Find the tile by matching the question object reference
        const allTiles = document.querySelectorAll('.question-tile');
        allTiles.forEach(tile => {
            // Check if this tile's stored question reference matches currentQuestion
            if (tile._questionRef === currentQuestion) {
                tileToMark = tile;
                return; // Exit forEach when found
            }
        });
        
        // If not found by reference, try finding by categoryIndex and questionIndex
        if (!tileToMark) {
            // Find which category and question index currentQuestion is at
            for (let catIndex = 0; catIndex < gameData.categories.length; catIndex++) {
                const category = gameData.categories[catIndex];
                for (let qIndex = 0; qIndex < category.questions.length; qIndex++) {
                    if (category.questions[qIndex] === currentQuestion) {
                        // Find tile with matching indices
                        allTiles.forEach(tile => {
                            if (parseInt(tile.dataset.categoryIndex) === catIndex && 
                                parseInt(tile.dataset.questionIndex) === qIndex) {
                                tileToMark = tile;
                                return; // Exit forEach when found
                            }
                        });
                        break;
                    }
                }
                if (tileToMark) break;
            }
        }
    }
    
    // Mark the tile as used if we found it
    if (tileToMark) {
        tileToMark.classList.add('used', 'just-used');
        tileToMark.style.pointerEvents = 'none';
        tileToMark.removeAttribute('tabindex');
        tileToMark.setAttribute('aria-disabled', 'true');
        setTimeout(function() {
            tileToMark.classList.remove('just-used');
        }, 450);
    } else {
        console.warn('Could not find tile to mark as used. currentTile:', currentTile, 'currentQuestion:', currentQuestion);
    }
}

// ============================================
// CHECK FOR FINAL JEOPARDY
// ============================================
function checkForFinalJeopardy() {
    // Don't trigger if Final Jeopardy has already been completed
    if (finalJeopardyAnswered) {
        return;
    }
    
    // Get all question tiles
    const allTiles = document.querySelectorAll('.question-tile');
    let allUsed = true;
    
    // Check if all tiles are used (excluding empty placeholder tiles)
    allTiles.forEach(tile => {
        if (!tile.classList.contains('is-placeholder') && !tile.classList.contains('used')) {
            allUsed = false;
        }
    });
    
    // If all questions are used, trigger Final Jeopardy
    if (allUsed) {
        startFinalJeopardy();
    }
}

// ============================================
// START FINAL JEOPARDY
// ============================================
function startFinalJeopardy() {
    const roundData = getGameDataForRound(currentRound);
    ensureFinalJeopardyOnData(roundData);
    
    if (isFinalJeopardyConfigured(roundData.finalJeopardy)) {
        const fj = roundData.finalJeopardy;
        finalJeopardyQuestion = {
            category: {
                name: fj.category || 'Final Jeopardy',
                nameVi: fj.categoryVi || ''
            },
            question: {
                value: 0,
                clue: fj.clue,
                answer: fj.answer,
                explanation: fj.explanation || '',
                clueVi: fj.clueVi || '',
                answerVi: fj.answerVi || '',
                explanationVi: fj.explanationVi || ''
            }
        };
    } else {
        finalJeopardyQuestion = resolveFinalJeopardyQuestionFromBoard(roundData);
        if (!finalJeopardyQuestion) {
            alert('No Final Jeopardy question set. Add clue and answer in the editor, or add board questions.');
            return;
        }
    }
    
    const introModal = document.getElementById('final-jeopardy-intro-modal');
    introModal.classList.add('show');
}

// ============================================
// ROUND 2 - SHOW INTRO AND TRANSITION
// ============================================
function showRound2Intro() {
    const round2Modal = document.getElementById('round2-intro-modal');
    if (round2Modal) {
        round2Modal.classList.add('show');
    }
}

function startRound2() {
    // Load Round 2 data into gameData
    gameData = JSON.parse(JSON.stringify(round2Data));
    
    // Ensure all questions have explanation field
    gameData.categories.forEach(category => {
        if (category.questions && Array.isArray(category.questions)) {
            category.questions.forEach(question => {
                if (!question.hasOwnProperty('explanation')) {
                    question.explanation = '';
                }
            });
        }
    });
    ensureFinalJeopardyOnData(round2Data);
    
    // Set current round to 2 (enables point doubling)
    currentRound = 2;
    
    const pc = getPlayerCount();
    playerScores = new Array(pc).fill(0);
    
    finalJeopardyWagers = new Array(pc).fill(0);
    finalJeopardyQuestion = null;
    finalJeopardyAnswered = false;
    
    // Close Round 2 intro modal
    const round2Modal = document.getElementById('round2-intro-modal');
    if (round2Modal) {
        round2Modal.classList.remove('show');
    }
    
    // Recreate the game board with Round 2 questions
    createGameBoard();
    
    // Update display
    updateAllScores();
}

function setupRound2Modal() {
    if (round2ModalSetupDone) return;
    const continueBtn = document.getElementById('round2-continue-btn');
    if (continueBtn) {
        round2ModalSetupDone = true;
        continueBtn.addEventListener('click', function() {
            startRound2();
        });
    }
}

// ============================================
// FINAL SCORES MODAL (Two Rounds Summary)
// ============================================
function showFinalScoresModal() {
    const modal = document.getElementById('final-scores-modal');
    if (!modal) return;
    
    const round1Scores = round1FinalScores;
    const round2Scores = playerScores;
    
    // Build the summary table
    let html = '<div class="final-scores-summary"><h2>Final Scores</h2><table class="final-scores-table"><thead><tr><th>Team</th><th>Round 1</th><th>Round 2</th><th>Total</th></tr></thead><tbody>';
    
    const rows = Math.max(playerNames.length, round1Scores.length, round2Scores.length);
    for (let i = 0; i < rows; i++) {
        const r1 = round1Scores[i] || 0;
        const r2 = round2Scores[i] || 0;
        const total = r1 + r2;
        const nm = playerNames[i] || ('Player ' + (i + 1));
        html += '<tr><td>' + nm + '</td><td>' + r1 + '</td><td>' + r2 + '</td><td><strong>' + total + '</strong></td></tr>';
    }
    
    html += '</tbody></table></div>';
    
    const body = document.getElementById('final-scores-body');
    if (body) body.innerHTML = html;
    
    modal.classList.add('show');
}

function setupFinalScoresModal() {
    const closeBtn = document.getElementById('final-scores-close-btn');
    const modal = document.getElementById('final-scores-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            if (modal) modal.classList.remove('show');
        });
    }
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.classList.remove('show');
        });
    }
}

// ============================================
// SET UP SKIP TO FINAL JEOPARDY BUTTON
// ============================================
function setupSkipToFinalJeopardy() {
    const skipBtn = document.getElementById('skip-to-final-jeopardy-btn');
    if (skipBtn) {
        skipBtn.addEventListener('click', function() {
            // Don't allow skipping if Final Jeopardy has already been completed
            if (finalJeopardyAnswered) {
                return;
            }
            
            // Mark all remaining questions as used (for visual consistency)
            const allTiles = document.querySelectorAll('.question-tile');
            allTiles.forEach(tile => {
                if (tile.style.visibility !== 'hidden' && !tile.classList.contains('used')) {
                    tile.classList.add('used');
                    tile.style.pointerEvents = 'none';
                }
            });
            
            // Start Final Jeopardy
            startFinalJeopardy();
        });
    }
}

// ============================================
// SET UP FINAL JEOPARDY
// ============================================
function setupFinalJeopardy() {
    if (finalJeopardySetupDone) return;
    finalJeopardySetupDone = true;
    
    // Final Jeopardy intro continue button
    const continueBtn = document.getElementById('final-jeopardy-continue-btn');
    continueBtn.addEventListener('click', function() {
        // Close intro modal
        const introModal = document.getElementById('final-jeopardy-intro-modal');
        introModal.classList.remove('show');
        
        // Show wager modal
        openFinalJeopardyWagerModal();
    });
    
    const wagerStartTimerBtn = document.getElementById('final-jeopardy-wager-start-timer-btn');
    if (wagerStartTimerBtn) {
        wagerStartTimerBtn.addEventListener('click', function() {
            startFinalJeopardyWagerTimer();
        });
    }
    
    // Final Jeopardy wager next button
    const wagerNextBtn = document.getElementById('final-jeopardy-wager-next-btn');
    wagerNextBtn.addEventListener('click', function() {
        stopFinalJeopardyWagerTimer();
        const n = getPlayerCount();
        finalJeopardyWagers = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            const el = document.getElementById('final-wager-' + (i + 1));
            finalJeopardyWagers[i] = el ? (parseInt(el.value, 10) || 0) : 0;
        }
        
        for (let i = 0; i < n; i++) {
            const maxWager = playerScores[i] < 500 ? 500 : Math.max(0, playerScores[i]);
            if (finalJeopardyWagers[i] < 0) {
                finalJeopardyWagers[i] = 0;
            } else if (finalJeopardyWagers[i] > maxWager) {
                finalJeopardyWagers[i] = maxWager;
            }
        }
        
        // Close wager modal
        const wagerModal = document.getElementById('final-jeopardy-wager-modal');
        wagerModal.classList.remove('show');
        
        // Show question modal
        openFinalJeopardyQuestionModal();
    });
    
    // Final Jeopardy reveal answer button
    const revealBtn = document.getElementById('final-jeopardy-reveal-btn');
    revealBtn.addEventListener('click', function() {
        stopFinalJeopardyTimer();
        fadeOutFinalJeopardyTimer();
        
        // Close question modal
        const questionModal = document.getElementById('final-jeopardy-question-modal');
        questionModal.classList.remove('show');
        
        // Show answer and results
        openFinalJeopardyAnswerModal();
    });
    
    const answerModalRoot = document.getElementById('final-jeopardy-answer-modal');
    if (answerModalRoot && !finalJeopardyAnswerDelegated) {
        finalJeopardyAnswerDelegated = true;
        answerModalRoot.addEventListener('click', function(event) {
            const button = event.target.closest('.final-answer-btn');
            if (!button) return;
            const playerNum = parseInt(button.getAttribute('data-player'), 10);
            const isCorrect = button.getAttribute('data-correct') === 'true';
            
            const playerButtons = document.querySelectorAll('.final-answer-btn[data-player="' + playerNum + '"]');
            playerButtons.forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.5';
            });
            
            handleFinalJeopardyAnswer(playerNum, isCorrect);
        });
    }
    
    // Final Jeopardy close button
    const closeBtn = document.getElementById('final-jeopardy-close-btn');
    closeBtn.addEventListener('click', function() {
        const answerModal = document.getElementById('final-jeopardy-answer-modal');
        answerModal.classList.remove('show');
        finalJeopardyAnswered = true;
        
        if (shouldStartRound2AfterRound1Final()) {
            round1FinalScores = [...playerScores];
            showRound2Intro();
        } else if (twoRoundsMode && currentRound === 2 && hasRound2BoardData()) {
            showFinalScoresModal();
        }
    });
}

// ============================================
// OPEN FINAL JEOPARDY WAGER MODAL
// ============================================
function openFinalJeopardyWagerModal() {
    stopFinalJeopardyWagerTimer();
    resetFinalJeopardyWagerTimerDisplay();
    
    const wagerModal = document.getElementById('final-jeopardy-wager-modal');
    hideFinalJeopardyWagerCategory();
    
    const wagersHost = document.getElementById('final-jeopardy-wagers-container');
    if (wagersHost) {
        wagersHost.innerHTML = buildFinalJeopardyWagersMarkup();
    }
    
    const wagerStartBtn = document.getElementById('final-jeopardy-wager-start-timer-btn');
    if (wagerStartBtn) {
        wagerStartBtn.disabled = false;
        wagerStartBtn.textContent = 'Start ' + FINAL_JEOPARDY_WAGER_TIMER_DURATION + 's Wager Timer';
    }
    
    const n = getPlayerCount();
    for (let i = 0; i < n; i++) {
        const scoreElement = document.getElementById('final-score-' + (i + 1));
        const labelElement = document.getElementById('final-wager-label-' + (i + 1));
        const wagerInput = document.getElementById('final-wager-' + (i + 1));
        
        if (scoreElement) {
            scoreElement.textContent = playerScores[i];
        }
        if (labelElement) {
            labelElement.innerHTML = playerNames[i] + ' (<span id="final-score-' + (i + 1) + '">' + playerScores[i] + '</span>):';
        }
        if (wagerInput) {
            const maxWager = playerScores[i] < 500 ? 500 : Math.max(0, playerScores[i]);
            wagerInput.max = maxWager;
            wagerInput.value = 0;
            wagerInput.min = 0;
        }
    }
    
    wagerModal.classList.add('show');
}

// ============================================
// OPEN FINAL JEOPARDY QUESTION MODAL
// ============================================
function openFinalJeopardyQuestionModal() {
    const questionModal = document.getElementById('final-jeopardy-question-modal');
    
    if (finalJeopardyQuestion) {
        setCategoryBilingualHtml(
            document.getElementById('final-jeopardy-category-name'),
            finalJeopardyQuestion.category.name,
            finalJeopardyQuestion.category.nameVi
        );
        const q = finalJeopardyQuestion.question;
        setElementBilingualHtml(document.getElementById('final-jeopardy-clue'), q.clue, q.clueVi);
    }
    
    startFinalJeopardyTimer();
    questionModal.classList.add('show');
}

// ============================================
// OPEN FINAL JEOPARDY ANSWER MODAL
// ============================================
function openFinalJeopardyAnswerModal() {
    const answerModal = document.getElementById('final-jeopardy-answer-modal');
    const resultsHost = document.getElementById('final-jeopardy-results-container');
    if (resultsHost) {
        resultsHost.innerHTML = buildFinalJeopardyResultsMarkup();
    }
    
    if (finalJeopardyQuestion) {
        const question = finalJeopardyQuestion.question;
        const category = finalJeopardyQuestion.category;
        
        setCategoryBilingualHtml(
            document.getElementById('final-jeopardy-answer-category-name'),
            category.name,
            category.nameVi
        );
        setElementBilingualHtml(document.getElementById('final-jeopardy-answer-text'), question.answer, question.answerVi);
        
        const explanationDiv = document.getElementById('final-jeopardy-explanation');
        setExplanationBlockHtml(explanationDiv, question.explanation, question.explanationVi);
        
        const n = getPlayerCount();
        for (let i = 0; i < n; i++) {
            const nameElement = document.getElementById('final-result-name-' + (i + 1));
            const scoreElement = document.getElementById('final-result-score-' + (i + 1));
            
            if (nameElement) {
                nameElement.textContent = playerNames[i] + ' (Score: ' + playerScores[i] + ', Wager: ' + finalJeopardyWagers[i] + '):';
            }
            if (scoreElement) {
                scoreElement.textContent = 'Pending...';
            }
            
            // Re-enable answer buttons
            const playerButtons = document.querySelectorAll('.final-answer-btn[data-player="' + (i + 1) + '"]');
            playerButtons.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
            });
        }
    }
    
    answerModal.classList.add('show');
}

// ============================================
// HANDLE FINAL JEOPARDY ANSWER
// ============================================
function handleFinalJeopardyAnswer(playerNum, isCorrect) {
    const playerIndex = playerNum - 1;
    
    const existing = gameStats.finalJeopardy.find(function(entry) {
        return entry.playerIndex === playerIndex && entry.round === currentRound;
    });
    if (existing) {
        existing.isCorrect = isCorrect;
    } else {
        gameStats.finalJeopardy.push({ playerIndex: playerIndex, isCorrect: isCorrect, round: currentRound });
    }
    
    const wager = finalJeopardyWagers[playerIndex] || 0;
    
    if (isCorrect) {
        playerScores[playerIndex] += wager;
    } else {
        playerScores[playerIndex] -= wager;
    }
    
    updateAllScores({ animate: true });
    
    const scoreElement = document.getElementById('final-result-score-' + playerNum);
    if (scoreElement) {
        const tagClass = isCorrect ? 'stats-tag stats-tag-correct' : 'stats-tag stats-tag-incorrect';
        const tagText = isCorrect ? 'Correct' : 'Incorrect';
        scoreElement.innerHTML = '<span class="' + tagClass + '">' + tagText + '</span> → Final Score: $' + playerScores[playerIndex];
    }
}

