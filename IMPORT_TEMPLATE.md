# Jeopardy Game — Import Template Guide

Use the **full two-round Google Sheets template** as your starting point (download from the game **?** help menu or use the link below):

**[Google Sheets — two rounds template](https://docs.google.com/spreadsheets/d/1iUcKHwgEgz0MtHszJZzVvbmI27ZPFokaOcYrAmBg47A/edit?usp=sharing)** *(main template)*

Edit online, then **File → Download → Comma Separated Values (.csv)** and import into the game. You can also use the offline copies:

| File | Description |
|------|-------------|
| **`jeopardy_import_full_example_two_rounds.csv`** | Same content as the Google Sheet, for download without Sheets. |
| **`jeopardy_import_full_example_two_rounds.json`** | Same content in JSON (`round1` / `round2`). |

**Google Sheets tip:** Use **File → Download → CSV** (UTF-8). In Excel, use **Save As → CSV UTF-8** instead.

Enable **Two Rounds** in Game Setup when using this template.

---

## Vietnamese is optional

English columns (**Category**, **Clue**, **Answer**, **Explanation**) are required for board play. Vietnamese columns are **optional**:

| Column | Required? |
|--------|-----------|
| **Category**, **Clue**, **Answer** | Yes (English) |
| **Explanation** | Optional |
| **CategoryVI**, **ClueVI**, **AnswerVI**, **ExplanationVI** | Optional |

- Leave any `*VI` cell **empty** if you only want English for that item.
- When Vietnamese text is present, the game shows **English on top** and **Vietnamese below in yellow** (categories use slightly smaller yellow text).
- You can delete the `*VI` columns entirely from your spreadsheet if you never use Vietnamese.

Flexible header names work too: `Category (VI)`, `Clue_VI`, `HintVI` (maps to explanation), etc.

---

## CSV columns

```csv
Type,Round,Category,CategoryVI,Value,Clue,Answer,Explanation,ClueVI,AnswerVI,ExplanationVI
```

| Column | Description |
|--------|-------------|
| **Type** | `board` = normal tile (default). `final` = Final Jeopardy for that round. |
| **Round** | `1` or `2`. |
| **Category** | English category name (group rows with the same name into one column). |
| **CategoryVI** | Optional Vietnamese category. |
| **Value** | 100–500 for board rows. **Blank for `final` rows.** |
| **Clue** / **Answer** | English question and answer. |
| **Explanation** | Optional host note after reveal. |
| **ClueVI** / **AnswerVI** / **ExplanationVI** | Optional Vietnamese (yellow below English in play). |

### Board row example

```csv
board,1,Science,Khoa học,100,"The powerhouse of the cell.","What is the mitochondria?","Optional note.","Bào quan tạo năng lượng cho tế bào.","Thành phần ti thể là gì?","Ghi chú tiếng Việt."
```

### Final Jeopardy row example

```csv
final,1,Round 1 Final,Final vòng 1,,"This gas makes up about 78% of Earth's atmosphere.","What is nitrogen?","","Khí này chiếm khoảng 78% khí quyển Trái Đất?","Nito là gì?",""
```

---

## JSON format (two rounds)

```json
{
  "round1": {
    "categories": [
      {
        "name": "Science",
        "nameVi": "Khoa học",
        "questions": [
          {
            "value": 100,
            "clue": "English clue.",
            "answer": "What is the answer?",
            "explanation": "",
            "clueVi": "",
            "answerVi": "",
            "explanationVi": ""
          }
        ]
      }
    ],
    "finalJeopardy": {
      "category": "Round 1 Final",
      "categoryVi": "Final vòng 1",
      "clue": "English final clue.",
      "answer": "What is the answer?",
      "explanation": "",
      "clueVi": "",
      "answerVi": "",
      "explanationVi": ""
    }
  },
  "round2": {
    "categories": [ ],
    "finalJeopardy": { }
  }
}
```

Omit `nameVi`, `clueVi`, `answerVi`, `explanationVi`, and `categoryVi` (or set them to `""`) when you only need English.

---

## Import steps

1. Open the **[Google Sheets template](https://docs.google.com/spreadsheets/d/1iUcKHwgEgz0MtHszJZzVvbmI27ZPFokaOcYrAmBg47A/edit?usp=sharing)** (or download **`jeopardy_import_full_example_two_rounds.csv`** / `.json`).
2. Edit questions. Download as **CSV** from Google Sheets (**File → Download → CSV**) if needed.
2. **Import Questions** → **Choose File** → **Import Questions**.
3. Open **Show Editor** to review board questions and **Final Jeopardy** at the bottom.
4. Turn on **Two Rounds** in setup, then **Start Game**.

## Tips

- Quote fields that contain commas.
- Final Jeopardy can also be set in the **Editor** without a CSV row.
- Answer format: "What is…?" / "Who is…?" or Vietnamese forms like "Đây là gì …?"
