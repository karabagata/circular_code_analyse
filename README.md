# Circular Codes Web Checker

A small Flask utility that builds the prefix→suffix graph of a fixed-length code, detects cycles (non-circularity), and shows the structure in Cytoscape.js.

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

## Deployment note

For the `dpt-info.di.unistra.fr` server, copy the repository there, run the same setup commands, and point the institution’s web front-end (gunicorn/uwsgi or reverse proxy) to `app.py`. The app only needs Flask and NetworkX, so no database or extra services are required.
