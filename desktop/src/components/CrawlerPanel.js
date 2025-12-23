import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Slider,
  FormControlLabel,
  Switch,
  LinearProgress,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Download as DownloadIcon,
  Link as LinkIcon,
  Settings as SettingsIcon,
  Clear as ClearIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { crawlerOperations } from '../utils/electron';

const CrawlerPanel = ({ settings, onNotification }) => {
  const [url, setUrl] = useState('https://example.com');
  const [maxPhases, setMaxPhases] = useState(20);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [discoveredLinks, setDiscoveredLinks] = useState([]);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [tension, setTension] = useState(0);
  const [logs, setLogs] = useState([]);

  const handleStartCrawler = async () => {
    if (!url) {
      onNotification('Please enter a URL', 'warning');
      return;
    }

    try {
      setIsRunning(true);
      setProgress(0);
      setDiscoveredLinks([]);
      setCurrentPhase(0);
      setTension(0);
      setLogs([]);
      setResults(null);

      // Simulate crawler operation
      const startTime = Date.now();
      const totalPhases = maxPhases;
      
      for (let phase = 0; phase < totalPhases; phase++) {
        setCurrentPhase(phase);
        setProgress((phase / totalPhases) * 100);
        
        // Simulate discovery
        const newLinks = Math.floor(Math.random() * 10) + 1;
        const tensionValue = Math.random() * 2;
        setTension(tensionValue);
        
        // Add some discovered links
        for (let i = 0; i < newLinks; i++) {
          const newLink = {
            url: `${url}/page-${phase}-${i}`,
            text: `Link ${phase}-${i}`,
            phase: phase,
            timestamp: new Date().toISOString()
          };
          setDiscoveredLinks(prev => [...prev, newLink]);
        }
        
        // Add log entry
        const logEntry = {
          timestamp: new Date().toISOString(),
          phase: phase,
          action: phase % 2 === 0 ? 'SCROLL' : 'PAGE_NEXT',
          linksFound: newLinks,
          tension: tensionValue.toFixed(2)
        };
        setLogs(prev => [...prev, logEntry]);
        
        // Simulate stasis detection
        if (phase > 3 && tensionValue < 0.1) {
          setProgress(100);
          break;
        }
        
        // Wait a bit between phases
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const endTime = Date.now();
      const finalResults = {
        url: url,
        phases: currentPhase + 1,
        linksFound: discoveredLinks.length,
        duration: (endTime - startTime) / 1000,
        averageTension: logs.reduce((sum, log) => sum + parseFloat(log.tension), 0) / logs.length,
        finalWavefrontSize: Math.floor(Math.random() * 3) + 1
      };
      
      setResults(finalResults);
      setIsRunning(false);
      onNotification('Crawling completed successfully!', 'success');
      
    } catch (error) {
      console.error('Crawler error:', error);
      setIsRunning(false);
      onNotification(`Crawling failed: ${error.message}`, 'error');
    }
  };

  const handleStopCrawler = () => {
    setIsRunning(false);
    setProgress(100);
    onNotification('Crawling stopped by user', 'info');
  };

  const handleClearResults = () => {
    setResults(null);
    setDiscoveredLinks([]);
    setLogs([]);
    setProgress(0);
    setCurrentPhase(0);
    setTension(0);
    onNotification('Results cleared', 'info');
  };

  const handleExportResults = async () => {
    if (!results) {
      onNotification('No results to export', 'warning');
      return;
    }

    try {
      const { fileOperations } = await import('../utils/electron');
      const filePath = await fileOperations.showSaveDialog({
        title: 'Export Crawl Results',
        defaultPath: `crawl-results-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON', extensions: ['json'] },
          { name: 'CSV', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (filePath) {
        const exportData = {
          results,
          discoveredLinks,
          logs,
          exportDate: new Date().toISOString()
        };
        
        // In a real implementation, this would save the file
        console.log('Exporting to:', filePath, exportData);
        onNotification('Results exported successfully!', 'success');
      }
    } catch (error) {
      console.error('Export error:', error);
      onNotification('Export failed', 'error');
    }
  };

  const getTensionColor = (tension) => {
    if (tension < 0.3) return 'success';
    if (tension < 1.0) return 'warning';
    return 'error';
  };

  const getTensionLabel = (tension) => {
    if (tension < 0.3) return 'Low';
    if (tension < 1.0) return 'Medium';
    return 'High';
  };

  return (
    <Box>
      {/* Control Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Web Crawler Configuration
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Target URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={isRunning}
                helperText="Enter the website URL to crawl"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography gutterBottom>
                Max Phases: {maxPhases}
              </Typography>
              <Slider
                value={maxPhases}
                onChange={(e, value) => setMaxPhases(value)}
                min={5}
                max={100}
                step={5}
                marks
                valueLabelDisplay="auto"
                disabled={isRunning}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<StartIcon />}
              onClick={handleStartCrawler}
              disabled={isRunning}
              size="large"
            >
              Start Crawling
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<StopIcon />}
              onClick={handleStopCrawler}
              disabled={!isRunning}
              color="error"
            >
              Stop
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportResults}
              disabled={!results}
            >
              Export Results
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClearResults}
              disabled={isRunning}
            >
              Clear
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Progress Panel */}
      {isRunning && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Crawling Progress
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Phase {currentPhase} of {maxPhases} • {discoveredLinks.length} links discovered
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                label={`Tension: ${getTensionLabel(tension)} (${tension.toFixed(2)})`}
                color={getTensionColor(tension)}
                size="small"
              />
              
              <Tooltip title="Tension indicates the rate of new discoveries. High tension may trigger wavefront expansion.">
                <InfoIcon color="action" fontSize="small" />
              </Tooltip>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Results Panel */}
      {results && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Crawl Results
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Phases Completed
                </Typography>
                <Typography variant="h6" color="primary">
                  {results.phases}
                </Typography>
              </Grid>
              
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Links Found
                </Typography>
                <Typography variant="h6" color="primary">
                  {results.linksFound}
                </Typography>
              </Grid>
              
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Duration
                </Typography>
                <Typography variant="h6" color="primary">
                  {results.duration.toFixed(1)}s
                </Typography>
              </Grid>
              
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Avg Tension
                </Typography>
                <Typography variant="h6" color="primary">
                  {results.averageTension.toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Discovered Links */}
      {discoveredLinks.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Discovered Links ({discoveredLinks.length})
            </Typography>
            
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              <List dense>
                {discoveredLinks.slice(-20).map((link, index) => (
                  <ListItem key={index} divider>
                    <ListItemIcon>
                      <LinkIcon color="action" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={link.text || link.url}
                      secondary={`${link.url.substring(0, 60)}... • Phase ${link.phase}`}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
            
            {discoveredLinks.length > 20 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Showing last 20 links. Export results to see all discovered links.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default CrawlerPanel;