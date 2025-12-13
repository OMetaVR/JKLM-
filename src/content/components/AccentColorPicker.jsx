import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAnimation } from '../context/AnimationContext';

const AccentColorPicker = () => {
  const { accentColor, changeAccentColor } = useTheme();
  const { getTransition } = useAnimation();
  
  const colorOptions = [
    { 
      name: 'Purple', 
      primary: '#9b59b6', 
      secondary: '#8e44ad', 
      hover: '#a66bbe' 
    },
    { 
      name: 'Blue', 
      primary: '#3498db', 
      secondary: '#2980b9', 
      hover: '#4aa3df' 
    },
    { 
      name: 'Green', 
      primary: '#2ecc71', 
      secondary: '#27ae60', 
      hover: '#40d47e' 
    },
    { 
      name: 'Red', 
      primary: '#e74c3c', 
      secondary: '#c0392b', 
      hover: '#ea6153' 
    },
    { 
      name: 'Orange', 
      primary: '#e67e22', 
      secondary: '#d35400', 
      hover: '#f39c12' 
    }
  ];

  const isActive = (color) => {
    return color.primary === accentColor.primary;
  };

  return (
    <div className="accent-color-picker">
      {colorOptions.map((color) => (
        <div
          key={color.name}
          className={`color-option ${isActive(color) ? 'active' : ''}`}
          style={{ backgroundColor: color.primary }}
          onClick={() => changeAccentColor(color)}
          title={color.name}
        />
      ))}
    </div>
  );
};

export default AccentColorPicker; 