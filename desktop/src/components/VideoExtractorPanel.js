import React, { useState } from 'react';
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
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  VideoLibrary as VideoIcon,
  Download as DownloadIcon,
  Clear as ClearIcon,
  Folder as FolderIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon
} from '@mui/icons-material';
import { fileOperations } from '../utils/electron';

const VideoExtractorPanel = ({ settings, onNotification }) => {
  const [url, setUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [observationWindow, setObservationWindow] = useState(5000);
  const [downloadMedia, setDownloadMedia] = useState(false);
  const [downloadDir, setDownloadDir] = useState(settings.downloadDirectory);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedVideos, setExtractedVideos] = useState([]);
  const [groupedVideos, setGroupedVideos] = useState({
    hls: [],
    dash: [],
    direct: [],
    blob: [],
    other: []
  });
  const [results, setResults] = useState(null);

  const handleStartExtraction = async () => {
    if (!url) {
      onNotification('Please enter a URL', 'warning');
      return;
    }

    if (downloadMedia && !downloadDir) {
      onNotification('Please select a download directory', 'warning');
      return;
    }

    try {
      setIsRunning(true);
      setProgress(0);
      setExtractedVideos([]);
      setGroupedVideos({
        hls: [],
        dash: [],
        direct: [],
        blob: [],
        other: []
      });
      setResults(null);

      // Simulate video extraction with progress
      const steps = 5;
      const sampleVideos = [
        {
          url: 'https://example.com/video1.m3u8',
          type: 'hls',
          quality: '1080p',
          duration: 120
        },
        {
          url: 'https://example.com/video2.mpd',
          type: 'dash',
          quality: '720p',
          duration: 85
        },
        {
          url: 'https://example.com/video3.mp4',
          type: 'direct',
          quality: '1080p',
          duration: 200
        },
        {
          url: 'blob:https://example.com/video4',
          type: 'blob',
          quality: 'Unknown',
          duration: 0
        },
        {
          url: 'https://example.com/stream.m3u8',
          type: 'hls',
          quality: '4K',
          duration: 300
        }
      ];

      for (let step = 0; step < steps; step++) {
        setProgress(((step + 1) / steps) * 100);
        
        // Simulate finding videos
        if (step === 2) {
          const foundVideos = sampleVideos.map((video, index) => ({
            ...video,
            id: `video-${index}`,
            source: index % 2 === 0 ? 'network' : 'dom',
            timestamp: new Date().toISOString()
          }));
          
          setExtractedVideos(foundVideos);
          
          // Group videos
          const grouped = {
            hls: foundVideos.filter(v => v.type === 'hls'),
            dash: foundVideos.filter(v => v.type === 'dash'),
            direct: foundVideos.filter(v => v.type === 'direct'),
            blob: foundVideos.filter(v => v.type === 'blob'),
            other: foundVideos.filter(v => !['hls', 'dash', 'direct', 'blob'].includes(v.type))
          };
          setGroupedVideos(grouped);
        }
        
        // Wait between steps
        await new Promise(resolve => setTimeout(resolve, observationWindow / steps));
      }
      
      const finalResults = {
        url: url,
        videosFound: extractedVideos.length,
        grouped: {
          hls: groupedVideos.hls.length,
          dash: groupedVideos.dash.length,
          direct: groupedVideos.direct.length,
          blob: groupedVideos.blob.length,
          other: groupedVideos.other.length
        },
        downloadStats: downloadMedia ? {
          total: extractedVideos.filter(v => v.type !== 'blob').length,
          successful: Math.floor(extractedVideos.filter(v => v.type !== 'blob').length * 0.7),
          failed: Math.floor(extractedVideos.filter(v => v.type !== 'blob').length * 0.3)
        } : null
      };
      
      setResults(finalResults);
      setIsRunning(false);
      onNotification('Video extraction completed successfully!', 'success');
      
    } catch (error) {
      console.error('Video extraction error:', error);
      setIsRunning(false);
      onNotification(`Video extraction failed: ${error.message}`, 'error');
    }
  };

  const handleSelectDownloadDir = async () => {
    try {
      const dir = await fileOperations.selectDirectory();
      if (dir) {
        setDownloadDir(dir);
        onNotification('Download directory selected', 'success');
      }
    } catch (error) {
      console.error('Directory selection error:', error);
      onNotification('Failed to select directory', 'error');
    }
  };

  const handleClearResults = () => {
    setResults(null);
    setExtractedVideos([]);
    setGroupedVideos({
      hls: [],
      dash: [],
      direct: [],
      blob: [],
      other: []
    });
    setProgress(0);
    onNotification('Results cleared', 'info');
  };

  const getVideoTypeColor = (type) => {
    switch (type) {
      case 'hls': return 'primary';
      case 'dash': return 'secondary';
      case 'direct': return 'success';
      case 'blob': return 'warning';
      default: return 'default';
    }
  };

  const getVideoTypeIcon = (type) => {
    switch (type) {
      case 'hls': return '📡';
      case 'dash': return '📊';
      case 'direct': return '🎬';
      case 'blob': return '💾';
      default: return '📹';
    }
  };

  const formatDuration = (seconds) => {
    if (seconds === 0) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const VideoTypeAccordion = ({ type, videos, icon, color }) => (
    <Accordion disabled={videos.length === 0}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span>{icon}</span>
          <Typography>
            {type.toUpperCase()} Streams
          </Typography>
          <Chip 
            label={videos.length} 
            color={color} 
            size="small" 
            sx={{ ml: 1 }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <List dense>
          {videos.map((video, index) => (
            <ListItem key={video.id || index} divider>
              <ListItemIcon>
                <VideoIcon color={color} fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {video.url.substring(0, 60)}...
                    </Typography>
                    <Chip 
                      label={video.quality} 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="caption">
                      Duration: {formatDuration(video.duration)}
                    </Typography>
                    <Typography variant="caption">
                      Source: {video.source}
                    </Typography>
                  </Box>
                }
              />
              <IconButton size="small">
                <PlayIcon fontSize="small" />
              </IconButton>
            </ListItem>
          ))}
        </List>
      </AccordionDetails>
    </Accordion>
  );

  return (
    <Box>
      {/* Control Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Video Extractor Configuration
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Target URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://video-site.com"
                disabled={isRunning}
                helperText="Enter the website URL to extract videos from"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography gutterBottom>
                Observation Window: {observationWindow}ms
              </Typography>
              <Slider
                value={observationWindow}
                onChange={(e, value) => setObservationWindow(value)}
                min={1000}
                max={15000}
                step={1000}
                marks
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}ms`}
                disabled={isRunning}
              />
            </Grid>
          </Grid>

          {/* Download Options */}
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={downloadMedia}
                  onChange={(e) => setDownloadMedia(e.target.checked)}
                  disabled={isRunning}
                />
              }
              label="Download videos to local files"
            />
            
            {downloadMedia && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  label="Download Directory"
                  value={downloadDir}
                  onChange={(e) => setDownloadDir(e.target.value)}
                  disabled={isRunning}
                  size="small"
                  sx={{ flexGrow: 1 }}
                />
                <Button
                  variant="outlined"
                  startIcon={<FolderIcon />}
                  onClick={handleSelectDownloadDir}
                  disabled={isRunning}
                  size="small"
                >
                  Browse
                </Button>
              </Box>
            )}
          </Box>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<VideoIcon />}
              onClick={handleStartExtraction}
              disabled={isRunning}
              size="large"
            >
              Start Extraction
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClearResults}
              disabled={isRunning}
              color="error"
            >
              Clear Results
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Progress Panel */}
      {isRunning && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Extraction Progress
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Monitoring network activity and scanning for video sources...
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Results Panel */}
      {results && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Extraction Results
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6} md={2}>
                <Typography variant="body2" color="text.secondary">
                  Videos Found
                </Typography>
                <Typography variant="h6" color="primary">
                  {results.videosFound}
                </Typography>
              </Grid>
              
              <Grid item xs={6} md={2}>
                <Typography variant="body2" color="text.secondary">
                  HLS Streams
                </Typography>
                <Typography variant="h6" color="primary">
                  {results.grouped.hls}
                </Typography>
              </Grid>
              
              <Grid item xs={6} md={2}>
                <Typography variant="body2" color="text.secondary">
                  DASH Streams
                </Typography>
                <Typography variant="h6" color="primary">
                  {results.grouped.dash}
                </Typography>
              </Grid>
              
              <Grid item xs={6} md={2}>
                <Typography variant="body2" color="text.secondary">
                  Direct Files
                </Typography>
                <Typography variant="h6" color="primary">
                  {results.grouped.direct}
                </Typography>
              </Grid>
              
              <Grid item xs={6} md={2}>
                <Typography variant="body2" color="text.secondary">
                  Blob URLs
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {results.grouped.blob}
                </Typography>
              </Grid>
              
              {downloadMedia && results.downloadStats && (
                <Grid item xs={6} md={2}>
                  <Typography variant="body2" color="text.secondary">
                    Downloaded
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {results.downloadStats.successful}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Grouped Videos */}
      {extractedVideos.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Extracted Video Sources ({extractedVideos.length})
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <VideoTypeAccordion
                type="hls"
                videos={groupedVideos.hls}
                icon={getVideoTypeIcon('hls')}
                color="primary"
              />
              
              <VideoTypeAccordion
                type="dash"
                videos={groupedVideos.dash}
                icon={getVideoTypeIcon('dash')}
                color="secondary"
              />
              
              <VideoTypeAccordion
                type="direct"
                videos={groupedVideos.direct}
                icon={getVideoTypeIcon('direct')}
                color="success"
              />
              
              <VideoTypeAccordion
                type="blob"
                videos={groupedVideos.blob}
                icon={getVideoTypeIcon('blob')}
                color="warning"
              />
              
              <VideoTypeAccordion
                type="other"
                videos={groupedVideos.other}
                icon={getVideoTypeIcon('other')}
                color="default"
              />
            </Box>
            
            <Alert 
              severity="info" 
              sx={{ mt: 2 }}
              icon={<InfoIcon />}
            >
              <Typography variant="body2">
                <strong>Note:</strong> Blob URLs cannot be downloaded directly as they are temporary browser objects. 
                Direct video files and streaming manifests (HLS/DASH) can be downloaded when the download option is enabled.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default VideoExtractorPanel;