// SnapRoad Partner Portal - Team Management with RBAC
// Partners can invite staff, assign roles, and manage team access

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Copy,
  Check,
  Key,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  Edit2,
  Trash2,
  RefreshCw,
  QrCode,
  Eye,
  Settings,
  Crown,
  User,
  Scan
} from 'lucide-react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

interface PartnerTeamProps {
  onNavigate: (page: string) => void;
}

type Role = 'owner' | 'manager' | 'staff';
type InviteMethod = 'email' | 'code';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'pending' | 'revoked';
  lastActive?: string;
  invitedAt: string;
  redemptionsToday: number;
}

const SAMPLE_TEAM: TeamMember[] = [
  { id: '1', name: 'John Smith', email: 'john@fuelstation.com', role: 'owner', status: 'active', lastActive: '2 min ago', invitedAt: '2024-12-01', redemptionsToday: 0 },
  { id: '2', name: 'Sarah Johnson', email: 'sarah@fuelstation.com', role: 'manager', status: 'active', lastActive: '1 hour ago', invitedAt: '2025-01-15', redemptionsToday: 12 },
  { id: '3', name: 'Mike Davis', email: 'mike@fuelstation.com', role: 'staff', status: 'active', lastActive: '30 min ago', invitedAt: '2025-02-01', redemptionsToday: 8 },
  { id: '4', name: 'Emily Brown', email: 'emily@fuelstation.com', role: 'staff', status: 'pending', invitedAt: '2025-02-16', redemptionsToday: 0 },
  { id: '5', name: 'Alex Wilson', email: 'alex@fuelstation.com', role: 'staff', status: 'revoked', invitedAt: '2025-01-20', redemptionsToday: 0 },
];

const ROLE_INFO = {
  owner: {
    label: 'Owner',
    description: 'Full access to all features including billing and team management',
    icon: Crown,
    color: '#FFC24C',
    permissions: ['Create offers', 'View analytics', 'Manage team', 'Billing access', 'Scan & redeem'],
  },
  manager: {
    label: 'Manager',
    description: 'Can manage offers, view analytics, and redeem codes',
    icon: ShieldCheck,
    color: '#0084FF',
    permissions: ['Create offers', 'View analytics', 'Scan & redeem'],
  },
  staff: {
    label: 'Staff',
    description: 'Can only scan and redeem customer QR codes',
    icon: User,
    color: '#00DFA2',
    permissions: ['Scan & redeem'],
  },
};

