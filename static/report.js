/**
 * Generates a Markdown report from analysis results and triggers a download.
 * @param {Array} results - Array of analysis result objects.
 * @param {string} sourceName - Name of the source (e.g., filename or "Manual Input").
 */
function generateAndDownloadReport(results, sourceName) {
    if (!results || results.length === 0) return;
  
    const date = new Date().toLocaleString();
    const source = sourceName || "Unknown Source";
    
    let md = `# Circular Code Analysis Report\n\n`;
    md += `**Date:** ${date}\n`;
    md += `**Source:** ${source}\n\n`;
    md += `This document summarizes the analysis of ${results.length} code block(s).\n\n`;
  
    results.forEach((res, idx) => {
      const label = results.length > 1 ? `Code Block ${idx + 1}` : `Analysis Result`;
      md += `## ${label}\n\n`;
      // Check if there's an error in this block
      if (res.error) {
           md += `**Error:** ${res.error}\n\n`;
      }
      md += "```text\n";
      md += (res.summary || "") + "\n";
      md += "```\n\n";

      if (res.graphImage) {
          md += `### Graph\n\n`;
          md += `![Graph for ${label}](${res.graphImage})\n\n`;
      }
    });
  
  
    const filename = "analysis_report.md";
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}


// Helper to generate images for all results
window.generateGraphImages = async function(results) {
  const container = document.getElementById('hidden-graph-container');
  
  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    if (res.error || !res.elements || res.elements.length === 0) {
      continue;
    }
    
    // Temporary cytoscape instance
    const tempCy = cytoscape({
      container: container,
      elements: res.elements,
      style: window.getGraphStyle(),
      layout: { name: 'preset' }, // Start with preset to avoid auto-run
      wheelSensitivity: 0.2
    });
    
    const layoutConfig = window.getGraphLayout();
    const layout = tempCy.layout(layoutConfig);
    
    // Run layout and wait for it to stop
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

// Setup the download button listener
document.addEventListener('DOMContentLoaded', () => {
    const downloadReportBtn = document.getElementById('downloadReportBtn');
    if (downloadReportBtn) {
        downloadReportBtn.addEventListener('click', async () => {
          // Access global variables from index.html context
          // Note: These variables must be available in the global scope
          if (!window.currentResults || window.currentResults.length === 0) return;
          
          const originalText = downloadReportBtn.textContent;
          downloadReportBtn.textContent = "Generating images...";
          downloadReportBtn.disabled = true;
          
          try {
            // Generate images for all graphs
            await window.generateGraphImages(window.currentResults);
            generateAndDownloadReport(window.currentResults, window.currentSource);
          } catch (e) {
            console.error("Error generating report images:", e);
            alert("Failed to generate graph images. The report will be downloaded without them.");
            generateAndDownloadReport(window.currentResults, window.currentSource);
          } finally {
            downloadReportBtn.textContent = originalText;
            downloadReportBtn.disabled = false;
          }
        });
    }
});
