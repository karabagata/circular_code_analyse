// Theme toggle (persist in localStorage)
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('cc-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.checked = (savedTheme === 'dark');
themeToggle.addEventListener('change', () => {
  const next = themeToggle.checked ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('cc-theme', next);
});

const btn = document.getElementById('analyzeBtn');
const ta = document.getElementById('words');
const summary = document.getElementById('summary');
const fileInput = document.getElementById('codeFile');
const analyzeFileBtn = document.getElementById('analyzeFileBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const navDiv = document.getElementById('navigation');
const posLabel = document.getElementById('posLabel');
const downloadReportBtn = document.getElementById('downloadReportBtn');

let cy = null;
window.currentResults = [];
window.currentIndex = 0;
window.currentSource = "";

window.getGraphStyle = function() {
  return [
    // Nodes
    { selector: 'node', style: {
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '18px',
      'background-color': '#cfe0f7',
      'border-width': 1,
      'border-color': '#6C757D',
      'width': '64px',
      'height': '64px'
    }},
    // Slight size hints by fragment length
    { selector: 'node[layer = 1]', style: { 'width': '76px', 'height': '76px' } },
    { selector: 'node[layer = 2]', style: { 'width': '70px', 'height': '70px' } },
    // Edges
    { selector: 'edge', style: {
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 1.5,
      'width': 2,
      'line-color': '#4C6EF5',
      'target-arrow-color': '#4C6EF5',
      'edge-text-rotation': 'autorotate',
      'label': 'data(label)',
      'font-size': '16px',
      'text-background-color': '#FFFFFF',
      'text-background-opacity': 0.85,
      'text-background-shape': 'round-rectangle',
      'text-background-padding': '3px',
      'text-margin-y': -6
    }},
    // Highlight cycle edges
    { selector: 'edge[?cycle]', style: {
      'line-color': '#ff6b6b',
      'target-arrow-color': '#ff6b6b'
    }}
  ];
}

window.getGraphLayout = function() {
  return {
    name: 'cose',
    animate: false,
    componentSpacing: 100,
    nodeRepulsion: 400000,
    nodeOverlap: 20,
    idealEdgeLength: 100,
    edgeElasticity: 100,
    nestingFactor: 5,
    gravity: 80,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
    padding: 40
  };
}

function applyResult(data) {
  summary.textContent = data.summary || '—';

  // If the backend returned an error structure for this block
  if (data.error) {
    if (cy) cy.elements().remove();
    return;
  }

  if (!cy) {
    cy = cytoscape({
      container: document.getElementById('graph'),
      elements: data.elements || [],
      style: window.getGraphStyle(),
      layout: window.getGraphLayout(),
      wheelSensitivity: 0.2
    });
  } else {
    // reuse existing instance
    cy.elements().remove();
    cy.add(data.elements || []);
    // re-run layout
    cy.layout(window.getGraphLayout()).run();
  }
  cy.fit(undefined, 30);
}

function updateNavigation() {
  if (window.currentResults.length > 1) {
    navDiv.classList.remove('hidden');
    posLabel.textContent = `Code ${window.currentIndex + 1} of ${window.currentResults.length}`;
    prevBtn.disabled = (window.currentIndex === 0);
    nextBtn.disabled = (window.currentIndex === window.currentResults.length - 1);
  } else {
    navDiv.classList.add('hidden');
  }
}

function showResult(index) {
  if (index < 0 || index >= window.currentResults.length) return;
  window.currentIndex = index;
  applyResult(window.currentResults[index]);
  updateNavigation();
}

async function analyze(text) {
  btn.disabled = true;
  summary.textContent = 'Processing…';
  navDiv.classList.add('hidden');
  try {
    const res = await fetch('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Unknown error');

    // Normal analyze returns a single object
    window.currentResults = [data];
    window.currentIndex = 0;
    window.currentSource = "Manual Input";
    showResult(0);
    downloadReportBtn.classList.remove('hidden');
  } catch (err) {
    summary.textContent = 'ERROR: ' + (err && err.message ? err.message : String(err));
    downloadReportBtn.classList.add('hidden');
  } finally {
    btn.disabled = false;
  }
}

async function analyzeFileUpload(file) {
  analyzeFileBtn.disabled = true;
  summary.textContent = 'Processing file…';
  navDiv.classList.add('hidden');
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/analyze-file', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Unknown error');

    if (data.results) {
      window.currentResults = data.results;
    } else {
      // Fallback if backend returns single object structure
      window.currentResults = [data];
    }

    window.currentIndex = 0;
    window.currentSource = file.name;
    if (window.currentResults.length === 0) {
      summary.textContent = 'No valid codes found.';
      downloadReportBtn.classList.add('hidden');
    } else {
      showResult(0);
      downloadReportBtn.classList.remove('hidden');
    }
  } catch (err) {
    summary.textContent = 'ERROR: ' + (err && err.message ? err.message : String(err));
    downloadReportBtn.classList.add('hidden');
  } finally {
    analyzeFileBtn.disabled = false;
  }
}

