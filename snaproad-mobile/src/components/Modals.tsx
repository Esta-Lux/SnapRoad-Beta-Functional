// SnapRoad Mobile - Additional Modals
// Road Reports, Quick Photo, Full Offers, Trip History, Leaderboard, Friends Hub

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Colors
const Colors = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  emerald: '#10B981',
  teal: '#14B8A6',
  amber: '#F59E0B',
  orange: '#F97316',
  purple: '#8B5CF6',
  pink: '#EC4899',
  green: '#22C55E',
  red: '#EF4444',
  yellow: '#FBBF24',
  background: '#0F172A',
  backgroundDark: '#020617',
  surface: '#1E293B',
  surfaceLight: '#334155',
  surfaceLighter: '#475569',
  white: '#FFFFFF',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  gem: '#A855F7',
  cyan: '#06B6D4',
};

// ============================================
// TYPES
// ============================================
interface RoadReport {
  id: number;
  user_id: string;
  type: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  upvotes: number;
  upvoters: string[];
  created_at: string;
  expires_at: string;
  verified: boolean;
  photo_url?: string;
}

interface Offer {
  id: number;
  business_name: string;
  business_type: string;
  description: string;
  discount_percent: number;
  gems_reward: number;
  lat: number;
  lng: number;
  expires_at: string;
  is_admin_offer: boolean;
  is_premium_offer: boolean;
  redeemed: boolean;
}

interface Trip {
  id: number;
  date: string;
  time: string;
  origin: string;
  destination: string;
  distance: number;
  duration: number;
  safety_score: number;
  gems_earned: number;
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  safety_score: number;
  gems: number;
  level: number;
  state: string;
  badges_count: number;
  total_miles: number;
  is_premium: boolean;
}

interface Friend {
  id: string;
  name: string;
  safety_score: number;
  level: number;
  state: string;
}

// ============================================
// REPORT TYPES CONFIG
// ============================================
const REPORT_TYPES = [
  { type: 'hazard', label: 'Hazard', icon: 'warning', color: Colors.amber },
  { type: 'accident', label: 'Accident', icon: 'car', color: Colors.red },
  { type: 'construction', label: 'Construction', icon: 'construct', color: Colors.orange },
  { type: 'police', label: 'Police', icon: 'shield', color: Colors.primary },
  { type: 'weather', label: 'Weather', icon: 'cloud', color: Colors.surfaceLighter },
];

// Mock Data
const mockReports: RoadReport[] = [
  { id: 1, user_id: '123456', type: 'hazard', title: 'Pothole on Main St', description: 'Large pothole in right lane', lat: 39.9612, lng: -82.9988, upvotes: 5, upvoters: [], created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(), verified: true },
  { id: 2, user_id: '234567', type: 'construction', title: 'Road work ahead', description: 'Lane closure on I-71', lat: 39.9700, lng: -83.0050, upvotes: 12, upvoters: [], created_at: new Date(Date.now() - 3600000).toISOString(), expires_at: new Date(Date.now() + 172800000).toISOString(), verified: false },
  { id: 3, user_id: '345678', type: 'accident', title: 'Minor fender bender', description: 'Blocking shoulder', lat: 39.9550, lng: -82.9900, upvotes: 8, upvoters: [], created_at: new Date(Date.now() - 7200000).toISOString(), expires_at: new Date(Date.now() + 43200000).toISOString(), verified: true },
];

const mockOffers: Offer[] = [
  { id: 1, business_name: 'Shell', business_type: 'gas', description: '15¢ off per gallon', discount_percent: 6, gems_reward: 50, lat: 39.9612, lng: -82.9988, expires_at: '2025-12-31', is_admin_offer: false, is_premium_offer: false, redeemed: false },
  { id: 2, business_name: 'Starbucks', business_type: 'cafe', description: 'Free drink upgrade', discount_percent: 18, gems_reward: 75, lat: 39.9650, lng: -82.9950, expires_at: '2025-12-31', is_admin_offer: false, is_premium_offer: true, redeemed: false },
  { id: 3, business_name: 'Quick Clean', business_type: 'carwash', description: '20% off premium wash', discount_percent: 20, gems_reward: 40, lat: 39.9580, lng: -83.0020, expires_at: '2025-12-31', is_admin_offer: false, is_premium_offer: false, redeemed: false },
  { id: 4, business_name: 'Chipotle', business_type: 'restaurant', description: 'Free chips & guac', discount_percent: 15, gems_reward: 60, lat: 39.9700, lng: -82.9880, expires_at: '2025-12-31', is_admin_offer: false, is_premium_offer: false, redeemed: true },
  { id: 5, business_name: 'BP Gas', business_type: 'gas', description: '10¢ off per gallon', discount_percent: 4, gems_reward: 35, lat: 39.9520, lng: -83.0100, expires_at: '2025-12-31', is_admin_offer: false, is_premium_offer: false, redeemed: false },
];

const mockTrips: Trip[] = [
  { id: 1, date: 'Dec 16, 2025', time: '8:30 AM', origin: 'Home', destination: 'Work', distance: 12.5, duration: 25, safety_score: 95, gems_earned: 125 },
  { id: 2, date: 'Dec 15, 2025', time: '5:45 PM', origin: 'Work', destination: 'Gym', distance: 4.2, duration: 10, safety_score: 98, gems_earned: 85 },
  { id: 3, date: 'Dec 15, 2025', time: '8:15 AM', origin: 'Home', destination: 'Work', distance: 12.5, duration: 28, safety_score: 92, gems_earned: 110 },
  { id: 4, date: 'Dec 14, 2025', time: '6:00 PM', origin: 'Work', destination: 'Home', distance: 12.8, duration: 32, safety_score: 88, gems_earned: 95 },
  { id: 5, date: 'Dec 14, 2025', time: '8:00 AM', origin: 'Home', destination: 'Work', distance: 12.5, duration: 24, safety_score: 97, gems_earned: 130 },
];

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, id: '111111', name: 'Sarah M.', safety_score: 98, gems: 125000, level: 42, state: 'OH', badges_count: 28, total_miles: 15420, is_premium: true },
  { rank: 2, id: '222222', name: 'Mike J.', safety_score: 97, gems: 98500, level: 38, state: 'OH', badges_count: 24, total_miles: 12800, is_premium: true },
  { rank: 3, id: '333333', name: 'Emily R.', safety_score: 96, gems: 87200, level: 35, state: 'OH', badges_count: 22, total_miles: 11200, is_premium: false },
  { rank: 4, id: '444444', name: 'David K.', safety_score: 95, gems: 76800, level: 32, state: 'OH', badges_count: 19, total_miles: 9800, is_premium: true },
  { rank: 5, id: '555555', name: 'Lisa P.', safety_score: 94, gems: 65400, level: 29, state: 'OH', badges_count: 17, total_miles: 8500, is_premium: false },
  { rank: 6, id: '666666', name: 'Tom W.', safety_score: 93, gems: 54200, level: 26, state: 'OH', badges_count: 15, total_miles: 7200, is_premium: false },
  { rank: 7, id: '777777', name: 'Anna S.', safety_score: 92, gems: 48700, level: 24, state: 'OH', badges_count: 14, total_miles: 6800, is_premium: true },
];

const mockFriends: Friend[] = [
  { id: '234567', name: 'John D.', safety_score: 94, level: 28, state: 'OH' },
  { id: '345678', name: 'Amy L.', safety_score: 91, level: 22, state: 'CA' },
  { id: '456789', name: 'Chris M.', safety_score: 96, level: 35, state: 'TX' },
];

