# Jeopardy Trivia Game — Features & Instructions

Browser-based Jeopardy for 2–8 teams. Open `index.html` to play. Press **?** on the setup screen or during a game for quick help and template downloads.

> **Note:** AI question generation is hidden in the UI (`ai-features-hidden` in `index.html`). Remove that class to show it again.

---

## 1. Game setup

**Timers**
- **Question timer** (5–120 s, default 30) — starts when a clue opens; stops on **Reveal Answer**.
- **Final Jeopardy timer** (5–300 s, default 30) — for the final clue after wagers.
- **Wager timer** — fixed **30 s** on the Final Jeopardy wager screen. Click **Start 30s Wager Timer** while teams write wagers; the **category appears only after** you start the timer. A low beep plays when time is up.

**Timer music** — Jeopardy-style theme during question timers. Adjust volume on setup or in **Settings** (saved in the browser).

**Daily Doubles** — Count 0–10 (default 2), placed randomly. **Hide Daily Doubles Until Clicked** (default on) keeps them looking like normal values until picked. Wager up to current score or **500** if lower; correct adds the wager, wrong subtracts it.

**Two rounds** (default on) — Loads the built-in two-round template (6 categories × 5 questions per round, both finals). Round 2 **doubles displayed values** and **resets scores to 0**. Flow: Round 1 board → Round 1 Final → **ROUND 2** screen → Round 2 board → Round 2 Final → **Game Complete** totals (Round 1 + Round 2 + combined).

**Teams** — Name each team (defaults: Player 1, 2, 3). **Add player** for up to **8** teams (minimum **2**).

**Team buzzer** (default on) — Each team gets a unique key (**Set key**; defaults `1`, `2`, `3`, …). First buzz: high beep, team auto-selected, main timer pauses, **answer timer** runs (default 10 s, 3–60 in setup/Settings). When answer time ends: low beep. With **Continue question timer** enabled (default), other teams can buzz again; teams that already buzzed cannot rebuzz on that clue. Host still uses **Reveal Answer** and **Correct** / **Incorrect** / **Pass**.

**Import questions** — **Choose File** → **Import Questions** (CSV or JSON, UTF-8). Main template: **[Google Sheets — two rounds](https://docs.google.com/spreadsheets/d/1iUcKHwgEgz0MtHszJZzVvbmI27ZPFokaOcYrAmBg47A/edit?usp=sharing)** or offline **`jeopardy_import_full_example_two_rounds.csv`** / **`.json`**. Enable **Two Rounds** when using the two-round template. Column details: **IMPORT_TEMPLATE.md**.

**Vietnamese (optional)** — English required. Optional `CategoryVI`, `ClueVI`, `AnswerVI`, `ExplanationVI` (or JSON `*Vi` fields). When present, Vietnamese shows **below English in yellow**.

**Editor** — **Show Editor** to edit board categories/clues and **Final Jeopardy** at the bottom (no CSV row required). If Final Jeopardy is empty, the game falls back to the highest-value board question.

**Start Game** — Begins with current options and question set.

---

## 2. During the game

**Board** — Click a dollar value to open the clue. Used tiles gray out. On screens **≤1000px wide**, categories stack as accordions; wider screens use a fixed grid.

**Who’s answering** — Select a team button before scoring.

**Scoring**
- **Correct** — selected team gains points (or Daily Double wager).
- **Incorrect** — selected team loses points (or wager).
- **Pass** — no score change; tile still clears.

**Clue window** — **Reveal Answer** shows the response and optional explanation. **Close** exits without scoring.

**Daily Double** — Enter wager → **Next** → read clue → score as usual.

**Skip to Final Jeopardy** — Ends the current round’s board early. Not available after that round’s Final Jeopardy is finished.

---

## 3. Final Jeopardy

Intro → wager screen → clue → **Reveal Answer** → mark each team correct or wrong → **Close**.

Each team wagers up to their score (or **500** if lower). Correct adds the wager; incorrect subtracts it (same rule as Daily Double).

---

## 4. Settings & statistics

**Settings** (gear icon) — Edit all team scores and names; change question timer, Final Jeopardy timer, buzzer answer timer, and music volume; open statistics; **Restart Game** returns to setup.

**Statistics** (chart icon) — Live overview, answer speed, performance by category, and per team. Updates while the modal is open.

---

## 5. Template files

| Resource | Use |
|----------|-----|
| [Google Sheets — two rounds](https://docs.google.com/spreadsheets/d/1iUcKHwgEgz0MtHszJZzVvbmI27ZPFokaOcYrAmBg47A/edit?usp=sharing) | Main editable template |
| `jeopardy_import_full_example_two_rounds.csv` / `.json` | Offline copies |
| `IMPORT_TEMPLATE.md` | CSV/JSON column reference |

Download links are also in the **?** help menu.

---

## Quick summary

Two to eight teams · built-in or imported two-round content · optional Vietnamese · Daily Doubles · team buzzer · per-question and Final Jeopardy timers · live statistics · mid-game settings · combined scores after two rounds.
