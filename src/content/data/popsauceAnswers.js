import debugLogger from '../utils/debugLogger';

const REMOTE_URL = 'https://cdn.jsdelivr.net/gh/joseph-gerald/jklm-py-client@main/answers/popsauce_pairs.txt';
const STORAGE_KEY = 'jklm-mini-popsauce-answers';
const ALIASES_KEY = 'jklm-mini-popsauce-aliases';
const LAST_FETCH_KEY = 'jklm-mini-popsauce-last-fetch';
const FETCH_INTERVAL = 24 * 60 * 60 * 1000;

let answersCache = {};
let aliasesCache = {};
let isInitialized = false;

async function sha1(data) {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-1', buffer);
  return Array.from(new Uint8Array(hash))
    .map(v => v.toString(16).padStart(2, '0'))
    .join('');
}

async function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      answersCache = JSON.parse(stored);
    }
    const aliases = localStorage.getItem(ALIASES_KEY);
    if (aliases) {
      aliasesCache = JSON.parse(aliases);
    }
    return true;
  } catch (e) {
    debugLogger.error('popsauce-answers', 'Error loading from storage:', e);
  }
  return false;
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answersCache));
  } catch (e) {
    debugLogger.error('popsauce-answers', 'Error saving to storage:', e);
  }
}

function saveAliasesToStorage() {
  try {
    localStorage.setItem(ALIASES_KEY, JSON.stringify(aliasesCache));
  } catch (e) {
    debugLogger.error('popsauce-answers', 'Error saving aliases to storage:', e);
  }
}

async function fetchRemoteAnswers() {
  try {
    const res = await fetch(REMOTE_URL);
    if (!res.ok) return false;
    const text = await res.text();
    let count = 0;
    text.split('\n').forEach(line => {
      if (!line.trim()) return;
      const split = line.split(':');
      const hash = split.shift();
      const answer = split.join(':');
      if (hash && answer && !answersCache[hash]) {
        answersCache[hash] = answer;
        count++;
      }
    });
    if (count > 0) {
      saveToStorage();
      debugLogger.info('popsauce-answers', `Loaded ${count} new answers from remote`);
    }
    localStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
    return true;
  } catch (e) {
    debugLogger.error('popsauce-answers', 'Error fetching remote answers:', e);
    return false;
  }
}

async function initialize() {
  if (isInitialized) return;
  await loadFromStorage();
  const lastFetch = parseInt(localStorage.getItem(LAST_FETCH_KEY) || '0');
  if (Date.now() - lastFetch > FETCH_INTERVAL) {
    await fetchRemoteAnswers();
  }
  isInitialized = true;
  debugLogger.info('popsauce-answers', `Initialized with ${Object.keys(answersCache).length} entries, ${Object.keys(aliasesCache).length} with aliases`);
}

function getAnswer(hash, preferShortest = false) {
  const primary = answersCache[hash];
  if (!primary) return null;
  
  if (preferShortest && aliasesCache[hash]) {
    const allOptions = [primary, ...aliasesCache[hash]];
    return allOptions.reduce((shortest, current) => 
      current.length < shortest.length ? current : shortest
    );
  }
  
  return primary;
}

function getAllAnswers(hash) {
  const primary = answersCache[hash];
  if (!primary) return [];
  const aliases = aliasesCache[hash] || [];
  return [primary, ...aliases];
}

function addAnswer(hash, answer) {
  if (!hash || !answer) return false;
  if (answersCache[hash]) return false;
  answersCache[hash] = answer;
  saveToStorage();
  debugLogger.info('popsauce-answers', `Learned new answer: ${answer}`);
  return true;
}

function addAlias(hash, alias) {
  if (!hash || !alias) return false;
  const primary = answersCache[hash];
  if (!primary) return false;
  
  const normalizedAlias = alias.toLowerCase().trim();
  const normalizedPrimary = primary.toLowerCase().trim();
  
  if (normalizedAlias === normalizedPrimary) return false;
  
  if (!aliasesCache[hash]) {
    aliasesCache[hash] = [];
  }
  
  const existingNormalized = aliasesCache[hash].map(a => a.toLowerCase().trim());
  if (existingNormalized.includes(normalizedAlias)) return false;
  
  aliasesCache[hash].push(alias);
  saveAliasesToStorage();
  debugLogger.info('popsauce-answers', `Learned alias for "${primary}": "${alias}"`);
  return true;
}

function getStats() {
  const totalAliases = Object.values(aliasesCache).reduce((sum, arr) => sum + arr.length, 0);
  return {
    totalAnswers: Object.keys(answersCache).length,
    totalAliases: totalAliases,
    lastFetch: parseInt(localStorage.getItem(LAST_FETCH_KEY) || '0')
  };
}

export default {
  initialize,
  getAnswer,
  getAllAnswers,
  addAnswer,
  addAlias,
  getStats,
  fetchRemoteAnswers
};
