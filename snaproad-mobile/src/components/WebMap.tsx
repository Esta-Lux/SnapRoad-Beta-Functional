// SnapRoad Mobile - Web Map Component using OpenStreetMap/Leaflet
// This component renders an interactive map on web platform

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { Colors } from '../utils/theme';

interface WebMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    id: string | number;
    lat: number;
    lng: number;
    type?: 'offer' | 'hazard' | 'user';
    label?: string;
    onPress?: () => void;
  }>;
  onMarkerPress?: (markerId: string | number) => void;
  style?: any;
}

// Only render on web
export const WebMap: React.FC<WebMapProps> = ({
  center = { lat: 39.9612, lng: -82.9988 },
  zoom = 14,
  markers = [],
  onMarkerPress,
  style,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !mapRef.current) return;

    // Load Leaflet CSS
    const linkEl = document.createElement('link');
    linkEl.rel = 'stylesheet';
    linkEl.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(linkEl);

    // Load Leaflet JS
    const scriptEl = document.createElement('script');
    scriptEl.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    scriptEl.onload = () => {
      initMap();
    };
    document.head.appendChild(scriptEl);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current || typeof window === 'undefined') return;
    
    const L = (window as any).L;
    if (!L) return;

    // Create map
    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: zoom,
      zoomControl: true,
    });

    // Add dark-styled tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Custom marker icons
    const createIcon = (type: string) => {
      const colors: Record<string, string> = {
        offer: '#22C55E',
        hazard: '#EF4444',
        user: '#2563EB',
      };
      const color = colors[type] || colors.offer;
      
      return L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: 32px;
            height: 32px;
            background: ${color};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">
            <div style="
              transform: rotate(45deg);
              color: white;
              font-size: 14px;
              font-weight: bold;
            ">
              ${type === 'offer' ? '💎' : type === 'hazard' ? '⚠️' : '📍'}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
    };

    // Add markers
    markers.forEach(marker => {
      const icon = createIcon(marker.type || 'offer');
      const m = L.marker([marker.lat, marker.lng], { icon }).addTo(map);
      
      if (marker.label) {
        m.bindPopup(`<b>${marker.label}</b>`);
      }
      
      m.on('click', () => {
        if (onMarkerPress) {
          onMarkerPress(marker.id);
        }
        if (marker.onPress) {
          marker.onPress();
        }
      });
    });

    // Add user location marker
    const userIcon = L.divIcon({
      className: 'user-marker',
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background: #2563EB;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(37,99,235,0.5);
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    L.marker([center.lat, center.lng], { icon: userIcon }).addTo(map);

    mapInstanceRef.current = map;
  };

  // Update map when center changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([center.lat, center.lng], zoom);
    }
  }, [center.lat, center.lng, zoom]);

  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.fallbackText}>Map available on mobile device</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <div 
        ref={mapRef as any} 
        style={{ 
          width: '100%', 
          height: '100%',
          backgroundColor: '#070E1B',
        }} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fallbackText: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 100,
  },
});

export default WebMap;
