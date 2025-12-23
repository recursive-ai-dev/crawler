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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ImageList,
  ImageListItem,
  ImageListItemBar
} from '@mui/material';
import {
  PhotoCamera as PhotoIcon,
  Download as DownloadIcon,
  Clear as ClearIcon,
  Folder as FolderIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { fileOperations } from '../utils/electron';

const ImageExtractorPanel = ({ settings, onNotification }) => {
  const [url, setUrl] = useState('https://unsplash.com');
  const [maxScrolls, setMaxScrolls] = useState(30);
  const [scrollDelay, setScrollDelay] = useState(1000);
  const [downloadMedia, setDownloadMedia] = useState(false);
  const [downloadDir, setDownloadDir] = useState(settings.downloadDirectory);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedImages, setExtractedImages] = useState([]);
  const [currentScroll, setCurrentScroll] = useState(0);
  const [results, setResults] = useState(null);
  const [viewImage, setViewImage] = useState(null);

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
      setExtractedImages([]);
      setCurrentScroll(0);
      setResults(null);

      // Simulate image extraction
      const totalScrolls = maxScrolls;
      const sampleImages = [
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop',
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&h=200&fit=crop',
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&h=200&fit=crop',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop',
        'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=300&h=200&fit=crop',
        'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=300&h=200&fit=crop',
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=300&h=200&fit=crop',
        'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=300&h=200&fit=crop'
      ];

      for (let scroll = 0; scroll < totalScrolls; scroll++) {
        setCurrentScroll(scroll);
        setProgress((scroll / totalScrolls) * 100);
        
        // Simulate finding images
        const imagesFound = Math.floor(Math.random() * 5) + 1;
        
        for (let i = 0; i < imagesFound; i++) {
          const imageUrl = sampleImages[Math.floor(Math.random() * sampleImages.length)];
          const newImage = {
            url: imageUrl,
            originalUrl: `${url}/image-${scroll}-${i}.jpg`,
            width: 300,
            height: 200,
            type: 'jpg',
            size: Math.floor(Math.random() * 500000) + 50000,
            scroll: scroll,
            timestamp: new Date().toISOString()
          };
          
          setExtractedImages(prev => [...prev, newImage]);
        }
        
        // Simulate stabilization
        if (scroll > 5 && Math.random() < 0.3) {
          setProgress(100);
          break;
        }
        
        // Wait between scrolls
        await new Promise(resolve => setTimeout(resolve, scrollDelay));
      }
      
      const finalResults = {
        url: url,
        scrolls: currentScroll + 1,
        imagesFound: extractedImages.length,
        downloadStats: downloadMedia ? {
          total: extractedImages.length,
          successful: Math.floor(extractedImages.length * 0.8),
          failed: Math.floor(extractedImages.length * 0.2)
        } : null
      };
      
      setResults(finalResults);
      setIsRunning(false);
      onNotification('Image extraction completed successfully!', 'success');
      
    } catch (error) {
      console.error('Image extraction error:', error);
      setIsRunning(false);
      onNotification(`Image extraction failed: ${error.message}`, 'error');
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
    setExtractedImages([]);
    setProgress(0);
    setCurrentScroll(0);
    onNotification('Results cleared', 'info');
  };

  const handleViewImage = (image) => {
    setViewImage(image);
  };

  const handleCloseImageView = () => {
    setViewImage(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      {/* Control Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Image Extractor Configuration
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Target URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://unsplash.com"
                disabled={isRunning}
                helperText="Enter the website URL to extract images from"
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Typography gutterBottom>
                Max Scrolls: {maxScrolls}
              </Typography>
              <Slider
                value={maxScrolls}
                onChange={(e, value) => setMaxScrolls(value)}
                min={5}
                max={100}
                step={5}
                marks
                valueLabelDisplay="auto"
                disabled={isRunning}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Typography gutterBottom>
                Scroll Delay: {scrollDelay}ms
              </Typography>
              <Slider
                value={scrollDelay}
                onChange={(e, value) => setScrollDelay(value)}
                min={500}
                max={5000}
                step={100}
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
              label="Download images to local files"
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
              startIcon={<PhotoIcon />}
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
                Scroll {currentScroll} of {maxScrolls} • {extractedImages.length} images found
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
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Scrolls Completed
                </Typography>
                <Typography variant="h6" color="primary">
                  {results.scrolls}
                </Typography>
              </Grid>
              
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Images Found
                </Typography>
                <Typography variant="h6" color="primary">
                  {results.imagesFound}
                </Typography>
              </Grid>
              
              {downloadMedia && results.downloadStats && (
                <>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Downloaded
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {results.downloadStats.successful}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Failed
                    </Typography>
                    <Typography variant="h6" color="error">
                      {results.downloadStats.failed}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Extracted Images */}
      {extractedImages.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Extracted Images ({extractedImages.length})
            </Typography>
            
            <ImageList sx={{ maxHeight: 400 }} cols={4} rowHeight={180}>
              {extractedImages.slice(-16).map((image, index) => (
                <ImageListItem key={index}>
                  <img
                    src={image.url}
                    alt={image.originalUrl}
                    loading="lazy"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleViewImage(image)}
                  />
                  <ImageListItemBar
                    title={formatFileSize(image.size)}
                    subtitle={image.type.toUpperCase()}
                    actionIcon={
                      <IconButton
                        sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                        onClick={() => handleViewImage(image)}
                      >
                        <ViewIcon />
                      </IconButton>
                    }
                  />
                </ImageListItem>
              ))}
            </ImageList>
            
            {extractedImages.length > 16 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Showing last 16 images. {extractedImages.length - 16} more images extracted.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image View Dialog */}
      <Dialog
        open={Boolean(viewImage)}
        onClose={handleCloseImageView}
        maxWidth="md"
        fullWidth
      >
        {viewImage && (
          <>
            <DialogTitle>
              Image Preview
            </DialogTitle>
            <DialogContent>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <img
                  src={viewImage.url}
                  alt={viewImage.originalUrl}
                  style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                <strong>Original URL:</strong> {viewImage.originalUrl}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Dimensions:</strong> {viewImage.width} × {viewImage.height}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>File Size:</strong> {formatFileSize(viewImage.size)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Format:</strong> {viewImage.type.toUpperCase()}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseImageView}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ImageExtractorPanel;