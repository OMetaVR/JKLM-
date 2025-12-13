import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { globalWordPicker } from '../utils/wordPicker';
import debugLogger from '../utils/debugLogger';
import '../styles/wordTracker.css';

const WordTracker = () => {
  const { accentColor } = useTheme();
  const [trackedWords, setTrackedWords] = useState([]);
  const trackedWordsRef = useRef(trackedWords);
  const [trackMyWords, setTrackMyWords] = useState(() => {
    const saved = localStorage.getItem('jklm-mini-track-my-words');
    return saved !== null ? saved === 'true' : true;
  });
  const [trackEnemyWords, setTrackEnemyWords] = useState(() => {
    const saved = localStorage.getItem('jklm-mini-track-enemy-words');
    return saved !== null ? saved === 'true' : false;
  });

  useEffect(() => {
    localStorage.setItem('jklm-mini-track-my-words', trackMyWords.toString());
  }, [trackMyWords]);

  useEffect(() => {
    localStorage.setItem('jklm-mini-track-enemy-words', trackEnemyWords.toString());
  }, [trackEnemyWords]);

  useEffect(() => {
    trackedWordsRef.current = trackedWords;
  }, [trackedWords]);

  const wasMyTurnRef = useRef(false);
  
  useEffect(() => {
    const handleTurnChange = (event) => {
      wasMyTurnRef.current = event.detail?.isMyTurn || false;
    };
    
    document.addEventListener('jklm-mini-turn-state-change', handleTurnChange);
    return () => document.removeEventListener('jklm-mini-turn-state-change', handleTurnChange);
  }, []);

  useEffect(() => {
    const handleWordAccepted = (event) => {
      const word = event.detail?.word;
      if (!word) return;
      
      const wordLower = word.toLowerCase();
      const isSelf = wasMyTurnRef.current;
      
      if (!trackMyWords && isSelf) return;
      if (!trackEnemyWords && !isSelf) return;
      
      if (trackedWords.some(w => w.word.toLowerCase() === wordLower)) return;
      
      const newEntry = {
        word: wordLower,
        timestamp: Date.now(),
        source: isSelf ? 'self' : 'enemy'
      };
      
      setTrackedWords(prev => [...prev, newEntry]);
      globalWordPicker.addToBlacklist(wordLower);
    };

    document.addEventListener('jklm-mini-word-accepted', handleWordAccepted);

    return () => {
      document.removeEventListener('jklm-mini-word-accepted', handleWordAccepted);
    };
  }, [trackMyWords, trackEnemyWords, trackedWords]);

  useEffect(() => {
    const handleClearBlacklist = () => {
      setTrackedWords([]);
      globalWordPicker.clearBlacklist();
    };

    const handleGameEnded = () => {
      const currentWords = trackedWordsRef.current;
      const webhookEnabled = localStorage.getItem('jklm-mini-webhook-enabled') === 'true';
      const logGameResults = localStorage.getItem('jklm-mini-log-game-results') !== 'false';
      const webhookUrl = localStorage.getItem('jklm-mini-webhook-url');
      
      debugLogger.debug('word-tracker', 'Game ended, words:', currentWords.length, 'webhook:', webhookEnabled, 'url:', !!webhookUrl);
      
      if (webhookEnabled && logGameResults && webhookUrl && currentWords.length > 0) {
        const pingEveryone = localStorage.getItem('jklm-mini-webhook-ping-everyone') === 'true';
        const selfWords = currentWords.filter(w => w.source === 'self');
        const enemyWords = currentWords.filter(w => w.source === 'enemy');
        
        const embed = {
          title: '🎮 Game Results',
          color: 0x5865F2,
          fields: [
            {
              name: '📊 Statistics',
              value: `**Total Words:** ${currentWords.length}\n**Your Words:** ${selfWords.length}\n**Enemy Words:** ${enemyWords.length}`,
              inline: false
            }
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: 'JKLM+ Game Tracker'
          }
        };
        
        if (selfWords.length > 0) {
          const wordList = selfWords.slice(-15).map(w => w.word).join(', ');
          embed.fields.push({
            name: '✅ Your Words',
            value: wordList + (selfWords.length > 15 ? `\n... and ${selfWords.length - 15} more` : ''),
            inline: false
          });
        }
        
        const payload = {
          content: pingEveryone ? '@everyone' : null,
          embeds: [embed]
        };
        
        debugLogger.debug('word-tracker', 'Sending webhook:', payload);
        
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(res => debugLogger.debug('word-tracker', 'Webhook response:', res.status))
          .catch(err => debugLogger.error('word-tracker', 'Webhook error:', err));
      }
      
      setTrackedWords([]);
      globalWordPicker.clearBlacklist();
    };

    document.addEventListener('jklm-mini-clear-blacklist', handleClearBlacklist);
    document.addEventListener('jklm-mini-game-ended', handleGameEnded);

    return () => {
      document.removeEventListener('jklm-mini-clear-blacklist', handleClearBlacklist);
      document.removeEventListener('jklm-mini-game-ended', handleGameEnded);
    };
  }, []);

  return (
    <div className="word-tracker">
      <div className="word-tracker-toggles">
        <div className="setting-item">
          <label>Track my words</label>
          <div 
            className={`toggle-switch ${trackMyWords ? 'active' : ''}`}
            onClick={() => setTrackMyWords(!trackMyWords)}
            style={{ 
              backgroundColor: trackMyWords ? accentColor.primary : 'rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="toggle-switch-handle"></div>
          </div>
        </div>

        <div className="setting-item">
          <label>Track enemy words</label>
          <div 
            className={`toggle-switch ${trackEnemyWords ? 'active' : ''}`}
            onClick={() => setTrackEnemyWords(!trackEnemyWords)}
            style={{ 
              backgroundColor: trackEnemyWords ? accentColor.primary : 'rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="toggle-switch-handle"></div>
          </div>
        </div>
      </div>

      {trackMyWords && (
        <div className="word-tracker-content">
          <div className="tracked-words-header">
            <span>Used this game: {trackedWords.length}</span>
          </div>
          
          {trackedWords.length > 0 && (
            <div className="tracked-words-list">
              {trackedWords.slice(-8).map((entry, index) => (
                <div key={`${entry.timestamp}-${index}`} className="tracked-word-item">
                  <span className="word">{entry.word}</span>
                </div>
              ))}
              {trackedWords.length > 8 && (
                <div className="tracked-words-overflow">
                  +{trackedWords.length - 8} more
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WordTracker;