export function PartnerTeam({ onNavigate }: PartnerTeamProps) {
  const { theme } = useSnaproadTheme();
  const [team, setTeam] = useState<TeamMember[]>(SAMPLE_TEAM);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<InviteMethod>('email');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('staff');
  const [inviteCode, setInviteCode] = useState('SNAP-STAFF-' + Math.random().toString(36).substring(2, 8).toUpperCase());
  const [copied, setCopied] = useState(false);
  const [showRoleInfo, setShowRoleInfo] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  const isDark = theme === 'dark';

  const stats = {
    totalMembers: team.filter(m => m.status !== 'revoked').length,
    activeToday: team.filter(m => m.status === 'active' && m.redemptionsToday > 0).length,
    pendingInvites: team.filter(m => m.status === 'pending').length,
    totalRedemptionsToday: team.reduce((acc, m) => acc + m.redemptionsToday, 0),
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRoleBadge = (role: Role) => {
    const info = ROLE_INFO[role];
    return (
      <span 
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: `${info.color}15`, color: info.color }}
      >
        <info.icon size={12} />
        {info.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#00DFA2]/10 text-[#00DFA2]">
            <CheckCircle size={12} />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FFC24C]/10 text-[#FFC24C]">
            <Clock size={12} />
            Pending
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FF5A5A]/10 text-[#FF5A5A]">
            <XCircle size={12} />
            Revoked
          </span>
        );
      default:
        return null;
    }
  };

  const handleRevokeAccess = (memberId: string) => {
    setTeam(team.map(m => m.id === memberId ? { ...m, status: 'revoked' as const } : m));
    setActiveDropdown(null);
  };

  const handleResendInvite = (memberId: string) => {
    // In real app, would trigger email/notification
    setActiveDropdown(null);
  };

  return (
    <div className="space-y-6" data-testid="partner-team-page">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
            Team Management
          </h1>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>
            Manage staff access and permissions for QR code redemptions
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRoleInfo(!showRoleInfo)}
            className={`h-11 px-4 rounded-xl flex items-center gap-2 border ${
              isDark ? 'border-white/10 text-white/60 hover:text-white hover:bg-white/5' : 'border-[#E6ECF5] text-[#4B5C74] hover:bg-[#F5F8FA]'
            }`}
          >
            <Shield size={18} />
            Roles Guide
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="h-11 px-5 rounded-xl bg-gradient-to-r from-[#00DFA2] to-[#00BF8F] text-white font-semibold flex items-center gap-2 hover:shadow-lg transition-shadow"
            data-testid="invite-team-btn"
          >
            <UserPlus size={20} />
            Invite Team Member
          </button>
        </div>
      </div>

      {/* Roles Guide */}
      <AnimatePresence>
        {showRoleInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}
          >
            <div className="p-6">
              <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                Role Permissions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(ROLE_INFO).map(([key, info]) => (
                  <div 
                    key={key}
                    className={`p-4 rounded-xl ${isDark ? 'bg-[#0A0E16]' : 'bg-[#F5F8FA]'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${info.color}15` }}
                      >
                        <info.icon size={20} style={{ color: info.color }} />
                      </div>
                      <div>
                        <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>{info.label}</h4>
                      </div>
                    </div>
                    <p className={`text-sm mb-3 ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                      {info.description}
                    </p>
                    <div className="space-y-1">
                      {info.permissions.map((perm, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-[#00DFA2]" />
                          <span className={`text-sm ${isDark ? 'text-white/80' : 'text-[#0B1220]'}`}>{perm}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          className={`p-5 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#0084FF]/10 flex items-center justify-center">
              <Users size={20} className="text-[#0084FF]" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>{stats.totalMembers}</p>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>Team Members</p>
        </motion.div>

        <motion.div
          className={`p-5 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#00DFA2]/10 flex items-center justify-center">
              <CheckCircle size={20} className="text-[#00DFA2]" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>{stats.activeToday}</p>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>Active Today</p>
        </motion.div>

        <motion.div
          className={`p-5 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFC24C]/10 flex items-center justify-center">
              <Clock size={20} className="text-[#FFC24C]" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>{stats.pendingInvites}</p>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>Pending Invites</p>
        </motion.div>

        <motion.div
          className={`p-5 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#9D4EDD]/10 flex items-center justify-center">
              <QrCode size={20} className="text-[#9D4EDD]" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>{stats.totalRedemptionsToday}</p>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>Redemptions Today</p>
        </motion.div>
      </div>

      {/* Quick Action - Open Scanner */}
      <motion.div
        onClick={() => onNavigate('scan')}
        className={`p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
          isDark ? 'border-[#00DFA2]/30 bg-[#00DFA2]/5 hover:bg-[#00DFA2]/10' : 'border-[#00DFA2]/30 bg-[#00DFA2]/5 hover:bg-[#00DFA2]/10'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#00DFA2]/20 flex items-center justify-center">
            <Scan size={28} className="text-[#00DFA2]" />
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
              Open QR Scanner
            </h3>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
              Scan customer QR codes to validate and redeem offers
            </p>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-[#00DFA2]/10'}`}>
            <QrCode size={20} className="text-[#00DFA2]" />
          </div>
        </div>
      </motion.div>

      {/* Team Table */}
      <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
          Team Members
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`border-b ${isDark ? 'border-white/10' : 'border-[#E6ECF5]'}`}>
              <tr>
                <th className={`text-left py-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Member</th>
                <th className={`text-left py-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Role</th>
                <th className={`text-left py-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Status</th>
                <th className={`text-left py-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Last Active</th>
                <th className={`text-left py-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Redemptions Today</th>
                <th className="text-right py-3"></th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => (
                <tr 
                  key={member.id}
                  className={`border-b last:border-0 ${isDark ? 'border-white/5' : 'border-[#E6ECF5]'}`}
                >
                  <td className={`py-4 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
                        member.role === 'owner' ? 'bg-gradient-to-br from-[#FFC24C] to-[#FF9500]' :
                        member.role === 'manager' ? 'bg-gradient-to-br from-[#0084FF] to-[#0066CC]' :
                        'bg-gradient-to-br from-[#00DFA2] to-[#00BF8F]'
                      }`}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    {getRoleBadge(member.role)}
                  </td>
                  <td className="py-4">
                    {getStatusBadge(member.status)}
                  </td>
                  <td className={`py-4 ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                    {member.lastActive || '-'}
                  </td>
                  <td className={`py-4 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                    {member.redemptionsToday > 0 ? (
                      <span className="font-semibold">{member.redemptionsToday}</span>
                    ) : (
                      <span className={isDark ? 'text-white/40' : 'text-[#8A9BB6]'}>-</span>
                    )}
                  </td>
                  <td className="py-4 text-right relative">
                    {member.role !== 'owner' && (
                      <>
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === member.id ? null : member.id)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            isDark ? 'hover:bg-white/5 text-white/40' : 'hover:bg-[#F5F8FA] text-[#8A9BB6]'
                          }`}
                        >
                          <MoreVertical size={18} />
                        </button>
                        
                        <AnimatePresence>
                          {activeDropdown === member.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className={`absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-lg z-10 ${
                                isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'
                              }`}
                            >
                              <div className="py-2">
                                {member.status === 'pending' && (
                                  <button
                                    onClick={() => handleResendInvite(member.id)}
                                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                      isDark ? 'hover:bg-white/5 text-white/80' : 'hover:bg-[#F5F8FA] text-[#0B1220]'
                                    }`}
                                  >
                                    <RefreshCw size={16} />
                                    Resend Invite
                                  </button>
                                )}
                                <button
                                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                    isDark ? 'hover:bg-white/5 text-white/80' : 'hover:bg-[#F5F8FA] text-[#0B1220]'
                                  }`}
                                >
                                  <Edit2 size={16} />
                                  Change Role
                                </button>
                                {member.status !== 'revoked' && (
                                  <button
                                    onClick={() => handleRevokeAccess(member.id)}
                                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-[#FF5A5A] hover:bg-[#FF5A5A]/10"
                                  >
                                    <XCircle size={16} />
                                    Revoke Access
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`rounded-2xl p-8 max-w-lg w-full ${isDark ? 'bg-[#1A1F2E]' : 'bg-white'}`}
              onClick={(e) => e.stopPropagation()}
              data-testid="team-invite-modal"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#0084FF]/10 flex items-center justify-center">
                  <UserPlus size={24} className="text-[#0084FF]" />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                    Invite Team Member
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                    Add staff to help with QR code redemptions
                  </p>
                </div>
              </div>

              {/* Invite Method Toggle */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setInviteMethod('email')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                    inviteMethod === 'email'
                      ? 'bg-[#0084FF] text-white'
                      : isDark ? 'bg-[#0A0E16] text-white/60 border border-white/10' : 'bg-[#F5F8FA] text-[#4B5C74] border border-[#E6ECF5]'
                  }`}
                >
                  <Mail size={16} className="inline mr-2" />
                  Email Invite
                </button>
                <button
                  onClick={() => setInviteMethod('code')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                    inviteMethod === 'code'
                      ? 'bg-[#0084FF] text-white'
                      : isDark ? 'bg-[#0A0E16] text-white/60 border border-white/10' : 'bg-[#F5F8FA] text-[#4B5C74] border border-[#E6ECF5]'
                  }`}
                >
                  <Key size={16} className="inline mr-2" />
                  Share Code
                </button>
              </div>

              <div className="space-y-4">
                {inviteMethod === 'email' ? (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="staff@business.com"
                      className={`w-full h-12 px-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF] ${
                        isDark ? 'bg-[#0A0E16] border-white/10 text-white placeholder:text-white/30' : 'bg-[#F5F8FA] border-[#E6ECF5] text-[#0B1220] placeholder:text-[#8A9BB6]'
                      }`}
                      data-testid="team-invite-email-input"
                    />
                  </div>
                ) : (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                      Invite Code
                    </label>
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-[#0A0E16]' : 'bg-[#F5F8FA]'}`}>
                      <div className="flex items-center justify-between">
                        <p className={`text-lg font-mono font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                          {inviteCode}
                        </p>
                        <button
                          onClick={() => copyToClipboard(inviteCode)}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                            copied ? 'bg-[#00DFA2] text-white' : isDark ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-white text-[#4B5C74] hover:bg-[#E6ECF5]'
                          }`}
                        >
                          {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                      </div>
                      <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>
                        Share this code with your staff member. It expires in 7 days.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                    Role
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['staff', 'manager'] as Role[]).map((role) => {
                      const info = ROLE_INFO[role];
                      return (
                        <button
                          key={role}
                          onClick={() => setInviteRole(role)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            inviteRole === role
                              ? 'border-[#0084FF] bg-[#0084FF]/5'
                              : isDark ? 'border-white/10 hover:border-white/20' : 'border-[#E6ECF5] hover:border-[#0084FF]'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <info.icon size={18} style={{ color: info.color }} />
                            <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                              {info.label}
                            </span>
                          </div>
                          <p className={`text-xs ${isDark ? 'text-white/50' : 'text-[#8A9BB6]'}`}>
                            {info.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className={`flex-1 h-12 rounded-xl border ${
                    isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-[#E6ECF5] text-[#0B1220] hover:bg-[#F5F8FA]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteCode('SNAP-STAFF-' + Math.random().toString(36).substring(2, 8).toUpperCase());
                  }}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#0084FF] to-[#0066CC] text-white font-semibold flex items-center justify-center gap-2"
                  data-testid="send-team-invite-btn"
                >
                  {inviteMethod === 'email' ? (
                    <>
                      <Mail size={18} />
                      Send Invite
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Done
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PartnerTeam;
