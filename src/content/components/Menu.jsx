import React, { useState, useEffect } from 'react';
import NavPanel from './NavPanel';
import PanelContainer from './PanelContainer';
import '../styles/menu.css';

const Menu = ({ isVisible: propIsVisible }) => {
    const [isVisible, setIsVisible] = useState(() => {
        const stored = localStorage.getItem('jklm-mini-menu-visible');
        return stored !== null ? stored === 'true' : propIsVisible;
    });

    useEffect(() => {
        localStorage.setItem('jklm-mini-menu-visible', isVisible);
        const event = new CustomEvent('jklm-mini-menu-visibility-change', {
            detail: { visible: isVisible }
        });
        window.dispatchEvent(event);
    }, [isVisible]);

    useEffect(() => {
        setIsVisible(propIsVisible);
    }, [propIsVisible]);

    const [activePanels, setActivePanels] = useState(() => {
        const stored = localStorage.getItem('jklm-mini-active-panels');
        return stored ? JSON.parse(stored) : [];
    });

    useEffect(() => {
        localStorage.setItem('jklm-mini-active-panels', JSON.stringify(activePanels));
    }, [activePanels]);

    const handleSelectPanel = (panelId) => {
        setActivePanels(prev => {
            if (prev.includes(panelId)) {
                return prev.filter(id => id !== panelId);
            } else {
                return [...prev, panelId];
            }
        });
    };

    return (
        <div className={`jklm-mini ${isVisible ? 'visible' : ''}`}>
            <div className="jklm-menu-container">
                <NavPanel 
                    onSelectPanel={handleSelectPanel} 
                    activePanels={activePanels} 
                />
                {activePanels.length > 0 && (
                    <PanelContainer activePanels={activePanels} />
                )}
            </div>
        </div>
    );
};

export default Menu; 