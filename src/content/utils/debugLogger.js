class DebugLogger {
  constructor() {
    this.systems = {
      'input-interceptor': { name: 'Input Interceptor', enabled: false },
      'input-overwriter': { name: 'Input Overwriter', enabled: false },
      'auto-typer': { name: 'Auto Typer', enabled: false },
      'silent-typer': { name: 'Silent Typer', enabled: false },
      'turn-detector': { name: 'Turn Detector', enabled: false },
      'word-tracker': { name: 'Word Tracker', enabled: false },
      'syllable-detector': { name: 'Syllable Detector', enabled: false },
      'keybind-system': { name: 'Keybind System', enabled: false },
      'feature-manager': { name: 'Feature Manager', enabled: false },
      'storage': { name: 'Storage Operations', enabled: false },
      'ui-events': { name: 'UI Events', enabled: false },
      'popsauce-answers': { name: 'Popsauce Answers', enabled: false },
      'popsauce-auto-typer': { name: 'Popsauce Auto Typer', enabled: false },
      'popsauce-silent-typer': { name: 'Popsauce Silent Typer', enabled: false },
      'popsauce-tracker': { name: 'Popsauce Tracker', enabled: false },
      'answer-display': { name: 'Answer Display', enabled: false }
    };
    
    this.loadSettings();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('jklm-mini-debug-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        Object.keys(settings).forEach(systemId => {
          if (this.systems[systemId]) {
            this.systems[systemId].enabled = settings[systemId];
          }
        });
      }
    } catch (error) {
      console.error('Error loading debug settings:', error);
    }
  }

  saveSettings() {
    try {
      const settings = {};
      Object.keys(this.systems).forEach(systemId => {
        settings[systemId] = this.systems[systemId].enabled;
      });
      localStorage.setItem('jklm-mini-debug-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving debug settings:', error);
    }
  }

  setSystemEnabled(systemId, enabled) {
    if (this.systems[systemId]) {
      this.systems[systemId].enabled = enabled;
      this.saveSettings();
      window.dispatchEvent(new CustomEvent('jklm-mini-debug-settings-change', {
        detail: { systemId, enabled }
      }));
    }
  }

  isEnabled(systemId) {
    return this.systems[systemId]?.enabled || false;
  }

  log(systemId, level, message, ...args) {
    if (!this.isEnabled(systemId)) return;
    
    const systemName = this.systems[systemId]?.name || systemId;
    const prefix = `[${systemName}]`;
    
    switch (level) {
      case 'error':
        console.error(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'info':
        console.info(prefix, message, ...args);
        break;
      case 'debug':
      default:
        console.log(prefix, message, ...args);
        break;
    }
  }

  debug(systemId, message, ...args) {
    this.log(systemId, 'debug', message, ...args);
  }

  info(systemId, message, ...args) {
    this.log(systemId, 'info', message, ...args);
  }

  warn(systemId, message, ...args) {
    this.log(systemId, 'warn', message, ...args);
  }

  error(systemId, message, ...args) {
    this.log(systemId, 'error', message, ...args);
  }

  getAllSystems() {
    return { ...this.systems };
  }

  enableAll() {
    Object.keys(this.systems).forEach(systemId => {
      this.systems[systemId].enabled = true;
    });
    this.saveSettings();
  }

  disableAll() {
    Object.keys(this.systems).forEach(systemId => {
      this.systems[systemId].enabled = false;
    });
    this.saveSettings();
  }
}

export const debugLogger = new DebugLogger();
export default debugLogger;
