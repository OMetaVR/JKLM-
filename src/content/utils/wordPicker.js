import { sortWordsByFrequency, getWordFrequency } from '../data/wordFrequency';
import debugLogger from './debugLogger';

const DEFAULT_WORDLIST_URL = 'https://raw.githubusercontent.com/OMetaVR/Bomb-party-word-list/refs/heads/main/wordlist.txt';

class WordPicker {
  constructor() {
    this.allWords = [];
    this.wordlistUrl = '';
    this.loading = false;
    this.loaded = false;
    this.blacklist = new Set();
    this.alphabetState = {};
    this.alphabetEnabled = false;
    this._syllableCache = new Map();
    this._cacheMaxSize = 100;
    this._setupListeners();
  }

  _clearCache() {
    this._syllableCache.clear();
  }

  _getCacheKey(syllable, minLength, maxLength) {
    return `${syllable}-${minLength}-${maxLength}`;
  }

  _getCachedWords(syllable, minLength, maxLength) {
    const key = this._getCacheKey(syllable, minLength, maxLength);
    return this._syllableCache.get(key);
  }

  _setCachedWords(syllable, minLength, maxLength, words) {
    if (this._syllableCache.size >= this._cacheMaxSize) {
      const firstKey = this._syllableCache.keys().next().value;
      this._syllableCache.delete(firstKey);
    }
    const key = this._getCacheKey(syllable, minLength, maxLength);
    this._syllableCache.set(key, words);
  }

  _setupListeners() {
    document.addEventListener('jklm-mini-blacklist-word', (e) => {
      if (e.detail?.word) {
        this.blacklist.add(e.detail.word.toLowerCase());
        this._clearCache();
      }
    });

    document.addEventListener('jklm-mini-clear-blacklist', () => {
      this.blacklist = new Set();
      this._clearCache();
    });

    document.addEventListener('jklm-mini-alphabet-state-change', (e) => {
      if (e.detail) {
        this.alphabetState = e.detail.remaining || {};
        this.alphabetEnabled = e.detail.enabled !== false;
        this._clearCache();
      }
    });

    const loadAlphabetState = () => {
      try {
        const saved = localStorage.getItem('jklm-mini-bombparty-features');
        if (saved) {
          const features = JSON.parse(saved);
          const alphabetFeature = features.find(f => f.id === 'alphabet');
          this.alphabetEnabled = alphabetFeature?.enabled || false;
        }

        const remaining = localStorage.getItem('jklm-mini-alphabet-remaining');
        if (remaining) {
          this.alphabetState = JSON.parse(remaining);
        } else {
          const requirements = localStorage.getItem('jklm-mini-alphabet-requirements');
          if (requirements) {
            this.alphabetState = JSON.parse(requirements);
          }
        }
      } catch (e) {}
    };

    loadAlphabetState();
    window.addEventListener('jklm-mini-settings-change', loadAlphabetState);
  }

  async loadWordlist(url) {
    const targetUrl = url || localStorage.getItem('jklm-mini-wordlist-url') || DEFAULT_WORDLIST_URL;
    
    if (this.loaded && this.wordlistUrl === targetUrl) return this.allWords;
    if (this.loading) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!this.loading) { clearInterval(check); resolve(); }
        }, 50);
      });
      return this.allWords;
    }

    this.loading = true;
    try {
      const res = await fetch(targetUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      this.allWords = text.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean);
      this.wordlistUrl = targetUrl;
      this.loaded = true;
    } catch (e) {
      debugLogger.error('storage', 'Failed to load wordlist:', e);
    } finally {
      this.loading = false;
    }
    return this.allWords;
  }

  getNeededLetters() {
    if (!this.alphabetEnabled) return [];
    const needed = [];
    for (const [letter, count] of Object.entries(this.alphabetState)) {
      if (count > 0) needed.push(letter.toLowerCase());
    }
    return needed;
  }

  scoreWordByAlphabet(word) {
    if (!this.alphabetEnabled) return 0;
    const needed = this.getNeededLetters();
    if (!needed.length) return 0;
    
    const wordLower = word.toLowerCase();
    const uniqueLetters = new Set(wordLower.split(''));
    let score = 0;
    for (const letter of uniqueLetters) {
      if (needed.includes(letter)) score++;
    }
    return score;
  }

  pickWords(options = {}) {
    const {
      syllable = '',
      minLength = 3,
      maxLength = 30,
      count = 10,
      excludeBlacklist = true,
      prioritizeAlphabet = true,
      lengthPreference = 'none',
    } = options;

    if (!this.allWords.length || !syllable) return [];

    const syllableLower = syllable.toLowerCase();
    const min = Math.max(3, minLength);
    const max = Math.max(min, maxLength);

    let candidates = this._getCachedWords(syllableLower, min, max);
    
    if (!candidates) {
      candidates = [];
      for (let i = 0; i < this.allWords.length; i++) {
        const w = this.allWords[i];
        if (w.length >= min && w.length <= max && w.includes(syllableLower)) {
          candidates.push(w);
        }
      }
      
      const neededLetters = this.alphabetEnabled ? this.getNeededLetters() : [];
      if (prioritizeAlphabet && neededLetters.length > 0) {
        const scored = candidates.map(w => {
          const uniqueLetters = new Set(w);
          let alphaScore = 0;
          for (const letter of uniqueLetters) {
            if (neededLetters.includes(letter)) alphaScore++;
          }
          return { word: w, alphaScore, freq: getWordFrequency(w), rand: Math.random() };
        });
        scored.sort((a, b) => {
          if (b.alphaScore !== a.alphaScore) return b.alphaScore - a.alphaScore;
          if (b.freq !== a.freq) return b.freq - a.freq;
          return a.rand - b.rand;
        });
        candidates = scored.map(s => s.word);
      } else {
        candidates = sortWordsByFrequency(candidates);
      }
      
      this._setCachedWords(syllableLower, min, max, candidates);
    }

    if (excludeBlacklist && this.blacklist.size > 0) {
      candidates = candidates.filter(w => !this.blacklist.has(w));
    }

    if (lengthPreference === 'shortest') {
      candidates = [...candidates].sort((a, b) => a.length - b.length);
    } else if (lengthPreference === 'longest') {
      candidates = [...candidates].sort((a, b) => b.length - a.length);
    }

    return candidates.slice(0, count);
  }

  pickBest(options = {}) {
    const words = this.pickWords({ ...options, count: 1 });
    return words[0] || null;
  }

  pickByCategory(options = {}) {
    const { syllable = '', excludeBlacklist = true, prioritizeAlphabet = true } = options;
    
    return {
      short: this.pickWords({ syllable, minLength: 3, maxLength: 5, count: 10, excludeBlacklist, prioritizeAlphabet }),
      medium: this.pickWords({ syllable, minLength: 6, maxLength: 9, count: 10, excludeBlacklist, prioritizeAlphabet }),
      long: this.pickWords({ syllable, minLength: 10, maxLength: 30, count: 10, excludeBlacklist, prioritizeAlphabet }),
    };
  }

  addToBlacklist(word) {
    if (word) {
      this.blacklist.add(word.toLowerCase());
    }
  }

  clearBlacklist() {
    this.blacklist = new Set();
    this._clearCache();
  }

  updateAlphabetState(remaining, enabled = true) {
    this.alphabetState = remaining || {};
    this.alphabetEnabled = enabled;
    this._clearCache();
  }
}

export const globalWordPicker = new WordPicker();
export default WordPicker;
