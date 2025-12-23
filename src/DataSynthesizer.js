class DataSynthesizer {
  constructor(logs) {
    this.logs = logs;
  }

  toJSONL() {
    return this.logs.map((entry, index) => {
      const prompt = this._generatePrompt(entry);
      const completion = this._generateCompletion(entry);
      
      return JSON.stringify({
        instruction: prompt,
        context: {
          phase: entry.phase,
          timestamp: new Date(entry.timestamp).toISOString(),
          interaction: entry.interaction,
          index
        },
        response: completion,
        metadata: {
          url: entry.data.url,
          text: entry.data.text
        }
      });
    }).join('\n');
  }

  _generatePrompt(entry) {
    return `Extract and validate the hyperlink discovered during ${entry.interaction} operation at crawl phase ${entry.phase}. 
Provide the URL, anchor text, and contextual metadata.`;
  }

  _generateCompletion(entry) {
    return `Found hyperlink: ${entry.data.url}
Anchor text: "${entry.data.text}"
Title attribute: "${entry.data.title || 'N/A'}"
Discovery phase: ${entry.phase}
Interaction type: ${entry.interaction}`;
  }

  toMarkdown() {
    let md = `# LPS Discovery Report\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n`;
    md += `**Total Discoveries:** ${this.logs.length}\n\n`;
    
    // Summary by interaction type
    const byInteraction = this.logs.reduce((acc, log) => {
      acc[log.interaction] = (acc[log.interaction] || 0) + 1;
      return acc;
    }, {});
    
    md += `## Summary\n\n`;
    Object.entries(byInteraction).forEach(([type, count]) => {
      md += `- **${type}**: ${count} discoveries\n`;
    });
    
    md += `\n## Detailed Discoveries\n\n`;
    
    // Group by phase
    const byPhase = this.logs.reduce((acc, log) => {
      if (!acc[log.phase]) acc[log.phase] = [];
      acc[log.phase].push(log);
      return acc;
    }, {});
    
    Object.keys(byPhase).sort((a, b) => a - b).forEach(phase => {
      md += `### Phase ${phase}\n\n`;
      byPhase[phase].forEach(log => {
        md += `- [${log.data.text}](${log.data.url}) (${log.interaction})\n`;
      });
      md += '\n';
    });
    
    return md;
  }

  toRaw() {
    return this.logs.map(l => `${l.timestamp}\t${l.phase}\t${l.interaction}\t${l.data.url}\t${l.data.text}`).join('\n');
  }

  toCSV() {
    const headers = ['timestamp', 'phase', 'interaction', 'url', 'text', 'title'];
    const rows = this.logs.map(l => [
      new Date(l.timestamp).toISOString(),
      l.phase,
      l.interaction,
      `"${l.data.url}"`,
      `"${l.data.text.replace(/"/g, '""')}"`,
      `"${(l.data.title || '').replace(/"/g, '""')}"`
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

module.exports = DataSynthesizer;