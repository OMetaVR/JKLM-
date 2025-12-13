import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import '../../styles/panels/wordfeedPanel.css';

const StandaloneWordfeedPanel = () => {
  const { isDark: themeDark, accentColor: themeAccent } = useTheme();
  const [isDark, setIsDark] = useState(themeDark);
  const [accentColor, setAccentColor] = useState(themeAccent);
  
  const [isEnabled, setIsEnabled] = useState(() => {
    try {
      const savedFeatures = localStorage.getItem('jklm-mini-bombparty-features');
      if (savedFeatures) {
        const parsedFeatures = JSON.parse(savedFeatures);
        const wordfeedFeature = parsedFeatures.find(f => f.id === 'wordfeed');
        return Boolean(wordfeedFeature?.enabled);
      }
    } catch (e) {}
    return false;
  });

  const [shouldShow, setShouldShow] = useState(() => {
    try {
      const savedFeatures = localStorage.getItem('jklm-mini-bombparty-features');
      if (savedFeatures) {
        const parsedFeatures = JSON.parse(savedFeatures);
        const wordfeedFeature = parsedFeatures.find(f => f.id === 'wordfeed');
        if (wordfeedFeature?.enabled) {
          const isPinned = localStorage.getItem('jklm-mini-wordfeed-pinned') === 'true';
          if (isPinned) return true;
          return localStorage.getItem('jklm-mini-menu-visible') === 'true';
        }
      }
    } catch (e) {}
    return false;
  });

  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.detail?.accent) setAccentColor(e.detail.accent);
      if (e.detail?.isDark !== undefined) setIsDark(e.detail.isDark);
    };
    window.addEventListener('jklm-mini-theme-change', handleThemeChange);
    return () => window.removeEventListener('jklm-mini-theme-change', handleThemeChange);
  }, []);

  useEffect(() => {
    const checkState = () => {
      try {
        const savedFeatures = localStorage.getItem('jklm-mini-bombparty-features');
        if (savedFeatures) {
          const parsedFeatures = JSON.parse(savedFeatures);
          const wordfeedFeature = parsedFeatures.find(f => f.id === 'wordfeed');
          const enabled = Boolean(wordfeedFeature?.enabled);
          setIsEnabled(enabled);
          if (enabled) {
            const isPinned = localStorage.getItem('jklm-mini-wordfeed-pinned') === 'true';
            if (isPinned) {
              setShouldShow(true);
              return;
            }
            setShouldShow(localStorage.getItem('jklm-mini-menu-visible') === 'true');
          } else {
            setShouldShow(false);
          }
        } else {
          setIsEnabled(false);
          setShouldShow(false);
        }
      } catch (e) {
        setIsEnabled(false);
        setShouldShow(false);
      }
    };
    checkState();
    window.addEventListener('jklm-mini-settings-change', checkState);
    window.addEventListener('jklm-mini-menu-visibility-change', checkState);
    window.addEventListener('jklm-mini-feature-toggle', checkState);
    window.addEventListener('storage', checkState);
    return () => {
      window.removeEventListener('jklm-mini-settings-change', checkState);
      window.removeEventListener('jklm-mini-menu-visibility-change', checkState);
      window.removeEventListener('jklm-mini-feature-toggle', checkState);
      window.removeEventListener('storage', checkState);
    };
  }, []);

  if (!isEnabled) return null;

  return <WordfeedPanel isDark={isDark} accentColor={accentColor} isVisible={shouldShow} />;
};

export { StandaloneWordfeedPanel };

