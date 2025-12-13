import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import popsauceAnswers from '../data/popsauceAnswers';

const AnswerDisplay = () => {
  const { accentColor } = useTheme();
  const [currentHash, setCurrentHash] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [displayedAnswer, setDisplayedAnswer] = useState(null);
  const [allAnswers, setAllAnswers] = useState([]);
  const [isDelayed, setIsDelayed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [stats, setStats] = useState({ totalAnswers: 0, totalAliases: 0 });
  const delayTimerRef = useRef(null);

  const getSettings = () => {
    try {
      const saved = localStorage.getItem('jklm-mini-popsauce-features');
      if (saved) {
        const features = JSON.parse(saved);
        const answerDisplay = features.find(f => f.id === 'answer-display');
        if (answerDisplay?.settings) {
          return {
            displayMode: answerDisplay.settings.displayMode || 'window',
            delayEnabled: answerDisplay.settings.delayEnabled || false,
            delaySeconds: answerDisplay.settings.delaySeconds || 3,
            preferShortest: answerDisplay.settings.preferShortest || false
          };
        }
      }
    } catch (e) {}
    return { displayMode: 'window', delayEnabled: false, delaySeconds: 3, preferShortest: false };
  };

  useEffect(() => {
    popsauceAnswers.initialize().then(() => {
      setStats(popsauceAnswers.getStats());
    });
  }, []);

  useEffect(() => {
    const handleChallenge = (event) => {
      const { hash, prompt } = event.detail;
      setCurrentHash(hash);
      setCurrentPrompt(prompt);
      setDisplayedAnswer(null);
      setIsDelayed(false);
      setCountdown(0);
      
      if (delayTimerRef.current) {
        clearInterval(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      
      const settings = getSettings();
      const answer = popsauceAnswers.getAnswer(hash, settings.preferShortest);
      const all = popsauceAnswers.getAllAnswers(hash);
      setCurrentAnswer(answer);
      setAllAnswers(all);
      
      if (answer) {
        if (settings.delayEnabled && settings.delaySeconds > 0) {
          setIsDelayed(true);
          setCountdown(settings.delaySeconds);
          
          delayTimerRef.current = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(delayTimerRef.current);
                delayTimerRef.current = null;
                setIsDelayed(false);
                setDisplayedAnswer(answer);
                if (settings.displayMode === 'placeholder') {
                  window.jklmPlusPopsauceSetPlaceholder?.(answer);
                }
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setDisplayedAnswer(answer);
          if (settings.displayMode === 'placeholder') {
            window.jklmPlusPopsauceSetPlaceholder?.(answer);
          }
        }
      } else {
        if (settings.displayMode === 'placeholder') {
          window.jklmPlusPopsauceSetPlaceholder?.('No answer found');
        }
      }
    };

    const handleAnswerRevealed = (event) => {
      const { hash, answer } = event.detail;
      if (hash && answer) {
        const added = popsauceAnswers.addAnswer(hash, answer);
        if (added) {
          setStats(popsauceAnswers.getStats());
        }
        if (!currentAnswer && hash === currentHash) {
          setCurrentAnswer(answer);
          setDisplayedAnswer(answer);
          setAllAnswers([answer]);
        }
      }
      window.jklmPlusPopsauceSetPlaceholder?.('');
    };

    const handleEndChallenge = (event) => {
      const result = event.detail;
      if (!result || !result.source) return;
      
      setCurrentHash(prevHash => {
        if (!prevHash) return prevHash;
        
        const knownAnswer = popsauceAnswers.getAnswer(prevHash, false);
        if (!knownAnswer) {
          const added = popsauceAnswers.addAnswer(prevHash, result.source);
          if (added) {
            setCurrentAnswer(result.source);
            setDisplayedAnswer(result.source);
            setAllAnswers([result.source]);
            setStats(popsauceAnswers.getStats());
          }
        }
        
        const officialAnswer = knownAnswer || result.source;
        if (result.foundSourcesByPlayerPeerId) {
          Object.values(result.foundSourcesByPlayerPeerId).forEach(playerAnswer => {
            if (playerAnswer && playerAnswer.toLowerCase() !== officialAnswer.toLowerCase()) {
              const added = popsauceAnswers.addAlias(prevHash, playerAnswer);
              if (added) {
                setStats(popsauceAnswers.getStats());
              }
            }
          });
          setAllAnswers(popsauceAnswers.getAllAnswers(prevHash));
        }
        
        return prevHash;
      });
    };

    const handleSettingsChange = () => {
      setStats(popsauceAnswers.getStats());
      if (currentHash && currentAnswer) {
        const settings = getSettings();
        const answer = popsauceAnswers.getAnswer(currentHash, settings.preferShortest);
        if (!isDelayed) {
          setDisplayedAnswer(answer);
        }
      }
    };

    document.addEventListener('jklm-mini-popsauce-challenge', handleChallenge);
    document.addEventListener('jklm-mini-popsauce-answer-revealed', handleAnswerRevealed);
    document.addEventListener('jklm-mini-popsauce-end-challenge', handleEndChallenge);
    window.addEventListener('jklm-mini-settings-change', handleSettingsChange);

    return () => {
      document.removeEventListener('jklm-mini-popsauce-challenge', handleChallenge);
      document.removeEventListener('jklm-mini-popsauce-answer-revealed', handleAnswerRevealed);
      document.removeEventListener('jklm-mini-popsauce-end-challenge', handleEndChallenge);
      window.removeEventListener('jklm-mini-settings-change', handleSettingsChange);
      if (delayTimerRef.current) {
        clearInterval(delayTimerRef.current);
      }
    };
  }, [currentHash, currentAnswer, isDelayed]);

  const settings = getSettings();
  
  if (settings.displayMode === 'placeholder') {
    return (
      <div className="answer-display-info">
        <div className="setting-item">
          <label>Database</label>
          <span>{stats.totalAnswers} answers</span>
        </div>
        <div className="setting-item">
          <label>Aliases</label>
          <span>{stats.totalAliases} learned</span>
        </div>
        <button 
          className="refresh-btn"
          onClick={async () => {
            await popsauceAnswers.fetchRemoteAnswers();
            setStats(popsauceAnswers.getStats());
          }}
          style={{ backgroundColor: accentColor.primary }}
        >
          Sync Remote
        </button>
      </div>
    );
  }

  return (
    <div className="answer-display-info">
      <div className="setting-item">
        <label>Database</label>
        <span>{stats.totalAnswers} answers</span>
      </div>
      <div className="setting-item">
        <label>Aliases</label>
        <span>{stats.totalAliases} learned</span>
      </div>
      {currentPrompt && (
        <div className="answer-display-current">
          <div className="answer-prompt">{currentPrompt}</div>
          {isDelayed ? (
            <div className="answer-delayed" style={{ color: accentColor.primary }}>
              Revealing in {countdown}s...
            </div>
          ) : displayedAnswer ? (
            <>
              <div className="answer-value" style={{ color: accentColor.primary }}>
                {displayedAnswer}
              </div>
              {allAnswers.length > 1 && (
                <div className="answer-aliases">
                  {allAnswers.filter(a => a !== displayedAnswer).map((alias, i) => (
                    <span key={i} className="answer-alias">{alias}</span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="answer-unknown">No answer found</div>
          )}
        </div>
      )}
      <button 
        className="refresh-btn"
        onClick={async () => {
          await popsauceAnswers.fetchRemoteAnswers();
          setStats(popsauceAnswers.getStats());
        }}
        style={{ backgroundColor: accentColor.primary }}
      >
        Sync Remote
      </button>
    </div>
  );
};

export default AnswerDisplay;
