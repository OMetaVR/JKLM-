import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useAnimation } from '../context/AnimationContext';
import { useKeybind } from '../context/KeybindContext';
import AccentColorPicker from './AccentColorPicker';
import debugLogger from '../utils/debugLogger';
import '../styles/navPanel.css';
import {
  SettingsIcon,
  InventoryIcon,
  BombIcon,
  SodaCupIcon,
  UtilityIcon,
  WorldIcon,
  FriendsIcon,
  ChevronRightIcon
} from './Icons';

const NavPanel = ({ onSelectPanel, activePanels = [] }) => {
  const { isDark, toggleTheme } = useTheme();
  const { animationsEnabled, getAnimationDuration, getTransition } = useAnimation();
  const { menuToggleKeybind, isEditingMenuKeybind, startEditingMenuKeybind, setNewMenuKeybind } = useKeybind();
  const constraintsRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showGUISettings, setShowGUISettings] = useState(false);
  const [showGeneralSettings, setShowGeneralSettings] = useState(false);
  const [showDeveloperSettings, setShowDeveloperSettings] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [contentHeight, setContentHeight] = useState("auto");
  const mainMenuRef = useRef(null);
  const settingsMenuRef = useRef(null);
  const guiSettingsRef = useRef(null);
  const generalSettingsRef = useRef(null);
  const developerSettingsRef = useRef(null);
  const notificationSettingsRef = useRef(null);
  
  const [hideTitlebars, setHideTitlebars] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-hide-titlebars');
    return stored === 'true';
  });
  
  const toggleHideTitlebars = () => {
    const newValue = !hideTitlebars;
    setHideTitlebars(newValue);
    localStorage.setItem('jklm-mini-hide-titlebars', newValue);
    
    window.dispatchEvent(new CustomEvent('jklm-mini-settings-change', {
      detail: {
        action: 'toggle-hide-titlebars',
        hideTitlebars: newValue
      }
    }));
  };
  
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-auto-save-enabled');
    return stored !== null ? stored === 'true' : true;
  });
  
  const [wordFrequencyEnabled, setWordFrequencyEnabled] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-word-frequency-enabled');
    return stored !== null ? stored === 'true' : false;
  });
  
  const [wordlistUrl, setWordlistUrl] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-wordlist-url');
    return stored || 'https://raw.githubusercontent.com/OMetaVR/Bomb-party-word-list/refs/heads/main/wordlist.txt';
  });

  const [webhookUrl, setWebhookUrl] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-webhook-url');
    return stored || '';
  });

  const [webhookEnabled, setWebhookEnabled] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-webhook-enabled');
    return stored === 'true';
  });

  const [logGameResults, setLogGameResults] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-log-game-results');
    return stored !== 'false';
  });

  const [logWordUsage, setLogWordUsage] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-log-word-usage');
    return stored === 'true';
  });

  const [pingEveryone, setPingEveryone] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-webhook-ping-everyone');
    return stored === 'true';
  });

  const [logPopsauceResults, setLogPopsauceResults] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-log-popsauce-results');
    return stored !== 'false';
  });
  
  useEffect(() => {
    localStorage.setItem('jklm-mini-auto-save-enabled', autoSaveEnabled);
  }, [autoSaveEnabled]);
  
  useEffect(() => {
    localStorage.setItem('jklm-mini-word-frequency-enabled', wordFrequencyEnabled);
  }, [wordFrequencyEnabled]);
  
  useEffect(() => {
    localStorage.setItem('jklm-mini-wordlist-url', wordlistUrl);
  }, [wordlistUrl]);

  useEffect(() => {
    localStorage.setItem('jklm-mini-webhook-url', webhookUrl);
  }, [webhookUrl]);

  useEffect(() => {
    localStorage.setItem('jklm-mini-webhook-enabled', webhookEnabled);
  }, [webhookEnabled]);

  useEffect(() => {
    localStorage.setItem('jklm-mini-log-game-results', logGameResults);
  }, [logGameResults]);

  useEffect(() => {
    localStorage.setItem('jklm-mini-log-word-usage', logWordUsage);
  }, [logWordUsage]);

  useEffect(() => {
    localStorage.setItem('jklm-mini-webhook-ping-everyone', pingEveryone);
  }, [pingEveryone]);

  useEffect(() => {
    localStorage.setItem('jklm-mini-log-popsauce-results', logPopsauceResults);
  }, [logPopsauceResults]);
  
  const toggleAutoSave = () => {
    setAutoSaveEnabled(!autoSaveEnabled);
  };

  const toggleWordFrequency = () => {
    setWordFrequencyEnabled(!wordFrequencyEnabled);
  };

  const handleWordlistUrlChange = (e) => {
    setWordlistUrl(e.target.value);
  };

  const resetWordlistUrl = () => {
    setWordlistUrl('https://raw.githubusercontent.com/OMetaVR/Bomb-party-word-list/refs/heads/main/wordlist.txt');
  };

  const [position, setPosition] = useState(() => {
    const savedPosition = localStorage.getItem('jklm-mini-menu-position');
    return savedPosition ? JSON.parse(savedPosition) : { x: 100, y: 100 };
  });

  const handleDragEnd = (event, info) => {
    const newPosition = { x: info.offset.x + position.x, y: info.offset.y + position.y };
    setPosition(newPosition);
    localStorage.setItem('jklm-mini-menu-position', JSON.stringify(newPosition));
  };

  const menuHeights = {
    main: 235,
    settings: 245,
    gui: 194,
    general: 370,
    developer: 400,
    notification: 310
  };

  useEffect(() => {
    if (showSettings) {
      if (showGUISettings) {
        setContentHeight(menuHeights.gui);
      } else if (showGeneralSettings) {
        setContentHeight(menuHeights.general);
      } else if (showDeveloperSettings) {
        setContentHeight(menuHeights.developer);
      } else if (showNotificationSettings) {
        setContentHeight(menuHeights.notification);
      } else {
        setContentHeight(menuHeights.settings);
      }
    } else {
      setContentHeight(menuHeights.main);
    }
  }, [showSettings, showGUISettings, showGeneralSettings, showDeveloperSettings, showNotificationSettings]);

  const toggleSettings = () => {
    if (showSettings) {
      setContentHeight(menuHeights.main);
      setShowGUISettings(false);
      setShowGeneralSettings(false);
      setShowDeveloperSettings(false);
      setShowNotificationSettings(false);
    } else {
      setContentHeight(menuHeights.settings);
    }
    
    if (animationsEnabled) {
      setTimeout(() => {
        setShowSettings(!showSettings);
      }, 20);
    } else {
      setShowSettings(!showSettings);
    }
  };

  const toggleGUISettings = () => {
    if (showGeneralSettings) setShowGeneralSettings(false);
    if (showDeveloperSettings) setShowDeveloperSettings(false);
    if (showNotificationSettings) setShowNotificationSettings(false);
    
    setContentHeight(showGUISettings ? menuHeights.settings : menuHeights.gui);
    
    if (animationsEnabled) {
      setTimeout(() => setShowGUISettings(!showGUISettings), 20);
    } else {
      setShowGUISettings(!showGUISettings);
    }
  };
  
  const toggleGeneralSettings = () => {
    if (showGUISettings) setShowGUISettings(false);
    if (showDeveloperSettings) setShowDeveloperSettings(false);
    if (showNotificationSettings) setShowNotificationSettings(false);
    
    setContentHeight(showGeneralSettings ? menuHeights.settings : menuHeights.general);
    
    if (animationsEnabled) {
      setTimeout(() => setShowGeneralSettings(!showGeneralSettings), 20);
    } else {
      setShowGeneralSettings(!showGeneralSettings);
    }
  };

  const toggleDeveloperSettings = () => {
    if (showGUISettings) {
      setShowGUISettings(false);
    }
    if (showGeneralSettings) {
      setShowGeneralSettings(false);
    }
    if (showNotificationSettings) {
      setShowNotificationSettings(false);
    }
    
    setContentHeight(showDeveloperSettings ? menuHeights.settings : menuHeights.developer);
    
    if (animationsEnabled) {
      setTimeout(() => {
        setShowDeveloperSettings(!showDeveloperSettings);
      }, 20);
    } else {
      setShowDeveloperSettings(!showDeveloperSettings);
    }
  };

  const toggleNotificationSettings = () => {
    if (showGUISettings) {
      setShowGUISettings(false);
    }
    if (showGeneralSettings) {
      setShowGeneralSettings(false);
    }
    if (showDeveloperSettings) {
      setShowDeveloperSettings(false);
    }
    
    setContentHeight(showNotificationSettings ? menuHeights.settings : menuHeights.notification);
    
    if (animationsEnabled) {
      setTimeout(() => {
        setShowNotificationSettings(!showNotificationSettings);
      }, 20);
    } else {
      setShowNotificationSettings(!showNotificationSettings);
    }
  };

  useEffect(() => {
    if (!isEditingMenuKeybind) return;
    
    const handleKeyDown = (e) => {
      e.preventDefault();
      setNewMenuKeybind(e.key);
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditingMenuKeybind, setNewMenuKeybind]);

  const menuItems = [
    { id: 'bombparty', name: 'Bomb Party', icon: <BombIcon />, hasPanel: true },
    { id: 'popsauce', name: 'Popsauce', icon: <SodaCupIcon />, hasPanel: true },
    { id: 'info', name: 'Info', icon: <UtilityIcon />, hasPanel: true },
    { id: 'misc_divider', type: 'divider' },
    { id: 'misc_label', name: 'MISC', type: 'label' },
    { id: 'profiles', name: 'Profiles', icon: <FriendsIcon />, hasPanel: true },
  ];

  const settingsItems = [
    { id: 'general', name: 'General', hasPanel: true, onSelect: toggleGeneralSettings },
    { id: 'gui', name: 'GUI', hasPanel: true, onSelect: toggleGUISettings },
    { id: 'notifications', name: 'Notifications', hasPanel: true, onSelect: toggleNotificationSettings },
    { id: 'keybinds', name: 'Menu Keybind', type: 'keybind', keybind: menuToggleKeybind, onEdit: startEditingMenuKeybind, isEditing: isEditingMenuKeybind },
    { id: 'developer', name: 'Developer', hasPanel: true, onSelect: toggleDeveloperSettings },
  ];

  const guiSettingsItems = [
    { id: 'theme', name: 'Dark Theme', type: 'toggle', enabled: isDark, onToggle: toggleTheme },
    { id: 'hide_titlebars', name: 'Hide Titlebars', type: 'toggle', enabled: hideTitlebars, onToggle: toggleHideTitlebars },
    { id: 'animations', name: 'Animations', type: 'toggle', enabled: animationsEnabled, onToggle: useAnimation().toggleAnimations },
    { id: 'accent_color', name: 'Accent', type: 'special' },
  ];
  
  const clearAllData = () => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('jklm-mini-')) {
        localStorage.removeItem(key);
      }
    });
    
    if (typeof browser !== 'undefined' && browser.storage) {
      browser.storage.local.clear();
    }
    
    window.location.reload();
  };

  const exportPopsauceAnswers = () => {
    try {
      const answers = localStorage.getItem('jklm-mini-popsauce-answers') || '{}';
      const aliases = localStorage.getItem('jklm-mini-popsauce-aliases') || '{}';
      const exportData = { answers: JSON.parse(answers), aliases: JSON.parse(aliases) };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `popsauce-answers-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      debugLogger.error('storage', 'Error exporting popsauce answers:', e);
    }
  };

  const importPopsauceAnswers = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.answers) {
            const existing = JSON.parse(localStorage.getItem('jklm-mini-popsauce-answers') || '{}');
            const merged = { ...existing, ...data.answers };
            localStorage.setItem('jklm-mini-popsauce-answers', JSON.stringify(merged));
          }
          if (data.aliases) {
            const existing = JSON.parse(localStorage.getItem('jklm-mini-popsauce-aliases') || '{}');
            Object.keys(data.aliases).forEach(hash => {
              if (!existing[hash]) existing[hash] = [];
              data.aliases[hash].forEach(alias => {
                if (!existing[hash].includes(alias)) existing[hash].push(alias);
              });
            });
            localStorage.setItem('jklm-mini-popsauce-aliases', JSON.stringify(existing));
          }
          window.dispatchEvent(new CustomEvent('jklm-mini-settings-change'));
          alert('Popsauce answers imported successfully!');
        } catch (err) {
          alert('Error importing file: Invalid format');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const generalSettingsItems = [
    { id: 'auto_save', name: 'Auto-save', type: 'toggle', enabled: autoSaveEnabled, onToggle: toggleAutoSave },
    { id: 'word_frequency', name: 'Word Frequency', type: 'toggle', enabled: wordFrequencyEnabled, onToggle: toggleWordFrequency },
    { 
      id: 'wordlist_url', 
      name: 'Wordlist URL', 
      type: 'custom',
      component: (
        <div className="settings-input-container">
          <input
            type="text"
            className="settings-text-input"
            value={wordlistUrl}
            onChange={handleWordlistUrlChange}
            placeholder="Enter wordlist URL..."
          />
          <button 
            className="settings-reset-btn"
            onClick={resetWordlistUrl}
            title="Reset to default"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
          </button>
        </div>
      )
    },
    { id: 'popsauce_divider', type: 'divider' },
    { 
      id: 'export_popsauce', 
      name: 'Export Popsauce Answers', 
      type: 'button',
      onClick: exportPopsauceAnswers,
      className: 'success'
    },
    { 
      id: 'import_popsauce', 
      name: 'Import Popsauce Answers', 
      type: 'button',
      onClick: importPopsauceAnswers,
      className: ''
    },
    { id: 'data_divider', type: 'divider' },
    { 
      id: 'clear_data', 
      name: 'Clear All Data', 
      type: 'button',
      onClick: clearAllData,
      className: 'danger'
    }
  ];

  const notificationSettingsItems = [
    { id: 'webhook_enabled', name: 'Enable Webhook', type: 'toggle', enabled: webhookEnabled, onToggle: () => setWebhookEnabled(!webhookEnabled) },
    { id: 'log_game_results', name: 'Log BombParty Results', type: 'toggle', enabled: logGameResults, onToggle: () => setLogGameResults(!logGameResults) },
    { id: 'log_popsauce_results', name: 'Log Popsauce Results', type: 'toggle', enabled: logPopsauceResults, onToggle: () => setLogPopsauceResults(!logPopsauceResults) },
    { id: 'log_word_usage', name: 'Log Word Usage', type: 'toggle', enabled: logWordUsage, onToggle: () => setLogWordUsage(!logWordUsage) },
    { id: 'ping_everyone', name: 'Ping @everyone', type: 'toggle', enabled: pingEveryone, onToggle: () => setPingEveryone(!pingEveryone) },
    { 
      id: 'webhook_url', 
      name: 'Webhook URL', 
      type: 'custom',
      component: (
        <div className="settings-input-container">
          <input
            type="text"
            className="settings-text-input"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="Discord webhook URL..."
          />
        </div>
      )
    }
  ];

  const [debugSystems, setDebugSystems] = useState(() => debugLogger.getAllSystems());

  useEffect(() => {
    const handleDebugSettingsChange = () => {
      setDebugSystems(debugLogger.getAllSystems());
    };

    window.addEventListener('jklm-mini-debug-settings-change', handleDebugSettingsChange);
    return () => {
      window.removeEventListener('jklm-mini-debug-settings-change', handleDebugSettingsChange);
    };
  }, []);

  const toggleDebugSystem = (systemId) => {
    const currentState = debugLogger.isEnabled(systemId);
    debugLogger.setSystemEnabled(systemId, !currentState);
  };

  const enableAllDebugSystems = () => {
    debugLogger.enableAll();
  };

  const disableAllDebugSystems = () => {
    debugLogger.disableAll();
  };

  const resetAllPositions = () => {
    localStorage.removeItem('jklm-mini-menu-position');
    localStorage.removeItem('jklm-mini-bombparty-position');
    localStorage.removeItem('jklm-mini-wordlist-position');
    localStorage.removeItem('jklm-mini-bindlist-position');
    localStorage.removeItem('jklm-mini-wordfeed-position');
    localStorage.removeItem('jklm-mini-timer-position');
    localStorage.removeItem('jklm-mini-profiles-position');
    localStorage.removeItem('jklm-mini-silent-typer-badge-position');
    window.location.reload();
  };

  const developerSettingsItems = [
    { 
      id: 'reset_positions', 
      name: 'Reset All Positions', 
      type: 'button',
      onClick: resetAllPositions,
      className: 'warning'
    },
    { id: 'positions_divider', type: 'divider' },
    { 
      id: 'debug_all_enable', 
      name: 'Enable All Debug Logs', 
      type: 'button',
      onClick: enableAllDebugSystems,
      className: 'success'
    },
    { 
      id: 'debug_all_disable', 
      name: 'Disable All Debug Logs', 
      type: 'button',
      onClick: disableAllDebugSystems,
      className: 'warning'
    },
    { id: 'debug_divider', type: 'divider' },
    ...Object.keys(debugSystems).map(systemId => ({
      id: `debug_${systemId}`,
      name: debugSystems[systemId].name,
      type: 'toggle',
      enabled: debugSystems[systemId].enabled,
      onToggle: () => toggleDebugSystem(systemId)
    }))
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: animationsEnabled ? 0.2 : 0,
        staggerChildren: animationsEnabled ? 0.05 : 0,
        delayChildren: animationsEnabled ? 0.1 : 0
      }
    },
    exit: { 
      opacity: 0,
      transition: { 
        duration: animationsEnabled ? 0.2 : 0,
        staggerChildren: animationsEnabled ? 0.05 : 0, 
        staggerDirection: -1 
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: animationsEnabled ? 0.15 : 0 } },
    exit: { opacity: 0, transition: { duration: animationsEnabled ? 0.15 : 0 } }
  };

  const getHeaderTitle = () => {
    if (!showSettings) return (
      <div className="nav-logo">
        <span className="nav-logo-text">JKLM</span>
        <span className="nav-logo-alpha">+</span>
      </div>
    );
    
    if (showGUISettings) return <div className="nav-header-title">GUI Settings</div>;
    if (showGeneralSettings) return <div className="nav-header-title">General Settings</div>;
    if (showDeveloperSettings) return <div className="nav-header-title">Developer Settings</div>;
    if (showNotificationSettings) return <div className="nav-header-title">Notifications</div>;
    
    return <div className="nav-header-title">Settings</div>;
  };

  const getHeaderButton = () => {
    if (!showSettings) {
      return <SettingsIcon />;
    }
    
    if (showSettings && !showGUISettings && !showGeneralSettings) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      );
    }
    
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
    );
  };

  const handleHeaderButtonClick = () => {
    if (!showSettings) {
      toggleSettings();
    } else if (showSettings && showGUISettings) {
      toggleGUISettings();
    } else if (showSettings && showGeneralSettings) {
      toggleGeneralSettings();
    } else if (showSettings && showDeveloperSettings) {
      toggleDeveloperSettings();
    } else if (showSettings && showNotificationSettings) {
      toggleNotificationSettings();
    } else {
      toggleSettings();
    }
  };

  return (
    <motion.div 
      className="nav-panel"
      drag
      dragMomentum={false}
      dragElastic={0}
      initial={false}
      style={{
        x: position.x,
        y: position.y
      }}
      onDragEnd={handleDragEnd}
    >
      <motion.div 
        className="nav-header"
        onPointerDown={(e) => {
          if (e.target.closest('.nav-settings-btn')) {
            e.stopPropagation();
          }
        }}
      >
        {getHeaderTitle()}
        <motion.button 
          className="nav-settings-btn"
          whileHover={animationsEnabled ? { rotate: !showSettings ? 45 : 0 } : {}}
          transition={{ duration: getAnimationDuration(0.2) }}
          onClick={handleHeaderButtonClick}
        >
          {getHeaderButton()}
        </motion.button>
      </motion.div>

      <motion.div
        className={`nav-content-container ${showDeveloperSettings ? 'developer-settings' : ''}`}
        animate={{ 
          height: contentHeight,
          transition: getTransition({ duration: 0.25, ease: "easeInOut" })
        }}
      >
        <div className="nav-content">
          <AnimatePresence mode="wait">
            {!showSettings ? (
              <motion.div 
                key="main-menu"
                ref={mainMenuRef}
                variants={containerVariants}
                initial={false}
                animate="visible"
                exit="exit"
                className="menu-container"
              >
                {menuItems.map((item) => {
                  if (item.type === 'divider') {
                    return <div key={item.id} className="nav-divider"></div>;
                  }
                  
                  if (item.type === 'label') {
                    return <div key={item.id} className="nav-category">{item.name}</div>;
                  }
                  
                  return (
                    <motion.div
                      key={item.id}
                      variants={itemVariants}
                      className={`nav-item ${activePanels.includes(item.id) ? 'active' : ''}`}
                      onClick={() => item.hasPanel && onSelectPanel(item.id)}
                    >
                      <span className="nav-item-icon">{item.icon}</span>
                      <span className="nav-item-text">{item.name}</span>
                      {item.hasPanel && (
                        <span className="nav-item-arrow">
                          <ChevronRightIcon />
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : showGUISettings ? (
              <motion.div 
                key="gui-settings-menu"
                ref={guiSettingsRef}
                variants={containerVariants}
                initial={false}
                animate="visible"
                exit="exit"
                className="menu-container"
              >
                {guiSettingsItems.map((item) => {
                  if (item.type === 'special' && item.id === 'accent_color') {
                    return (
                      <motion.div 
                        key={item.id} 
                        variants={itemVariants}
                        className="nav-item settings-accent"
                      >
                        <span className="nav-item-text">{item.name}</span>
                        <AccentColorPicker />
                      </motion.div>
                    );
                  }

                  if (item.type === 'toggle') {
                    return (
                      <motion.div 
                        key={item.id} 
                        variants={itemVariants}
                        className="nav-item settings-toggle"
                        onClick={() => item.onToggle && item.onToggle()}
                      >
                        <span className="nav-item-text">{item.name}</span>
                        <div className={`toggle-switch ${item.enabled ? 'active' : ''}`}>
                          <div className="toggle-switch-handle"></div>
                        </div>
                      </motion.div>
                    );
                  }
                  
                  return (
                    <motion.div
                      key={item.id}
                      variants={itemVariants}
                      className="nav-item"
                      onClick={() => {
                        if (item.onSelect) {
                          item.onSelect();
                        } else if (item.hasPanel) {
                          onSelectPanel(item.id);
                        }
                      }}
                    >
                      <span className="nav-item-text">{item.name}</span>
                      {item.hasPanel && (
                        <span className="nav-item-arrow">
                          <ChevronRightIcon />
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : showGeneralSettings ? (
              <motion.div 
                key="general-settings-menu"
                ref={generalSettingsRef}
                variants={containerVariants}
                initial={false}
                animate="visible"
                exit="exit"
                className="menu-container"
              >
                {generalSettingsItems.map((item) => {
                  if (item.type === 'divider') {
                    return <div key={item.id} className="nav-divider"></div>;
                  }

                  if (item.type === 'toggle') {
                    return (
                      <motion.div 
                        key={item.id} 
                        variants={itemVariants}
                        className="nav-item settings-toggle"
                        onClick={() => item.onToggle && item.onToggle()}
                      >
                        <span className="nav-item-text">{item.name}</span>
                        <div className={`toggle-switch ${item.enabled ? 'active' : ''}`}>
                          <div className="toggle-switch-handle"></div>
                        </div>
                      </motion.div>
                    );
                  }

                  if (item.type === 'custom') {
                    return (
                      <motion.div 
                        key={item.id} 
                        variants={itemVariants}
                        className="nav-item settings-custom"
                      >
                        <span className="nav-item-text">{item.name}</span>
                        {item.component}
                      </motion.div>
                    );
                  }
                  
                  if (item.type === 'button') {
                    return (
                      <motion.div
                        key={item.id} 
                        variants={itemVariants}
                        className={`nav-item settings-button ${item.className || ''}`}
                        onClick={item.onClick}
                      >
                        <span className="nav-item-text">{item.name}</span>
                      </motion.div>
                    );
                  }
                  
                  return null;
                })}
              </motion.div>
            ) : showNotificationSettings ? (
              <motion.div 
                key="notification-settings-menu"
                ref={notificationSettingsRef}
                variants={containerVariants}
                initial={false}
                animate="visible"
                exit="exit"
                className="menu-container"
              >
                {notificationSettingsItems.map((item) => {
                  if (item.type === 'toggle') {
                    return (
                      <motion.div 
                        key={item.id} 
                        variants={itemVariants}
                        className="nav-item settings-toggle"
                        onClick={() => item.onToggle && item.onToggle()}
                      >
                        <span className="nav-item-text">{item.name}</span>
                        <div className={`toggle-switch ${item.enabled ? 'active' : ''}`}>
                          <div className="toggle-switch-handle"></div>
                        </div>
                      </motion.div>
                    );
                  }
                  
                  if (item.type === 'custom') {
                    return (
                      <motion.div 
                        key={item.id} 
                        variants={itemVariants}
                        className="nav-item settings-custom"
                      >
                        {item.component}
                      </motion.div>
                    );
                  }
                  
                  return null;
                })}
              </motion.div>
            ) : showDeveloperSettings ? (
              <motion.div 
                key="developer-settings-menu"
                ref={developerSettingsRef}
                variants={containerVariants}
                initial={false}
                animate="visible"
                exit="exit"
                className="menu-container"
              >
                {developerSettingsItems.map((item) => {
                  if (item.type === 'divider') {
                    return <div key={item.id} className="nav-divider"></div>;
                  }

                  if (item.type === 'toggle') {
                    return (
                      <motion.div 
                        key={item.id} 
                        variants={itemVariants}
                        className="nav-item settings-toggle"
                        onClick={() => item.onToggle && item.onToggle()}
                      >
                        <span className="nav-item-text">{item.name}</span>
                        <div className={`toggle-switch ${item.enabled ? 'active' : ''}`}>
                          <div className="toggle-switch-handle"></div>
                        </div>
                      </motion.div>
                    );
                  }
                  
                  if (item.type === 'button') {
                    return (
                      <motion.div
                        key={item.id} 
                        variants={itemVariants}
                        className={`nav-item settings-button ${item.className || ''}`}
                        onClick={item.onClick}
                      >
                        <span className="nav-item-text">{item.name}</span>
                      </motion.div>
                    );
                  }
                  
                  return (
                    <motion.div
                      key={item.id}
                      variants={itemVariants}
                      className="nav-item"
                      onClick={() => {
                        if (item.onSelect) {
                          item.onSelect();
                        } else if (item.hasPanel) {
                          onSelectPanel(item.id);
                        }
                      }}
                    >
                      <span className="nav-item-text">{item.name}</span>
                      {item.hasPanel && (
                        <span className="nav-item-arrow">
                          <ChevronRightIcon />
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div 
                key="settings-menu"
                ref={settingsMenuRef}
                variants={containerVariants}
                initial={false}
                animate="visible"
                exit="exit"
                className="menu-container"
              >
                {settingsItems.map((item) => {
                  if (item.type === 'keybind') {
                    return (
                      <motion.div 
                        key={item.id} 
                        variants={itemVariants}
                        className={`nav-item settings-keybind ${item.isEditing ? 'editing' : ''}`}
                        onClick={() => item.onEdit && item.onEdit()}
                      >
                        <span className="nav-item-text">{item.name}</span>
                        <div className="keybind-display">
                          {item.isEditing ? 'Press any key...' : item.keybind === ' ' ? 'Space' : item.keybind}
                        </div>
                      </motion.div>
                    );
                  }
                  
                  return (
                    <motion.div
                      key={item.id}
                      variants={itemVariants}
                      className="nav-item"
                      onClick={() => {
                        if (item.onSelect) {
                          item.onSelect();
                        } else if (item.hasPanel) {
                          onSelectPanel(item.id);
                        }
                      }}
                    >
                      <span className="nav-item-text">{item.name}</span>
                      {item.hasPanel && (
                        <span className="nav-item-arrow">
                          <ChevronRightIcon />
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default NavPanel; 