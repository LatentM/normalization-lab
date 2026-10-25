# Normalization Virtual Lab (v2)

BACSE202 Database Systems · VIT Chennai · Digital Assignment

A single-page web app for relational normalization: closures, candidate keys, minimal cover,
1NF–5NF analysis, 3NF synthesis, BCNF decomposition, chase test and dependency preservation,
a Tables page that normalizes real data (1NF repair, dependency and key discovery, redundancy map,
2NF/3NF/BCNF/4NF tables with their rows, rejoin check, SQL for MySQL/PostgreSQL/Oracle/SQLite,
Excel/CSV export), a generated quiz with GATE marking, and 39 verified GATE/UGC NET previous-year questions.

## Deploy
`dist/index.html` is the whole site in one file. Drag the `dist` folder onto
https://app.netlify.com/drop (or any static host). No build step is needed to deploy.

## Edit and rebuild
Source lives in `src/`. After editing, run:

    node build.js        # writes dist/index.html and dist/artifact.html
    node test/run.js     # 2,885 engine checks, including every computational PYQ re-solved
    node test/tables.js  # 217 checks: parsing, 1NF, discovery, every stage rejoined on the data, SQL, zip/xlsx writers

`test/browser.py` is the headless end-to-end check (Playwright): it drives every view,
both themes, all three downloads and phone/tablet widths.
`test/exports_offline.py` blocks the internet libraries and checks that every Tables export
(.sql, Excel, CSV zip) and the Word reports still work.

Excel, CSV-zip and Word files are written by `src/files.js`, so they need no internet.
Only PDF reports (jsPDF) and reading uploaded .xlsx files (SheetJS) load a library online.

## Before submission
- Team: Yusuf Khan (25BCE5307), Mohammed Mubashir Hasan (25BCE5209), E T Suhas Aradhya (25BCE5560). Set every `photo` field in the `TEAM` block at the top of `src/app-content.js`
  (a path like `team/yusuf.jpg` placed next to index.html, or a data: URL), then rebuild.
- The work split in that block is a proposal; change it to match who did what.

## Files
| File | What it holds |
|---|---|
| `src/engine.js` | Parser and every algorithm (pure functions, no DOM) |
| `src/files.js` | Built-in ZIP and Excel (.xlsx) writers used by every export |
| `src/table-engine.js` | Table engine: parsing, 1NF repair, dependency/key discovery, projection, rejoin, SQL |
| `src/table-examples.js` | Sample tables |
| `src/app-table.js` | Tables page (six steps) |
| `src/pyq.js` | PYQ bank with answer keys and solutions |
| `src/app-lab.js` | Lab view, dependency diagram, analysis tabs |
| `src/app-quiz.js` | Question generator and quiz runner |
| `src/app-pyq.js` | PYQ browser, filters, progress |
| `src/app-content.js` | Learn, animated explainer, Help, Developed by |
| `src/app-report.js` | Report builder and PDF / Word / text writers |
| `src/styles.css` | Design tokens, day and night themes |
