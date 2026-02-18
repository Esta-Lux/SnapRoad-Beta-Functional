// SnapRoad Partner Portal - QR Code Scanner
// Browser-based QR scanner for staff to validate and redeem customer offers

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode,
  Camera,
  CheckCircle,
  XCircle,
  AlertCircle,
  Flashlight,
  FlashlightOff,
  RotateCcw,
  Upload,
  User,
  Gift,
  Clock,
  MapPin,
  Scan,
  Volume2,
  VolumeX,
  History,
  ChevronRight
} from 'lucide-react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

interface QRScannerProps {
  onNavigate: (page: string) => void;
}

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error' | 'invalid';

interface RedemptionResult {
  success: boolean;
  message: string;
  offer?: {
    id: string;
    title: string;
    customerName: string;
    originalGems: number;
    discountGems?: number;
    isRepeatPurchase: boolean;
  };
  error?: string;
}

interface RecentRedemption {
  id: string;
  offerTitle: string;
  customerName: string;
  time: string;
  staffName: string;
}

const RECENT_REDEMPTIONS: RecentRedemption[] = [
  { id: '1', offerTitle: '$0.15 off per gallon', customerName: 'John D.', time: '2 min ago', staffName: 'Sarah' },
  { id: '2', offerTitle: 'Free Car Wash', customerName: 'Mary S.', time: '15 min ago', staffName: 'Mike' },
  { id: '3', offerTitle: '20% off Oil Change', customerName: 'Robert K.', time: '32 min ago', staffName: 'Sarah' },
  { id: '4', offerTitle: '$0.15 off per gallon', customerName: 'Lisa M.', time: '1 hour ago', staffName: 'Mike' },
];

