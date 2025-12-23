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
  Divider,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton
} from '@mui/material';
import {
  Save as SaveIcon,
  Restore as RestoreIcon,
  Folder as FolderIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { fileOperations } from '../utils/electron';

const SettingsPanel = ({ settings, onSettingsChange }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleSettingChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleSelectDownloadDirectory = async () => {
    try {
      const dir = await fileOperations.selectDirectory();
      if (dir) {
        handleSettingChange('downloadDirectory', dir);
      }
    } catch (error) {
      console.error('Directory selection error:', error);
    }
  };

  const handleSaveSettings = () => {
    onSettingsChange(localSettings);
    setHasChanges(false);
    setSavedMessage('Settings saved successfully!');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const handleResetToDefaults = () => {
    const defaultSettings = {
      downloadDirectory: './downloads',
      maxConcurrentDownloads: 5,
      headlessMode: true,
      respectRobots: true,
      rateLimit: 5,
      autoSaveResults: true,
      showNotifications: true,
      darkMode: false
    };
    
    setLocalSettings(defaultSettings);
    setHasChanges(true);
    setSavedMessage('Settings reset to defaults');
  };

  const sections = [
    {
      title: 'General Settings',
      icon: <SettingsIcon />,
      items: [
        {
          key: 'darkMode',
          label: 'Dark Mode',
          type: 'switch',
          description: 'Enable dark theme for the application'
        },
        {
          key: 'showNotifications',
          label: 'Show Notifications',
          type: 'switch',
          description: 'Display notification messages for actions and results'
        },
        {
          key: 'autoSaveResults',
          label: 'Auto-save Results',
          type: 'switch',
          description: 'Automatically save extraction results after completion'
        }
      ]
    },
    {
      title: 'Download Settings',
      icon: <FolderIcon />,
      items: [
        {
          key: 'downloadDirectory',
          label: 'Download Directory',
          type: 'directory',
          description: 'Default directory for downloaded media files'
        },
        {
          key: 'maxConcurrentDownloads',
          label: 'Max Concurrent Downloads',
          type: 'slider',
          min: 1,
          max: 20,
          description: 'Maximum number of simultaneous file downloads'
        }
      ]
    },
    {
      title: 'Crawler Settings',
      icon: <SpeedIcon />,
      items: [
        {
          key: 'rateLimit',
          label: 'Rate Limit (requests/second)',
          type: 'slider',
          min: 1,
          max: 20,
          description: 'Maximum number of HTTP requests per second'
        },
        {
          key: 'headlessMode',
          label: 'Headless Mode',
          type: 'switch',
          description: 'Run browser in headless mode (no GUI)'
        }
      ]
    },
    {
      title: 'Security Settings',
      icon: <SecurityIcon />,
      items: [
        {
          key: 'respectRobots',
          label: 'Respect robots.txt',
          type: 'switch',
          description: 'Honor robots.txt files when crawling websites'
        }
      ]
    }
  ];

  const renderSettingItem = (item) => {
    switch (item.type) {
      case 'switch':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={localSettings[item.key]}
                onChange={(e) => handleSettingChange(item.key, e.target.checked)}
              />
            }
            label={item.label}
          />
        );
      
      case 'slider':
        return (
          <Box>
            <Typography gutterBottom>
              {item.label}: {localSettings[item.key]}
            </Typography>
            <Slider
              value={localSettings[item.key]}
              onChange={(e, value) => handleSettingChange(item.key, value)}
              min={item.min}
              max={item.max}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Box>
        );
      
      case 'directory':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              fullWidth
              label={item.label}
              value={localSettings[item.key]}
              onChange={(e) => handleSettingChange(item.key, e.target.value)}
              size="small"
            />
            <Button
              variant="outlined"
              startIcon={<FolderIcon />}
              onClick={handleSelectDownloadDirectory}
              size="small"
            >
              Browse
            </Button>
          </Box>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure your LPS Crawler preferences and behavior
        </Typography>
        {hasChanges && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            You have unsaved changes. Don't forget to save your settings!
          </Alert>
        )}
        {savedMessage && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {savedMessage}
          </Alert>
        )}
      </Box>

      {/* Settings Sections */}
      {sections.map((section, sectionIndex) => (
        <Card key={sectionIndex} sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Box sx={{ color: 'primary.main', mr: 2 }}>
                {section.icon}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {section.title}
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {section.items.map((item, itemIndex) => (
                <Grid item xs={12} md={6} key={itemIndex}>
                  <Box>
                    {renderSettingItem(item)}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {item.description}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      ))}

      {/* Current Settings Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Current Configuration
          </Typography>
          
          <List dense>
            <ListItem>
              <ListItemIcon>
                <FolderIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Download Directory"
                secondary={localSettings.downloadDirectory}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <SpeedIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Max Concurrent Downloads"
                secondary={localSettings.maxConcurrentDownloads}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <SpeedIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Rate Limit"
                secondary={`${localSettings.rateLimit} requests/second`}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <SettingsIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Headless Mode"
                secondary={localSettings.headlessMode ? 'Enabled' : 'Disabled'}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <SecurityIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Respect robots.txt"
                secondary={localSettings.respectRobots ? 'Enabled' : 'Disabled'}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<RestoreIcon />}
          onClick={handleResetToDefaults}
          disabled={!hasChanges}
        >
          Reset to Defaults
        </Button>
        
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveSettings}
          disabled={!hasChanges}
          size="large"
        >
          Save Settings
        </Button>
      </Box>

      {/* Footer */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          LPS Crawler Pro v2.0 • Professional Web Scraping Tool
        </Typography>
        <br />
        <Typography variant="caption" color="text.secondary">
          Settings are automatically saved to local storage and persist between sessions.
        </Typography>
      </Box>
    </Box>
  );
};

export default SettingsPanel;