import React, { useState, useEffect } from 'react';
import { 
  X, 
  Phone, 
  MessageCircle, 
  Mail, 
  MapPin, 
  Hash, 
  GraduationCap, 
  Clock, 
  CalendarCheck,
  ShieldCheck,
  ShieldAlert,
  Crown,
  Award,
  Check,
  Sparkles,
  UserCheck,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, AttendanceRecord, UserSession } from '../types';
import { formatWhatsAppNumber, formatMemberTimestamp } from '../utils/formatters';
import { formatFullClass } from './MembersTab';
import { 
  EXECUTIVE_TITLES, 
  ExecutiveTitle, 
  formatTitleLabel, 
  isExecutiveOrAdvisor,
  canViewSensitiveStudentData,
  maskNik,
  maskBirthDate,
  maskParentPhone,
  hasSessionPermission,
  canPromoteUserRole,
  canActorModifyTargetRole,
  getMemberRoleDetails,
  CANONICAL_ROLE_DETAILS
} from '../utils/rbac';
import { playClickTick, playSuccessChime, playWarningBuzzer } from '../utils/audioFeedback';
import { useLanguage } from '../utils/i18n';

interface MemberDetailModalProps {
  member: Member | null;
  attendanceHistory?: AttendanceRecord[];
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (member: Member) => void;
  onStatusChange?: (member: Member, newStatus: string) => void;
  onRoleTitleChange?: (member: Member, newRole: string, newTitle: string) => void;
  currentUserSession?: UserSession | null;
  canManageRoles?: boolean;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  attendanceHistory = [],
  isOpen,
  onClose,
  onEdit,
  onStatusChange,
  onRoleTitleChange,
  currentUserSession,
  canManageRoles = false, // SECURE DEFAULT: strictly false
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const roleDetails = getMemberRoleDetails(member);
  const [selectedTitle, setSelectedTitle] = useState<string>(roleDetails.id || 'member');
  const [isAdminRole, setIsAdminRole] = useState<boolean>(
    Boolean(member && (member.role === 'admin' || member.status === 'executive_board' || roleDetails.isExecutive))
  );
  const [isSavedTitle, setIsSavedTitle] = useState<boolean>(false);
  // Privacy toggle for authorized viewers (useful during screen share / proctoring)
  const [showUnmaskedPII, setShowUnmaskedPII] = useState<boolean>(true);
  const [roleErrorMsg, setRoleErrorMsg] = useState<string | null>(null);

