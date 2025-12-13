import InputInterceptor, { globalInputInterceptor } from './inputInterceptor';
import debugLogger from './debugLogger';

function isPrintableChar(event) {
  if (!event || typeof event.key !== 'string') return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (event.key.length !== 1) return false;
  return /^[a-zA-Z\-\s]$/.test(event.key);
}

function setValueAndDispatchInput(input, nextValue, selectionStart) {
  if (!input) return;
  input.value = nextValue;
  if (typeof selectionStart === 'number') {
    try {
      input.setSelectionRange(selectionStart, selectionStart);
    } catch (_) {}
  }
  const ev = new Event('input', { bubbles: true });
  input.dispatchEvent(ev);
}

function insertAtCaret(input, text) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const before = input.value.slice(0, start);
  const after = input.value.slice(end);
  const next = before + text + after;
  const newCaret = start + text.length;
  return { next, newCaret };
}

class InputOverwriter {
  constructor() {
    this.enabled = false;
    this.interceptor = globalInputInterceptor || new InputInterceptor();
    this.getReplacement = null;
    this.shouldHandle = null;
  }

  enable(options = {}) {
    if (this.enabled) return;

    const { getReplacement, shouldHandle, targetSelectors } = options;

    this.getReplacement = typeof getReplacement === 'function' ? getReplacement : null;
    this.shouldHandle = typeof shouldHandle === 'function' ? shouldHandle : null;

    const defaultSelectors = [
      '.selfTurn input.styled[maxlength="30"]',
      '.selfTurn input[type="text"]',
      'div.selfTurn > form > input',
    ];

    const onIntercept = (event) => {
      const input = event.target;
      if (!(input && input.tagName === 'INPUT')) return;
      if (event.isComposing) return;
      if (!isPrintableChar(event)) return;
      
      const handle = this.shouldHandle ? this.shouldHandle(event, input) : true;
      if (!handle) return;

      const replacement = this.getReplacement ? this.getReplacement(event, { input }) : null;
      const charToInsert = (replacement === undefined || replacement === null) ? event.key : String(replacement);

      if (charToInsert === '') return;

      const { next, newCaret } = insertAtCaret(input, charToInsert);
      setValueAndDispatchInput(input, next, newCaret);
    };

    const letters = Array.from('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
    const specials = ['-', ' '];
    const blockedKeys = [...letters, ...specials];

    this.interceptor.enable({
      targetSelectors: targetSelectors && Array.isArray(targetSelectors) ? targetSelectors : defaultSelectors,
      blockedKeys,
      allowedKeys: [],
      blockAll: false,
      eventTypes: ['keydown'],
      onIntercept,
      debug: false,
    });

    this.enabled = true;
  }

  disable() {
    if (!this.enabled) return;
    this.interceptor.disable();
    this.enabled = false;
  }
}

export default InputOverwriter;
export const globalInputOverwriter = new InputOverwriter();
