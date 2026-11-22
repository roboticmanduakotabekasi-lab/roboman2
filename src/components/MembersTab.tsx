import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  UserPlus, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Phone, 
  Users, 
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  Filter,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Sparkles,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  MoreVertical,
  MapPin,
  TrendingUp,
  List,
  Calendar,
  UserCheck,
  Wallet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  MessageSquare,
  CheckSquare,
  Upload,
  ShieldAlert,
  MoreHorizontal,
  Printer,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, AttendanceRecord, UserSession } from '../types';
import { exportToCsv, formatWhatsAppNumber, formatMemberTimestamp } from '../utils/formatters';
import { exportMembersListPdf } from '../utils/pdfExport';
import { UniversalDataUploadModal } from './UniversalDataUploadModal';
import { playClickTick, playSuccessChime, playWarningBuzzer } from '../utils/audioFeedback';
import { deleteMembersBatchFromDB, updateMembersStatusBatchToDB, upsertMembersBatchToDB } from '../services/supabaseService';
import { smartFilter } from '../utils/smartSearch';
import { AcademicRolloverModal } from './AcademicRolloverModal';
import { 
  hasPermission, 
  getRoleMetadata, 
  isExecutiveOrAdvisor, 
  formatTitleLabel, 
  canViewSensitiveStudentData,
  getMemberRoleDetails,
  CANONICAL_ROLE_DETAILS,
  MemberRoleDetails,
  canConfigureCalendar,
  canManageMemberData,
  canPromoteUserRole,
  canActorModifyTargetRole,
  isHeadAdmin,
  getCanonicalRole,
  canViewMemberDirectory
} from '../utils/rbac';
import { useLanguage } from '../utils/i18n';

interface MembersTabProps {
  members: Member[];
  initialSearchTerm?: string;
  attendanceHistory?: AttendanceRecord[];
  isDemo?: boolean;
  onOpenAddModal: () => void;
  onOpenEditModal: (member: Member) => void;
  onOpenDetailModal: (member: Member) => void;
  onDeleteMember: (nisn: string) => void;
  onResetDefaultMembers?: () => void;
  onClearAllMembers?: () => void;
  onMembersUpdated?: (updatedMembers: Member[]) => void;
  onRefreshData?: () => Promise<void> | void;
  isSyncing?: boolean;
  currentAcademicYear?: string;
  isAcademicYearAuto?: boolean;
  onOpenDateAcademicModal?: (initialTab?: 'date' | 'academic') => void;
  onUpdateMemberStatus?: (nisn: string, newStatus: 'Aktif' | 'Keluar' | 'Alumni') => void;
  onRoleTitleChange?: (member: Member, newRole: string, newTitle: string) => Promise<void> | void;
  onOpenRoleManagement?: () => void;
  currentUserRole?: string;
  session?: UserSession | null;
}

// Utility functions for robust gender & grade normalization
export const isMaleMember = (gender?: string | any): boolean => {
  if (!gender) return false;
  const raw = typeof gender === 'object' ? (gender.gender || '') : String(gender || '');
  if (!raw) return false;
  const g = raw.toLowerCase().trim();
  return g === 'male' || g === 'laki-laki' || g === 'laki - laki' || g === 'laki' || g === 'l' || g === 'pria';
};

export const isFemaleMember = (gender?: string | any): boolean => {
  if (!gender) return false;
  const raw = typeof gender === 'object' ? (gender.gender || '') : String(gender || '');
  if (!raw) return false;
  const g = raw.toLowerCase().trim();
  return g === 'female' || g === 'perempuan' || g === 'p' || g === 'wanita';
};

export const normalizeGrade = (grade?: string): string => {
  if (!grade) return '';
  const clean = grade.toUpperCase().trim();
  if (clean === 'XII' || clean === '12' || clean.startsWith('XII') || clean.includes('DUA BELAS')) return 'XII';
  if (clean === 'XI' || clean === '11' || clean.startsWith('XI') || clean.includes('SEBELAS')) return 'XI';
  if (clean === 'X' || clean === '10' || clean.startsWith('X') || clean.includes('SEPULUH')) return 'X';
  return clean;
};

export const formatFullClass = (grade?: string, classRoom?: string): string => {
  const normGrade = normalizeGrade(grade) || (grade ? grade.toUpperCase().trim() : '');
  const cleanRoom = (classRoom || '').trim().toUpperCase();

  if (!cleanRoom && !normGrade) return '-';
  if (!cleanRoom) return `Kelas ${normGrade}`;
  if (!normGrade) return cleanRoom;

  // If cleanRoom already has X/XI/XII prefix (e.g., "X-H", "X H", "XI D", "XII IPA 1")
  if (
    cleanRoom.startsWith('XII ') || 
    cleanRoom.startsWith('XII-') ||
    cleanRoom === 'XII' ||
    cleanRoom.startsWith('XI ') || 
    cleanRoom.startsWith('XI-') ||
    cleanRoom === 'XI' ||
    cleanRoom.startsWith('X ') || 
    cleanRoom.startsWith('X-') ||
    cleanRoom === 'X'
  ) {
    return cleanRoom;
  }

  return `${normGrade} - ${cleanRoom}`;
};

