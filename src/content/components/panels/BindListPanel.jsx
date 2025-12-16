import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import DualRangeSlider from '../DualRangeSlider';
import gameTypeDetector from '../../utils/gameTypeDetector';
import '../../styles/panels/bindListPanel.css';

const StandaloneBindListPanel = () => {
  const { isDark: themeDark, accentColor: themeAccent } = useTheme();
  const [isDark, setIsDark] = useState(themeDark);
  const [accentColor, setAccentColor] = useState(themeAccent);
  const [gameType, setGameType] = useState(() => gameTypeDetector.getGameType() || 'bombparty');
  
  const checkBindListEnabled = () => {
    try {
      const currentGame = gameTypeDetector.getGameType() || 'bombparty';
      const storageKey = currentGame === 'popsauce' ? 'jklm-mini-popsauce-features' : 'jklm-mini-bombparty-features';
      const features = localStorage.getItem(storageKey);
      if (features) {
        const parsed = JSON.parse(features);
        const bindList = parsed.find(f => f.id === 'bind-list');
        if (bindList?.enabled) return true;
      }
    } catch (e) {}
    return false;
  };
  
  const [shouldRender, setShouldRender] = useState(() => {
    if (checkBindListEnabled()) {
      const isPinned = localStorage.getItem('jklm-mini-bindlist-pinned') === 'true';
      if (isPinned) return true;
      return localStorage.getItem('jklm-mini-menu-visible') === 'true';
    }
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
    const handleGameTypeChange = (e) => {
      const newGameType = e.detail?.gameType || gameTypeDetector.getGameType() || 'bombparty';
      setGameType(newGameType);
    };
    
    document.addEventListener('jklm-mini-game-type-change', handleGameTypeChange);
    return () => document.removeEventListener('jklm-mini-game-type-change', handleGameTypeChange);
  }, []);

  useEffect(() => {
    const checkVisibility = () => {
      const currentGame = gameTypeDetector.getGameType() || 'bombparty';
      setGameType(currentGame);
      
      if (checkBindListEnabled()) {
        const isPinned = localStorage.getItem('jklm-mini-bindlist-pinned') === 'true';
        if (isPinned) {
          setShouldRender(true);
          return;
        }
        setShouldRender(localStorage.getItem('jklm-mini-menu-visible') === 'true');
      } else {
        setShouldRender(false);
      }
    };

    checkVisibility();
    window.addEventListener('jklm-mini-settings-change', checkVisibility);
    window.addEventListener('jklm-mini-menu-visibility-change', checkVisibility);
    window.addEventListener('jklm-mini-feature-toggle', checkVisibility);
    window.addEventListener('storage', checkVisibility);
    document.addEventListener('jklm-mini-game-type-change', checkVisibility);

    return () => {
      window.removeEventListener('jklm-mini-settings-change', checkVisibility);
      window.removeEventListener('jklm-mini-menu-visibility-change', checkVisibility);
      window.removeEventListener('jklm-mini-feature-toggle', checkVisibility);
      window.removeEventListener('storage', checkVisibility);
      document.removeEventListener('jklm-mini-game-type-change', checkVisibility);
    };
  }, []);

  return shouldRender ? <BindListPanel isDark={isDark} accentColor={accentColor} gameType={gameType} /> : null;
};

export { StandaloneBindListPanel };

