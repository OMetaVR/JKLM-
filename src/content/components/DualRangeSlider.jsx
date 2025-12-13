import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import '../styles/dualRangeSlider.css';

const DualRangeSlider = ({ 
  min, 
  max, 
  minValue, 
  maxValue, 
  onChange, 
  label, 
  unit = '', 
  enabled = true, 
  onToggle,
  showToggle = true,
  accentColor: propAccentColor
}) => {
  const { accentColor: themeAccent } = useTheme();
  const [accentColor, setAccentColor] = useState(propAccentColor || themeAccent);

  useEffect(() => {
    if (propAccentColor) {
      setAccentColor(propAccentColor);
    }
  }, [propAccentColor]);

  useEffect(() => {
    if (!propAccentColor) {
      const handleThemeChange = (e) => {
        if (e.detail?.accent) {
          setAccentColor(e.detail.accent);
        }
      };
      window.addEventListener('jklm-mini-theme-change', handleThemeChange);
      return () => window.removeEventListener('jklm-mini-theme-change', handleThemeChange);
    }
  }, [propAccentColor]);
  const [localMinValue, setLocalMinValue] = useState(minValue);
  const [localMaxValue, setLocalMaxValue] = useState(maxValue);
  const [isDragging, setIsDragging] = useState(null);
  const trackRef = useRef(null);

  useEffect(() => {
    setLocalMinValue(minValue);
    setLocalMaxValue(maxValue);
  }, [minValue, maxValue]);

  const handleMinChange = (value) => {
    const newMin = Math.max(min, Math.min(value, localMaxValue - 1));
    setLocalMinValue(newMin);
    onChange(newMin, localMaxValue);
  };

  const handleMaxChange = (value) => {
    const newMax = Math.min(max, Math.max(value, localMinValue + 1));
    setLocalMaxValue(newMax);
    onChange(localMinValue, newMax);
  };

  const handleMinInputChange = (e) => {
    const value = parseInt(e.target.value) || min;
    handleMinChange(value);
  };

  const handleMaxInputChange = (e) => {
    const value = parseInt(e.target.value) || max;
    handleMaxChange(value);
  };

  const valueToPosition = (value) => {
    return ((value - min) / (max - min)) * 100;
  };

  const positionToValue = (clientX) => {
    if (!trackRef.current) return min;
    
    const rect = trackRef.current.getBoundingClientRect();
    const position = (clientX - rect.left) / rect.width;
    const clampedPosition = Math.max(0, Math.min(1, position));
    return Math.round(min + (clampedPosition * (max - min)));
  };

  const handleMouseDown = (thumb, e) => {
    if (!enabled) return;
    e.preventDefault();
    setIsDragging(thumb);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const newValue = positionToValue(e.clientX);
      
      if (isDragging === 'min') {
        handleMinChange(newValue);
      } else if (isDragging === 'max') {
        handleMaxChange(newValue);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, localMinValue, localMaxValue]);

  const handleTrackClick = (e) => {
    if (!enabled || isDragging) return;
    
    const newValue = positionToValue(e.clientX);
    const distanceToMin = Math.abs(newValue - localMinValue);
    const distanceToMax = Math.abs(newValue - localMaxValue);
    
    if (distanceToMin <= distanceToMax) {
      handleMinChange(newValue);
    } else {
      handleMaxChange(newValue);
    }
  };

  // Calculate positions
  const minPercent = valueToPosition(localMinValue);
  const maxPercent = valueToPosition(localMaxValue);

  const accentCssVars = {
    '--accent-primary': accentColor.primary,
    '--accent-secondary': accentColor.secondary,
    '--accent-tertiary': accentColor.tertiary || accentColor.hover,
    '--min-percent': `${minPercent}%`,
    '--max-percent': `${maxPercent}%`
  };

  return (
    <div className="dual-range-slider" style={accentCssVars}>
      <div className="dual-range-header">
        <span className="dual-range-label">{label}</span>
        {showToggle && (
          <div className={`toggle-switch ${enabled ? 'active' : ''}`} onClick={onToggle}>
            <div className="toggle-switch-handle"></div>
          </div>
        )}
      </div>
      
      <div className={`dual-range-container ${!enabled ? 'disabled' : ''}`}>
        <div className="dual-range-inputs">
          <div className="dual-range-input-group">
            <input
              type="number"
              className="dual-range-input"
              value={localMinValue}
              onChange={handleMinInputChange}
              min={min}
              max={localMaxValue - 1}
              disabled={!enabled}
            />
          </div>
          
          <span className="dual-range-separator">-</span>
          
          <div className="dual-range-input-group">
            <input
              type="number"
              className="dual-range-input"
              value={localMaxValue}
              onChange={handleMaxInputChange}
              min={localMinValue + 1}
              max={max}
              disabled={!enabled}
            />
          </div>
        </div>

        <div className="custom-dual-range-container">
          <div 
            className="custom-dual-range-track" 
            ref={trackRef}
            onClick={handleTrackClick}
          >
            <div 
              className="custom-dual-range-fill"
              style={{
                left: `${minPercent}%`,
                width: `${maxPercent - minPercent}%`
              }}
            />
            <div
              className={`custom-dual-range-thumb custom-dual-range-thumb-min ${isDragging === 'min' ? 'dragging' : ''}`}
              style={{ left: `${minPercent}%` }}
              onMouseDown={(e) => handleMouseDown('min', e)}
            />
            <div
              className={`custom-dual-range-thumb custom-dual-range-thumb-max ${isDragging === 'max' ? 'dragging' : ''}`}
              style={{ left: `${maxPercent}%` }}
              onMouseDown={(e) => handleMouseDown('max', e)}
            />
          </div>
        </div>
        <div className="dual-range-display">
          {localMinValue}{unit} - {localMaxValue}{unit}
        </div>
      </div>
    </div>
  );
};

export default DualRangeSlider;