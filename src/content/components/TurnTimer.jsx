import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

const TurnTimer = () => {
  const { accentColor: themeAccent } = useTheme();
  const [accentColor, setAccentColor] = useState(themeAccent);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);
  const [totalTime, setTotalTime] = useState(5);
  const [isTimerEnabled, setIsTimerEnabled] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('jklm-mini-timer-position');
    return saved ? JSON.parse(saved) : { x: window.innerWidth / 2, y: window.innerHeight / 2 - 50 };
  });
  const timerIntervalRef = useRef(null);
  const turnDurationRef = useRef(5);
  const dragOffset = useRef({ x: 0, y: 0 });

  const checkTimerEnabled = () => {
    try {
      const savedFeatures = localStorage.getItem('jklm-mini-bombparty-features');
      if (savedFeatures) {
        const features = JSON.parse(savedFeatures);
        const timerFeature = features.find(f => f.id === 'timer');
        return timerFeature ? timerFeature.enabled : false;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const startCountdown = () => {
    if (!checkTimerEnabled()) return;
    const duration = turnDurationRef.current;
    setTotalTime(duration);
    setTimeLeft(duration);
    setIsCountingDown(true);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 0.1;
        if (newTime <= 0) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          setIsCountingDown(false);
          return 0;
        }
        return newTime;
      });
    }, 100);
  };

  const stopCountdown = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsCountingDown(false);
  };

  useEffect(() => {
    const handleFeatureChange = () => {
      const enabled = checkTimerEnabled();
      setIsTimerEnabled(enabled);
      if (!enabled) {
        stopCountdown();
      }
    };
    const handleFeatureToggle = (e) => {
      if (e.detail.featureId === 'timer') {
        handleFeatureChange();
      }
    };
    window.addEventListener('jklm-mini-settings-change', handleFeatureChange);
    window.addEventListener('jklm-mini-feature-toggle', handleFeatureToggle);
    handleFeatureChange();
    return () => {
      window.removeEventListener('jklm-mini-settings-change', handleFeatureChange);
      window.removeEventListener('jklm-mini-feature-toggle', handleFeatureToggle);
    };
  }, []);

  useEffect(() => {
    const handleMenuVisibility = (e) => {
      const visible = e.detail?.visible ?? false;
      setIsMenuVisible(visible);
    };
    window.addEventListener('jklm-mini-menu-visibility-change', handleMenuVisibility);
    const initialVisible = localStorage.getItem('jklm-mini-menu-visible') === 'true';
    setIsMenuVisible(initialVisible);
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
    const handleRulesChange = (event) => {
      if (event.detail?.minTurnDuration !== null && event.detail?.minTurnDuration !== undefined) {
        turnDurationRef.current = event.detail.minTurnDuration;
      }
    };
    document.addEventListener('jklm-mini-rules-change', handleRulesChange);
    if (window.jklmPlusRequestRules) {
      window.jklmPlusRequestRules();
    }
    return () => {
      document.removeEventListener('jklm-mini-rules-change', handleRulesChange);
    };
  }, []);

  useEffect(() => {
    const handleTurnChange = (event) => {
      const { isMyTurn } = event.detail;
      if (isMyTurn) {
        startCountdown();
      } else {
        stopCountdown();
      }
    };
    const handleGameEnded = () => {
      stopCountdown();
    };
    document.addEventListener('jklm-mini-turn-state-change', handleTurnChange);
    document.addEventListener('jklm-mini-game-ended', handleGameEnded);
    return () => {
      document.removeEventListener('jklm-mini-turn-state-change', handleTurnChange);
      document.removeEventListener('jklm-mini-game-ended', handleGameEnded);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
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
    localStorage.setItem('jklm-mini-timer-position', JSON.stringify(position));
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

  const isPreviewMode = isMenuVisible && isTimerEnabled && !isCountingDown;
  const shouldShow = (isMenuVisible && isTimerEnabled) || isCountingDown;

  if (!shouldShow) return null;

  const displayTime = isPreviewMode ? 5 : timeLeft;
  const displayTotal = isPreviewMode ? 5 : totalTime;
  const progressPercentage = displayTotal > 0 ? (displayTime / displayTotal) * 100 : 0;

  const getTimerColor = () => {
    if (isPreviewMode) return accentColor?.primary || '#4CAF50';
    if (timeLeft <= 1) return '#FF4444';
    if (timeLeft <= 2) return '#FF8800';
    return accentColor?.primary || '#4CAF50';
  };

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
        padding: '20px 30px',
        borderRadius: '12px',
        fontSize: '48px',
        fontWeight: 'bold',
        zIndex: 10001,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        border: `4px solid ${getTimerColor()}`,
        minWidth: '120px',
        cursor: isMenuVisible ? 'move' : 'default',
        pointerEvents: isMenuVisible ? 'auto' : 'none',
        opacity: isPreviewMode ? 0.8 : 1,
        userSelect: 'none'
      }}>
      <div style={{ color: getTimerColor(), marginBottom: '10px' }}>
        {Math.ceil(displayTime)}
      </div>
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progressPercentage}%`,
          height: '100%',
          backgroundColor: getTimerColor(),
          transition: isPreviewMode ? 'none' : 'width 0.1s linear, background-color 0.3s ease'
        }} />
      </div>
    </div>
  );
};

export default TurnTimer;
