// SnapRoad - Customer Offer QR Code Component
// Displays QR code for purchased offers when customer is near the store

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode,
  MapPin,
  Clock,
  Gift,
  AlertCircle,
  CheckCircle,
  Navigation,
  Loader2,
  RefreshCw,
  Diamond,
  Store
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

interface CustomerOfferQRProps {
  offer: {
    id: string;
    title: string;
    description: string;
    businessName: string;
    businessLocation: {
      lat: number;
      lng: number;
      address: string;
    };
    gemsSpent: number;
    isRepeatPurchase: boolean;
    purchasedAt: string;
    expiresAt?: string;
    status: 'active' | 'redeemed' | 'expired';
  };
  isOpen: boolean;
  onClose: () => void;
}

type ProximityStatus = 'checking' | 'near' | 'far' | 'error';

export function CustomerOfferQR({ offer, isOpen, onClose }: CustomerOfferQRProps) {
  const { theme } = useSnaproadTheme();
  const [proximityStatus, setProximityStatus] = useState<ProximityStatus>('checking');
  const [distance, setDistance] = useState<number | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  
  const isDark = theme === 'dark';

  // Generate unique QR token
  const generateQRToken = () => {
    const token = `SR-${offer.id}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
    return token;
  };

  // Check proximity to store
  const checkProximity = () => {
    setProximityStatus('checking');
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          
          // Calculate distance using Haversine formula
          const R = 6371e3; // Earth's radius in meters
          const φ1 = userLat * Math.PI / 180;
          const φ2 = offer.businessLocation.lat * Math.PI / 180;
          const Δφ = (offer.businessLocation.lat - userLat) * Math.PI / 180;
          const Δλ = (offer.businessLocation.lng - userLng) * Math.PI / 180;

          const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ/2) * Math.sin(Δλ/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

          const distanceMeters = R * c;
          setDistance(distanceMeters);
          
          // Consider "near" if within 500 meters
          if (distanceMeters <= 500) {
            setProximityStatus('near');
            setQrToken(generateQRToken());
          } else {
            setProximityStatus('far');
            setQrToken(null);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setProximityStatus('error');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setProximityStatus('error');
    }
  };

  useEffect(() => {
    if (isOpen && offer.status === 'active') {
      checkProximity();
    }
  }, [isOpen, offer.status]);

  // Format distance for display
  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m away`;
    }
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  // QR code data
  const qrData = qrToken ? JSON.stringify({
    type: 'snaproad_redemption',
    offerId: offer.id,
    token: qrToken,
    customerId: 'USER_123', // Would come from auth context
    timestamp: Date.now(),
    isRepeatPurchase: offer.isRepeatPurchase
  }) : '';

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className={`rounded-3xl max-w-md w-full overflow-hidden ${isDark ? 'bg-[#1A1F2E]' : 'bg-white'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 pb-0">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00DFA2] to-[#0084FF] flex items-center justify-center">
                <Gift size={28} className="text-white" />
              </div>
              <div className="flex-1">
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                  {offer.title}
                </h2>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                  {offer.businessName}
                </p>
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div className="p-6">
            {/* Redeemed Status */}
            {offer.status === 'redeemed' && (
              <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-[#00DFA2]/10' : 'bg-[#00DFA2]/5'}`}>
                <div className="flex items-center gap-3">
                  <CheckCircle size={24} className="text-[#00DFA2]" />
                  <div>
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                      Already Redeemed
                    </p>
                    <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                      This offer was used on Feb 15, 2025
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Expired Status */}
            {offer.status === 'expired' && (
              <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-[#FF5A5A]/10' : 'bg-[#FF5A5A]/5'}`}>
                <div className="flex items-center gap-3">
                  <Clock size={24} className="text-[#FF5A5A]" />
                  <div>
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                      Offer Expired
                    </p>
                    <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                      This offer expired on {offer.expiresAt}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Active Offer - Proximity Check */}
            {offer.status === 'active' && (
              <>
                {/* Checking Proximity */}
                {proximityStatus === 'checking' && (
                  <div className="flex flex-col items-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader2 size={48} className="text-[#0084FF]" />
                    </motion.div>
                    <p className={`mt-4 font-medium ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                      Checking your location...
                    </p>
                    <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                      Please allow location access
                    </p>
                  </div>
                )}

                {/* Near Store - Show QR */}
                {proximityStatus === 'near' && qrToken && (
                  <div className="text-center">
                    <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-[#00DFA2]/10' : 'bg-[#00DFA2]/5'}`}>
                      <div className="flex items-center justify-center gap-2 text-[#00DFA2]">
                        <MapPin size={18} />
                        <span className="font-medium">You're near {offer.businessName}!</span>
                      </div>
                      {distance && (
                        <p className={`text-sm mt-1 ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>
                          {formatDistance(distance)}
                        </p>
                      )}
                    </div>
                    
                    {/* QR Code */}
                    <div className="bg-white p-6 rounded-2xl inline-block mb-4">
                      <QRCodeSVG
                        value={qrData}
                        size={200}
                        level="H"
                        includeMargin={false}
                        bgColor="#FFFFFF"
                        fgColor="#0A0E16"
                      />
                    </div>
                    
                    <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                      Show this to staff
                    </p>
                    <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                      QR code valid for 5 minutes
                    </p>

                    {/* Repeat Purchase Info */}
                    {offer.isRepeatPurchase && (
                      <div className={`mt-4 p-3 rounded-xl ${isDark ? 'bg-[#9D4EDD]/10' : 'bg-[#9D4EDD]/5'}`}>
                        <div className="flex items-center justify-center gap-2 text-[#9D4EDD]">
                          <Diamond size={16} />
                          <span className="text-sm font-medium">
                            Repeat purchase - You saved 50% gems!
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Too Far - Show Directions */}
                {proximityStatus === 'far' && (
                  <div className="text-center py-4">
                    <div className="w-20 h-20 mx-auto rounded-full bg-[#FFC24C]/10 flex items-center justify-center mb-4">
                      <MapPin size={36} className="text-[#FFC24C]" />
                    </div>
                    <p className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                      You're too far away
                    </p>
                    {distance && (
                      <p className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                        Currently {formatDistance(distance)} from {offer.businessName}
                      </p>
                    )}
                    
                    <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-[#0A0E16]' : 'bg-[#F5F8FA]'}`}>
                      <div className="flex items-center gap-3">
                        <Store size={20} className={isDark ? 'text-white/60' : 'text-[#4B5C74]'} />
                        <div className="text-left flex-1">
                          <p className={`font-medium ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                            {offer.businessName}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>
                            {offer.businessLocation.address}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0084FF] to-[#0066CC] text-white font-semibold flex items-center justify-center gap-2">
                      <Navigation size={18} />
                      Get Directions
                    </button>
                    
                    <button
                      onClick={checkProximity}
                      className={`w-full h-12 mt-3 rounded-xl flex items-center justify-center gap-2 ${
                        isDark ? 'bg-white/5 text-white/60' : 'bg-[#F5F8FA] text-[#4B5C74]'
                      }`}
                    >
                      <RefreshCw size={18} />
                      Check Again
                    </button>
                  </div>
                )}

                {/* Location Error */}
                {proximityStatus === 'error' && (
                  <div className="text-center py-4">
                    <div className="w-20 h-20 mx-auto rounded-full bg-[#FF5A5A]/10 flex items-center justify-center mb-4">
                      <AlertCircle size={36} className="text-[#FF5A5A]" />
                    </div>
                    <p className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                      Location access required
                    </p>
                    <p className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                      Please enable location services to use this offer
                    </p>
                    
                    <button
                      onClick={checkProximity}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0084FF] to-[#0066CC] text-white font-semibold flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={18} />
                      Try Again
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Purchase Info */}
            <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-[#0A0E16]' : 'bg-[#F5F8FA]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Diamond size={16} className="text-[#9D4EDD]" />
                  <span className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                    Purchased for
                  </span>
                </div>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                  {offer.gemsSpent} gems
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Clock size={16} className={isDark ? 'text-white/40' : 'text-[#8A9BB6]'} />
                  <span className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                    Purchased on
                  </span>
                </div>
                <span className={`text-sm ${isDark ? 'text-white/80' : 'text-[#0B1220]'}`}>
                  {offer.purchasedAt}
                </span>
              </div>
            </div>

            {/* Want to buy again? */}
            {offer.status === 'redeemed' && (
              <div className={`mt-4 p-4 rounded-xl border-2 border-dashed ${
                isDark ? 'border-[#00DFA2]/30 bg-[#00DFA2]/5' : 'border-[#00DFA2]/30 bg-[#00DFA2]/5'
              }`}>
                <div className="flex items-center gap-3">
                  <Gift size={24} className="text-[#00DFA2]" />
                  <div className="flex-1">
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                      Buy again for 50% less!
                    </p>
                    <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                      Only <span className="text-[#00DFA2] font-bold">{Math.floor(offer.gemsSpent * 0.5)} gems</span> for repeat purchase
                    </p>
                  </div>
                </div>
                <button className="w-full mt-3 h-11 rounded-xl bg-gradient-to-r from-[#00DFA2] to-[#00BF8F] text-white font-semibold">
                  Buy Again
                </button>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="p-6 pt-0">
            <button
              onClick={onClose}
              className={`w-full h-12 rounded-xl border ${
                isDark ? 'border-white/10 text-white/60 hover:bg-white/5' : 'border-[#E6ECF5] text-[#4B5C74] hover:bg-[#F5F8FA]'
              }`}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CustomerOfferQR;
