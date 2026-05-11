# Jeopardy Trivia Game — Features & Instructions

This document lists every feature in the game and how to use it.

> **Note:** AI question generation is **hidden in the game UI for now** (the section is still in the code behind the `ai-features-hidden` class). Remove that class from the AI setup block in `index.html` to show it again.

---

## 1. GAME SETUP (Start Screen)

### 1.1 Timer Settings
- **What it is:** Sets how many seconds players have to answer each question once the clue is revealed.
- **How to use:** Enter a number in "Question Timer (seconds)". Minimum 5, maximum 120. Default is 30.
- **What is possible:** You can make rounds fast (e.g. 15 seconds) or slow (e.g. 60 seconds). The timer bar and countdown show during each question.

### 1.2 Daily Double Settings
- **Number of Daily Doubles:** How many questions on the board are Daily Doubles (0–10). Default is 2. They are placed randomly.
- **Hide Daily Doubles Until Clicked:** If checked (default), Daily Doubles look like normal dollar amounts until a player picks that question. If unchecked, they show "DD" on the board.
- **How to use:** Set the count and choose whether to hide or show them. During play, when a Daily Double is selected, the player enters a wager (up to their score or 500 if lower), then answers; correct adds the wager, wrong subtracts it.

### 1.3 Game Mode — Two Rounds
- **What it is:** A second round after the first Final Jeopardy. Round 2 uses new categories and questions; point values are doubled (e.g. 100→200, 200→400). Scores reset to zero at the start of Round 2.
- **How to use:** Check "Enable Two Rounds". The built‑in two-rounds template (6 categories per round) loads automatically. You can still import your own CSV/JSON to replace it.
- **What is possible:** Play Round 1 → First Final Jeopardy → "ROUND 2" screen → Round 2 (double points, fresh scores) → Second Final Jeopardy → Final Scores screen showing Round 1, Round 2, and Total for each team.

### 1.4 Player Setup
- **What it is:** Names for the three players/teams.
- **How to use:** Type names in the three "Player 1/2/3 Name" fields. Defaults are "Player 1", "Player 2", "Player 3". These appear on the scoreboard and in modals during the game.

### 1.5 Generate Questions with AI *(hidden in UI for now)*
- **What it is:** Uses OpenAI’s API to generate Jeopardy-style questions for categories you specify.
- **How to use:** Enter your OpenAI API key (stored locally), choose a model (e.g. GPT-3.5 Turbo), list one category per line (e.g. 6 categories), set "Questions per category" (e.g. 5), then click "Generate Questions with AI". The game and editor update with the new questions.
- **What is possible:** You can generate a full board without writing questions yourself. API key and model choice are saved in the browser. Free-tier users may need to add payment at OpenAI; GPT-3.5 Turbo is recommended for free tier.

### 1.6 Import Questions
- **What it is:** Load questions from a CSV or JSON file.
- **How to use:** Click "Choose File", select a .csv or .json file, then click "Import Questions". The game and editor show the imported categories and questions.
- **Single-round format:** CSV columns: Category, Value, Clue, Answer, Explanation (optional). JSON: `{ "categories": [ { "name": "...", "questions": [ { "value", "clue", "answer", "explanation" } ] } ] }`.
- **Two-round format:** CSV: add a "Round" column with values 1 or 2; Round 1 rows and Round 2 rows are separated. JSON: `{ "round1": { "categories": [...] }, "round2": { "categories": [...] } }`. Use the template file `jeopardy_import_template_two_rounds.csv` as an example.

### 1.7 Edit Questions & Answers
- **What it is:** An editor to change category names, point values, clues, answers, and optional explanations.
- **How to use:** Click "Show Editor" on the start screen. Edit the fields for each category and question. Changes are kept in memory until you import new data or restart. Click "Hide Editor" to collapse it.

### 1.8 Start Game
- **What it is:** Begins the game with the current setup and question set.
- **How to use:** After configuring options (and optionally importing or generating questions), click "Start Game". The start screen hides and the game board and scoreboard appear.

