import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useAnimation } from '../context/AnimationContext';
import '../styles/dropdown.css';

const Dropdown = ({ 
  options, 
  selectedOption, 
  onSelect, 
  placeholder = "Select an option",
  label = null,
  width = '100%'
}) => {
  const { accentColor } = useTheme();
  const { animationsEnabled, getTransition } = useAnimation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Toggle dropdown open/closed
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  // Handle option selection
  const handleSelectOption = (option) => {
    onSelect(option);
    setIsOpen(false);
  };
  
  // Find the selected option object
  const selectedOptionObject = options.find(opt => opt.value === selectedOption) || null;
  
  return (
    <div className="dropdown-container" style={{ width }} ref={dropdownRef}>
      {label && <div className="dropdown-label">{label}</div>}
      
      <div 
        className={`dropdown-selector ${isOpen ? 'open' : ''}`}
        onClick={toggleDropdown}
        style={{
          borderColor: isOpen ? accentColor.primary : undefined
        }}
      >
        <span className="dropdown-selected">
          {selectedOptionObject ? selectedOptionObject.label : placeholder}
        </span>
        <div className="dropdown-arrow">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="dropdown-options"
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={getTransition({ duration: 0.2 })}
          >
            {options.map((option) => (
              <div 
                key={option.value}
                className={`dropdown-option ${option.value === selectedOption ? 'selected' : ''}`}
                onClick={() => handleSelectOption(option.value)}
                style={{
                  ...(option.value === selectedOption && {
                    backgroundColor: `${accentColor.primary}20`,
                    color: accentColor.primary
                  })
                }}
              >
                {option.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dropdown; 