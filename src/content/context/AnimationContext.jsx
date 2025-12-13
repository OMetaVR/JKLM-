import React, { createContext, useContext, useState, useEffect } from 'react';

const AnimationContext = createContext();

export const AnimationProvider = ({ children }) => {
  const [animationsEnabled, setAnimationsEnabled] = useState(() => {
    const stored = localStorage.getItem('jklm-mini-animations-enabled');
    return stored !== null ? stored === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('jklm-mini-animations-enabled', animationsEnabled);
    document.documentElement.setAttribute('data-animations', animationsEnabled ? 'enabled' : 'disabled');
  }, [animationsEnabled]);

  const toggleAnimations = () => {
    setAnimationsEnabled(prev => !prev);
  };

  const getAnimationDuration = (defaultDuration = 0.25) => {
    return animationsEnabled ? defaultDuration : 0;
  };

  const getTransition = (config = {}) => {
    if (!animationsEnabled) {
      return { duration: 0 };
    }
    
    return {
      duration: 0.25,
      ease: "easeInOut",
      ...config
    };
  };

  return (
    <AnimationContext.Provider value={{
      animationsEnabled,
      toggleAnimations,
      getAnimationDuration,
      getTransition
    }}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
};
