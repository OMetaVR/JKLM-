import debugLogger from '../utils/debugLogger';

const STORAGE_KEY = 'jklm-mini-learned-words';
const FAILED_WORDS_KEY = 'jklm-mini-failed-words';

let learnedWordsCache = {};
let failedWordsCache = {};
let currentDictionaryId = null;
let isInitialized = false;

const normalizeWord = (word) => {
  return word.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
};

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      learnedWordsCache = JSON.parse(stored);
    }
    const failed = localStorage.getItem(FAILED_WORDS_KEY);
    if (failed) {
      failedWordsCache = JSON.parse(failed);
    }
    return true;
  } catch (e) {
    debugLogger.error('learned-words', 'Error loading from storage:', e);
  }
  return false;
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(learnedWordsCache));
  } catch (e) {
    debugLogger.error('learned-words', 'Error saving to storage:', e);
  }
}

function saveFailedToStorage() {
  try {
    localStorage.setItem(FAILED_WORDS_KEY, JSON.stringify(failedWordsCache));
  } catch (e) {
    debugLogger.error('learned-words', 'Error saving failed words to storage:', e);
  }
}

function initialize() {
  if (isInitialized) return;
  loadFromStorage();
  isInitialized = true;
  debugLogger.info('learned-words', `Initialized with ${getTotalCount()} learned words across ${Object.keys(learnedWordsCache).length} dictionaries`);
}

function setDictionary(dictionaryId) {
  if (dictionaryId && dictionaryId !== currentDictionaryId) {
    currentDictionaryId = dictionaryId;
    if (!learnedWordsCache[dictionaryId]) {
      learnedWordsCache[dictionaryId] = [];
    }
    if (!failedWordsCache[dictionaryId]) {
      failedWordsCache[dictionaryId] = {};
    }
    debugLogger.info('learned-words', `Dictionary set to: ${dictionaryId}, ${learnedWordsCache[dictionaryId].length} words known`);
  }
}

function getDictionary() {
  return currentDictionaryId;
}

function addWord(word, dictionaryId = null) {
  const dict = dictionaryId || currentDictionaryId;
  if (!dict || !word) return false;
  
  const normalizedWord = normalizeWord(word);
  if (!normalizedWord || normalizedWord.length < 3) return false;
  
  if (!learnedWordsCache[dict]) {
    learnedWordsCache[dict] = [];
  }
  
  if (learnedWordsCache[dict].includes(normalizedWord)) return false;
  
  if (failedWordsCache[dict]?.[normalizedWord] >= 3) {
    return false;
  }
  
  learnedWordsCache[dict].push(normalizedWord);
  saveToStorage();
  debugLogger.debug('learned-words', `Learned new word for ${dict}: ${normalizedWord}`);
  return true;
}

function markFailed(word, dictionaryId = null) {
  const dict = dictionaryId || currentDictionaryId;
  if (!dict || !word) return;
  
  const normalizedWord = normalizeWord(word);
  
  if (!failedWordsCache[dict]) {
    failedWordsCache[dict] = {};
  }
  
  failedWordsCache[dict][normalizedWord] = (failedWordsCache[dict][normalizedWord] || 0) + 1;
  
  if (failedWordsCache[dict][normalizedWord] >= 3) {
    const idx = learnedWordsCache[dict]?.indexOf(normalizedWord);
    if (idx > -1) {
      learnedWordsCache[dict].splice(idx, 1);
      saveToStorage();
      debugLogger.info('learned-words', `Removed consistently failing word: ${normalizedWord}`);
    }
  }
  
  saveFailedToStorage();
}

function getWords(dictionaryId = null) {
  const dict = dictionaryId || currentDictionaryId;
  if (!dict) return [];
  return learnedWordsCache[dict] || [];
}

function getAllDictionaries() {
  return Object.keys(learnedWordsCache);
}

function getTotalCount() {
  return Object.values(learnedWordsCache).reduce((sum, arr) => sum + arr.length, 0);
}

function getStats() {
  const dictionaries = getAllDictionaries();
  const stats = {
    totalWords: getTotalCount(),
    dictionaries: {}
  };
  dictionaries.forEach(dict => {
    stats.dictionaries[dict] = learnedWordsCache[dict]?.length || 0;
  });
  return stats;
}

function exportAll() {
  return {
    learnedWords: learnedWordsCache,
    failedWords: failedWordsCache
  };
}

function importData(data) {
  if (data.learnedWords) {
    Object.keys(data.learnedWords).forEach(dict => {
      if (!learnedWordsCache[dict]) {
        learnedWordsCache[dict] = [];
      }
      data.learnedWords[dict].forEach(word => {
        if (!learnedWordsCache[dict].includes(word)) {
          learnedWordsCache[dict].push(word);
        }
      });
    });
    saveToStorage();
  }
  if (data.failedWords) {
    Object.keys(data.failedWords).forEach(dict => {
      if (!failedWordsCache[dict]) {
        failedWordsCache[dict] = {};
      }
      Object.assign(failedWordsCache[dict], data.failedWords[dict]);
    });
    saveFailedToStorage();
  }
}

export default {
  initialize,
  setDictionary,
  getDictionary,
  addWord,
  markFailed,
  getWords,
  getAllDictionaries,
  getStats,
  exportAll,
  importData
};
