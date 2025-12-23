import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Paper,
  Tabs,
  Tab,
  Box,
  Alert,
  Snackbar
} from '@mui/material';
import {
  TravelExplore as CrawlIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import CrawlerPanel from './components/CrawlerPanel';
import ImageExtractorPanel from './components/ImageExtractorPanel';
import VideoExtractorPanel from './components/VideoExtractorPanel';
import SettingsPanel from './components/SettingsPanel';
import { ipcRenderer } from './utils/electron';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState({
    downloadDirectory: './downloads',
    maxConcurrentDownloads: 5,
    headlessMode: true,
    respectRobots: true,
    rateLimit: 5
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  useEffect(() => {
    // Load settings from localStorage or Electron store
    const savedSettings = localStorage.getItem('lps-crawler-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // Listen for menu events from main process
    if (window.electronAPI) {
      window.electronAPI.onMenuNewCrawl(() => {
        setActiveTab(0);
      });

      window.electronAPI.onMenuExportResults((filePath) => {
        handleExportResults(filePath);
      });

      window.electronAPI.onMenuSettings(() => {
        setActiveTab(3);
      });
    }
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleExportResults = (filePath) => {
    // This will be implemented to export current results
    showNotification('Export functionality will be implemented soon', 'info');
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('lps-crawler-settings', JSON.stringify(newSettings));
    showNotification('Settings saved successfully', 'success');
  };

  const tabConfigs = [
    { label: 'Web Crawler', icon: <CrawlIcon />, component: <CrawlerPanel settings={settings} onNotification={showNotification} /> },
    { label: 'Image Extractor', icon: <ImageIcon />, component: <ImageExtractorPanel settings={settings} onNotification={showNotification} /> },
    { label: 'Video Extractor', icon: <VideoIcon />, component: <VideoExtractorPanel settings={settings} onNotification={showNotification} /> },
    { label: 'Settings', icon: <SettingsIcon />, component: <SettingsPanel settings={settings} onSettingsChange={handleSettingsChange} /> }
  ];

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            LPS Crawler Pro
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Professional Web Scraping Tool
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        <Paper elevation={1} sx={{ borderRadius: 3 }}>
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: 64,
                fontWeight: 600,
                fontSize: '0.95rem'
              }
            }}
          >
            {tabConfigs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={tab.label}
                iconPosition="start"
                sx={{ minWidth: 160 }}
              />
            ))}
          </Tabs>

          {/* Tab Content */}
          {tabConfigs.map((tab, index) => (
            <TabPanel key={index} value={activeTab} index={index}>
              {tab.component}
            </TabPanel>
          ))}
        </Paper>
      </Container>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;