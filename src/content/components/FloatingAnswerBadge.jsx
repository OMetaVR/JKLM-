import React, { useState, useEffect, useRef, useCallback } from 'react';
import popsauceAnswers from '../data/popsauceAnswers';

const FloatingAnswerBadge = () => {
  const [accentColor, setAccentColor] = useState(() => {
    try {
      const saved = localStorage.getItem('jklm-mini-accent-color');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { primary: '#6366f1', secondary: '#818cf8' };
  });

  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('jklm-mini-answer-badge-position');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { x: window.innerWidth / 2 - 100, y: window.innerHeight - 150 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [allAnswers, setAllAnswers] = useState([]);
  const [isDelayed, setIsDelayed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [currentHash, setCurrentHash] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const delayTimerRef = useRef(null);

  const checkSettings = () => {
    try {
      const saved = localStorage.getItem('jklm-mini-popsauce-features');
      if (saved) {
        const features = JSON.parse(saved);
        const answerDisplay = features.find(f => f.id === 'answer-display');
        return {
          enabled: answerDisplay?.enabled || false,
          displayMode: answerDisplay?.settings?.displayMode || 'window',
          delayEnabled: answerDisplay?.settings?.delayEnabled || false,
          delaySeconds: answerDisplay?.settings?.delaySeconds || 3,
          preferShortest: answerDisplay?.settings?.preferShortest || false
        };
      }
    } catch (e) {}
    return { enabled: false, displayMode: 'window', delayEnabled: false, delaySeconds: 3, preferShortest: false };
  };

  useEffect(() => {
    const settings = checkSettings();
    setIsEnabled(settings.enabled && settings.displayMode === 'window');
    setIsMenuOpen(localStorage.getItem('jklm-mini-menu-visible') === 'true');
  }, []);

  useEffect(() => {
    const handleSettingsChange = () => {
      const settings = checkSettings();
      setIsEnabled(settings.enabled && settings.displayMode === 'window');
    };

    const handleMenuVisibility = (e) => {
      setIsMenuOpen(e.detail?.visible || false);
    };

    const handleThemeChange = () => {
      try {
        const saved = localStorage.getItem('jklm-mini-accent-color');
        if (saved) setAccentColor(JSON.parse(saved));
      } catch (e) {}
    };

    window.addEventListener('jklm-mini-settings-change', handleSettingsChange);
    window.addEventListener('jklm-mini-menu-visibility-change', handleMenuVisibility);
    window.addEventListener('jklm-mini-theme-change', handleThemeChange);

    return () => {
      window.removeEventListener('jklm-mini-settings-change', handleSettingsChange);
      window.removeEventListener('jklm-mini-menu-visibility-change', handleMenuVisibility);
      window.removeEventListener('jklm-mini-theme-change', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    const handleChallenge = (event) => {
      const { hash } = event.detail;
      setCurrentHash(hash);
      setCurrentAnswer(null);
      setIsDelayed(false);
      setCountdown(0);

      if (delayTimerRef.current) {
        clearInterval(delayTimerRef.current);
        delayTimerRef.current = null;
      }

      const settings = checkSettings();
      const answer = popsauceAnswers.getAnswer(hash, settings.preferShortest);
      const all = popsauceAnswers.getAllAnswers(hash);
      setAllAnswers(all);

      if (answer) {
        setIsVisible(true);
        if (settings.delayEnabled && settings.delaySeconds > 0) {
          setIsDelayed(true);
          setCountdown(settings.delaySeconds);
          delayTimerRef.current = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(delayTimerRef.current);
                delayTimerRef.current = null;
                setIsDelayed(false);
                setCurrentAnswer(answer);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setCurrentAnswer(answer);
        }
      } else {
        setCurrentAnswer(null);
        setIsVisible(true);
      }
    };

    const handleAnswerRevealed = (event) => {
      const { hash, answer } = event.detail;
      if (hash && answer) {
        popsauceAnswers.addAnswer(hash, answer);
        if (!currentAnswer && hash === currentHash) {
          setCurrentAnswer(answer);
          setAllAnswers([answer]);
        }
      }
    };

    const handleEndChallenge = (event) => {
      const result = event.detail;
      if (result && result.source) {
        setCurrentHash(prevHash => {
          if (!prevHash) return prevHash;
          
          const knownAnswer = popsauceAnswers.getAnswer(prevHash, false);
          if (!knownAnswer) {
            popsauceAnswers.addAnswer(prevHash, result.source);
          }
          
          const officialAnswer = knownAnswer || result.source;
          if (result.foundSourcesByPlayerPeerId) {
            Object.values(result.foundSourcesByPlayerPeerId).forEach(playerAnswer => {
              if (playerAnswer && playerAnswer.toLowerCase() !== officialAnswer.toLowerCase()) {
                popsauceAnswers.addAlias(prevHash, playerAnswer);
              }
            });
            setAllAnswers(popsauceAnswers.getAllAnswers(prevHash));
          }
          
          return prevHash;
        });
      }
      setIsVisible(false);
      setCurrentAnswer(null);
    };

    document.addEventListener('jklm-mini-popsauce-challenge', handleChallenge);
    document.addEventListener('jklm-mini-popsauce-answer-revealed', handleAnswerRevealed);
    document.addEventListener('jklm-mini-popsauce-end-challenge', handleEndChallenge);

    return () => {
      document.removeEventListener('jklm-mini-popsauce-challenge', handleChallenge);
      document.removeEventListener('jklm-mini-popsauce-answer-revealed', handleAnswerRevealed);
      document.removeEventListener('jklm-mini-popsauce-end-challenge', handleEndChallenge);
      if (delayTimerRef.current) clearInterval(delayTimerRef.current);
    };
  }, [currentHash, currentAnswer]);

  const handleDragStart = useCallback((e) => {
    if (!isMenuOpen) return;
    e.preventDefault();
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [position, isMenuOpen]);

  const handleDragMove = useCallback((e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    localStorage.setItem('jklm-mini-answer-badge-position', JSON.stringify(position));
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

  const shouldShow = (isMenuOpen && isEnabled) || (isEnabled && isVisible);
  if (!shouldShow) return null;

  return (
    <div
      className="floating-answer-badge"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 10001,
        background: '#1a191a',
        border: `2px solid ${accentColor.primary}`,
        borderRadius: '8px',
        padding: '8px 16px',
        cursor: isDragging ? 'grabbing' : (isMenuOpen ? 'grab' : 'default'),
        userSelect: 'none',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        minWidth: '120px',
        textAlign: 'center'
      }}
      onMouseDown={handleDragStart}
    >
      {isDelayed ? (
        <div style={{ color: accentColor.primary, fontSize: '14px', fontWeight: 600 }}>
          {countdown}s...
        </div>
      ) : currentAnswer ? (
        <>
          <div style={{ color: accentColor.primary, fontSize: '16px', fontWeight: 600, fontFamily: 'monospace' }}>
            {currentAnswer}
          </div>
          {allAnswers.length > 1 && (
            <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
              +{allAnswers.length - 1} alias{allAnswers.length > 2 ? 'es' : ''}
            </div>
          )}
        </>
      ) : (
        <div style={{ color: '#888', fontSize: '13px', fontStyle: 'italic' }}>
          {isMenuOpen ? 'Answer Badge' : 'No answer'}
        </div>
      )}
    </div>
  );
};

export default FloatingAnswerBadge;