---

## 2. DURING THE GAME

### 2.1 Game Board
- **What it is:** A grid of categories (columns) and point values (rows). Each cell is a question.
- **How to use:** Click a dollar amount to open that question. Used questions are grayed out and unclickable. In Round 2, displayed values are doubled (e.g. $200 instead of $100).

### 2.2 Player Selector
- **What it is:** Buttons for Player 1, Player 2, and Player 3 to indicate who is answering.
- **How to use:** Before or after a question, click the player who is answering. The active player is highlighted. Use this so the correct player gets credit when you mark the answer Correct or Incorrect.

### 2.3 Score Action Buttons (Correct / Incorrect / No Answer)
- **Correct:** The selected player gains the question’s point value (or Daily Double wager). The tile is marked used and the question modal closes.
- **Incorrect:** The selected player loses the question’s point value (or Daily Double wager). The tile is marked used and the modal closes.
- **No Answer (trash icon):** No one answered; no score change. The tile is marked used and the modal closes.
- **How to use:** After revealing the answer (or when time is up), choose the answering player with the player selector, then click Correct, Incorrect, or No Answer.

### 2.4 Question Modal
- **What it is:** The popup that shows the category, point value, clue, and (after you reveal) the answer and optional explanation.
- **How to use:** Click a tile to open it. The timer starts. Click "Reveal Answer" to show the answer and stop the timer. Then use the score buttons. You can close the modal with "Close" (e.g. if you need to fix the board or settings without scoring).

### 2.5 Timer (per question)
- **What it is:** A countdown and bar for the time allowed to answer.
- **How to use:** It starts when the question opens. When you click "Reveal Answer", the timer stops and the response time is recorded for statistics. If time runs out, "Time’s Up!" is shown; you can still mark Correct/Incorrect/No Answer.

### 2.6 Daily Double (when selected)
- **What it is:** A special question where the player wagers before seeing the clue.
- **How to use:** When a Daily Double is chosen, a wager modal appears. Enter a wager (up to current score, or 500 if score is below 500). Click Next to see the clue. Correct adds the wager; incorrect subtracts it.

### 2.7 Skip to Final Jeopardy
- **What it is:** A button that ends the current round’s board and goes straight to Final Jeopardy.
- **How to use:** Click "Skip to Final Jeopardy" when you want to stop picking questions and run Final Jeopardy. All remaining tiles are marked used. You cannot skip if Final Jeopardy for that round has already been completed.

---

## 3. FINAL JEOPARDY

### 3.1 Final Jeopardy Flow
- **What it is:** One final question per round. Each player wagers, then everyone answers the same clue. You mark each player correct or incorrect; their score changes by + or − their wager.
- **How to use:** When all board questions are used (or you skip), the "FINAL JEOPARDY!" intro appears. Click Continue → enter each player’s wager → Continue to Question → read the clue → Reveal Answer → mark each player Correct or Incorrect → Close.

### 3.2 Wagers
- **What it is:** Each player can risk up to their current score (or 500 if they have less than 500).
- **How to use:** Type each wager in the Final Jeopardy wager modal. Values are capped automatically. Wagers are applied when you mark answers in the Final Jeopardy answer modal.

---

## 4. TWO ROUNDS MODE (if enabled)

### 4.1 Round 2 Transition
- **What it is:** After you close the first Final Jeopardy, a "ROUND 2" screen appears. Round 2 uses new categories and questions; point values are doubled; scores reset to 0.
- **How to use:** Close the first Final Jeopardy answer modal. The "ROUND 2" screen appears. Click Continue to load the Round 2 board and start Round 2.

### 4.2 Round 2 Board and Scoring
- **What it is:** Same rules as Round 1, but each question’s value is doubled (100→200, 200→400, etc.) and all player scores start at 0.
- **How to use:** Play Round 2 the same way as Round 1. When all Round 2 questions are done (or you skip), Final Jeopardy for Round 2 runs.

