let currentGameType = null;
const listeners = new Set();

function setGameType(type) {
  if (currentGameType !== type) {
    currentGameType = type;
    listeners.forEach(cb => cb(type));
    document.dispatchEvent(new CustomEvent('jklm-mini-game-type-change', { detail: { gameType: type } }));
  }
}

function getGameType() {
  return currentGameType;
}

function onGameTypeChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function isBombParty() {
  return currentGameType === 'bombparty';
}

function isPopsauce() {
  return currentGameType === 'popsauce';
}

document.addEventListener('jklm-mini-socket-event', (event) => {
  if (event.detail?.eventType === 'socket-hooked') {
    const game = event.detail?.data?.game;
    if (game) setGameType(game);
  }
});

document.addEventListener('jklm-mini-popsauce-challenge', () => {
  if (currentGameType !== 'popsauce') setGameType('popsauce');
});

document.addEventListener('jklm-mini-syllable-detected', () => {
  if (currentGameType !== 'bombparty') setGameType('bombparty');
});

document.addEventListener('jklm-mini-game-syllable', () => {
  if (currentGameType !== 'bombparty') setGameType('bombparty');
});

export default { getGameType, setGameType, onGameTypeChange, isBombParty, isPopsauce };
