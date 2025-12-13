import React, { createContext, useContext, useState, useEffect } from 'react';

const KeybindContext = createContext();

export const KeybindProvider = ({ children }) => {
  const [menuToggleKeybind, setMenuToggleKeybind] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-menu-toggle-keybind');
    return stored || '\\';
  });
  
  const [isEditingMenuKeybind, setIsEditingMenuKeybind] = useState(false);
  
  useEffect(() => {
    localStorage.setItem('jklm-mini-menu-toggle-keybind', menuToggleKeybind);
  }, [menuToggleKeybind]);
  
  const startEditingMenuKeybind = () => {
    setIsEditingMenuKeybind(true);
  };
  
  const setNewMenuKeybind = (key) => {
    if (key === 'Escape') {
      setIsEditingMenuKeybind(false);
      return;
    }
    
    setMenuToggleKeybind(key);
    setIsEditingMenuKeybind(false);
  };
  
  const cancelKeybindEditing = () => {
    setIsEditingMenuKeybind(false);
  };
  
  return (
    <KeybindContext.Provider value={{
      menuToggleKeybind,
      isEditingMenuKeybind,
      startEditingMenuKeybind,
      setNewMenuKeybind,
      cancelKeybindEditing
    }}>
      {children}
    </KeybindContext.Provider>
  );
};

export const useKeybind = () => {
  const context = useContext(KeybindContext);
  if (context === undefined) {
    throw new Error('useKeybind must be used within a KeybindProvider');
  }
  return context;
};
