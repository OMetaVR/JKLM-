import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

const checkSettings = () => {
  try {
    const saved = localStorage.getItem('jklm-mini-bombparty-features');
    if (saved) {
      const features = JSON.parse(saved);
      const feature = features.find(f => f.id === 'silent-typer');
      return {
        enabled: Boolean(feature?.enabled),
        showFloatingBadge: Boolean(feature?.settings?.showFloatingBadge)
      };
    }
  } catch (e) {}
  return { enabled: false, showFloatingBadge: false };
};

const FloatingSilentTyperBadge = () => {
  const { accentColor: themeAccent } = useTheme();
  const [accentColor, setAccentColor] = useState(themeAccent);
  const initialSettings = checkSettings();
  const [isEnabled, setIsEnabled] = useState(initialSettings.enabled);
  const [showFloatingBadge, setShowFloatingBadge] = useState(initialSettings.showFloatingBadge);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [displayWord, setDisplayWord] = useState(null);
  const [typedLength, setTypedLength] = useState(0);
  const [isMenuVisible, setIsMenuVisible] = useState(() => localStorage.getItem('jklm-mini-menu-visible') === 'true');
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('jklm-mini-silent-typer-badge-position');
    return saved ? JSON.parse(saved) : { x: window.innerWidth / 2, y: window.innerHeight - 120 };
  });
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleSettingsChange = () => {
      const settings = checkSettings();
      setIsEnabled(settings.enabled);
      setShowFloatingBadge(settings.showFloatingBadge);
    };
    const handleFeatureToggle = (e) => {
      if (e.detail?.featureId === 'silent-typer') {
        handleSettingsChange();
      }
    };
    window.addEventListener('jklm-mini-settings-change', handleSettingsChange);
    window.addEventListener('jklm-mini-feature-toggle', handleFeatureToggle);
    return () => {
      window.removeEventListener('jklm-mini-settings-change', handleSettingsChange);
      window.removeEventListener('jklm-mini-feature-toggle', handleFeatureToggle);
    };
  }, []);

  useEffect(() => {
    const handleMenuVisibility = (e) => {
      setIsMenuVisible(e.detail?.visible ?? false);
    };
    window.addEventListener('jklm-mini-menu-visibility-change', handleMenuVisibility);
    return () => {
      window.removeEventListener('jklm-mini-menu-visibility-change', handleMenuVisibility);
    };
  }, []);

  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.detail?.accent) {
        setAccentColor(e.detail.accent);
      }
    };
    window.addEventListener('jklm-mini-theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('jklm-mini-theme-change', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    const handleTurnChange = (e) => {
      setIsMyTurn(e.detail?.isMyTurn || false);
    };
    document.addEventListener('jklm-mini-turn-state-change', handleTurnChange);
    return () => {
      document.removeEventListener('jklm-mini-turn-state-change', handleTurnChange);
    };
  }, []);

  useEffect(() => {
    const handleWordChange = (e) => {
      setDisplayWord(e.detail?.word || null);
      setTypedLength(0);
    };
    document.addEventListener('jklm-mini-silent-typer-word', handleWordChange);
    return () => {
      document.removeEventListener('jklm-mini-silent-typer-word', handleWordChange);
    };
  }, []);

  useEffect(() => {
    const handleTypedLength = (e) => {
      setTypedLength(e.detail?.length || 0);
    };
    document.addEventListener('jklm-mini-silent-typer-progress', handleTypedLength);
    return () => {
      document.removeEventListener('jklm-mini-silent-typer-progress', handleTypedLength);
    };
  }, []);

  const handleDragStart = useCallback((e) => {
    if (!isMenuVisible) return;
    e.preventDefault();
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  }, [position, isMenuVisible]);

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
    localStorage.setItem('jklm-mini-silent-typer-badge-position', JSON.stringify(position));
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

  const isPreviewMode = isMenuVisible && showFloatingBadge && (!isMyTurn || !displayWord);
  const hasActiveWord = isEnabled && showFloatingBadge && isMyTurn && displayWord;
  const shouldShow = (isMenuVisible && showFloatingBadge) || hasActiveWord;

  if (!shouldShow) return null;

  const word = hasActiveWord ? displayWord : 'PREVIEW';
  const borderColor = accentColor?.primary || '#4CAF50';
  const remainingChars = word.length - typedLength;

  return (
    <div
      onMouseDown={handleDragStart}
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        zIndex: 10001,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        border: `3px solid ${borderColor}`,
        cursor: isMenuVisible ? 'move' : 'default',
        pointerEvents: isMenuVisible ? 'auto' : 'none',
        opacity: isPreviewMode ? 0.8 : 1,
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <span style={{
        fontFamily: "'Courier New', monospace",
        fontSize: '16px',
        fontWeight: 'bold'
      }}>
        {word.split('').map((char, i) => (
          <span key={i} style={{ color: borderColor, opacity: i < typedLength ? 1 : 0.5 }}>{char}</span>
        ))}
      </span>
      <span style={{
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.7)'
      }}>
        ({hasActiveWord ? remainingChars : word.length})
      </span>
    </div>
  );
};

export default FloatingSilentTyperBadge;
