# Jeopardy Game - Import Template Guide

This document explains how to import questions into the Jeopardy game using CSV or JSON format.

## CSV Format

### File Structure
The CSV file must have the following columns in order:
- **Category** (required): The name of the category
- **Value** (required): The point value of the question (e.g., 100, 200, 300, 400, 500)
- **Clue** (required): The question/clue text
- **Answer** (required): The answer in Jeopardy format (e.g., "What is...?" or "Who is...?")
- **Explanation** (optional): Additional explanation about the answer

### CSV Example
```csv
Category,Value,Clue,Answer,Explanation
Science,100,"The powerhouse of the cell.","What is the mitochondria?","Mitochondria are organelles found in most cells that generate energy through cellular respiration."
Science,200,"The chemical symbol for water.","What is H2O?","H2O is the chemical formula for water, consisting of two hydrogen atoms and one oxygen atom."
History,100,"The year World War II ended.","What is 1945?","World War II ended in 1945 when Japan surrendered after atomic bombs were dropped on Hiroshima and Nagasaki."
```

### Notes:
- Use quotes around text that contains commas
- The Explanation column is optional but recommended
- Questions will be automatically grouped by Category
- Value should be a number (typically 100, 200, 300, 400, 500)

## JSON Format

### File Structure
The JSON file must follow this structure:

```json
{
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
          "answer": "What is H2O?",
          "explanation": "H2O is the chemical formula for water, consisting of two hydrogen atoms and one oxygen atom."
        }
      ]
    },
    {
      "name": "History",
      "questions": [
        {
          "value": 100,
          "clue": "The year World War II ended.",
          "answer": "What is 1945?",
          "explanation": "World War II ended in 1945 when Japan surrendered after atomic bombs were dropped on Hiroshima and Nagasaki."
        }
      ]
    }
  ]
}
```

### JSON Field Descriptions:
- **categories** (required): Array of category objects
- **name** (required): Category name
- **questions** (required): Array of question objects
- **value** (required): Point value (number)
- **clue** (required): Question/clue text (string)
- **answer** (required): Answer in Jeopardy format (string)
- **explanation** (optional): Additional explanation (string)

## Import Instructions

1. **Prepare your file**: Create a CSV or JSON file following the format above
2. **Go to the Start Screen**: Open the game and you'll see the "Import Questions" section
3. **Choose File**: Click the "Choose File" button and select your CSV or JSON file
4. **Import**: Click the "Import Questions" button that appears
5. **Verify**: Check the status message to confirm the import was successful
6. **Edit if needed**: You can use the Question Editor to make any adjustments
7. **Start Game**: Click the "Start Game" button to begin playing with your imported questions

## Tips

- **Excel/Google Sheets**: You can create your CSV file in Excel or Google Sheets. Save as CSV format when done.
- **Multiple Categories**: Group questions by category in your CSV file
- **Question Values**: Standard Jeopardy uses values of 100, 200, 300, 400, and 500 for each category
- **Answer Format**: Answers should be in the form "What is...?" or "Who is...?" for authenticity
- **Explanations**: While optional, explanations help players learn more about the topic

## Two Rounds Format

For games with a second round (double points), use the **Round** column in your CSV:

- **Round** (optional): Use `1` for Round 1 questions and `2` for Round 2 questions. Rows without this column default to Round 1.
- Round 2 questions use the same point values (100, 200, 300, etc.) but are displayed and scored at double (200, 400, 600, etc.).
- Round 2 can have different categories and topics from Round 1.
- Enable "Two Rounds" in Game Setup for this to take effect.

### Two Rounds CSV Example
```csv
Round,Category,Value,Clue,Answer,Explanation
1,Science,100,"The powerhouse of the cell.","What is the mitochondria?","..."
2,Advanced Science,100,"The number of chromosomes in a human cell.","What is 46?","..."
```

### Two Rounds JSON Example
```json
{
  "round1": {
    "categories": [
      { "name": "Science", "questions": [...] }
    ]
  },
  "round2": {
    "categories": [
      { "name": "Advanced Science", "questions": [...] }
    ]
  }
}
```

## Template Files

- `jeopardy_import_template.csv` - Single round format
- `jeopardy_import_template_two_rounds.csv` - Two rounds format with 6 categories per round

