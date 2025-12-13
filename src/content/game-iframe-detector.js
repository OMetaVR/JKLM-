(function() {
    const isIframe = window !== window.top;
    let lastSyllable = null;
    let lastTurnState = false;
    let interceptedWord = null;
    let pendingWord = null;
    let lastPopsauceChallengeHash = null;
    let popsauceAnswerRevealed = false;
    let popsauceInterceptedAnswer = null;
    
    function findSyllable() {
        try {
            const syllableElements = document.getElementsByClassName('syllable');
            
            if (syllableElements.length > 0 && syllableElements[0].innerText) {
                const syllable = syllableElements[0].innerText.trim();
                if (syllable && syllable !== lastSyllable) {
                    lastSyllable = syllable;
                    sendSyllable(syllable);
                }
                return syllable;
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }
    
    function checkTurnState() {
        try {
            const selfTurnEl = document.querySelector('.selfTurn');
            const syllableEl = document.querySelector('.syllable');
            if (selfTurnEl && syllableEl && syllableEl.innerText && syllableEl.innerText.trim()) {
                const isMyTurn = !selfTurnEl.hasAttribute('hidden');
                if (isMyTurn !== lastTurnState) {
                    lastTurnState = isMyTurn;
                    sendTurnState(isMyTurn);
                }
            }
        } catch (error) {}
    }
    
    function sendSyllable(syllable) {
        if (isIframe) {
            try {
                window.top.postMessage({
                    source: 'jklm-plus-iframe',
                    action: 'syllable-detected',
                    syllable: syllable
                }, '*');
            } catch (error) {}
        } else {
            document.dispatchEvent(new CustomEvent('jklm-mini-game-syllable', {
                detail: { syllable: syllable, source: 'main-frame' }
            }));
            document.dispatchEvent(new CustomEvent('jklm-mini-syllable-detected', {
                detail: { syllable: syllable, source: 'main-frame' }
            }));
        }
    }
    
    function sendTurnState(isMyTurn) {
        if (isIframe) {
            try {
                window.top.postMessage({
                    source: 'jklm-plus-iframe',
                    action: 'turn-state-change',
                    isMyTurn: isMyTurn
                }, '*');
            } catch (error) {}
        } else {
            document.dispatchEvent(new CustomEvent('jklm-mini-turn-state-change', {
                detail: { isMyTurn: isMyTurn, source: 'main-frame' }
            }));
        }
    }
    
    function sendWordSubmitted(word, syllable) {
        if (isIframe) {
            try {
                window.top.postMessage({
                    source: 'jklm-plus-iframe',
                    action: 'word-submitted',
                    word: word,
                    syllable: syllable || lastSyllable
                }, '*');
            } catch (error) {}
        } else {
            document.dispatchEvent(new CustomEvent('jklm-mini-word-submitted', {
                detail: { word: word, syllable: syllable || lastSyllable, source: 'main-frame' }
            }));
        }
    }
    
    function setupSocketHook() {
        const scriptContent = `
(function() {
    var lastWord = {};
    var currentTurnPeerId = null;
    var bombpartyHooked = false;
    var popsauceHooked = false;
    
    function tryHookPopsauce() {
        if (typeof socket === 'undefined' || !socket._callbacks) return false;
        
        var hooked = false;
        
        if (socket._callbacks['\\$endChallenge'] && socket._callbacks['\\$endChallenge'][0] && !socket._callbacks['\\$endChallenge'][0]._jklmEndChallengeHooked) {
            var origEndChallenge = socket._callbacks['\\$endChallenge'][0];
            socket._callbacks['\\$endChallenge'][0] = function(challengeResult) {
                window.postMessage({ 
                    source: 'jklm-plus-page', 
                    eventType: 'popsauce-end-challenge', 
                    data: challengeResult
                }, '*');
                return origEndChallenge.apply(this, arguments);
            };
            socket._callbacks['\\$endChallenge'][0]._jklmEndChallengeHooked = true;
            hooked = true;
        }
        
        if (socket._callbacks['\\$setPlayerState'] && socket._callbacks['\\$setPlayerState'][0] && !socket._callbacks['\\$setPlayerState'][0]._jklmPlayerStateHooked) {
            var origSetPlayerState = socket._callbacks['\\$setPlayerState'][0];
            socket._callbacks['\\$setPlayerState'][0] = function(playerPeerId, playerState) {
                if (playerState && playerState.hasFoundSource !== undefined) {
                    window.postMessage({ 
                        source: 'jklm-plus-page', 
                        eventType: 'popsauce-player-state', 
                        data: { peerId: playerPeerId, state: playerState }
                    }, '*');
                }
                return origSetPlayerState.apply(this, arguments);
            };
            socket._callbacks['\\$setPlayerState'][0]._jklmPlayerStateHooked = true;
            hooked = true;
        }
        
        if (socket._callbacks['\\$startChallenge'] && socket._callbacks['\\$startChallenge'][0] && !socket._callbacks['\\$startChallenge'][0]._jklmStartChallengeHooked) {
            var origStartChallenge = socket._callbacks['\\$startChallenge'][0];
            socket._callbacks['\\$startChallenge'][0] = function(challenge, serverNow) {
                window.postMessage({ 
                    source: 'jklm-plus-page', 
                    eventType: 'popsauce-start-challenge', 
                    data: challenge
                }, '*');
                return origStartChallenge.apply(this, arguments);
            };
            socket._callbacks['\\$startChallenge'][0]._jklmStartChallengeHooked = true;
            hooked = true;
        }
        
        return hooked;
    }
    
    function tryHook() {
        if (typeof socket === 'undefined' || !socket._callbacks) return false;
        if (!socket._callbacks['\\$setPlayerWord'] || !socket._callbacks['\\$setPlayerWord'][0]) return false;
        if (socket._callbacks['\\$setPlayerWord'][0]._jklmSetWordHooked) return true;
        
        var origSetWord = socket._callbacks['\\$setPlayerWord'][0];
        socket._callbacks['\\$setPlayerWord'][0] = function(peerId, word) {
            if (word && word.length > 0) {
                lastWord[peerId] = word;
            }
            return origSetWord.apply(this, arguments);
        };
        socket._callbacks['\\$setPlayerWord'][0]._jklmSetWordHooked = true;
        
        if (socket._callbacks['\\$correctWord'] && socket._callbacks['\\$correctWord'][0] && !socket._callbacks['\\$correctWord'][0]._jklmCorrectHooked) {
            var origCorrect = socket._callbacks['\\$correctWord'][0];
            socket._callbacks['\\$correctWord'][0] = function(data) {
                var peerId = (data && typeof data === 'object') ? data.playerPeerId : (data || currentTurnPeerId);
                var word = lastWord[peerId] || null;
                if (peerId !== null && word) {
                    var playerInfo = null;
                    var isSelf = typeof selfPeerId !== 'undefined' && peerId === selfPeerId;
                    if (typeof players !== 'undefined') {
                        var player = players.find(function(p) { return p.profile && p.profile.peerId === peerId; });
                        if (player && player.profile) {
                            playerInfo = {
                                nickname: player.profile.nickname || null,
                                picture: player.profile.picture || null
                            };
                        }
                    }
                    window.postMessage({ source: 'jklm-plus-page', eventType: 'player-word-submitted', data: { peerId: peerId, word: word, player: playerInfo, isSelf: isSelf } }, '*');
                    lastWord[peerId] = null;
                }
                return origCorrect.apply(this, arguments);
            };
            socket._callbacks['\\$correctWord'][0]._jklmCorrectHooked = true;
        }
        
        if (socket._callbacks['\\$nextTurn'] && socket._callbacks['\\$nextTurn'][0] && !socket._callbacks['\\$nextTurn'][0]._jklmNextTurnHooked) {
            var origNextTurn = socket._callbacks['\\$nextTurn'][0];
            socket._callbacks['\\$nextTurn'][0] = function(peerId, syllable) {
                currentTurnPeerId = peerId;
                return origNextTurn.apply(this, arguments);
            };
            socket._callbacks['\\$nextTurn'][0]._jklmNextTurnHooked = true;
        }
        
        if (socket._callbacks['\\$setMilestone'] && socket._callbacks['\\$setMilestone'][0] && !socket._callbacks['\\$setMilestone'][0]._jklmMilestoneHooked) {
            var origSetMilestone = socket._callbacks['\\$setMilestone'][0];
            socket._callbacks['\\$setMilestone'][0] = function(newMilestone, serverNow) {
                window.postMessage({ 
                    source: 'jklm-plus-page', 
                    eventType: 'milestone-change', 
                    data: { milestone: newMilestone }
                }, '*');
                return origSetMilestone.apply(this, arguments);
            };
            socket._callbacks['\\$setMilestone'][0]._jklmMilestoneHooked = true;
        }
        
        if (socket._callbacks['\\$failWord'] && socket._callbacks['\\$failWord'][0] && !socket._callbacks['\\$failWord'][0]._jklmFailHooked) {
            var origFailWord = socket._callbacks['\\$failWord'][0];
            socket._callbacks['\\$failWord'][0] = function(playerPeerId, reason) {
                window.postMessage({ 
                    source: 'jklm-plus-page', 
                    eventType: 'word-failed', 
                    data: { peerId: playerPeerId, reason: reason, word: lastWord[playerPeerId] || null }
                }, '*');
                return origFailWord.apply(this, arguments);
            };
            socket._callbacks['\\$failWord'][0]._jklmFailHooked = true;
        }
        
        if (socket._callbacks['\\$setRules'] && socket._callbacks['\\$setRules'][0] && !socket._callbacks['\\$setRules'][0]._jklmRulesHooked) {
            var origSetRules = socket._callbacks['\\$setRules'][0];
            socket._callbacks['\\$setRules'][0] = function(data) {
                var result = origSetRules.apply(this, arguments);
                setTimeout(function() {
                    if (typeof rules !== 'undefined') {
                        window.postMessage({ 
                            source: 'jklm-plus-page', 
                            eventType: 'rules-updated', 
                            data: {
                                startingLives: rules.startingLives ? rules.startingLives.value : null,
                                maxLives: rules.maxLives ? rules.maxLives.value : null,
                                bonusAlphabet: rules.customBonusAlphabet ? rules.customBonusAlphabet.value : null,
                                dictionaryId: rules.dictionaryId ? rules.dictionaryId.value : null,
                                promptDifficulty: rules.promptDifficulty ? rules.promptDifficulty.value : null,
                                minTurnDuration: rules.minTurnDuration ? rules.minTurnDuration.value : null
                            }
                        }, '*');
                    }
                }, 10);
                return result;
            };
            socket._callbacks['\\$setRules'][0]._jklmRulesHooked = true;
        }
        
        if (typeof rules !== 'undefined') {
            window.postMessage({ 
                source: 'jklm-plus-page', 
                eventType: 'rules-initial', 
                data: {
                    startingLives: rules.startingLives ? rules.startingLives.value : null,
                    maxLives: rules.maxLives ? rules.maxLives.value : null,
                    bonusAlphabet: rules.customBonusAlphabet ? rules.customBonusAlphabet.value : null,
                    dictionaryId: rules.dictionaryId ? rules.dictionaryId.value : null,
                    promptDifficulty: rules.promptDifficulty ? rules.promptDifficulty.value : null,
                    minTurnDuration: rules.minTurnDuration ? rules.minTurnDuration.value : null
                }
            }, '*');
        }
        
        window.postMessage({ source: 'jklm-plus-page', eventType: 'socket-hooked', data: { game: 'bombparty' } }, '*');
        return true;
    }
    var interval = setInterval(function() {
        if (!popsauceHooked) {
            popsauceHooked = tryHookPopsauce();
            if (popsauceHooked) {
                window.postMessage({ source: 'jklm-plus-page', eventType: 'socket-hooked', data: { game: 'popsauce' } }, '*');
            }
        }
        if (!bombpartyHooked) {
            bombpartyHooked = tryHook();
        }
        if (bombpartyHooked && popsauceHooked) {
            clearInterval(interval);
        }
    }, 300);
})();
`;
        const script = document.createElement('script');
        script.textContent = scriptContent;
        document.documentElement.appendChild(script);
        script.remove();
    }
    
    async function sha1ForPopsauce(data) {
        const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        const hash = await crypto.subtle.digest('SHA-1', buffer);
        return Array.from(new Uint8Array(hash))
            .map(v => v.toString(16).padStart(2, '0'))
            .join('');
    }
    
    async function getPopsauceChallengeData() {
        try {
            const prompt = document.querySelector('.prompt')?.innerText;
            const textEl = document.querySelector('.text');
            const imageEl = document.querySelector('.actual');
            const challenge = document.querySelector('.challenge');
            
            if (!prompt || !challenge) return null;
            
            const isTextChallenge = textEl && textEl.checkVisibility && textEl.checkVisibility();
            const isImageChallenge = imageEl && imageEl.checkVisibility && imageEl.checkVisibility();
            
            if (!isTextChallenge && !isImageChallenge) return null;
            
            const promptBytes = new TextEncoder().encode(prompt);
            let combinedBytes;
            let contentType;
            
            if (isTextChallenge) {
                const text = textEl.innerText || '';
                const textBytes = new TextEncoder().encode(text);
                combinedBytes = new Uint8Array(promptBytes.length + textBytes.length);
                combinedBytes.set(promptBytes);
                combinedBytes.set(textBytes, promptBytes.length);
                contentType = 'text';
            } else {
                const bgImage = imageEl.style.backgroundImage;
                if (!bgImage) return null;
                const imageUrl = bgImage.split('"')[1];
                if (!imageUrl) return null;
                try {
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    const arrayBuffer = await blob.arrayBuffer();
                    const imageBytes = new Uint8Array(arrayBuffer);
                    combinedBytes = new Uint8Array(promptBytes.length + imageBytes.length);
                    combinedBytes.set(promptBytes);
                    combinedBytes.set(imageBytes, promptBytes.length);
                    contentType = 'image';
                } catch (e) {
                    return null;
                }
            }
            
            const hash = await sha1ForPopsauce(combinedBytes);
            return { hash, prompt, contentType };
        } catch (e) {
            return null;
        }
    }
    
    async function checkPopsauceChallenge() {
        const challengeData = await getPopsauceChallengeData();
        if (!challengeData) return;
        
        if (challengeData.hash !== lastPopsauceChallengeHash) {
            lastPopsauceChallengeHash = challengeData.hash;
            popsauceAnswerRevealed = false;
            try {
                window.top.postMessage({
                    source: 'jklm-plus-iframe',
                    action: 'popsauce-challenge',
                    hash: challengeData.hash,
                    prompt: challengeData.prompt,
                    contentType: challengeData.contentType
                }, '*');
            } catch (e) {}
        }
        
        const answerWrapper = document.querySelector('.challengeResult');
        if (answerWrapper && !answerWrapper.hidden && !popsauceAnswerRevealed) {
            popsauceAnswerRevealed = true;
            const answerEl = answerWrapper.querySelector('.value');
            if (answerEl) {
                const answer = answerEl.innerText;
                try {
                    window.top.postMessage({
                        source: 'jklm-plus-iframe',
                        action: 'popsauce-answer-revealed',
                        hash: lastPopsauceChallengeHash,
                        answer: answer
                    }, '*');
                } catch (e) {}
            }
        }
    }
    
    if (isIframe) {
        setupSocketHook();
        
        setInterval(checkPopsauceChallenge, 100);
        
        document.addEventListener('keydown', (e) => {
            if (!popsauceInterceptedAnswer) return;
            
            const input = document.querySelector('.guessing input') ||
                          document.querySelector('.round.guessing input');
            if (!input) return;
            
            if (e.key.length === 1 && /^[a-zA-Z0-9\s\-\'\.]$/.test(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                const index = input.value.length;
                const nextChar = popsauceInterceptedAnswer.charAt(index);
                
                if (nextChar) {
                    input.value += nextChar;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    if (input.value.length >= popsauceInterceptedAnswer.length) {
                        setTimeout(() => {
                            const form = input.closest('form');
                            if (form) {
                                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                            }
                        }, 10);
                    }
                }
            }
        }, true);
        
        window.addEventListener('message', (event) => {
            if (event.data && event.data.source === 'jklm-plus-page') {
                try {
                    window.top.postMessage({
                        source: 'jklm-plus-iframe',
                        action: 'socket-event',
                        eventType: event.data.eventType,
                        data: event.data.data
                    }, '*');
                } catch (error) {}
            }
        });
        
        document.addEventListener('keydown', (e) => {
            try {
                window.top.postMessage({
                    source: 'jklm-plus-iframe',
                    action: 'menu-toggle-keybind',
                    key: e.key
                }, '*');
            } catch (error) {}
        });
        
        window.addEventListener('message', (event) => {
            if (event.data && event.data.source === 'jklm-plus-main') {
                if (event.data.action === 'set-placeholder') {
                    const input = document.querySelector('.selfTurn input.styled[maxlength="30"]') ||
                                  document.querySelector('.selfTurn input[type="text"]');
                    if (input) {
                        input.placeholder = event.data.value;
                    }
                } else if (event.data.action === 'intercept-typing') {
                    setupTypingInterception(event.data.targetWord);
                } else if (event.data.action === 'setup-socket-hook') {
                    setupSocketHook();
                } else if (event.data.action === 'request-rules') {
                    const script = document.createElement('script');
                    script.textContent = `
                        if (typeof rules !== 'undefined') {
                            window.postMessage({ 
                                source: 'jklm-plus-page', 
                                eventType: 'rules-initial', 
                                data: {
                                    startingLives: rules.startingLives ? rules.startingLives.value : null,
                                    maxLives: rules.maxLives ? rules.maxLives.value : null,
                                    bonusAlphabet: rules.customBonusAlphabet ? rules.customBonusAlphabet.value : null,
                                    dictionaryId: rules.dictionaryId ? rules.dictionaryId.value : null,
                                    promptDifficulty: rules.promptDifficulty ? rules.promptDifficulty.value : null,
                                    minTurnDuration: rules.minTurnDuration ? rules.minTurnDuration.value : null
                                }
                            }, '*');
                        }
                    `;
                    document.documentElement.appendChild(script);
                    script.remove();
                } else if (event.data.action === 'auto-type') {
                    const input = document.querySelector('.selfTurn input.styled[maxlength="30"]') ||
                                  document.querySelector('.selfTurn input[type="text"]');
                    if (input) {
                        input.value = event.data.text;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                } else if (event.data.action === 'auto-submit') {
                    const input = document.querySelector('.selfTurn input.styled[maxlength="30"]') ||
                                  document.querySelector('.selfTurn input[type="text"]');
                    if (input) {
                        const form = input.closest('form');
                        if (form) {
                            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                        }
                    }
                } else if (event.data.action === 'popsauce-set-placeholder') {
                    const input = document.querySelector('.guessing input') ||
                                  document.querySelector('.round.guessing input');
                    if (input) {
                        input.placeholder = event.data.value || '';
                    }
                } else if (event.data.action === 'popsauce-auto-fill') {
                    const input = document.querySelector('.guessing input') ||
                                  document.querySelector('.round.guessing input');
                    if (input && event.data.value) {
                        input.value = event.data.value;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                } else if (event.data.action === 'popsauce-auto-submit') {
                    const input = document.querySelector('.guessing input') ||
                                  document.querySelector('.round.guessing input');
                    if (input) {
                        const form = input.closest('form');
                        if (form) {
                            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                        }
                    }
                } else if (event.data.action === 'popsauce-intercept-typing') {
                    popsauceInterceptedAnswer = event.data.answer;
                } else if (event.data.action === 'popsauce-clear-intercept') {
                    popsauceInterceptedAnswer = null;
                }
            }
        });
        
        let lastInputValue = '';
        let checkInterval = null;
        
        function startInputMonitor() {
            if (checkInterval) return;
            
            checkInterval = setInterval(() => {
                const input = document.querySelector('.selfTurn input.styled[maxlength="30"]') ||
                              document.querySelector('.selfTurn input[type="text"]');
                
                if (input) {
                    const currentValue = input.value;
                    
                    if (currentValue && currentValue.length > 2) {
                        pendingWord = currentValue;
                    }
                    
                    if (pendingWord && pendingWord.length > 2 && currentValue === '') {
                        sendWordSubmitted(pendingWord, lastSyllable);
                        pendingWord = null;
                    }
                    
                    lastInputValue = currentValue;
                }
            }, 30);
        }
        
        startInputMonitor();
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const input = document.querySelector('.selfTurn input.styled[maxlength="30"]') ||
                              document.querySelector('.selfTurn input[type="text"]');
                if (input && input.value && input.value.length > 2) {
                    const wordToSubmit = input.value;
                    pendingWord = wordToSubmit;
                }
            }
        }, true);
        
        function setupTypingInterception(word) {
            interceptedWord = word;
        }
        
        function checkWordRejection(input, submittedWord, syllableAtSubmit) {
            const selfTurnEl = document.querySelector('.selfTurn');
            const stillMyTurn = selfTurnEl && !selfTurnEl.hasAttribute('hidden');
            const sameSyllable = lastSyllable === syllableAtSubmit;
            
            if (stillMyTurn && sameSyllable) {
                sendWordRejected(submittedWord, syllableAtSubmit);
            }
        }
        
        function sendWordRejected(word, syllable) {
            try {
                window.top.postMessage({
                    source: 'jklm-plus-iframe',
                    action: 'word-rejected',
                    word: word,
                    syllable: syllable
                }, '*');
            } catch (error) {}
        }
        
        document.addEventListener('keydown', (e) => {
            if (!interceptedWord) return;
            
            const input = document.querySelector('.selfTurn input.styled[maxlength="30"]') ||
                          document.querySelector('.selfTurn input[type="text"]');
            if (!input) return;
            
            const selfTurnEl = document.querySelector('.selfTurn');
            if (!selfTurnEl || selfTurnEl.hasAttribute('hidden')) return;
            
            if (e.key.length === 1 && /^[a-zA-Z\-]$/.test(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                const index = input.value.length;
                const nextChar = interceptedWord.charAt(index);
                
                if (nextChar) {
                    input.value += nextChar;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    try {
                        window.top.postMessage({
                            source: 'jklm-plus-iframe',
                            action: 'typing-progress',
                            length: input.value.length
                        }, '*');
                    } catch (error) {}
                    
                    if (input.value.length >= interceptedWord.length) {
                        const submittedWord = input.value;
                        pendingWord = submittedWord;
                        const syllableAtSubmit = lastSyllable;
                        setTimeout(() => {
                            const form = input.closest('form');
                            if (form) {
                                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                                setTimeout(() => {
                                    checkWordRejection(input, submittedWord, syllableAtSubmit);
                                }, 150);
                            }
                        }, 10);
                        interceptedWord = null;
                    }
                } else {
                    if (input.value.length >= interceptedWord.length) {
                        const submittedWord = input.value;
                        pendingWord = submittedWord;
                        const syllableAtSubmit = lastSyllable;
                        setTimeout(() => {
                            const form = input.closest('form');
                            if (form) {
                                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                                setTimeout(() => {
                                    checkWordRejection(input, submittedWord, syllableAtSubmit);
                                }, 150);
                            }
                        }, 10);
                        interceptedWord = null;
                    }
                }
            }
        }, true);
    }
    
    setInterval(findSyllable, 100);
    setInterval(checkTurnState, 100);
    findSyllable();
    checkTurnState();
    
    if (!isIframe) {
        window.addEventListener('message', (event) => {
            if (event.data && event.data.source === 'jklm-plus-iframe') {
                if (event.data.action === 'syllable-detected') {
                    lastSyllable = event.data.syllable;
                    document.dispatchEvent(new CustomEvent('jklm-mini-game-syllable', {
                        detail: { syllable: event.data.syllable, source: 'iframe' }
                    }));
                    document.dispatchEvent(new CustomEvent('jklm-mini-syllable-detected', {
                        detail: { syllable: event.data.syllable, source: 'iframe' }
                    }));
                } else if (event.data.action === 'turn-state-change') {
                    document.dispatchEvent(new CustomEvent('jklm-mini-turn-state-change', {
                        detail: { isMyTurn: event.data.isMyTurn, source: 'iframe' }
                    }));
                } else if (event.data.action === 'word-submitted') {
                    document.dispatchEvent(new CustomEvent('jklm-mini-word-submitted', {
                        detail: { word: event.data.word, syllable: event.data.syllable, source: 'iframe' }
                    }));
                } else if (event.data.action === 'word-rejected') {
                    document.dispatchEvent(new CustomEvent('jklm-mini-word-rejected', {
                        detail: { word: event.data.word, syllable: event.data.syllable, source: 'iframe' }
                    }));
                } else if (event.data.action === 'socket-event') {
                    document.dispatchEvent(new CustomEvent('jklm-mini-socket-event', {
                        detail: { eventType: event.data.eventType, data: event.data.data }
                    }));
                    if (event.data.eventType === 'popsauce-end-challenge') {
                        document.dispatchEvent(new CustomEvent('jklm-mini-popsauce-end-challenge', {
                            detail: event.data.data
                        }));
                    } else if (event.data.eventType === 'popsauce-player-state') {
                        document.dispatchEvent(new CustomEvent('jklm-mini-popsauce-player-state', {
                            detail: event.data.data
                        }));
                    }
                } else if (event.data.action === 'menu-toggle-keybind') {
                    document.dispatchEvent(new CustomEvent('jklm-mini-iframe-keybind', {
                        detail: { key: event.data.key }
                    }));
                } else if (event.data.action === 'typing-progress') {
                    document.dispatchEvent(new CustomEvent('jklm-mini-silent-typer-progress', {
                        detail: { length: event.data.length }
                    }));
                } else if (event.data.action === 'popsauce-challenge') {
                    document.dispatchEvent(new CustomEvent('jklm-mini-popsauce-challenge', {
                        detail: { 
                            hash: event.data.hash,
                            prompt: event.data.prompt,
                            contentType: event.data.contentType
                        }
                    }));
                } else if (event.data.action === 'popsauce-answer-revealed') {
                    document.dispatchEvent(new CustomEvent('jklm-mini-popsauce-answer-revealed', {
                        detail: { 
                            hash: event.data.hash,
                            answer: event.data.answer
                        }
                    }));
                }
            }
        });
        
        document.addEventListener('jklm-mini-socket-event', (event) => {
            if (event.detail?.eventType === 'milestone-change') {
                const milestone = event.detail?.data?.milestone;
                if (milestone) {
                    document.dispatchEvent(new CustomEvent('jklm-mini-milestone-change', {
                        detail: { milestone: milestone }
                    }));
                    
                    if (milestone.name === 'seating') {
                        document.dispatchEvent(new CustomEvent('jklm-mini-game-ended', {
                            detail: { milestone: milestone }
                        }));
                    } else if (milestone.name === 'round') {
                        document.dispatchEvent(new CustomEvent('jklm-mini-game-started', {
                            detail: { milestone: milestone }
                        }));
                    }
                }
            } else if (event.detail?.eventType === 'player-word-submitted') {
                document.dispatchEvent(new CustomEvent('jklm-mini-word-accepted', {
                    detail: { 
                        word: event.detail?.data?.word,
                        peerId: event.detail?.data?.peerId,
                        player: event.detail?.data?.player,
                        isSelf: event.detail?.data?.isSelf
                    }
                }));
            } else if (event.detail?.eventType === 'word-failed') {
                document.dispatchEvent(new CustomEvent('jklm-mini-word-failed', {
                    detail: { 
                        word: event.detail?.data?.word,
                        peerId: event.detail?.data?.peerId,
                        reason: event.detail?.data?.reason
                    }
                }));
            } else if (event.detail?.eventType === 'rules-initial' || event.detail?.eventType === 'rules-updated') {
                document.dispatchEvent(new CustomEvent('jklm-mini-rules-change', {
                    detail: {
                        startingLives: event.detail?.data?.startingLives,
                        maxLives: event.detail?.data?.maxLives,
                        bonusAlphabet: event.detail?.data?.bonusAlphabet,
                        dictionaryId: event.detail?.data?.dictionaryId,
                        promptDifficulty: event.detail?.data?.promptDifficulty,
                        minTurnDuration: event.detail?.data?.minTurnDuration,
                        isInitial: event.detail?.eventType === 'rules-initial'
                    }
                }));
            }
        });
        
        window.jklmPlusSetPlaceholder = function(value) {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    iframe.contentWindow.postMessage({
                        source: 'jklm-plus-main',
                        action: 'set-placeholder',
                        value: value
                    }, '*');
                } catch (e) {}
            });
        };
        
        window.jklmPlusInterceptTyping = function(word) {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    iframe.contentWindow.postMessage({
                        source: 'jklm-plus-main',
                        action: 'intercept-typing',
                        targetWord: word
                    }, '*');
                } catch (e) {}
            });
        };
        
        window.jklmPlusRequestRules = function() {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    iframe.contentWindow.postMessage({
                        source: 'jklm-plus-main',
                        action: 'request-rules'
                    }, '*');
                } catch (e) {}
            });
        };
        
        window.jklmPlusAutoType = function(text) {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    iframe.contentWindow.postMessage({
                        source: 'jklm-plus-main',
                        action: 'auto-type',
                        text: text
                    }, '*');
                } catch (e) {}
            });
        };
        
        window.jklmPlusAutoSubmit = function() {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    iframe.contentWindow.postMessage({
                        source: 'jklm-plus-main',
                        action: 'auto-submit'
                    }, '*');
                } catch (e) {}
            });
        };
        
        window.jklmPlusPopsauceSetPlaceholder = function(value) {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    iframe.contentWindow.postMessage({
                        source: 'jklm-plus-main',
                        action: 'popsauce-set-placeholder',
                        value: value
                    }, '*');
                } catch (e) {}
            });
        };
        
        window.jklmPlusPopsauceAutoFill = function(value) {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    iframe.contentWindow.postMessage({
                        source: 'jklm-plus-main',
                        action: 'popsauce-auto-fill',
                        value: value
                    }, '*');
                } catch (e) {}
            });
        };
        
        window.jklmPlusPopsauceAutoSubmit = function() {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    iframe.contentWindow.postMessage({
                        source: 'jklm-plus-main',
                        action: 'popsauce-auto-submit'
                    }, '*');
                } catch (e) {}
            });
        };
        
        window.jklmPlusPopsauceInterceptTyping = function(answer) {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    iframe.contentWindow.postMessage({
                        source: 'jklm-plus-main',
                        action: 'popsauce-intercept-typing',
                        answer: answer
                    }, '*');
                } catch (e) {}
            });
        };
        
        window.jklmPlusPopsauceClearIntercept = function() {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    iframe.contentWindow.postMessage({
                        source: 'jklm-plus-main',
                        action: 'popsauce-clear-intercept'
                    }, '*');
                } catch (e) {}
            });
        };
        
        function injectSocketHookToGameIframe() {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    iframe.contentWindow.postMessage({
                        source: 'jklm-plus-main',
                        action: 'setup-socket-hook'
                    }, '*');
                } catch (e) {}
            });
        }
        
        setInterval(injectSocketHookToGameIframe, 2000);
    }
})();