  // Synchronize state when the target member changes
  useEffect(() => {
    if (member) {
      const details = getMemberRoleDetails(member);
      setSelectedTitle(details.id || 'member');
      setIsAdminRole(member.role === 'admin' || member.status === 'executive_board' || details.isExecutive);
      setIsSavedTitle(false);
      setShowUnmaskedPII(true);
      setRoleErrorMsg(null);
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const history = attendanceHistory || [];
  const memberAttendance = history.filter(a => a.nisn === member.nisn);
  const hadirCount = memberAttendance.filter(a => a.status === 'Hadir').length;

  const isExecutive = roleDetails.isExecutive;

  // Security Check 1: Can this viewer see sensitive student PII (NIK, birth date credential, parent phone)?
  const isSensitiveAuthorized = canViewSensitiveStudentData(currentUserSession, member);
  const shouldRevealPII = isSensitiveAuthorized && showUnmaskedPII;

  // Security Check 2: Can this user promote members or assign executive titles?
  const canPromote = Boolean(
    canManageRoles ||
    (currentUserSession ? canPromoteUserRole(currentUserSession) : false) ||
    hasSessionPermission(currentUserSession, 'members:promote')
  );

  const isSelf = Boolean(
    currentUserSession && (
      (member.nisn && currentUserSession.nisn && member.nisn === currentUserSession.nisn) ||
      (currentUserSession.username && (member.nisn === currentUserSession.username || member.fullName.toLowerCase() === (currentUserSession.name || '').toLowerCase()))
    )
  );

  const handleSaveRoleTitle = (newTitleOverride?: string) => {
    if (!canPromote) return;
    const titleToSave = newTitleOverride || selectedTitle;
    const isExec = ['president', 'vice_president', 'secretary', 'treasurer', 'pr'].includes(titleToSave);
    const isAdvisor = titleToSave === 'advisor';
    const targetRole = isAdvisor || titleToSave === 'president' ? 'admin' : (isExec ? 'executive_board' : 'member');

    const validation = canActorModifyTargetRole(
      currentUserSession,
      {
        username: member.nisn,
        nisn: member.nisn,
        fullName: member.fullName,
        email: member.email,
        role: member.role
      },
      titleToSave
    );

    if (!validation.allowed) {
      playWarningBuzzer();
      setRoleErrorMsg(validation.reason || (isEn ? 'Action not permitted.' : 'Tindakan tidak diizinkan.'));
      setTimeout(() => setRoleErrorMsg(null), 4000);
      return;
    }

    playClickTick();
    setRoleErrorMsg(null);
    if (onRoleTitleChange) {
      onRoleTitleChange(member, targetRole, titleToSave);
      playSuccessChime();
      setIsSavedTitle(true);
      setTimeout(() => setIsSavedTitle(false), 2500);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white border border-[#C7D2FE] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header Profile Banner */}
          <div className="relative bg-gradient-to-r from-[#1E1B4B] via-[#312E81] to-[#4338CA] p-5 sm:p-6 text-white shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0">
                {member.fullName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-white truncate">{member.fullName}</h3>
                  {member.id_member && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/30 text-white border border-white/40 font-mono shrink-0">
                      ID #{member.id_member}
                    </span>
                  )}
                  {/* Executive Title / Role Badge */}
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 border flex items-center gap-1 ${
                    roleDetails.isExecutive 
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-xs' 
                      : 'bg-white/20 text-white border-white/30'
                  }`}>
                    <span>{roleDetails.icon}</span>
                    <span>{isEn ? roleDetails.labelEn : roleDetails.labelId}</span>
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    member.gender === 'Female' || member.gender === 'Perempuan'
                      ? 'bg-pink-500 text-white'
                      : 'bg-blue-500 text-white'
                  }`}>
                    {member.gender === 'Female' || member.gender === 'Perempuan' 
                      ? (isEn ? 'Female' : 'Perempuan') 
                      : (isEn ? 'Male' : 'Laki-laki')}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 border ${
                    member.status === 'Keluar' || member.status === 'Resigned'
                      ? 'bg-rose-500/90 text-white border-rose-300'
                      : member.status === 'Alumni'
                        ? 'bg-purple-500/90 text-white border-purple-300'
                        : (member.status === 'executive_board' || roleDetails.isExecutive)
                          ? 'bg-amber-500 text-slate-900 border-amber-300'
                          : 'bg-emerald-500/90 text-white border-emerald-300'
                  }`}>
                    ● {(member.status === 'executive_board' || roleDetails.isExecutive)
                        ? (isEn ? 'Executive Board' : 'Pengurus Inti') 
                        : (member.status === 'Keluar' || member.status === 'Resigned')
                        ? (isEn ? 'Resigned' : 'Keluar')
                        : member.status === 'Alumni'
                        ? 'Alumni'
                        : (isEn ? 'Active' : 'Aktif')}
                  </span>
                </div>
                <p className="text-xs text-blue-100 mt-1 flex items-center gap-1.5 min-w-0">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                  <span className="truncate">
                    {isEn ? `Class ${member.grade}-${member.classRoom} • Robotic Club MAN 2 Kota Bekasi` : `Kelas ${member.grade}-${member.classRoom} • Klub Robotik MAN 2 Kota Bekasi`}
                  </span>
                </p>
                {member.email && (
                  <div className="flex items-center gap-1.5 text-xs text-blue-100 mt-1">
                    <Mail className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Details Grid */}
          <div className="p-4 sm:p-6 space-y-5 text-xs text-slate-800 overflow-y-auto flex-1">
            
            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-[#EEF2FF] border border-[#C7D2FE] p-3 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                  {isEn ? 'Present Meetings' : 'Jumlah Hadir'}
                </span>
                <span className="text-lg font-black text-emerald-600">{hadirCount}x</span>
              </div>
              <div className="bg-[#EEF2FF] border border-[#C7D2FE] p-3 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                  {isEn ? 'Total Logged' : 'Total Sesi'}
                </span>
                <span className="text-lg font-black text-[#4338CA]">{memberAttendance.length}x</span>
              </div>
              <div className="bg-[#EEF2FF] border border-[#C7D2FE] p-2.5 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                  {isEn ? 'Membership Status' : 'Status Anggota'}
                </span>
                <select
                  value={member.status || 'Aktif'}
                  onChange={(e) => onStatusChange && onStatusChange(member, e.target.value)}
                  disabled={!canManageRoles}
                  className={`mt-1 font-bold text-xs py-1 px-1.5 rounded-lg border focus:outline-none transition ${
                    !canManageRoles ? 'opacity-80 cursor-not-allowed bg-slate-100' : 'cursor-pointer'
                  } ${
                    member.status === 'Keluar' || member.status === 'Resigned'
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : member.status === 'Alumni'
                        ? 'bg-purple-50 text-purple-700 border-purple-300'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  }`}
                  title={canManageRoles ? (isEn ? "Update membership status" : "Perbarui status keanggotaan") : (isEn ? "Member status (can only be modified by administrators)" : "Status anggota (hanya dapat diubah administrator)")}
                >
                  <option value="Aktif">{isEn ? 'Active' : 'Aktif'}</option>
                  <option value="executive_board">{isEn ? 'Executive Board' : 'Pengurus Inti'}</option>
                  <option value="Keluar">{isEn ? 'Resigned' : 'Keluar'}</option>
                  <option value="Alumni">{isEn ? 'Alumni' : 'Alumni'}</option>
                </select>
              </div>
            </div>

            {/* Privacy & Clearance Information Banner */}
            {isSensitiveAuthorized ? (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold block">
                      {isEn ? 'Full Data Access Granted' : 'Akses Data Penuh Diberikan'}
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      {isEn ? 'You are verified with official club authority or verified as account owner.' : 'Anda diverifikasi memiliki otoritas resmi atau pemilik akun ini.'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playClickTick();
                    setShowUnmaskedPII(!showUnmaskedPII);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-[11px] font-bold hover:bg-emerald-100/60 transition cursor-pointer flex items-center gap-1 shrink-0"
                  title={isEn ? "Toggle data masking during screen sharing or presentation" : "Alihkan penyamaran data saat presentasi/berbagi layar"}
                >
                  {showUnmaskedPII ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Mask' : 'Samarkan'}</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Reveal' : 'Tampilkan'}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-950">
                    {isEn ? 'Student Privacy & Identity Protected' : 'Privasi & Identitas Siswa Dilindungi'}
                  </span>
                  <span className="text-[11px] text-amber-800 mt-0.5 block">
                    {isEn 
                      ? 'National ID (NIK), account authentication birth date, and parent contacts are automatically masked to safeguard student credentials.' 
                      : 'NIK, tanggal lahir autentikasi akun, dan kontak orang tua disamarkan secara otomatis untuk melindungi privasi siswa.'}
                  </span>
                </div>
              </div>
            )}

            {/* Admin Management Section: Direct Role & Title Assignment */}
            {canPromote && (
              <div className="p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-indigo-100">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-xs">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <span>{isEn ? 'Club Position & Authority' : 'Jabatan & Otoritas Siswa'}</span>
                  </div>
                  {isSavedTitle && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                      <Check className="w-3 h-3 text-emerald-700" />
                      {isEn ? 'Role Updated' : 'Jabatan Tersimpan'}
                    </span>
                  )}
                </div>

                {roleErrorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{roleErrorMsg}</span>
                  </div>
                )}

                {isSelf ? (
                  <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        {isEn ? 'Self-Role Modification Prohibited (Anti-Self-Promotion)' : 'Perubahan Jabatan Sendiri Dikunci (Anti-Self-Promotion)'}
                      </span>
                      <span className="text-[11px] text-amber-800 leading-relaxed block mt-0.5">
                        {isEn 
                          ? 'Under Segregation of Duties (SoD), executive officers cannot alter their own role or assign financial cash authority to themselves.' 
                          : 'Berdasarkan prinsip Pemisahan Kewenangan (Segregation of Duties), pengurus tidak dapat mengubah peran atau memberikan akses Kas kepada diri sendiri demi mencegah konflik kepentingan.'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                    <div className="sm:col-span-2">
                      <select
                        value={selectedTitle}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedTitle(val);
                        }}
                        className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-2xs"
                      >
                        <option value="member">👤 {isEn ? 'Member (General Student Roster)' : 'Anggota Biasa (Siswa Ekstrakurikuler)'}</option>
                        <option value="vice_president">⭐ {isEn ? 'Vice President / Wakil Ketua (Executive)' : 'Wakil Ketua / Vice President (Pengurus Inti)'}</option>
                        <option value="secretary">📝 {isEn ? 'Secretary / Sekretaris (Attendance & Logs)' : 'Sekretaris / Secretary (Presensi & Roster)'}</option>
                        <option value="treasurer">💰 {isEn ? 'Treasurer / Bendahara (Finance & Dues)' : 'Bendahara / Treasurer (Kas & Keuangan)'}</option>
                        <option value="pr">📣 {isEn ? 'Public Relations / Humas (Notices)' : 'Humas / Public Relations (Pengumuman)'}</option>
                      </select>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => handleSaveRoleTitle()}
                        className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Apply Role' : 'Simpan Perubahan'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Academic & Identity Info */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-1 border-b border-[#C7D2FE]/50 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#4338CA] shrink-0" />
                <span>{isEn ? 'Academic & Student Identity' : 'Identitas Akademik & Siswa'}</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-[#EEF2FF]/40 border border-[#C7D2FE] p-3 rounded-xl">
                  <span className="text-slate-500 text-[10px] block">{isEn ? 'Member ID' : 'ID Anggota'}</span>
                  <span className="font-mono font-bold text-[#4338CA]">#{member.id_member || '-'}</span>
                </div>
                <div className="bg-[#EEF2FF]/40 border border-[#C7D2FE] p-3 rounded-xl">
                  <span className="text-slate-500 text-[10px] block">NISN</span>
                  <span className="font-mono font-bold text-slate-900">{member.nisn}</span>
                </div>

                {/* NIK (Masked if unauthorized) */}
                <div className="bg-[#EEF2FF]/40 border border-[#C7D2FE] p-3 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px] block">NIK</span>
                    {!shouldRevealPII && (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-100/80 px-1 py-0.2 rounded">
                        {isEn ? 'Masked' : 'Disamarkan'}
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    {shouldRevealPII ? (member.nik || '-') : maskNik(member.nik)}
                  </span>
                </div>

                {/* Date of Birth (Masked if unauthorized to prevent login impersonation) */}
                <div className="bg-[#EEF2FF]/40 border border-[#C7D2FE] p-3 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px] block">
                      {isEn ? 'Date of Birth (Credential)' : 'Tanggal Lahir (Kredensial)'}
                    </span>
                    {!shouldRevealPII && (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-100/80 px-1 py-0.2 rounded flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> {isEn ? 'Locked' : 'Terkunci'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs">📅</span>
                    <span className="font-mono font-bold text-slate-900">
                      {shouldRevealPII ? (member.birthDate || '-') : maskBirthDate(member.birthDate)}
                    </span>
                    {shouldRevealPII && member.birthDate && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {isEn ? 'Ready to Verify' : 'Siap Diverifikasi'}
                      </span>
                    )}
                  </div>
                  {!shouldRevealPII && (
                    <span className="text-[9px] text-slate-400 block mt-1">
                      {isEn ? 'Hidden for account security.' : 'Disembunyikan demi keamanan akun.'}
                    </span>
                  )}
                </div>

                <div className="bg-[#EEF2FF]/40 border border-[#C7D2FE] p-3 rounded-xl">
                  <span className="text-slate-500 text-[10px] block">
                    {isEn ? 'Grade & Classroom' : 'Tingkat & Kelas'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="font-bold text-slate-900">{formatFullClass(member.grade, member.classRoom)}</span>
                  </div>
                </div>

                <div className="bg-[#EEF2FF]/40 border border-[#C7D2FE] p-3 rounded-xl col-span-2 sm:col-span-1">
                  <span className="text-slate-500 text-[10px] block">
                    {isEn ? 'Registration Timestamp' : 'Waktu Pendaftaran'}
                  </span>
                  <span className="text-slate-700 font-medium text-[11px]">
                    {member.timestamp ? `${formatMemberTimestamp(member.timestamp).date}` : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-1 border-b border-[#C7D2FE]/50 flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#4338CA]" />
                <span>{isEn ? 'Contact & Address' : 'Kontak & Alamat'}</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Student WhatsApp */}
                <div className="bg-[#EEF2FF]/40 border border-[#C7D2FE] p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 text-[10px] block">
                      {isEn ? 'Student WhatsApp' : 'WhatsApp Siswa'}
                    </span>
                    <span className="font-mono font-bold text-slate-900">{member.personalPhone || '-'}</span>
                  </div>
                  {member.personalPhone && (
                    <a
                      href={`https://wa.me/${formatWhatsAppNumber(member.personalPhone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow transition"
                      title={isEn ? "Send WhatsApp Message" : "Kirim Pesan WhatsApp"}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* No HP Orang Tua (Masked if unauthorized) */}
                <div className="bg-[#EEF2FF]/40 border border-[#C7D2FE] p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[10px] block">
                        {isEn ? 'Parent / Guardian Phone' : 'No. HP Orang Tua / Wali'}
                      </span>
                      {!shouldRevealPII && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100/80 px-1 py-0.2 rounded">
                          {isEn ? 'Masked' : 'Disamarkan'}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {shouldRevealPII ? (member.parentPhone || '-') : maskParentPhone(member.parentPhone)}
                    </span>
                  </div>
                  {shouldRevealPII && member.parentPhone ? (
                    <a
                      href={`https://wa.me/${formatWhatsAppNumber(member.parentPhone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                      title={isEn ? "Contact Parent" : "Hubungi Orang Tua"}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  ) : (
                    <div 
                      className="p-2 bg-slate-100 text-slate-400 rounded-lg cursor-not-allowed" 
                      title={isEn ? "Parent contact is restricted to authorized advisors and secretaries." : "Kontak orang tua dibatasi untuk pembina dan pengurus berwenang."}
                    >
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>

              {/* Residential Address */}
              <div className="bg-[#EEF2FF]/40 border border-[#C7D2FE] p-3 rounded-xl">
                <span className="text-slate-500 text-[10px] block mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#4338CA]" />
                  {isEn ? 'Student Residential Address' : 'Alamat Tempat Tinggal Siswa'}
                </span>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {member.address || 'Kota Bekasi, Jawa Barat'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {onEdit && (
                <button
                  onClick={() => onEdit(member)}
                  className="px-4 py-2 text-xs font-bold text-[#4338CA] bg-[#EEF2FF] hover:bg-[#C7D2FE]/50 border border-[#C7D2FE] rounded-xl transition cursor-pointer"
                >
                  {isEn ? 'Edit Profile' : 'Edit Profil'}
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                {isEn ? 'Close' : 'Tutup'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
