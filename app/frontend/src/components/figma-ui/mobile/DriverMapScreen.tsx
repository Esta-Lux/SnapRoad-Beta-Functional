// SnapRoad - Enhanced Driver Map Screen with OpenStreetMap
// Full-featured navigation with collapsible offers, Orion integration, and driver essentials

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Menu,
  Search,
  Home,
  Briefcase,
  Heart,
  MapPin,
  Navigation,
  ChevronDown,
  ChevronUp,
  X,
  Mic,
  Camera,
  AlertTriangle,
  Fuel,
  Coffee,
  Car,
  Clock,
  Diamond,
  TrendingUp,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Settings,
  Layers,
  Compass,
  RotateCcw,
  Plus,
  Minus,
  Gift,
  Sparkles,
  Zap
} from 'lucide-react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color: string, size: number = 32) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const userIcon = createCustomIcon('#0084FF', 40);
const destinationIcon = createCustomIcon('#00DFA2', 36);
const offerIcon = createCustomIcon('#FFB800', 28);
const gasIcon = createCustomIcon('#FF5A5A', 28);

interface MapScreenProps {
  onNavigate: (screen: string) => void;
  onOpenOrion?: () => void;
  onOpenPhotoCapture?: () => void;
}

interface NearbyOffer {
  id: string;
  name: string;
  discount: string;
  gems: number;
  distance: string;
  lat: number;
  lng: number;
  category: 'food' | 'gas' | 'service' | 'retail';
  isPersonalized?: boolean;
}

interface QuickDestination {
  id: string;
  name: string;
  icon: any;
  distance: string;
  lat: number;
  lng: number;
}

// Map controls component
function MapControls({ onZoomIn, onZoomOut, onRecenter, onToggleLayers }: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  onToggleLayers: () => void;
}) {
  const { theme, toggleTheme, mode, setMode } = useSnaproadTheme();
  
  return (
    <div className="absolute left-4 top-1/3 z-[1000] flex flex-col gap-2">
      <button
        onClick={onZoomIn}
        className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors ${
          theme === 'dark' ? 'bg-[#1A1F2E]/90 text-white border border-white/10' : 'bg-white/90 text-gray-800 border border-gray-200'
        }`}
      >
        <Plus size={18} />
      </button>
      <button
        onClick={onZoomOut}
        className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors ${
          theme === 'dark' ? 'bg-[#1A1F2E]/90 text-white border border-white/10' : 'bg-white/90 text-gray-800 border border-gray-200'
        }`}
      >
        <Minus size={18} />
      </button>
      <button
        onClick={onRecenter}
        className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors ${
          theme === 'dark' ? 'bg-[#1A1F2E]/90 text-white border border-white/10' : 'bg-white/90 text-gray-800 border border-gray-200'
        }`}
      >
        <Compass size={18} />
      </button>
      <button
        onClick={onToggleLayers}
        className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors ${
          theme === 'dark' ? 'bg-[#1A1F2E]/90 text-white border border-white/10' : 'bg-white/90 text-gray-800 border border-gray-200'
        }`}
      >
        <Layers size={18} />
      </button>
      <div className="h-px bg-white/20 my-1" />
      <button
        onClick={toggleTheme}
        className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors ${
          theme === 'dark' ? 'bg-[#1A1F2E]/90 text-yellow-400 border border-white/10' : 'bg-white/90 text-blue-600 border border-gray-200'
        }`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <button
        onClick={() => setMode(mode === 'auto' ? 'manual' : 'auto')}
        className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors ${
          mode === 'auto' 
            ? 'bg-[#00DFA2] text-white' 
            : theme === 'dark' ? 'bg-[#1A1F2E]/90 text-white/60 border border-white/10' : 'bg-white/90 text-gray-400 border border-gray-200'
        }`}
        title={mode === 'auto' ? 'Auto theme (time-based)' : 'Manual theme'}
      >
        <span className="text-[10px] font-bold">AUTO</span>
      </button>
    </div>
  );
}

