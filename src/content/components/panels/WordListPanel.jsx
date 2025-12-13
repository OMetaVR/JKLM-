import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useAnimation } from '../../context/AnimationContext';
import { globalWordPicker } from '../../utils/wordPicker';
import debugLogger from '../../utils/debugLogger';
import '../../styles/panels/wordListPanel.css';

// Create a separate component for the standalone WordListPanel
const StandaloneWordListPanel = () => {
  const { isDark, accentColor: themeAccentColor } = useTheme();
  
  const [shouldRender, setShouldRender] = useState(() => {
    try {
      const savedFeatures = localStorage.getItem('jklm-mini-bombparty-features');
      if (savedFeatures) {
        const parsedFeatures = JSON.parse(savedFeatures);
        const wordListFeature = parsedFeatures.find(f => f.id === 'word-list');
        
        if (wordListFeature && wordListFeature.enabled) {
          const isWindowMode = wordListFeature.settings?.displayMode === 'window';
          if (!isWindowMode) return false;
          
          const isPinned = localStorage.getItem('jklm-mini-wordlist-pinned') === 'true';
          if (isPinned) return true;
          
          return localStorage.getItem('jklm-mini-menu-visible') === 'true';
        }
      }
    } catch (e) {
      debugLogger.error('word-tracker', 'Error determining initial visibility:', e);
    }
    return false;
  });
  
  // Track the current syllable from the new simple syllable detector
  const [currentSyllable, setCurrentSyllable] = useState('');
  
  // Track the current theme state
  const [currentIsDark, setCurrentIsDark] = useState(isDark);
  
  // Update theme state when context changes
  useEffect(() => {
    setCurrentIsDark(isDark);
  }, [isDark]);
  
  // Listen for syllable detection events from the new simple detector
  useEffect(() => {
    const handleSyllableDetected = (event) => {
      const { syllable, source } = event.detail;
      debugLogger.debug('word-tracker', `Received syllable "${syllable}" from ${source}`);
      setCurrentSyllable(syllable);
    };
    
    const handleGameSyllable = (event) => {
      const { syllable, source } = event.detail;
      debugLogger.debug('word-tracker', `Received game syllable "${syllable}" from ${source}`);
      setCurrentSyllable(syllable);
    };
    
    const handleWordlistSyllableUpdate = (event) => {
      const { syllable } = event.detail;
      debugLogger.debug('word-tracker', `Received wordlist syllable update "${syllable}"`);
      setCurrentSyllable(syllable);
    };
    
    // Listen for all the syllable events that our simple detector dispatches
    document.addEventListener('jklm-mini-syllable-detected', handleSyllableDetected);
    document.addEventListener('jklm-mini-game-syllable', handleGameSyllable);
    document.addEventListener('jklm-mini-wordlist-syllable-update', handleWordlistSyllableUpdate);
    
    debugLogger.info('word-tracker', 'Set up syllable event listeners');
    
    return () => {
      document.removeEventListener('jklm-mini-syllable-detected', handleSyllableDetected);
      document.removeEventListener('jklm-mini-game-syllable', handleGameSyllable);
      document.removeEventListener('jklm-mini-wordlist-syllable-update', handleWordlistSyllableUpdate);
    };
  }, []);
  
  // Listen for theme change events
  useEffect(() => {
    const handleThemeChange = (event) => {
      if (event.detail?.isDark !== undefined) {
        setCurrentIsDark(event.detail.isDark);
        debugLogger.debug('ui-events', 'Standalone WordListPanel theme change detected:', event.detail.isDark ? 'dark' : 'light');
      }
    };
    
    window.addEventListener('jklm-mini-theme-change', handleThemeChange);
    
    return () => {
      window.removeEventListener('jklm-mini-theme-change', handleThemeChange);
    };
  }, []);
  
  // Normalize accent color properties to ensure they're compatible across the application
  const normalizeAccentColor = (colorObject) => {
    return {
      primary: colorObject.primary,
      secondary: colorObject.secondary,
      tertiary: colorObject.tertiary || colorObject.hover
    };
  };
  
  // Use theme context for accent color with normalized format
  const [accentColor, setAccentColor] = useState(() => normalizeAccentColor(themeAccentColor));
  
  // Update accent color when theme changes - force update to prevent caching
  useEffect(() => {
    const newAccentColor = normalizeAccentColor(themeAccentColor);
    setAccentColor(newAccentColor);
    
    // Force re-render by updating a timestamp to break any caching
    const timestamp = Date.now();
    setAccentColor(prev => ({ ...newAccentColor, _timestamp: timestamp }));
  }, [themeAccentColor]);
  
  // Listen for direct theme changes through custom events
  useEffect(() => {
    const handleThemeChange = (event) => {
      if (event.detail.accent) {
        const newAccentColor = normalizeAccentColor(event.detail.accent);
        const timestamp = Date.now();
        setAccentColor({ ...newAccentColor, _timestamp: timestamp });
      }
    };
    
    window.addEventListener('jklm-mini-theme-change', handleThemeChange);
    
    return () => {
      window.removeEventListener('jklm-mini-theme-change', handleThemeChange);
    };
  }, []);
  
  const checkVisibility = () => {
    try {
      const isPinned = localStorage.getItem('jklm-mini-wordlist-pinned') === 'true';
      debugLogger.debug('word-tracker', 'WordListPanel visibility check - isPinned:', isPinned);
      
      const savedFeatures = localStorage.getItem('jklm-mini-bombparty-features');
      if (savedFeatures) {
        const parsedFeatures = JSON.parse(savedFeatures);
        const wordListFeature = parsedFeatures.find(f => f.id === 'word-list');
        
        debugLogger.debug('word-tracker', 'WordListPanel visibility check - wordListFeature:', wordListFeature);
        
        if (wordListFeature && wordListFeature.enabled) {
          const isWindowMode = wordListFeature.settings?.displayMode === 'window';
          debugLogger.debug('word-tracker', 'WordListPanel visibility check - isWindowMode:', isWindowMode);
          
          if (!isWindowMode) {
            setShouldRender(false);
            return;
          }
          
          if (isPinned) {
            setShouldRender(true);
            return;
          }
          
          const isMenuVisible = localStorage.getItem('jklm-mini-menu-visible') === 'true';
          debugLogger.debug('word-tracker', 'WordListPanel visibility check - isMenuVisible:', isMenuVisible);
          setShouldRender(isMenuVisible);
        } else {
          setShouldRender(false);
        }
      } else {
        // No features found
        debugLogger.debug('word-tracker', 'WordListPanel visibility check - No features found');
        setShouldRender(false);
      }
    } catch (error) {
      debugLogger.error('word-tracker', 'Error checking visibility:', error);
      setShouldRender(false);
    }
  };

  const handleSettingsChange = (event) => {
    checkVisibility();
  };
  
  // Handler for storage events
  const handleStorageChange = (e) => {
    if (e.key === 'jklm-mini-wordlist-pinned' || 
        e.key === 'jklm-mini-bombparty-features' || 
        e.key === 'jklm-mini-menu-visible') {
      checkVisibility();
    }
  };
  
  // Handler for menu visibility changes
  const handleMenuVisibilityChange = (event) => {
    debugLogger.debug('ui-events', 'Menu visibility changed:', event.detail.visible);
    checkVisibility();
  };
  
  useEffect(() => {
    // Initial check for visibility
    checkVisibility();
    
    // Set up event listeners
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('jklm-mini-settings-change', handleSettingsChange);
    window.addEventListener('jklm-mini-menu-visibility-change', handleMenuVisibilityChange);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('jklm-mini-settings-change', handleSettingsChange);
      window.removeEventListener('jklm-mini-menu-visibility-change', handleMenuVisibilityChange);
    };
  }, []);
  
  return shouldRender ? (
    <WordListPanel 
      syllable={currentSyllable} 
      standalone={true} 
      customAccentColor={accentColor}
      isDark={currentIsDark}
    />
  ) : null;
};