export function QRScanner({ onNavigate }: QRScannerProps) {
  const { theme } = useSnaproadTheme();
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [result, setResult] = useState<RedemptionResult | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [recentRedemptions] = useState<RecentRedemption[]>(RECENT_REDEMPTIONS);
  const [showRecent, setShowRecent] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<any>(null);
  
  const isDark = theme === 'dark';

  // Stats for today
  const todayStats = {
    scanned: 47,
    successful: 45,
    failed: 2,
    staffName: 'Sarah Johnson',
    role: 'Manager',
  };

  // Initialize camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        setScanStatus('scanning');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setScanStatus('error');
      setResult({
        success: false,
        message: 'Camera access denied',
        error: 'Please allow camera access to scan QR codes'
      });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
      setScanStatus('idle');
    }
  };

  // Simulate QR code scan
  const simulateScan = () => {
    setScanStatus('scanning');
    
    // Simulate processing delay
    setTimeout(() => {
      // Random success/failure for demo
      const isSuccess = Math.random() > 0.2;
      const isRepeatPurchase = Math.random() > 0.7;
      
      if (isSuccess) {
        setScanStatus('success');
        setResult({
          success: true,
          message: 'Offer redeemed successfully!',
          offer: {
            id: 'OFF-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
            title: '$0.15 off per gallon',
            customerName: 'John Doe',
            originalGems: 50,
            discountGems: isRepeatPurchase ? 25 : undefined,
            isRepeatPurchase
          }
        });
        
        if (soundOn) {
          // Play success sound
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleluY0s+kZy4nQXC4');
          audio.play().catch(() => {});
        }
      } else {
        setScanStatus('invalid');
        setResult({
          success: false,
          message: 'Invalid or expired QR code',
          error: 'This offer has already been redeemed or is no longer valid'
        });
      }
    }, 1500);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Simulate scanning from image
      simulateScan();
    }
  };

  // Reset scanner
  const resetScanner = () => {
    setScanStatus('idle');
    setResult(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6" data-testid="qr-scanner-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
            QR Code Scanner
          </h1>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>
            Scan customer QR codes to validate and redeem offers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundOn(!soundOn)}
            className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
              isDark ? 'border-white/10 hover:bg-white/5' : 'border-[#E6ECF5] hover:bg-[#F5F8FA]'
            }`}
          >
            {soundOn ? <Volume2 size={20} className="text-[#00DFA2]" /> : <VolumeX size={20} className={isDark ? 'text-white/40' : 'text-[#8A9BB6]'} />}
          </button>
          <button
            onClick={() => setShowRecent(!showRecent)}
            className={`h-11 px-4 rounded-xl flex items-center gap-2 border ${
              showRecent ? 'bg-[#0084FF] text-white border-[#0084FF]' : isDark ? 'border-white/10 text-white/60 hover:text-white hover:bg-white/5' : 'border-[#E6ECF5] text-[#4B5C74] hover:bg-[#F5F8FA]'
            }`}
          >
            <History size={18} />
            Recent
          </button>
        </div>
      </div>

      {/* Staff Info Bar */}
      <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0084FF] to-[#0066CC] flex items-center justify-center text-white font-bold">
              {todayStats.staffName.charAt(0)}
            </div>
            <div>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                Logged in as {todayStats.staffName}
              </p>
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>
                {todayStats.role}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>{todayStats.scanned}</p>
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>Scanned Today</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-[#00DFA2]">{todayStats.successful}</p>
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>Successful</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-[#FF5A5A]">{todayStats.failed}</p>
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>Failed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scanner Area */}
        <div className={`lg:col-span-2 rounded-xl border overflow-hidden ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
          <div className="p-6">
            <div className="relative aspect-square max-w-md mx-auto rounded-2xl overflow-hidden bg-black">
              {/* Camera Feed */}
              <video
                ref={videoRef}
                className={`absolute inset-0 w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scanner Overlay */}
              {scanStatus === 'scanning' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-64 h-64">
                    {/* Scanning corners */}
                    <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-[#00DFA2] rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-[#00DFA2] rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-[#00DFA2] rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-[#00DFA2] rounded-br-lg" />
                    
                    {/* Scanning line animation */}
                    <motion.div
                      className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-[#00DFA2] to-transparent"
                      initial={{ top: 0 }}
                      animate={{ top: '100%' }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                </div>
              )}
              
              {/* Idle State */}
              {scanStatus === 'idle' && !cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0E16]">
                  <div className="w-20 h-20 rounded-2xl bg-[#00DFA2]/10 flex items-center justify-center mb-4">
                    <QrCode size={40} className="text-[#00DFA2]" />
                  </div>
                  <p className="text-white/80 text-lg font-medium mb-2">Ready to Scan</p>
                  <p className="text-white/40 text-sm">Press Start to activate camera</p>
                </div>
              )}
              
              {/* Success State */}
              {scanStatus === 'success' && result && (
                <motion.div 
                  className="absolute inset-0 flex flex-col items-center justify-center bg-[#00DFA2]/20 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className="w-24 h-24 rounded-full bg-[#00DFA2] flex items-center justify-center mb-4"
                  >
                    <CheckCircle size={48} className="text-white" />
                  </motion.div>
                  <p className="text-white text-xl font-bold mb-2">Offer Redeemed!</p>
                  <p className="text-white/80">{result.offer?.title}</p>
                </motion.div>
              )}
              
              {/* Error/Invalid State */}
              {(scanStatus === 'error' || scanStatus === 'invalid') && result && (
                <motion.div 
                  className="absolute inset-0 flex flex-col items-center justify-center bg-[#FF5A5A]/20 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className="w-24 h-24 rounded-full bg-[#FF5A5A] flex items-center justify-center mb-4"
                  >
                    <XCircle size={48} className="text-white" />
                  </motion.div>
                  <p className="text-white text-xl font-bold mb-2">{result.message}</p>
                  <p className="text-white/60 text-sm text-center px-8">{result.error}</p>
                </motion.div>
              )}
            </div>
            
            {/* Scanner Controls */}
            <div className="flex items-center justify-center gap-4 mt-6">
              {!cameraActive && scanStatus === 'idle' ? (
                <>
                  <button
                    onClick={startCamera}
                    className="h-14 px-8 rounded-xl bg-gradient-to-r from-[#00DFA2] to-[#00BF8F] text-white font-semibold flex items-center gap-2 hover:shadow-lg transition-shadow"
                    data-testid="start-scanner-btn"
                  >
                    <Camera size={22} />
                    Start Scanner
                  </button>
                  <label className={`h-14 px-6 rounded-xl flex items-center gap-2 border cursor-pointer ${
                    isDark ? 'border-white/10 text-white/60 hover:bg-white/5' : 'border-[#E6ECF5] text-[#4B5C74] hover:bg-[#F5F8FA]'
                  }`}>
                    <Upload size={20} />
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </>
              ) : scanStatus === 'scanning' ? (
                <>
                  <button
                    onClick={simulateScan}
                    className="h-14 px-8 rounded-xl bg-[#0084FF] text-white font-semibold flex items-center gap-2"
                  >
                    <Scan size={22} />
                    Simulate Scan
                  </button>
                  <button
                    onClick={() => setFlashOn(!flashOn)}
                    className={`w-14 h-14 rounded-xl flex items-center justify-center border ${
                      flashOn ? 'bg-[#FFC24C] text-white border-[#FFC24C]' : isDark ? 'border-white/10 text-white/60' : 'border-[#E6ECF5] text-[#4B5C74]'
                    }`}
                  >
                    {flashOn ? <Flashlight size={22} /> : <FlashlightOff size={22} />}
                  </button>
                  <button
                    onClick={stopCamera}
                    className={`w-14 h-14 rounded-xl flex items-center justify-center border ${
                      isDark ? 'border-white/10 text-white/60 hover:bg-white/5' : 'border-[#E6ECF5] text-[#4B5C74] hover:bg-[#F5F8FA]'
                    }`}
                  >
                    <XCircle size={22} />
                  </button>
                </>
              ) : (
                <button
                  onClick={resetScanner}
                  className="h-14 px-8 rounded-xl bg-gradient-to-r from-[#00DFA2] to-[#00BF8F] text-white font-semibold flex items-center gap-2 hover:shadow-lg transition-shadow"
                  data-testid="scan-next-btn"
                >
                  <RotateCcw size={22} />
                  Scan Next
                </button>
              )}
            </div>
          </div>
          
          {/* Result Details */}
          <AnimatePresence>
            {result && scanStatus === 'success' && result.offer && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`border-t ${isDark ? 'border-white/10 bg-[#0A0E16]' : 'border-[#E6ECF5] bg-[#F5F8FA]'}`}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-[#00DFA2]/10 flex items-center justify-center flex-shrink-0">
                      <Gift size={28} className="text-[#00DFA2]" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                        {result.offer.title}
                      </h3>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="flex items-center gap-2">
                          <User size={16} className={isDark ? 'text-white/40' : 'text-[#8A9BB6]'} />
                          <span className={isDark ? 'text-white/80' : 'text-[#4B5C74]'}>
                            {result.offer.customerName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Gift size={16} className={isDark ? 'text-white/40' : 'text-[#8A9BB6]'} />
                          <span className={isDark ? 'text-white/80' : 'text-[#4B5C74]'}>
                            {result.offer.originalGems} gems
                            {result.offer.isRepeatPurchase && (
                              <span className="text-[#00DFA2] ml-1">(50% off repeat)</span>
                            )}
                          </span>
                        </div>
                      </div>
                      {result.offer.isRepeatPurchase && (
                        <div className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-[#00DFA2]/10' : 'bg-[#00DFA2]/5'}`}>
                          <p className="text-[#00DFA2] text-sm font-medium">
                            Repeat customer! They paid {result.offer.discountGems} gems (50% off)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent Redemptions / Instructions */}
        <div className="space-y-4">
          {/* Instructions Card */}
          <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
            <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
              How to Scan
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0084FF]/10 flex items-center justify-center flex-shrink-0 text-[#0084FF] text-xs font-bold">
                  1
                </div>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                  Click "Start Scanner" to activate camera
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0084FF]/10 flex items-center justify-center flex-shrink-0 text-[#0084FF] text-xs font-bold">
                  2
                </div>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                  Point camera at customer's QR code
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0084FF]/10 flex items-center justify-center flex-shrink-0 text-[#0084FF] text-xs font-bold">
                  3
                </div>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                  Verify offer details and confirm redemption
                </p>
              </div>
            </div>
          </div>

          {/* Tips Card */}
          <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#FFC24C]/5 border-[#FFC24C]/20' : 'bg-[#FFC24C]/5 border-[#FFC24C]/20'}`}>
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-[#FFC24C] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                  Important
                </h4>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                  Customer must be physically present and near your location for QR code to be valid. Check customer ID if offer value exceeds $20.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Redemptions */}
          <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                Recent Redemptions
              </h3>
              <button className="text-[#0084FF] text-sm font-medium">View All</button>
            </div>
            <div className="space-y-3">
              {recentRedemptions.slice(0, 4).map((redemption) => (
                <div 
                  key={redemption.id}
                  className={`p-3 rounded-lg ${isDark ? 'bg-[#0A0E16]' : 'bg-[#F5F8FA]'}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                        {redemption.offerTitle}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>
                        {redemption.customerName} • by {redemption.staffName}
                      </p>
                    </div>
                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>
                      {redemption.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRScanner;
