import React, { useEffect, useRef, useState } from 'react';
import DualRangeSlider from './DualRangeSlider';
import popsauceAnswers from '../data/popsauceAnswers';
import gameTypeDetector from '../utils/gameTypeDetector';

const PopsauceAutoTyper = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentHash, setCurrentHash] = useState(null);

  const [reactionTimeMin, setReactionTimeMin] = useState(200);
  const [reactionTimeMax, setReactionTimeMax] = useState(500);
  const [wpmMin, setWpmMin] = useState(60);
  const [wpmMax, setWpmMax] = useState(90);
  const [typoChance, setTypoChance] = useState(5);
  const [typoFixDelay, setTypoFixDelay] = useState(300);
  const [preferShortest, setPreferShortest] = useState(false);

  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  const persistSettings = (nextSettings) => {
    try {
      const saved = localStorage.getItem('jklm-mini-popsauce-features');
      const parsed = saved ? JSON.parse(saved) : [];
      const updated = parsed.map(f => f.id === 'auto-typer' ? { ...f, settings: { ...f.settings, ...nextSettings } } : f);
      localStorage.setItem('jklm-mini-popsauce-features', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('jklm-mini-settings-change', { detail: { action: 'auto-typer-settings' } }));
    } catch (e) {}
  };

  useEffect(() => {
    popsauceAnswers.initialize();
    try {
      const saved = localStorage.getItem('jklm-mini-popsauce-features');
      if (saved) {
        const parsed = JSON.parse(saved);
        const feature = parsed.find(f => f.id === 'auto-typer');
        if (feature?.settings) {
          setReactionTimeMin(feature.settings.reactionTimeMin ?? 200);
          setReactionTimeMax(feature.settings.reactionTimeMax ?? 500);
          setWpmMin(feature.settings.wpmMin ?? 60);
          setWpmMax(feature.settings.wpmMax ?? 90);
          setTypoChance(feature.settings.typoChance ?? 5);
          setTypoFixDelay(feature.settings.typoFixDelay ?? 300);
          setPreferShortest(feature.settings.preferShortest ?? false);
        }
        setIsEnabled(Boolean(feature?.enabled));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const handleToggle = (event) => {
      if (event.detail?.featureId === 'auto-typer') {
        setIsEnabled(Boolean(event.detail.enabled));
      }
    };
    const handleSettings = () => {
      try {
        const saved = localStorage.getItem('jklm-mini-popsauce-features');
        if (saved) {
          const parsed = JSON.parse(saved);
          const feature = parsed.find(f => f.id === 'auto-typer');
          if (feature?.settings) {
            setReactionTimeMin(feature.settings.reactionTimeMin ?? 200);
            setReactionTimeMax(feature.settings.reactionTimeMax ?? 500);
            setWpmMin(feature.settings.wpmMin ?? 60);
            setWpmMax(feature.settings.wpmMax ?? 90);
            setTypoChance(feature.settings.typoChance ?? 5);
            setTypoFixDelay(feature.settings.typoFixDelay ?? 300);
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

  const getRandomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const wpmToCharDelay = (wpm) => {
    const charsPerMinute = wpm * 5;
    return 60000 / charsPerMinute;
  };

  const simulateTyping = async (answer) => {
    if (!window.jklmPlusPopsauceAutoFill || isTypingRef.current) return;
    
    isTypingRef.current = true;
    const wpm = getRandomInRange(wpmMin, wpmMax);
    const baseDelay = wpmToCharDelay(wpm);
    
    let currentInput = '';
    let i = 0;
    
    while (i < answer.length && isTypingRef.current) {
      const shouldTypo = Math.random() * 100 < typoChance;
      
      if (shouldTypo && i < answer.length - 1) {
        const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        currentInput += wrongChar;
        window.jklmPlusPopsauceAutoFill(currentInput);
        
        await new Promise(r => setTimeout(r, typoFixDelay));
        if (!isTypingRef.current) break;
        
        currentInput = currentInput.slice(0, -1);
        window.jklmPlusPopsauceAutoFill(currentInput);
        
        await new Promise(r => setTimeout(r, baseDelay * 0.5));
        if (!isTypingRef.current) break;
      }
      
      currentInput += answer[i];
      window.jklmPlusPopsauceAutoFill(currentInput);
      i++;
      
      if (i < answer.length) {
        const variance = baseDelay * 0.3;
        const delay = baseDelay + (Math.random() * variance * 2 - variance);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    
    if (isTypingRef.current && currentInput.length === answer.length) {
      await new Promise(r => setTimeout(r, 50));
      window.jklmPlusPopsauceAutoSubmit?.();
    }
    
    isTypingRef.current = false;
  };

  useEffect(() => {
    const handleChallenge = (event) => {
      const { hash } = event.detail;
      setCurrentHash(hash);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      isTypingRef.current = false;
      
      if (!isEnabled) return;
      if (!gameTypeDetector.isPopsauce()) return;
      
      const answer = popsauceAnswers.getAnswer(hash, preferShortest);
      if (answer) {
        const reactionTime = getRandomInRange(reactionTimeMin, reactionTimeMax);
        typingTimeoutRef.current = setTimeout(() => {
          if (gameTypeDetector.isPopsauce()) {
            simulateTyping(answer);
          }
        }, reactionTime);
      }
    };

    const handleEndChallenge = () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      isTypingRef.current = false;
      setCurrentHash(null);
    };

    document.addEventListener('jklm-mini-popsauce-challenge', handleChallenge);
    document.addEventListener('jklm-mini-popsauce-end-challenge', handleEndChallenge);
    return () => {
      document.removeEventListener('jklm-mini-popsauce-challenge', handleChallenge);
      document.removeEventListener('jklm-mini-popsauce-end-challenge', handleEndChallenge);
    };
  }, [isEnabled, reactionTimeMin, reactionTimeMax, wpmMin, wpmMax, typoChance, typoFixDelay, preferShortest]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="auto-typer">
      <div className="auto-typer-settings">
        <div className="setting-item">
          <label>Prefer Shortest</label>
          <div 
            className={`toggle-switch ${preferShortest ? 'active' : ''}`}
            onClick={() => {
              const newVal = !preferShortest;
              setPreferShortest(newVal);
              persistSettings({ preferShortest: newVal });
            }}
            style={{ backgroundColor: preferShortest ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)' }}
          >
            <div className="toggle-switch-handle"></div>
          </div>
        </div>

        <DualRangeSlider
          min={50}
          max={1000}
          minValue={reactionTimeMin}
          maxValue={reactionTimeMax}
          onChange={(min, max) => {
            setReactionTimeMin(min);
            setReactionTimeMax(max);
            persistSettings({ reactionTimeMin: min, reactionTimeMax: max });
          }}
          label="Reaction Time"
          unit=" ms"
          showToggle={false}
        />

        <DualRangeSlider
          min={20}
          max={200}
          minValue={wpmMin}
          maxValue={wpmMax}
          onChange={(min, max) => {
            setWpmMin(min);
            setWpmMax(max);
            persistSettings({ wpmMin: min, wpmMax: max });
          }}
          label="Typing Speed"
          unit=" WPM"
          showToggle={false}
        />

        <div className="setting-separator"></div>

        <div className="setting-item single-slider">
          <label>Typo Chance</label>
          <div className="slider-container">
            <input 
              type="range" 
              min="0" 
              max="30" 
              step="1"
              value={typoChance} 
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setTypoChance(val);
                persistSettings({ typoChance: val });
              }}
              style={{
                '--progress': `${typoChance / 30 * 100}%`,
                '--accent-color': 'var(--accent-primary)'
              }}
            />
            <span className="slider-value">{typoChance}%</span>
          </div>
        </div>

        <div className="setting-item single-slider">
          <label>Typo Fix Delay</label>
          <div className="slider-container">
            <input 
              type="range" 
              min="100" 
              max="800" 
              step="50"
              value={typoFixDelay} 
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setTypoFixDelay(val);
                persistSettings({ typoFixDelay: val });
              }}
              style={{
                '--progress': `${(typoFixDelay - 100) / 700 * 100}%`,
                '--accent-color': 'var(--accent-primary)'
              }}
            />
            <span className="slider-value">{typoFixDelay}ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopsauceAutoTyper;
