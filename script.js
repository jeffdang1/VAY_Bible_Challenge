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
let timerDuration = 15; // Timer duration in seconds (default: 15)
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
let twoRoundsMode = false; // When true, game has Round 2 after first Final Jeopardy
let round2Data = null; // Store Round 2 categories/questions (separate from Round 1)
let currentRound = 1; // 1 = Round 1, 2 = Round 2 (double points)
let round1FinalScores = [0, 0, 0]; // Store Round 1 scores when transitioning to Round 2 (length matches players)

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
let playerSelectorDelegated = false;
let finalJeopardyAnswerDelegated = false;

// ============================================
// GAME QUESTIONS DATA
// ============================================
// Note: We're embedding the questions directly in JavaScript instead of using fetch()
// This is because browsers block loading local JSON files when opening HTML directly
// (due to CORS security restrictions). If you want to use a separate JSON file,
// you'll need to run a local web server (see instructions at the bottom of this file).
const questionsData = {
  "categories": [
    {
      "name": "Science",
      "questions": [
        {
          "value": 100,
          "clue": "The powerhouse of the cell.",
          "answer": "What is the mitochondria?",
          "explanation": "Mitochondria are organelles found in most cells that generate energy through cellular respiration."
        },
        {
          "value": 200,
          "clue": "The chemical symbol for water.",
          "answer": "What is H2O?"
        },
        {
          "value": 300,
          "clue": "The planet closest to the sun.",
          "answer": "What is Mercury?"
        },
        {
          "value": 400,
          "clue": "The speed of light in a vacuum.",
          "answer": "What is approximately 299,792,458 meters per second?"
        },
        {
          "value": 500,
          "clue": "The process by which plants make food using sunlight.",
          "answer": "What is photosynthesis?"
        }
      ]
    },
    {
      "name": "History",
      "questions": [
        {
          "value": 100,
          "clue": "The year World War II ended.",
          "answer": "What is 1945?"
        },
        {
          "value": 200,
          "clue": "The first President of the United States.",
          "answer": "Who is George Washington?"
        },
        {
          "value": 300,
          "clue": "The ancient wonder located in Giza, Egypt.",
          "answer": "What are the Great Pyramids?"
        },
        {
          "value": 400,
          "clue": "The wall that divided East and West Berlin.",
          "answer": "What is the Berlin Wall?"
        },
        {
          "value": 500,
          "clue": "The ship that sank in 1912 after hitting an iceberg.",
          "answer": "What is the Titanic?"
        }
      ]
    },
    {
      "name": "Geography",
      "questions": [
        {
          "value": 100,
          "clue": "The largest ocean on Earth.",
          "answer": "What is the Pacific Ocean?"
        },
        {
          "value": 200,
          "clue": "The longest river in the world.",
          "answer": "What is the Nile River?"
        },
        {
          "value": 300,
          "clue": "The smallest country in the world.",
          "answer": "What is Vatican City?"
        },
        {
          "value": 400,
          "clue": "The mountain range that separates Europe and Asia.",
          "answer": "What are the Ural Mountains?"
        },
        {
          "value": 500,
          "clue": "The country known as the Land of the Rising Sun.",
          "answer": "What is Japan?"
        }
      ]
    },
    {
      "name": "Literature",
      "questions": [
        {
          "value": 100,
          "clue": "The author of 'Romeo and Juliet'.",
          "answer": "Who is William Shakespeare?"
        },
        {
          "value": 200,
          "clue": "The novel about a whale and Captain Ahab.",
          "answer": "What is Moby Dick?"
        },
        {
          "value": 300,
          "clue": "The author who wrote '1984' and 'Animal Farm'.",
          "answer": "Who is George Orwell?"
        },
        {
          "value": 400,
          "clue": "The epic poem about Odysseus's journey home.",
          "answer": "What is The Odyssey?"
        },
        {
          "value": 500,
          "clue": "The author of 'To Kill a Mockingbird'.",
          "answer": "Who is Harper Lee?"
        }
      ]
    },
    {
      "name": "Movies",
      "questions": [
        {
          "value": 100,
          "clue": "The wizard school attended by Harry Potter.",
          "answer": "What is Hogwarts?"
        },
        {
          "value": 200,
          "clue": "The planet where Luke Skywalker grew up.",
          "answer": "What is Tatooine?"
        },
        {
          "value": 300,
          "clue": "The year the first 'Toy Story' movie was released.",
          "answer": "What is 1995?"
        },
        {
          "value": 400,
          "clue": "The actor who played Tony Stark in the Marvel movies.",
          "answer": "Who is Robert Downey Jr.?"
        },
        {
          "value": 500,
          "clue": "The movie with the quote 'May the Force be with you'.",
          "answer": "What is Star Wars?"
        }
      ]
    },
    {
      "name": "Sports",
      "questions": [
        {
          "value": 100,
          "clue": "The number of players on a basketball team on the court.",
          "answer": "What is 5?"
        },
        {
          "value": 200,
          "clue": "The sport played at Wimbledon.",
          "answer": "What is tennis?"
        },
        {
          "value": 300,
          "clue": "The country that won the 2018 FIFA World Cup.",
          "answer": "What is France?"
        },
        {
          "value": 400,
          "clue": "The number of bases in baseball.",
          "answer": "What is 4?"
        },
        {
          "value": 500,
          "clue": "The Olympic event where athletes run 26.2 miles.",
          "answer": "What is the marathon?"
        }
      ]
    }
  ]
};