export const MembersTab: React.FC<MembersTabProps> = ({
  members,
  initialSearchTerm = '',
  attendanceHistory,
  isDemo = false,
  onOpenAddModal,
  onOpenEditModal,
  onOpenDetailModal,
  onDeleteMember,
  onResetDefaultMembers,
  onClearAllMembers,
  onMembersUpdated,
  onRefreshData,
  isSyncing = false,
  currentAcademicYear = '2026/2027',
  isAcademicYearAuto = true,
  onOpenDateAcademicModal,
  onUpdateMemberStatus,
  onRoleTitleChange,
  onOpenRoleManagement,
  currentUserRole,
  session,
}) => {
  // RBAC Permission checks: Strictly restricted to President, Advisor, and Primary Admin
  const canManageMembers = session ? canManageMemberData(session) : hasPermission(currentUserRole, 'members:create');
  const canCreateMember = canManageMembers;
  const canEditMember = canManageMembers;
  const canDeleteMember = canManageMembers;
  const canImportMember = canManageMembers;
  const canPromoteRole = session ? canPromoteUserRole(session) : hasPermission(currentUserRole, 'members:promote');

  const roleMeta = getRoleMetadata(currentUserRole);
  const { language, t } = useLanguage();
  const isEn = language === 'en';

  const [searchTerm, setSearchTerm] = useState<string>(initialSearchTerm);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedGender, setSelectedGender] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'EXECUTIVE' | 'MEMBER'>('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [statusDropdownNisn, setStatusDropdownNisn] = useState<string | null>(null);
  const [roleDropdownNisn, setRoleDropdownNisn] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState<boolean>(false);
  const [clearAllConfirmationInput, setClearAllConfirmationInput] = useState<string>('');
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState<boolean>(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [isRolloverOpen, setIsRolloverOpen] = useState<boolean>(false);

  const isSuperAdmin = Boolean(
    session && (isHeadAdmin(session) || getCanonicalRole(session) === 'admin')
  );

  // Canonical Role options for 1-click promotion/assignment
  const ROLE_OPTIONS = [
    { id: 'member', label: isEn ? 'Member' : 'Anggota Biasa', icon: '👤', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
    { id: 'president', label: isEn ? 'President' : 'Ketua Ekskul', icon: '👑', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-black' },
    { id: 'vice_president', label: isEn ? 'Vice President' : 'Wakil Ketua', icon: '⭐', badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-200 font-bold' },
    { id: 'secretary', label: isEn ? 'Secretary' : 'Sekretaris', icon: '📝', badgeClass: 'bg-blue-50 text-blue-900 border-blue-200 font-bold' },
    { id: 'treasurer', label: isEn ? 'Treasurer' : 'Bendahara', icon: '💰', badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200 font-bold' },
    { id: 'pr', label: isEn ? 'Public Relations' : 'Humas', icon: '📣', badgeClass: 'bg-rose-50 text-rose-900 border-rose-200 font-bold' },
    ...(isSuperAdmin ? [{ id: 'advisor', label: isEn ? 'Faculty Advisor' : 'Guru Pembina', icon: '🛡️', badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 font-bold' }] : []),
  ];

  const getRoleBadgeMeta = (memberOrJabatan?: Partial<Member> | string) => {
    if (typeof memberOrJabatan === 'object' && memberOrJabatan !== null) {
      const details = getMemberRoleDetails(memberOrJabatan);
      return {
        id: details.id,
        label: isEn ? details.labelEn : details.labelId,
        icon: details.icon,
        badgeClass: details.badgeClass,
        isExecutive: details.isExecutive,
        category: details.category
      };
    }
    const details = getMemberRoleDetails({ jabatan: String(memberOrJabatan || ''), role: String(memberOrJabatan || '') });
    return {
      id: details.id,
      label: isEn ? details.labelEn : details.labelId,
      icon: details.icon,
      badgeClass: details.badgeClass,
      isExecutive: details.isExecutive,
      category: details.category
    };
  };

  const handleQuickRoleChange = async (member: Member, newTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canPromoteRole) return;

    const validation = canActorModifyTargetRole(
      session,
      {
        username: member.nisn,
        nisn: member.nisn,
        fullName: member.fullName,
        email: member.email,
        role: member.role
      },
      newTitle
    );

    if (!validation.allowed) {
      playWarningBuzzer();
      setRoleDropdownNisn(null);
      setActiveActionMenuId(null);
      return;
    }

    playClickTick();
    setRoleDropdownNisn(null);
    setActiveActionMenuId(null);
    const isExec = ['president', 'vice_president', 'secretary', 'treasurer', 'pr'].includes(newTitle);
    const isAdvisor = newTitle === 'advisor';
    const newRole = isAdvisor || newTitle === 'president' ? 'admin' : (isExec ? 'executive_board' : 'member');

    if (onRoleTitleChange) {
      await onRoleTitleChange(member, newRole, newTitle);
    } else {
      const updated = members.map(m => (m.nisn === member.nisn || (m.id_member && m.id_member === member.id_member)) ? {
        ...m,
        role: newRole,
        jabatan: newTitle,
        status: isExec ? 'executive_board' : (m.status === 'executive_board' ? 'Aktif' : (m.status || 'Aktif'))
      } : m);
      localStorage.setItem('robotics_members', JSON.stringify(updated));
      onMembersUpdated?.(updated);
    }
    playSuccessChime();
  };

  // Sorting & Multi-select states
  type SortField = 'code' | 'name' | 'role' | 'class' | 'status' | 'date';
  type SortOrder = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('code');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedNisns, setSelectedNisns] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [isBulkUpdatingStatus, setIsBulkUpdatingStatus] = useState<boolean>(false);
  const [batchStatusMenuOpen, setBatchStatusMenuOpen] = useState<boolean>(false);
  const [copiedBatchContacts, setCopiedBatchContacts] = useState<boolean>(false);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [filterProfileStatus, setFilterProfileStatus] = useState<'ALL' | 'ACTIVE' | 'PENDING'>('ALL');

  const handleQuickStatusChange = (member: Member, newStatus: 'Aktif' | 'Keluar' | 'Alumni', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canEditMember) return;
    playClickTick();
    setStatusDropdownNisn(null);
    setRoleDropdownNisn(null);
    setActiveActionMenuId(null);
    if (onUpdateMemberStatus) {
      onUpdateMemberStatus(member.nisn, newStatus);
    } else if (onOpenEditModal) {
      onOpenEditModal({ ...member, status: newStatus });
    }
  };

  const handleSort = (field: SortField) => {
    playClickTick();
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleCopyText = (text: string, key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!text || text === '-') return;
    navigator.clipboard.writeText(text);
    playClickTick();
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1600);
  };

  // Keyboard shortcut to focus search input (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedNisns.size > 0) {
          setSelectedNisns(new Set());
          setBatchStatusMenuOpen(false);
          lastSelectedIndexRef.current = null;
        }
      }
      if (((e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) && document.activeElement !== searchInputRef.current) {
        if ((e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-container]')) {
        setIsExportDropdownOpen(false);
        setActiveActionMenuId(null);
        setIsFilterExpanded(false);
        setStatusDropdownNisn(null);
        setRoleDropdownNisn(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleToggleGrade = (grade: string) => {
    playClickTick();
    setSelectedGrade((prev) => (prev === grade ? 'ALL' : grade));
    setCurrentPage(1);
  };

  const handleToggleGender = (gender: string) => {
    playClickTick();
    setSelectedGender((prev) => (prev === gender ? 'ALL' : gender));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    playClickTick();
    setSelectedGrade('ALL');
    setSelectedGender('ALL');
    setSelectedStatus('ALL');
    setSelectedCategory('ALL');
    setSelectedRoleFilter('ALL');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Statistics & Insights
  const stats = useMemo(() => {
    const total = members.length;
    const gradeX = members.filter((m) => normalizeGrade(m.grade) === 'X').length;
    const gradeXI = members.filter((m) => normalizeGrade(m.grade) === 'XI').length;
    const gradeXII = members.filter((m) => normalizeGrade(m.grade) === 'XII').length;
    const male = members.filter((m) => isMaleMember(m.gender)).length;
    const female = members.filter((m) => isFemaleMember(m.gender)).length;
    const aktif = members.filter((m) => (m.status || 'Aktif') === 'Aktif').length;
    const keluar = members.filter((m) => m.status === 'Keluar').length;
    const alumni = members.filter((m) => m.status === 'Alumni').length;
    const withPhone = members.filter((m) => m.personalPhone && m.personalPhone.trim().length >= 8).length;
    const withNisn = members.filter((m) => m.nisn && m.nisn.trim().length >= 5).length;
    const withNik = members.filter((m) => m.nik && m.nik.trim().length >= 5).length;
    const completeProfile = members.filter(
      (m) => m.nisn && m.personalPhone && m.address && m.classRoom
    ).length;
    const execCount = members.filter((m) => getMemberRoleDetails(m).isExecutive).length;
    const generalMemberCount = members.filter((m) => !getMemberRoleDetails(m).isExecutive).length;

    return { 
      total, 
      gradeX, 
      gradeXI, 
      gradeXII, 
      male, 
      female,
      aktif,
      keluar,
      alumni,
      withPhone,
      withNisn,
      withNik,
      completeProfile,
      execCount,
      generalMemberCount
    };
  }, [members]);

  // Breakdown distribution per class group for analytics panel
  const classBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach((m) => {
      const label = formatFullClass(m.grade, m.classRoom);
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [members]);

  // 4 recently added / updated members
  const recentMembers = useMemo(() => {
    return [...members].reverse().slice(0, 4);
  }, [members]);

  // Filtered members list with Smart Search (Multi-Token & Typo Tolerance)
  const filteredMembers = useMemo(() => {
    // 1. Filter by category, grade, gender, status, and role
    const categoryAndDropdownFiltered = members.filter((m) => {
      const matchGrade =
        selectedGrade === 'ALL' ||
        normalizeGrade(m.grade) === normalizeGrade(selectedGrade) ||
        m.grade === selectedGrade;

      let matchGender = true;
      if (selectedGender === 'Laki-laki' || selectedGender === 'Male') {
        matchGender = isMaleMember(m.gender);
      } else if (selectedGender === 'Perempuan' || selectedGender === 'Female') {
        matchGender = isFemaleMember(m.gender);
      } else if (selectedGender !== 'ALL') {
        matchGender = m.gender === selectedGender;
      }

      const matchStatus =
        selectedStatus === 'ALL' ||
        (m.status || 'Aktif') === selectedStatus;

      const roleDetails = getMemberRoleDetails(m);
      const isExec = roleDetails.isExecutive;
      const matchCategory =
        selectedCategory === 'ALL' ||
        (selectedCategory === 'EXECUTIVE' && isExec) ||
        (selectedCategory === 'MEMBER' && !isExec);

      const matchRole =
        selectedRoleFilter === 'ALL' ||
        roleDetails.id === selectedRoleFilter;

      return matchGrade && matchGender && matchStatus && matchCategory && matchRole;
    });

    // 2. Smart Search Engine: Multi-Token & Typo Tolerant Matching
    const searchResult = !searchTerm.trim()
      ? categoryAndDropdownFiltered
      : smartFilter(categoryAndDropdownFiltered, searchTerm, (m) => [
          m.fullName,
          (m as any).full_name,
          m.nisn,
          m.nik,
          m.email,
          m.personalPhone,
          m.parentPhone,
          m.address,
          m.classRoom,
          m.grade,
          formatFullClass(m.grade, m.classRoom),
          m.jabatan,
          m.role,
          m.status,
          m.id_member ? `rob-${m.id_member}` : '',
          m.id_member ? `rob-${String(m.id_member).padStart(5, '0')}` : '',
        ]);

    return [...searchResult].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      if (sortField === 'name') {
        valA = (a.fullName || '').toLowerCase();
        valB = (b.fullName || '').toLowerCase();
      } else if (sortField === 'role') {
        valA = getMemberRoleDetails(a).labelEn.toLowerCase();
        valB = getMemberRoleDetails(b).labelEn.toLowerCase();
      } else if (sortField === 'class') {
        valA = formatFullClass(a.grade, a.classRoom).toLowerCase();
        valB = formatFullClass(b.grade, b.classRoom).toLowerCase();
      } else if (sortField === 'status') {
        valA = (a.status || 'Aktif').toLowerCase();
        valB = (b.status || 'Aktif').toLowerCase();
      } else if (sortField === 'date') {
        valA = a.timestamp || '';
        valB = b.timestamp || '';
      } else {
        // default 'code'
        valA = a.id_member || 0;
        valB = b.id_member || 0;
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [members, searchTerm, selectedGrade, selectedGender, selectedStatus, selectedCategory, selectedRoleFilter, sortField, sortOrder]);

  const handleExportCsv = () => {
    const formattedData = filteredMembers.map((m, idx) => ({
      'No': idx + 1,
      'Full Name': m.fullName,
      'NISN': m.nisn,
      'National ID (NIK)': m.nik || '-',
      'Grade Level': normalizeGrade(m.grade) || m.grade,
      'Class': formatFullClass(m.grade, m.classRoom),
      'Status': m.status === 'Aktif' || !m.status ? 'Active' : m.status === 'Keluar' ? 'Resigned' : m.status,
      'Role': m.role || 'member',
      'Leadership Position': m.jabatan || 'member',
      'Birth Date': m.birthDate || '-',
      'Gender': isFemaleMember(m.gender) ? 'Female' : 'Male',
      'Email': m.email || '-',
      'Personal Phone': m.personalPhone || '-',
      'Parent Phone': m.parentPhone || '-',
      'Address': m.address || '-',
      'Registration Timestamp': m.timestamp || '-'
    }));
    exportToCsv('Robotics_Members_MAN2_Bekasi.csv', formattedData);
  };

  const handleExportPdf = () => {
    exportMembersListPdf({
      members: filteredMembers,
      filterGrade: selectedGrade,
      filterGender: selectedGender,
    });
  };

  // Pagination calculations
  const effectivePageSize = pageSize === 0 ? filteredMembers.length : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / (effectivePageSize || 1)));

  // Auto-clamp currentPage if filtered list count is smaller than current page
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedMembers = useMemo(() => {
    if (pageSize === 0) return filteredMembers;
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (validPage - 1) * pageSize;
    return filteredMembers.slice(startIndex, startIndex + pageSize);
  }, [filteredMembers, currentPage, pageSize, totalPages]);

  const startIndex = (currentPage - 1) * (pageSize === 0 ? filteredMembers.length : pageSize);
  const startEntry = filteredMembers.length === 0 ? 0 : startIndex + 1;
  const endEntry = pageSize === 0 ? filteredMembers.length : Math.min(startIndex + pageSize, filteredMembers.length);

  // Multi-select & Batch Actions handlers
  const isAllCurrentPageSelected = paginatedMembers.length > 0 && paginatedMembers.every((m) => selectedNisns.has(m.nisn));
  const isSomeCurrentPageSelected = paginatedMembers.some((m) => selectedNisns.has(m.nisn));

  const handleToggleSelectMember = (nisn: string, index?: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playClickTick();

    const isShift = Boolean(e && (e as any).shiftKey);
    const lastIdx = lastSelectedIndexRef.current;

    setSelectedNisns((prev) => {
      const next = new Set(prev);
      if (isShift && lastIdx !== null && index !== undefined) {
        const start = Math.min(lastIdx, index);
        const end = Math.max(lastIdx, index);
        for (let i = start; i <= end; i++) {
          const m = paginatedMembers[i];
          if (m) next.add(m.nisn);
        }
      } else {
        if (next.has(nisn)) {
          next.delete(nisn);
        } else {
          next.add(nisn);
        }
      }
      return next;
    });

    if (index !== undefined) {
      lastSelectedIndexRef.current = index;
    }
  };

  const handleCopySelectedPhones = () => {
    const selectedMembers = members.filter((m) => selectedNisns.has(m.nisn));
    const phones = selectedMembers
      .map((m) => formatWhatsAppNumber(m.personalPhone || ''))
      .filter(Boolean);

    if (phones.length === 0) return;
    navigator.clipboard.writeText(phones.join(', '));
    playSuccessChime();
    setCopiedBatchContacts(true);
    setTimeout(() => setCopiedBatchContacts(false), 2000);
  };

  const handleToggleSelectAllVisible = () => {
    playClickTick();
    setSelectedNisns((prev) => {
      const next = new Set(prev);
      if (isAllCurrentPageSelected) {
        paginatedMembers.forEach((m) => next.delete(m.nisn));
      } else {
        paginatedMembers.forEach((m) => next.add(m.nisn));
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    playClickTick();
    setSelectedNisns(new Set(filteredMembers.map((m) => m.nisn)));
  };

  const handleClearSelection = () => {
    playClickTick();
    setSelectedNisns(new Set());
    setBatchStatusMenuOpen(false);
    lastSelectedIndexRef.current = null;
  };

  const handleBulkStatusChange = async (newStatus: 'Aktif' | 'Keluar' | 'Alumni') => {
    if (selectedNisns.size === 0) return;
    playClickTick();
    setBatchStatusMenuOpen(false);
    setIsBulkUpdatingStatus(true);

    const targetNisns = Array.from(selectedNisns);
    const updated = members.map((m) => {
      if (selectedNisns.has(m.nisn)) {
        return { ...m, status: newStatus };
      }
      return m;
    });

    localStorage.setItem('robotics_members', JSON.stringify(updated));
    onMembersUpdated?.(updated);

    if (!isDemo) {
      try {
        await updateMembersStatusBatchToDB(targetNisns, newStatus);
      } catch (err) {
        console.error('Failed to batch update member status:', err);
      }
    }

    playSuccessChime();
    setIsBulkUpdatingStatus(false);
    setSelectedNisns(new Set());
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedNisns.size === 0) return;
    playClickTick();
    setIsBulkDeleting(true);

    const targetNisns = Array.from(selectedNisns);
    const selectedMembers = members.filter((m) => selectedNisns.has(m.nisn));
    const selectedNames = selectedMembers.map((m) => m.fullName);

    const updated = members.filter((m) => !selectedNisns.has(m.nisn));
    localStorage.setItem('robotics_members', JSON.stringify(updated));
    onMembersUpdated?.(updated);

    if (!isDemo) {
      try {
        await deleteMembersBatchFromDB(targetNisns, selectedNames);
      } catch (err) {
        console.error('Failed to batch delete members:', err);
      }
    }

    playSuccessChime();
    setIsBulkDeleting(false);
    setIsBulkDeleteModalOpen(false);
    setSelectedNisns(new Set());
  };

  if (!canViewMemberDirectory(session)) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-lg mx-auto space-y-4 my-8 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {isEn ? "Access Restricted: Member Directory" : "Akses Dibatasi: Direktori Anggota"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {isEn 
              ? "Member directory is strictly restricted to Secretary, President, Vice President, Advisor, and Administrator."
              : "Direktori anggota dibatasi secara ketat hanya untuk Sekretaris, Ketua, Wakil Ketua, Guru Pembina, dan Administrator."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full">
      
      {/* Top Header Card matching Canva screenshot 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600 border-l-2 border-sky-500 pl-2.5 inline-block mb-1.5">
            THE TEAM
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Member Directory
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
            Find members and their roles.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {canConfigureCalendar(session) ? (
            <button
              type="button"
              id="academicYearSelectBtn"
              onClick={() => {
                playClickTick();
                onOpenDateAcademicModal?.('academic');
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-sky-50/60 text-slate-700 text-xs font-bold shadow-xs cursor-pointer transition active:scale-95 group"
              title="Klik untuk mengubah Tahun Ajaran atau beralih ke otomatis (Khusus Admin)"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Academic Year {currentAcademicYear}</span>
              {isAcademicYearAuto ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100 shrink-0" title="Automatic Mode (Real-time)" />
              ) : (
                <span className="px-1.5 py-0.2 rounded-lg text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                  Custom
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition shrink-0" />
            </button>
          ) : (
            <div
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-sky-50/70 border border-sky-100 text-blue-950 text-xs font-bold select-none"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{isEn ? `Academic Year ${currentAcademicYear}` : `Tahun Ajaran ${currentAcademicYear}`}</span>
            </div>
          )}
        </div>
      </div>

      {/* RBAC Read-Only Notice Banner */}
      {!canCreateMember && (
        <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold">{isEn ? 'Directory Review Mode (Read-Only):' : 'Mode Tinjauan Direktori (Hanya Lihat):'}</span>
              <span className="text-amber-800 ml-1">
                {isEn 
                  ? <>Your account as <strong>{roleMeta.label}</strong> is in view-only mode. Adding, editing, and deleting student records is strictly restricted to <strong>President</strong>, <strong>Faculty Advisor</strong>, and <strong>Administrator</strong>.</>
                  : <>Akun Anda sebagai <strong>{roleMeta.label}</strong> dalam mode lihat saja. Penambahan, pengeditan, dan penghapusan data siswa dikelola secara ketat oleh <strong>Ketua (Presiden)</strong>, <strong>Guru Pembina</strong>, dan <strong>Administrator</strong>.</>}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900 border border-amber-300 uppercase tracking-wide shrink-0">
            Limited Access
          </span>
        </div>
      )}

      {/* 4 Interactive Executive Summary Stat Cards: Celestial Sky & Navy System */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 w-full">
        {/* CARD 1: TOTAL MEMBERS */}
        <div 
          onClick={handleResetFilters}
          className="bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-sky-100 shadow-sm hover:border-sky-300 hover:shadow-md transition flex flex-col justify-between cursor-pointer group"
          title={isEn ? "Click to reset filters & display all members" : "Klik untuk reset filter & tampilkan semua anggota"}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
              {isEn ? 'All Students' : 'Semua Siswa'}
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{t.totalMembers}</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight mt-1 block">
              {stats.total.toLocaleString()}
            </span>
          </div>
          <div className="mt-4 pt-3.5 border-t border-sky-100/80 flex items-center justify-between min-w-0 gap-1.5 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 min-w-0 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">{stats.aktif} {t.active}</span>
            </div>
            <span className="font-semibold text-slate-400 shrink-0">Roster Total</span>
          </div>
        </div>

        {/* CARD 2: EXECUTIVE BOARD & ADVISOR */}
        <div 
          onClick={() => {
            playClickTick();
            setSelectedCategory('EXECUTIVE');
            setCurrentPage(1);
          }}
          className="bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-sky-100 shadow-sm hover:border-indigo-300 hover:shadow-md transition flex flex-col justify-between cursor-pointer group"
          title={isEn ? "Click to view Executive Board & Advisors" : "Klik untuk melihat Pengurus Inti & Pembina"}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {isEn ? 'Leadership' : 'Kepemimpinan'}
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{t.executiveBoard}</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight mt-1 block">
              {stats.execCount.toLocaleString()}
            </span>
          </div>
          <div className="mt-4 pt-3.5 border-t border-sky-100/80 flex items-center justify-between min-w-0 gap-1.5 text-xs text-slate-500">
            <div className="flex items-center gap-1 font-bold text-slate-700 min-w-0 truncate">
              <span className="truncate">{t.officers}</span>
            </div>
            <span className="font-semibold text-slate-400 shrink-0">{isEn ? 'Appointed' : 'Ditetapkan'}</span>
          </div>
        </div>

        {/* CARD 3: GENERAL MEMBERS */}
        <div 
          onClick={() => {
            playClickTick();
            setSelectedCategory('MEMBER');
            setCurrentPage(1);
          }}
          className="bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-sky-100 shadow-sm hover:border-sky-400 hover:shadow-md transition flex flex-col justify-between cursor-pointer group"
          title={isEn ? "Click to view General Members" : "Klik untuk melihat Anggota Klub"}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition shadow-2xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {isEn ? 'General Roster' : 'Anggota Biasa'}
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{t.generalMembers}</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight mt-1 block">
              {stats.generalMemberCount.toLocaleString()}
            </span>
          </div>
          <div className="mt-4 pt-3.5 border-t border-sky-100/80 flex items-center justify-between min-w-0 gap-1.5 text-xs text-slate-500">
            <div className="flex items-center gap-1 font-bold text-slate-700 min-w-0 truncate">
              <span className="truncate">{stats.aktif - stats.execCount > 0 ? stats.aktif - stats.execCount : 0} {t.active}</span>
            </div>
            <span className="font-semibold text-slate-400 shrink-0">{isEn ? 'Regular' : 'Reguler'}</span>
          </div>
        </div>

        {/* CARD 4: COMPLETE PROFILES */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-sky-100 shadow-sm transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {isEn ? 'Verified' : 'Terverifikasi'}
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{t.verifiedProfiles}</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight mt-1 block">
              {stats.completeProfile.toLocaleString()}
            </span>
          </div>
          <div className="mt-4 pt-3.5 border-t border-sky-100/80 flex items-center justify-between min-w-0 gap-1.5 text-xs text-slate-500">
            <div className="flex items-center gap-1 font-bold text-slate-700 min-w-0 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">{isEn ? 'Contact & Bio' : 'Biodata & Kontak'}</span>
            </div>
            <span className="font-semibold text-slate-400 shrink-0">{isEn ? 'Verified' : 'Lengkap'}</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-sky-100 shadow-sm overflow-hidden w-full">
        
        {/* Success Banner after CSV Import */}
        {importSuccessMsg && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{importSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setImportSuccessMsg(null)}
              className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Card Header with Category Switcher Tabs */}
        <div className="p-4 sm:px-6 py-4 flex flex-col gap-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
                <List className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {isEn ? 'Member Directory • Robotic MAN 2 Kota Bekasi' : 'Daftar Anggota • Robotic MAN 2 Kota Bekasi'}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">
                  {isEn ? 'Official club roster & membership management' : 'Buku induk keanggotaan & direktori siswa'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap" data-dropdown-container>
              {/* Filter Toggle Button with Dropdown Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition shadow-2xs cursor-pointer ${
                    isFilterExpanded || selectedGrade !== 'ALL' || selectedGender !== 'ALL' || selectedCategory !== 'ALL'
                      ? 'bg-blue-50 border-blue-200 text-[#2563EB]'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{t.filters}</span>
                  {(selectedGrade !== 'ALL' || selectedGender !== 'ALL' || selectedCategory !== 'ALL') && (
                    <span className="w-4 h-4 rounded-full bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center">
                      {(selectedGrade !== 'ALL' ? 1 : 0) + (selectedGender !== 'ALL' ? 1 : 0) + (selectedCategory !== 'ALL' ? 1 : 0)}
                    </span>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Filter Dropdown Popover */}
                {isFilterExpanded && (
                  <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-30 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-[#2563EB]" />
                        {isEn ? 'Filter Members' : 'Filter Anggota'}
                      </span>
                      {(selectedGrade !== 'ALL' || selectedGender !== 'ALL' || selectedStatus !== 'ALL' || selectedCategory !== 'ALL') && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                        >
                          {isEn ? 'Reset' : 'Atur Ulang'}
                        </button>
                      )}
                    </div>

                    {/* Filter Category */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">
                        {isEn ? 'Role Category' : 'Kategori Jabatan'}
                      </label>
                      <div className="grid grid-cols-1 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            playClickTick();
                            setSelectedCategory('ALL');
                            setCurrentPage(1);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border text-left ${
                            selectedCategory === 'ALL'
                              ? 'bg-[#2563EB] text-white border-[#2563EB] font-bold'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {isEn ? `All Members (${stats.total})` : `Semua Anggota (${stats.total})`}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playClickTick();
                            setSelectedCategory('EXECUTIVE');
                            setCurrentPage(1);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border text-left ${
                            selectedCategory === 'EXECUTIVE'
                              ? 'bg-amber-400 text-slate-950 border-amber-400 font-black'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {isEn ? `Executive Board & Advisor (${stats.execCount})` : `Pengurus Inti & Pembina (${stats.execCount})`}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playClickTick();
                            setSelectedCategory('MEMBER');
                            setCurrentPage(1);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border text-left ${
                            selectedCategory === 'MEMBER'
                              ? 'bg-[#2563EB] text-white border-[#2563EB] font-bold'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {isEn ? `👤 General Members (${stats.generalMemberCount})` : `👤 Anggota Biasa (${stats.generalMemberCount})`}
                        </button>
                      </div>
                    </div>

                    {/* Filter Status Anggota */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">
                        Membership Status
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['ALL', 'Aktif', 'Keluar', 'Alumni'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              playClickTick();
                              setSelectedStatus(st);
                              setCurrentPage(1);
                            }}
                            className={`px-2 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border text-center ${
                              selectedStatus === st
                                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-2xs font-bold'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {st === 'ALL' ? 'All Statuses' : st === 'Aktif' ? 'Active' : st === 'Keluar' ? 'Resigned' : 'Alumni'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Filter Tingkat Kelas */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">
                        Grade Level
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['ALL', 'X', 'XI', 'XII'] as const).map((grade) => (
                          <button
                            key={grade}
                            type="button"
                            onClick={() => handleToggleGrade(grade)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border text-center ${
                              selectedGrade === grade
                                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-2xs font-bold'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {grade === 'ALL' ? 'All Grades' : `Grade ${grade}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Filter Gender */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">
                        Gender
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['ALL', 'Laki-laki', 'Perempuan'] as const).map((gender) => (
                          <button
                            key={gender}
                            type="button"
                            onClick={() => handleToggleGender(gender)}
                            className={`px-2 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border text-center ${
                              selectedGender === gender
                                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-2xs font-bold'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {gender === 'ALL' ? 'All' : gender === 'Laki-laki' ? 'Male' : 'Female'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Filter Jabatan / Peran Ekskul */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">
                        {isEn ? 'Club Role & Position' : 'Jabatan / Peran Ekskul'}
                      </label>
                      <select
                        value={selectedRoleFilter}
                        onChange={(e) => {
                          playClickTick();
                          setSelectedRoleFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition"
                      >
                        <option value="ALL">{isEn ? 'All Roles & Positions' : 'Semua Jabatan & Peran'}</option>
                        <option value="president">👑 {isEn ? 'President / Ketua Ekskul' : 'Ketua Ekskul (President)'}</option>
                        <option value="vice_president">⭐ {isEn ? 'Vice President / Wakil Ketua' : 'Wakil Ketua (Vice President)'}</option>
                        <option value="secretary">📝 {isEn ? 'Secretary / Sekretaris' : 'Sekretaris (Secretary)'}</option>
                        <option value="treasurer">💰 {isEn ? 'Treasurer / Bendahara' : 'Bendahara (Treasurer)'}</option>
                        <option value="pr">📣 {isEn ? 'Public Relations / Humas' : 'Humas (Public Relations)'}</option>
                        <option value="advisor">🛡️ {isEn ? 'Faculty Advisor / Pembina' : 'Guru Pembina (Advisor)'}</option>
                        <option value="member">👤 {isEn ? 'Club Member (General)' : 'Anggota Biasa (Member)'}</option>
                      </select>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-medium text-slate-600">{filteredMembers.length} matching students</span>
                      <button
                        type="button"
                        onClick={() => setIsFilterExpanded(false)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition cursor-pointer text-xs"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Consolidated Secondary Utility Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4 text-slate-500" />
                  <span>{isEn ? 'Actions' : 'Opsi'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isExportDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-slate-100 shadow-lg py-1.5 z-40 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        handleExportPdf();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2.5 cursor-pointer transition"
                    >
                      <Printer className="w-4 h-4 text-slate-400" />
                      <span>{isEn ? 'Print Official PDF' : 'Cetak PDF Resmi'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        handleExportCsv();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2.5 cursor-pointer transition"
                    >
                      <Download className="w-4 h-4 text-slate-400" />
                      <span>{isEn ? 'Export CSV (Excel)' : 'Ekspor File CSV'}</span>
                    </button>
                    {canImportMember && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsExportDropdownOpen(false);
                          setIsImportModalOpen(true);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2.5 cursor-pointer transition"
                      >
                        <Upload className="w-4 h-4 text-slate-400" />
                        <span>{t.uploadCsv}</span>
                      </button>
                    )}
                    {isSuperAdmin && (
                      <div className="border-t border-slate-100 my-1 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsExportDropdownOpen(false);
                            setIsConfirmingClearAll(false);
                            setClearAllConfirmationInput('');
                            setIsResetModalOpen(true);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer transition"
                        >
                          <RotateCcw className="w-4 h-4 text-rose-500" />
                          <span>{isEn ? 'Reset Member Database' : 'Atur Ulang Data Anggota'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Batch Academic Year Grade Rollover */}
              {canPromoteRole && (
                <button
                  type="button"
                  onClick={() => {
                    playClickTick();
                    setIsRolloverOpen(true);
                  }}
                  title={isEn ? 'Automatic Grade Promotion & Alumni Rollover' : 'Kenaikan Kelas Otomatis & Kelulusan Alumni'}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-2xl text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">{isEn ? 'Grade Rollover' : 'Kenaikan Kelas'}</span>
                </button>
              )}

              {/* Add Member (Gradient Sky to Indigo) */}
              {canCreateMember && (
                <button
                  id="addNewMemberBtn"
                  type="button"
                  onClick={onOpenAddModal}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 active:from-sky-700 active:to-indigo-800 text-white rounded-2xl text-xs font-bold transition shadow-md cursor-pointer active:scale-95 shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isEn ? '+ Add Student' : '+ Tambah Siswa'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Explicit Category Switcher Tabs: Separating Executive Board & Advisor and Member */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto w-fit max-w-full">
            <button
              type="button"
              onClick={() => {
                playClickTick();
                setSelectedCategory('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                selectedCategory === 'ALL'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEn ? `All Members (${stats.total})` : `Semua Anggota (${stats.total})`}
            </button>
            <button
              type="button"
              onClick={() => {
                playClickTick();
                setSelectedCategory('EXECUTIVE');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedCategory === 'EXECUTIVE'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{isEn ? `Executive Board & Advisor (${stats.execCount})` : `Pengurus Inti & Pembina (${stats.execCount})`}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playClickTick();
                setSelectedCategory('MEMBER');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedCategory === 'MEMBER'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{isEn ? `👤 General Members (${stats.generalMemberCount})` : `👤 Anggota Biasa (${stats.generalMemberCount})`}</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Quick Controls Bar */}
        <div className="p-3.5 sm:px-6 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input Container */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="memberSearchInput"
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={isEn ? "Search members (full name, NISN, class, NIK, WhatsApp, address, or ID)..." : "Cari anggota (nama lengkap, NISN, kelas, NIK, WhatsApp, alamat, atau ID)..."}
              className="w-full pl-9.5 pr-9 py-2 bg-white border border-slate-200 focus:border-[#2563EB] rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 transition shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title={isEn ? "Clear search" : "Hapus pencarian"}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Results Count & Refresh Button */}
          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {filteredMembers.length} <span className="font-normal text-slate-500">{isEn ? `of ${members.length} members` : `dari ${members.length} anggota`}</span>
            </span>
            {onRefreshData && (
              <button
                type="button"
                onClick={onRefreshData}
                disabled={isSyncing}
                className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition cursor-pointer shadow-2xs ml-1"
                title="Refresh table data from database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Active Filter & Search Indicators Bar */}
        {(selectedGrade !== 'ALL' || selectedGender !== 'ALL' || selectedStatus !== 'ALL' || selectedRoleFilter !== 'ALL' || searchTerm) && (
          <div className="px-4 sm:px-6 py-2.5 bg-blue-50/40 border-b border-blue-100 flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Filters:</span>

              {/* Active Search Term Chip */}
              {searchTerm && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-[#2563EB] text-xs font-semibold rounded-xl shadow-2xs">
                  <span>Search: "{searchTerm}"</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="hover:text-blue-900 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Active Role Filter Chip */}
              {selectedRoleFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-[#2563EB] text-xs font-semibold rounded-xl shadow-2xs">
                  <span>Role: {ROLE_OPTIONS.find(r => r.id === selectedRoleFilter)?.label || selectedRoleFilter}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoleFilter('ALL');
                      setCurrentPage(1);
                    }}
                    className="hover:text-blue-900 cursor-pointer"
                    title="Clear role filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Active Status Filter Chip */}
              {selectedStatus !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-[#2563EB] text-xs font-semibold rounded-xl shadow-2xs">
                  <span>Status: {selectedStatus === 'Aktif' ? 'Active' : selectedStatus === 'Keluar' ? 'Resigned' : selectedStatus}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStatus('ALL');
                      setCurrentPage(1);
                    }}
                    className="hover:text-blue-900 cursor-pointer"
                    title="Clear status filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Active Grade Filter Chip */}
              {selectedGrade !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-[#2563EB] text-xs font-semibold rounded-xl shadow-2xs">
                  <span>Grade {selectedGrade}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleGrade(selectedGrade)}
                    className="hover:text-blue-900 cursor-pointer"
                    title="Clear grade filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Active Gender Filter Chip */}
              {selectedGender !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-[#2563EB] text-xs font-semibold rounded-xl shadow-2xs">
                  <span>{selectedGender === 'Laki-laki' ? 'Male' : selectedGender === 'Perempuan' ? 'Female' : selectedGender}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleGender(selectedGender)}
                    className="hover:text-blue-900 cursor-pointer"
                    title="Clear gender filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Reset All Filters Button */}
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-1 px-2 bg-white border border-slate-200 text-slate-500 hover:text-rose-600 rounded-lg transition cursor-pointer shadow-2xs text-[11px] flex items-center gap-1 font-semibold ml-1"
                title="Reset All Filters &amp; Search"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All</span>
              </button>
            </div>
          </div>
        )}

        {/* Table View */}
        {filteredMembers.length === 0 ? (
          <div className="bg-slate-50/50 p-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              No matching member records found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-3">
              {searchTerm
                ? `No member data found matching "${searchTerm}". Please check spelling of name, NISN, class, or student ID.`
                : 'Try adjusting search keywords or clearing class and gender filters.'}
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[#2563EB] text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              Reset Filters &amp; Search
            </button>
          </div>
        ) : (
          <>
            {/* MOBILE VIEW: Cards for Mobile Viewports (< 768px) with zero cut-off */}
            <div className="block md:hidden divide-y divide-slate-100">
              <div className="p-3 bg-slate-50/80 flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeCurrentPageSelected && !isAllCurrentPageSelected;
                    }}
                    onChange={handleToggleSelectAllVisible}
                    className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-blue-500 cursor-pointer"
                  />
                  <span>{isEn ? 'Select All on Page' : 'Pilih Semua di Halaman'}</span>
                </label>
                {selectedNisns.size > 0 && (
                  <span className="text-[11px] font-bold text-blue-600 font-mono">
                    {selectedNisns.size} dipilih
                  </span>
                )}
              </div>
              {paginatedMembers.map((member, index) => {
                const cleanPersonalPhone = formatWhatsAppNumber(member.personalPhone);
                const formattedCode = member.id_member 
                  ? `ROB-${member.id_member}`
                  : `ROB-${String(startIndex + index + 1).padStart(5, '0')}`;
                const currentStatus = (member.status || 'Aktif') as 'Aktif' | 'Keluar' | 'Alumni';

                return (
                  <div
                    key={member.nisn || index}
                    onClick={() => onOpenDetailModal(member)}
                    className="p-4 hover:bg-blue-50/30 transition duration-150 cursor-pointer space-y-2.5"
                  >
                    {/* Top Row: Avatar, Name, Code, WA */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedNisns.has(member.nisn)}
                            onChange={(e) => handleToggleSelectMember(member.nisn, e as any)}
                            className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-blue-500 cursor-pointer"
                            title={isEn ? `Select ${member.fullName}` : `Pilih ${member.fullName}`}
                          />
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#2563EB] font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                          {member.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 text-sm hover:text-[#2563EB] transition truncate">
                            {member.fullName}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-[#2563EB]">
                              {formattedCode}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              NISN: {member.nisn}
                            </span>
                          </div>
                        </div>
                      </div>

                      {member.personalPhone && (
                        <a
                          href={`https://wa.me/${cleanPersonalPhone}?text=Hello%20${encodeURIComponent(member.fullName)}%2C%20from%20Robotics%20Club%20MAN%202%20Kota%20Bekasi`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-600 transition shrink-0 shadow-2xs"
                          title="Contact via WhatsApp"
                        >
                          <Phone className="w-4 h-4 shrink-0" />
                        </a>
                      )}
                    </div>

                    {/* Middle Row: Kelas Badge, 1-Click Role Dropdown & Status Dropdown */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                      {/* Kelas Badge with GraduationCap */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-800 text-xs font-bold shrink-0 max-w-full">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="whitespace-nowrap truncate">{formatFullClass(member.grade, member.classRoom)}</span>
                      </div>

                      {/* Interactive Quick Role Dropdown for Mobile */}
                      {(() => {
                        const roleBadge = getRoleBadgeMeta(member);
                        return (
                          <div className="relative inline-block" onClick={(e) => e.stopPropagation()} data-dropdown-container>
                            {canPromoteRole ? (
                              <button
                                type="button"
                                onClick={() => {
                                  playClickTick();
                                  setRoleDropdownNisn(roleDropdownNisn === member.nisn ? null : member.nisn);
                                  setStatusDropdownNisn(null);
                                }}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition cursor-pointer active:scale-95 shadow-2xs ${
                                  roleBadge.badgeClass
                                }`}
                                title={isEn ? "Click to change member position / role" : "Klik untuk mengubah jabatan / role anggota"}
                              >
                                <span>{roleBadge.icon} {roleBadge.label}</span>
                                <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />
                              </button>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                                roleBadge.badgeClass
                              }`}>
                                <span>{roleBadge.icon} {roleBadge.label}</span>
                              </span>
                            )}

                            {canPromoteRole && roleDropdownNisn === member.nisn && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-2xl p-1 z-40 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 text-left">
                                <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-0.5">
                                  {isEn ? 'Assign Club Role:' : 'Pilih Jabatan / Role:'}
                                </div>
                                {ROLE_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={(e) => handleQuickRoleChange(member, opt.id, e)}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                      roleBadge.id === opt.id
                                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                                        : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span className="flex items-center gap-1.5 truncate">
                                      <span>{opt.icon}</span>
                                      <span className="truncate">{opt.label}</span>
                                    </span>
                                    {roleBadge.id === opt.id && (
                                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Interactive Status Selector Dropdown */}
                      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                        {canEditMember ? (
                          <button
                            type="button"
                            onClick={() => {
                              playClickTick();
                              setStatusDropdownNisn(statusDropdownNisn === member.nisn ? null : member.nisn);
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition cursor-pointer active:scale-95 shadow-2xs ${
                              currentStatus === 'Keluar'
                                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                : currentStatus === 'Alumni'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title="Click to change member status"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              currentStatus === 'Keluar' ? 'bg-rose-500' : currentStatus === 'Alumni' ? 'bg-purple-500' : 'bg-emerald-500'
                            }`} />
                            <span>{currentStatus === 'Aktif' ? 'Active' : currentStatus === 'Keluar' ? 'Resigned' : currentStatus}</span>
                            <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border cursor-default select-none shadow-2xs ${
                              currentStatus === 'Keluar'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : currentStatus === 'Alumni'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                            title={`Member Status: ${currentStatus === 'Aktif' ? 'Active' : currentStatus === 'Keluar' ? 'Resigned' : currentStatus}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              currentStatus === 'Keluar' ? 'bg-rose-500' : currentStatus === 'Alumni' ? 'bg-purple-500' : 'bg-emerald-500'
                            }`} />
                            <span>{currentStatus === 'Aktif' ? 'Active' : currentStatus === 'Keluar' ? 'Resigned' : currentStatus}</span>
                          </span>
                        )}

                        {canEditMember && statusDropdownNisn === member.nisn && (
                          <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl border border-slate-200 shadow-xl p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 text-left">
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(member, 'Aktif')}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                currentStatus === 'Aktif' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <span>Active</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(member, 'Keluar')}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                currentStatus === 'Keluar' ? 'bg-rose-50 text-rose-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                              <span>Resigned</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(member, 'Alumni')}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                currentStatus === 'Alumni' ? 'bg-purple-50 text-purple-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                              <span>Alumni</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[11px] text-slate-400 truncate max-w-[170px]">
                        {member.address || 'Kota Bekasi'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenDetailModal(member)}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg transition cursor-pointer"
                        >
                          Detail
                        </button>
                        {canEditMember && (
                          <button
                            type="button"
                            onClick={() => onOpenEditModal(member)}
                            className="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer"
                          >
                            Edit
                          </button>
                        )}
                        {canDeleteMember && (
                          <button
                            type="button"
                            onClick={() => setMemberToDelete(member)}
                            className="p-1 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW: For Tablets and Desktop (>= 768px) */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider bg-[#F8FAFC]">
                    <th className="py-3 px-3 w-10 text-center select-none bg-[#F8FAFC]">
                      <input
                        type="checkbox"
                        checked={isAllCurrentPageSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomeCurrentPageSelected && !isAllCurrentPageSelected;
                        }}
                        onChange={handleToggleSelectAllVisible}
                        className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-blue-500 cursor-pointer"
                        title={isAllCurrentPageSelected ? (isEn ? "Deselect all on this page" : "Batal pilih semua") : (isEn ? "Select all on this page" : "Pilih semua di halaman ini")}
                      />
                    </th>
                    <th 
                      className="py-3 px-4 w-32 cursor-pointer hover:bg-slate-100/80 transition select-none" 
                      onClick={() => handleSort('code')}
                      title="Sort by student code"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{isEn ? 'STUDENT CODE' : 'KODE SISWA'}</span>
                        {sortField === 'code' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#2563EB]" /> : <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-3 px-4 min-w-[200px] cursor-pointer hover:bg-slate-100/80 transition select-none sticky left-0 bg-[#F8FAFC] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]" 
                      onClick={() => handleSort('name')}
                      title="Sort by member name"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{isEn ? 'MEMBER NAME' : 'NAMA ANGGOTA'}</span>
                        {sortField === 'name' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#2563EB]" /> : <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-3 px-4 min-w-[170px] cursor-pointer hover:bg-slate-100/80 transition select-none" 
                      onClick={() => handleSort('role')}
                      title="Sort by role & designation"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{isEn ? 'ROLE / POSITION' : 'PERAN & JABATAN'}</span>
                        {sortField === 'role' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#2563EB]" /> : <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-3 px-4 min-w-[150px] cursor-pointer hover:bg-slate-100/80 transition select-none" 
                      onClick={() => handleSort('class')}
                      title="Sort by class"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{isEn ? 'CLASS & GRADE' : 'KELAS & TINGKAT'}</span>
                        {sortField === 'class' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#2563EB]" /> : <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4 min-w-[140px]">{isEn ? 'WHATSAPP CONTACT' : 'KONTAK WHATSAPP'}</th>
                    <th 
                      className="py-3 px-4 min-w-[130px] cursor-pointer hover:bg-slate-100/80 transition select-none" 
                      onClick={() => handleSort('status')}
                      title="Sort by status"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{isEn ? 'STATUS' : 'STATUS'}</span>
                        {sortField === 'status' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#2563EB]" /> : <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-3 px-4 min-w-[140px] cursor-pointer hover:bg-slate-100/80 transition select-none" 
                      onClick={() => handleSort('date')}
                      title="Sort by registration date"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{isEn ? 'JOIN DATE' : 'TANGGAL DAFTAR'}</span>
                        {sortField === 'date' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#2563EB]" /> : <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4 text-right w-20">{isEn ? 'ACTIONS' : 'AKSI'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {paginatedMembers.map((member, index) => {
                    const cleanPersonalPhone = formatWhatsAppNumber(member.personalPhone);
                    const formattedCode = member.id_member 
                      ? `ROB-${member.id_member}`
                      : `ROB-${String(startIndex + index + 1).padStart(5, '0')}`;
                    const currentStatus = (member.status || 'Aktif') as 'Aktif' | 'Keluar' | 'Alumni';
                    const roleBadge = getRoleBadgeMeta(member);

                    const { date: formattedDate, time: formattedTime } = formatMemberTimestamp(member.timestamp);

                    return (
                      <tr 
                        key={member.nisn || index} 
                        onClick={() => onOpenDetailModal(member)}
                        className={`hover:bg-blue-50/40 transition duration-150 group cursor-pointer ${
                          selectedNisns.has(member.nisn) ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        {/* MULTI-SELECT CHECKBOX */}
                        <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedNisns.has(member.nisn)}
                            onChange={(e) => handleToggleSelectMember(member.nisn, index, e as any)}
                            className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-blue-500 cursor-pointer"
                            title={isEn ? `Select ${member.fullName} (Shift+Click to select range)` : `Pilih ${member.fullName} (Shift+Klik untuk pilih berurutan)`}
                          />
                        </td>

                        {/* KODE SISWA (ROB-xxxxx) */}
                        <td className="py-3.5 px-4 font-mono font-bold text-xs">
                          <button
                            type="button"
                            onClick={() => onOpenDetailModal(member)}
                            className="text-[#2563EB] hover:underline cursor-pointer font-mono"
                          >
                            {formattedCode}
                          </button>
                          <div className="text-[10px] text-slate-400 font-mono font-normal mt-0.5 flex flex-wrap items-center gap-1">
                            <span>NISN: {member.nisn}</span>
                            {member.birthDate && (
                              canViewSensitiveStudentData(session, member) ? (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200" title={`Birth Date: ${member.birthDate}`}>
                                  📅 {member.birthDate}
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200" title="Student credential protected (masked)">
                                  🔒 Verified
                                </span>
                              )
                            )}
                          </div>
                        </td>

                        {/* NAMA ANGGOTA (STICKY COLUMN) */}
                        <td className="py-3.5 px-4 sticky left-0 bg-white group-hover:bg-[#F3F7FF] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-[#2563EB] font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {member.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 max-w-[200px]">
                              <button
                                type="button"
                                onClick={() => onOpenDetailModal(member)}
                                className="font-bold text-slate-900 hover:text-[#2563EB] transition text-xs block text-left truncate cursor-pointer"
                                title={member.fullName}
                              >
                                {member.fullName}
                              </button>
                              <div className="text-[11px] text-slate-400 font-normal mt-0.5 truncate">
                                {member.email || `${member.fullName.toLowerCase().replace(/\s+/g, '.')}@man2.sch.id`}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* PERAN & JABATAN (RBAC) */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block" data-dropdown-container>
                            {(() => {
                              const isSelfRow = Boolean(
                                session && (
                                  (member.nisn && session.nisn && member.nisn === session.nisn) ||
                                  (member.fullName && session.name && member.fullName.toLowerCase() === session.name.toLowerCase()) ||
                                  (session.username && member.nisn === session.username)
                                )
                              );

                              if (canPromoteRole && !isSelfRow) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      playClickTick();
                                      setRoleDropdownNisn(roleDropdownNisn === member.nisn ? null : member.nisn);
                                      setStatusDropdownNisn(null);
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer hover:shadow-xs active:scale-95 ${
                                      roleBadge.badgeClass
                                    }`}
                                    title={isEn ? "Click to change member position / role" : "Klik untuk mengubah jabatan / role anggota"}
                                  >
                                    <span>{roleBadge.icon}</span>
                                    <span>{roleBadge.label}</span>
                                    <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                                  </button>
                                );
                              }

                              return (
                                <span 
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs ${roleBadge.badgeClass} ${isSelfRow ? 'ring-1 ring-indigo-400' : ''}`}
                                  title={isSelfRow ? (isEn ? "Your account (Locked by Anti-Self-Promotion Guard)" : "Akun Anda (Terkunci oleh Sistem Anti-Self-Promotion)") : undefined}
                                >
                                  <span>{roleBadge.icon}</span>
                                  <span>{roleBadge.label}</span>
                                  {isSelfRow && <Lock className="w-2.5 h-2.5 text-indigo-700 ml-0.5 shrink-0" />}
                                </span>
                              );
                            })()}

                            <span className="text-[10px] text-slate-400 block mt-1 font-medium">
                              {roleBadge.isExecutive ? (isEn ? 'Executive Board' : 'Pengurus Inti') : (isEn ? 'General Member' : 'Anggota Biasa')}
                            </span>

                            {canPromoteRole && roleDropdownNisn === member.nisn && (
                              <div className="absolute left-0 top-full mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-2xl p-1 z-40 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 text-left">
                                <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-0.5">
                                  {isEn ? 'Assign Club Role:' : 'Pilih Jabatan / Role:'}
                                </div>
                                {ROLE_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={(e) => handleQuickRoleChange(member, opt.id, e)}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                      roleBadge.id === opt.id
                                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                                        : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span className="flex items-center gap-1.5 truncate">
                                      <span>{opt.icon}</span>
                                      <span className="truncate">{opt.label}</span>
                                    </span>
                                    {roleBadge.id === opt.id && (
                                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* KELAS & DOMISILI with shrink-0 icon */}
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-800 text-xs font-bold shrink-0">
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="whitespace-nowrap">{formatFullClass(member.grade, member.classRoom)}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-1 truncate max-w-[160px]">
                            {member.address || 'Kota Bekasi, West Java'}
                          </span>
                        </td>

                        {/* KONTAK WA */}
                        <td className="py-3.5 px-4">
                          {member.personalPhone ? (
                            <a
                              href={`https://wa.me/${cleanPersonalPhone}?text=Hello%20${encodeURIComponent(member.fullName)}%2C%20from%20Robotics%20Club%20MAN%202%20Kota%20Bekasi`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-mono font-medium transition"
                              title="Contact Member via WhatsApp"
                            >
                              <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{member.personalPhone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 italic text-xs">-</span>
                          )}
                        </td>

                        {/* STATUS KEAKTIFAN (Interactive dropdown selector) */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block text-left">
                            {canEditMember ? (
                              <button
                                type="button"
                                onClick={() => {
                                  playClickTick();
                                  setStatusDropdownNisn(statusDropdownNisn === member.nisn ? null : member.nisn);
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer hover:shadow-xs active:scale-95 ${
                                  currentStatus === 'Keluar'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    : currentStatus === 'Alumni'
                                      ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                }`}
                                title="Click to change membership status"
                              >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  currentStatus === 'Keluar' ? 'bg-rose-500' : currentStatus === 'Alumni' ? 'bg-purple-500' : 'bg-emerald-500'
                                }`} />
                                <span>{currentStatus === 'Aktif' ? (isEn ? 'Active' : 'Aktif') : currentStatus === 'Keluar' ? (isEn ? 'Resigned' : 'Keluar') : currentStatus}</span>
                                <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                              </button>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-default select-none ${
                                  currentStatus === 'Keluar'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : currentStatus === 'Alumni'
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                                title={`Member Status: ${currentStatus === 'Aktif' ? (isEn ? 'Active' : 'Aktif') : currentStatus === 'Keluar' ? (isEn ? 'Resigned' : 'Keluar') : currentStatus}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  currentStatus === 'Keluar' ? 'bg-rose-500' : currentStatus === 'Alumni' ? 'bg-purple-500' : 'bg-emerald-500'
                                }`} />
                                <span>{currentStatus === 'Aktif' ? (isEn ? 'Active' : 'Aktif') : currentStatus === 'Keluar' ? (isEn ? 'Resigned' : 'Keluar') : currentStatus}</span>
                              </span>
                            )}

                            {canEditMember && statusDropdownNisn === member.nisn && (
                              <div className="absolute left-0 top-full mt-1 w-32 bg-white rounded-xl border border-slate-200 shadow-xl p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 text-left">
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusChange(member, 'Aktif')}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                    currentStatus === 'Aktif' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                  <span>{isEn ? 'Active' : 'Aktif'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusChange(member, 'Keluar')}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                    currentStatus === 'Keluar' ? 'bg-rose-50 text-rose-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                  <span>{isEn ? 'Resigned' : 'Keluar'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusChange(member, 'Alumni')}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                    currentStatus === 'Alumni' ? 'bg-purple-50 text-purple-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                                  <span>Alumni</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* TANGGAL DAFTAR */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 text-xs">
                            {formattedDate}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {formattedTime}
                          </div>
                        </td>

                        {/* AKSI */}
                        <td className="py-3.5 px-4 text-right" data-dropdown-container>
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionMenuId(activeActionMenuId === member.nisn ? null : member.nisn);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Actions Menu"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenuId === member.nisn && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-xl p-1 z-30 space-y-0.5 text-left animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    onOpenDetailModal(member);
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{isEn ? 'View Details' : 'Lihat Detail'}</span>
                                </button>
                                {canEditMember && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      onOpenEditModal(member);
                                    }}
                                    className="w-full px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2 cursor-pointer"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{isEn ? 'Edit Bio & Contact' : 'Edit Biodata Siswa'}</span>
                                  </button>
                                )}

                                {/* Direct 1-Click Role Changer inside Menu */}
                                {canPromoteRole && (
                                  <div className="border-t border-slate-100 my-1 pt-1">
                                    <div className="px-2 py-0.5 text-[10px] font-bold text-indigo-800 uppercase tracking-wider flex items-center justify-between">
                                      <span>{isEn ? 'Assign Role:' : 'Pilih Jabatan:'}</span>
                                      <span className="text-[9px] font-mono text-slate-400 truncate max-w-[80px]">{getRoleBadgeMeta(member.jabatan).label}</span>
                                    </div>
                                    <div className="max-h-36 overflow-y-auto space-y-0.5">
                                      {ROLE_OPTIONS.map((opt) => (
                                        <button
                                          key={opt.id}
                                          type="button"
                                          onClick={(e) => handleQuickRoleChange(member, opt.id, e)}
                                          className={`w-full px-2 py-1 text-xs rounded-lg flex items-center justify-between cursor-pointer transition ${
                                            (member.jabatan || 'member') === opt.id
                                              ? 'bg-indigo-50 text-indigo-900 font-bold'
                                              : 'text-slate-700 hover:bg-slate-50'
                                          }`}
                                        >
                                          <span className="flex items-center gap-1.5 truncate">
                                            <span>{opt.icon}</span>
                                            <span className="truncate">{opt.label}</span>
                                          </span>
                                          {(member.jabatan || 'member') === opt.id && (
                                            <Check className="w-3 h-3 text-indigo-600 shrink-0" />
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {canEditMember && (
                                  <div className="border-t border-slate-100 my-1 pt-1">
                                    <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                      {isEn ? 'Change Status:' : 'Ubah Status:'}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickStatusChange(member, 'Aktif')}
                                      className="w-full px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                      <span>{isEn ? 'Set Active' : 'Jadikan Aktif'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickStatusChange(member, 'Keluar')}
                                      className="w-full px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                      <span>{isEn ? 'Set Resigned' : 'Jadikan Keluar'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickStatusChange(member, 'Alumni')}
                                      className="w-full px-2.5 py-1 text-xs text-purple-700 hover:bg-purple-50 rounded-lg flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                                      <span>{isEn ? 'Set Alumni' : 'Jadikan Alumni'}</span>
                                    </button>
                                  </div>
                                )}

                                {canDeleteMember && (
                                  <div className="border-t border-slate-100 my-1 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        setMemberToDelete(member);
                                      }}
                                      className="w-full px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      <span>{isEn ? 'Delete' : 'Hapus'}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Table Footer: Pagination Bar - Exact match to screenshot */}
        {filteredMembers.length > 0 && (
          <div className="p-4 sm:px-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white">
            {/* Left: Showing 1 to 5 of 30 entries */}
            <div className="font-medium text-slate-500">
              {isEn ? (
                <>
                  Showing <span className="font-bold text-slate-800">{startEntry}</span> to{' '}
                  <span className="font-bold text-slate-800">{endEntry}</span> of{' '}
                  <span className="font-bold text-slate-800">{filteredMembers.length}</span> entries
                </>
              ) : (
                <>
                  Menampilkan <span className="font-bold text-slate-800">{startEntry}</span> sampai{' '}
                  <span className="font-bold text-slate-800">{endEntry}</span> dari{' '}
                  <span className="font-bold text-slate-800">{filteredMembers.length}</span> data
                </>
              )}
            </div>

            {/* Center: Pagination numbers */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((page, idx, arr) => {
                  const prev = arr[idx - 1];
                  const hasGap = prev && page - prev > 1;
                  return (
                    <React.Fragment key={page}>
                      {hasGap && <span className="px-1 text-slate-300">...</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg font-bold text-xs transition cursor-pointer ${
                          currentPage === page
                            ? 'bg-[#2563EB] text-white shadow-2xs'
                            : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Rows per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#2563EB] cursor-pointer shadow-2xs"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={0}>All</option>
              </select>
            </div>
          </div>
        )}

      </div>

      {/* 3 Executive Summary & Insights Panels below Table - 100% Full Width */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        
        {/* PANEL 1: Classroom Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4338CA] shrink-0 shadow-2xs">
                  <GraduationCap className="w-4 h-4 shrink-0" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">Classroom Breakdown</h4>
                  <p className="text-[10px] text-slate-400 font-medium truncate">Student distribution per class</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#4338CA] bg-[#EEF2FF] px-2 py-0.5 rounded-full border border-[#C7D2FE] shrink-0 whitespace-nowrap ml-1">
                {classBreakdown.length} Classes
              </span>
            </div>

            <div className="space-y-2.5 mt-3">
              {classBreakdown.map((item) => {
                const percentage = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
                return (
                  <div 
                    key={item.name}
                    onClick={() => setSearchTerm(item.name)}
                    className="group cursor-pointer p-1.5 rounded-xl hover:bg-[#EEF2FF]/60 transition"
                    title={`Click to filter by ${item.name}`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-700 group-hover:text-[#4338CA] transition">
                        {item.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 font-semibold">
                        {item.count} members <span className="text-slate-400 font-normal">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${percentage}%` }} 
                        className="bg-[#2563EB] h-full rounded-full group-hover:bg-[#1D4ED8] transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Classroom data from directory roster</span>
            <span className="font-semibold text-[#2563EB]">MAN 2 Kota Bekasi</span>
          </div>
        </div>

        {/* PANEL 2: Recent Members */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4338CA]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Recent Members</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Students enrolled in club system</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Verified
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-1">
              {recentMembers.map((member) => (
                <div 
                  key={member.nisn}
                  onClick={() => onOpenDetailModal(member)}
                  className="py-2 flex items-center justify-between hover:bg-[#EEF2FF]/40 rounded-xl px-2 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[#4338CA] font-bold text-[11px] flex items-center justify-center shrink-0">
                      {member.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate group-hover:text-[#4338CA] transition">
                        {member.fullName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {formatFullClass(member.grade, member.classRoom)} • NISN {member.nisn}
                      </div>
                    </div>
                  </div>
                  <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#4338CA] shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 text-[10px]">Click student for full profile</span>
            <button
              type="button"
              onClick={onOpenAddModal}
              className="text-[#2563EB] font-bold text-[11px] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              + Add Member
            </button>
          </div>
        </div>

        {/* PANEL 3: Document Center & Export */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Document Center &amp; Export</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Quick administrative actions &amp; reports</p>
                </div>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <button
                type="button"
                onClick={handleExportPdf}
                className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-left transition cursor-pointer group"
              >
                <div className="w-6 h-6 rounded-lg bg-white border border-rose-200 text-rose-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition shadow-2xs">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="text-[11px] font-bold text-rose-900 leading-tight">Print PDF</div>
                <div className="text-[9px] text-rose-600/80 mt-0.5">Full Member Roster</div>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-left transition cursor-pointer group"
              >
                <div className="w-6 h-6 rounded-lg bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition shadow-2xs">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </div>
                <div className="text-[11px] font-bold text-emerald-900 leading-tight">Export CSV</div>
                <div className="text-[9px] text-emerald-600/80 mt-0.5">Excel Master Directory</div>
              </button>
            </div>

            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-800">Data Backup &amp; Sync</div>
                <div className="text-[9px] text-slate-500">Cloud synchronization active</div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[#2563EB] text-[10px] font-bold hover:bg-[#2563EB] hover:text-white transition shadow-2xs cursor-pointer"
              >
                Import CSV
              </button>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Standard Club Master Directory Format</span>
            <span className="text-[#2563EB] font-semibold">v2.4 Ready</span>
          </div>
        </div>
      </div>

      {/* Floating Batch Action Bar */}
      <AnimatePresence>
        {selectedNisns.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-wrap items-center gap-3 sm:gap-4 max-w-[95vw] sm:max-w-2xl"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                {selectedNisns.size}
              </div>
              <span className="text-xs font-bold whitespace-nowrap">
                {isEn ? `${selectedNisns.size} of ${filteredMembers.length} selected` : `${selectedNisns.size} dari ${filteredMembers.length} dipilih`}
              </span>
            </div>

            {selectedNisns.size < filteredMembers.length && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-[11px] font-semibold text-blue-300 hover:text-white underline underline-offset-2 transition cursor-pointer whitespace-nowrap"
              >
                {isEn ? `Select all ${filteredMembers.length} filtered` : `Pilih semua ${filteredMembers.length} hasil filter`}
              </button>
            )}

            <div className="h-4 w-px bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-2 flex-wrap">
              {/* Copy Selected WhatsApp Numbers */}
              <button
                type="button"
                onClick={handleCopySelectedPhones}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 flex items-center gap-1.5 transition cursor-pointer"
                title={isEn ? "Copy WhatsApp numbers of selected students" : "Salin nomor WhatsApp siswa terpilih"}
              >
                {copiedBatchContacts ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">{isEn ? 'Copied!' : 'Tersalin!'}</span>
                  </>
                ) : (
                  <>
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isEn ? 'Copy WA' : 'Salin WA'}</span>
                  </>
                )}
              </button>

              {/* Batch Status Dropdown */}
              {canEditMember && (
                <div className="relative inline-block text-left" data-dropdown-container>
                  <button
                    type="button"
                    onClick={() => setBatchStatusMenuOpen(!batchStatusMenuOpen)}
                    disabled={isBulkUpdatingStatus}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <span>{isEn ? 'Change Status' : 'Ubah Status'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {batchStatusMenuOpen && (
                    <div className="absolute bottom-full mb-2 left-0 w-44 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 p-1.5 z-50 space-y-1">
                      <button
                        type="button"
                        onClick={() => handleBulkStatusChange('Aktif')}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition cursor-pointer text-left"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{isEn ? 'Set Active' : 'Set Aktif'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkStatusChange('Alumni')}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-purple-700 hover:bg-purple-50 transition cursor-pointer text-left"
                      >
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <span>{isEn ? 'Set Alumni' : 'Set Alumni'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkStatusChange('Keluar')}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50 transition cursor-pointer text-left"
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>{isEn ? 'Set Resigned' : 'Set Keluar'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Batch Delete Button */}
              {canDeleteMember && (
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  disabled={isBulkDeleting}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Delete Selected' : 'Hapus Terpilih'}</span>
                </button>
              )}

              {/* Clear Selection Button */}
              <button
                type="button"
                onClick={handleClearSelection}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                title={isEn ? "Cancel selection" : "Batal pilih"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {memberToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Delete Member?
              </h3>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Are you sure you want to permanently delete member{' '}
                <strong className="text-slate-800">{memberToDelete.fullName}</strong> (NISN: {memberToDelete.nisn})?
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMemberToDelete(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteMember(memberToDelete.nisn);
                    setMemberToDelete(null);
                  }}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm shadow-rose-600/25"
                >
                  Delete Member
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {isBulkDeleteModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isEn ? `Delete ${selectedNisns.size} Selected Students` : `Hapus ${selectedNisns.size} Siswa Terpilih`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEn ? 'Confirm batch deletion of member records' : 'Konfirmasi penghapusan massal data anggota'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 mb-3 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                {isEn
                  ? `Are you sure you want to permanently delete these ${selectedNisns.size} student records from the database and roster? Associated attendance and cash records will also be cleaned up.`
                  : `Apakah Anda yakin ingin menghapus ${selectedNisns.size} data siswa ini secara permanen dari database dan buku induk? Data presensi dan kas terkait juga akan dibersihkan.`}
              </p>

              <div className="text-[11px] text-amber-800 bg-amber-50/80 p-3 rounded-2xl border border-amber-200 mb-5 flex items-start gap-2 leading-relaxed">
                <span className="text-sm shrink-0">💡</span>
                <span>
                  {isEn
                    ? 'Tip: If members are graduating or resigning, consider using "Change Status" to Alumni/Resigned instead. That keeps their past attendance and treasury audit logs intact.'
                    : 'Tips Keamanan: Jika siswa sudah lulus atau tidak aktif, lebih baik gunakan "Ubah Status ➔ Alumni / Keluar". Riwayat absensi dan kas masa lalu mereka akan tetap tersimpan aman.'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Batal'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkDelete}
                  disabled={isBulkDeleting}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm shadow-rose-600/25 flex items-center justify-center gap-1.5"
                >
                  {isBulkDeleting ? (
                    <span>{isEn ? 'Deleting...' : 'Menghapus...'}</span>
                  ) : (
                    <span>{isEn ? `Delete ${selectedNisns.size} Students` : `Hapus ${selectedNisns.size} Siswa`}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Data Confirmation Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left relative"
            >
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {!isConfirmingClearAll ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                      <RotateCcw className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Reset Member Directory • MAN 2 Kota Bekasi
                      </h3>
                      <p className="text-xs text-slate-500">
                        Choose a reset option according to organizational requirements
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-5">
                    {/* Option 1: Reset to Starter Template */}
                    <div 
                      onClick={() => {
                        playSuccessChime();
                        onResetDefaultMembers?.();
                        setIsResetModalOpen(false);
                      }}
                      className="p-3.5 rounded-2xl border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 transition cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#2563EB] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 group-hover:scale-105 transition">
                          35
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-slate-900 group-hover:text-[#2563EB] transition">
                            Reset to Starter Template (35 Students)
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            Safely restore the member directory to the starter template of 35 robotics club members.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Option 2: Clear All Member Records (Opens Typing Verification) */}
                    <div 
                      onClick={() => {
                        playClickTick();
                        setIsConfirmingClearAll(true);
                        setClearAllConfirmationInput('');
                      }}
                      className="p-3.5 rounded-2xl border border-rose-200 hover:border-rose-400 hover:bg-rose-50/40 transition cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 group-hover:scale-105 transition">
                          <Trash2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-rose-700">
                            Delete All Student Data ({members.length} Members)
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            Clear entire directory table for clean CSV import preparation. Requires manual typing verification.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsResetModalOpen(false)}
                      className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                /* Step 2: Destructive Typing Verification Screen */
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0 shadow-2xs">
                      <ShieldAlert className="w-6 h-6 text-rose-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Confirm Deletion of All Students
                      </h3>
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block mt-0.5">
                        ⚠️ Action Cannot Be Undone
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-4 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left">
                    You are about to <strong>permanently delete all {members.length} student records</strong> from the directory roster, database, and local cache. Deleted data cannot be recovered.
                  </p>

                  <div className="mb-5 text-left">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Type the word <span className="text-rose-600 font-mono font-black">DELETE</span> to enable button:
                    </label>
                    <input
                      type="text"
                      value={clearAllConfirmationInput}
                      onChange={(e) => setClearAllConfirmationInput(e.target.value)}
                      placeholder="Type DELETE here..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs font-mono font-bold uppercase transition outline-none"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsConfirmingClearAll(false);
                        setClearAllConfirmationInput('');
                      }}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const val = clearAllConfirmationInput.trim().toUpperCase();
                        if (val !== 'DELETE' && val !== 'HAPUS') return;
                        playClickTick();
                        onClearAllMembers?.();
                        setIsResetModalOpen(false);
                        setIsConfirmingClearAll(false);
                        setClearAllConfirmationInput('');
                      }}
                      disabled={clearAllConfirmationInput.trim().toUpperCase() !== 'DELETE' && clearAllConfirmationInput.trim().toUpperCase() !== 'HAPUS'}
                      className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm shadow-rose-600/30 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete All Member Data Now</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Universal Data Upload Modal (Excel, CSV, PDF, Paste) */}
      <UniversalDataUploadModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        defaultTarget="members"
        existingMembers={members}
        isDemo={isDemo}
        session={session}
        onMembersUpdated={(updatedMembers) => {
          setImportSuccessMsg(
            isDemo
              ? `Successfully imported ${updatedMembers.length} students into demo session (saved locally)!`
              : `Successfully imported & saved ${updatedMembers.length} students!`
          );
          if (onMembersUpdated) {
            onMembersUpdated(updatedMembers);
          }
          if (onRefreshData) {
            onRefreshData();
          }
        }}
      />

      {/* Academic Year Grade Rollover Modal */}
      <AcademicRolloverModal
        isOpen={isRolloverOpen}
        onClose={() => setIsRolloverOpen(false)}
        members={members}
        onConfirmRollover={async (updatedMembers) => {
          localStorage.setItem('robotics_members', JSON.stringify(updatedMembers));
          onMembersUpdated?.(updatedMembers);
          if (!isDemo) {
            try {
              await upsertMembersBatchToDB(updatedMembers);
            } catch (err) {
              console.error('Failed to sync batch rollover to Supabase:', err);
            }
          }
          playSuccessChime();
        }}
      />

    </div>
  );
};
