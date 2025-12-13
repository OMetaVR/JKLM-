import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-theme');
    return stored !== null ? stored === 'dark' : true;
  });

  const [accentColor, setAccentColor] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-accent-color');
    return stored ? JSON.parse(stored) : {
      primary: '#9b59b6',
      secondary: '#8e44ad',
      hover: '#a66bbe'
    };
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('jklm-mini-theme', isDark ? 'dark' : 'light');
    window.dispatchEvent(new CustomEvent('jklm-mini-theme-change', {
      detail: { isDark }
    }));
  }, [isDark]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', accentColor.primary);
    document.documentElement.style.setProperty('--accent-secondary', accentColor.secondary);
    document.documentElement.style.setProperty('--accent-hover', accentColor.hover || accentColor.tertiary);
    localStorage.setItem('jklm-mini-theme-accent', JSON.stringify(accentColor));
    localStorage.setItem('jklm-mini-accent-color', JSON.stringify(accentColor));
    window.dispatchEvent(new CustomEvent('jklm-mini-theme-change', {
      detail: { accent: accentColor }
    }));
  }, [accentColor]);

  const toggleTheme = () => setIsDark(!isDark);
  
  const changeAccentColor = (newAccentColor) => {
    setAccentColor(newAccentColor);
  };

  return (
    <ThemeContext.Provider value={{
      isDark,
      toggleTheme,
      accentColor,
      changeAccentColor
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
