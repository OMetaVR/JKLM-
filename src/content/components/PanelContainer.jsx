import React from 'react';
import BombPartyPanel from './panels/BombPartyPanel';
import PopsaucePanel from './panels/PopsaucePanel';
import ProfilesPanel from './panels/ProfilesPanel';
import InfoPanel from './panels/InfoPanel';
import '../styles/panelContainer.css';

const PANEL_COMPONENTS = {
  profiles: ProfilesPanel,
  bombparty: BombPartyPanel,
  popsauce: PopsaucePanel,
  info: InfoPanel
};

const PanelContainer = ({ activePanels = [] }) => {
  return (
    <div className="panel-container">
      {activePanels.map((panelId) => {
        const PanelComponent = PANEL_COMPONENTS[panelId];
        if (!PanelComponent) return null;
        return (
          <div key={panelId} className="panel-wrapper">
            <PanelComponent />
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(PanelContainer); 