import debugLogger from './debugLogger';

class InputInterceptor {
  constructor() {
    this.isActive = false;
    this.listeners = [];
    this.config = {
      targetSelectors: [
        '.selfTurn input.styled[maxlength="30"]',
        '.selfTurn input[type="text"]',
        'div.selfTurn > form > input',
      ],
      blockedKeys: [],
      allowedKeys: [],
      eventTypes: ['keydown', 'keypress', 'keyup', 'paste', 'drop', 'contextmenu', 'input'],
      blockAll: false,
      onIntercept: null,
      debug: false
    };
  }

  isTargetElement(element) {
    if (!element) return false;
    
    return this.config.targetSelectors.some(selector => {
      try {
        return element.matches(selector) || element.closest(selector);
      } catch (e) {
        return false;
      }
    });
  }

  shouldBlockKey(key, event) {
    if (this.config.allowedKeys.length > 0) {
      return !this.config.allowedKeys.includes(key);
    }
    
    if (this.config.blockedKeys.length > 0) {
      return this.config.blockedKeys.includes(key);
    }
    
    if (this.config.blockAll) {
      return true;
    }
    
    return false;
  }

  handleEvent = (event) => {
    const target = event.target;
    
    if (!this.isTargetElement(target)) {
      return;
    }

    const shouldBlock = this.shouldBlockEvent(event);
    
    if (shouldBlock) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      if (this.config.onIntercept) {
        this.config.onIntercept(event, this);
      }
    }
  }

  shouldBlockEvent(event) {
    if (event.type === 'keydown' || event.type === 'keypress' || event.type === 'keyup') {
      if (!event.key) return false;
      return this.shouldBlockKey(event.key, event);
    }
    
    return this.config.blockAll;
  }

  enable(customConfig = {}) {
    if (this.isActive) {
      return;
    }

    this.config = { ...this.config, ...customConfig };
    
    this.config.eventTypes.forEach(eventType => {
      const listener = {
        type: eventType,
        handler: this.handleEvent,
        options: { capture: true, passive: false }
      };
      
      document.addEventListener(eventType, listener.handler, listener.options);
      this.listeners.push(listener);
    });

    this.isActive = true;
  }

  disable() {
    if (!this.isActive) {
      return;
    }

    this.listeners.forEach(listener => {
      document.removeEventListener(listener.type, listener.handler, listener.options);
    });
    
    this.listeners = [];
    this.isActive = false;
  }

  updateConfig(newConfig) {
    const wasActive = this.isActive;
    
    if (wasActive) {
      this.disable();
    }
    
    this.config = { ...this.config, ...newConfig };
    
    if (wasActive) {
      this.enable();
    }
  }

  isEnabled() {
    return this.isActive;
  }

  getConfig() {
    return { ...this.config };
  }

  blockAllKeys() {
    this.updateConfig({ blockAll: true, blockedKeys: [], allowedKeys: [] });
  }

  blockKeys(keys) {
    this.updateConfig({ 
      blockAll: false, 
      blockedKeys: Array.isArray(keys) ? keys : [keys], 
      allowedKeys: [] 
    });
  }

  allowOnlyKeys(keys) {
    this.updateConfig({ 
      blockAll: false, 
      blockedKeys: [], 
      allowedKeys: Array.isArray(keys) ? keys : [keys] 
    });
  }

  allowAllKeys() {
    this.updateConfig({ blockAll: false, blockedKeys: [], allowedKeys: [] });
  }
}

export default InputInterceptor;
export const globalInputInterceptor = new InputInterceptor();
