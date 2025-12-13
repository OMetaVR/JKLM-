import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import popsauceAnswers from '../data/popsauceAnswers';
import gameTypeDetector from '../utils/gameTypeDetector';

const PopsauceSilentTyper = () => {
  const { accentColor } = useTheme();
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentHash, setCurrentHash] = useState(null);
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [showInPlaceholder, setShowInPlaceholder] = useState(false);
  const [showFloatingBadge, setShowFloatingBadge] = useState(false);
  const [preferShortest, setPreferShortest] = useState(false);
  const currentAnswerRef = useRef(null);

  const persistSettings = (nextSettings) => {
    try {
      const saved = localStorage.getItem('jklm-mini-popsauce-features');
      const parsed = saved ? JSON.parse(saved) : [];
      const updated = parsed.map(f => f.id === 'silent-typer' ? { ...f, settings: { ...f.settings, ...nextSettings } } : f);
      localStorage.setItem('jklm-mini-popsauce-features', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('jklm-mini-settings-change', { detail: { action: 'silent-typer-settings' } }));
    } catch (e) {}
  };

  useEffect(() => {
    popsauceAnswers.initialize();
    try {
      const saved = localStorage.getItem('jklm-mini-popsauce-features');
      if (saved) {
        const parsed = JSON.parse(saved);
        const feature = parsed.find(f => f.id === 'silent-typer');
        if (feature?.settings) {
          setShowInPlaceholder(feature.settings.showInPlaceholder ?? false);
          setShowFloatingBadge(feature.settings.showFloatingBadge ?? false);
          setPreferShortest(feature.settings.preferShortest ?? false);
        }
        setIsEnabled(Boolean(feature?.enabled));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const handleToggle = (event) => {
      if (event.detail?.featureId === 'silent-typer') {
        setIsEnabled(Boolean(event.detail.enabled));
      }
    };
    const handleSettings = () => {
      try {
        const saved = localStorage.getItem('jklm-mini-popsauce-features');
        if (saved) {
          const parsed = JSON.parse(saved);
          const feature = parsed.find(f => f.id === 'silent-typer');
          if (feature?.settings) {
            setShowInPlaceholder(feature.settings.showInPlaceholder ?? false);
            setShowFloatingBadge(feature.settings.showFloatingBadge ?? false);
            setPreferShortest(feature.settings.preferShortest ?? false);
          }
          setIsEnabled(Boolean(feature?.enabled));
        }
      } catch (e) {}
    };
    window.addEventListener('jklm-mini-feature-toggle', handleToggle);
    window.addEventListener('jklm-mini-settings-change', handleSettings);
    return () => {
      window.removeEventListener('jklm-mini-feature-toggle', handleToggle);
      window.removeEventListener('jklm-mini-settings-change', handleSettings);
    };
  }, []);

  useEffect(() => {
    const handleChallenge = (event) => {
      const { hash } = event.detail;
      setCurrentHash(hash);
      
      if (!isEnabled) {
        setCurrentAnswer(null);
        currentAnswerRef.current = null;
        return;
      }
      
      if (!gameTypeDetector.isPopsauce()) return;
      
      const answer = popsauceAnswers.getAnswer(hash, preferShortest);
      setCurrentAnswer(answer);
      currentAnswerRef.current = answer;
      
      if (answer && showInPlaceholder) {
        window.jklmPlusPopsauceSetPlaceholder?.(answer);
      }
      
      if (answer && showFloatingBadge) {
        window.dispatchEvent(new CustomEvent('jklm-mini-popsauce-silent-typer-word', {
          detail: { word: answer, hash }
        }));
      }
      
      if (answer) {
        window.jklmPlusPopsauceInterceptTyping?.(answer);
      }
    };

    const handleEndChallenge = () => {
      setCurrentHash(null);
      setCurrentAnswer(null);
      currentAnswerRef.current = null;
      window.jklmPlusPopsauceSetPlaceholder?.('');
      window.jklmPlusPopsauceClearIntercept?.();
    };

    document.addEventListener('jklm-mini-popsauce-challenge', handleChallenge);
    document.addEventListener('jklm-mini-popsauce-end-challenge', handleEndChallenge);
    return () => {
      document.removeEventListener('jklm-mini-popsauce-challenge', handleChallenge);
      document.removeEventListener('jklm-mini-popsauce-end-challenge', handleEndChallenge);
    };
  }, [isEnabled, showInPlaceholder, showFloatingBadge, preferShortest]);

  return (
    <div className="silent-typer">
      <div className="silent-typer-display-options">
        <div className="display-option-row">
          <span>Prefer Shortest</span>
          <div 
            className={`toggle-switch ${preferShortest ? 'active' : ''}`}
            onClick={() => {
              const newVal = !preferShortest;
              setPreferShortest(newVal);
              persistSettings({ preferShortest: newVal });
            }}
            style={{ backgroundColor: preferShortest ? accentColor.primary : 'rgba(255, 255, 255, 0.1)' }}
          >
            <div className="toggle-switch-handle"></div>
          </div>
        </div>
        <div className="display-option-row">
          <span>Show in Placeholder</span>
          <div 
            className={`toggle-switch ${showInPlaceholder ? 'active' : ''}`}
            onClick={() => {
              const newVal = !showInPlaceholder;
              setShowInPlaceholder(newVal);
              persistSettings({ showInPlaceholder: newVal });
            }}
            style={{ backgroundColor: showInPlaceholder ? accentColor.primary : 'rgba(255, 255, 255, 0.1)' }}
          >
            <div className="toggle-switch-handle"></div>
          </div>
        </div>
        <div className="display-option-row">
          <span>Show Floating Badge</span>
          <div 
            className={`toggle-switch ${showFloatingBadge ? 'active' : ''}`}
            onClick={() => {
              const newVal = !showFloatingBadge;
              setShowFloatingBadge(newVal);
              persistSettings({ showFloatingBadge: newVal });
            }}
            style={{ backgroundColor: showFloatingBadge ? accentColor.primary : 'rgba(255, 255, 255, 0.1)' }}
          >
            <div className="toggle-switch-handle"></div>
          </div>
        </div>
      </div>
      
      {currentAnswer && (
        <div className="silent-typer-current">
          <div className="current-word-display">
            <span className="current-label">Current Answer:</span>
            <span className="current-word has-word">{currentAnswer}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PopsauceSilentTyper;