// Export the standalone component for direct use
export { StandaloneWordListPanel };

// Main WordListPanel component
const WordListPanel = ({ syllable, forcedVisible = false, standalone = false, customAccentColor = null, isDark }) => {
  const { accentColor: contextAccentColor, isDark: contextIsDark } = useTheme();
  const { animationsEnabled, getTransition, getAnimationDuration } = useAnimation();
  const dragControls = useDragControls();
  const panelRef = useRef(null);
  
  // Use custom accent color if provided (for standalone mode), otherwise use from context
  const accentColor = customAccentColor || contextAccentColor;
  
  // Use isDark from props if provided (standalone mode), otherwise use from context
  const currentIsDark = isDark !== undefined ? isDark : contextIsDark;
  
  // Prepare CSS variables with normalized format (handling both hover and tertiary properties)
  // Add timestamp to force cache invalidation
  const accentCssVars = {
    '--accent-primary': accentColor.primary,
    '--accent-primary-transparent': `${accentColor.primary}20`, // 20 for transparency
    '--accent-secondary': accentColor.secondary,
    '--accent-tertiary': accentColor.tertiary || accentColor.hover,
    '--cache-buster': Date.now() // Force CSS cache invalidation
  };
  
  // State to track collapsed state
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // State to track pinned state
  const [isPinned, setIsPinned] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-wordlist-pinned');
    return stored === 'true';
  });
  
  // Track theme state
  const [theme, setTheme] = useState(() => currentIsDark ? 'dark' : 'light');
  
  // Update theme when isDark changes
  useEffect(() => {
    setTheme(currentIsDark ? 'dark' : 'light');
  }, [currentIsDark]);
  
  // Listen for theme changes through custom events
  useEffect(() => {
    const handleThemeChange = (event) => {
      if (event.detail?.isDark !== undefined) {
        setTheme(event.detail.isDark ? 'dark' : 'light');
      }
    };
    
    window.addEventListener('jklm-mini-theme-change', handleThemeChange);
    
    return () => {
      window.removeEventListener('jklm-mini-theme-change', handleThemeChange);
    };
  }, []);
  
  // Track if currently dragging to prevent other interactions
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  
  // Track wordlist URL
  const [wordlistUrl, setWordlistUrl] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-wordlist-url');
    return stored || 'https://raw.githubusercontent.com/OMetaVR/Bomb-party-word-list/refs/heads/main/wordlist.txt';
  });
  
  // Initialize position state with default values
  const [position, setPosition] = useState({ x: 550, y: 100 });
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Store all words and filtered words
  const [allWords, setAllWords] = useState([]);
  const [shortWords, setShortWords] = useState([]);
  const [mediumWords, setMediumWords] = useState([]);
  const [longWords, setLongWords] = useState([]);
  const [filteredShortWords, setFilteredShortWords] = useState([]);
  const [filteredMediumWords, setFilteredMediumWords] = useState([]);
  const [filteredLongWords, setFilteredLongWords] = useState([]);
  
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-auto-save-enabled');
    return stored !== null ? stored === 'true' : true;
  });
  
  const [currentSyllable, setCurrentSyllable] = useState(syllable || '');
  const [silentTyperWord, setSilentTyperWord] = useState(null);

  const [wordlistSettings, setWordlistSettings] = useState({
    shortWords: { enabled: true, count: 3 },
    mediumWords: { enabled: true, count: 3 },
    longWords: { enabled: true, count: 3 }
  });
  
  // Toggle pinned state
  const togglePinned = () => {
    const newPinnedState = !isPinned;
    setIsPinned(newPinnedState);
    localStorage.setItem('jklm-mini-wordlist-pinned', newPinnedState);
    
    // Dispatch a custom event with detail
    const event = new CustomEvent('jklm-mini-settings-change', {
      detail: {
        action: 'toggle-pin',
        pinned: newPinnedState
      }
    });
    window.dispatchEvent(event);
  };
  
  // Function to save settings to active profile
  const savePositionToActiveProfile = () => {
    if (!autoSaveEnabled) return;
    
    try {
      // Get current profiles
      const savedProfiles = localStorage.getItem('jklm-mini-profiles');
      if (!savedProfiles) return;
      
      const profiles = JSON.parse(savedProfiles);
      const activeProfile = profiles.find(p => p.isActive);
      
      if (!activeProfile) return;
      
      // Update the active profile with new settings
      const updatedProfiles = profiles.map(profile => {
        if (profile.isActive) {
          // Get current bombParty settings
          const bombPartyFeatures = profile.settings?.bombPartyFeatures || [];
          const bombPartyPosition = localStorage.getItem('jklm-mini-bombparty-position');
          const wordListPosition = localStorage.getItem('jklm-mini-wordlist-position');
          
          // Create or update settings object
          const currentSettings = {
            ...profile.settings,
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
      
      // Save updated profiles
      localStorage.setItem('jklm-mini-profiles', JSON.stringify(updatedProfiles));
    } catch (error) {
      debugLogger.error('storage', 'Error auto-saving position to profile:', error);
    }
  };
  
  // Create a custom event listener for real-time settings updates
  useEffect(() => {
    const handleSettingsChange = () => {
      try {
        const savedFeatures = localStorage.getItem('jklm-mini-bombparty-features');
        if (savedFeatures) {
          const parsedFeatures = JSON.parse(savedFeatures);
          const wordListFeature = parsedFeatures.find(f => f.id === 'word-list');
          
          if (wordListFeature?.settings) {
            setWordlistSettings({
              shortWords: wordListFeature.settings.shortWords || { enabled: true, count: 3 },
              mediumWords: wordListFeature.settings.mediumWords || { enabled: true, count: 3 },
              longWords: wordListFeature.settings.longWords || { enabled: true, count: 3 }
            });
          }
        }
      } catch (error) {
        debugLogger.error('storage', 'Error loading BombParty settings:', error);
      }
    };

    // Create a custom event that BombPartyPanel will dispatch when settings change
    window.addEventListener('jklm-mini-settings-change', handleSettingsChange);
    
    return () => {
      window.removeEventListener('jklm-mini-settings-change', handleSettingsChange);
    };
  }, []);
  
  // Load BombParty settings to get wordlist configuration
  useEffect(() => {
    const loadBombPartySettings = () => {
      try {
        const savedFeatures = localStorage.getItem('jklm-mini-bombparty-features');
        if (savedFeatures) {
          const parsedFeatures = JSON.parse(savedFeatures);
          const wordListFeature = parsedFeatures.find(f => f.id === 'word-list');
          
          if (wordListFeature?.settings) {
            setWordlistSettings({
              shortWords: wordListFeature.settings.shortWords || { enabled: true, count: 3 },
              mediumWords: wordListFeature.settings.mediumWords || { enabled: true, count: 3 },
              longWords: wordListFeature.settings.longWords || { enabled: true, count: 3 }
            });
          }
        }
      } catch (error) {
        debugLogger.error('storage', 'Error loading BombParty settings:', error);
      }
    };
    
    loadBombPartySettings();
    
    // Listen for changes to BombParty features
    const handleStorageChange = (e) => {
      if (e.key === 'jklm-mini-bombparty-features') {
        loadBombPartySettings();
      } else if (e.key === 'jklm-mini-wordlist-url') {
        setWordlistUrl(e.newValue);
      } else if (e.key === 'jklm-mini-auto-save-enabled') {
        setAutoSaveEnabled(e.newValue === 'true');
      } else if (e.key === 'jklm-mini-wordlist-pinned') {
        setIsPinned(e.newValue === 'true');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Listen for profile changes
  useEffect(() => {
    const handleProfileChange = (event) => {
      const { settings } = event.detail;
      
      // Update position if available
      if (settings?.positions?.wordList) {
        setPosition(settings.positions.wordList);
      }
    };
    
    window.addEventListener('jklm-mini-profile-change', handleProfileChange);
    
    return () => {
      window.removeEventListener('jklm-mini-profile-change', handleProfileChange);
    };
  }, []);
  
  // Load position from localStorage once on mount
  useEffect(() => {
    const loadPosition = () => {
      const savedPosition = localStorage.getItem('jklm-mini-wordlist-position');
      if (savedPosition) {
        try {
          const parsedPosition = JSON.parse(savedPosition);
          
          // Ensure position values are valid numbers and within bounds
          const x = typeof parsedPosition.x === 'number' ? parsedPosition.x : 550;
          const y = typeof parsedPosition.y === 'number' ? parsedPosition.y : 100;
          
          // Apply bounds checking
          const boundedX = Math.max(0, Math.min(window.innerWidth - 250, x));
          const boundedY = Math.max(0, Math.min(window.innerHeight - 200, y));
          
          setPosition({
            x: boundedX,
            y: boundedY
          });
        } catch (e) {
          debugLogger.error('storage', 'Error parsing saved position:', e);
          setPosition({ x: 550, y: 100 });
        }
      }
      // Mark as initialized after position is set
      setIsInitialized(true);
    };
    
    // Load position initially
    loadPosition();
    
    // Listen for storage changes to update position
    const handleStorageChange = (e) => {
      if (e.key === 'jklm-mini-wordlist-position') {
        loadPosition();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Load collapsed state
    const savedCollapsed = localStorage.getItem('jklm-mini-wordlist-collapsed');
    if (savedCollapsed !== null) {
      setIsCollapsed(savedCollapsed === 'true');
    }
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Custom drag implementation
  const startDrag = (e) => {
    // Skip if clicking on buttons
    if (e.target.closest('.wordlist-minimize-btn') !== null || 
        e.target.closest('.wordlist-pin-btn') !== null) {
      return;
    }
    
    // Prevent text selection during drag
    e.preventDefault();
    
    // Set dragging state immediately
    setIsDragging(true);
    
    // Calculate offset
    const rect = panelRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    // Use event capture to ensure we get all mouse events
    const handleMove = (moveEvent) => {
      // Calculate new position
      const newX = moveEvent.clientX - offsetX;
      const newY = moveEvent.clientY - offsetY;
      
      // Apply bounds
      const boundedX = Math.max(0, Math.min(window.innerWidth - 250, newX));
      const boundedY = Math.max(0, Math.min(window.innerHeight - 200, newY));
      
      // Update position
      setPosition({ x: boundedX, y: boundedY });
      
      // Prevent default to avoid text selection
      moveEvent.preventDefault();
    };
    
    const handleUp = () => {
      // Set dragging state to false
      setIsDragging(false);
      
      // Remove event listeners
      document.removeEventListener('mousemove', handleMove, true);
      document.removeEventListener('mouseup', handleUp, true);
      
      // Save position to localStorage
      localStorage.setItem('jklm-mini-wordlist-position', JSON.stringify(position));
      
      // Auto-save to active profile if enabled
      if (autoSaveEnabled) {
        savePositionToActiveProfile();
      }
    };
    
    // Add event listeners with capture
    document.addEventListener('mousemove', handleMove, true);
    document.addEventListener('mouseup', handleUp, true);
  };
  
  // Add a separate useEffect to ensure new position is saved
  useEffect(() => {
    if (!isDragging) {
      // Save position to localStorage when position changes and not dragging
      localStorage.setItem('jklm-mini-wordlist-position', JSON.stringify(position));
      
      // Auto-save to active profile if enabled
      if (autoSaveEnabled) {
        savePositionToActiveProfile();
      }
    }
  }, [position, isDragging, autoSaveEnabled]);
  
  // Remove global event listeners on unmount
  useEffect(() => {
    return () => {
      // Cleanup any lingering event listeners
      document.removeEventListener('mousemove', () => {}, true);
      document.removeEventListener('mouseup', () => {}, true);
    };
  }, []);
  
  useEffect(() => {
    globalWordPicker.loadWordlist(wordlistUrl).then(words => {
      setAllWords(words);
      setShortWords(words.filter(word => word.length >= 3 && word.length <= 5));
      setMediumWords(words.filter(word => word.length >= 6 && word.length <= 9));
      setLongWords(words.filter(word => word.length >= 10));
    });
  }, [wordlistUrl]);
  
  useEffect(() => {
    if (!currentSyllable || !allWords.length) {
      setFilteredShortWords([]);
      setFilteredMediumWords([]);
      setFilteredLongWords([]);
      return;
    }
    
    setFilteredShortWords(
      globalWordPicker.pickWords({
        syllable: currentSyllable,
        minLength: 3,
        maxLength: 5,
        count: wordlistSettings.shortWords.count,
        excludeBlacklist: true,
        prioritizeAlphabet: true
      })
    );
    setFilteredMediumWords(
      globalWordPicker.pickWords({
        syllable: currentSyllable,
        minLength: 6,
        maxLength: 9,
        count: wordlistSettings.mediumWords.count,
        excludeBlacklist: true,
        prioritizeAlphabet: true
      })
    );
    setFilteredLongWords(
      globalWordPicker.pickWords({
        syllable: currentSyllable,
        minLength: 10,
        maxLength: 30,
        count: wordlistSettings.longWords.count,
        excludeBlacklist: true,
        prioritizeAlphabet: true
      })
    );
    
  }, [currentSyllable, allWords, wordlistSettings]);
  
  // Update syllable when prop changes
  useEffect(() => {
    if (syllable !== undefined) {
      setCurrentSyllable(syllable);
    }
  }, [syllable]);
  
  // Word clicked handler with different actions based on modifier keys
  const handleWordClick = (word, e) => {
    // Get animation duration from context
    const animationDuration = getAnimationDuration(250);
    
    // If shift key is pressed, type the word directly into the game input
    if (e.shiftKey) {
      try {
        // Find the input field in the JKLM.fun game
        const inputField = document.querySelector('#game-input');
        if (inputField) {
          // Focus the input field
          inputField.focus();
          
          // Clear the current input
          inputField.value = '';
          
          // Type the word
          inputField.value = word;
          
          // Dispatch input event to trigger game's input handlers
          inputField.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Flash effect for feedback
          const wordElements = document.querySelectorAll('.wordlist-item');
          const clickedElement = Array.from(wordElements).find(
            el => el.querySelector('.wordlist-word').textContent === word
          );
          
          if (clickedElement) {
            // Apply temporary type animation class
            clickedElement.classList.add('word-typed');
            
            // Remove the class after animation completes
            setTimeout(() => {
              clickedElement.classList.remove('word-typed');
            }, animationDuration);
          }
        }
      } catch (error) {
        debugLogger.error('word-tracker', 'Error typing word into input:', error);
      }
    } 
    // Default behavior: copy to clipboard
    else {
      try {
        navigator.clipboard.writeText(word)
          .then(() => {
            // Flash effect for feedback
            const wordElements = document.querySelectorAll('.wordlist-item');
            const clickedElement = Array.from(wordElements).find(
              el => el.querySelector('.wordlist-word').textContent === word
            );
            
            if (clickedElement) {
              // Apply temporary highlight class
              clickedElement.classList.add('word-copied');
              
              // Remove the class after animation completes
              setTimeout(() => {
                clickedElement.classList.remove('word-copied');
              }, animationDuration);
            }
          })
          .catch(err => {
            debugLogger.error('word-tracker', 'Failed to copy text: ', err);
          });
      } catch (error) {
        debugLogger.error('word-tracker', 'Copy to clipboard failed:', error);
      }
    }
  };
  
  // Toggle collapsed state
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
    
    // Save collapsed state to localStorage
    localStorage.setItem('jklm-mini-wordlist-collapsed', !isCollapsed);
  };
  
  // Add state for hide-titlebars setting
  const [hideTitlebars, setHideTitlebars] = useState(() => {
    return localStorage.getItem('jklm-mini-hide-titlebars') === 'true';
  });
  
  // Add state for menu visibility
  const [isMenuVisible, setIsMenuVisible] = useState(() => {
    return localStorage.getItem('jklm-mini-menu-visible') === 'true';
  });
  
  // Listen for settings changes, specifically for the hide-titlebars setting
  useEffect(() => {
    const handleSettingsChange = (event) => {
      if (event.detail?.action === 'toggle-hide-titlebars') {
        setHideTitlebars(event.detail.hideTitlebars);
      }
    };
    
    // Listen for menu visibility changes
    const handleMenuVisibilityChange = (event) => {
      setIsMenuVisible(event.detail.visible);
    };
    
    // Listen for storage changes to update menu visibility
    const handleStorageChange = (e) => {
      if (e.key === 'jklm-mini-menu-visible') {
        setIsMenuVisible(e.newValue === 'true');
      } else if (e.key === 'jklm-mini-hide-titlebars') {
        setHideTitlebars(e.newValue === 'true');
      }
    };
    
    window.addEventListener('jklm-mini-settings-change', handleSettingsChange);
    window.addEventListener('jklm-mini-menu-visibility-change', handleMenuVisibilityChange);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('jklm-mini-settings-change', handleSettingsChange);
      window.removeEventListener('jklm-mini-menu-visibility-change', handleMenuVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  useEffect(() => {
    const handleBlacklistChange = () => {
      if (currentSyllable && allWords.length) {
        setFilteredShortWords(
          globalWordPicker.pickWords({
            syllable: currentSyllable,
            minLength: 3,
            maxLength: 5,
            count: wordlistSettings.shortWords.count,
            excludeBlacklist: true,
            prioritizeAlphabet: true
          })
        );
        setFilteredMediumWords(
          globalWordPicker.pickWords({
            syllable: currentSyllable,
            minLength: 6,
            maxLength: 9,
            count: wordlistSettings.mediumWords.count,
            excludeBlacklist: true,
            prioritizeAlphabet: true
          })
        );
        setFilteredLongWords(
          globalWordPicker.pickWords({
            syllable: currentSyllable,
            minLength: 10,
            maxLength: 30,
            count: wordlistSettings.longWords.count,
            excludeBlacklist: true,
            prioritizeAlphabet: true
          })
        );
      }
    };

    document.addEventListener('jklm-mini-blacklist-word', handleBlacklistChange);
    document.addEventListener('jklm-mini-clear-blacklist', handleBlacklistChange);
    document.addEventListener('jklm-mini-alphabet-state-change', handleBlacklistChange);

    return () => {
      document.removeEventListener('jklm-mini-blacklist-word', handleBlacklistChange);
      document.removeEventListener('jklm-mini-clear-blacklist', handleBlacklistChange);
      document.removeEventListener('jklm-mini-alphabet-state-change', handleBlacklistChange);
    };
  }, [currentSyllable, allWords, wordlistSettings]);

  useEffect(() => {
    const handleSilentTyperWord = (e) => {
      setSilentTyperWord(e.detail?.word || null);
    };
    document.addEventListener('jklm-mini-silent-typer-word', handleSilentTyperWord);
    return () => {
      document.removeEventListener('jklm-mini-silent-typer-word', handleSilentTyperWord);
    };
  }, []);
  
  if (!isInitialized) {
    return null;
  }
  
  if (!standalone && !isPinned && !forcedVisible) {
    return null;
  }
  
  return (
    <div 
      className={`wordlist-panel ${isCollapsed ? 'collapsed' : ''} ${standalone ? 'standalone' : ''} ${hideTitlebars && isPinned && !isMenuVisible ? 'panel-with-hidden-titlebar' : ''}`}
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: standalone ? 10000 : 8500,
        cursor: isDragging ? 'grabbing' : 'auto',
        ...accentCssVars,
        pointerEvents: 'auto'
      }}
      data-theme={theme}
      ref={panelRef}
    >
      <div 
        className={`wordlist-header ${hideTitlebars && isPinned && !isMenuVisible ? 'hide-titlebars' : ''}`}
        onMouseDown={startDrag}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="wordlist-title">
          <span className="wordlist-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
          </span>
          <span>Word List</span>
          {currentSyllable && <span className="wordlist-syllable">[{currentSyllable}]</span>}
        </div>
        <div className="wordlist-actions">
          <button 
            className={`wordlist-pin-btn ${isPinned ? 'pinned' : ''}`}
            onClick={togglePinned}
            title={isPinned ? "Unpin (will hide when Word List feature disabled)" : "Pin (stays visible even when Word List feature disabled)"}
          >
            {isPinned ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L12 22"></path>
                <path d="M5 12H2"></path>
                <path d="M22 12H19"></path>
                <path d="M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            )}
          </button>
          <button 
            className="wordlist-minimize-btn"
            onClick={toggleCollapsed}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={isCollapsed ? "6 9 12 15 18 9" : "18 15 12 9 6 15"}></polyline>
            </svg>
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div style={{ overflow: "hidden" }}>
          {(filteredShortWords.length > 0 || filteredMediumWords.length > 0 || filteredLongWords.length > 0) ? (
            <div className="wordlist-content">
              {wordlistSettings.shortWords.enabled && filteredShortWords.length > 0 && (
                <div className="wordlist-section">
                  {filteredShortWords
                    .map((word, index) => (
                      <div 
                        key={`short-${index}`} 
                        className={`wordlist-item ${silentTyperWord === word ? 'silent-typer-selected' : ''}`}
                        onClick={(e) => handleWordClick(word, e)}
                        title="Click to copy | Shift+Click to type in game"
                      >
                        <span className="wordlist-word">{word}</span>
                      </div>
                    ))}
                </div>
              )}
              
              {wordlistSettings.mediumWords.enabled && filteredMediumWords.length > 0 && (
                <div className="wordlist-section">
                  {filteredMediumWords
                    .map((word, index) => (
                      <div 
                        key={`medium-${index}`} 
                        className={`wordlist-item ${silentTyperWord === word ? 'silent-typer-selected' : ''}`}
                        onClick={(e) => handleWordClick(word, e)}
                        title="Click to copy | Shift+Click to type in game"
                      >
                        <span className="wordlist-word">{word}</span>
                      </div>
                    ))}
                </div>
              )}
              
              {wordlistSettings.longWords.enabled && filteredLongWords.length > 0 && (
                <div className="wordlist-section">
                  {filteredLongWords
                    .map((word, index) => (
                      <div 
                        key={`long-${index}`} 
                        className={`wordlist-item ${silentTyperWord === word ? 'silent-typer-selected' : ''}`}
                        onClick={(e) => handleWordClick(word, e)}
                        title="Click to copy | Shift+Click to type in game"
                      >
                        <span className="wordlist-word">{word}</span>
                      </div>
                    ))}
                </div>
              )}
              {(!wordlistSettings.shortWords.enabled && 
                !wordlistSettings.mediumWords.enabled && 
                !wordlistSettings.longWords.enabled) && (
                <div className="wordlist-section">
                  {allWords
                    .filter(word => word.includes(currentSyllable.toLowerCase()))
                    .slice(0, 9)
                    .map((word, index) => (
                      <div 
                        key={`default-${index}`} 
                        className="wordlist-item"
                        onClick={(e) => handleWordClick(word, e)}
                        title="Click to copy | Shift+Click to type in game"
                      >
                        <span className="wordlist-word">{word}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="wordlist-no-words">
              {currentSyllable ? 'No matching words found' : 'Enter a syllable to see words'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WordListPanel; 