### 4.3 Final Scores (end of Round 2)
- **What it is:** A summary screen showing, for each team: Round 1 score, Round 2 score, and Total (Round 1 + Round 2).
- **How to use:** After you close the Round 2 Final Jeopardy answer modal, the "Game Complete!" modal appears with the table. Click Close to dismiss it.

---

## 5. SETTINGS (gear icon)

### 5.1 Opening Settings
- **What it is:** A modal to change scores, player names, and timer during the game.
- **How to use:** Click the gear (⚙️) button in the top area. The settings modal opens.

### 5.2 Adjust Scores
- **What it is:** Manually set each player’s score (e.g. to fix a mistake).
- **How to use:** Edit the three score fields, then click "Apply Changes". The scoreboard updates.

### 5.3 Change Player Names
- **What it is:** Change the three players’ names during the game.
- **How to use:** Edit the name fields and click "Apply Changes". Labels and buttons update.

### 5.4 Timer Settings (in-game)
- **What it is:** Change the question timer for the rest of the game.
- **How to use:** Set "Question Timer (seconds)" and click "Apply Changes". If a question is open, the timer restarts with the new duration.

### 5.5 View Statistics
- **What it is:** Opens the same Statistics modal as the stats button (see below).
- **How to use:** Click "View Statistics" inside the settings modal.

### 5.6 Apply Changes
- **What it is:** Saves the score, name, and timer edits and closes the settings modal.
- **How to use:** After editing, click "Apply Changes".

### 5.7 Restart Game
- **What it is:** Ends the current game and returns to the start screen. All settings and question data are reset to defaults (or last imported/generated set).
- **How to use:** Click "Restart Game". The start screen appears again; you can change options and start a new game.

---

## 6. STATISTICS (chart icon)

### 6.1 Opening Statistics
- **What it is:** A modal with game statistics (overview, speed, by category, per team).
- **How to use:** Click the chart (📊) button in the top area. The statistics modal opens. You can also open it from Settings → "View Statistics".

### 6.2 Overview
- **What it is:** Total questions answered, correct/incorrect/no-answer counts, correct percentage, and Final Jeopardy correct count.
- **How to use:** Read the overview section at the top of the statistics modal.

### 6.3 Answer Speed
- **What it is:** Average, fastest, and slowest time to answer (from question open to "Reveal Answer").
- **How to use:** Check the "Answer Speed" section.

### 6.4 By Category
- **What it is:** For each category: average answer time, correct/total, and correct percentage.
- **How to use:** Scroll to "By Category" to see performance per category.

### 6.5 Per Team
- **What it is:** For each player: correct/incorrect, correct %, average/fastest/slowest answer time, Final Jeopardy result, and breakdown by category.
- **How to use:** Scroll to "Per Team" to compare players.

### 6.6 Closing Statistics
- **What it is:** Dismissing the statistics modal.
- **How to use:** Click the × or click outside the modal.

---

## 7. TEMPLATE FILES

- **jeopardy_import_template.csv:** Example CSV for a single round (categories and questions).
- **jeopardy_import_template_two_rounds.csv:** Example CSV for two rounds; includes a "Round" column (1 or 2) and 6 categories per round.
- **IMPORT_TEMPLATE.md:** Detailed CSV and JSON format guide for importing questions.

---

## 8. WHAT IS POSSIBLE (SUMMARY)

- Play with 3 players/teams and custom names.
- Use built-in questions or your own CSV/JSON (AI generation is hidden in the UI for now).
- Set timer (5–120 seconds), number of Daily Doubles (0–10), and whether Daily Doubles are hidden.
- Run one round or two rounds (with automatic two-rounds template and final score summary).
- Edit every category and question in the editor before starting.
- During the game: pick questions, select answering player, mark Correct/Incorrect/No Answer, use Daily Doubles and Final Jeopardy, skip to Final Jeopardy.
- Adjust scores, names, and timer mid-game via Settings; view statistics anytime; restart to go back to setup.
