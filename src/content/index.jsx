import React from 'react';
import { createRoot } from 'react-dom/client';
import Menu from './components/Menu';
import { ThemeProvider } from './context/ThemeContext';
import { AnimationProvider } from './context/AnimationContext';
import { KeybindProvider } from './context/KeybindContext';
import { StandaloneWordListPanel } from './components/panels/WordListPanel';
import { StandaloneBindListPanel } from './components/panels/BindListPanel';
import { StandaloneWordfeedPanel } from './components/panels/WordfeedPanel';
import WordListPlaceholder from './components/WordListPlaceholder';
import TurnTimer from './components/TurnTimer';
import FloatingSilentTyperBadge from './components/FloatingSilentTyperBadge';
import FloatingAnswerBadge from './components/FloatingAnswerBadge';
import './styles.css';
import './styles/theme.css';

class JKLMPlus {
    constructor() {
        if (window !== window.top) {
            return;
        }
        
        this.isVisible = localStorage.getItem('jklm-mini-menu-visible') === 'true';
        this.init();
        this.initStandaloneComponents();
    }

    init() {
        let container = document.getElementById('jklm-mini-root');
        if (container) {
            return;
        }
        
        container = document.createElement('div');
        container.id = 'jklm-mini-root';
        document.body.appendChild(container);

        const root = createRoot(container);
        root.render(
            <ThemeProvider>
                <AnimationProvider>
                    <KeybindProvider>
                        <Menu 
                            isVisible={this.isVisible}
                            onToggle={(visible) => this.toggleVisibility(visible)}
                        />
                    </KeybindProvider>
                </AnimationProvider>
            </ThemeProvider>
        );

        document.addEventListener('keydown', this.handleGlobalKeypress.bind(this));
        document.addEventListener('jklm-mini-iframe-keybind', this.handleIframeKeybind.bind(this));
    }

    handleIframeKeybind(e) {
        const savedKeybind = localStorage.getItem('jklm-mini-menu-toggle-keybind') || '\\';
        if (e.detail.key === savedKeybind) {
            this.toggleVisibility(!this.isVisible);
        }
    }

    initStandaloneComponents() {
        if (document.getElementById('jklm-mini-wordlist-root')) {
            return;
        }
        
        const wordListContainer = document.createElement('div');
        wordListContainer.id = 'jklm-mini-wordlist-root';
        document.body.appendChild(wordListContainer);
        
        const wordListRoot = createRoot(wordListContainer);
        wordListRoot.render(
            <ThemeProvider>
                <AnimationProvider>
                    <StandaloneWordListPanel />
                </AnimationProvider>
            </ThemeProvider>
        );
        
        const placeholderContainer = document.createElement('div');
        placeholderContainer.id = 'jklm-mini-placeholder-root';
        document.body.appendChild(placeholderContainer);
        
        const placeholderRoot = createRoot(placeholderContainer);
        placeholderRoot.render(
            <ThemeProvider>
                <AnimationProvider>
                    <WordListPlaceholder />
                </AnimationProvider>
            </ThemeProvider>
        );
        
        const bindListContainer = document.createElement('div');
        bindListContainer.id = 'jklm-mini-bindlist-root';
        document.body.appendChild(bindListContainer);
        
        const bindListRoot = createRoot(bindListContainer);
        bindListRoot.render(
            <ThemeProvider>
                <AnimationProvider>
                    <StandaloneBindListPanel />
                </AnimationProvider>
            </ThemeProvider>
        );
        
        const timerContainer = document.createElement('div');
        timerContainer.id = 'jklm-mini-timer-root';
        document.body.appendChild(timerContainer);
        
        const timerRoot = createRoot(timerContainer);
        timerRoot.render(
            <ThemeProvider>
                <TurnTimer />
            </ThemeProvider>
        );
        
        const wordfeedContainer = document.createElement('div');
        wordfeedContainer.id = 'jklm-mini-wordfeed-root';
        document.body.appendChild(wordfeedContainer);
        
        const wordfeedRoot = createRoot(wordfeedContainer);
        wordfeedRoot.render(
            <ThemeProvider>
                <AnimationProvider>
                    <StandaloneWordfeedPanel />
                </AnimationProvider>
            </ThemeProvider>
        );
        
        const silentTyperBadgeContainer = document.createElement('div');
        silentTyperBadgeContainer.id = 'jklm-mini-silent-typer-badge-root';
        document.body.appendChild(silentTyperBadgeContainer);
        
        const silentTyperBadgeRoot = createRoot(silentTyperBadgeContainer);
        silentTyperBadgeRoot.render(
            <ThemeProvider>
                <FloatingSilentTyperBadge />
            </ThemeProvider>
        );
        
        const answerBadgeContainer = document.createElement('div');
        answerBadgeContainer.id = 'jklm-mini-answer-badge-root';
        document.body.appendChild(answerBadgeContainer);
        
        const answerBadgeRoot = createRoot(answerBadgeContainer);
        answerBadgeRoot.render(
            <ThemeProvider>
                <FloatingAnswerBadge />
            </ThemeProvider>
        );
    }

    handleGlobalKeypress(e) {
        const savedKeybind = localStorage.getItem('jklm-mini-menu-toggle-keybind') || '\\';
        if (e.key === savedKeybind) {
            this.toggleVisibility(!this.isVisible);
        }
    }

    toggleVisibility(visible) {
        this.isVisible = visible;
        localStorage.setItem('jklm-mini-menu-visible', visible);
        const container = document.getElementById('jklm-mini-root');
        if (container) {
            const menu = container.querySelector('.jklm-mini');
            if (menu) {
                menu.classList.toggle('visible', visible);
            }
        }
        
        const event = new CustomEvent('jklm-mini-menu-visibility-change', {
            detail: { visible }
        });
        window.dispatchEvent(event);
    }
}

if (!window.jklmPlusInitialized) {
    window.jklmPlusInitialized = true;
    new JKLMPlus();
}