// Map component that handles zoom
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
}

export function DriverMapScreen({ onNavigate, onOpenOrion, onOpenPhotoCapture }: MapScreenProps) {
  const { theme } = useSnaproadTheme();
  const isDark = theme === 'dark';
  
  // Map state
  const [userLocation] = useState<[number, number]>([41.4993, -81.6944]); // Cleveland
  const [destination] = useState<[number, number] | null>([41.5051, -81.6934]);
  const [mapCenter, setMapCenter] = useState<[number, number]>(userLocation);
  const [mapZoom, setMapZoom] = useState(14);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite' | 'terrain'>('standard');
  
  // UI state
  const [offersExpanded, setOffersExpanded] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('map');
  const [orionSpeaking, setOrionSpeaking] = useState(false);
  const [personalizedOfferShown, setPersonalizedOfferShown] = useState<NearbyOffer | null>(null);
  
  // Sample data
  const quickDestinations: QuickDestination[] = [
    { id: '1', name: 'Home', icon: Home, distance: '2.3 mi', lat: 41.4850, lng: -81.7100 },
    { id: '2', name: 'Work', icon: Briefcase, distance: '5.1 mi', lat: 41.5200, lng: -81.6800 },
    { id: '3', name: "Mom's", icon: Heart, distance: '8.7 mi', lat: 41.4500, lng: -81.7500 },
  ];
  
  const nearbyOffers: NearbyOffer[] = [
    { id: '1', name: 'Coffee House', discount: '15% off', gems: 50, distance: '0.3 mi', lat: 41.5010, lng: -81.6920, category: 'food' },
    { id: '2', name: 'Auto Spa', discount: 'Free wash', gems: 100, distance: '0.8 mi', lat: 41.4980, lng: -81.6980, category: 'service' },
    { id: '3', name: 'Gas Station', discount: '$0.10/gal', gems: 25, distance: '0.2 mi', lat: 41.5000, lng: -81.6960, category: 'gas', isPersonalized: true },
    { id: '4', name: 'Quick Mart', discount: '20% off', gems: 35, distance: '0.5 mi', lat: 41.4970, lng: -81.6900, category: 'retail', isPersonalized: true },
  ];
  
  // Personalized offers (2 per driver based on visit history)
  const personalizedOffers = nearbyOffers.filter(o => o.isPersonalized);
  
  // Simulate Orion announcing personalized offer
  useEffect(() => {
    if (personalizedOffers.length > 0 && !personalizedOfferShown) {
      const timer = setTimeout(() => {
        setPersonalizedOfferShown(personalizedOffers[0]);
        setOrionSpeaking(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [personalizedOffers, personalizedOfferShown]);
  
  const handleOfferResponse = (response: 'accept' | 'skip') => {
    setOrionSpeaking(false);
    if (response === 'accept') {
      // Add offer location as a stop (would integrate with routing)
      console.log('Adding offer as stop:', personalizedOfferShown);
    }
    setPersonalizedOfferShown(null);
  };
  
  const handleTabChange = (tab: string) => {
    if (tab === 'gems') {
      onNavigate('rewards');
    } else if (tab === 'family') {
      onNavigate('family');
    } else if (tab === 'profile') {
      onNavigate('profile');
    } else {
      setActiveTab(tab);
    }
  };
  
  // Map tile URLs
  const getTileUrl = () => {
    switch (mapStyle) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'terrain':
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      default:
        return isDark 
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    }
  };
  
  const routeCoords: [number, number][] = destination ? [
    userLocation,
    [(userLocation[0] + destination[0]) / 2 + 0.005, (userLocation[1] + destination[1]) / 2 - 0.003],
    destination
  ] : [];

  return (
    <div className={`relative h-screen w-full overflow-hidden ${isDark ? 'bg-[#0A0E16]' : 'bg-gray-100'}`}>
      {/* OpenStreetMap */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url={getTileUrl()} />
          <MapController center={mapCenter} zoom={mapZoom} />
          
          {/* User location marker */}
          <Marker position={userLocation} icon={userIcon}>
            <Popup>Your location</Popup>
          </Marker>
          
          {/* Destination marker */}
          {destination && (
            <Marker position={destination} icon={destinationIcon}>
              <Popup>Destination</Popup>
            </Marker>
          )}
          
          {/* Route line */}
          {routeCoords.length > 0 && (
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: '#00DFA2',
                weight: 5,
                opacity: 0.8,
              }}
            />
          )}
          
          {/* Offer markers */}
          {nearbyOffers.map(offer => (
            <Marker
              key={offer.id}
              position={[offer.lat, offer.lng]}
              icon={offer.category === 'gas' ? gasIcon : offerIcon}
            >
              <Popup>
                <div className="text-center">
                  <strong>{offer.name}</strong>
                  <br />
                  <span className="text-green-600">{offer.discount}</span>
                  <br />
                  <span className="text-purple-600">{offer.gems} gems</span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Map Controls */}
      <MapControls
        onZoomIn={() => setMapZoom(z => Math.min(z + 1, 18))}
        onZoomOut={() => setMapZoom(z => Math.max(z - 1, 5))}
        onRecenter={() => setMapCenter(userLocation)}
        onToggleLayers={() => setMapStyle(s => s === 'standard' ? 'satellite' : s === 'satellite' ? 'terrain' : 'standard')}
      />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('menu')}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
              isDark ? 'bg-[#1A1F2E]/90 backdrop-blur-xl border border-white/10' : 'bg-white/90 backdrop-blur-xl border border-gray-200'
            }`}
            data-testid="map-menu-btn"
          >
            <Menu size={22} className={isDark ? 'text-white' : 'text-gray-800'} />
          </button>
          
          <div
            onClick={() => setShowSearch(true)}
            className={`flex-1 h-12 rounded-2xl px-4 flex items-center gap-3 shadow-lg cursor-pointer ${
              isDark ? 'bg-[#1A1F2E]/90 backdrop-blur-xl border border-white/10' : 'bg-white/90 backdrop-blur-xl border border-gray-200'
            }`}
          >
            <Search size={18} className={isDark ? 'text-white/40' : 'text-gray-400'} />
            <span className={isDark ? 'text-white/40' : 'text-gray-400'}>Where to?</span>
          </div>
        </div>

        {/* Quick Destinations */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
          {quickDestinations.map((dest) => (
            <button
              key={dest.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                isDark 
                  ? 'bg-[#1A1F2E]/80 backdrop-blur-xl border border-white/10 text-white hover:border-[#00DFA2]/50' 
                  : 'bg-white/80 backdrop-blur-xl border border-gray-200 text-gray-800 hover:border-[#00DFA2]'
              }`}
            >
              <dest.icon size={16} className={isDark ? 'text-white/60' : 'text-gray-500'} />
              <span className="font-medium">{dest.name}</span>
              <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{dest.distance}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Action Buttons - Right Side */}
      <div className="absolute right-4 top-1/3 z-[1000] flex flex-col gap-3">
        <button 
          onClick={onOpenPhotoCapture}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all hover:scale-105 ${
            isDark ? 'bg-[#1A1F2E]/90 backdrop-blur-xl border border-white/10 hover:border-[#FFB800]/50' : 'bg-white/90 border border-gray-200 hover:border-[#FFB800]'
          }`}
          data-testid="map-report-btn"
          title="Report Incident"
        >
          <AlertTriangle size={22} className="text-[#FFB800]" />
        </button>
        <button 
          onClick={onOpenPhotoCapture}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all hover:scale-105 ${
            isDark ? 'bg-[#1A1F2E]/90 backdrop-blur-xl border border-white/10 hover:border-white/30' : 'bg-white/90 border border-gray-200 hover:border-gray-400'
          }`}
          data-testid="map-camera-btn"
          title="Take Photo"
        >
          <Camera size={22} className={isDark ? 'text-white' : 'text-gray-700'} />
        </button>
        <button 
          onClick={onOpenOrion}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0084FF] to-[#00FFD7] flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          data-testid="map-orion-btn"
          title="Orion AI Coach"
        >
          <Mic size={22} className="text-white" />
        </button>
      </div>

      {/* Trip Stats Bar */}
      {destination && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`absolute top-36 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-full shadow-lg flex items-center gap-4 ${
            isDark ? 'bg-[#1A1F2E]/90 backdrop-blur-xl border border-white/10' : 'bg-white/90 backdrop-blur-xl border border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Navigation size={16} className="text-[#00DFA2]" />
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>12.4 mi</span>
          </div>
          <div className={`w-px h-4 ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
          <div className="flex items-center gap-2">
            <Clock size={16} className={isDark ? 'text-white/60' : 'text-gray-500'} />
            <span className={isDark ? 'text-white/80' : 'text-gray-600'}>28 min</span>
          </div>
          <div className={`w-px h-4 ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
          <div className="flex items-center gap-2">
            <Fuel size={16} className={isDark ? 'text-white/60' : 'text-gray-500'} />
            <span className={isDark ? 'text-white/80' : 'text-gray-600'}>0.4 gal</span>
          </div>
        </motion.div>
      )}

      {/* Orion Personalized Offer Announcement */}
      <AnimatePresence>
        {orionSpeaking && personalizedOfferShown && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`absolute top-48 left-4 right-4 z-[1001] p-4 rounded-2xl shadow-xl ${
              isDark ? 'bg-gradient-to-r from-[#0084FF]/20 to-[#00DFA2]/20 border border-[#00DFA2]/30 backdrop-blur-xl' : 'bg-gradient-to-r from-blue-50 to-green-50 border border-green-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0084FF] to-[#00DFA2] flex items-center justify-center flex-shrink-0">
                <Sparkles size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-semibold ${isDark ? 'text-[#00DFA2]' : 'text-green-600'}`}>Orion AI</span>
                  <div className="flex gap-0.5">
                    {[1,2,3].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-[#00DFA2]"
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
                <p className={`text-sm mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  "Hey! <strong>{personalizedOfferShown.name}</strong> is {personalizedOfferShown.distance} away with{' '}
                  <span className="text-[#00DFA2] font-semibold">{personalizedOfferShown.discount}</span>! 
                  Would you like me to add it as a stop?"
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOfferResponse('accept')}
                    className="flex-1 h-10 rounded-xl bg-[#00DFA2] text-white font-semibold flex items-center justify-center gap-2"
                  >
                    <Navigation size={16} />
                    Take me there
                  </button>
                  <button
                    onClick={() => handleOfferResponse('skip')}
                    className={`px-4 h-10 rounded-xl font-medium ${
                      isDark ? 'bg-white/10 text-white/60' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nearby Offers Panel - Collapsible */}
      <motion.div
        className={`absolute left-0 right-0 z-[1000] rounded-t-3xl shadow-2xl ${
          isDark ? 'bg-[#1A1F2E]' : 'bg-white'
        }`}
        animate={{
          bottom: offersExpanded ? 80 : -200,
          height: offersExpanded ? 'auto' : 60
        }}
        transition={{ type: 'spring', damping: 25 }}
      >
        {/* Handle */}
        <button
          onClick={() => setOffersExpanded(!offersExpanded)}
          className="w-full py-3 flex flex-col items-center"
        >
          <div className={`w-12 h-1 rounded-full mb-2 ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Nearby Offers</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-[#00DFA2]/20 text-[#00DFA2]' : 'bg-green-100 text-green-600'}`}>
              {nearbyOffers.length}
            </span>
            {offersExpanded ? (
              <ChevronDown size={18} className={isDark ? 'text-white/60' : 'text-gray-500'} />
            ) : (
              <ChevronUp size={18} className={isDark ? 'text-white/60' : 'text-gray-500'} />
            )}
          </div>
        </button>
        
        {offersExpanded && (
          <div className="px-4 pb-4">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {nearbyOffers.map((offer) => (
                <motion.div
                  key={offer.id}
                  whileHover={{ scale: 1.02 }}
                  className={`min-w-[160px] p-3 rounded-xl border cursor-pointer transition-colors ${
                    offer.isPersonalized
                      ? isDark 
                        ? 'bg-gradient-to-br from-[#0084FF]/10 to-[#00DFA2]/10 border-[#00DFA2]/30' 
                        : 'bg-gradient-to-br from-blue-50 to-green-50 border-green-200'
                      : isDark 
                        ? 'bg-[#0A0E16] border-white/10 hover:border-[#00DFA2]/50' 
                        : 'bg-gray-50 border-gray-200 hover:border-green-300'
                  }`}
                >
                  {offer.isPersonalized && (
                    <div className="flex items-center gap-1 mb-1">
                      <Zap size={10} className="text-[#FFB800]" />
                      <span className="text-[10px] font-semibold text-[#FFB800]">FOR YOU</span>
                    </div>
                  )}
                  <div className={`text-sm font-semibold mb-1 ${
                    offer.category === 'gas' ? 'text-[#FF5A5A]' : 'text-[#00DFA2]'
                  }`}>
                    {offer.discount}
                  </div>
                  <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {offer.name}
                  </div>
                  <div className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    {offer.distance}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <Diamond size={12} className="text-[#9D4EDD]" />
                    <span className="text-xs text-[#9D4EDD] font-medium">{offer.gems}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <button
              className={`w-full mt-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              View all offers
            </button>
          </div>
        )}
      </motion.div>

      {/* Bottom Navigation */}
      <div className={`absolute bottom-0 left-0 right-0 z-[1001] ${
        isDark ? 'bg-[#0A0E16]' : 'bg-white border-t border-gray-200'
      }`}>
        <div className="flex justify-around items-center py-4 px-6">
          {[
            { id: 'map', icon: MapPin, label: 'Map' },
            { id: 'gems', icon: Gift, label: 'Gems' },
            { id: 'family', icon: Heart, label: 'Family' },
            { id: 'profile', icon: Settings, label: 'Profile' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className="flex flex-col items-center gap-1"
              data-testid={`nav-${tab.id}`}
            >
              <tab.icon
                size={24}
                className={activeTab === tab.id ? 'text-[#0084FF]' : isDark ? 'text-white/40' : 'text-gray-400'}
              />
              <span
                className={`text-xs ${
                  activeTab === tab.id ? 'text-[#0084FF] font-medium' : isDark ? 'text-white/40' : 'text-gray-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/50"
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className={`absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 ${
                isDark ? 'bg-[#1A1F2E]' : 'bg-white'
              }`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex-1 h-12 rounded-xl px-4 flex items-center gap-3 ${
                  isDark ? 'bg-[#0A0E16] border border-white/10' : 'bg-gray-100 border border-gray-200'
                }`}>
                  <Search size={18} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search destination..."
                    className={`flex-1 bg-transparent outline-none ${isDark ? 'text-white placeholder:text-white/40' : 'text-gray-800 placeholder:text-gray-400'}`}
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => setShowSearch(false)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isDark ? 'bg-[#0A0E16] border border-white/10' : 'bg-gray-100 border border-gray-200'
                  }`}
                >
                  <X size={20} className={isDark ? 'text-white/60' : 'text-gray-500'} />
                </button>
              </div>
              
              <div className={`text-sm font-medium mb-3 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Recent searches
              </div>
              
              {['Downtown Office', 'Grocery Store', 'Gas Station'].map((place, i) => (
                <button
                  key={i}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl mb-2 transition-colors ${
                    isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                  }`}
                >
                  <Clock size={16} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                  <span className={isDark ? 'text-white' : 'text-gray-800'}>{place}</span>
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DriverMapScreen;
