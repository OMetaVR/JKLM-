import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import debugLogger from '../../utils/debugLogger';
import '../../styles/panels/bombPartyPanel.css';
import '../../styles/wordListPlaceholder.css';
import { BombIcon } from '../Icons';
import Dropdown from '../Dropdown';
import WordTracker from '../WordTracker';
import AlphabetTracker from '../AlphabetTracker';
import AutoTyper from '../AutoTyper';
import SilentTyper from '../SilentTyper';

const BombPartyPanel = () => {
  const { isDark, accentColor } = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  const getAnimationsEnabled = () => {
    return localStorage.getItem('jklm-mini-animations-enabled') !== 'false';
  };
  
  const getTransition = (config = {}) => {
    if (!getAnimationsEnabled()) return { duration: 0 };
    return { duration: 0.25, ease: "easeInOut", ...config };
  };
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const panelRef = useRef(null);
  const [editingKeybind, setEditingKeybind] = useState(null);
  const [activeSettings, setActiveSettings] = useState(null);
  
  const [position, setPosition] = useState({ x: 350, y: 100 });
  const [isInitialized, setIsInitialized] = useState(false);
  

  
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-auto-save-enabled');
    return stored !== null ? stored === 'true' : true;
  });
  
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'jklm-mini-auto-save-enabled') {
        setAutoSaveEnabled(e.newValue === 'true');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  const saveToActiveProfile = (newFeatures) => {
    if (!autoSaveEnabled) return;
    
    try {
      const savedProfiles = localStorage.getItem('jklm-mini-profiles');
      if (!savedProfiles) return;
      
      const profiles = JSON.parse(savedProfiles);
      const activeProfile = profiles.find(p => p.isActive);
      
      if (!activeProfile) return;
      
      const updatedProfiles = profiles.map(profile => {
        if (profile.isActive) {
          const bombPartyPosition = localStorage.getItem('jklm-mini-bombparty-position');
          const wordListPosition = localStorage.getItem('jklm-mini-wordlist-position');
          
          const currentSettings = {
            ...(profile.settings || {}),
            bombPartyFeatures: newFeatures,
            positions: {
              ...(profile.settings?.positions || {}),
              bombParty: bombPartyPosition ? JSON.parse(bombPartyPosition) : null,
              wordList: wordListPosition ? JSON.parse(wordListPosition) : null
            }
          };
          
          return {
            ...profile,
            settings: currentSettings
          };
        }
        return profile;
      });
      
      localStorage.setItem('jklm-mini-profiles', JSON.stringify(updatedProfiles));
    } catch (error) {
      debugLogger.error('storage', 'Error auto-saving to profile:', error);
    }
  };
  
  useEffect(() => {
    const dataVersionMigrated = localStorage.getItem('jklm-mini-features-v3');
    
    if (!dataVersionMigrated) {
      try {
        const savedFeatures = localStorage.getItem('jklm-mini-bombparty-features');
        if (savedFeatures) {
          const parsedFeatures = JSON.parse(savedFeatures);
          
          const updatedFeatures = parsedFeatures.map(feature => {
            if (feature.id === 'word-list') {
              return {
                ...feature,
                settings: {
                  displayMode: feature.settings?.displayMode || 'window',
                  placeholderSize: feature.settings?.placeholderSize || 'medium',
                  displayWordlist: feature.settings?.displayWordlist !== undefined ? feature.settings.displayWordlist : true,
                  shortWords: feature.settings?.shortWords || { enabled: true, count: 3 },
                  mediumWords: feature.settings?.mediumWords || { enabled: true, count: 3 },
                  longWords: feature.settings?.longWords || { enabled: true, count: 3 }
                }
              };
            }
            return feature;
          });
          
          localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(updatedFeatures));
        }
      } catch (error) {
        debugLogger.error('storage', 'Error migrating features data:', error);
      }
      
      localStorage.setItem('jklm-mini-features-v3', 'true');
    }
  }, []);
  
  const [features, setFeatures] = useState(() => {
    const savedFeatures = localStorage.getItem('jklm-mini-bombparty-features');
    const defaultFeatures = [
      { id: 'auto-typer', name: 'Auto Typer', enabled: false, keybind: null, settings: { 
        reactionTimeMin: 200, 
        reactionTimeMax: 500, 
        wordLengthMin: 4, 
        wordLengthMax: 12, 
        wpmMin: 60, 
        wpmMax: 90, 
        typoChance: 5, 
        typoFixDelay: 300 
      } },
      { id: 'silent-typer', name: 'Silent Typer', enabled: false, keybind: null, settings: { 
        wordLengthMin: 4, 
        wordLengthMax: 12, 
        showInPlaceholder: false, 
        showFloatingBadge: false 
      } },
      { id: 'word-list', name: 'Word List', enabled: false, keybind: null, settings: { 
        displayMode: 'window',
        placeholderSize: 'medium',
        displayWordlist: true,
        shortWords: {
          enabled: true,
          count: 3
        },
        mediumWords: {
          enabled: true,
          count: 3
        },
        longWords: {
          enabled: true,
          count: 3
        }
      } },
      { id: 'word-tracker', name: 'Word Tracker', enabled: false, keybind: null, settings: {} },
      { id: 'timer', name: 'Turn Timer', enabled: false, keybind: null, settings: {} },
      { id: 'abc', name: 'Alphabet', enabled: false, keybind: null, settings: {} },
      { id: 'wordfeed', name: 'Wordfeed', enabled: false, keybind: null, settings: {} },
      { id: 'bind-list', name: 'Bind List', enabled: false, keybind: null, settings: { 
        displayBinds: true, 
        displayQuickSettings: true,
        featureVisibility: {}
      } }
    ];
    
    if (savedFeatures) {
      try {
        let parsedFeatures = JSON.parse(savedFeatures);
        
        const mergedFeatures = defaultFeatures.map(defaultFeature => {
          const existingFeature = parsedFeatures.find(f => f.id === defaultFeature.id);
          
          if (existingFeature) {
            return {
              ...defaultFeature,
              ...existingFeature,
              settings: {
                ...defaultFeature.settings,
                ...existingFeature.settings
              }
            };
          } else {
            debugLogger.debug('feature-manager', `Adding new feature: ${defaultFeature.name}`);
            return defaultFeature;
          }
        });
        
        return mergedFeatures;
      } catch (error) {
        debugLogger.error('feature-manager', 'Error parsing saved features:', error);
        return defaultFeatures;
      }
    }
    
    return defaultFeatures;
  });

  useEffect(() => {
    localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(features));
    saveToActiveProfile(features);
    window.dispatchEvent(new CustomEvent('jklm-mini-settings-change'));
  }, [features]);
  
  useEffect(() => {
    const loadPosition = () => {
    const savedPosition = localStorage.getItem('jklm-mini-bombparty-position');
    if (savedPosition) {
      try {
        const parsedPosition = JSON.parse(savedPosition);
        setPosition({
          x: typeof parsedPosition.x === 'number' ? parsedPosition.x : 350,
          y: typeof parsedPosition.y === 'number' ? parsedPosition.y : 100
        });
      } catch (e) {
        debugLogger.error('storage', 'Error parsing saved position:', e);
        setPosition({ x: 350, y: 100 });
      }
    }
    setIsInitialized(true);
    };
    
    loadPosition();
    
    const handleStorageChange = (e) => {
      if (e.key === 'jklm-mini-bombparty-position') {
        loadPosition();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  const handleDragStart = useCallback((e) => {
    if (e.target.closest('.bombparty-minimize-btn')) return;
    e.preventDefault();
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  }, [position]);

  const handleDragMove = useCallback((e) => {
    if (!isDragging) return;
    const newPosition = {
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y
    };
    setPosition(newPosition);
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    localStorage.setItem('jklm-mini-bombparty-position', JSON.stringify(position));
    if (autoSaveEnabled) {
      saveToActiveProfile(features);
    }
  }, [isDragging, position, autoSaveEnabled, features]);

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
  
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
    localStorage.setItem('jklm-mini-bombparty-collapsed', !isCollapsed);
  };
  
  const [hideTitlebars, setHideTitlebars] = useState(() => {
    return localStorage.getItem('jklm-mini-hide-titlebars') === 'true';
  });
  
  const [isMenuVisible, setIsMenuVisible] = useState(() => {
    return localStorage.getItem('jklm-mini-menu-visible') === 'true';
  });
  
  useEffect(() => {
    const handleSettingsChange = (event) => {
      if (event.detail?.action === 'toggle-hide-titlebars') {
        setHideTitlebars(event.detail.hideTitlebars);
      }
    };
    
    const handleMenuVisibilityChange = (event) => {
      setIsMenuVisible(event.detail.visible);
    };
    
    window.addEventListener('jklm-mini-settings-change', handleSettingsChange);
    window.addEventListener('jklm-mini-menu-visibility-change', handleMenuVisibilityChange);
    
    return () => {
      window.removeEventListener('jklm-mini-settings-change', handleSettingsChange);
      window.removeEventListener('jklm-mini-menu-visibility-change', handleMenuVisibilityChange);
    };
  }, []);
  
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('jklm-mini-bombparty-collapsed');
    if (savedCollapsed !== null) {
      setIsCollapsed(savedCollapsed === 'true');
    }
  }, []);

  const toggleFeature = (featureId) => {
    const currentFeature = features.find(f => f.id === featureId);
    const newEnabledState = !currentFeature.enabled;
    
    const updatedFeatures = features.map(feature => 
      feature.id === featureId 
        ? { ...feature, enabled: newEnabledState } 
        : feature
    );
    
    setFeatures(updatedFeatures);
    localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(updatedFeatures));
    
    const event = new CustomEvent('jklm-mini-feature-toggle', {
      detail: {
        action: 'toggle-feature',
        featureId: featureId,
        enabled: newEnabledState,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(event);
    
    if (featureId === 'word-list') {
      const legacyEvent = new CustomEvent('jklm-mini-settings-change', {
        detail: {
          action: 'toggle-feature',
          featureId: featureId,
          enabled: newEnabledState
        }
      });
      window.dispatchEvent(legacyEvent);
    }
    
    debugLogger.debug('feature-manager', `Feature ${featureId} toggled to: ${newEnabledState}`);
  };

  const toggleFeatureSettings = (e, featureId) => {
    e.stopPropagation();
    setActiveSettings(activeSettings === featureId ? null : featureId);
  };

  const handleRightClick = (e, featureId) => {
    e.preventDefault();
    toggleFeatureSettings(e, featureId);
  };

  const handleKeybindClick = (e, featureId) => {
    e.stopPropagation();
    setEditingKeybind(featureId);
  };

  useEffect(() => {
    if (!editingKeybind) return;
    
    const handleKeyDown = (e) => {
      e.preventDefault();
      
      let keyName = e.key;
      
      if (e.key === ' ') keyName = 'Space';
      else if (e.key === 'Escape') {
        setFeatures(features.map(feature => 
          feature.id === editingKeybind 
            ? { ...feature, keybind: null } 
            : feature
        ));
        setEditingKeybind(null);
        return;
      }
      
      const existingFeatureWithKeybind = features.find(feature => 
        feature.id !== editingKeybind && feature.keybind === keyName
      );
      
      if (existingFeatureWithKeybind) {
        setFeatures(features.map(feature => 
          feature.id === existingFeatureWithKeybind.id 
            ? { ...feature, keybind: null } 
            : feature
        ));
      }
      
      setFeatures(features.map(feature => 
        feature.id === editingKeybind 
          ? { ...feature, keybind: keyName } 
          : feature
      ));
      
      setEditingKeybind(null);
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingKeybind, features]);

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

  useEffect(() => {
    const handleGlobalKeydown = (e) => {
      const keyPressed = e.key;
      const featureWithKeybind = features.find(feature => feature.keybind === keyPressed);
      if (featureWithKeybind && !editingKeybind) {
        toggleFeature(featureWithKeybind.id);
      }
    };
    
    const handleIframeKeybind = (e) => {
      const keyPressed = e.detail?.key;
      if (!keyPressed) return;
      const featureWithKeybind = features.find(feature => feature.keybind === keyPressed);
      if (featureWithKeybind && !editingKeybind) {
        toggleFeature(featureWithKeybind.id);
      }
    };
    
    document.addEventListener('keydown', handleGlobalKeydown);
    document.addEventListener('jklm-mini-iframe-keybind', handleIframeKeybind);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown);
      document.removeEventListener('jklm-mini-iframe-keybind', handleIframeKeybind);
    };
  }, [features, editingKeybind]);
  
  const animEnabled = getAnimationsEnabled();
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: animEnabled ? { staggerChildren: 0.1 } : { duration: 0 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: animEnabled ? 0.2 : 0 } }
  };

  const VerticalEllipsis = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1"></circle>
      <circle cx="12" cy="5" r="1"></circle>
      <circle cx="12" cy="19" r="1"></circle>
    </svg>
  );

  const renderFeatureSettings = (feature) => {
    switch (feature.id) {
      case 'auto-typer':
        return <AutoTyper />;
      
      case 'silent-typer':
        return <SilentTyper />;
      
      case 'word-list':
        const settings = {
          displayMode: feature.settings?.displayMode || 'window',
          placeholderSize: feature.settings?.placeholderSize || 'medium',
          shortWords: feature.settings?.shortWords || { enabled: true, count: 3 },
          mediumWords: feature.settings?.mediumWords || { enabled: true, count: 3 },
          longWords: feature.settings?.longWords || { enabled: true, count: 3 }
        };
        
        return (
          <>
            <Dropdown
              options={[
                { value: 'window', label: 'Window' },
                { value: 'placeholder', label: 'Placeholder' },
              ]}
              selectedOption={settings.displayMode}
              onSelect={(value) => {
                const updatedFeatures = features.map(f => 
                  f.id === feature.id 
                    ? { ...f, settings: { ...f.settings, displayMode: value } } 
                    : f
                );
                
                setFeatures(updatedFeatures);
                localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(updatedFeatures));
                const event = new CustomEvent('jklm-mini-settings-change', {
                  detail: {
                    action: 'change-display-mode',
                    featureId: feature.id,
                    displayMode: value
                  }
                });
                window.dispatchEvent(event);
              }}
              label="Display Mode"
            />

            {settings.displayMode === 'placeholder' && (
              <div className="placeholder-size-wrapper">
                <div className="placeholder-size-selector-label">Word Size</div>
                <div className="placeholder-size-selector">
                  {['small', 'medium', 'large'].map((size) => (
                    <div 
                      key={size}
                      className={`placeholder-size-option ${settings.placeholderSize === size ? 'selected' : ''}`}
                      onClick={() => {
                        const updatedFeatures = features.map(f => 
                          f.id === feature.id 
                            ? { ...f, settings: { ...f.settings, placeholderSize: size } } 
                            : f
                        );
                        setFeatures(updatedFeatures);
                        localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(updatedFeatures));
                        window.dispatchEvent(new CustomEvent('jklm-mini-settings-change'));
                      }}
                    >
                      {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {settings.displayMode !== 'placeholder' && (
              <>
                <div className="word-length-section">
                  <div className="setting-item">
                    <label>3-5 letter words</label>
                    <div 
                      className={`toggle-switch ${settings.shortWords.enabled ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const updatedFeatures = features.map(f => 
                          f.id === feature.id 
                            ? { ...f, settings: { 
                                ...f.settings, 
                                shortWords: {
                                  ...settings.shortWords,
                                  enabled: !settings.shortWords.enabled
                                }
                              } 
                            } 
                            : f
                        );
                        setFeatures(updatedFeatures);

                        localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(updatedFeatures));

                        window.dispatchEvent(new CustomEvent('jklm-mini-settings-change'));
                      }}
                      style={{ 
                        backgroundColor: settings.shortWords.enabled ? accentColor.primary : 'rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div className="toggle-switch-handle"></div>
                    </div>
                  </div>

                  {settings.shortWords.enabled && (
                    <div className="setting-item slider-item">
                      <label>Count</label>
                      <input 
                        type="range" 
                        min="1" 
                        max="6" 
                        step="1"
                        value={settings.shortWords.count} 
                        onChange={(e) => {
                          const newCount = parseInt(e.target.value);
                          const updatedFeatures = features.map(f => 
                            f.id === feature.id 
                              ? { ...f, settings: { 
                                  ...f.settings,
                                  shortWords: {
                                    ...settings.shortWords,
                                    count: newCount
                                  }
                                } 
                              } 
                              : f
                          );
                          setFeatures(updatedFeatures);
  
                          localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(updatedFeatures));
  
                          window.dispatchEvent(new CustomEvent('jklm-mini-settings-change'));
                        }}
                        style={{
                          '--progress': `${(settings.shortWords.count - 1) / 5 * 100}%`,
                          '--accent-color': accentColor.primary
                        }}
                      />
                      <span>{settings.shortWords.count}</span>
                    </div>
                  )}
                </div>

                <div className="word-length-section">
                  <div className="setting-item">
                    <label>6-9 letter words</label>
                    <div 
                      className={`toggle-switch ${settings.mediumWords.enabled ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const updatedFeatures = features.map(f => 
                          f.id === feature.id 
                            ? { ...f, settings: { 
                                ...f.settings, 
                                mediumWords: {
                                  ...settings.mediumWords,
                                  enabled: !settings.mediumWords.enabled
                                }
                              } 
                            } 
                            : f
                        );
                        setFeatures(updatedFeatures);

                        localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(updatedFeatures));

                        window.dispatchEvent(new CustomEvent('jklm-mini-settings-change'));
                      }}
                      style={{ 
                        backgroundColor: settings.mediumWords.enabled ? accentColor.primary : 'rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div className="toggle-switch-handle"></div>
                    </div>
                  </div>

                  {settings.mediumWords.enabled && (
                    <div className="setting-item slider-item">
                      <label>Count</label>
                      <input 
                        type="range" 
                        min="1" 
                        max="6" 
                        step="1"
                        value={settings.mediumWords.count} 
                        onChange={(e) => {
                          const newCount = parseInt(e.target.value);
                          const updatedFeatures = features.map(f => 
                            f.id === feature.id 
                              ? { ...f, settings: { 
                                  ...f.settings,
                                  mediumWords: {
                                    ...settings.mediumWords,
                                    count: newCount
                                  }
                                } 
                              } 
                              : f
                          );
                          setFeatures(updatedFeatures);
  
                          localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(updatedFeatures));
  
                          window.dispatchEvent(new CustomEvent('jklm-mini-settings-change'));
                        }}
                        style={{
                          '--progress': `${(settings.mediumWords.count - 1) / 5 * 100}%`,
                          '--accent-color': accentColor.primary
                        }}
                      />
                      <span>{settings.mediumWords.count}</span>
                    </div>
                  )}
                </div>

                <div className="word-length-section">
                  <div className="setting-item">
                    <label>10+ letter words</label>
                    <div 
                      className={`toggle-switch ${settings.longWords.enabled ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const updatedFeatures = features.map(f => 
                          f.id === feature.id 
                            ? { ...f, settings: { 
                                ...f.settings, 
                                longWords: {
                                  ...settings.longWords,
                                  enabled: !settings.longWords.enabled
                                }
                              } 
                            } 
                            : f
                        );
                        setFeatures(updatedFeatures);

                        localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(updatedFeatures));

                        window.dispatchEvent(new CustomEvent('jklm-mini-settings-change'));
                      }}
                      style={{ 
                        backgroundColor: settings.longWords.enabled ? accentColor.primary : 'rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div className="toggle-switch-handle"></div>
                    </div>
                  </div>

                  {settings.longWords.enabled && (
                    <div className="setting-item slider-item">
                      <label>Count</label>
                      <input 
                        type="range" 
                        min="1" 
                        max="6" 
                        step="1"
                        value={settings.longWords.count} 
                        onChange={(e) => {
                          const newCount = parseInt(e.target.value);
                          const updatedFeatures = features.map(f => 
                            f.id === feature.id 
                              ? { ...f, settings: { 
                                  ...f.settings,
                                  longWords: {
                                    ...settings.longWords,
                                    count: newCount
                                  }
                                } 
                              } 
                              : f
                          );
                          setFeatures(updatedFeatures);
  
                          localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(updatedFeatures));
   
                          window.dispatchEvent(new CustomEvent('jklm-mini-settings-change'));
                        }}
                        style={{
                          '--progress': `${(settings.longWords.count - 1) / 5 * 100}%`,
                          '--accent-color': accentColor.primary
                        }}
                      />
                      <span>{settings.longWords.count}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        );
      
      case 'word-tracker':
        return <WordTracker />;
      
      case 'abc':
        return <AlphabetTracker />;
      
      case 'bind-list':
        const bindSettings = {
          displayBinds: feature.settings?.displayBinds !== false,
          displayQuickSettings: feature.settings?.displayQuickSettings !== false,
          featureVisibility: feature.settings?.featureVisibility || {}
        };
        
        return (
          <>
            <div className="setting-item">
              <label>Display Binds</label>
              <div 
                className={`toggle-switch ${bindSettings.displayBinds ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const updatedFeatures = features.map(f => 
                    f.id === feature.id 
                      ? { ...f, settings: { ...f.settings, displayBinds: !bindSettings.displayBinds } } 
                      : f
                  );
                  setFeatures(updatedFeatures);
                  localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(updatedFeatures));
                  window.dispatchEvent(new CustomEvent('jklm-mini-settings-change'));
                }}
                style={{ backgroundColor: bindSettings.displayBinds ? accentColor.primary : 'rgba(255, 255, 255, 0.1)' }}
              >
                <div className="toggle-switch-handle"></div>
              </div>
            </div>
            <div className="setting-item">
              <label>Display Quick Settings</label>
              <div 
                className={`toggle-switch ${bindSettings.displayQuickSettings ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const updatedFeatures = features.map(f => 
                    f.id === feature.id 
                      ? { ...f, settings: { ...f.settings, displayQuickSettings: !bindSettings.displayQuickSettings } } 
                      : f
                  );
                  setFeatures(updatedFeatures);
                  localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(updatedFeatures));
                  window.dispatchEvent(new CustomEvent('jklm-mini-settings-change'));
                }}
                style={{ backgroundColor: bindSettings.displayQuickSettings ? accentColor.primary : 'rgba(255, 255, 255, 0.1)' }}
              >
                <div className="toggle-switch-handle"></div>
              </div>
            </div>
            <div className="bind-list-feature-toggles">
              <div className="setting-label">Show in panel:</div>
              {features.filter(f => f.id !== 'bind-list').map(f => (
                <div key={f.id} className="setting-item compact">
                  <label>{f.name}</label>
                  <div 
                    className={`toggle-switch ${bindSettings.featureVisibility[f.id] !== false ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const newVisibility = { ...bindSettings.featureVisibility, [f.id]: bindSettings.featureVisibility[f.id] === false };
                      const updatedFeatures = features.map(feat => 
                        feat.id === feature.id 
                          ? { ...feat, settings: { ...feat.settings, featureVisibility: newVisibility } } 
                          : feat
                      );
                      setFeatures(updatedFeatures);
                      localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(updatedFeatures));
                      window.dispatchEvent(new CustomEvent('jklm-mini-settings-change'));
                    }}
                    style={{ backgroundColor: bindSettings.featureVisibility[f.id] !== false ? accentColor.primary : 'rgba(255, 255, 255, 0.1)' }}
                  >
                    <div className="toggle-switch-handle"></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      
      default:
        return <div className="setting-item">No settings available</div>;
    }
  };

  useEffect(() => {
    const handleProfileChange = (event) => {
      const { settings } = event.detail;
      
      if (settings?.bombPartyFeatures) {
        setFeatures(settings.bombPartyFeatures);
      }
      
      if (settings?.positions?.bombParty) {
        setPosition(settings.positions.bombParty);
      }
    };
    
    window.addEventListener('jklm-mini-profile-change', handleProfileChange);
    
    return () => {
      window.removeEventListener('jklm-mini-profile-change', handleProfileChange);
    };
  }, []);

  const [currentSyllable, setCurrentSyllable] = useState('ION');

  if (!isInitialized) {
    return null;
  }

  const wordListFeature = features.find(f => f.id === 'word-list');
  const shouldShowWordList = wordListFeature && 
                            wordListFeature.enabled && 
                            wordListFeature.settings.displayMode === 'window';

  return (
    <div 
      className={`bombparty-panel ${isCollapsed ? 'collapsed' : ''} ${hideTitlebars && !isMenuVisible ? 'panel-with-hidden-titlebar' : ''}`}
      style={{ position: 'fixed', left: position.x, top: position.y }}
      ref={panelRef}
    >
      <div 
        className={`bombparty-header ${hideTitlebars && !isMenuVisible ? 'hide-titlebars' : ''}`}
        onMouseDown={handleDragStart}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="bombparty-title">
          <span className="bombparty-icon">
            <BombIcon />
          </span>
          <span>Bomb Party</span>
        </div>
        <div className="bombparty-actions">
          <button 
            className="bombparty-minimize-btn"
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
            <motion.div 
              className="feature-list"
              variants={containerVariants}
              initial={animEnabled ? "hidden" : false}
              animate="visible"
            >
              {features.map((feature) => (
                <motion.div 
                  key={feature.id}
                  variants={itemVariants}
                  className={`feature-container ${activeSettings === feature.id ? 'settings-active' : ''}`}
                >
                  <div
                    className={`feature-item ${feature.enabled ? 'enabled' : ''} 
                               ${activeSettings === feature.id ? 'settings-active' : ''}
                               ${feature.keybind ? 'has-keybind' : ''}
                               ${editingKeybind === feature.id ? 'editing-keybind' : ''}`}
                    onClick={() => toggleFeature(feature.id)}
                    onContextMenu={(e) => handleRightClick(e, feature.id)}
                    data-keybind={feature.keybind}
                    style={{
                      ...(feature.enabled && { 
                        backgroundColor: `${accentColor.primary}20`,
                        color: accentColor.primary,
                        borderLeft: `3px solid ${accentColor.primary}`
                      })
                    }}
                  >
                    <span className="feature-name">{feature.name}</span>
                    
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...(editingKeybind === feature.id ? { 
                          backgroundColor: accentColor.primary,
                          borderRadius: '4px' 
                        } : {})
                      }}
                      onClick={(e) => handleKeybindClick(e, feature.id)}
                    >
                      {editingKeybind === feature.id && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'pulse 1.5s infinite' }}>
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                      )}
                    </div>
                    
                    {feature.id !== 'timer' && feature.id !== 'wordfeed' && (
                      <button 
                        className="feature-settings-btn"
                        onClick={(e) => toggleFeatureSettings(e, feature.id)}
                      >
                        <VerticalEllipsis />
                      </button>
                    )}
                  </div>
                  
                  {feature.id !== 'timer' && feature.id !== 'wordfeed' && (
                    <div 
                      className="feature-settings-panel"
                    >
                      <div className="settings-content">
                        {renderFeatureSettings(feature)}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(BombPartyPanel);