// Two Rounds template (used automatically when "Enable Two Rounds" is checked)
const twoRoundsTemplateData = {
  round1: JSON.parse(JSON.stringify(questionsData)),
  round2: {
    categories: [
      { name: 'Advanced Science', questions: [
        { value: 100, clue: 'The number of chromosomes in a human cell.', answer: 'What is 46?', explanation: 'Humans have 23 pairs of chromosomes.' },
        { value: 200, clue: 'The element with atomic number 6.', answer: 'What is carbon?', explanation: 'Carbon is the basis of organic chemistry.' },
        { value: 300, clue: 'The process of cell division.', answer: 'What is mitosis?', explanation: 'Mitosis produces two identical daughter cells.' },
        { value: 400, clue: 'The theory that describes the expansion of the universe.', answer: 'What is the Big Bang theory?', explanation: 'The universe began expanding about 13.8 billion years ago.' },
        { value: 500, clue: 'The particle that mediates the electromagnetic force.', answer: 'What is the photon?', explanation: 'Photons are massless particles of light.' }
      ]},
      { name: 'World History', questions: [
        { value: 100, clue: 'The year the Magna Carta was signed.', answer: 'What is 1215?', explanation: 'King John signed it in England.' },
        { value: 200, clue: 'The empire that built the Colosseum.', answer: 'What is the Roman Empire?', explanation: 'The Colosseum was completed in 80 AD.' },
        { value: 300, clue: 'The explorer who reached India by sea in 1498.', answer: 'Who is Vasco da Gama?', explanation: 'Da Gama sailed around the Cape of Good Hope.' },
        { value: 400, clue: 'The treaty that ended World War I.', answer: 'What is the Treaty of Versailles?', explanation: 'Signed in 1919 in France.' },
        { value: 500, clue: 'The dynasty that ruled China for over 400 years.', answer: 'What is the Ming Dynasty?', explanation: 'The Ming ruled from 1368 to 1644.' }
      ]},
      { name: 'World Geography', questions: [
        { value: 100, clue: 'The capital of Australia.', answer: 'What is Canberra?', explanation: 'Canberra is inland; Sydney is the largest city.' },
        { value: 200, clue: 'The country with the most borders.', answer: 'What is China?', explanation: 'China shares borders with 14 countries.' },
        { value: 300, clue: 'The river that flows through Paris.', answer: 'What is the Seine?', explanation: 'The Seine flows through northern France.' },
        { value: 400, clue: 'The strait that separates Africa from Europe.', answer: 'What is the Strait of Gibraltar?', explanation: 'It connects the Atlantic to the Mediterranean.' },
        { value: 500, clue: 'The highest mountain in Africa.', answer: 'What is Mount Kilimanjaro?', explanation: 'Kilimanjaro is in Tanzania.' }
      ]},
      { name: 'Classic Literature', questions: [
        { value: 100, clue: 'The island where Robinson Crusoe was stranded.', answer: 'What is a Caribbean island?', explanation: 'Often identified as Tobago or similar.' },
        { value: 200, clue: "The author of Pride and Prejudice.", answer: 'Who is Jane Austen?', explanation: 'Austen published the novel in 1813.' },
        { value: 300, clue: 'The narrator of The Great Gatsby.', answer: 'Who is Nick Carraway?', explanation: "Nick is Gatsby's neighbor and friend." },
        { value: 400, clue: "The novel that begins with It was the best of times.", answer: 'What is A Tale of Two Cities?', explanation: 'Written by Charles Dickens.' },
        { value: 500, clue: 'The author of Crime and Punishment.', answer: 'Who is Fyodor Dostoevsky?', explanation: 'Dostoevsky was a Russian novelist.' }
      ]},
      { name: 'Documentaries', questions: [
        { value: 100, clue: 'The year the first feature-length documentary was released.', answer: 'What is 1922?', explanation: 'Nanook of the North is often cited.' },
        { value: 200, clue: 'The documentary about March of the Penguins.', answer: 'What is March of the Penguins?', explanation: "French production La Marche de l'empereur." },
        { value: 300, clue: 'The filmmaker behind Planet Earth.', answer: 'Who is David Attenborough?', explanation: 'Attenborough narrated the BBC series.' },
        { value: 400, clue: 'The documentary about climate change by Al Gore.', answer: 'What is An Inconvenient Truth?', explanation: 'Released in 2006.' },
        { value: 500, clue: 'The documentary that exposed conditions in meatpacking.', answer: 'What is The Jungle?', explanation: "Upton Sinclair's 1906 novel inspired reforms." }
      ]},
      { name: 'Olympic Sports', questions: [
        { value: 100, clue: 'The number of rings on the Olympic flag.', answer: 'What is 5?', explanation: 'The rings represent the five continents.' },
        { value: 200, clue: 'The sport in which Usain Bolt competed.', answer: 'What is track and field or sprinting?', explanation: 'Bolt specialized in 100m and 200m.' },
        { value: 300, clue: 'The country that hosted the 2016 Summer Olympics.', answer: 'What is Brazil?', explanation: 'Rio de Janeiro hosted the games.' },
        { value: 400, clue: 'The swimming stroke that mimics a frog.', answer: 'What is the breaststroke?', explanation: 'The breaststroke is one of four competitive strokes.' },
        { value: 500, clue: 'The event combining running swimming and cycling.', answer: 'What is the triathlon?', explanation: 'The triathlon became Olympic in 2000.' }
      ]}
    ]
  }
};