// ============================================
// ROAD REPORTS MODAL
// ============================================
export function RoadReportsModal({
  visible,
  onClose,
  currentUserId,
}: {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
}) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'nearby' | 'my'>('nearby');
  const [showCreate, setShowCreate] = useState(false);
  const [reports, setReports] = useState<RoadReport[]>(mockReports);
  const [newReport, setNewReport] = useState({ type: 'hazard', title: '', description: '' });

  const stats = {
    total_reports: reports.filter(r => r.user_id === currentUserId).length,
    total_upvotes: 23,
    gems_from_upvotes: 230,
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const handleCreateReport = () => {
    if (!newReport.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    const report: RoadReport = {
      id: Date.now(),
      user_id: currentUserId,
      type: newReport.type,
      title: newReport.title,
      description: newReport.description,
      lat: 39.9612,
      lng: -82.9988,
      upvotes: 0,
      upvoters: [],
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      verified: false,
    };
    setReports([report, ...reports]);
    setShowCreate(false);
    setNewReport({ type: 'hazard', title: '', description: '' });
    Alert.alert('Success', 'Report posted! +500 XP earned');
  };

  const handleUpvote = (reportId: number) => {
    setReports(reports.map(r => 
      r.id === reportId ? { ...r, upvotes: r.upvotes + 1, upvoters: [...r.upvoters, currentUserId] } : r
    ));
  };

  const getReportConfig = (type: string) => REPORT_TYPES.find(t => t.type === type) || REPORT_TYPES[0];

  const myReports = reports.filter(r => r.user_id === currentUserId);
  const displayReports = activeTab === 'nearby' ? reports : myReports;

  return (
    <Modal visible={visible} animationType="slide" testID="road-reports-modal">
      <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
        {/* Header */}
        <LinearGradient colors={[Colors.amber, Colors.orange]} style={styles.reportHeader}>
          <View style={styles.reportHeaderRow}>
            <TouchableOpacity onPress={onClose} testID="reports-close">
              <Ionicons name="chevron-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.flex1}>
              <Text style={styles.reportTitle}>Road Reports</Text>
              <Text style={styles.reportSubtitle}>Help other drivers stay safe</Text>
            </View>
            <TouchableOpacity style={styles.createReportBtn} onPress={() => setShowCreate(true)} testID="create-report-btn">
              <Ionicons name="add" size={16} color={Colors.white} />
              <Text style={styles.createReportText}>Report</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total_reports}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total_upvotes}</Text>
            <Text style={styles.statLabel}>Upvotes</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.gemStatRow}>
              <Ionicons name="diamond" size={12} color={Colors.gem} />
              <Text style={styles.statValue}>{stats.gems_from_upvotes}</Text>
            </View>
            <Text style={styles.statLabel}>Gems Earned</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'nearby' && styles.tabActive]}
            onPress={() => setActiveTab('nearby')}
            testID="tab-nearby"
          >
            <Text style={[styles.tabText, activeTab === 'nearby' && styles.tabTextActive]}>Nearby Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'my' && styles.tabActive]}
            onPress={() => setActiveTab('my')}
            testID="tab-my-reports"
          >
            <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>My Reports</Text>
          </TouchableOpacity>
        </View>

        {/* Reports List */}
        <ScrollView style={styles.flex1} contentContainerStyle={styles.reportsContent}>
          {displayReports.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="location" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No reports yet</Text>
              <Text style={styles.emptySubtitle}>Be the first to help other drivers!</Text>
            </View>
          ) : (
            displayReports.map(report => {
              const config = getReportConfig(report.type);
              const hasUpvoted = report.upvoters.includes(currentUserId);
              const isOwn = report.user_id === currentUserId;
              
              return (
                <View key={report.id} style={styles.reportCard} testID={`report-${report.id}`}>
                  <View style={styles.reportCardRow}>
                    <View style={[styles.reportIconBox, { backgroundColor: `${config.color}30` }]}>
                      <Ionicons name={config.icon as any} size={20} color={config.color} />
                    </View>
                    <View style={styles.flex1}>
                      <View style={styles.reportTitleRow}>
                        <Text style={styles.reportCardTitle} numberOfLines={1}>{report.title}</Text>
                        {report.verified && (
                          <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedText}>✓</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.reportCardDesc} numberOfLines={2}>{report.description}</Text>
                      <View style={styles.reportMetaRow}>
                        <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                        <Text style={styles.reportMetaText}>{formatTimeAgo(report.created_at)}</Text>
                        <Ionicons name="location-outline" size={12} color={Colors.textMuted} style={{ marginLeft: 10 }} />
                        <Text style={styles.reportMetaText}>{report.lat.toFixed(3)}, {report.lng.toFixed(3)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.upvoteBtn,
                        hasUpvoted && styles.upvoteBtnActive,
                        isOwn && styles.upvoteBtnDisabled,
                      ]}
                      onPress={() => !isOwn && !hasUpvoted && handleUpvote(report.id)}
                      disabled={isOwn || hasUpvoted}
                      testID={`upvote-${report.id}`}
                    >
                      <Ionicons name={hasUpvoted ? 'thumbs-up' : 'thumbs-up-outline'} size={16} color={hasUpvoted ? Colors.amber : Colors.textSecondary} />
                      <Text style={[styles.upvoteCount, hasUpvoted && styles.upvoteCountActive]}>{report.upvotes}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Create Report Modal */}
        <Modal visible={showCreate} animationType="slide" transparent>
          <View style={styles.createModalOverlay}>
            <View style={styles.createModalContent}>
              <View style={styles.createModalHeader}>
                <Text style={styles.createModalTitle}>New Report</Text>
                <TouchableOpacity onPress={() => setShowCreate(false)}>
                  <Ionicons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Report Type</Text>
              <View style={styles.typeGrid}>
                {REPORT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.type}
                    style={[styles.typeBtn, newReport.type === t.type && { borderColor: t.color, backgroundColor: `${t.color}20` }]}
                    onPress={() => setNewReport(prev => ({ ...prev, type: t.type }))}
                    testID={`type-${t.type}`}
                  >
                    <Ionicons name={t.icon as any} size={16} color={newReport.type === t.type ? t.color : Colors.textSecondary} />
                    <Text style={[styles.typeBtnText, newReport.type === t.type && { color: t.color }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.textInput}
                placeholder="Brief title (e.g., 'Pothole on Main St')"
                placeholderTextColor={Colors.textMuted}
                value={newReport.title}
                onChangeText={t => setNewReport(prev => ({ ...prev, title: t }))}
                testID="report-title-input"
              />

              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Additional details (optional)"
                placeholderTextColor={Colors.textMuted}
                value={newReport.description}
                onChangeText={t => setNewReport(prev => ({ ...prev, description: t }))}
                multiline
                numberOfLines={3}
                testID="report-description-input"
              />

              <TouchableOpacity style={styles.photoBtn}>
                <Ionicons name="camera" size={18} color={Colors.textSecondary} />
                <Text style={styles.photoBtnText}>Add Photo (coming soon)</Text>
              </TouchableOpacity>

              <View style={styles.xpInfoBox}>
                <Text style={styles.xpInfoTitle}>+500 XP for posting</Text>
                <Text style={styles.xpInfoSubtitle}>+10 gems for each upvote you receive</Text>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, !newReport.title.trim() && styles.submitBtnDisabled]}
                onPress={handleCreateReport}
                disabled={!newReport.title.trim()}
                testID="submit-report-btn"
              >
                <Ionicons name="send" size={18} color={Colors.white} />
                <Text style={styles.submitBtnText}>Post Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

// ============================================
// QUICK PHOTO REPORT MODAL
// ============================================
export function QuickPhotoModal({
  visible,
  onClose,
  currentLocation,
  isMoving = false,
  currentSpeed = 0,
}: {
  visible: boolean;
  onClose: () => void;
  currentLocation: { lat: number; lng: number };
  isMoving?: boolean;
  currentSpeed?: number;
}) {
  const insets = useSafeAreaInsets();
  const [isPassengerMode, setIsPassengerMode] = useState(false);
  const [showSafetyWarning, setShowSafetyWarning] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [reportType, setReportType] = useState('hazard');

  const canTakePhoto = !isMoving || isPassengerMode || currentSpeed < 10;

  useEffect(() => {
    if (visible && isMoving && !isPassengerMode && currentSpeed >= 10) {
      setShowSafetyWarning(true);
    }
  }, [visible, isMoving, isPassengerMode, currentSpeed]);

  const handleCameraPress = () => {
    if (!canTakePhoto) {
      setShowSafetyWarning(true);
      return;
    }
    // In real app, would open camera
    Alert.alert('Camera', 'Camera integration coming soon');
  };

  const handleGalleryPress = () => {
    // In real app, would open gallery
    Alert.alert('Gallery', 'Gallery integration coming soon');
  };

  const handleSubmit = () => {
    if (!selectedImage) return;
    Alert.alert('Success', 'Report posted! +500 XP earned');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" testID="quick-photo-modal">
      <View style={[styles.photoModalContainer, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.photoModalHeader}>
          <TouchableOpacity onPress={onClose} testID="photo-report-close">
            <Ionicons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.photoModalTitle}>Quick Report</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Safety Warning */}
        {showSafetyWarning && (
          <View style={styles.safetyOverlay}>
            <View style={styles.safetyContent}>
              <View style={styles.safetyIconBox}>
                <Ionicons name="warning" size={32} color={Colors.amber} />
              </View>
              <Text style={styles.safetyTitle}>Keep Your Eyes on the Road</Text>
              <Text style={styles.safetyDesc}>
                Using your phone while driving isn't safe. Ask a passenger to take the photo, or pull over safely.
              </Text>

              <View style={styles.orionSpeaking}>
                <View style={styles.orionDot} />
                <Text style={styles.orionText}>Orion: "Phone use while driving isn't safe."</Text>
              </View>

              <TouchableOpacity
                style={styles.passengerBtn}
                onPress={() => { setIsPassengerMode(true); setShowSafetyWarning(false); }}
                testID="enable-passenger-mode"
              >
                <Ionicons name="person" size={18} color={Colors.white} />
                <Text style={styles.passengerBtnText}>I'm a Passenger</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.galleryBtn}
                onPress={() => { setShowSafetyWarning(false); handleGalleryPress(); }}
              >
                <Ionicons name="images" size={18} color={Colors.white} />
                <Text style={styles.galleryBtnText}>Choose from Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setShowSafetyWarning(false); onClose(); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Preview Area */}
        <View style={styles.previewArea}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewEmpty}>
              <Ionicons name="camera" size={64} color={Colors.textMuted} />
              <Text style={styles.previewEmptyText}>Take or select a photo</Text>
            </View>
          )}

          {isPassengerMode && (
            <View style={styles.passengerBadge}>
              <Ionicons name="person" size={14} color={Colors.emerald} />
              <Text style={styles.passengerBadgeText}>Passenger Mode</Text>
            </View>
          )}

          <View style={styles.locationBadge}>
            <Ionicons name="location" size={14} color={Colors.primary} />
            <Text style={styles.locationBadgeText}>
              {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
            </Text>
          </View>
        </View>

        {/* Report Type Selector */}
        {selectedImage && (
          <View style={styles.typeSelector}>
            <Text style={styles.typeSelectorLabel}>Report Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.typeSelectorRow}>
                {['hazard', 'accident', 'construction', 'police', 'weather'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeChip, reportType === type && styles.typeChipActive]}
                    onPress={() => setReportType(type)}
                  >
                    <Text style={[styles.typeChipText, reportType === type && styles.typeChipTextActive]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Action Buttons */}
        <View style={[styles.photoActions, { paddingBottom: insets.bottom + 16 }]}>
          {selectedImage ? (
            <TouchableOpacity style={styles.submitPhotoBtn} onPress={handleSubmit} testID="submit-photo-report">
              <Ionicons name="checkmark" size={20} color={Colors.white} />
              <Text style={styles.submitPhotoBtnText}>Post Report (+500 XP)</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.captureRow}>
              <TouchableOpacity
                style={[styles.captureBtn, !canTakePhoto && styles.captureBtnDisabled]}
                onPress={handleCameraPress}
                testID="take-photo-btn"
              >
                <Ionicons name="camera" size={20} color={Colors.white} />
                <Text style={styles.captureBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.galleryCapBtn} onPress={handleGalleryPress} testID="gallery-btn">
                <Ionicons name="images" size={20} color={Colors.white} />
                <Text style={styles.galleryCaptBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          {isMoving && (
            <Text style={styles.speedIndicator}>
              {currentSpeed < 10
                ? 'Low speed - Camera enabled'
                : isPassengerMode
                  ? 'Passenger mode active'
                  : 'Vehicle in motion - Use gallery or passenger mode'}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ============================================
// FULL OFFERS MODAL
// ============================================
export function OffersFullModal({
  visible,
  onClose,
  userPlan,
}: {
  visible: boolean;
  onClose: () => void;
  userPlan: 'basic' | 'premium' | null;
}) {
  const insets = useSafeAreaInsets();
  const [offers, setOffers] = useState<Offer[]>(mockOffers);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const isPremium = userPlan === 'premium';
  const discountInfo = { free_discount: 6, premium_discount: 18 };

  const getTimeRemaining = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 0) return 'Expired';
    if (diffHours < 24) return `${diffHours}h left`;
    return `${Math.floor(diffHours / 24)}d left`;
  };

  const getBusinessIcon = (type: string): string => {
    const icons: Record<string, string> = {
      gas: 'flame',
      cafe: 'cafe',
      carwash: 'car-sport',
      restaurant: 'restaurant',
      default: 'gift',
    };
    return icons[type] || icons.default;
  };

  const handleRedeem = () => {
    if (!selectedOffer) return;
    setRedeeming(true);
    setTimeout(() => {
      setOffers(offers.map(o => o.id === selectedOffer.id ? { ...o, redeemed: true } : o));
      setSelectedOffer(null);
      setRedeeming(false);
      Alert.alert('Success', `Offer redeemed! +${selectedOffer.gems_reward} gems earned`);
    }, 1000);
  };

  return (
    <Modal visible={visible} animationType="slide" testID="offers-full-modal">
      <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
        {/* Header */}
        <LinearGradient colors={[Colors.emerald, Colors.teal]} style={styles.offersHeader}>
          <View style={styles.offersHeaderRow}>
            <TouchableOpacity onPress={onClose} testID="offers-close">
              <Ionicons name="chevron-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.flex1}>
              <Text style={styles.offersTitle}>Local Offers</Text>
              <Text style={styles.offersSubtitle}>
                {isPremium ? `Premium: ${discountInfo.premium_discount}% off` : `Basic: ${discountInfo.free_discount}% off`}
              </Text>
            </View>
            {!isPremium && (
              <View style={styles.upgradeBadge}>
                <Ionicons name="flash" size={12} color={Colors.amber} />
                <Text style={styles.upgradeBadgeText}>Upgrade for {discountInfo.premium_discount}%</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Discount Info Banner */}
        <View style={styles.discountBanner}>
          <View style={[styles.discountPill, isPremium && styles.discountPillPremium]}>
            {isPremium ? (
              <>
                <Ionicons name="flash" size={14} color={Colors.white} />
                <Text style={styles.discountPillText}>{discountInfo.premium_discount}% Premium</Text>
              </>
            ) : (
              <Text style={styles.discountPillTextBasic}>{discountInfo.free_discount}% Basic</Text>
            )}
          </View>
          <Text style={styles.offersAvailable}>{offers.filter(o => !o.redeemed).length} offers available</Text>
        </View>

        {/* Offers List */}
        <ScrollView style={styles.flex1} contentContainerStyle={styles.offersListContent}>
          {offers.map(offer => (
            <TouchableOpacity
              key={offer.id}
              style={[styles.offerFullCard, offer.redeemed && styles.offerFullCardRedeemed]}
              onPress={() => !offer.redeemed && setSelectedOffer(offer)}
              disabled={offer.redeemed}
              testID={`offer-${offer.id}`}
            >
              <View style={styles.offerFullRow}>
                <View style={[styles.offerIconBox, offer.redeemed && styles.offerIconBoxRedeemed]}>
                  <Ionicons name={getBusinessIcon(offer.business_type) as any} size={24} color={offer.redeemed ? Colors.textMuted : Colors.emerald} />
                </View>
                <View style={styles.flex1}>
                  <View style={styles.offerNameRow}>
                    <Text style={styles.offerName}>{offer.business_name}</Text>
                    {offer.is_premium_offer && !isPremium && (
                      <View style={styles.premiumLockBadge}>
                        <Ionicons name="lock-closed" size={10} color={Colors.amber} />
                        <Text style={styles.premiumLockText}>+{discountInfo.premium_discount - discountInfo.free_discount}%</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.offerDesc}>{offer.description}</Text>
                  <View style={styles.offerMetaRow}>
                    <Text style={[styles.offerDiscount, offer.redeemed && styles.offerDiscountRedeemed]}>
                      {offer.discount_percent}% OFF
                    </Text>
                    <View style={styles.offerGemBadge}>
                      <Ionicons name="diamond" size={12} color={Colors.cyan} />
                      <Text style={styles.offerGemText}>+{offer.gems_reward}</Text>
                    </View>
                    <View style={styles.offerTimeBadge}>
                      <Ionicons name="time" size={12} color={Colors.textMuted} />
                      <Text style={styles.offerTimeText}>{getTimeRemaining(offer.expires_at)}</Text>
                    </View>
                  </View>
                </View>
                {offer.redeemed ? (
                  <View style={styles.redeemedCheck}>
                    <Ionicons name="checkmark" size={16} color={Colors.emerald} />
                  </View>
                ) : (
                  <View style={styles.redeemPill}>
                    <Text style={styles.redeemPillText}>Redeem</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Offer Detail Modal */}
        {selectedOffer && (
          <Modal visible={!!selectedOffer} animationType="fade" transparent>
            <TouchableOpacity style={styles.offerDetailOverlay} activeOpacity={1} onPress={() => setSelectedOffer(null)}>
              <View style={styles.offerDetailContent} onStartShouldSetResponder={() => true}>
                <LinearGradient colors={[Colors.emerald, Colors.teal]} style={styles.offerDetailHeader}>
                  <View style={styles.offerDetailIcon}>
                    <Ionicons name={getBusinessIcon(selectedOffer.business_type) as any} size={20} color={Colors.white} />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.offerDetailName} numberOfLines={1}>{selectedOffer.business_name}</Text>
                    <Text style={styles.offerDetailDesc} numberOfLines={1}>{selectedOffer.description}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedOffer(null)}>
                    <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                </LinearGradient>

                <View style={styles.offerDetailBody}>
                  <View style={styles.offerDetailStats}>
                    <View style={styles.offerDetailStat}>
                      <View style={styles.gemStatInner}>
                        <Ionicons name="diamond" size={16} color={Colors.cyan} />
                        <Text style={styles.offerDetailStatVal}>+{selectedOffer.gems_reward}</Text>
                      </View>
                      <Text style={styles.offerDetailStatLabel}>Gems</Text>
                    </View>
                    <View style={styles.offerDetailStat}>
                      <Text style={styles.offerDetailStatValGreen}>{selectedOffer.discount_percent}%</Text>
                      <Text style={styles.offerDetailStatLabel}>Your Discount</Text>
                    </View>
                  </View>

                  {!isPremium && !selectedOffer.is_admin_offer && (
                    <View style={styles.premiumUpsell}>
                      <Ionicons name="flash" size={14} color={Colors.amber} />
                      <Text style={styles.premiumUpsellText}>Premium gets {discountInfo.premium_discount}% off</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.redeemBtn, selectedOffer.redeemed && styles.redeemBtnDisabled]}
                    onPress={handleRedeem}
                    disabled={redeeming || selectedOffer.redeemed}
                    testID="redeem-offer-btn"
                  >
                    {redeeming ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : selectedOffer.redeemed ? (
                      <>
                        <Ionicons name="checkmark" size={16} color={Colors.textMuted} />
                        <Text style={styles.redeemBtnTextDisabled}>Redeemed</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={16} color={Colors.white} />
                        <Text style={styles.redeemBtnText}>Redeem Offer</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

// ============================================
// TRIP HISTORY MODAL
// ============================================
export function TripHistoryModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState<Trip[]>(mockTrips);
  const [selectedMonth, setSelectedMonth] = useState('');

  const stats = {
    total_trips: trips.length,
    total_miles: trips.reduce((acc, t) => acc + t.distance, 0),
    avg_safety_score: Math.round(trips.reduce((acc, t) => acc + t.safety_score, 0) / trips.length),
    total_gems_earned: trips.reduce((acc, t) => acc + t.gems_earned, 0),
  };

  const months = [
    { value: '', label: 'All Time' },
    { value: '2025-12', label: 'Dec 2025' },
    { value: '2025-11', label: 'Nov 2025' },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 90) return { text: Colors.emerald, bg: `${Colors.emerald}20` };
    if (score >= 75) return { text: Colors.yellow, bg: `${Colors.yellow}20` };
    return { text: Colors.red, bg: `${Colors.red}20` };
  };

  return (
    <Modal visible={visible} animationType="fade" transparent testID="trip-history-modal">
      <TouchableOpacity style={styles.tripHistoryOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.tripHistoryContent} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <LinearGradient colors={[Colors.primary, '#6366F1']} style={styles.tripHistoryHeader}>
            <View style={styles.tripHistoryHeaderRow}>
              <Text style={styles.tripHistoryTitle}>Trip History</Text>
              <TouchableOpacity style={styles.tripHistoryClose} onPress={onClose}>
                <Ionicons name="close" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.tripStats}>
              <View style={styles.tripStat}>
                <Text style={styles.tripStatVal}>{stats.total_trips}</Text>
                <Text style={styles.tripStatLabel}>Trips</Text>
              </View>
              <View style={styles.tripStat}>
                <Text style={styles.tripStatVal}>{(stats.total_miles / 1000).toFixed(1)}K</Text>
                <Text style={styles.tripStatLabel}>Miles</Text>
              </View>
              <View style={styles.tripStat}>
                <Text style={styles.tripStatVal}>{stats.avg_safety_score}</Text>
                <Text style={styles.tripStatLabel}>Avg Score</Text>
              </View>
              <View style={styles.tripStat}>
                <Text style={styles.tripStatVal}>{(stats.total_gems_earned / 1000).toFixed(1)}K</Text>
                <Text style={styles.tripStatLabel}>Gems</Text>
              </View>
            </View>

            {/* Month Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthFilter}>
              <View style={styles.monthFilterRow}>
                {months.map(m => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.monthPill, selectedMonth === m.value && styles.monthPillActive]}
                    onPress={() => setSelectedMonth(m.value)}
                  >
                    <Text style={[styles.monthPillText, selectedMonth === m.value && styles.monthPillTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </LinearGradient>

          {/* Trips List */}
          <ScrollView style={styles.tripsList}>
            {trips.map(trip => {
              const scoreColors = getScoreColor(trip.safety_score);
              return (
                <View key={trip.id} style={styles.tripCard}>
                  <View style={styles.tripCardHeader}>
                    <View style={styles.tripDateRow}>
                      <Ionicons name="calendar" size={12} color={Colors.textMuted} />
                      <Text style={styles.tripDateText}>{trip.date}</Text>
                      <Text style={styles.tripDateDot}>•</Text>
                      <Text style={styles.tripDateText}>{trip.time}</Text>
                    </View>
                    <View style={[styles.tripScoreBadge, { backgroundColor: scoreColors.bg }]}>
                      <Ionicons name="shield-checkmark" size={10} color={scoreColors.text} />
                      <Text style={[styles.tripScoreText, { color: scoreColors.text }]}>{trip.safety_score}</Text>
                    </View>
                  </View>

                  <View style={styles.tripRouteRow}>
                    <Ionicons name="location" size={14} color={Colors.emerald} />
                    <Text style={styles.tripRouteText}>{trip.origin}</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                    <Text style={styles.tripRouteText}>{trip.destination}</Text>
                  </View>

                  <View style={styles.tripFooter}>
                    <View style={styles.tripMetaRow}>
                      <Text style={styles.tripMetaText}>{trip.distance.toFixed(1)} mi</Text>
                      <Text style={styles.tripMetaDot}>•</Text>
                      <Text style={styles.tripMetaText}>{trip.duration} min</Text>
                    </View>
                    <View style={styles.tripGemsRow}>
                      <Ionicons name="diamond" size={12} color={Colors.emerald} />
                      <Text style={styles.tripGemsText}>+{trip.gems_earned}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ============================================
// LEADERBOARD MODAL
// ============================================
export function LeaderboardModal({
  visible,
  onClose,
  userId,
  userGems = 0,
}: {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userGems?: number;
}) {
  const insets = useSafeAreaInsets();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(mockLeaderboard);
  const [timeFilter, setTimeFilter] = useState<'all_time' | 'weekly' | 'monthly'>('all_time');
  const [selectedState, setSelectedState] = useState('OH');

  const myRank = 42;
  const myData = { name: 'You', safety_score: 88, gems: userGems };
  const totalUsers = 1234;

  const formatGems = (gems: number) => {
    if (gems >= 1000000) return `${(gems / 1000000).toFixed(1)}M`;
    if (gems >= 1000) return `${(gems / 1000).toFixed(1)}K`;
    return gems.toString();
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return (
      <View style={[styles.rankCircle, styles.rankGold]}>
        <Ionicons name="trophy" size={20} color={Colors.white} />
      </View>
    );
    if (rank === 2) return (
      <View style={[styles.rankCircle, styles.rankSilver]}>
        <Ionicons name="medal" size={18} color={Colors.white} />
      </View>
    );
    if (rank === 3) return (
      <View style={[styles.rankCircle, styles.rankBronze]}>
        <Ionicons name="medal" size={18} color={Colors.white} />
      </View>
    );
    return (
      <View style={styles.rankCircle}>
        <Text style={styles.rankNum}>#{rank}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent testID="leaderboard-modal">
      <TouchableOpacity style={styles.leaderboardOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.leaderboardContent} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <LinearGradient colors={[Colors.purple, Colors.pink, '#F43F5E']} style={styles.leaderboardHeader}>
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />

            <View style={styles.leaderboardHeaderRow}>
              <View style={styles.leaderboardIcon}>
                <Ionicons name="trophy" size={24} color={Colors.yellow} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.leaderboardTitle}>Leaderboard</Text>
                <View style={styles.leaderboardSubRow}>
                  <Ionicons name="people" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.leaderboardSubText}>{totalUsers.toLocaleString()} drivers competing</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.leaderboardClose} onPress={onClose} testID="leaderboard-close">
                <Ionicons name="close" size={18} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {/* Your Rank Card */}
            <View style={styles.yourRankCard}>
              <View style={styles.yourRankAvatar}>
                <Text style={styles.yourRankAvatarText}>{myData.name.charAt(0)}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.yourRankName}>{myData.name}</Text>
                <View style={styles.yourRankMeta}>
                  <Text style={styles.yourRankRank}>Rank #{myRank}</Text>
                  <Text style={styles.yourRankScore}>{myData.safety_score} pts</Text>
                </View>
              </View>
              <View style={styles.yourRankGems}>
                <Text style={styles.yourRankGemsVal}>{formatGems(myData.gems)}</Text>
                <Text style={styles.yourRankGemsLabel}>gems</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Filters */}
          <View style={styles.filtersRow}>
            <View style={styles.timeFilters}>
              {[
                { key: 'all_time', label: 'All Time', icon: 'star' },
                { key: 'weekly', label: 'Week', icon: 'calendar' },
                { key: 'monthly', label: 'Month', icon: 'trending-up' },
              ].map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.timeFilterBtn, timeFilter === f.key && styles.timeFilterBtnActive]}
                  onPress={() => setTimeFilter(f.key as any)}
                  testID={`time-${f.key}`}
                >
                  <Ionicons name={f.icon as any} size={12} color={timeFilter === f.key ? Colors.white : Colors.textMuted} />
                  <Text style={[styles.timeFilterText, timeFilter === f.key && styles.timeFilterTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Podium */}
          {leaderboard.length >= 3 && (
            <View style={styles.podium}>
              {/* 2nd */}
              <View style={styles.podiumItem}>
                <View style={styles.podiumAvatar2}>
                  <Text style={styles.podiumAvatarText}>{leaderboard[1].name.charAt(0)}</Text>
                </View>
                <View style={styles.podiumBar2}>
                  <Ionicons name="medal" size={16} color={Colors.white} />
                  <Text style={styles.podiumRankText}>2nd</Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{leaderboard[1].name}</Text>
              </View>

              {/* 1st */}
              <View style={[styles.podiumItem, styles.podiumItemFirst]}>
                <View style={styles.podiumAvatar1}>
                  <Text style={styles.podiumAvatarText}>{leaderboard[0].name.charAt(0)}</Text>
                </View>
                <View style={styles.podiumBar1}>
                  <Ionicons name="trophy" size={20} color={Colors.white} />
                  <Text style={styles.podiumRankText}>1st</Text>
                  <Text style={styles.podiumPtsText}>{leaderboard[0].safety_score} pts</Text>
                </View>
                <Text style={styles.podiumNameFirst}>{leaderboard[0].name}</Text>
              </View>

              {/* 3rd */}
              <View style={styles.podiumItem}>
                <View style={styles.podiumAvatar3}>
                  <Text style={styles.podiumAvatarText}>{leaderboard[2].name.charAt(0)}</Text>
                </View>
                <View style={styles.podiumBar3}>
                  <Ionicons name="medal" size={16} color={Colors.white} />
                  <Text style={styles.podiumRankText}>3rd</Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{leaderboard[2].name}</Text>
              </View>
            </View>
          )}

          {/* Rest of List */}
          <ScrollView style={styles.leaderboardList}>
            {leaderboard.slice(3).map(entry => {
              const isCurrentUser = entry.id === userId;
              return (
                <View key={entry.id} style={[styles.leaderboardRow, isCurrentUser && styles.leaderboardRowCurrent]}>
                  {getRankDisplay(entry.rank)}
                  <View style={styles.flex1}>
                    <View style={styles.leaderboardNameRow}>
                      <Text style={[styles.leaderboardName, isCurrentUser && styles.leaderboardNameCurrent]}>{entry.name}</Text>
                      {entry.is_premium && <Ionicons name="flash" size={12} color={Colors.yellow} />}
                    </View>
                    <View style={styles.leaderboardMetaRow}>
                      <Ionicons name="shield-checkmark" size={10} color={Colors.textMuted} />
                      <Text style={styles.leaderboardMetaText}>{entry.safety_score}</Text>
                      <Text style={styles.leaderboardMetaText}>Lvl {entry.level}</Text>
                      <Text style={styles.leaderboardMetaState}>{entry.state}</Text>
                    </View>
                  </View>
                  <View style={styles.leaderboardGemsCol}>
                    <View style={styles.leaderboardGemsRow}>
                      <Ionicons name="diamond" size={12} color={Colors.cyan} />
                      <Text style={styles.leaderboardGemsText}>{formatGems(entry.gems)}</Text>
                    </View>
                  </View>
                  {!isCurrentUser && (
                    <TouchableOpacity style={styles.challengeBtn} testID={`challenge-${entry.id}`}>
                      <Ionicons name="flash" size={16} color={Colors.white} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ============================================
// FRIENDS HUB MODAL
// ============================================
export function FriendsHubModal({
  visible,
  onClose,
  userId,
  friendsCount,
}: {
  visible: boolean;
  onClose: () => void;
  userId: string;
  friendsCount: number;
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'friends' | 'search'>('friends');
  const [friends, setFriends] = useState<Friend[]>(mockFriends);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    if (!searchId || searchId.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit ID');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setSearchResult({
        id: searchId,
        name: 'John Doe',
        safety_score: 92,
        level: 25,
        state: 'CA',
        is_friend: false,
      });
      setLoading(false);
    }, 500);
  };

  const handleAddFriend = (friendId: string) => {
    setSearchResult({ ...searchResult, is_friend: true });
    setFriends([...friends, { id: friendId, name: searchResult.name, safety_score: searchResult.safety_score, level: searchResult.level, state: searchResult.state }]);
    Alert.alert('Success', 'Friend added!');
  };

  const handleRemoveFriend = (friendId: string) => {
    setFriends(friends.filter(f => f.id !== friendId));
    Alert.alert('Removed', 'Friend removed');
  };

  return (
    <Modal visible={visible} animationType="fade" transparent testID="friends-hub-modal">
      <TouchableOpacity style={styles.friendsOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.friendsContent} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <LinearGradient colors={[Colors.primary, '#3B82F6']} style={styles.friendsHeader}>
            <View style={styles.friendsHeaderRow}>
              <Ionicons name="people" size={20} color={Colors.white} />
              <Text style={styles.friendsTitle}>Friends Hub</Text>
              <TouchableOpacity style={styles.friendsClose} onPress={onClose}>
                <Ionicons name="close" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {/* My ID Card */}
            <View style={styles.myIdCard}>
              <View>
                <Text style={styles.myIdLabel}>Your SnapRoad ID</Text>
                <Text style={styles.myIdValue}>{userId}</Text>
              </View>
              <View style={styles.myIdRight}>
                <Text style={styles.myIdLabel}>Friends</Text>
                <Text style={styles.myIdValue}>{friendsCount}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Tabs */}
          <View style={styles.friendsTabs}>
            <TouchableOpacity
              style={[styles.friendsTab, tab === 'friends' && styles.friendsTabActive]}
              onPress={() => setTab('friends')}
              testID="friends-tab"
            >
              <Text style={[styles.friendsTabText, tab === 'friends' && styles.friendsTabTextActive]}>
                My Friends ({friends.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.friendsTab, tab === 'search' && styles.friendsTabActive]}
              onPress={() => setTab('search')}
              testID="search-tab"
            >
              <Text style={[styles.friendsTabText, tab === 'search' && styles.friendsTabTextActive]}>
                Find Friends
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.friendsBody}>
            {tab === 'friends' ? (
              friends.length === 0 ? (
                <View style={styles.friendsEmpty}>
                  <Ionicons name="people" size={48} color={Colors.textMuted} />
                  <Text style={styles.friendsEmptyTitle}>No friends yet</Text>
                  <Text style={styles.friendsEmptySubtitle}>Search by ID to add friends</Text>
                </View>
              ) : (
                friends.map(friend => (
                  <View key={friend.id} style={styles.friendCard}>
                    <View style={styles.friendAvatar}>
                      <Text style={styles.friendAvatarText}>{friend.name.split(' ').map(n => n[0]).join('')}</Text>
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.friendName}>{friend.name}</Text>
                      <View style={styles.friendMeta}>
                        <Ionicons name="shield-checkmark" size={10} color={Colors.textMuted} />
                        <Text style={styles.friendMetaText}>{friend.safety_score}</Text>
                        <Text style={styles.friendMetaDot}>•</Text>
                        <Ionicons name="location" size={10} color={Colors.textMuted} />
                        <Text style={styles.friendMetaText}>{friend.state}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveFriend(friend.id)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )
            ) : (
              <View>
                {/* Search Input */}
                <View style={styles.searchRow}>
                  <View style={styles.searchInputBox}>
                    <Ionicons name="search" size={16} color={Colors.textMuted} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Enter 6-digit ID"
                      placeholderTextColor={Colors.textMuted}
                      value={searchId}
                      onChangeText={t => setSearchId(t.replace(/\D/g, '').slice(0, 6))}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.searchBtn}
                    onPress={handleSearch}
                    disabled={loading}
                    testID="search-user-btn"
                  >
                    <Text style={styles.searchBtnText}>{loading ? '...' : 'Search'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Search Result */}
                {searchResult && (
                  <View style={styles.searchResultCard}>
                    <View style={styles.searchResultHeader}>
                      <View style={styles.searchResultAvatar}>
                        <Text style={styles.searchResultAvatarText}>
                          {searchResult.name.split(' ').map((n: string) => n[0]).join('')}
                        </Text>
                      </View>
                      <View style={styles.flex1}>
                        <Text style={styles.searchResultName}>{searchResult.name}</Text>
                        <Text style={styles.searchResultId}>ID: {searchResult.id}</Text>
                      </View>
                    </View>

                    <View style={styles.searchResultStats}>
                      <View style={styles.searchResultStat}>
                        <Ionicons name="shield-checkmark" size={16} color={Colors.emerald} />
                        <Text style={styles.searchResultStatVal}>{searchResult.safety_score}</Text>
                        <Text style={styles.searchResultStatLabel}>Score</Text>
                      </View>
                      <View style={styles.searchResultStat}>
                        <Ionicons name="trophy" size={16} color={Colors.yellow} />
                        <Text style={styles.searchResultStatVal}>{searchResult.level}</Text>
                        <Text style={styles.searchResultStatLabel}>Level</Text>
                      </View>
                      <View style={styles.searchResultStat}>
                        <Ionicons name="location" size={16} color={Colors.primary} />
                        <Text style={styles.searchResultStatVal}>{searchResult.state}</Text>
                        <Text style={styles.searchResultStatLabel}>State</Text>
                      </View>
                    </View>

                    {searchResult.is_friend ? (
                      <View style={styles.alreadyFriends}>
                        <Text style={styles.alreadyFriendsText}>✓ Already friends</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addFriendBtn}
                        onPress={() => handleAddFriend(searchResult.id)}
                        testID="add-friend-btn"
                      >
                        <Ionicons name="person-add" size={16} color={Colors.white} />
                        <Text style={styles.addFriendBtnText}>Add Friend</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <Text style={styles.friendsHint}>Share your ID with friends so they can add you!</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  flex1: { flex: 1 },

  // Road Reports
  reportHeader: { padding: 16 },
  reportHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reportTitle: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  reportSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  createReportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
  createReportText: { color: Colors.white, fontSize: 14, fontWeight: '500' },
  statsBar: { backgroundColor: `${Colors.amber}15`, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: `${Colors.amber}30` },
  statItem: { alignItems: 'center' },
  statValue: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  statLabel: { color: Colors.amber, fontSize: 10, marginTop: 2 },
  gemStatRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tabsRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceLight },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.amber },
  tabText: { color: Colors.textMuted, fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: Colors.amber },
  reportsContent: { padding: 16, gap: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 14, marginTop: 8 },
  emptySubtitle: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  reportCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.surfaceLight },
  reportCardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  reportIconBox: { padding: 8, borderRadius: 10 },
  reportTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reportCardTitle: { color: Colors.white, fontSize: 14, fontWeight: '600', flex: 1 },
  verifiedBadge: { backgroundColor: `${Colors.emerald}30`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  verifiedText: { color: Colors.emerald, fontSize: 10 },
  reportCardDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },
  reportMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  reportMetaText: { color: Colors.textMuted, fontSize: 11 },
  upvoteBtn: { flexDirection: 'column', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.surfaceLight, gap: 4 },
  upvoteBtnActive: { backgroundColor: `${Colors.amber}30` },
  upvoteBtnDisabled: { opacity: 0.5 },
  upvoteCount: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  upvoteCountActive: { color: Colors.amber },

  // Create Report Modal
  createModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  createModalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  createModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  createModalTitle: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  inputLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.surfaceLight, gap: 6, borderWidth: 1, borderColor: 'transparent' },
  typeBtnText: { color: Colors.textSecondary, fontSize: 13 },
  textInput: { backgroundColor: Colors.surfaceLight, color: Colors.white, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, fontSize: 14, marginBottom: 12 },
  textArea: { height: 80, textAlignVertical: 'top' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceLight, paddingVertical: 14, borderRadius: 12, marginBottom: 12, gap: 8 },
  photoBtnText: { color: Colors.textSecondary, fontSize: 14 },
  xpInfoBox: { backgroundColor: `${Colors.amber}15`, borderWidth: 1, borderColor: `${Colors.amber}30`, borderRadius: 12, padding: 12, marginBottom: 16 },
  xpInfoTitle: { color: Colors.amber, fontSize: 14, fontWeight: '600' },
  xpInfoSubtitle: { color: `${Colors.amber}99`, fontSize: 12, marginTop: 2 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.amber, paddingVertical: 16, borderRadius: 12, gap: 8 },
  submitBtnDisabled: { backgroundColor: Colors.surfaceLight },
  submitBtnText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },

  // Quick Photo
  photoModalContainer: { flex: 1, backgroundColor: '#000' },
  photoModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: Colors.background },
  photoModalTitle: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  safetyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 10 },
  safetyContent: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, maxWidth: 320, width: '100%' },
  safetyIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${Colors.amber}30`, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  safetyTitle: { color: Colors.white, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  safetyDesc: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 16 },
  orionSpeaking: { backgroundColor: `${Colors.primary}15`, borderWidth: 1, borderColor: `${Colors.primary}30`, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  orionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  orionText: { color: Colors.primary, fontSize: 13, flex: 1 },
  passengerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.emerald, paddingVertical: 14, borderRadius: 12, gap: 8, marginBottom: 8 },
  passengerBtnText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  galleryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceLight, paddingVertical: 14, borderRadius: 12, gap: 8, marginBottom: 8 },
  galleryBtnText: { color: Colors.white, fontSize: 14, fontWeight: '500' },
  cancelText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  previewArea: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, position: 'relative' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  previewEmpty: { alignItems: 'center' },
  previewEmptyText: { color: Colors.textMuted, fontSize: 14, marginTop: 16 },
  passengerBadge: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: `${Colors.emerald}30`, borderWidth: 1, borderColor: `${Colors.emerald}50`, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  passengerBadgeText: { color: Colors.emerald, fontSize: 12, fontWeight: '500' },
  locationBadge: { position: 'absolute', bottom: 16, left: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  locationBadgeText: { color: Colors.white, fontSize: 12 },
  typeSelector: { backgroundColor: Colors.surface, padding: 12 },
  typeSelectorLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 8 },
  typeSelectorRow: { flexDirection: 'row', gap: 8 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.surfaceLight },
  typeChipActive: { backgroundColor: Colors.amber },
  typeChipText: { color: Colors.textSecondary, fontSize: 14 },
  typeChipTextActive: { color: Colors.white },
  photoActions: { backgroundColor: Colors.background, padding: 16, borderTopWidth: 1, borderTopColor: Colors.surface },
  captureRow: { flexDirection: 'row', gap: 12 },
  captureBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, gap: 8 },
  captureBtnDisabled: { backgroundColor: Colors.surfaceLight },
  captureBtnText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  galleryCapBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceLight, paddingVertical: 16, borderRadius: 16, gap: 8 },
  galleryCaptBtnText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  submitPhotoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.amber, paddingVertical: 16, borderRadius: 16, gap: 8 },
  submitPhotoBtnText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  speedIndicator: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 },

  // Full Offers
  offersHeader: { padding: 16 },
  offersHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  offersTitle: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  offersSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  upgradeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.amber, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  upgradeBadgeText: { color: '#78350F', fontSize: 10, fontWeight: 'bold' },
  discountBanner: { backgroundColor: `${Colors.emerald}15`, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: `${Colors.emerald}30` },
  discountPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  discountPillPremium: { backgroundColor: Colors.amber },
  discountPillText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  discountPillTextBasic: { color: Colors.textSecondary, fontSize: 12 },
  offersAvailable: { color: Colors.emerald, fontSize: 12 },
  offersListContent: { padding: 16, gap: 12 },
  offerFullCard: { borderRadius: 16, padding: 16, borderWidth: 1, borderColor: `${Colors.emerald}30`, backgroundColor: Colors.surface },
  offerFullCardRedeemed: { opacity: 0.6, borderColor: Colors.surfaceLight },
  offerFullRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  offerIconBox: { padding: 12, borderRadius: 12, backgroundColor: `${Colors.emerald}20`, position: 'relative' },
  offerIconBoxRedeemed: { backgroundColor: Colors.surfaceLight },
  offerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  offerName: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  premiumLockBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  premiumLockText: { color: Colors.amber, fontSize: 11 },
  offerDesc: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  offerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  offerDiscount: { color: Colors.emerald, fontSize: 14, fontWeight: 'bold' },
  offerDiscountRedeemed: { color: Colors.textMuted },
  offerGemBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offerGemText: { color: Colors.cyan, fontSize: 12 },
  offerTimeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offerTimeText: { color: Colors.textMuted, fontSize: 12 },
  redeemedCheck: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${Colors.emerald}30`, alignItems: 'center', justifyContent: 'center' },
  redeemPill: { backgroundColor: `${Colors.emerald}30`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  redeemPillText: { color: Colors.emerald, fontSize: 12, fontWeight: '600' },

  // Offer Detail Modal
  offerDetailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  offerDetailContent: { backgroundColor: Colors.surface, borderRadius: 16, width: '100%', maxWidth: 320, overflow: 'hidden' },
  offerDetailHeader: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  offerDetailIcon: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  offerDetailName: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
  offerDetailDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  offerDetailBody: { padding: 16 },
  offerDetailStats: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  offerDetailStat: { flex: 1, backgroundColor: `${Colors.cyan}15`, borderWidth: 1, borderColor: `${Colors.cyan}30`, borderRadius: 10, padding: 8, alignItems: 'center' },
  gemStatInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offerDetailStatVal: { color: Colors.cyan, fontSize: 18, fontWeight: 'bold' },
  offerDetailStatValGreen: { color: Colors.emerald, fontSize: 18, fontWeight: 'bold' },
  offerDetailStatLabel: { color: `${Colors.cyan}99`, fontSize: 10, marginTop: 2 },
  premiumUpsell: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${Colors.amber}15`, borderWidth: 1, borderColor: `${Colors.amber}30`, borderRadius: 10, padding: 8, gap: 6, marginBottom: 12 },
  premiumUpsellText: { color: Colors.amber, fontSize: 12, flex: 1 },
  redeemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.emerald, paddingVertical: 14, borderRadius: 10, gap: 8 },
  redeemBtnDisabled: { backgroundColor: Colors.surfaceLight },
  redeemBtnText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  redeemBtnTextDisabled: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },

  // Trip History
  tripHistoryOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 8 },
  tripHistoryContent: { width: '100%', maxWidth: 400, maxHeight: height * 0.85, backgroundColor: Colors.background, borderRadius: 20, overflow: 'hidden' },
  tripHistoryHeader: { padding: 16 },
  tripHistoryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tripHistoryTitle: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  tripHistoryClose: { width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tripStats: { flexDirection: 'row', gap: 8 },
  tripStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 8, alignItems: 'center' },
  tripStatVal: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  tripStatLabel: { color: 'rgba(147, 197, 253, 0.8)', fontSize: 10 },
  monthFilter: { marginTop: 12 },
  monthFilterRow: { flexDirection: 'row', gap: 8 },
  monthPill: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  monthPillActive: { backgroundColor: Colors.white },
  monthPillText: { color: Colors.white, fontSize: 12, fontWeight: '500' },
  monthPillTextActive: { color: Colors.primary },
  tripsList: { flex: 1, padding: 16 },
  tripCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 },
  tripCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tripDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tripDateText: { color: Colors.textMuted, fontSize: 12 },
  tripDateDot: { color: Colors.textMuted, fontSize: 12 },
  tripScoreBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  tripScoreText: { fontSize: 12, fontWeight: '600' },
  tripRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  tripRouteText: { color: Colors.white, fontSize: 14 },
  tripFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripMetaRow: { flexDirection: 'row', alignItems: 'center' },
  tripMetaText: { color: Colors.textMuted, fontSize: 12 },
  tripMetaDot: { color: Colors.textMuted, marginHorizontal: 4 },
  tripGemsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tripGemsText: { color: Colors.emerald, fontSize: 12, fontWeight: '600' },

  // Leaderboard
  leaderboardOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  leaderboardContent: { width: '100%', maxWidth: 400, maxHeight: height * 0.9, backgroundColor: Colors.background, borderRadius: 20, overflow: 'hidden' },
  leaderboardHeader: { padding: 16, overflow: 'hidden', position: 'relative' },
  decorCircle1: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.1)' },
  decorCircle2: { position: 'absolute', bottom: -40, left: -40, width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(255,255,255,0.05)' },
  leaderboardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  leaderboardIcon: { width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  leaderboardTitle: { color: Colors.white, fontSize: 20, fontWeight: 'bold' },
  leaderboardSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leaderboardSubText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  leaderboardClose: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  yourRankCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  yourRankAvatar: { width: 48, height: 48, backgroundColor: Colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  yourRankAvatarText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  yourRankName: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  yourRankMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  yourRankRank: { color: Colors.yellow, fontSize: 12, fontWeight: 'bold' },
  yourRankScore: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  yourRankGems: { alignItems: 'flex-end' },
  yourRankGemsVal: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  yourRankGemsLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  filtersRow: { backgroundColor: 'rgba(30,41,59,0.5)', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(71,85,105,0.5)' },
  timeFilters: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 8, padding: 4 },
  timeFilterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 6, gap: 4 },
  timeFilterBtnActive: { backgroundColor: Colors.purple },
  timeFilterText: { color: Colors.textMuted, fontSize: 12, fontWeight: '500' },
  timeFilterTextActive: { color: Colors.white },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  podiumItem: { alignItems: 'center' },
  podiumItemFirst: { marginBottom: -16 },
  podiumAvatar1: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.amber, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 2, borderColor: 'rgba(253,224,71,0.5)' },
  podiumAvatar2: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#94A3B8', alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 2, borderColor: 'rgba(148,163,184,0.5)' },
  podiumAvatar3: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#B45309', alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 2, borderColor: 'rgba(180,83,9,0.5)' },
  podiumAvatarText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  podiumBar1: { width: 96, height: 96, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: Colors.amber, alignItems: 'center', justifyContent: 'center' },
  podiumBar2: { width: 80, height: 64, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: '#64748B', alignItems: 'center', justifyContent: 'center' },
  podiumBar3: { width: 80, height: 48, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: '#92400E', alignItems: 'center', justifyContent: 'center' },
  podiumRankText: { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
  podiumPtsText: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
  podiumName: { color: Colors.textMuted, fontSize: 10, marginTop: 4, maxWidth: 80, textAlign: 'center' },
  podiumNameFirst: { color: Colors.white, fontSize: 12, fontWeight: '500', marginTop: 4 },
  leaderboardList: { flex: 1, padding: 12 },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: 12, padding: 12, marginBottom: 8, gap: 8 },
  leaderboardRowCurrent: { backgroundColor: 'rgba(59,130,246,0.2)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.5)' },
  rankCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  rankGold: { backgroundColor: Colors.amber, shadowColor: Colors.amber, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8 },
  rankSilver: { backgroundColor: '#94A3B8' },
  rankBronze: { backgroundColor: '#B45309' },
  rankNum: { color: Colors.textMuted, fontSize: 12, fontWeight: 'bold' },
  leaderboardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leaderboardName: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  leaderboardNameCurrent: { color: Colors.primary },
  leaderboardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  leaderboardMetaText: { color: Colors.textMuted, fontSize: 11 },
  leaderboardMetaState: { color: Colors.textMuted, fontSize: 11 },
  leaderboardGemsCol: { marginRight: 8 },
  leaderboardGemsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leaderboardGemsText: { color: Colors.cyan, fontSize: 14, fontWeight: 'bold' },
  challengeBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.orange },

  // Friends Hub
  friendsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  friendsContent: { width: '100%', maxWidth: 400, maxHeight: height * 0.8, backgroundColor: Colors.background, borderRadius: 20, overflow: 'hidden' },
  friendsHeader: { padding: 16 },
  friendsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 },
  friendsTitle: { color: Colors.white, fontSize: 18, fontWeight: 'bold', flex: 1 },
  friendsClose: { width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  myIdCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between' },
  myIdLabel: { color: 'rgba(147, 197, 253, 0.8)', fontSize: 10 },
  myIdValue: { color: Colors.white, fontSize: 24, fontWeight: 'bold', letterSpacing: 2 },
  myIdRight: { alignItems: 'flex-end' },
  friendsTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.surfaceLight },
  friendsTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  friendsTabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  friendsTabText: { color: Colors.textMuted, fontSize: 14, fontWeight: '500' },
  friendsTabTextActive: { color: Colors.primary },
  friendsBody: { flex: 1, padding: 16 },
  friendsEmpty: { alignItems: 'center', paddingVertical: 32 },
  friendsEmptyTitle: { color: Colors.textSecondary, fontSize: 14, marginTop: 12 },
  friendsEmptySubtitle: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  friendCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 8, gap: 12 },
  friendAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  friendAvatarText: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
  friendName: { color: Colors.white, fontSize: 14, fontWeight: '500' },
  friendMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  friendMetaText: { color: Colors.textMuted, fontSize: 11 },
  friendMetaDot: { color: Colors.textMuted },
  removeText: { color: Colors.red, fontSize: 12 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchInputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, color: Colors.white, fontSize: 14, paddingVertical: 12 },
  searchBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center' },
  searchBtnText: { color: Colors.white, fontSize: 14, fontWeight: '500' },
  searchResultCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16 },
  searchResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  searchResultAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.emerald, alignItems: 'center', justifyContent: 'center' },
  searchResultAvatarText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  searchResultName: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  searchResultId: { color: Colors.textSecondary, fontSize: 13 },
  searchResultStats: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchResultStat: { flex: 1, alignItems: 'center', backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 8 },
  searchResultStatVal: { color: Colors.white, fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  searchResultStatLabel: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  alreadyFriends: { alignItems: 'center', paddingVertical: 8 },
  alreadyFriendsText: { color: Colors.emerald, fontSize: 14 },
  addFriendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 12, gap: 8 },
  addFriendBtnText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  friendsHint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16 },
});

export default {
  RoadReportsModal,
  QuickPhotoModal,
  OffersFullModal,
  TripHistoryModal,
  LeaderboardModal,
  FriendsHubModal,
};
