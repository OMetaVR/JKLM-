import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

const AlphabetTracker = () => {
  const { accentColor } = useTheme();
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [isEnabled, setIsEnabled] = useState(false);
  
  const [letterRequirements, setLetterRequirements] = useState(() => {
    const defaultRequirements = {};
    for (let i = 0; i < 26; i++) {
      defaultRequirements[String.fromCharCode(65 + i)] = 1;
    }
    const saved = localStorage.getItem('jklm-mini-alphabet-requirements');
    if (saved) {
      try {
        return { ...defaultRequirements, ...JSON.parse(saved) };
      } catch (e) {}
    }
    return defaultRequirements;
  });

  const [remainingLetters, setRemainingLetters] = useState(() => {
    const saved = localStorage.getItem('jklm-mini-alphabet-remaining');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { ...letterRequirements };
  });

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const currentLetter = alphabet[currentLetterIndex];

  useEffect(() => {
    const checkEnabled = () => {
      try {
        const saved = localStorage.getItem('jklm-mini-bombparty-features');
        if (saved) {
          const features = JSON.parse(saved);
          const alphabetFeature = features.find(f => f.id === 'alphabet' || f.id === 'abc');
          setIsEnabled(alphabetFeature?.enabled || false);
        }
      } catch (e) {}
    };
    
    checkEnabled();
    
    const handleToggle = (e) => {
      if (e.detail?.featureId === 'alphabet' || e.detail?.featureId === 'abc') {
        setIsEnabled(e.detail.enabled);
      }
    };
    
    window.addEventListener('jklm-mini-feature-toggle', handleToggle);
    window.addEventListener('jklm-mini-settings-change', checkEnabled);
    
    return () => {
      window.removeEventListener('jklm-mini-feature-toggle', handleToggle);
      window.removeEventListener('jklm-mini-settings-change', checkEnabled);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('jklm-mini-alphabet-requirements', JSON.stringify(letterRequirements));
  }, [letterRequirements]);

  useEffect(() => {
    const handleRulesChange = (e) => {
      const bonusAlphabet = e.detail?.bonusAlphabet;
      if (!bonusAlphabet) return;
      
      const newRequirements = {};
      for (let i = 0; i < 26; i++) {
        const letter = String.fromCharCode(65 + i);
        const lowerLetter = letter.toLowerCase();
        newRequirements[letter] = bonusAlphabet[lowerLetter] !== undefined ? bonusAlphabet[lowerLetter] : 1;
      }
      
      setLetterRequirements(newRequirements);
      setRemainingLetters(newRequirements);
    };
    
    document.addEventListener('jklm-mini-rules-change', handleRulesChange);
    
    const requestRules = () => {
      if (window.jklmPlusRequestRules) {
        window.jklmPlusRequestRules();
      }
    };
    
    requestRules();
    const retryTimeout = setTimeout(requestRules, 1000);
    const retryTimeout2 = setTimeout(requestRules, 3000);
    
    return () => {
      document.removeEventListener('jklm-mini-rules-change', handleRulesChange);
      clearTimeout(retryTimeout);
      clearTimeout(retryTimeout2);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('jklm-mini-alphabet-remaining', JSON.stringify(remainingLetters));
    
    document.dispatchEvent(new CustomEvent('jklm-mini-alphabet-state-change', {
      detail: {
        remaining: remainingLetters,
        requirements: letterRequirements,
        enabled: isEnabled
      }
    }));
  }, [remainingLetters, isEnabled]);

  useEffect(() => {
    const handleWordEntered = (e) => {
      if (!isEnabled) return;
      if (!e.detail?.isSelf) return;
      const word = e.detail?.word?.toUpperCase() || '';
      if (!word) return;
      
      const lettersInWord = new Set(word.split(''));
      
      setRemainingLetters(prev => {
        const updated = { ...prev };
        let changed = false;
        
        for (const letter of lettersInWord) {
          if (updated[letter] && updated[letter] > 0) {
            updated[letter]--;
            changed = true;
          }
        }
        
        if (changed) {
          const allCleared = Object.values(updated).every(c => c <= 0);
          if (allCleared) {
            return { ...letterRequirements };
          }
        }
        
        return updated;
      });
    };

    const handleClearBlacklist = () => {
      setRemainingLetters({ ...letterRequirements });
    };

    const handleGameEnded = () => {
      setRemainingLetters({ ...letterRequirements });
    };

    document.addEventListener('jklm-mini-word-accepted', handleWordEntered);
    document.addEventListener('jklm-mini-clear-blacklist', handleClearBlacklist);
    document.addEventListener('jklm-mini-game-ended', handleGameEnded);

    return () => {
      document.removeEventListener('jklm-mini-word-accepted', handleWordEntered);
      document.removeEventListener('jklm-mini-clear-blacklist', handleClearBlacklist);
      document.removeEventListener('jklm-mini-game-ended', handleGameEnded);
    };
  }, [isEnabled, letterRequirements]);

  const goToPrevious = () => setCurrentLetterIndex(prev => prev === 0 ? 25 : prev - 1);
  const goToNext = () => setCurrentLetterIndex(prev => prev === 25 ? 0 : prev + 1);

  const updateRequirement = (value) => {
    const numValue = Math.max(0, Math.min(99, parseInt(value) || 0));
    setLetterRequirements(prev => {
      const updated = { ...prev, [currentLetter]: numValue };
      setRemainingLetters(r => ({ ...r, [currentLetter]: numValue }));
      return updated;
    });
  };

  const resetToDefault = () => {
    const defaultRequirements = {};
    for (let i = 0; i < 26; i++) {
      defaultRequirements[String.fromCharCode(65 + i)] = 1;
    }
    setLetterRequirements(defaultRequirements);
    setRemainingLetters(defaultRequirements);
  };

  const resetProgress = () => {
    setRemainingLetters({ ...letterRequirements });
  };

  const totalNeeded = Object.values(remainingLetters).reduce((sum, c) => sum + Math.max(0, c), 0);
  const totalRequired = Object.values(letterRequirements).reduce((sum, c) => sum + c, 0);
  const progress = totalRequired > 0 ? Math.round(((totalRequired - totalNeeded) / totalRequired) * 100) : 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '15px',
      padding: '20px',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px' }}>
        <button
          onClick={resetProgress}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: accentColor.primary,
            fontSize: '14px',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Reset Progress"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
        <button
          onClick={resetToDefault}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: accentColor.primary,
            fontSize: '14px',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Reset to Default"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%', justifyContent: 'center' }}>
        <button
          onClick={goToPrevious}
          style={{
            background: 'none',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--background-secondary)',
            fontSize: '18px',
            fontWeight: 'bold'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <div style={{ position: 'relative' }}>
          <div style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: remainingLetters[currentLetter] <= 0 ? 'var(--text-secondary)' : accentColor.primary,
            fontFamily: 'Arial, sans-serif',
            minWidth: '100px',
            textAlign: 'center',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            opacity: remainingLetters[currentLetter] <= 0 ? 0.4 : 1
          }}>
            {currentLetter}
          </div>
          {remainingLetters[currentLetter] > 0 && (
            <div style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              backgroundColor: accentColor.primary,
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {remainingLetters[currentLetter]}
            </div>
          )}
        </div>

        <button
          onClick={goToNext}
          style={{
            background: 'none',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--background-secondary)',
            fontSize: '18px',
            fontWeight: 'bold'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', opacity: 0.8 }}>
        {currentLetterIndex + 1} of 26
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <label style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
          Required Count
        </label>
        <input
          type="number"
          min="0"
          max="99"
          value={letterRequirements[currentLetter]}
          onChange={(e) => updateRequirement(e.target.value)}
          style={{
            width: '80px',
            padding: '8px',
            textAlign: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: 'var(--background-primary)',
            border: `2px solid ${accentColor.primary}`,
            borderRadius: '6px',
            color: 'var(--text-primary)',
            outline: 'none'
          }}
        />
      </div>

      <div style={{
        width: '100%',
        backgroundColor: 'var(--background-secondary)',
        borderRadius: '4px',
        height: '8px',
        overflow: 'hidden',
        marginTop: '5px'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: accentColor.primary,
          transition: 'width 0.3s ease'
        }} />
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', opacity: 0.7 }}>
        {totalNeeded} letters remaining ({progress}% complete)
      </div>
    </div>
  );
};

export default AlphabetTracker;