// Ensure round2 questions have explanation field
twoRoundsTemplateData.round2.categories.forEach(function(category) {
    if (category.questions && Array.isArray(category.questions)) {
        category.questions.forEach(function(question) {
            if (!question.hasOwnProperty('explanation')) question.explanation = '';
        });
    }
});

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
        
        // Build the question editor
        buildQuestionEditor();
        
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
function loadGameData() {
    // Store the original embedded questions data for reset purposes
    if (!originalQuestionsData) {
        originalQuestionsData = JSON.parse(JSON.stringify(questionsData));
    }
    
    // Store the embedded questions data in our global variable
    // Make a deep copy so we can edit it without affecting the original
    gameData = JSON.parse(JSON.stringify(questionsData));
    
    // Ensure all questions have an explanation field (initialize to empty string if missing)
    gameData.categories.forEach(category => {
        if (category.questions && Array.isArray(category.questions)) {
            category.questions.forEach(question => {
                if (!question.hasOwnProperty('explanation')) {
                    question.explanation = '';
                }
            });
        }
    });
    // Don't create the board yet - wait for start button
}

// ============================================
// APPLY TWO ROUNDS TEMPLATE / DEFAULT QUESTIONS
// ============================================
function applyTwoRoundsTemplate() {
    gameData = JSON.parse(JSON.stringify(twoRoundsTemplateData.round1));
    round2Data = JSON.parse(JSON.stringify(twoRoundsTemplateData.round2));
    questionsData.categories = gameData.categories;
    gameData.categories.forEach(category => {
        if (category.questions && Array.isArray(category.questions)) {
            category.questions.forEach(question => {
                if (!question.hasOwnProperty('explanation')) question.explanation = '';
            });
        }
    });
    buildQuestionEditor();
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
            });
        }
    });
    buildQuestionEditor();
}

// ============================================
// SET UP HELP BUTTON (Features & Instructions)
// ============================================
function setupHelpButton() {
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const helpCloseBtn = document.getElementById('help-close-btn');
    
    if (helpBtn && helpModal) {
        helpBtn.addEventListener('click', function() {
            helpModal.classList.add('show');
        });
    }
    
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

function getPlayerCount() {
    return playerNames.length;
}

function renderPregamePlayerRows(names) {
    const list = document.getElementById('pregame-players-list');
    if (!list) return;
    const useNames = names && names.length >= MIN_PLAYERS ? names.slice() : ['Player 1', 'Player 2', 'Player 3'];
    list.innerHTML = '';
    useNames.forEach(function(name, idx) {
        const row = document.createElement('div');
        row.className = 'player-setup-item';
        row.innerHTML =
            '<div class="player-input-group">' +
            '<label for="pregame-player-name-' + (idx + 1) + '">Player ' + (idx + 1) + ' Name:</label>' +
            '<input type="text" id="pregame-player-name-' + (idx + 1) + '" class="pregame-player-name" data-player-slot="' + (idx + 1) + '" placeholder="Enter name" value="' + escapeAttr(name) + '">' +
            '</div>';
        list.appendChild(row);
    });
    updateAddPregamePlayerButtonState();
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
    row.innerHTML =
        '<div class="player-input-group">' +
        '<label for="pregame-player-name-' + next + '">Player ' + next + ' Name:</label>' +
        '<input type="text" id="pregame-player-name-' + next + '" class="pregame-player-name" data-player-slot="' + next + '" placeholder="Enter name" value="Player ' + next + '">' +
        '</div>';
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
        timerDuration = parseInt(timerInput.value) || 15;
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
        
        // If two rounds is enabled but we don't have Round 2 data, apply the template
        if (twoRoundsMode && (!round2Data || !round2Data.categories || round2Data.categories.length === 0)) {
            applyTwoRoundsTemplate();
        }
        
        // Hide the start screen
        const startScreen = document.getElementById('start-screen');
        startScreen.classList.remove('show');
        
        // Show the game container
        const gameContainer = document.getElementById('game-container');
        gameContainer.style.display = 'block';
        
        // Mark game as started
        gameStarted = true;
        
        // Initialize the game
        initializeGame();
    });
    
    // When Two Rounds is enabled, automatically load the two-rounds template
    const twoRoundsInput = document.getElementById('two-rounds-mode');
    if (twoRoundsInput) {
        twoRoundsInput.addEventListener('change', function() {
            if (this.checked) {
                applyTwoRoundsTemplate();
            } else {
                applyDefaultQuestions();
            }
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
        categoryHeader.appendChild(categoryNameInput);
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
            
            // Assemble question editor
            questionDiv.appendChild(valueLabel);
            questionDiv.appendChild(valueInput);
            questionDiv.appendChild(clueLabel);
            questionDiv.appendChild(clueInput);
            questionDiv.appendChild(answerLabel);
            questionDiv.appendChild(answerInput);
            questionDiv.appendChild(explanationLabel);
            questionDiv.appendChild(explanationInput);
            
            questionsDiv.appendChild(questionDiv);
        });
        
        categoryDiv.appendChild(questionsDiv);
        editorContainer.appendChild(categoryDiv);
    });
}

