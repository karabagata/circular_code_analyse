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
    });
  
    md += `## Next Steps\n\n`;
    md += `You can rerun the analyzer with updated data if needed.\n`;
  
    const filename = "analysis_report.md";
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

