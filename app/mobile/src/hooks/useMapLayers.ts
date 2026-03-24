import { useState } from 'react';

export function useMapLayers() {
  const [showTraffic, setShowTraffic] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showCameras, setShowCameras] = useState(false);

  return {
    showTraffic,
    setShowTraffic,
    showIncidents,
    setShowIncidents,
    showCameras,
    setShowCameras,
  };
}