// ============================================
// INITIALIZE GAME
// ============================================
function initializeGame() {
    gameStats = { responses: [], finalJeopardy: [] };
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

// ============================================
// CREATE THE GAME BOARD
// ============================================
function createGameBoard() {
    // Get the container where we'll build the board
    const boardContainer = document.getElementById('game-board');
    
    // Clear any existing content
    boardContainer.innerHTML = '';
    
    // Check if we have categories to display
    if (!gameData || !gameData.categories || gameData.categories.length === 0) {
        boardContainer.innerHTML = '<p>No categories found in questions.json</p>';
        return;
    }
    
    // Create the category header row
    const categoryRow = document.createElement('div');
    categoryRow.className = 'category-row';
    
    // Loop through each category and create a header
    gameData.categories.forEach(category => {
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.textContent = category.name;
        categoryRow.appendChild(categoryHeader);
    });
    
    // Add the category row to the board
    boardContainer.appendChild(categoryRow);
    
    // Find the maximum number of questions in any category
    // This ensures we create the right number of rows
    const maxQuestions = Math.max(...gameData.categories.map(cat => cat.questions.length));
    
    // Assign daily doubles randomly to questions
    assignDailyDoubles();
    
    // Create a row for each question value (row 1 = $100, row 2 = $200, etc.)
    for (let i = 0; i < maxQuestions; i++) {
        const questionRow = document.createElement('div');
        questionRow.className = 'question-row';
        
        // For each category, create a question tile
        gameData.categories.forEach(category => {
            // Check if this category has a question at this index
            if (category.questions[i]) {
                const question = category.questions[i];
                
                // Create a tile element
                const tile = document.createElement('div');
                tile.className = 'question-tile';
                
                // Check if this is a daily double
                const isDailyDouble = isQuestionDailyDouble(category, i);
                
                // If hideDailyDoubles is true and this is a daily double, show as regular tile
                // Otherwise, show as daily double tile with 'DD' text
                if (isDailyDouble && !hideDailyDoubles) {
                    // Show daily double visibly
                    tile.classList.add('daily-double');
                    tile.classList.add('daily-double-visible');
                    tile.textContent = 'DD';
                } else {
                    // Show as regular tile (even if it's a hidden daily double)
                    tile.textContent = '$' + getQuestionValue(question);
                }
                
                // Store the question data and category info on the tile element
                // This lets us access it later when the tile is clicked
                const categoryIndex = gameData.categories.indexOf(category);
                tile.dataset.categoryIndex = categoryIndex;
                tile.dataset.questionIndex = i;
                tile.dataset.isDailyDouble = isDailyDouble ? 'true' : 'false';
                // Also store a unique identifier for this question
                tile.dataset.tileId = 'cat-' + categoryIndex + '-q-' + i;
                
                // Store direct reference to the question object on the tile
                // This helps with marking tiles as used even if currentTile reference is lost
                tile._questionRef = question;
                tile._categoryRef = category;
                
                // Add a click event listener to the tile
                tile.addEventListener('click', function() {
                    // Only allow clicking if the tile hasn't been used
                    if (!tile.classList.contains('used')) {
                        // Check if this is a daily double (hidden or visible)
                        if (isDailyDouble) {
                            openDailyDoubleModal(category, question, tile);
                        } else {
                            openQuestionModal(category, question, tile);
                        }
                    }
                });
                
                // Add the tile to the row
                questionRow.appendChild(tile);
            } else {
                // If this category doesn't have a question at this index,
                // create an empty placeholder
                const emptyTile = document.createElement('div');
                emptyTile.className = 'question-tile';
                emptyTile.style.visibility = 'hidden'; // Make it invisible but keep spacing
                questionRow.appendChild(emptyTile);
            }
        });
        
        // Add the question row to the board
        boardContainer.appendChild(questionRow);
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
    currentTile = tile;
    
    // Get the modal element
    const modal = document.getElementById('question-modal');
    
    // Fill in the modal content
    document.getElementById('modal-category').textContent = category.name;
    document.getElementById('modal-value').textContent = '$' + getQuestionValue(question);
    document.getElementById('modal-clue').textContent = question.clue;
    document.getElementById('modal-answer').textContent = question.answer;
    
    // Display explanation if it exists
    const explanationDiv = document.getElementById('modal-explanation');
    if (question.explanation && question.explanation.trim()) {
        explanationDiv.innerHTML = '<p><strong>Explanation:</strong></p><p>' + question.explanation + '</p>';
        explanationDiv.style.display = 'block';
    } else {
        explanationDiv.style.display = 'none';
    }
    
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
        currentResponseTime = timerDuration - timeRemaining;
        
        // Hide the reveal button after showing the answer
        revealBtn.style.display = 'none';
        
        // Stop and fade out the timer
        stopTimer();
        fadeOutTimer();
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
    
    const modal = document.getElementById('question-modal');
    modal.classList.remove('show'); // Hide the modal
    
    // Note: We don't reset currentQuestion and currentTile here
    // They will be reset after the user answers (Correct/Incorrect)
    // This allows the score buttons to work even if the modal is closed
}

// ============================================
// START TIMER
// ============================================
function startTimer() {
    // Stop any existing timer (also stops any playing music)
    stopTimer();
    
    // Play Jeopardy theme - speed proportional to timer (32 sec = 1.0x reference)
    if (!jeopardyThemeAudio) {
        jeopardyThemeAudio = new Audio('Jeopardy Theme.mp3');
    }
    jeopardyThemeAudio.volume = musicVolume;
    const playbackRate = 32 / timerDuration;
    jeopardyThemeAudio.playbackRate = playbackRate;
    jeopardyThemeAudio.currentTime = 0;
    jeopardyThemeAudio.play().catch(function() { /* Autoplay may be blocked */ });
    
    // Reset timer text and color - preserve the HTML structure
    const timerText = document.getElementById('timer-text');
    const timerSeconds = document.getElementById('timer-seconds');
    
    if (timerText) {
        // Reset the text while preserving the span structure
        timerText.innerHTML = 'Time: <span id="timer-seconds">' + timerDuration + '</span>s';
        timerText.style.color = '';
    }
    
    // Set initial time
    timeRemaining = timerDuration;
    updateTimerDisplay();
    
    // Start the countdown
    timerInterval = setInterval(function() {
        timeRemaining--;
        updateTimerDisplay();
        
        // If time runs out
        if (timeRemaining <= 0) {
            stopTimer();
            handleTimerExpired();
        }
    }, 1000); // Update every second
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
// UPDATE TIMER DISPLAY
// ============================================
function updateTimerDisplay() {
    const timerSeconds = document.getElementById('timer-seconds');
    const timerBar = document.getElementById('timer-bar');
    
    if (timerSeconds) {
        timerSeconds.textContent = timeRemaining;
    }
    
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
// SET UP SCORE BUTTONS
// ============================================
function setupScoreButtons() {
    // Get the correct and incorrect buttons
    const correctBtn = document.getElementById('correct-btn');
    const incorrectBtn = document.getElementById('incorrect-btn');
    
    // Helper to record a response to game stats
    function recordResponse(outcome) {
        if (currentQuestion && currentQuestion.category) {
            gameStats.responses.push({
                category: currentQuestion.category.name,
                value: getQuestionValue(currentQuestion),
                responseTimeSeconds: currentResponseTime,
                outcome: outcome,
                playerIndex: currentPlayer - 1,
                isDailyDouble: currentTile && currentTile.dataset.isDailyDouble === 'true'
            });
        }
    }

    // When correct button is clicked
    correctBtn.addEventListener('click', function() {
        if (currentQuestion && currentTile) {
            recordResponse('correct');
            
            // Check if this is a daily double
            const isDailyDouble = currentTile.dataset.isDailyDouble === 'true';
            
            if (isDailyDouble) {
                // For daily doubles, add the wager amount
                playerScores[currentPlayer - 1] += currentWager;
            } else {
                // For regular questions, add the question value (doubled in Round 2)
                playerScores[currentPlayer - 1] += getQuestionValue(currentQuestion);
            }
            
            updateAllScores();
            
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
            recordResponse('incorrect');
            
            // Check if this is a daily double
            const isDailyDouble = currentTile.dataset.isDailyDouble === 'true';
            
            if (isDailyDouble) {
                // For daily doubles, subtract the wager amount
                playerScores[currentPlayer - 1] -= currentWager;
            } else {
                // For regular questions, subtract the question value (doubled in Round 2)
                playerScores[currentPlayer - 1] -= getQuestionValue(currentQuestion);
            }
            
            updateAllScores();
            
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
            recordResponse('no_answer');
            
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
function updateAllScores() {
    const n = getPlayerCount();
    for (let i = 0; i < n; i++) {
        const scoreElement = document.getElementById('score-' + (i + 1));
        if (scoreElement) {
            scoreElement.textContent = playerScores[i];
        }
    }
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
    const total = r.length;
    const correct = r.filter(x => x.outcome === 'correct').length;
    const incorrect = r.filter(x => x.outcome === 'incorrect').length;
    const noAnswer = r.filter(x => x.outcome === 'no_answer').length;
    const answered = correct + incorrect; // excludes no_answer
    
    const times = r.map(x => x.responseTimeSeconds).filter(t => t >= 0);
    const avgTime = times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : '—';
    const fastest = times.length ? Math.min(...times) : '—';
    const slowest = times.length ? Math.max(...times) : '—';
    
    const byCategory = {};
    r.forEach(x => {
        if (!byCategory[x.category]) byCategory[x.category] = { times: [], correct: 0, total: 0 };
        byCategory[x.category].times.push(x.responseTimeSeconds);
        byCategory[x.category].total++;
        if (x.outcome === 'correct') byCategory[x.category].correct++;
    });
    
    // Per-team stats (only correct/incorrect have a player; no_answer has playerIndex from current player when clicked, but we'll exclude no_answer from per-team)
    const pc = Math.max(playerNames.length, 1);
    const byPlayer = Array.from({ length: pc }, function() {
        return { correct: 0, incorrect: 0, times: [], byCategory: {} };
    });
    r.forEach(x => {
        if (x.outcome === 'no_answer') return;
        const i = x.playerIndex;
        if (i >= 0 && i < pc) {
            if (x.outcome === 'correct') byPlayer[i].correct++;
            else byPlayer[i].incorrect++;
            byPlayer[i].times.push(x.responseTimeSeconds);
            if (!byPlayer[i].byCategory[x.category]) byPlayer[i].byCategory[x.category] = { times: [], correct: 0, total: 0 };
            byPlayer[i].byCategory[x.category].total++;
            byPlayer[i].byCategory[x.category].times.push(x.responseTimeSeconds);
            if (x.outcome === 'correct') byPlayer[i].byCategory[x.category].correct++;
        }
    });
    
    const fj = gameStats.finalJeopardy;
    const fjCorrect = fj.filter(x => x.isCorrect).length;
    
    return { total, correct, incorrect, noAnswer, answered, avgTime, fastest, slowest, byCategory, byPlayer, fjCorrect, fjTotal: fj.length };
}

function openStatisticsModal() {
    const modal = document.getElementById('statistics-modal');
    const body = document.getElementById('statistics-body');
    
    const s = computeStatistics();
    
    let html = '';
    
    if (s.total === 0 && s.fjTotal === 0) {
        html = '<p class="stats-empty">No statistics yet. Play some questions to see stats!</p>';
    } else {
        html += '<div class="stats-section"><h3>Overview</h3>';
        html += '<ul class="stats-list">';
        html += '<li>Total questions answered: <strong>' + s.total + '</strong></li>';
        html += '<li>Correct: <strong>' + s.correct + '</strong></li>';
        html += '<li>Incorrect: <strong>' + s.incorrect + '</strong></li>';
        html += '<li>No one answered: <strong>' + s.noAnswer + '</strong></li>';
        if (s.answered > 0) {
            const pct = ((s.correct / s.answered) * 100).toFixed(1);
            html += '<li>Correct % (of answered): <strong>' + pct + '%</strong></li>';
        }
        if (s.fjTotal > 0) {
            html += '<li>Final Jeopardy correct: <strong>' + s.fjCorrect + '/' + s.fjTotal + '</strong></li>';
        }
        html += '</ul></div>';
        
        html += '<div class="stats-section"><h3>Answer Speed</h3>';
        html += '<ul class="stats-list">';
        html += '<li>Average time to answer: <strong>' + s.avgTime + 's</strong></li>';
        html += '<li>Fastest answer: <strong>' + s.fastest + (s.fastest !== '—' ? 's' : '') + '</strong></li>';
        html += '<li>Slowest answer: <strong>' + s.slowest + (s.slowest !== '—' ? 's' : '') + '</strong></li>';
        html += '</ul></div>';
        
        const cats = Object.keys(s.byCategory);
        if (cats.length > 0) {
            html += '<div class="stats-section"><h3>By Category</h3>';
            html += '<ul class="stats-list stats-category-list">';
            cats.forEach(cat => {
                const d = s.byCategory[cat];
                const avg = d.times.length ? (d.times.reduce((a, b) => a + b, 0) / d.times.length).toFixed(1) : '—';
                const pct = d.total ? ((d.correct / d.total) * 100).toFixed(1) : 0;
                html += '<li><strong>' + cat + '</strong>: avg ' + avg + 's, ' + d.correct + '/' + d.total + ' correct (' + pct + '%)</li>';
            });
            html += '</ul></div>';
        }
        
        html += '<div class="stats-section"><h3>Per Team</h3>';
        const teamCount = s.byPlayer.length;
        for (let i = 0; i < teamCount; i++) {
            const p = s.byPlayer[i];
            const answered = p.correct + p.incorrect;
            const avgT = p.times.length ? (p.times.reduce((a, b) => a + b, 0) / p.times.length).toFixed(1) : '—';
            const fastT = p.times.length ? Math.min(...p.times) : '—';
            const slowT = p.times.length ? Math.max(...p.times) : '—';
            const pct = answered ? ((p.correct / answered) * 100).toFixed(1) : '—';
            const fjPlayer = s.fjTotal ? gameStats.finalJeopardy.find(f => f.playerIndex === i) : null;
            const fjStr = fjPlayer !== undefined ? (fjPlayer.isCorrect ? '✓' : '✗') : '—';
            html += '<div class="stats-team-block"><h4>' + playerNames[i] + '</h4><ul class="stats-list">';
            html += '<li>Correct: <strong>' + p.correct + '</strong> | Incorrect: <strong>' + p.incorrect + '</strong> | Correct %: <strong>' + pct + '%</strong></li>';
            html += '<li>Avg answer time: <strong>' + avgT + (avgT !== '—' ? 's' : '') + '</strong> | Fastest: <strong>' + fastT + (fastT !== '—' ? 's' : '') + '</strong> | Slowest: <strong>' + slowT + (slowT !== '—' ? 's' : '') + '</strong></li>';
            html += '<li>Final Jeopardy: <strong>' + fjStr + '</strong></li>';
            const pCats = Object.keys(p.byCategory);
            if (pCats.length > 0) {
                html += '<li class="stats-team-cats">By category: ';
                html += pCats.map(c => {
                    const d = p.byCategory[c];
                    const avg = d.times.length ? (d.times.reduce((a, b) => a + b, 0) / d.times.length).toFixed(1) : '—';
                    return c + ' ' + d.correct + '/' + d.total + ' (' + avg + 's avg)';
                }).join(' · ');
                html += '</li>';
            }
            html += '</ul></div>';
        }
        html += '</div>';
    }
    
    body.innerHTML = html;
    modal.classList.add('show');
}

function closeStatisticsModal() {
    document.getElementById('statistics-modal').classList.remove('show');
}

function setupStatisticsModal() {
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
    const newTimerDuration = parseInt(document.getElementById('settings-timer-duration').value) || 15;
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
    
    // Close the modal
    closeSettingsModal();
}

// ============================================
// RESTART GAME
// ============================================
function restartGame() {
    // Stop any running timer
    stopTimer();
    stopFinalJeopardyTimer();
    
    // Reset game state
    playerNames = ['Player 1', 'Player 2', 'Player 3'];
    playerScores = [0, 0, 0];
    currentPlayer = 1;
    currentQuestion = null;
    gameStats = { responses: [], finalJeopardy: [] };
    currentTile = null;
    gameStarted = false;
    timerDuration = 15; // Reset to default
    finalJeopardyTimerDuration = 30;
    currentWager = 0; // Reset wager
    dailyDoubleCount = 2; // Reset daily double count
    dailyDoubleQuestions = []; // Reset daily double assignments
    hideDailyDoubles = true; // Reset hide daily doubles setting
    twoRoundsMode = false; // Reset two rounds mode
    round2Data = null; // Reset Round 2 data
    currentRound = 1; // Reset to Round 1
    round1FinalScores = [0, 0, 0];
    
    // Reset game data to original (use originalQuestionsData if available, otherwise questionsData)
    const dataToReset = originalQuestionsData || questionsData;
    gameData = JSON.parse(JSON.stringify(dataToReset));
    
    // Also reset questionsData to original if it was modified
    if (originalQuestionsData) {
        questionsData.categories = JSON.parse(JSON.stringify(originalQuestionsData.categories));
    }
    
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
    document.getElementById('timer-duration').value = 15;
    const finalTimerEl = document.getElementById('final-timer-duration');
    if (finalTimerEl) finalTimerEl.value = 30;
    document.getElementById('daily-double-count').value = 2;
    document.getElementById('hide-daily-doubles').checked = true;
    const twoRoundsCheckbox = document.getElementById('two-rounds-mode');
    if (twoRoundsCheckbox) twoRoundsCheckbox.checked = false;
    
    // Reset daily double count and settings
    dailyDoubleCount = 2;
    dailyDoubleQuestions = [];
    currentWager = 0;
    hideDailyDoubles = true;
    
    // Reset Final Jeopardy state
    finalJeopardyWagers = [0, 0, 0];
    finalJeopardyQuestion = null;
    finalJeopardyAnswered = false;
    
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
        importStatus.textContent = '';
        importStatus.style.color = '';
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
            importStatus.textContent = '';
        }
    });
    
    // When import button is clicked
    importQuestionsBtn.addEventListener('click', function() {
        if (!selectedFile) {
            importStatus.textContent = 'Please select a file first.';
            importStatus.style.color = 'red';
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
                                    });
                                }
                            });
                        }
                    }
                    
                    if (importedData.round1 && importedData.round2) {
                        // Two-rounds format
                        ensureExplanations(importedData.round1);
                        ensureExplanations(importedData.round2);
                        gameData = importedData.round1;
                        round2Data = importedData.round2;
                        questionsData.categories = importedData.round1.categories;
                        buildQuestionEditor();
                        importStatus.textContent = 'Questions imported! Round 1: ' + importedData.round1.categories.length + ' categories, Round 2: ' + importedData.round2.categories.length + ' categories.';
                        importStatus.style.color = 'green';
                    } else if (importedData.categories && Array.isArray(importedData.categories)) {
                        ensureExplanations(importedData);
                        gameData = importedData;
                        round2Data = null;
                        questionsData.categories = importedData.categories;
                        buildQuestionEditor();
                        importStatus.textContent = 'Questions imported successfully! ' + importedData.categories.length + ' category/categories loaded.';
                        importStatus.style.color = 'green';
                    } else {
                        throw new Error('Invalid JSON format. Expected "categories" array or "round1"/"round2" objects.');
                    }
                } else if (fileExtension === 'csv') {
                    // Import CSV file
                    const csvText = e.target.result;
                    const importedData = parseCSV(csvText);
                    if (importedData) {
                        if (importedData.round1 && importedData.round2) {
                            // Two-rounds format
                            gameData = importedData.round1;
                            round2Data = importedData.round2;
                            questionsData.categories = importedData.round1.categories;
                            buildQuestionEditor();
                            importStatus.textContent = 'Questions imported! Round 1: ' + importedData.round1.categories.length + ' categories, Round 2: ' + importedData.round2.categories.length + ' categories.';
                        } else if (importedData.categories && importedData.categories.length > 0) {
                            gameData = importedData;
                            round2Data = null;
                            questionsData.categories = importedData.categories;
                            buildQuestionEditor();
                            importStatus.textContent = 'Questions imported successfully! ' + importedData.categories.length + ' category/categories loaded.';
                        } else {
                            throw new Error('Invalid CSV format or empty file.');
                        }
                        importStatus.style.color = 'green';
                    } else {
                        throw new Error('Invalid CSV format or empty file.');
                    }
                } else {
                    throw new Error('Unsupported file format. Please use CSV or JSON.');
                }
            } catch (error) {
                importStatus.textContent = 'Error importing file: ' + error.message;
                importStatus.style.color = 'red';
                console.error('Import error:', error);
            }
        };
        
        reader.onerror = function() {
            importStatus.textContent = 'Error reading file.';
            importStatus.style.color = 'red';
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
    const expectedHeaders = ['Category', 'Value', 'Clue', 'Answer', 'Explanation', 'Round'];
    const headerIndexes = {};
    
    expectedHeaders.forEach(header => {
        const index = headers.findIndex(h => h.trim().toLowerCase() === header.toLowerCase());
        if (index === -1 && header !== 'Explanation' && header !== 'Round') {
            throw new Error('Missing required column: ' + header);
        }
        headerIndexes[header.toLowerCase()] = index;
    });
    
    const hasRoundColumn = headerIndexes['round'] >= 0;
    
    // Group questions by category and round
    const round1Map = {};
    const round2Map = {};
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        if (values.length < 4) {
            continue; // Skip invalid rows
        }
        
        const category = safeTrim(values[headerIndexes['category']]);
        const value = parseInt(safeTrim(values[headerIndexes['value']]), 10) || 100;
        const clue = safeTrim(values[headerIndexes['clue']]);
        const answer = safeTrim(values[headerIndexes['answer']]);
        const explanation = headerIndexes['explanation'] >= 0 ? safeTrim(values[headerIndexes['explanation']]) : '';
        const roundValRaw = hasRoundColumn ? safeTrim(values[headerIndexes['round']]).toLowerCase() : '1';
        const roundVal = roundValRaw || '1';
        const isRound2 = roundVal === '2' || roundVal === 'round2';
        
        if (!category || !clue || !answer) {
            continue; // Skip rows with missing required fields
        }
        
        const categoriesMap = isRound2 ? round2Map : round1Map;
        if (!categoriesMap[category]) {
            categoriesMap[category] = [];
        }
        
        categoriesMap[category].push({
            value: value,
            clue: clue,
            answer: answer,
            explanation: explanation
        });
    }
    
    function mapToCategories(map) {
        return Object.keys(map).map(categoryName => ({
            name: categoryName,
            questions: map[categoryName]
        }));
    }
    
    const round1Categories = mapToCategories(round1Map);
    const round2Categories = mapToCategories(round2Map);
    
    // If we have Round 2 data, return both
    if (round2Categories.length > 0) {
        return {
            round1: { categories: round1Categories },
            round2: { categories: round2Categories }
        };
    }
    
    return { categories: round1Categories };
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
        tileToMark.classList.add('used');
        tileToMark.style.pointerEvents = 'none';
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
        if (tile.style.visibility !== 'hidden' && !tile.classList.contains('used')) {
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
    // Find the highest value question to use as Final Jeopardy
    let highestValue = 0;
    let finalQuestion = null;
    let finalCategory = null;
    
    gameData.categories.forEach(category => {
        category.questions.forEach(question => {
            if (question.value > highestValue) {
                highestValue = question.value;
                finalQuestion = question;
                finalCategory = category;
            }
        });
    });
    
    // Store the Final Jeopardy question
    finalJeopardyQuestion = {
        category: finalCategory,
        question: finalQuestion
    };
    
    // Show the Final Jeopardy intro screen
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
    const continueBtn = document.getElementById('round2-continue-btn');
    if (continueBtn) {
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
    // Final Jeopardy intro continue button
    const continueBtn = document.getElementById('final-jeopardy-continue-btn');
    continueBtn.addEventListener('click', function() {
        // Close intro modal
        const introModal = document.getElementById('final-jeopardy-intro-modal');
        introModal.classList.remove('show');
        
        // Show wager modal
        openFinalJeopardyWagerModal();
    });
    
    // Final Jeopardy wager next button
    const wagerNextBtn = document.getElementById('final-jeopardy-wager-next-btn');
    wagerNextBtn.addEventListener('click', function() {
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
        
        if (twoRoundsMode && round2Data && round2Data.categories && round2Data.categories.length > 0) {
            if (currentRound === 1) {
                // Save Round 1 scores and show Round 2 intro
                round1FinalScores = [...playerScores];
                showRound2Intro();
            } else {
                // End of Round 2: show final scores summary
                showFinalScoresModal();
            }
        }
    });
}

// ============================================
// OPEN FINAL JEOPARDY WAGER MODAL
// ============================================
function openFinalJeopardyWagerModal() {
    const wagerModal = document.getElementById('final-jeopardy-wager-modal');
    const wagersHost = document.getElementById('final-jeopardy-wagers-container');
    if (wagersHost) {
        wagersHost.innerHTML = buildFinalJeopardyWagersMarkup();
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
        document.getElementById('final-jeopardy-category-name').textContent = finalJeopardyQuestion.category.name;
        document.getElementById('final-jeopardy-clue').textContent = finalJeopardyQuestion.question.clue;
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
        
        document.getElementById('final-jeopardy-answer-category-name').textContent = category.name;
        document.getElementById('final-jeopardy-answer-text').textContent = question.answer;
        
        const explanationDiv = document.getElementById('final-jeopardy-explanation');
        if (question.explanation && question.explanation.trim()) {
            explanationDiv.innerHTML = '<p><strong>Explanation:</strong></p><p>' + question.explanation + '</p>';
            explanationDiv.style.display = 'block';
        } else {
            explanationDiv.style.display = 'none';
        }
        
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
    
    gameStats.finalJeopardy.push({ playerIndex, isCorrect });
    
    const wager = finalJeopardyWagers[playerIndex] || 0;
    
    if (isCorrect) {
        playerScores[playerIndex] += wager;
    } else {
        playerScores[playerIndex] -= wager;
    }
    
    updateAllScores();
    
    // Update the results display
    const scoreElement = document.getElementById('final-result-score-' + playerNum);
    if (scoreElement) {
        const result = isCorrect ? '✓ Correct' : '✗ Incorrect';
        scoreElement.textContent = result + ' → Final Score: ' + playerScores[playerIndex];
    }
}

