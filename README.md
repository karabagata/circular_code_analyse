# Circular Codes Web Checker

A small web app that checks if a bioinformatical code is circular or not using graphs. It builds the prefix→suffix graph, detects cycles (non-circularity), and visualizes the structure.

## Quick start

1. `python3 -m venv .venv && source .venv/bin/activate` (Windows: `.venv\Scripts\activate`)
2. `pip install -r requirements.txt`
3. `python app.py`

## Requirements

- Python 3.10+
- pip

All Python dependencies are pinned in `requirements.txt` (Flask + NetworkX).

## Usage

Once the server starts it listens on `http://127.0.0.1:8080`. Paste your code words, click **Analyze**, and inspect the textual summary and interactive graph. Buttons inside the UI let you fit/relayout the graph or auto-fill with an example set.

You can also upload a text file containing codes (words separated by spaces/newlines). If the file contains multiple codes, separate them with blank lines; the interface will provide **Previous** / **Next** controls to navigate the results.

After analysis, you can click **Download Report** to get a Markdown file (`analysis_report.md`) containing the summaries of all analyzed codes.

