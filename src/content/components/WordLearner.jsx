import { useEffect, useRef } from 'react';
import learnedWords from '../data/learnedWords';
import { globalWordPicker } from '../utils/wordPicker';
import gameTypeDetector from '../utils/gameTypeDetector';

const normalizeWord = (word) => {
  return word.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
};

const WordLearner = () => {
  const currentDictRef = useRef(null);
  const knownWordsRef = useRef(new Set());

  useEffect(() => {
    learnedWords.initialize();
  }, []);

  useEffect(() => {
    const handleRulesChange = (e) => {
      const dictionaryId = e.detail?.dictionaryId;
      if (dictionaryId) {
        currentDictRef.current = dictionaryId;
        learnedWords.setDictionary(dictionaryId);
        
        globalWordPicker.loadWordlist().then(words => {
          knownWordsRef.current = new Set(words.map(w => normalizeWord(w)));
        });
      }
    };

    document.addEventListener('jklm-mini-rules-change', handleRulesChange);
    return () => {
      document.removeEventListener('jklm-mini-rules-change', handleRulesChange);
    };
  }, []);

  useEffect(() => {
    const handleWordAccepted = (e) => {
      if (!gameTypeDetector.isBombParty()) return;
      if (!currentDictRef.current) return;
      
      const word = normalizeWord(e.detail?.word || '');
      if (!word || word.length < 3) return;
      
      if (!knownWordsRef.current.has(word)) {
        learnedWords.addWord(word);
      }
    };

    const handleWordFailed = (e) => {
      if (!gameTypeDetector.isBombParty()) return;
      if (!currentDictRef.current) return;
      
      const word = normalizeWord(e.detail?.word || '');
      if (!word) return;
      
      learnedWords.markFailed(word);
    };

    document.addEventListener('jklm-mini-word-accepted', handleWordAccepted);
    document.addEventListener('jklm-mini-word-failed', handleWordFailed);
    
    return () => {
      document.removeEventListener('jklm-mini-word-accepted', handleWordAccepted);
      document.removeEventListener('jklm-mini-word-failed', handleWordFailed);
    };
  }, []);

  return null;
};

export default WordLearner;