const BindListPanel = ({ isDark, accentColor, gameType = 'bombparty' }) => {
  const panelRef = useRef(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 150, y: 100 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPinned, setIsPinned] = useState(() => localStorage.getItem('jklm-mini-bindlist-pinned') === 'true');
  const [isMenuVisible, setIsMenuVisible] = useState(() => localStorage.getItem('jklm-mini-menu-visible') === 'true');
  const [hideTitlebars, setHideTitlebars] = useState(() => localStorage.getItem('jklm-mini-hide-titlebars') === 'true');
  
  const [features, setFeatures] = useState([]);
  const [bindListSettings, setBindListSettings] = useState({
    displayBinds: true,
    displayQuickSettings: true,
    featureVisibility: {}
  });

  const [silentTyperSettings, setSilentTyperSettings] = useState({ wordLengthMin: 4, wordLengthMax: 12, lengthPreference: 'none' });
  const [autoTyperSettings, setAutoTyperSettings] = useState({ 
    reactionTimeMin: 200, reactionTimeMax: 500, 
    wpmMin: 60, wpmMax: 90, 
    typoChance: 5,
    wordLengthMin: 4, wordLengthMax: 12,
    lengthPreference: 'none'
  });
  
  const storageKey = gameType === 'popsauce' ? 'jklm-mini-popsauce-features' : 'jklm-mini-bombparty-features';

  useEffect(() => {
    const loadFeatures = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setFeatures(parsed);
          const bindList = parsed.find(f => f.id === 'bind-list');
          if (bindList?.settings) {
            setBindListSettings({
              displayBinds: bindList.settings.displayBinds !== false,
              displayQuickSettings: bindList.settings.displayQuickSettings !== false,
              featureVisibility: bindList.settings.featureVisibility || {}
            });
          }
          const silentTyper = parsed.find(f => f.id === 'silent-typer');
          if (silentTyper?.settings) {
            setSilentTyperSettings({
              wordLengthMin: silentTyper.settings.wordLengthMin || 4,
              wordLengthMax: silentTyper.settings.wordLengthMax || 12,
              lengthPreference: silentTyper.settings.lengthPreference || 'none'
            });
          }
          const autoTyper = parsed.find(f => f.id === 'auto-typer');
          if (autoTyper?.settings) {
            setAutoTyperSettings({
              reactionTimeMin: autoTyper.settings.reactionTimeMin || 200,
              reactionTimeMax: autoTyper.settings.reactionTimeMax || 500,
              wpmMin: autoTyper.settings.wpmMin || 60,
              wpmMax: autoTyper.settings.wpmMax || 90,
              typoChance: autoTyper.settings.typoChance || 5,
              wordLengthMin: autoTyper.settings.wordLengthMin || 4,
              wordLengthMax: autoTyper.settings.wordLengthMax || 12,
              lengthPreference: autoTyper.settings.lengthPreference || 'none'
            });
          }
        }
      } catch (e) {}
    };
    
    loadFeatures();
    window.addEventListener('jklm-mini-settings-change', loadFeatures);
    window.addEventListener('storage', loadFeatures);
    return () => {
      window.removeEventListener('jklm-mini-settings-change', loadFeatures);
      window.removeEventListener('storage', loadFeatures);
    };
  }, [storageKey]);

  useEffect(() => {
    const savedPosition = localStorage.getItem('jklm-mini-bindlist-position');
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

  const startDrag = (e) => {
    if (e.target.closest('.bindlist-minimize-btn') || e.target.closest('.bindlist-pin-btn')) return;
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
      localStorage.setItem('jklm-mini-bindlist-position', JSON.stringify(position));
    };

    document.addEventListener('mousemove', handleMove, true);
    document.addEventListener('mouseup', handleUp, true);
  };

  const togglePinned = () => {
    const newVal = !isPinned;
    setIsPinned(newVal);
    localStorage.setItem('jklm-mini-bindlist-pinned', newVal.toString());
    window.dispatchEvent(new CustomEvent('jklm-mini-settings-change', { detail: { action: 'toggle-pin' } }));
  };

  const updateSilentTyperSettings = (newSettings) => {
    setSilentTyperSettings(prev => ({ ...prev, ...newSettings }));
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      const updated = parsed.map(f => f.id === 'silent-typer' ? { ...f, settings: { ...f.settings, ...newSettings } } : f);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('jklm-mini-settings-change', { detail: { action: 'silent-typer-settings' } }));
    } catch (e) {}
  };

  const updateAutoTyperSettings = (newSettings) => {
    setAutoTyperSettings(prev => ({ ...prev, ...newSettings }));
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      const updated = parsed.map(f => f.id === 'auto-typer' ? { ...f, settings: { ...f.settings, ...newSettings } } : f);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('jklm-mini-settings-change', { detail: { action: 'auto-typer-settings' } }));
    } catch (e) {}
  };

  if (!isInitialized) return null;

  const visibleFeatures = features.filter(f => f.id !== 'bind-list' && bindListSettings.featureVisibility[f.id] !== false);

  const accentCssVars = {
    '--accent-primary': accentColor.primary,
    '--accent-primary-transparent': `${accentColor.primary}20`,
    '--accent-secondary': accentColor.secondary,
    '--accent-tertiary': accentColor.tertiary || accentColor.hover
  };

  return (
    <div 
      className={`bindlist-panel ${isCollapsed ? 'collapsed' : ''} ${hideTitlebars && isPinned && !isMenuVisible ? 'panel-with-hidden-titlebar' : ''}`}
      style={{ position: 'fixed', top: position.y, left: position.x, zIndex: 10000, cursor: isDragging ? 'grabbing' : 'auto', ...accentCssVars }}
      data-theme={isDark ? 'dark' : 'light'}
      ref={panelRef}
    >
      <div 
        className={`bindlist-header ${hideTitlebars && isPinned && !isMenuVisible ? 'hide-titlebars' : ''}`}
        onMouseDown={startDrag}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="bindlist-title">
          <span className="bindlist-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M6 16h8"/>
            </svg>
          </span>
          <span>Binds</span>
        </div>
        <div className="bindlist-actions">
          <button className={`bindlist-pin-btn ${isPinned ? 'pinned' : ''}`} onClick={togglePinned}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isPinned ? <><path d="M12 2L12 22"/><path d="M5 12H2"/><path d="M22 12H19"/><circle cx="12" cy="12" r="7"/></> : <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>}
            </svg>
          </button>
          <button className="bindlist-minimize-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={isCollapsed ? "6 9 12 15 18 9" : "18 15 12 9 6 15"}/>
            </svg>
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="bindlist-content">
          {visibleFeatures.filter(f => f.keybind).map(f => (
            <div key={f.id} className="bindlist-feature-block">
              {bindListSettings.displayBinds && (
                <div className="bindlist-item">
                  <span className="bindlist-feature-name">{f.name}</span>
                  <span className="bindlist-keybind">{f.keybind}</span>
                </div>
              )}
              {bindListSettings.displayQuickSettings && f.id === 'silent-typer' && f.enabled && gameType === 'bombparty' && (
                <div className="bindlist-quick-setting">
                  <DualRangeSlider
                    min={3}
                    max={30}
                    minValue={silentTyperSettings.wordLengthMin}
                    maxValue={silentTyperSettings.wordLengthMax}
                    onChange={(min, max) => updateSilentTyperSettings({ wordLengthMin: min, wordLengthMax: max })}
                    label="Word Length"
                    unit=""
                    showToggle={false}
                    accentColor={accentColor}
                  />
                  <div className="bindlist-dropdown-setting">
                    <label>Length Pref</label>
                    <select
                      value={silentTyperSettings.lengthPreference}
                      onChange={(e) => updateSilentTyperSettings({ lengthPreference: e.target.value })}
                      style={{
                        backgroundColor: 'var(--background-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="none">None</option>
                      <option value="shortest">Shortest</option>
                      <option value="longest">Longest</option>
                    </select>
                  </div>
                </div>
              )}
              {bindListSettings.displayQuickSettings && f.id === 'auto-typer' && f.enabled && (
                <div className="bindlist-quick-setting">
                  <DualRangeSlider
                    min={50}
                    max={1000}
                    minValue={autoTyperSettings.reactionTimeMin}
                    maxValue={autoTyperSettings.reactionTimeMax}
                    onChange={(min, max) => updateAutoTyperSettings({ reactionTimeMin: min, reactionTimeMax: max })}
                    label="Reaction Time"
                    unit=" ms"
                    showToggle={false}
                    accentColor={accentColor}
                  />
                  <DualRangeSlider
                    min={20}
                    max={200}
                    minValue={autoTyperSettings.wpmMin}
                    maxValue={autoTyperSettings.wpmMax}
                    onChange={(min, max) => updateAutoTyperSettings({ wpmMin: min, wpmMax: max })}
                    label="Typing Speed"
                    unit=" WPM"
                    showToggle={false}
                    accentColor={accentColor}
                  />
                  <div className="bindlist-single-slider">
                    <div className="slider-header">
                      <label>Typo Chance</label>
                      <span>{autoTyperSettings.typoChance}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="30" 
                      step="1"
                      value={autoTyperSettings.typoChance} 
                      onChange={(e) => updateAutoTyperSettings({ typoChance: parseInt(e.target.value) })}
                      style={{
                        '--progress': `${autoTyperSettings.typoChance / 30 * 100}%`,
                        '--accent-color': accentColor.primary
                      }}
                    />
                  </div>
                  {gameType === 'bombparty' && (
                    <>
                      <DualRangeSlider
                        min={3}
                        max={30}
                        minValue={autoTyperSettings.wordLengthMin}
                        maxValue={autoTyperSettings.wordLengthMax}
                        onChange={(min, max) => updateAutoTyperSettings({ wordLengthMin: min, wordLengthMax: max })}
                        label="Word Length"
                        unit=""
                        showToggle={false}
                        accentColor={accentColor}
                      />
                      <div className="bindlist-dropdown-setting">
                        <label>Length Pref</label>
                        <select
                          value={autoTyperSettings.lengthPreference}
                          onChange={(e) => updateAutoTyperSettings({ lengthPreference: e.target.value })}
                          style={{
                            backgroundColor: 'var(--background-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="none">None</option>
                          <option value="shortest">Shortest</option>
                          <option value="longest">Longest</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {visibleFeatures.filter(f => f.keybind).length === 0 && (
            <div className="bindlist-empty">No keybinds set</div>
          )}
        </div>
      )}
    </div>
  );
};

export default BindListPanel;
