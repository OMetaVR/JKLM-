import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import debugLogger from '../../utils/debugLogger';
import '../../styles/panels/profilesPanel.css';
import { FriendsIcon } from '../Icons';

const getAnimationsEnabled = () => {
  return localStorage.getItem('jklm-mini-animations-enabled') !== 'false';
};

const getTransition = (config = {}) => {
  if (!getAnimationsEnabled()) return { duration: 0 };
  return { duration: 0.25, ease: "easeInOut", ...config };
};

const ProfilesPanel = () => {
  const { isDark, accentColor } = useTheme();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingKeybind, setEditingKeybind] = useState(null);
  const panelRef = useRef(null);
  const [activeOptionsProfile, setActiveOptionsProfile] = useState(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [importCode, setImportCode] = useState('');
  const [showImportInput, setShowImportInput] = useState(false);
  
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    return localStorage.getItem('jklm-mini-auto-save-enabled') !== 'false';
  });
  
  const [position, setPosition] = useState(() => {
    const savedPosition = localStorage.getItem('jklm-mini-profiles-position');
    return savedPosition ? JSON.parse(savedPosition) : { x: 350, y: 100 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleDragStart = useCallback((e) => {
    if (e.target.closest('.profiles-minimize-btn')) return;
    e.preventDefault();
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  }, [position]);

  const handleDragMove = useCallback((e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y
    });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    localStorage.setItem('jklm-mini-profiles-position', JSON.stringify(position));
  }, [isDragging, position]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);
  
  // State for profiles with keybinds
  const [profiles, setProfiles] = useState(() => {
    const savedProfiles = localStorage.getItem('jklm-mini-profiles');
    return savedProfiles ? JSON.parse(savedProfiles) : [
      { id: 'default', name: 'Default', isActive: true, settings: {}, keybind: null }
    ];
  });
  
  useEffect(() => {
    localStorage.setItem('jklm-mini-profiles', JSON.stringify(profiles));
  }, [profiles]);
  
  useEffect(() => {
    const handleAutoSaveChange = (e) => {
      if (e.key === 'jklm-mini-auto-save-enabled') {
        setAutoSaveEnabled(e.newValue !== 'false');
      }
    };
    window.addEventListener('storage', handleAutoSaveChange);
    return () => window.removeEventListener('storage', handleAutoSaveChange);
  }, []);
  
  const getCurrentSettings = useCallback(() => {
    const savedFeatures = localStorage.getItem('jklm-mini-bombparty-features');
    const bombPartyFeatures = savedFeatures ? JSON.parse(savedFeatures) : [];
    const bombPartyPosition = localStorage.getItem('jklm-mini-bombparty-position');
    const wordListPosition = localStorage.getItem('jklm-mini-wordlist-position');
    const debugSettingsRaw = localStorage.getItem('jklm-mini-debug-settings');
    const debugSettings = debugSettingsRaw ? JSON.parse(debugSettingsRaw) : {};
    
    return {
      bombPartyFeatures,
      positions: {
        bombParty: bombPartyPosition ? JSON.parse(bombPartyPosition) : null,
        wordList: wordListPosition ? JSON.parse(wordListPosition) : null
      },
      guiSettings: {
        theme: localStorage.getItem('jklm-mini-theme') || 'dark',
        accentColor: localStorage.getItem('jklm-mini-accent-color') || 'purple',
        animationsEnabled: localStorage.getItem('jklm-mini-animations-enabled') !== 'false',
        hideTitlebars: localStorage.getItem('jklm-mini-hide-titlebars') === 'true'
      },
      generalSettings: {
        autoSaveEnabled: localStorage.getItem('jklm-mini-auto-save-enabled') !== 'false',
        wordFrequencyEnabled: localStorage.getItem('jklm-mini-word-frequency-enabled') === 'true',
        wordlistUrl: localStorage.getItem('jklm-mini-wordlist-url') || ''
      },
      notificationSettings: {
        webhookEnabled: localStorage.getItem('jklm-mini-webhook-enabled') === 'true',
        webhookUrl: localStorage.getItem('jklm-mini-webhook-url') || '',
        logGameResults: localStorage.getItem('jklm-mini-log-game-results') !== 'false',
        logWordUsage: localStorage.getItem('jklm-mini-log-word-usage') === 'true',
        pingEveryone: localStorage.getItem('jklm-mini-webhook-ping-everyone') === 'true'
      },
      debugSettings
    };
  }, []);
  
  useEffect(() => {
    if (!autoSaveEnabled) return;
    
    const handleSettingsChange = () => {
      const activeProfile = profiles.find(p => p.isActive);
      if (!activeProfile) return;
      
      try {
        const currentSettings = getCurrentSettings();
        setProfiles(prev => prev.map(profile => 
          profile.isActive ? { ...profile, settings: currentSettings } : profile
        ));
      } catch (error) {
        debugLogger.error('storage', 'Auto-save error:', error);
      }
    };
    
    window.addEventListener('jklm-mini-settings-change', handleSettingsChange);
    window.addEventListener('jklm-mini-feature-toggle', handleSettingsChange);
    
    return () => {
      window.removeEventListener('jklm-mini-settings-change', handleSettingsChange);
      window.removeEventListener('jklm-mini-feature-toggle', handleSettingsChange);
    };
  }, [autoSaveEnabled, profiles, getCurrentSettings]);
  
  // Handle keyboard input for keybinds
  useEffect(() => {
    if (!editingKeybind) return;
    
    const handleKeyDown = (e) => {
      e.preventDefault();
      
      // Get key name
      let keyName = e.key;
      
      // Handle special keys
      if (e.key === ' ') keyName = 'Space';
      else if (e.key === 'Escape') {
        // Clear keybind when pressing ESC
        setProfiles(profiles.map(p => 
          p.id === editingKeybind 
            ? { ...p, keybind: null } 
            : p
        ));
        setEditingKeybind(null);
        return;
      }
      
      // Check if another profile already uses this keybind
      const existingProfileWithKeybind = profiles.find(p => 
        p.id !== editingKeybind && p.keybind === keyName
      );
      
      if (existingProfileWithKeybind) {
        // Remove keybind from the other profile
        setProfiles(profiles.map(p => 
          p.id === existingProfileWithKeybind.id 
            ? { ...p, keybind: null } 
            : p
        ));
      }
      
      // Update the keybind for current profile
      setProfiles(profiles.map(p => 
        p.id === editingKeybind 
          ? { ...p, keybind: keyName } 
          : p
      ));
      
      // Exit edit mode
      setEditingKeybind(null);
    };
    
    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingKeybind, profiles]);
  
  // Click outside to cancel keybind edit
  useEffect(() => {
    if (!editingKeybind) return;
    
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setEditingKeybind(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingKeybind]);
  
  // Handle global keybind activation
  useEffect(() => {
    const handleGlobalKeydown = (e) => {
      const keyPressed = e.key;
      
      // Find profile with this keybind
      const profileWithKeybind = profiles.find(p => p.keybind === keyPressed);
      
      if (profileWithKeybind && !editingKeybind) {
        setActiveProfile(profileWithKeybind.id);
      }
    };
    
    document.addEventListener('keydown', handleGlobalKeydown);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, [profiles, editingKeybind]);
  
  // Handle keybind box click
  const handleKeybindClick = (e, profileId) => {
    e.stopPropagation();
    setEditingKeybind(profileId);
  };
  
  // Handle removing keybind
  const removeKeybind = (profileId) => {
    setProfiles(profiles.map(p => 
      p.id === profileId 
        ? { ...p, keybind: null } 
        : p
    ));
  };
  
  // Set active profile
  const setActiveProfile = (profileId) => {
    const profileToActivate = profiles.find(profile => profile.id === profileId);
    
    if (profileToActivate) {
      try {
        const settings = profileToActivate.settings;
        
        if (settings?.bombPartyFeatures) {
          localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(settings.bombPartyFeatures));
        }
        
        if (settings?.positions?.bombParty) {
          localStorage.setItem('jklm-mini-bombparty-position', JSON.stringify(settings.positions.bombParty));
        }
        
        if (settings?.positions?.wordList) {
          localStorage.setItem('jklm-mini-wordlist-position', JSON.stringify(settings.positions.wordList));
        }
        
        if (settings?.guiSettings) {
          if (settings.guiSettings.theme !== undefined) {
            localStorage.setItem('jklm-mini-theme', settings.guiSettings.theme);
          }
          if (settings.guiSettings.accentColor !== undefined) {
            localStorage.setItem('jklm-mini-accent-color', settings.guiSettings.accentColor);
          }
          if (settings.guiSettings.animationsEnabled !== undefined) {
            localStorage.setItem('jklm-mini-animations-enabled', settings.guiSettings.animationsEnabled);
          }
          if (settings.guiSettings.hideTitlebars !== undefined) {
            localStorage.setItem('jklm-mini-hide-titlebars', settings.guiSettings.hideTitlebars);
          }
        }
        
        if (settings?.generalSettings) {
          if (settings.generalSettings.autoSaveEnabled !== undefined) {
            localStorage.setItem('jklm-mini-auto-save-enabled', settings.generalSettings.autoSaveEnabled);
          }
          if (settings.generalSettings.wordFrequencyEnabled !== undefined) {
            localStorage.setItem('jklm-mini-word-frequency-enabled', settings.generalSettings.wordFrequencyEnabled);
          }
          if (settings.generalSettings.wordlistUrl !== undefined) {
            localStorage.setItem('jklm-mini-wordlist-url', settings.generalSettings.wordlistUrl);
          }
        }
        
        if (settings?.notificationSettings) {
          if (settings.notificationSettings.webhookEnabled !== undefined) {
            localStorage.setItem('jklm-mini-webhook-enabled', settings.notificationSettings.webhookEnabled);
          }
          if (settings.notificationSettings.webhookUrl !== undefined) {
            localStorage.setItem('jklm-mini-webhook-url', settings.notificationSettings.webhookUrl);
          }
          if (settings.notificationSettings.logGameResults !== undefined) {
            localStorage.setItem('jklm-mini-log-game-results', settings.notificationSettings.logGameResults);
          }
          if (settings.notificationSettings.logWordUsage !== undefined) {
            localStorage.setItem('jklm-mini-log-word-usage', settings.notificationSettings.logWordUsage);
          }
          if (settings.notificationSettings.pingEveryone !== undefined) {
            localStorage.setItem('jklm-mini-webhook-ping-everyone', settings.notificationSettings.pingEveryone);
          }
        }
        
        if (settings?.debugSettings) {
          localStorage.setItem('jklm-mini-debug-settings', JSON.stringify(settings.debugSettings));
        }
        
        const profileChangeEvent = new CustomEvent('jklm-mini-profile-change', {
          detail: { profileId, settings }
        });
        window.dispatchEvent(profileChangeEvent);
        
        window.location.reload();
      } catch (error) {
        debugLogger.error('storage', 'Error applying profile settings:', error);
      }
    }
    
    setProfiles(profiles.map(profile => ({
      ...profile,
      isActive: profile.id === profileId
    })));
  };
  
  // Create new profile
  const createNewProfile = () => {
    if (!newProfileName.trim()) return;
    
    try {
      const currentSettings = getCurrentSettings();
      const newProfile = {
        id: `profile-${Date.now()}`,
        name: newProfileName.trim(),
        isActive: false,
        settings: currentSettings,
        keybind: null
      };
      
      setProfiles([...profiles, newProfile]);
      setNewProfileName('');
    } catch (error) {
      debugLogger.error('storage', 'Error creating profile:', error);
    }
  };

  // Handle enter key in input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      createNewProfile();
    }
  };
  
  // Rename profile
  const renameProfile = (profileId) => {
    const newName = prompt('Enter new profile name', profiles.find(p => p.id === profileId)?.name);
    if (newName && newName.trim()) {
      setProfiles(profiles.map(profile => 
        profile.id === profileId 
          ? { ...profile, name: newName.trim() } 
          : profile
      ));
    }
  };
  
  // Overwrite profile
  const overwriteProfile = (profileId) => {
    if (confirm('Are you sure you want to overwrite this profile with current settings?')) {
      try {
        const currentSettings = getCurrentSettings();
        setProfiles(profiles.map(profile => 
          profile.id === profileId 
            ? { ...profile, settings: currentSettings } 
            : profile
        ));
      } catch (error) {
        debugLogger.error('storage', 'Error saving settings to profile:', error);
      }
    }
  };

  const deleteProfile = (profileId) => {
    if (profiles.length <= 1) return;
    
    if (confirm('Are you sure you want to delete this profile?')) {
      const isActive = profiles.find(p => p.id === profileId)?.isActive;
      const filteredProfiles = profiles.filter(profile => profile.id !== profileId);
      
      if (isActive && filteredProfiles.length > 0) {
        filteredProfiles[0].isActive = true;
      }
      
      setProfiles(filteredProfiles);
    }
  };
  
  const exportProfile = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    
    try {
      const exportData = {
        name: profile.name,
        settings: profile.settings,
        version: 1
      };
      const jsonStr = JSON.stringify(exportData);
      const code = btoa(jsonStr);
      navigator.clipboard.writeText(code);
      alert('Profile code copied to clipboard!');
    } catch (error) {
      debugLogger.error('storage', 'Export error:', error);
    }
  };
  
  const importProfile = () => {
    if (!importCode.trim()) return;
    
    try {
      const jsonStr = atob(importCode.trim());
      const importData = JSON.parse(jsonStr);
      
      if (!importData.settings || !importData.name) {
        alert('Invalid profile code');
        return;
      }
      
      const newProfile = {
        id: `profile-${Date.now()}`,
        name: importData.name,
        isActive: false,
        settings: importData.settings,
        keybind: null
      };
      
      setProfiles([...profiles, newProfile]);
      setImportCode('');
      setShowImportInput(false);
    } catch (error) {
      debugLogger.error('storage', 'Import error:', error);
      alert('Invalid profile code');
    }
  };
  
  const animEnabled = getAnimationsEnabled();
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: animEnabled ? { staggerChildren: 0.05, delayChildren: 0.1 } : { duration: 0 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: animEnabled ? 0.2 : 0 } }
  };
  
  // Handle profile options menu
  const [activeMenu, setActiveMenu] = useState(null);
  
  const toggleOptionsMenu = (profileId) => {
    setActiveMenu(activeMenu === profileId ? null : profileId);
  };
  
  // Handle options button hover
  const handleOptionsHover = (profileId, isHovering) => {
    setActiveOptionsProfile(isHovering ? profileId : null);
  };
  
  // Toggle panel collapsed state
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
    // Save collapsed state to localStorage
    localStorage.setItem('jklm-mini-profiles-collapsed', !isCollapsed);
  };
  
  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('jklm-mini-profiles-collapsed');
    if (savedCollapsed !== null) {
      setIsCollapsed(savedCollapsed === 'true');
    }
  }, []);
  
  // State for button hover
  const [isCreateButtonHovered, setIsCreateButtonHovered] = useState(false);
  
  return (
    <div 
      className={`profiles-panel ${isCollapsed ? 'collapsed' : ''}`}
      style={{ position: 'fixed', left: position.x, top: position.y }}
      ref={panelRef}
    >
      <div 
        className="profiles-header"
        onMouseDown={handleDragStart}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="profiles-title">
          <span className="profiles-icon">
            <FriendsIcon />
          </span>
          <span>Profiles</span>
        </div>
        <div className="profiles-actions">
          <button 
            className="profiles-minimize-btn"
            onClick={toggleCollapsed}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={isCollapsed ? "6 9 12 15 18 9" : "18 15 12 9 6 15"}></polyline>
            </svg>
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={animEnabled ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={animEnabled ? { height: 0, opacity: 0 } : { opacity: 1 }}
            transition={getTransition({ duration: 0.25 })}
            style={{ overflow: "hidden" }}
          >
            <div className="profiles-actions-row">
              <button 
                className="profile-action-btn create-btn" 
                onClick={createNewProfile}
                style={{ 
                  backgroundColor: isCreateButtonHovered ? accentColor.secondary : accentColor.primary,
                  color: 'white'
                }}
                onMouseEnter={() => setIsCreateButtonHovered(true)}
                onMouseLeave={() => setIsCreateButtonHovered(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              <input
                type="text"
                className="profile-name-input"
                placeholder="profile name"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button 
                className="profile-action-btn import-btn" 
                onClick={() => setShowImportInput(!showImportInput)}
                style={{ 
                  backgroundColor: showImportInput ? accentColor.primary : 'rgba(255, 255, 255, 0.1)',
                  color: 'white'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
            </div>
            
            {showImportInput && (
              <div className="profiles-import-row">
                <input
                  type="text"
                  className="profile-name-input"
                  placeholder="paste profile code"
                  value={importCode}
                  onChange={(e) => setImportCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && importProfile()}
                />
                <button 
                  className="profile-action-btn import-confirm-btn" 
                  onClick={importProfile}
                  style={{ 
                    backgroundColor: accentColor.primary,
                    color: 'white'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </button>
              </div>
            )}
            
            <motion.div 
              className="profiles-list"
              variants={containerVariants}
              initial={animEnabled ? "hidden" : false}
              animate="visible"
            >
              {profiles.map((profile) => (
                <motion.div 
                  key={profile.id}
                  variants={itemVariants}
                  className={`profile-item ${profile.isActive ? 'active' : ''} 
                              ${activeOptionsProfile === profile.id ? 'options-active' : ''}
                              ${profile.keybind ? 'has-keybind' : ''}
                              ${editingKeybind === profile.id ? 'editing-keybind' : ''}`}
                  onClick={() => setActiveProfile(profile.id)}
                  data-keybind={profile.keybind}
                >
                  <span className="profile-name">{profile.name}</span>
                  {editingKeybind === profile.id && (
                    <div className="keybind-edit-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                    </div>
                  )}
                  <div 
                    className="keybind-area" 
                    style={{ 
                      position: 'absolute', 
                      right: '42px', 
                      width: '24px', 
                      height: '24px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 3,
                      cursor: 'pointer',
                      ...(editingKeybind === profile.id ? { 
                        backgroundColor: accentColor.primary,
                        borderRadius: '4px' 
                      } : {})
                    }}
                    onClick={(e) => handleKeybindClick(e, profile.id)}
                  />
                  <button 
                    className="profile-options-btn"
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={() => handleOptionsHover(profile.id, true)}
                    onMouseLeave={() => handleOptionsHover(profile.id, false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                  
                  <div 
                    className="profile-options-icons"
                    onMouseEnter={() => handleOptionsHover(profile.id, true)}
                    onMouseLeave={() => handleOptionsHover(profile.id, false)}
                  >
                    <div 
                      className="profile-option-icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        renameProfile(profile.id);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                    </div>
                    <div 
                      className="profile-option-icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        overwriteProfile(profile.id);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                      </svg>
                    </div>
                    <div 
                      className="profile-option-icon export-icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        exportProfile(profile.id);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                    </div>
                    <div 
                      className="profile-option-icon delete-icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProfile(profile.id);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(ProfilesPanel);