const WordfeedPanel = ({ isDark, accentColor, isVisible }) => {
  const panelRef = useRef(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 150, y: 300 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPinned, setIsPinned] = useState(() => localStorage.getItem('jklm-mini-wordfeed-pinned') === 'true');
  const [isMenuVisible, setIsMenuVisible] = useState(() => localStorage.getItem('jklm-mini-menu-visible') === 'true');
  const [hideTitlebars, setHideTitlebars] = useState(() => localStorage.getItem('jklm-mini-hide-titlebars') === 'true');
  const [showSettings, setShowSettings] = useState(false);
  const [words, setWords] = useState([]);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('jklm-mini-wordfeed-settings');
    return saved ? JSON.parse(saved) : {
      removeBg: false,
      showPicture: false,
      showUsername: false,
      highlightMyWords: false,
      preserveMyWords: false,
      clearOnGameEnd: true,
      maxFeedHeight: 300,
      entryLifetime: 0
    };
  });
  const [selfPeerId, setSelfPeerId] = useState(null);

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('jklm-mini-wordfeed-settings', JSON.stringify(newSettings));
  };

  useEffect(() => {
    const savedPosition = localStorage.getItem('jklm-mini-wordfeed-position');
    if (savedPosition) {
      try {
        setPosition(JSON.parse(savedPosition));
      } catch (e) {}
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    const handleMenuVisibility = (e) => setIsMenuVisible(e.detail.visible);
    const handleSettings = (e) => {
      if (e.detail?.action === 'toggle-hide-titlebars') setHideTitlebars(e.detail.hideTitlebars);
    };
    window.addEventListener('jklm-mini-menu-visibility-change', handleMenuVisibility);
    window.addEventListener('jklm-mini-settings-change', handleSettings);
    return () => {
      window.removeEventListener('jklm-mini-menu-visibility-change', handleMenuVisibility);
      window.removeEventListener('jklm-mini-settings-change', handleSettings);
    };
  }, []);

  useEffect(() => {
    const handleWordAccepted = (e) => {
      const { word, peerId, player, isSelf } = e.detail || {};
      if (word) {
        const newWord = { 
          id: Date.now(), 
          word, 
          peerId, 
          nickname: player?.nickname || null,
          picture: player?.picture || null,
          isSelf: isSelf || false,
          timestamp: Date.now() 
        };
        setWords(prev => [newWord, ...prev].slice(0, 20));
      }
    };
    document.addEventListener('jklm-mini-word-accepted', handleWordAccepted);
    return () => document.removeEventListener('jklm-mini-word-accepted', handleWordAccepted);
  }, []);

  useEffect(() => {
    const handleGameEnded = () => {
      if (settings.clearOnGameEnd) setWords([]);
    };
    document.addEventListener('jklm-mini-game-ended', handleGameEnded);
    return () => document.removeEventListener('jklm-mini-game-ended', handleGameEnded);
  }, [settings.clearOnGameEnd]);

  useEffect(() => {
    if (settings.entryLifetime === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setWords(prev => prev.filter(w => {
        if (settings.preserveMyWords && w.isSelf) return true;
        return now - w.timestamp < settings.entryLifetime * 1000;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [settings.entryLifetime, settings.preserveMyWords]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSettings && panelRef.current && !panelRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showSettings]);

  const toggleSettings = () => {
    setShowSettings(s => !s);
  };

  const startDrag = (e) => {
    if (e.target.closest('.wordfeed-minimize-btn') || e.target.closest('.wordfeed-pin-btn') || e.target.closest('.wordfeed-settings-btn')) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = panelRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const handleMove = (moveEvent) => {
      const newX = Math.max(0, Math.min(window.innerWidth - 200, moveEvent.clientX - offsetX));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, moveEvent.clientY - offsetY));
      setPosition({ x: newX, y: newY });
      moveEvent.preventDefault();
    };
    const handleUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMove, true);
      document.removeEventListener('mouseup', handleUp, true);
      localStorage.setItem('jklm-mini-wordfeed-position', JSON.stringify(position));
    };
    document.addEventListener('mousemove', handleMove, true);
    document.addEventListener('mouseup', handleUp, true);
  };

  const togglePinned = () => {
    const newVal = !isPinned;
    setIsPinned(newVal);
    localStorage.setItem('jklm-mini-wordfeed-pinned', newVal.toString());
    window.dispatchEvent(new CustomEvent('jklm-mini-settings-change', { detail: { action: 'toggle-pin' } }));
  };

  if (!isInitialized) return null;

  const accentCssVars = {
    '--accent-primary': accentColor.primary,
    '--accent-primary-transparent': `${accentColor.primary}20`,
    '--accent-secondary': accentColor.secondary,
    '--accent-tertiary': accentColor.tertiary || accentColor.hover
  };

  return (
    <div 
      className={`wordfeed-panel ${isCollapsed ? 'collapsed' : ''} ${hideTitlebars && isPinned && !isMenuVisible ? 'panel-with-hidden-titlebar' : ''} ${settings.removeBg ? 'no-bg' : ''}`}
      style={{ position: 'fixed', top: position.y, left: position.x, zIndex: 10000, cursor: isDragging ? 'grabbing' : 'auto', display: isVisible ? 'block' : 'none', ...accentCssVars }}
      data-theme={isDark ? 'dark' : 'light'}
      ref={panelRef}
    >
      <div 
        className={`wordfeed-header ${hideTitlebars && isPinned && !isMenuVisible ? 'hide-titlebars' : ''}`}
        onMouseDown={startDrag}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="wordfeed-title">
          <span className="wordfeed-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </span>
          <span>Wordfeed</span>
        </div>
        <div className="wordfeed-actions">
          <button type="button" className={`wordfeed-settings-btn ${showSettings ? 'active' : ''}`} onMouseDown={(e) => { e.stopPropagation(); toggleSettings(); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button className={`wordfeed-pin-btn ${isPinned ? 'pinned' : ''}`} onClick={togglePinned}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isPinned ? <><path d="M12 2L12 22"/><path d="M5 12H2"/><path d="M22 12H19"/><circle cx="12" cy="12" r="7"/></> : <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>}
            </svg>
          </button>
          <button className="wordfeed-minimize-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={isCollapsed ? "6 9 12 15 18 9" : "18 15 12 9 6 15"}/>
            </svg>
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="wordfeed-context-menu">
          <div className="wordfeed-context-item" onClick={() => updateSetting('removeBg', !settings.removeBg)}>
            <span>Remove BG</span>
            <div className={`wordfeed-toggle ${settings.removeBg ? 'active' : ''}`} style={{ backgroundColor: settings.removeBg ? accentColor.primary : '' }}>
              <div className="wordfeed-toggle-handle" />
            </div>
          </div>
          <div className="wordfeed-context-item" onClick={() => updateSetting('showPicture', !settings.showPicture)}>
            <span>Show Picture</span>
            <div className={`wordfeed-toggle ${settings.showPicture ? 'active' : ''}`} style={{ backgroundColor: settings.showPicture ? accentColor.primary : '' }}>
              <div className="wordfeed-toggle-handle" />
            </div>
          </div>
          <div className="wordfeed-context-item" onClick={() => updateSetting('showUsername', !settings.showUsername)}>
            <span>Show Username</span>
            <div className={`wordfeed-toggle ${settings.showUsername ? 'active' : ''}`} style={{ backgroundColor: settings.showUsername ? accentColor.primary : '' }}>
              <div className="wordfeed-toggle-handle" />
            </div>
          </div>
          <div className="wordfeed-context-item" onClick={() => updateSetting('highlightMyWords', !settings.highlightMyWords)}>
            <span>Highlight My Words</span>
            <div className={`wordfeed-toggle ${settings.highlightMyWords ? 'active' : ''}`} style={{ backgroundColor: settings.highlightMyWords ? accentColor.primary : '' }}>
              <div className="wordfeed-toggle-handle" />
            </div>
          </div>
          <div className="wordfeed-context-item" onClick={() => updateSetting('preserveMyWords', !settings.preserveMyWords)}>
            <span>Preserve My Words</span>
            <div className={`wordfeed-toggle ${settings.preserveMyWords ? 'active' : ''}`} style={{ backgroundColor: settings.preserveMyWords ? accentColor.primary : '' }}>
              <div className="wordfeed-toggle-handle" />
            </div>
          </div>
          <div className="wordfeed-context-item" onClick={() => updateSetting('clearOnGameEnd', !settings.clearOnGameEnd)}>
            <span>Clear on Game End</span>
            <div className={`wordfeed-toggle ${settings.clearOnGameEnd ? 'active' : ''}`} style={{ backgroundColor: settings.clearOnGameEnd ? accentColor.primary : '' }}>
              <div className="wordfeed-toggle-handle" />
            </div>
          </div>
          <div className="wordfeed-context-divider" />
          <div className="wordfeed-context-item slider">
            <span>Max Feed Height</span>
            <input type="range" min="100" max="500" step="50" value={settings.maxFeedHeight} onChange={(e) => updateSetting('maxFeedHeight', parseInt(e.target.value))} className="wordfeed-slider" />
            <span className="wordfeed-slider-value">{settings.maxFeedHeight}px</span>
          </div>
          <div className="wordfeed-context-item slider">
            <span>Entry Lifetime</span>
            <input type="range" min="0" max="30" step="5" value={settings.entryLifetime} onChange={(e) => updateSetting('entryLifetime', parseInt(e.target.value))} className="wordfeed-slider" />
            <span className="wordfeed-slider-value">{settings.entryLifetime === 0 ? '∞' : `${settings.entryLifetime}s`}</span>
          </div>
        </div>
      )}
      
      {!isCollapsed && (
        <div className="wordfeed-content" style={{ maxHeight: settings.maxFeedHeight }}>
          {words.length === 0 && !settings.removeBg ? (
            <div className="wordfeed-empty">No words yet</div>
          ) : (
            <div className="wordfeed-list">
              {words.map((item) => (
                <div key={item.id} className={`wordfeed-item ${settings.highlightMyWords && item.isSelf ? 'highlight' : ''}`}>
                  {settings.showPicture && item.picture && (
                    <img className="wordfeed-avatar" src={`data:image/jpeg;base64,${item.picture}`} alt="" />
                  )}
                  <span className="wordfeed-word">{item.word}</span>
                  {settings.showUsername && item.nickname && (
                    <span className="wordfeed-username">{item.nickname}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WordfeedPanel;