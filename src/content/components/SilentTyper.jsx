import React, { useEffect, useRef, useState } from 'react';
import DualRangeSlider from './DualRangeSlider';
import { globalWordPicker } from '../utils/wordPicker';
import gameTypeDetector from '../utils/gameTypeDetector';

const SilentTyper = () => {
  const [wordLengthMin, setWordLengthMin] = useState(4);
  const [wordLengthMax, setWordLengthMax] = useState(12);
  const [isEnabled, setIsEnabled] = useState(false);
  const [syllable, setSyllable] = useState('');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [wordlistReady, setWordlistReady] = useState(false);
  const [showInPlaceholder, setShowInPlaceholder] = useState(false);
  const [showFloatingBadge, setShowFloatingBadge] = useState(false);
  const [lengthPreference, setLengthPreference] = useState('none');
  const [selectViaWordlist, setSelectViaWordlist] = useState(false);

  const currentWordRef = useRef(null);
  const lastSyllableRef = useRef('');
  const lastTurnSyllableRef = useRef('');
  const failedWordsRef = useRef(new Set());
  const isTypingRef = useRef(false);

  const broadcastSelectedWord = (word) => {
    document.dispatchEvent(new CustomEvent('jklm-mini-silent-typer-word', {
      detail: { word }
    }));
    if (showInPlaceholder && word && window.jklmPlusSetPlaceholder) {
      window.jklmPlusSetPlaceholder(word);
    }
  };

  const persistSettings = (nextSettings) => {
    try {
      const saved = localStorage.getItem('jklm-mini-bombparty-features');
      const parsed = saved ? JSON.parse(saved) : [];
      const updated = parsed.map(f => f.id === 'silent-typer' ? { ...f, settings: { ...f.settings, ...nextSettings } } : f);
      localStorage.setItem('jklm-mini-bombparty-features', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('jklm-mini-settings-change', { detail: { action: 'silent-typer-settings' } }));
    } catch (e) {}
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('jklm-mini-bombparty-features');
      if (saved) {
        const parsed = JSON.parse(saved);
        const feature = parsed.find(f => f.id === 'silent-typer');
        if (feature?.settings) {
          const min = Number.isFinite(feature.settings.wordLengthMin) ? feature.settings.wordLengthMin : 4;
          const max = Number.isFinite(feature.settings.wordLengthMax) ? feature.settings.wordLengthMax : 12;
          setWordLengthMin(min);
          setWordLengthMax(max);
          setShowInPlaceholder(Boolean(feature.settings.showInPlaceholder));
          setShowFloatingBadge(Boolean(feature.settings.showFloatingBadge));
          setLengthPreference(feature.settings.lengthPreference ?? 'none');
          setSelectViaWordlist(feature.settings.selectViaWordlist ?? false);
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
      
      if (!newTurnState && isMyTurn && currentWordRef.current) {
        if (syllable === lastTurnSyllableRef.current) {
          failedWordsRef.current.add(currentWordRef.current);
          globalWordPicker.addToBlacklist(currentWordRef.current);
        }
        currentWordRef.current = null;
        isTypingRef.current = false;
      }
      
      if (newTurnState && !isMyTurn) {
        lastTurnSyllableRef.current = syllable;
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
      
      currentWordRef.current = word;
      if (window.jklmPlusInterceptTyping) {
        window.jklmPlusInterceptTyping(word);
      }
      broadcastSelectedWord(word);
    };
    
    const handleTypingProgress = () => {
      isTypingRef.current = true;
    };
    
    document.addEventListener('jklm-mini-wordlist-word-click', handleWordlistClick);
    window.addEventListener('message', (e) => {
      if (e.data?.source === 'jklm-plus-iframe' && e.data?.action === 'typing-progress') {
        handleTypingProgress();
      }
    });
    
    return () => {
      document.removeEventListener('jklm-mini-wordlist-word-click', handleWordlistClick);
    };
  }, [isEnabled, selectViaWordlist, isMyTurn, showInPlaceholder]);

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

  useEffect(() => {
    if (!isEnabled || !wordlistReady || !isMyTurn || !syllable) {
      if (!isMyTurn || !isEnabled) {
        broadcastSelectedWord(null);
      }
      return;
    }
    if (!gameTypeDetector.isBombParty()) return;
    if (selectViaWordlist) {
      if (syllable !== lastSyllableRef.current) {
        lastSyllableRef.current = syllable;
        currentWordRef.current = null;
        isTypingRef.current = false;
        broadcastSelectedWord(null);
      }
      return;
    }
    
    if (syllable !== lastSyllableRef.current || !currentWordRef.current) {
      lastSyllableRef.current = syllable;
      const word = pickTargetWord();
      if (word && window.jklmPlusInterceptTyping) {
        window.jklmPlusInterceptTyping(word);
        currentWordRef.current = word;
        broadcastSelectedWord(word);
      }
    }
  }, [isEnabled, isMyTurn, syllable, wordLengthMin, wordLengthMax, wordlistReady, showInPlaceholder, selectViaWordlist]);

  useEffect(() => {
    if (!isEnabled) return;
    
    const handleRejection = (e) => {
      if (!gameTypeDetector.isBombParty()) return;
      const rejectedWord = e.detail?.word;
      if (rejectedWord) {
        globalWordPicker.addToBlacklist(rejectedWord);
        failedWordsRef.current.add(rejectedWord);
        currentWordRef.current = null;
        
        if (isMyTurn && syllable) {
          const newWord = pickTargetWord();
          if (newWord && window.jklmPlusInterceptTyping) {
            window.jklmPlusInterceptTyping(newWord);
            currentWordRef.current = newWord;
            broadcastSelectedWord(newWord);
          }
        }
      }
    };
    
    document.addEventListener('jklm-mini-word-rejected', handleRejection);
    return () => document.removeEventListener('jklm-mini-word-rejected', handleRejection);
  }, [isEnabled, isMyTurn, syllable, wordLengthMin, wordLengthMax, wordlistReady, showInPlaceholder]);

  useEffect(() => {
    if (!isEnabled || !isMyTurn) return;
    if (!gameTypeDetector.isBombParty()) return;
    if (selectViaWordlist) return;
    
    const retryInterval = setInterval(() => {
      if (isMyTurn && syllable && !currentWordRef.current && gameTypeDetector.isBombParty()) {
        const word = pickTargetWord();
        if (word && window.jklmPlusInterceptTyping) {
          window.jklmPlusInterceptTyping(word);
          currentWordRef.current = word;
          broadcastSelectedWord(word);
        }
      }
    }, 200);
    
    return () => clearInterval(retryInterval);
  }, [isEnabled, isMyTurn, syllable, wordLengthMin, wordLengthMax, wordlistReady, showInPlaceholder, selectViaWordlist]);

  useEffect(() => {
    if (!isEnabled) {
      currentWordRef.current = null;
      isTypingRef.current = false;
      broadcastSelectedWord(null);
    }
  }, [isEnabled]);

  return (
    <div className="silent-typer">
      <div className="silent-typer-settings">
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
        <div className="silent-typer-display-options">
          <div className="display-option-row">
            <span>Show in placeholder</span>
            <div 
              className={`toggle-switch ${showInPlaceholder ? 'active' : ''}`}
              onClick={() => {
                const newVal = !showInPlaceholder;
                setShowInPlaceholder(newVal);
                persistSettings({ showInPlaceholder: newVal });
              }}
            >
              <div className="toggle-switch-handle"></div>
            </div>
          </div>
          <div className="display-option-row">
            <span>Floating badge</span>
            <div 
              className={`toggle-switch ${showFloatingBadge ? 'active' : ''}`}
              onClick={() => {
                const newVal = !showFloatingBadge;
                setShowFloatingBadge(newVal);
                persistSettings({ showFloatingBadge: newVal });
              }}
            >
              <div className="toggle-switch-handle"></div>
            </div>
          </div>

          <div className="display-option-row">
            <span>Length Pref.</span>
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

          <div className="display-option-row">
            <span>Select via Wordlist</span>
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
    </div>
  );
};

export default SilentTyper;