function generateAndDownloadReport(results, sourceName) {
  if (!results || results.length === 0) return;

  const date = new Date().toLocaleString();
  const source = sourceName || 'Unknown Source';

  let md = `# Circular Code Analysis Report\n\n`;
  md += `**Date:** ${date}\n`;
  md += `**Source:** ${source}\n\n`;
  md += `This document summarizes the analysis of ${results.length} code block(s).\n\n`;

  results.forEach((res, idx) => {
    const label = results.length > 1 ? `Code Block ${idx + 1}` : `Analysis Result`;
    md += `## ${label}\n\n`;
    if (res.error) {
      md += `**Error:** ${res.error}\n\n`;
    }
    md += '```text\n';
    md += (res.summary || '') + '\n';
    md += '```\n\n';

    if (res.graphImage) {
      md += `### Graph\n\n`;
      md += `![Graph for ${label}](${res.graphImage})\n\n`;
    }
  });

  const filename = 'analysis_report.md';
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

window.generateGraphImages = async function(results) {
  const container = document.getElementById('hidden-graph-container');

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    if (res.error || !res.elements || res.elements.length === 0) {
      continue;
    }

    const tempCy = cytoscape({
      container: container,
      elements: res.elements,
      style: window.getGraphStyle(),
      layout: { name: 'preset' },
      wheelSensitivity: 0.2
    });

    const layoutConfig = window.getGraphLayout();
    const layout = tempCy.layout(layoutConfig);

    const layoutPromise = new Promise(resolve => {
      layout.one('layoutstop', resolve);
    });
    layout.run();
    await layoutPromise;

    tempCy.fit(undefined, 30);
    const png = tempCy.png({ output: 'base64uri', full: true, scale: 1.5 });
    res.graphImage = png;

    tempCy.destroy();
  }
  return results;
};

if (downloadReportBtn) {
  downloadReportBtn.addEventListener('click', async () => {
    if (!window.currentResults || window.currentResults.length === 0) return;

    const originalText = downloadReportBtn.textContent;
    downloadReportBtn.textContent = 'Generating images...';
    downloadReportBtn.disabled = true;

    try {
      await window.generateGraphImages(window.currentResults);
      generateAndDownloadReport(window.currentResults, window.currentSource);
    } catch (e) {
      console.error('Error generating report images:', e);
      alert('Failed to generate graph images. The report will be downloaded without them.');
      generateAndDownloadReport(window.currentResults, window.currentSource);
    } finally {
      downloadReportBtn.textContent = originalText;
      downloadReportBtn.disabled = false;
    }
  });
}

prevBtn.addEventListener('click', () => showResult(window.currentIndex - 1));
nextBtn.addEventListener('click', () => showResult(window.currentIndex + 1));

document.getElementById('analyzeBtn').addEventListener('click', () => analyze(ta.value));

// Make chips clickable
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const text = chip.innerText;
    ta.value = text;
    analyze(text);
  });
});

analyzeFileBtn.addEventListener('click', () => {
  const file = fileInput.files[0];
  if (!file) {
    summary.textContent = 'Please choose a file first.';
    return;
  }
  analyzeFileUpload(file);
});

document.getElementById('fitBtn').addEventListener('click', () => {
  if (cy) cy.fit(undefined, 30);
});
document.getElementById('relayoutBtn').addEventListener('click', () => {
  if (cy) cy.layout(window.getGraphLayout()).run();
});
