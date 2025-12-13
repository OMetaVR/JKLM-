import React, { useState, useEffect, useRef } from 'react';
import { globalWordPicker } from '../utils/wordPicker';

const WordListPlaceholder = () => {
  const [currentSyllable, setCurrentSyllable] = useState('');
  const [placeholderSize, setPlaceholderSize] = useState('medium');
  const [isEnabled, setIsEnabled] = useState(false);
  const [wordlistReady, setWordlistReady] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const lastUpdateRef = useRef('');

  useEffect(() => {
    const checkPlaceholderMode = () => {
      try {
        const savedFeatures = localStorage.getItem('jklm-mini-bombparty-features');
        if (savedFeatures) {
          const parsedFeatures = JSON.parse(savedFeatures);
          const wordListFeature = parsedFeatures.find(f => f.id === 'word-list');
          
          if (wordListFeature && wordListFeature.enabled) {
            const isPlaceholderMode = wordListFeature.settings?.displayMode === 'placeholder';
            setIsEnabled(isPlaceholderMode);
            
            if (wordListFeature.settings?.placeholderSize) {
              setPlaceholderSize(wordListFeature.settings.placeholderSize);
            }
          } else {
            setIsEnabled(false);
          }
        }
      } catch (error) {
        setIsEnabled(false);
      }
    };
    
    checkPlaceholderMode();
    
    const handleSettingsChange = () => checkPlaceholderMode();
    const handleFeatureToggle = (e) => {
      if (e.detail?.featureId === 'word-list') checkPlaceholderMode();
    };
    
    window.addEventListener('jklm-mini-settings-change', handleSettingsChange);
    window.addEventListener('jklm-mini-feature-toggle', handleFeatureToggle);
    
    return () => {
      window.removeEventListener('jklm-mini-settings-change', handleSettingsChange);
      window.removeEventListener('jklm-mini-feature-toggle', handleFeatureToggle);
    };
  }, []);

  useEffect(() => {
    const handleSyllable = (event) => {
      const syl = event.detail?.syllable || '';
      if (syl && syl !== currentSyllable) {
        setCurrentSyllable(syl);
        lastUpdateRef.current = '';
      }
    };
    
    document.addEventListener('jklm-mini-syllable-detected', handleSyllable);
    document.addEventListener('jklm-mini-game-syllable', handleSyllable);
    
    return () => {
      document.removeEventListener('jklm-mini-syllable-detected', handleSyllable);
      document.removeEventListener('jklm-mini-game-syllable', handleSyllable);
    };
  }, [currentSyllable]);

  useEffect(() => {
    const handleTurnChange = (event) => {
      setIsMyTurn(event.detail?.isMyTurn || false);
    };
    
    document.addEventListener('jklm-mini-turn-state-change', handleTurnChange);
    
    return () => {
      document.removeEventListener('jklm-mini-turn-state-change', handleTurnChange);
    };
  }, []);

  useEffect(() => {
    if (isEnabled && !wordlistReady) {
      globalWordPicker.loadWordlist().then(() => {
        setWordlistReady(true);
      });
    }
  }, [isEnabled, wordlistReady]);

  useEffect(() => {
    if (!isEnabled || !wordlistReady || !isMyTurn || !currentSyllable) {
      return;
    }

    try {
      const saved = localStorage.getItem('jklm-mini-bombparty-features');
      if (saved) {
        const parsed = JSON.parse(saved);
        const silentTyper = parsed.find(f => f.id === 'silent-typer');
        if (silentTyper?.enabled && silentTyper?.settings?.showInPlaceholder) {
          return;
        }
      }
    } catch (e) {}
    
    const key = `${currentSyllable}-${placeholderSize}`;
    if (key === lastUpdateRef.current) return;
    lastUpdateRef.current = key;
    
    updatePlaceholder();
  }, [currentSyllable, placeholderSize, isEnabled, wordlistReady, isMyTurn]);

  const getSizeRange = (size) => {
    if (size === 'small') return { min: 3, max: 5 };
    if (size === 'medium') return { min: 6, max: 9 };
    if (size === 'large') return { min: 10, max: 30 };
    return { min: 6, max: 9 };
  };

  const updatePlaceholder = () => {
    const { min, max } = getSizeRange(placeholderSize);
    const bestWord = globalWordPicker.pickBest({
      syllable: currentSyllable,
      minLength: min,
      maxLength: max,
      excludeBlacklist: true,
      prioritizeAlphabet: true
    });
    
    if (bestWord && window.jklmPlusSetPlaceholder) {
      window.jklmPlusSetPlaceholder(bestWord);
    }
  };

  return null;
};

export default WordListPlaceholder;
