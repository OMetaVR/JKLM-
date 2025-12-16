import React, { useEffect, useRef, useState } from 'react';
import DualRangeSlider from './DualRangeSlider';
import { globalWordPicker } from '../utils/wordPicker';
import gameTypeDetector from '../utils/gameTypeDetector';

const AutoTyper = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [wordlistReady, setWordlistReady] = useState(false);
  const [syllable, setSyllable] = useState('');
  const [isMyTurn, setIsMyTurn] = useState(false);

  const [reactionTimeMin, setReactionTimeMin] = useState(200);
  const [reactionTimeMax, setReactionTimeMax] = useState(500);
  const [wordLengthMin, setWordLengthMin] = useState(4);
  const [wordLengthMax, setWordLengthMax] = useState(12);
  const [wpmMin, setWpmMin] = useState(60);
  const [wpmMax, setWpmMax] = useState(90);
  const [typoChance, setTypoChance] = useState(5);
  const [typoFixDelay, setTypoFixDelay] = useState(300);
  const [lengthPreference, setLengthPreference] = useState('none');
  const [selectViaWordlist, setSelectViaWordlist] = useState(false);

  const currentWordRef = useRef(null);
  const lastSyllableRef = useRef('');
  const isTypingRef = useRef(false);
  const turnStartTimeRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const wordlistSelectedWordRef = useRef(null);
  const pendingWordlistSelectionRef = useRef(null);

  const persistSettings = (nextSettings) => {
    try {
      const saved = localStorage.getItem('jklm-mini-bombparty-features');
      const parsed = saved ? JSON.parse(saved) : [];
      const updated = parsed.map(f => f.id === 'auto-typer' ? { ...f, settings: { ...f.settings, ...nextSettings } } : f);
      localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('jklm-mini-settings-change', { detail: { action: 'auto-typer-settings' } }));
    } catch (e) {}
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('jklm-mini-bombparty-features');
      if (saved) {
        const parsed = JSON.parse(saved);
        const feature = parsed.find(f => f.id === 'auto-typer');
        if (feature?.settings) {
          setReactionTimeMin(feature.settings.reactionTimeMin ?? 200);
          setReactionTimeMax(feature.settings.reactionTimeMax ?? 500);
          setWordLengthMin(feature.settings.wordLengthMin ?? 4);
          setWordLengthMax(feature.settings.wordLengthMax ?? 12);
          setWpmMin(feature.settings.wpmMin ?? 60);
          setWpmMax(feature.settings.wpmMax ?? 90);
          setTypoChance(feature.settings.typoChance ?? 5);
          setTypoFixDelay(feature.settings.typoFixDelay ?? 300);
          setLengthPreference(feature.settings.lengthPreference ?? 'none');
          setSelectViaWordlist(feature.settings.selectViaWordlist ?? false);
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
    window.addEventListener('jklm-mini-feature-toggle', handleToggle);
    return () => {
      window.removeEventListener('jklm-mini-feature-toggle', handleToggle);
    };
  }, []);

  useEffect(() => {
    globalWordPicker.loadWordlist().then(() => {
      setWordlistReady(true);
    });
  }, []);

  useEffect(() => {
    const handleSyllable = (e) => {
      const syl = e.detail?.syllable || '';
      if (syl && syl !== syllable) {
        setSyllable(syl);
        currentWordRef.current = null;
      }
    };
    document.addEventListener('jklm-mini-game-syllable', handleSyllable);
    document.addEventListener('jklm-mini-syllable-detected', handleSyllable);
    return () => {
      document.removeEventListener('jklm-mini-game-syllable', handleSyllable);
      document.removeEventListener('jklm-mini-syllable-detected', handleSyllable);
    };
  }, [syllable]);

  useEffect(() => {
    const handleTurnChange = (event) => {
      const newTurnState = event.detail?.isMyTurn || false;
      if (newTurnState && !isMyTurn) {
        turnStartTimeRef.current = Date.now();
        lastSyllableRef.current = syllable;
        wordlistSelectedWordRef.current = null;
        pendingWordlistSelectionRef.current = null;
      }
      if (!newTurnState) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        isTypingRef.current = false;
        currentWordRef.current = null;
        wordlistSelectedWordRef.current = null;
        pendingWordlistSelectionRef.current = null;
      }
      setIsMyTurn(newTurnState);
    };
    document.addEventListener('jklm-mini-turn-state-change', handleTurnChange);
    return () => {
      document.removeEventListener('jklm-mini-turn-state-change', handleTurnChange);
    };
  }, [isMyTurn, syllable]);

  useEffect(() => {
    if (!isEnabled || !selectViaWordlist) return;
    
    const handleWordlistClick = (e) => {
      const word = e.detail?.word;
      if (!word || !isMyTurn) return;
      
      if (isTypingRef.current) {
        return;
      }
      
      wordlistSelectedWordRef.current = word;
      currentWordRef.current = word;
      
      document.dispatchEvent(new CustomEvent('jklm-mini-silent-typer-word', {
        detail: { word }
      }));
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      const reactionTime = getRandomInRange(reactionTimeMin, reactionTimeMax);
      typingTimeoutRef.current = setTimeout(() => {
        if (isMyTurn && isEnabled && gameTypeDetector.isBombParty() && !isTypingRef.current) {
          simulateTyping(word);
        }
      }, reactionTime);
    };
    
    document.addEventListener('jklm-mini-wordlist-word-click', handleWordlistClick);
    return () => {
      document.removeEventListener('jklm-mini-wordlist-word-click', handleWordlistClick);
    };
  }, [isEnabled, selectViaWordlist, isMyTurn, reactionTimeMin, reactionTimeMax]);

  const pickTargetWord = () => {
    if (!syllable || !wordlistReady) return null;
    return globalWordPicker.pickBest({
      syllable,
      minLength: wordLengthMin,
      maxLength: wordLengthMax,
      excludeBlacklist: true,
      prioritizeAlphabet: true,
      lengthPreference
    });
  };

  const getRandomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const wpmToCharDelay = (wpm) => {
    const charsPerMinute = wpm * 5;
    return 60000 / charsPerMinute;
  };

  const simulateTyping = async (word) => {
    if (!window.jklmPlusAutoType || !isMyTurn || isTypingRef.current) return;
    
    isTypingRef.current = true;
    
    let currentInput = '';
    let i = 0;
    
    while (i < word.length && isMyTurn && isTypingRef.current) {
      const shouldTypo = Math.random() * 100 < typoChance;
      
      if (shouldTypo && i < word.length - 1) {
        const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        currentInput += wrongChar;
        window.jklmPlusAutoType(currentInput);
        
        await new Promise(r => setTimeout(r, typoFixDelay));
        if (!isMyTurn || !isTypingRef.current) break;
        
        currentInput = currentInput.slice(0, -1);
        window.jklmPlusAutoType(currentInput);
        
        const wpmForBackspace = getRandomInRange(wpmMin, wpmMax);
        await new Promise(r => setTimeout(r, wpmToCharDelay(wpmForBackspace) * 0.5));
        if (!isMyTurn || !isTypingRef.current) break;
      }
      
      currentInput += word[i];
      window.jklmPlusAutoType(currentInput);
      i++;
      
      if (i < word.length) {
        const wpmForChar = getRandomInRange(wpmMin, wpmMax);
        const delay = wpmToCharDelay(wpmForChar);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    
    if (isMyTurn && isTypingRef.current && currentInput === word) {
      await new Promise(r => setTimeout(r, 50));
      if (window.jklmPlusAutoSubmit) {
        window.jklmPlusAutoSubmit();
      }
    }
    
    isTypingRef.current = false;
  };

  useEffect(() => {
    if (!isEnabled || !wordlistReady || !isMyTurn || !syllable || isTypingRef.current) return;
    if (!gameTypeDetector.isBombParty()) return;
    if (selectViaWordlist) return;
    
    if (syllable !== lastSyllableRef.current || !currentWordRef.current) {
      lastSyllableRef.current = syllable;
      const word = pickTargetWord();
      
      if (word) {
        currentWordRef.current = word;
        const reactionTime = getRandomInRange(reactionTimeMin, reactionTimeMax);
        
        typingTimeoutRef.current = setTimeout(() => {
          if (isMyTurn && isEnabled && gameTypeDetector.isBombParty()) {
            simulateTyping(word);
          }
        }, reactionTime);
      }
    }
  }, [isEnabled, isMyTurn, syllable, wordlistReady, reactionTimeMin, reactionTimeMax, wordLengthMin, wordLengthMax, wpmMin, wpmMax, selectViaWordlist]);

  useEffect(() => {
    if (!isEnabled) return;
    
    const handleRejection = (e) => {
      const rejectedWord = e.detail?.word;
      if (rejectedWord) {
        globalWordPicker.addToBlacklist(rejectedWord);
        currentWordRef.current = null;
        isTypingRef.current = false;
        
        if (isMyTurn && syllable) {
          const newWord = pickTargetWord();
          if (newWord) {
            currentWordRef.current = newWord;
            const reactionTime = getRandomInRange(100, 300);
            typingTimeoutRef.current = setTimeout(() => {
              if (isMyTurn && isEnabled) {
                simulateTyping(newWord);
              }
            }, reactionTime);
          }
        }
      }
    };
    
    document.addEventListener('jklm-mini-word-rejected', handleRejection);
    document.addEventListener('jklm-mini-word-failed', handleRejection);
    return () => {
      document.removeEventListener('jklm-mini-word-rejected', handleRejection);
      document.removeEventListener('jklm-mini-word-failed', handleRejection);
    };
  }, [isEnabled, isMyTurn, syllable, wordLengthMin, wordLengthMax, wordlistReady]);

  useEffect(() => {
    if (!isEnabled) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      isTypingRef.current = false;
      currentWordRef.current = null;
      wordlistSelectedWordRef.current = null;
      pendingWordlistSelectionRef.current = null;
    }
  }, [isEnabled]);

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
          min={3}
          max={30}
          minValue={wordLengthMin}
          maxValue={wordLengthMax}
          onChange={(min, max) => {
            setWordLengthMin(min);
            setWordLengthMax(max);
            persistSettings({ wordLengthMin: min, wordLengthMax: max });
          }}
          label="Word Length"
          unit=" letters"
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

        <div className="setting-separator"></div>

        <div className="setting-item">
          <label>Length Pref.</label>
          <select
            value={lengthPreference}
            onChange={(e) => {
              setLengthPreference(e.target.value);
              persistSettings({ lengthPreference: e.target.value });
            }}
            style={{
              backgroundColor: 'var(--background-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <option value="none">None</option>
            <option value="shortest">Prefer Shortest</option>
            <option value="longest">Prefer Longest</option>
          </select>
        </div>

        <div className="setting-item">
          <label>Select via Wordlist</label>
          <div 
            className={`toggle-switch ${selectViaWordlist ? 'active' : ''}`}
            onClick={() => {
              const newVal = !selectViaWordlist;
              setSelectViaWordlist(newVal);
              persistSettings({ selectViaWordlist: newVal });
            }}
          >
            <div className="toggle-switch-handle"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoTyper;
