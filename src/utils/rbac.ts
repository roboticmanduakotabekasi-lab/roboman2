// src/utils/rbac.ts
// Extracurricular Management Role-Based Access Control (RBAC) System
// Distinct separation between (Executive Board & Advisor) and (General Members)

import { MainTabType } from '../types';

export type AppRole = 'admin' | 'pembina' | 'ketua' | 'bph' | 'sekretaris' | 'bendahara' | 'anggota' | 'president' | 'vice_president' | 'secretary' | 'treasurer' | 'pr' | 'advisor' | 'member';

export type ExecutiveTitle = 'president' | 'vice_president' | 'secretary' | 'treasurer' | 'pr' | 'advisor' | 'member';

export type Permission =
  // Members Management
  | 'members:view'
  | 'members:create'
  | 'members:edit'
  | 'members:delete'
  | 'members:import'
  | 'members:export'
  | 'members:promote' // Promote members to admin and assign executive titles
  | 'members:view_sensitive' // View unmasked PII (NIK, student birthdate/credential, parent contact)
  // Attendance Module
  | 'attendance:view'
  | 'attendance:create'
  | 'attendance:edit'
  | 'attendance:delete'
  | 'attendance:reset'
  | 'attendance:export'
  // Treasury & Cash Module
  | 'cash:view'
  | 'cash:create'
  | 'cash:edit'
  | 'cash:delete'
  | 'cash:reset'
  | 'cash:export'
  // Calendar & Events
  | 'calendar:view'
  | 'calendar:edit'
  // Assignments & Grading
  | 'assignments:view'
  | 'assignments:create'
  | 'assignments:grade'
  | 'assignments:delete'
  // Announcements
  | 'announcements:view'
  | 'announcements:create'
  | 'announcements:delete'
  // Club Room Maintenance & Configuration
  | 'room:maintenance'
  | 'rbac:manage'
  | 'system:configure';

export type RoleCategory = 'Executive Board & Advisor' | 'Member';

export interface RoleDefinition {
  id: AppRole;
  label: string;
  category: RoleCategory;
  shortTitle: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconName: string;
  description: string;
  responsibilities: string[];
  permissions: Permission[];
}

export const EXECUTIVE_TITLES: {
  id: ExecutiveTitle;
  label: string;
  category: RoleCategory;
  badge: string;
  isAdmin: boolean;
  description: string;
}[] = [
  {
    id: 'president',
    label: 'President',
    category: 'Executive Board & Advisor',
    badge: '👑 President',
    isAdmin: true,
    description: 'Club President / Room Creator with full executive authority over members, roles, maintenance, and operations.'
  },
  {
    id: 'vice_president',
    label: 'Vice President',
    category: 'Executive Board & Advisor',
    badge: '⭐ Vice President',
    isAdmin: true,
    description: 'Vice President assisting executive operations, club maintenance, and committee coordination.'
  },
  {
    id: 'secretary',
    label: 'Secretary',
    category: 'Executive Board & Advisor',
    badge: '📝 Secretary',
    isAdmin: true,
    description: 'Secretary in charge of member records, meeting minutes, attendance logs, and assignments.'
  },
  {
    id: 'treasurer',
    label: 'Treasurer',
    category: 'Executive Board & Advisor',
    badge: '💰 Treasurer',
    isAdmin: true,
    description: 'Treasurer managing club fees, component budgets, procurement, and financial reports.'
  },
  {
    id: 'pr',
    label: 'Public Relations',
    category: 'Executive Board & Advisor',
    badge: '📣 Public Relations',
    isAdmin: true,
    description: 'Public Relations with executive authority over external communications, club announcements, member coordination, and club operations.'
  },
  {
    id: 'advisor',
    label: 'Advisor',
    category: 'Executive Board & Advisor',
    badge: '🛡️ Advisor',
    isAdmin: true,
    description: 'Teacher / Faculty Advisor supervising overall governance, safety, audit, and school compliance.'
  },
  {
    id: 'member',
    label: 'Member',
    category: 'Member',
    badge: '👤 Member',
    isAdmin: false,
    description: 'General extracurricular member participating in workshops, self-attendance, and assignments.'
  }
];

export const ROLE_DEFINITIONS: Record<string, RoleDefinition> = {
  admin: {
    id: 'admin',
    label: 'Administrator (Head Admin)',
    category: 'Executive Board & Advisor',
    shortTitle: 'Admin',
    badgeBg: 'bg-blue-100 text-blue-900',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-300',
    iconName: 'ShieldCheck',
    description: 'System Administrator with full executive authority over members, attendance, treasury, assignments, announcements, and Supabase integration.',
    responsibilities: [
      'Comprehensive administrative access to all extracurricular modules and data',
      'Bypass student verification and manage all member profiles and staging data',
      'Oversee attendance records, treasury accounting, and assignments grading',
      'Configure Supabase database synchronization and academic periods'
    ],
    permissions: [
      'members:view', 'members:create', 'members:edit', 'members:delete', 'members:import', 'members:export', 'members:promote', 'members:view_sensitive',
      'attendance:view', 'attendance:create', 'attendance:edit', 'attendance:delete', 'attendance:reset', 'attendance:export',
      'cash:view', 'cash:create', 'cash:edit', 'cash:delete', 'cash:reset', 'cash:export',
      'calendar:view', 'calendar:edit',
      'assignments:view', 'assignments:create', 'assignments:grade', 'assignments:delete',
      'announcements:view', 'announcements:create', 'announcements:delete',
      'room:maintenance', 'rbac:manage', 'system:configure'
    ]
  },
  pembina: {
    id: 'pembina',
    label: 'Faculty Advisor',
    category: 'Executive Board & Advisor',
    shortTitle: 'Advisor',
    badgeBg: 'bg-purple-100 text-purple-900',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-300',
    iconName: 'ShieldCheck',
    description: 'Faculty Advisor with supervisory oversight over members, attendance, assignments, calendar governance, and financial audits (Treasury writes are restricted to Treasurer/Admin; broadcasts to PR/Secretary/President).',
    responsibilities: [
      'Supervise member directory, promotions, and academic schedules',
      'Oversee attendance records, tasks, and evaluation feedback',
      'Audit club financial ledgers and accountability reports (read-only)',
      'Oversee system configurations and school compliance'
    ],
    permissions: [
      'members:view', 'members:create', 'members:edit', 'members:delete', 'members:import', 'members:export', 'members:promote', 'members:view_sensitive',
      'attendance:view', 'attendance:create', 'attendance:edit', 'attendance:delete', 'attendance:reset', 'attendance:export',
      'cash:view', 'cash:export',
      'calendar:view', 'calendar:edit',
      'assignments:view', 'assignments:create', 'assignments:grade', 'assignments:delete',
      'announcements:view',
      'room:maintenance', 'rbac:manage', 'system:configure'
    ]
  },
  ketua: {
    id: 'ketua',
    label: 'President (Head Admin)',
    category: 'Executive Board & Advisor',
    shortTitle: 'President',
    badgeBg: 'bg-blue-100 text-blue-900',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-300',
    iconName: 'Crown',
    description: 'Club President and room creator with executive management, member role assignments, and club maintenance privileges (Treasury is strictly managed by Treasurer).',
    responsibilities: [
      'Coordinate all robotic club divisions, workshops, and competitions',
      'Promote members to Admin and assign executive titles (Vice President, Secretary, etc.)',
      'Perform club maintenance, room customization, and settings',
      'Publish assignments, announcements, and evaluate submissions'
    ],
    permissions: [
      'members:view', 'members:create', 'members:edit', 'members:delete', 'members:import', 'members:export', 'members:promote', 'members:view_sensitive',
      'attendance:view', 'attendance:create', 'attendance:reset', 'attendance:export',
      'cash:view', 'cash:export',
      'calendar:view', 'calendar:edit',
      'assignments:view', 'assignments:create', 'assignments:grade', 'assignments:delete',
      'announcements:view', 'announcements:create', 'announcements:delete',
      'room:maintenance', 'rbac:manage', 'system:configure'
    ]
  },
  bph: {
    id: 'bph',
    label: 'Vice President / Executive Board',
    category: 'Executive Board & Advisor',
    shortTitle: 'Vice President',
    badgeBg: 'bg-indigo-100 text-indigo-900',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-300',
    iconName: 'Award',
    description: 'Executive Board assisting operational coordination and workshop supervision (Member data, treasury write, and announcements are strictly managed by assigned officers).',
    responsibilities: [
      'Operational coordination of club activities and member workshops',
      'Supervise workshop attendance and participate in club self check-in',
      'Validate periodic activity reports and student projects',
      'Collaborate with President and Secretary on club operations'
    ],
    permissions: [
      'members:view', 'members:export',
      'attendance:view', 'attendance:create', 'attendance:export',
      'cash:view', 'cash:export',
      'calendar:view',
      'assignments:view', 'assignments:grade',
      'announcements:view',
      'room:maintenance'
    ]
  },
  sekretaris: {
    id: 'sekretaris',
    label: 'Secretary',
    category: 'Executive Board & Advisor',
    shortTitle: 'Secretary',
    badgeBg: 'bg-emerald-100 text-emerald-900',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-300',
    iconName: 'FileText',
    description: 'Executive Secretary in charge of meeting attendance logs, assignments, and documentation (Student master data is managed by President/Admin/Advisor; official announcements are broadcast exclusively by Public Relations).',
    responsibilities: [
      'Track and record daily workshop and meeting attendance',
      'Maintain meeting minutes, reports, and administrative logs',
      'Coordinate assignments, submission logs, and meeting archives',
      'View member directory and maintain club documentation'
    ],
    permissions: [
      'members:view', 'members:export', 'members:view_sensitive',
      'attendance:view', 'attendance:create', 'attendance:edit', 'attendance:delete', 'attendance:reset', 'attendance:export',
      'cash:view', 'cash:export',
      'calendar:view',
      'assignments:view', 'assignments:create', 'assignments:grade', 'assignments:delete',
      'announcements:view',
      'room:maintenance'
    ]
  },
  bendahara: {
    id: 'bendahara',
    label: 'Treasurer',
    category: 'Executive Board & Advisor',
    shortTitle: 'Treasurer',
    badgeBg: 'bg-amber-100 text-amber-900',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-300',
    iconName: 'Wallet',
    description: 'Executive Treasurer exclusively responsible for member dues, robotics hardware expenses, financial transparency, and cash reports.',
    responsibilities: [
      'Record weekly/monthly club dues and contributions',
      'Document hardware purchases (microcontrollers, sensors, tools)',
      'Generate balance sheets, income/expense reports, and budget audits',
      'Maintain treasury ledgers and financial transparency'
    ],
    permissions: [
      'attendance:view', 'attendance:create', 'attendance:export',
      'cash:view', 'cash:create', 'cash:edit', 'cash:delete', 'cash:reset', 'cash:export',
      'calendar:view',
      'assignments:view',
      'announcements:view',
      'room:maintenance'
    ]
  },
  pr: {
    id: 'pr',
    label: 'Public Relations (PR)',
    category: 'Executive Board & Advisor',
    shortTitle: 'Public Relations',
    badgeBg: 'bg-rose-100 text-rose-900',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-300',
    iconName: 'Megaphone',
    description: 'Public Relations officer handling external communications, community partnerships, official club broadcasts, announcements, and member coordination.',
    responsibilities: [
      'Create, publish, and manage official club announcements and broadcasts',
      'Coordinate public relations, competition updates, and partner communications',
      'Supervise session attendance and member communications',
      'Participate in self-attendance and executive operations'
    ],
    permissions: [
      'attendance:view', 'attendance:create', 'attendance:export',
      'cash:view', 'cash:export',
      'calendar:view',
      'assignments:view',
      'announcements:view', 'announcements:create', 'announcements:delete',
      'room:maintenance'
    ]
  },
  anggota: {
    id: 'anggota',
    label: 'Club Member',
    category: 'Member',
    shortTitle: 'Member',
    badgeBg: 'bg-slate-100 text-slate-800',
    badgeText: 'text-slate-600',
    badgeBorder: 'border-slate-300',
    iconName: 'UserCheck',
    description: 'General extracurricular member with participant access to attendance self check-in, announcements, learning materials, and assignment submission.',
    responsibilities: [
      'Submit daily self-check-in attendance and view presence history',
      'Access robotics learning materials and turn in assignment solutions',
      'Read official club broadcasts and schedule dates on the calendar',
      'Manage personal student profile and digital ID badge'
    ],
    permissions: [
      'attendance:view',
      'attendance:create',
      'calendar:view',
      'assignments:view',
      'announcements:view'
    ]
  }
};

// Aliases for English / Canonical keys to ensure lookup never fails
ROLE_DEFINITIONS['president'] = ROLE_DEFINITIONS.ketua;
ROLE_DEFINITIONS['vice_president'] = ROLE_DEFINITIONS.bph;
ROLE_DEFINITIONS['secretary'] = ROLE_DEFINITIONS.sekretaris;
ROLE_DEFINITIONS['treasurer'] = ROLE_DEFINITIONS.bendahara;
ROLE_DEFINITIONS['advisor'] = ROLE_DEFINITIONS.pembina;
ROLE_DEFINITIONS['member'] = ROLE_DEFINITIONS.anggota;
ROLE_DEFINITIONS['executive_board'] = ROLE_DEFINITIONS.bph;

/**
 * Distinct, non-duplicated primary roles for UI rendering and role switching
 */
export const PRIMARY_APP_ROLES: AppRole[] = [
  'admin',
  'pembina',
  'ketua',
  'bph',
  'sekretaris',
  'bendahara',
  'pr',
  'anggota'
];

export interface MemberRoleDetails {
  id: 'president' | 'vice_president' | 'secretary' | 'treasurer' | 'pr' | 'advisor' | 'admin' | 'member';
  canonicalRole: 'admin' | 'executive_board' | 'advisor' | 'member';
  labelEn: string;
  labelId: string;
  badgeLabel: string;
  icon: string;
  category: RoleCategory;
  isExecutive: boolean;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  badgeClass: string;
}

export const CANONICAL_ROLE_DETAILS: Record<string, MemberRoleDetails> = {
  president: {
    id: 'president',
    canonicalRole: 'admin',
    labelEn: 'President',
    labelId: 'Ketua Ekskul',
    badgeLabel: '👑 President',
    icon: '👑',
    category: 'Executive Board & Advisor',
    isExecutive: true,
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-300',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 font-black'
  },
  vice_president: {
    id: 'vice_president',
    canonicalRole: 'executive_board',
    labelEn: 'Vice President',
    labelId: 'Wakil Ketua',
    badgeLabel: '⭐ Vice President',
    icon: '⭐',
    category: 'Executive Board & Advisor',
    isExecutive: true,
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-900',
    badgeBorder: 'border-indigo-200',
    badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-200 font-bold'
  },
  secretary: {
    id: 'secretary',
    canonicalRole: 'executive_board',
    labelEn: 'Secretary',
    labelId: 'Sekretaris',
    badgeLabel: '📝 Secretary',
    icon: '📝',
    category: 'Executive Board & Advisor',
    isExecutive: true,
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-900',
    badgeBorder: 'border-blue-200',
    badgeClass: 'bg-blue-50 text-blue-900 border-blue-200 font-bold'
  },
  treasurer: {
    id: 'treasurer',
    canonicalRole: 'executive_board',
    labelEn: 'Treasurer',
    labelId: 'Bendahara',
    badgeLabel: '💰 Treasurer',
    icon: '💰',
    category: 'Executive Board & Advisor',
    isExecutive: true,
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-900',
    badgeBorder: 'border-emerald-200',
    badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200 font-bold'
  },
  pr: {
    id: 'pr',
    canonicalRole: 'executive_board',
    labelEn: 'Public Relations',
    labelId: 'Humas',
    badgeLabel: '📣 Public Relations',
    icon: '📣',
    category: 'Executive Board & Advisor',
    isExecutive: true,
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-900',
    badgeBorder: 'border-rose-200',
    badgeClass: 'bg-rose-50 text-rose-900 border-rose-200 font-bold'
  },
  advisor: {
    id: 'advisor',
    canonicalRole: 'advisor',
    labelEn: 'Faculty Advisor',
    labelId: 'Guru Pembina',
    badgeLabel: '🛡️ Advisor',
    icon: '🛡️',
    category: 'Executive Board & Advisor',
    isExecutive: true,
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-900',
    badgeBorder: 'border-purple-300',
    badgeClass: 'bg-purple-50 text-purple-900 border-purple-300 font-bold'
  },
  admin: {
    id: 'admin',
    canonicalRole: 'admin',
    labelEn: 'Administrator',
    labelId: 'Administrator',
    badgeLabel: '🛡️ Admin',
    icon: '🛡️',
    category: 'Executive Board & Advisor',
    isExecutive: true,
    badgeBg: 'bg-slate-900',
    badgeText: 'text-white',
    badgeBorder: 'border-slate-700',
    badgeClass: 'bg-slate-900 text-white border-slate-700 font-bold'
  },
  member: {
    id: 'member',
    canonicalRole: 'member',
    labelEn: 'Member',
    labelId: 'Anggota Biasa',
    badgeLabel: '👤 Member',
    icon: '👤',
    category: 'Member',
    isExecutive: false,
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
  }
};

/**
 * Accurately resolves a member's role details by evaluating both `jabatan` and `role`,
 * with multi-language Indonesian and English fuzzy matching.
 */
export function getMemberRoleDetails(member?: {
  role?: string | null;
  jabatan?: string | null;
  status?: string | null;
  email?: string | null;
} | null): MemberRoleDetails {
  if (!member) return CANONICAL_ROLE_DETAILS.member;

  const rawJabatan = (typeof member.jabatan === 'string' ? member.jabatan : '').toLowerCase().trim();
  const rawRole = (typeof member.role === 'string' ? member.role : '').toLowerCase().trim();
  const rawStatus = (typeof member.status === 'string' ? member.status : '').toLowerCase().trim();
  const rawEmail = (typeof member.email === 'string' ? member.email : '').toLowerCase().trim();

  // 1. Direct jabatan matches
  if (rawJabatan === 'president' || rawJabatan === 'ketua' || rawJabatan.includes('ketua') || rawJabatan.includes('president')) {
    return CANONICAL_ROLE_DETAILS.president;
  }
  if (rawJabatan === 'vice_president' || rawJabatan === 'wakil' || rawJabatan.includes('wakil') || rawJabatan.includes('vice')) {
    return CANONICAL_ROLE_DETAILS.vice_president;
  }
  if (rawJabatan === 'secretary' || rawJabatan === 'sekretaris' || rawJabatan.includes('sekretaris') || rawJabatan.includes('secretary')) {
    return CANONICAL_ROLE_DETAILS.secretary;
  }
  if (rawJabatan === 'treasurer' || rawJabatan === 'bendahara' || rawJabatan.includes('bendahara') || rawJabatan.includes('treasur')) {
    return CANONICAL_ROLE_DETAILS.treasurer;
  }
  if (rawJabatan === 'pr' || rawJabatan === 'humas' || rawJabatan.includes('humas') || rawJabatan.includes('public relation')) {
    return CANONICAL_ROLE_DETAILS.pr;
  }
  if (rawJabatan === 'advisor' || rawJabatan === 'pembina' || rawJabatan.includes('pembina') || rawJabatan.includes('advisor')) {
    return CANONICAL_ROLE_DETAILS.advisor;
  }
  if (rawJabatan === 'admin' || rawJabatan.includes('admin')) {
    return CANONICAL_ROLE_DETAILS.admin;
  }

  // 2. Role matches
  if (rawRole === 'admin' || rawRole === 'head admin' || rawRole === 'administrator') {
    return CANONICAL_ROLE_DETAILS.admin;
  }
  if (rawRole === 'pembina' || rawRole === 'advisor' || rawRole.includes('pembina') || rawRole.includes('advisor') || rawEmail.startsWith('pembina@')) {
    return CANONICAL_ROLE_DETAILS.advisor;
  }
  if (rawRole === 'ketua' || rawRole === 'president' || rawEmail.startsWith('ketua@')) {
    return CANONICAL_ROLE_DETAILS.president;
  }
  if (rawRole === 'bendahara' || rawRole === 'treasurer' || rawRole.includes('bendahara') || rawRole.includes('treasurer')) {
    return CANONICAL_ROLE_DETAILS.treasurer;
  }
  if (rawRole === 'sekretaris' || rawRole === 'secretary' || rawRole.includes('sekretaris') || rawRole.includes('secretary')) {
    return CANONICAL_ROLE_DETAILS.secretary;
  }
  if (rawRole === 'pr' || rawRole === 'humas' || rawRole.includes('humas') || rawRole.includes('public relation')) {
    return CANONICAL_ROLE_DETAILS.pr;
  }
  if (rawRole === 'bph' || rawRole === 'vice_president' || rawRole.includes('wakil') || rawRole.includes('vice') || rawEmail.startsWith('wakil@')) {
    return CANONICAL_ROLE_DETAILS.vice_president;
  }
  if (rawRole === 'executive_board' || rawRole.includes('executive') || rawStatus === 'executive_board') {
    return CANONICAL_ROLE_DETAILS.vice_president;
  }

  return CANONICAL_ROLE_DETAILS.member;
}

/**
 * Normalizes any free-form role or title string (or user session object) to canonical AppRole
 */
export function normalizeRole(
  roleOrSession?: string | { role?: string | null; jabatan?: string | null; membershipStatus?: string | null } | null
): AppRole {
  if (!roleOrSession) return 'anggota';

  let roleStr = '';
  if (typeof roleOrSession === 'object') {
    roleStr = (typeof roleOrSession.jabatan === 'string' && roleOrSession.jabatan) ||
              (typeof roleOrSession.role === 'string' && roleOrSession.role) ||
              (typeof roleOrSession.membershipStatus === 'string' && roleOrSession.membershipStatus) || '';
  } else if (typeof roleOrSession === 'string') {
    roleStr = roleOrSession;
  } else {
    roleStr = String(roleOrSession);
  }

  if (!roleStr) return 'anggota';
  const clean = roleStr.toLowerCase().trim();

  if (clean === 'admin' || clean === 'head admin' || clean.includes('admin')) {
    return 'admin';
  }
  if (clean.includes('pembina') || clean.includes('advisor') || clean.includes('guru') || clean.includes('counselor')) {
    return 'pembina';
  }
  if (clean.includes('president') || clean.includes('presiden') || clean.includes('ketua')) {
    return 'ketua';
  }
  if (clean.includes('pr') || clean.includes('humas') || clean.includes('public relation') || clean.includes('public relations')) {
    return 'pr';
  }
  if (clean.includes('vice') || clean.includes('wakil') || clean.includes('bph') || clean.includes('executive')) {
    return 'bph';
  }
  if (clean.includes('sekretaris') || clean.includes('secretary')) {
    return 'sekretaris';
  }
  if (clean.includes('bendahara') || clean.includes('treasurer') || clean.includes('finance')) {
    return 'bendahara';
  }
  if (clean.includes('pengurus') || clean.includes('lead') || clean.includes('coordinator')) {
    return 'bph';
  }
  return 'anggota';
}

/**
 * Checks if a role or session belongs to Executive Board or Advisor category.
 * Accepts either:
 * - (session: UserSession | object)
 * - (roleStr: string, titleStr?: string)
 */
export function isExecutiveOrAdvisor(
  roleOrSession?: string | { role?: string | null; jabatan?: string | null; membershipStatus?: string | null; username?: string | null; email?: string | null; authProvider?: string | null } | null,
  titleStr?: string | null
): boolean {
  if (!roleOrSession) return false;

  let roleStr = '';
  let effectiveTitle = typeof titleStr === 'string' ? titleStr : '';

  if (typeof roleOrSession === 'object') {
    // If a session or member object is passed directly
    const sessionObj = roleOrSession;
    const canonical = getCanonicalRole(sessionObj);
    if (canonical === 'admin' || canonical === 'executive_board' || canonical === 'advisor') {
      return true;
    }
    roleStr = typeof sessionObj.role === 'string' ? sessionObj.role : '';
    if (!effectiveTitle) {
      effectiveTitle = (typeof sessionObj.jabatan === 'string' ? sessionObj.jabatan : '') ||
                       (typeof sessionObj.membershipStatus === 'string' ? sessionObj.membershipStatus : '');
    }
  } else if (typeof roleOrSession === 'string') {
    roleStr = roleOrSession;
  } else {
    roleStr = String(roleOrSession);
  }

  if (effectiveTitle) {
    const t = effectiveTitle.toLowerCase().trim();
    if (['admin', 'president', 'vice_president', 'secretary', 'treasurer', 'pr', 'advisor', 'pembina', 'ketua', 'bph', 'sekretaris', 'bendahara', 'humas', 'wakil', 'executive_board'].includes(t)) {
      return true;
    }
  }

  const clean = (roleStr || '').toLowerCase().trim();
  if (clean === 'executive_board' || clean.includes('executive')) {
    return true;
  }
  const r = normalizeRole(roleStr);
  return r === 'admin' || r === 'ketua' || r === 'pembina' || r === 'bph' || r === 'pr' || r === 'sekretaris' || r === 'bendahara';
}

export function isExecutiveRole(
  roleOrSession?: string | { role?: string | null; jabatan?: string | null; membershipStatus?: string | null; username?: string | null; email?: string | null; authProvider?: string | null } | null
): boolean {
  if (!roleOrSession) return false;
  if (typeof roleOrSession === 'object') {
    const canonical = getCanonicalRole(roleOrSession);
    return canonical === 'executive_board' || canonical === 'admin';
  }
  const clean = (typeof roleOrSession === 'string' ? roleOrSession : String(roleOrSession)).toLowerCase().trim();
  if (clean === 'executive_board' || clean.includes('executive')) {
    return true;
  }
  const r = normalizeRole(clean);
  return r === 'admin' || r === 'ketua' || r === 'bph' || r === 'pr' || r === 'sekretaris' || r === 'bendahara';
}

export function isAdvisor(
  roleOrSession?: string | { role?: string | null; jabatan?: string | null; membershipStatus?: string | null; username?: string | null; email?: string | null; authProvider?: string | null } | null
): boolean {
  if (!roleOrSession) return false;
  if (typeof roleOrSession === 'object') {
    return getCanonicalRole(roleOrSession) === 'advisor';
  }
  return normalizeRole(roleOrSession) === 'pembina';
}

export function isMember(
  roleOrSession?: string | { role?: string | null; jabatan?: string | null; membershipStatus?: string | null; username?: string | null; email?: string | null; authProvider?: string | null } | null
): boolean {
  if (!roleOrSession) return true;
  if (typeof roleOrSession === 'object') {
    return getCanonicalRole(roleOrSession) === 'member';
  }
  return normalizeRole(roleOrSession) === 'anggota';
}

/**
 * Determines whether the current user is the creator of the club room
 */
export function isRoomCreator(
  org: { creatorUsername?: string; id?: string; isDefault?: boolean } | null | undefined,
  session: { username?: string; email?: string; role?: string; jabatan?: string } | null | undefined
): boolean {
  if (!org || !session) return false;
  const user = (session.username || '').toLowerCase().trim();
  const creator = (org.creatorUsername || 'admin').toLowerCase().trim();

  // If username matches creator
  if (user && user === creator) return true;
  // Default club initial creator check
  if (user === 'admin' && (org.isDefault || !org.creatorUsername || creator === 'admin')) return true;

  return false;
}

/**
 * Checks if the user is authorized to view the private room join/access code.
 * ONLY the room creator / founder admin is allowed to see this code.
 */
export function canViewJoinCode(
  org: { creatorUsername?: string; id?: string; isDefault?: boolean } | null | undefined,
  session: { username?: string; email?: string; role?: string; jabatan?: string } | null | undefined
): boolean {
  return isRoomCreator(org, session);
}

/**
 * Checks whether a given role holds a specific permission
 */
export function hasPermission(
  roleOrSession: string | { role?: string | null; jabatan?: string | null; membershipStatus?: string | null } | undefined | null,
  permission: Permission,
  titleStr?: string | null
): boolean {
  let roleStr = '';
  let effectiveTitle = typeof titleStr === 'string' ? titleStr : '';
  if (roleOrSession && typeof roleOrSession === 'object') {
    roleStr = typeof roleOrSession.role === 'string' ? roleOrSession.role : '';
    if (!effectiveTitle) {
      effectiveTitle = (typeof roleOrSession.jabatan === 'string' ? roleOrSession.jabatan : '') ||
                       (typeof roleOrSession.membershipStatus === 'string' ? roleOrSession.membershipStatus : '');
    }
  } else if (typeof roleOrSession === 'string') {
    roleStr = roleOrSession;
  } else {
    roleStr = roleOrSession ? String(roleOrSession) : '';
  }

  const cleanRole = roleStr.toLowerCase().trim();
  const cleanTitle = effectiveTitle.toLowerCase().trim();
  const canonicalRole = normalizeRole(cleanTitle || cleanRole);
  const def = ROLE_DEFINITIONS[canonicalRole];
  if (!def) return false;
  return def.permissions.includes(permission);
}

export function hasAnyPermission(roleStr: string | undefined | null, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(roleStr, p));
}

export function hasAllPermissions(roleStr: string | undefined | null, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(roleStr, p));
}

/**
 * Strictly verifies whether the user is authorized to configure calendar settings,
 * change date/academic year modes, edit/delete calendar markers/deadlines,
 * or toggle attendance schedule testing bypasses.
 * 
 * ONLY Head Administrator, Club President (Ketua), or Faculty Advisor (Pembina)
 * are authorized. All other roles (Vice President, Secretary, Treasurer, PR, Members, Viewers)
 * are strictly view-only.
 */
export function canConfigureCalendar(
  session: { role?: string | null; username?: string | null; email?: string | null; jabatan?: string | null } | null | undefined
): boolean {
  if (!session) return false;
  const canonical = getCanonicalRole(session);
  if (canonical === 'admin' || canonical === 'advisor') return true;

  const cleanJabatan = (session.jabatan || '').toLowerCase().trim();
  const cleanRole = (session.role || '').toLowerCase().trim();

  return (
    cleanJabatan === 'advisor' ||
    cleanJabatan === 'pembina' ||
    cleanRole === 'pembina' ||
    cleanRole === 'advisor' ||
    cleanJabatan === 'president' ||
    cleanJabatan === 'ketua' ||
    cleanRole === 'ketua' ||
    cleanRole === 'president'
  );
}

/**
 * Identifies if the session belongs exclusively to the Treasurer
 */
export function isTreasurer(session?: {
  role?: string | null;
  jabatan?: string | null;
  membershipStatus?: string | null;
  username?: string | null;
} | null): boolean {
  if (!session) return false;
  const cleanJabatan = (session.jabatan || '').toLowerCase().trim();
  const cleanRole = (session.role || '').toLowerCase().trim();
  const cleanUser = (session.username || '').toLowerCase().trim();
  return (
    cleanJabatan === 'treasurer' ||
    cleanJabatan === 'bendahara' ||
    cleanRole === 'bendahara' ||
    cleanRole === 'treasurer' ||
    cleanRole.includes('bendahara') ||
    cleanRole.includes('treasurer') ||
    cleanUser === 'bendahara' ||
    cleanUser === 'treasurer'
  );
}

/**
 * Identifies if the session belongs exclusively to the Primary System Administrator (Head Admin)
 */
export function isHeadAdmin(session?: {
  role?: string | null;
  jabatan?: string | null;
  username?: string | null;
  email?: string | null;
} | null): boolean {
  if (!session) return false;
  const cleanJabatan = (session.jabatan || '').toLowerCase().trim();
  const cleanRole = (session.role || '').toLowerCase().trim();
  const cleanUser = (session.username || '').toLowerCase().trim();
  const cleanEmail = (session.email || '').toLowerCase().trim();

  // 1. Non-admin positions must NEVER be elevated to Head Admin,
  // even if simulated from an admin session or demo_admin username!
  const nonHeadAdminJabatan = [
    'president', 'ketua', 'wakil', 'vice_president', 'bph',
    'secretary', 'sekretaris', 'treasurer', 'bendahara', 'pr', 'humas',
    'pembina', 'advisor', 'member', 'anggota'
  ];
  if (nonHeadAdminJabatan.includes(cleanJabatan)) {
    return false;
  }
  const nonHeadAdminRoles = [
    'ketua', 'sekretaris', 'bendahara', 'humas', 'bph',
    'pembina', 'advisor', 'anggota', 'member', 'vice_president', 'secretary', 'treasurer', 'pr'
  ];
  if (nonHeadAdminRoles.includes(cleanRole)) {
    return false;
  }

  const envAdminEmail = (
    (typeof process !== 'undefined' && (process.env?.VITE_ADMIN_EMAIL || process.env?.ADMIN_EMAIL)) ||
    (typeof import.meta !== 'undefined' && ((import.meta as any).env?.VITE_ADMIN_EMAIL || (import.meta as any).env?.ADMIN_EMAIL)) ||
    'roboticman2kotabekasi@gmail.com'
  ).toLowerCase().trim();
  const envAdminUser = envAdminEmail.split('@')[0].toLowerCase().trim();

  // 2. Direct Administrator Verification:
  // If the user matches official admin credentials and holds no non-admin jabatan/role, they are definitively Head Admin.
  const isDirectAdmin = (
    cleanEmail === envAdminEmail ||
    cleanEmail === 'roboticman2kotabekasi@gmail.com' ||
    cleanUser === envAdminUser ||
    cleanUser === 'admin' ||
    cleanUser === 'demo_admin' ||
    cleanUser === 'roboman2' ||
    cleanUser === 'roboticman2kotabekasi' ||
    cleanRole === 'admin' ||
    cleanRole === 'administrator' ||
    cleanRole === 'head admin' ||
    cleanRole === 'administrator (head admin)'
  );

  return isDirectAdmin;
}

/**
 * Strict Security Guard: Only Secretary (Sekretaris), President (Ketua),
 * Vice President (Wakil / BPH), Faculty Advisor (Pembina), and Primary Administrator (Admin)
 * are authorized to view or access the Member Directory (Roster).
 * Treasurer (Bendahara), Public Relations (PR / Humas), General Members, and Guests are strictly denied.
 */
export function canViewMemberDirectory(session?: {
  role?: string | null;
  jabatan?: string | null;
  username?: string | null;
  email?: string | null;
} | null): boolean {
  if (!session) return false;
  
  // 1. Primary Administrator
  if (isHeadAdmin(session)) return true;
  
  // 2. Faculty Advisor (Pembina)
  if (isAdvisor(session)) return true;

  const cleanJabatan = (session.jabatan || '').toLowerCase().trim();
  const cleanRole = (session.role || '').toLowerCase().trim();
  const cleanUser = (session.username || '').toLowerCase().trim();

  // Explicit Exclusion Guard: Treasurer, PR, Member, and Guests are strictly denied
  const isExcludedJabatan = ['treasurer', 'bendahara', 'pr', 'humas', 'member', 'anggota', 'guest'].includes(cleanJabatan);
  const isExcludedRole = ['treasurer', 'bendahara', 'pr', 'humas', 'member', 'anggota', 'guest'].includes(cleanRole);
  const isExcludedUser = ['bendahara', 'demo_bendahara', 'treasurer', 'pr', 'demo_pr', 'humas', 'member', 'demo_member', 'demo_tamu', 'guest'].includes(cleanUser);

  if (isExcludedJabatan || isExcludedRole || isExcludedUser) {
    return false;
  }

  // 3. President (Ketua)
  const isPresident = 
    cleanJabatan === 'president' || 
    cleanJabatan === 'ketua' || 
    cleanRole === 'ketua' || 
    cleanRole === 'president' || 
    cleanRole.includes('president') ||
    cleanRole.includes('ketua') ||
    cleanUser === 'ketua' || 
    cleanUser === 'demo_ketua';

  // 4. Vice President (Wakil Ketua / BPH)
  const isVicePresident = 
    cleanJabatan === 'vice_president' || 
    cleanJabatan === 'wakil' || 
    cleanJabatan === 'wakil_ketua' || 
    cleanJabatan === 'bph' || 
    cleanRole === 'bph' || 
    cleanRole === 'vice_president' || 
    cleanRole === 'wakil' || 
    cleanRole.includes('vice') ||
    cleanRole.includes('wakil') ||
    cleanUser === 'bph' || 
    cleanUser === 'demo_bph' || 
    cleanUser === 'demo_executive' ||
    cleanUser === 'wakil';

  // 5. Secretary (Sekretaris)
  const isSecretary = 
    cleanJabatan === 'secretary' || 
    cleanJabatan === 'sekretaris' || 
    cleanRole === 'sekretaris' || 
    cleanRole === 'secretary' || 
    cleanRole.includes('secretary') ||
    cleanRole.includes('sekretaris') ||
    cleanUser === 'sekretaris' || 
    cleanUser === 'demo_sekretaris' || 
    cleanUser === 'secretary';

  return Boolean(isPresident || isVicePresident || isSecretary);
}

/**
 * Evaluates permission based directly on the validated session's canonical role.
 * Prevents client-side role tampering or localStorage forgery from granting administrative actions.
 */
export function hasSessionPermission(
  session: { role?: string | null; username?: string | null; email?: string | null; jabatan?: string | null; membershipStatus?: string | null } | null | undefined,
  permission: Permission
): boolean {
  if (!session) return false;

  // 0. Strict Member Directory Viewing & Export Authority:
  // ONLY Secretary, President, Vice President (BPH), Advisor, and Admin
  if (permission === 'members:view' || permission === 'members:export') {
    return canViewMemberDirectory(session);
  }

  if (permission === 'members:view_sensitive') {
    return canViewSensitiveStudentData(session);
  }

  // 1. Strict Treasury (Kas) Authority:
  // Read/Export: Officers, Advisor, Admin (not regular members)
  // Write/Delete/Reset: EXCLUSIVELY Treasurer (Bendahara) & Verified Head Admin
  if (permission.startsWith('cash:')) {
    if (permission === 'cash:view' || permission === 'cash:export') {
      return isHeadAdmin(session) || isTreasurer(session) || isAdvisor(session) || getCanonicalRole(session) === 'executive_board';
    }
    return canManageCashData(session);
  }

  // 2. Strict Student Master Data Authority (Create, Edit, Delete, Import):
  // EXCLUSIVELY Head Admin, President (Ketua), or Faculty Advisor (Pembina)
  if (
    permission === 'members:create' ||
    permission === 'members:edit' ||
    permission === 'members:delete' ||
    permission === 'members:import'
  ) {
    return canManageMemberData(session);
  }

  // 3. Strict Calendar Authority: ONLY Head Admin, President, or Faculty Advisor
  if (permission === 'calendar:edit') {
    return canConfigureCalendar(session);
  }

  // 4. Strict Role Promotion & RBAC Governance: ONLY President, Advisor, or Admin
  if (
    permission === 'members:promote' ||
    permission === 'rbac:manage' ||
    permission === 'system:configure'
  ) {
    return canPromoteUserRole(session);
  }

  // 5. Strict Announcements Authority:
  // EXCLUSIVELY Secretary (Sekretaris), PR (Humas), President, or Admin
  if (
    permission === 'announcements:create' ||
    permission === 'announcements:delete'
  ) {
    return canManageAnnouncements(session);
  }

  // 6. Strict Group Attendance Write Authority:
  // Secretary, Admin, Advisor (and President for reset)
  if (permission === 'attendance:reset') {
    const cleanJabatan = (session.jabatan || '').toLowerCase().trim();
    const cleanRole = (session.role || '').toLowerCase().trim();
    return canManageGroupAttendance(session) || cleanJabatan === 'president' || cleanJabatan === 'ketua' || cleanRole === 'ketua' || cleanRole === 'president';
  }
  if (
    permission === 'attendance:edit' ||
    permission === 'attendance:delete'
  ) {
    return canManageGroupAttendance(session);
  }

  // 7. Strict Assignments Creation & Deletion Authority:
  // Secretary, President, Admin, Advisor (VP, Treasurer and PR cannot create or delete assignments)
  if (
    permission === 'assignments:create' ||
    permission === 'assignments:delete'
  ) {
    const cleanJabatan = (session.jabatan || '').toLowerCase().trim();
    const cleanRole = (session.role || '').toLowerCase().trim();
    if (isTreasurer(session)) return false;
    return isHeadAdmin(session) || isAdvisor(session) || ['president', 'ketua', 'secretary', 'sekretaris'].includes(cleanJabatan) || ['admin', 'ketua', 'president', 'sekretaris', 'secretary'].includes(cleanRole);
  }

  // 8. Strict Assignments Grading Authority:
  // Secretary, President, VP / BPH, Admin, Advisor
  if (permission === 'assignments:grade') {
    const cleanJabatan = (session.jabatan || '').toLowerCase().trim();
    const cleanRole = (session.role || '').toLowerCase().trim();
    if (isTreasurer(session)) return false;
    return isHeadAdmin(session) || isAdvisor(session) || ['president', 'ketua', 'vice_president', 'wakil', 'bph', 'secretary', 'sekretaris'].includes(cleanJabatan) || ['admin', 'ketua', 'president', 'bph', 'vice_president', 'sekretaris', 'secretary'].includes(cleanRole);
  }

  // Verified Head Admin holds full access
  if (isHeadAdmin(session)) {
    return true;
  }

  const canonical = getCanonicalRole(session);

  if (canonical === 'advisor' || isAdvisor(session) || canonical === 'executive_board') {
    return (
      permission === 'attendance:view' ||
      permission === 'attendance:create' ||
      permission === 'attendance:export' ||
      permission === 'calendar:view' ||
      permission === 'assignments:view' ||
      permission === 'announcements:view' ||
      permission === 'room:maintenance'
    );
  }

  const memberPermissions: Permission[] = [
    'attendance:view',
    'attendance:create',
    'calendar:view',
    'assignments:view',
    'announcements:view',
  ];
  return memberPermissions.includes(permission);
}

/**
 * Returns role display metadata
 */
export function getRoleMetadata(roleStr?: string | null): RoleDefinition {
  const canonical = normalizeRole(roleStr);
  return ROLE_DEFINITIONS[canonical] || ROLE_DEFINITIONS.anggota;
}

/**
 * Format executive title with icon and label
 */
export function formatTitleLabel(title?: string | null): string {
  if (!title || typeof title !== 'string') return 'Member';
  const clean = title.toLowerCase().trim();
  const details = getMemberRoleDetails({ jabatan: clean, role: clean });
  if (details && details.id !== 'member') {
    return details.badgeLabel;
  }
  const found = EXECUTIVE_TITLES.find(t => t.id === clean);
  if (found) return found.badge;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export type CanonicalUserRole = 'admin' | 'executive_board' | 'advisor' | 'member';

/**
 * Normalizes any user session strictly into one of four canonical roles:
 * 'admin' | 'executive_board' | 'advisor' | 'member'
 */
export function getCanonicalRole(session?: {
  role?: string | null;
  jabatan?: string | null;
  membershipStatus?: string | null;
  username?: string | null;
  email?: string | null;
  authProvider?: string | null;
} | null): CanonicalUserRole {
  if (!session) return 'member';
  const cleanRole = (typeof session.role === 'string' ? session.role : '').toLowerCase().trim();
  const cleanJabatan = (typeof session.jabatan === 'string' ? session.jabatan : '').toLowerCase().trim();
  const cleanStatus = (typeof session.membershipStatus === 'string' ? session.membershipStatus : '').toLowerCase().trim();
  const username = (typeof session.username === 'string' ? session.username : '').toLowerCase().trim();
  const email = (typeof session.email === 'string' ? session.email : '').toLowerCase().trim();

  // 0. Primary Administrator Check: Strictly restricted to verified administrator identifiers & ENV email
  if (isHeadAdmin(session)) {
    return 'admin';
  }

  // 1. Faculty Advisor (Supervisory Oversight)
  if (
    username === 'pembina' ||
    username === 'demo_pembina' ||
    (email && email === 'pembina@man2kotabekasi.sch.id') ||
    cleanRole === 'advisor' ||
    cleanRole === 'faculty advisor' ||
    cleanRole === 'pembina' ||
    cleanRole.includes('pembina') ||
    cleanJabatan === 'advisor' ||
    cleanJabatan === 'pembina'
  ) {
    return 'advisor';
  }

  // 2. Authorized Executive Board (President, VP, Secretary, Treasurer, PR, BPH, or promoted executive officers)
  const isExecutiveTitle = [
    'president', 'vice_president', 'secretary', 'treasurer', 'pr',
    'bph', 'sekretaris', 'bendahara', 'humas', 'ketua', 'wakil', 'wakil_ketua', 'executive_board'
  ].includes(cleanJabatan);

  const isExecutiveRole = 
    cleanRole === 'executive_board' ||
    cleanRole.includes('executive') ||
    cleanStatus === 'executive_board' ||
    cleanRole === 'bph' ||
    cleanRole === 'sekretaris' ||
    cleanRole === 'secretary' ||
    cleanRole === 'bendahara' ||
    cleanRole === 'treasurer' ||
    cleanRole === 'pr' ||
    cleanRole === 'humas' ||
    cleanRole === 'vice_president' ||
    cleanRole === 'ketua' ||
    cleanRole.includes('bendahara') ||
    cleanRole.includes('sekretaris') ||
    cleanRole.includes('treasurer') ||
    cleanRole.includes('humas');

  const isAuthorizedExecutive = 
    username === 'executive_board' ||
    username === 'demo_executive' ||
    username === 'ketua' ||
    username === 'wakil' ||
    username === 'bph' ||
    username === 'sekretaris' ||
    username === 'bendahara' ||
    username === 'pr' ||
    email === 'executive@man2kotabekasi.sch.id' ||
    isExecutiveRole ||
    isExecutiveTitle;

  if (isAuthorizedExecutive) {
    return 'executive_board';
  }

  // 3. Default Strict Security Fallback: Regular member
  return 'member';
}

/**
 * Strict Security Guard: EXCLUSIVELY Primary Admin and Public Relations (PR / Humas)
 * are permitted to broadcast, create, pin, or delete official club announcements.
 * Secretary (Sekretaris), Treasurer, Advisor, VP, and General Members are strictly view-only.
 */
export function canManageAnnouncements(session?: {
  role?: string | null;
  jabatan?: string | null;
  membershipStatus?: string | null;
  username?: string | null;
  email?: string | null;
} | null): boolean {
  if (!session) return false;
  if (isHeadAdmin(session)) return true;

  const cleanJabatan = (session.jabatan || '').toLowerCase().trim();
  const cleanRole = (session.role || '').toLowerCase().trim();
  const cleanUser = (session.username || '').toLowerCase().trim();

  // Public Relations (PR / Humas) EXCLUSIVELY
  if (
    cleanJabatan === 'pr' ||
    cleanJabatan === 'humas' ||
    cleanRole === 'pr' ||
    cleanRole === 'humas' ||
    cleanUser === 'pr' ||
    cleanUser === 'demo_pr' ||
    cleanUser === 'humas' ||
    cleanRole.includes('public relation') ||
    cleanJabatan.includes('public relation') ||
    cleanRole.includes('humas') ||
    cleanJabatan.includes('humas')
  ) {
    return true;
  }

  return false;
}

/**
 * Strict Security Guard: EXCLUSIVELY Admin, Advisor (Pembina), and President (Ketua)
 * are permitted to create, edit, delete, or import student member records.
 * VP, Secretary, Treasurer, PR, and General Members cannot modify master student data.
 */
export function canManageMemberData(session?: {
  role?: string | null;
  jabatan?: string | null;
  membershipStatus?: string | null;
  username?: string | null;
  email?: string | null;
} | null): boolean {
  if (!session) return false;
  if (isHeadAdmin(session) || isAdvisor(session)) return true;

  const cleanJabatan = (session.jabatan || '').toLowerCase().trim();
  const cleanRole = (session.role || '').toLowerCase().trim();

  return (
    cleanJabatan === 'president' ||
    cleanJabatan === 'ketua' ||
    cleanRole === 'ketua' ||
    cleanRole === 'president'
  );
}

/**
 * Strict Security Guard: EXCLUSIVELY Treasurer (Bendahara) and Primary Administrator
 * are permitted to record dues, log expenses, delete, or reset club cashbooks.
 */
export function canManageCashData(session?: {
  role?: string | null;
  jabatan?: string | null;
  membershipStatus?: string | null;
  username?: string | null;
  email?: string | null;
} | null): boolean {
  if (!session) return false;
  return isHeadAdmin(session) || isTreasurer(session);
}

/**
 * Strict Security Guard: EXCLUSIVELY Admin, Advisor (Pembina), and Secretary (Sekretaris)
 * are permitted to record, modify, and manage group/class attendance records.
 */
export function canManageGroupAttendance(session?: {
  role?: string | null;
  jabatan?: string | null;
  membershipStatus?: string | null;
  username?: string | null;
  email?: string | null;
} | null): boolean {
  if (!session) return false;
  if (isHeadAdmin(session)) return true;

  const cleanJabatan = (session.jabatan || '').toLowerCase().trim();
  const cleanRole = (session.role || '').toLowerCase().trim();
  const cleanUser = (session.username || '').toLowerCase().trim();

  if (
    isAdvisor(session) ||
    cleanJabatan === 'advisor' ||
    cleanJabatan === 'pembina' ||
    cleanRole === 'pembina' ||
    cleanRole === 'advisor' ||
    cleanUser === 'pembina' ||
    cleanUser === 'demo_pembina'
  ) {
    return true;
  }

  if (
    cleanJabatan === 'secretary' ||
    cleanJabatan === 'sekretaris' ||
    cleanRole === 'sekretaris' ||
    cleanRole === 'secretary' ||
    cleanUser === 'sekretaris' ||
    cleanUser === 'demo_sekretaris'
  ) {
    return true;
  }

  return false;
}

/**
 * Strict Security Guard: Primary Administrator, Advisor, and President
 * can promote members, assign executive titles, or manage RBAC accounts.
 */
export function canPromoteUserRole(session?: {
  role?: string | null;
  jabatan?: string | null;
  membershipStatus?: string | null;
  username?: string | null;
  email?: string | null;
} | null): boolean {
  if (!session) return false;
  const canonical = getCanonicalRole(session);
  if (canonical === 'admin' || canonical === 'advisor') return true;

  const cleanJabatan = (session.jabatan || '').toLowerCase().trim();
  const cleanRole = (session.role || '').toLowerCase().trim();

  return (
    cleanJabatan === 'president' ||
    cleanJabatan === 'ketua' ||
    cleanRole === 'ketua' ||
    cleanRole === 'president' ||
    cleanJabatan === 'advisor' ||
    cleanJabatan === 'pembina' ||
    cleanRole === 'advisor' ||
    cleanRole === 'pembina'
  );
}

/**
 * Strict Security Guard: Segregation of Duties (SoD) & Anti-Self-Promotion.
 * Prevents privilege escalation and unauthorized self-assignment.
 * 
 * Rules:
 * 1. ANTI-SELF-PROMOTION: An actor CANNOT modify their own role/title under any circumstances.
 *    (e.g., President cannot change themselves into Treasurer to gain access to club cashbooks).
 * 2. SUPER-ADMIN PRIVILEGE CONFINEMENT: Only verified Primary Administrator ('admin') can assign 'admin' or 'advisor'.
 *    A student President cannot grant Super-Admin or Advisor privileges to anyone.
 * 3. CORE ADMIN IMMUTABILITY: Neither President nor any officer can demote or alter Core Admin accounts.
 */
export function canActorModifyTargetRole(
  actorSession?: {
    username?: string | null;
    email?: string | null;
    role?: string | null;
    jabatan?: string | null;
    nisn?: string | null;
    name?: string | null;
  } | null,
  target?: {
    username?: string | null;
    email?: string | null;
    nisn?: string | null;
    role?: string | null;
    name?: string | null;
    fullName?: string | null;
  } | null,
  newRoleOrTitle?: string | null
): { allowed: boolean; reason?: string } {
  if (!actorSession) {
    return { allowed: false, reason: 'Session expired or not authenticated.' };
  }

  // Base permission check
  if (!canPromoteUserRole(actorSession)) {
    return { allowed: false, reason: 'Access Denied: You do not hold permissions to manage club roles.' };
  }

  const actorUser = (actorSession.username || '').toLowerCase().trim();
  const actorEmail = (actorSession.email || '').toLowerCase().trim();
  const actorNisn = (actorSession.nisn || '').trim();
  const actorName = (actorSession.name || '').toLowerCase().trim();

  const targetUser = (target?.username || '').toLowerCase().trim();
  const targetEmail = (target?.email || '').toLowerCase().trim();
  const targetNisn = (target?.nisn || '').trim();
  const targetName = (target?.fullName || target?.name || '').toLowerCase().trim();

  // Rule 1: Anti-Self-Promotion Guard (Strict Segregation of Duties)
  // An actor cannot modify their own role or title to prevent privilege escalation
  const isSelf = Boolean(
    (actorUser && targetUser && actorUser === targetUser) ||
    (actorEmail && targetEmail && actorEmail === targetEmail) ||
    (actorNisn && targetNisn && actorNisn === targetNisn) ||
    (actorName && targetName && actorName === targetName) ||
    (actorNisn && targetUser && actorNisn === targetUser)
  );

  if (isSelf) {
    return {
      allowed: false,
      reason: 'Anti-Self-Promotion Guard: Anda tidak dapat mengubah peran atau jabatan akun Anda sendiri demi mematuhi prinsip Segregation of Duties (Pencegahan Konflik Kepentingan & Eskalasi Kas).'
    };
  }

  // Rule 2: Protection of Core Admin
  if (targetUser === 'admin') {
    return {
      allowed: false,
      reason: 'Akun Administrator Inti (@admin) dilindungi dan tidak dapat diubah oleh pengurus.'
    };
  }

  // Rule 2b: Protection of Advisor (Guru Pembina) accounts - ONLY Head Admin can modify an Advisor account
  const isActorHeadAdmin = isHeadAdmin(actorSession);
  const targetRoleClean = (target?.role || '').toLowerCase().trim();
  const targetJabatanClean = ((target as any)?.jabatan || '').toLowerCase().trim();
  const isTargetAdvisor = 
    targetUser === 'pembina' || 
    targetUser === 'demo_pembina' ||
    targetRoleClean === 'advisor' || 
    targetRoleClean === 'pembina' || 
    targetRoleClean.includes('advisor') || 
    targetRoleClean.includes('pembina') ||
    targetJabatanClean === 'advisor' || 
    targetJabatanClean === 'pembina';

  if (isTargetAdvisor && !isActorHeadAdmin) {
    return {
      allowed: false,
      reason: 'Otoritas Terbatas: Akun Guru Pembina hanya dapat dikelola atau diubah statusnya oleh Administrator Utama.'
    };
  }

  // Rule 3: Confine promotion privileges if actor is not Head Admin
  if (!isActorHeadAdmin && newRoleOrTitle) {
    const cleanNew = newRoleOrTitle.toLowerCase().trim();
    if (
      cleanNew === 'admin' ||
      cleanNew.includes('administrator') ||
      cleanNew === 'advisor' ||
      cleanNew === 'pembina' ||
      cleanNew.includes('advisor') ||
      cleanNew.includes('pembina') ||
      cleanNew === 'president' ||
      cleanNew === 'ketua'
    ) {
      return {
        allowed: false,
        reason: 'Otoritas Terbatas: Hanya Administrator Utama yang berhak menetapkan peran Administrator Inti atau Guru Pembina.'
      };
    }
  }

  return { allowed: true };
}

/**
 * Strict Privacy & Identity Protection (Anti-Impersonation Guard):
 * Determines whether the current session is authorized to view unmasked student PII
 * (National ID / NIK, Student Birth Date / Login Credential, and Parent Phone Number).
 * 
 * Only:
 * 1. Head Administrator (President / Admin)
 * 2. Faculty Advisor
 * 3. Secretary for official school documentation
 * 4. The student themselves viewing their own profile
 * 
 * General members, other students, and guests are provided masked/redacted data.
 */
export function canViewSensitiveStudentData(
  viewerSession?: {
    role?: string | null;
    jabatan?: string | null;
    username?: string | null;
    email?: string | null;
    nisn?: string | null;
    studentId?: string | null;
  } | null,
  targetMember?: {
    nisn?: string | null;
    email?: string | null;
    id_member?: string | number | null;
  } | null
): boolean {
  if (!viewerSession) return false;

  // 1. If viewer is viewing their own profile
  if (targetMember) {
    if (viewerSession.nisn && targetMember.nisn && String(viewerSession.nisn).trim() === String(targetMember.nisn).trim()) {
      return true;
    }
    if (viewerSession.studentId && targetMember.id_member && String(viewerSession.studentId).trim() === String(targetMember.id_member).trim()) {
      return true;
    }
    if (
      viewerSession.email &&
      targetMember.email &&
      viewerSession.email.toLowerCase().trim() === targetMember.email.toLowerCase().trim()
    ) {
      return true;
    }
  }

  // 2. Canonical role check: Admin and Advisor
  const canonical = getCanonicalRole(viewerSession);
  if (canonical === 'admin' || canonical === 'advisor') {
    return true;
  }

  // 3. Official Executive Secretary or President
  const cleanTitle = (viewerSession.jabatan || '').toLowerCase().trim();
  const cleanRole = (viewerSession.role || '').toLowerCase().trim();
  const cleanUser = (viewerSession.username || '').toLowerCase().trim();

  if (
    cleanTitle === 'president' ||
    cleanTitle === 'secretary' ||
    cleanRole === 'sekretaris' ||
    cleanRole.includes('sekretaris') ||
    cleanRole.includes('secretary') ||
    cleanUser === 'sekretaris' ||
    cleanUser === 'ketua'
  ) {
    return true;
  }

  return false;
}

/**
 * Masks student NIK: keeps first 6 digits and last 4 digits, masks the middle digits with asterisks
 * e.g. "327508******0001"
 */
export function maskNik(nik?: string | null): string {
  if (!nik) return '-';
  const clean = String(nik).trim();
  if (clean.length < 8) return '••••••';
  const prefix = clean.slice(0, 6);
  const suffix = clean.slice(-4);
  const maskedCount = Math.max(4, clean.length - 10);
  return `${prefix}${'*'.repeat(maskedCount)}${suffix}`;
}

/**
 * Masks birth date to prevent student authentication impersonation
 * e.g. "••••-••-••"
 */
export function maskBirthDate(birthDate?: string | null): string {
  if (!birthDate) return '-';
  return '••••-••-••';
}

/**
 * Masks parent phone number to protect student family privacy:
 * e.g. "0812-••••-5678"
 */
export function maskParentPhone(phone?: string | null): string {
  if (!phone) return '-';
  const clean = String(phone).replace(/[^0-9]/g, '');
  if (clean.length < 8) return '••••••••';
  const prefix = clean.slice(0, 4);
  const suffix = clean.slice(-4);
  return `${prefix}-••••-${suffix}`;
}

/**
 * Granular RBAC feature matrix for UI table display (English)
 */
export interface RBACFeatureRow {
  category: string;
  feature: string;
  permission: Permission;
  admin: boolean;
  pembina: boolean;
  ketua: boolean;
  pr: boolean;
  bph: boolean;
  sekretaris: boolean;
  bendahara: boolean;
  anggota: boolean;
  description: string;
}

export const RBAC_MATRIX: RBACFeatureRow[] = [
  // Member Directory
  {
    category: 'Member Directory',
    feature: 'View Member Roster & Profiles',
    permission: 'members:view',
    admin: true, pembina: true, ketua: true, pr: false, bph: true, sekretaris: true, bendahara: false, anggota: false,
    description: 'Inspect member list and profiles (Strictly Secretary, President, VP, Advisor & Admin)'
  },
  {
    category: 'Member Directory',
    feature: 'Register & Edit Member Data',
    permission: 'members:create',
    admin: true, pembina: true, ketua: true, pr: false, bph: false, sekretaris: false, bendahara: false, anggota: false,
    description: 'Add new members and modify student academic profiles (Strictly President, Advisor & Admin)'
  },
  {
    category: 'Member Directory',
    feature: 'Promote to Admin & Assign Titles',
    permission: 'members:promote',
    admin: true, pembina: true, ketua: true, pr: false, bph: false, sekretaris: false, bendahara: false, anggota: false,
    description: 'Grant admin privileges and assign titles (Strictly President, Advisor & Admin)'
  },
  {
    category: 'Member Directory',
    feature: 'Delete & Reset Member Records',
    permission: 'members:delete',
    admin: true, pembina: true, ketua: true, pr: false, bph: false, sekretaris: false, bendahara: false, anggota: false,
    description: 'Remove resigned members or purge sandbox member list (Strictly President, Advisor & Admin)'
  },
  {
    category: 'Member Directory',
    feature: 'Import CSV & Bulk Roster Upload',
    permission: 'members:import',
    admin: true, pembina: true, ketua: true, pr: false, bph: false, sekretaris: false, bendahara: false, anggota: false,
    description: 'Bulk import students from spreadsheets or Google Forms export (Strictly President, Advisor & Admin)'
  },

  // Attendance Module
  {
    category: 'Attendance & Tracking',
    feature: 'View Attendance Records & Rates',
    permission: 'attendance:view',
    admin: true, pembina: true, ketua: true, pr: true, bph: true, sekretaris: true, bendahara: true, anggota: true,
    description: 'Review presence percentages and meeting log histories'
  },
  {
    category: 'Attendance & Tracking',
    feature: 'Log Meeting Attendance',
    permission: 'attendance:create',
    admin: true, pembina: true, ketua: true, pr: true, bph: true, sekretaris: true, bendahara: true, anggota: true,
    description: 'Secretary logs group presence; Officers & Members submit self check-in'
  },
  {
    category: 'Attendance & Tracking',
    feature: 'Reset Meeting Attendance Records',
    permission: 'attendance:reset',
    admin: true, pembina: true, ketua: true, pr: false, bph: false, sekretaris: true, bendahara: false, anggota: false,
    description: 'Clear presence logs for specific dates or reset history (Secretary & Leadership)'
  },
  {
    category: 'Attendance & Tracking',
    feature: 'Export Attendance (PDF & CSV)',
    permission: 'attendance:export',
    admin: true, pembina: true, ketua: true, pr: true, bph: true, sekretaris: true, bendahara: true, anggota: false,
    description: 'Download attendance reports for school administration'
  },

  // Treasury & Cashbook
  {
    category: 'Club Treasury',
    feature: 'View Treasury Balance & Ledger',
    permission: 'cash:view',
    admin: true, pembina: true, ketua: true, pr: true, bph: true, sekretaris: true, bendahara: true, anggota: false,
    description: 'Inspect transparent income/expense records and current club balance'
  },
  {
    category: 'Club Treasury',
    feature: 'Record Dues & Equipment Expenses',
    permission: 'cash:create',
    admin: true, pembina: false, ketua: false, pr: false, bph: false, sekretaris: false, bendahara: true, anggota: false,
    description: 'Record member monthly dues and components procurement (Exclusively Treasurer & Head Admin)'
  },
  {
    category: 'Club Treasury',
    feature: 'Revert Transactions & Close Books',
    permission: 'cash:delete',
    admin: true, pembina: false, ketua: false, pr: false, bph: false, sekretaris: false, bendahara: true, anggota: false,
    description: 'Delete incorrect transactions or close annual financial books (Exclusively Treasurer & Head Admin)'
  },
  {
    category: 'Club Treasury',
    feature: 'Export Financial Ledger (PDF & CSV)',
    permission: 'cash:export',
    admin: true, pembina: true, ketua: true, pr: true, bph: true, sekretaris: true, bendahara: true, anggota: false,
    description: 'Generate official accountability financial reports'
  },

  // Assignments & Grading
  {
    category: 'Assignments & Grading',
    feature: 'Create Assignments & Materials',
    permission: 'assignments:create',
    admin: true, pembina: true, ketua: true, pr: false, bph: false, sekretaris: true, bendahara: false, anggota: false,
    description: 'Publish robotics tasks, project guidelines, and workshop slides (Secretary & President)'
  },
  {
    category: 'Assignments & Grading',
    feature: 'Grade Submissions & Provide Feedback',
    permission: 'assignments:grade',
    admin: true, pembina: true, ketua: true, pr: false, bph: true, sekretaris: true, bendahara: false, anggota: false,
    description: 'Evaluate student project submissions with numeric/binary scores and remarks'
  },

  // Announcements & Maintenance
  {
    category: 'Club Announcements',
    feature: 'Publish & Manage Announcements',
    permission: 'announcements:create',
    admin: true, pembina: false, ketua: false, pr: true, bph: false, sekretaris: false, bendahara: false, anggota: false,
    description: 'Broadcast alerts, competition schedules, and meeting agendas (Exclusively Public Relations & Admin)'
  },
  {
    category: 'Club Maintenance',
    feature: 'Club Maintenance & Room Customization',
    permission: 'room:maintenance',
    admin: true, pembina: true, ketua: true, pr: true, bph: true, sekretaris: true, bendahara: true, anggota: false,
    description: 'Perform club maintenance: update name, description, themes, and configuration'
  },
  {
    category: 'System Governance',
    feature: 'RBAC Roles & Pre-Registration',
    permission: 'rbac:manage',
    admin: true, pembina: true, ketua: true, pr: false, bph: false, sekretaris: false, bendahara: false, anggota: false,
    description: 'Promote users, assign titles, and manage login credentials (Strictly President, Advisor & Admin)'
  }
];

export interface AuthorityPillar {
  key: 'attendance' | 'cash' | 'members' | 'assignments' | 'announcements' | 'calendar';
  title: string;
  badge: string;
  allowed: boolean;
  statusText: string;
  colorClass: string;
}

/**
 * Returns dynamic, accurate breakdown of permissions & authorities for any given role or active session
 */
export function getRoleAuthoritiesSummary(
  roleOrSession?: string | { role?: string | null; jabatan?: string | null; membershipStatus?: string | null; username?: string | null; email?: string | null } | null,
  lang: 'en' | 'id' = 'en'
): AuthorityPillar[] {
  const normRole = normalizeRole(roleOrSession);
  const sessionObj = typeof roleOrSession === 'object' && roleOrSession ? roleOrSession : { role: normRole };

  const hasAttendanceFull = hasSessionPermission(sessionObj, 'attendance:edit') || normRole === 'admin' || normRole === 'pembina';
  const hasAttendanceCreate = hasSessionPermission(sessionObj, 'attendance:create') || normRole === 'admin';
  const hasCashManage = canManageCashData(sessionObj) || normRole === 'admin' || normRole === 'bendahara';
  const hasMembersManage = canManageMemberData(sessionObj) || normRole === 'admin';
  const hasMembersView = canViewMemberDirectory(sessionObj);
  const hasAssignmentsCreate = hasSessionPermission(sessionObj, 'assignments:create') || normRole === 'admin';
  const hasAssignmentsGrade = hasSessionPermission(sessionObj, 'assignments:grade') || normRole === 'admin';
  const hasAnnounceManage = canManageAnnouncements(sessionObj) || normRole === 'admin';
  const hasCalendarConfig = canConfigureCalendar(sessionObj) || normRole === 'admin';

  const isEn = lang === 'en';

  return [
    {
      key: 'attendance',
      title: isEn ? 'Daily Attendance' : 'Presensi Pertemuan',
      allowed: true,
      badge: hasAttendanceFull 
        ? (isEn ? '✓ Full Management' : '✓ Rekap & Edit')
        : hasAttendanceCreate 
        ? (isEn ? '✓ Session Check-In' : '✓ Presensi Sesi')
        : (isEn ? '✓ Self Check-In' : '✓ Presensi Mandiri'),
      statusText: hasAttendanceFull 
        ? (isEn ? 'Manage and edit all laboratory sessions' : 'Otoritas rekap & edit seluruh sesi')
        : (isEn ? 'Self-check-in student attendance' : 'Presensi kehadiran mandiri siswa'),
      colorClass: hasAttendanceFull ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200'
    },
    {
      key: 'cash',
      title: isEn ? 'Club Treasury' : 'Buku Kas & Iuran',
      allowed: hasCashManage,
      badge: hasCashManage 
        ? (isEn ? '✓ Manage Treasury' : '✓ Kelola Buku Kas')
        : (isEn ? '✗ Treasurer Only' : '✗ Khusus Bendahara'),
      statusText: hasCashManage 
        ? (isEn ? 'Full: record dues and procurement spending' : 'Penuh: catat iuran & belanja komponen')
        : (isEn ? 'Restricted strictly to Treasurer & Admin' : 'Hanya Bendahara & Admin berwenang'),
      colorClass: hasCashManage ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'
    },
    {
      key: 'members',
      title: isEn ? 'Member Directory' : 'Data Anggota (Roster)',
      allowed: hasMembersView,
      badge: hasMembersManage 
        ? (isEn ? '✓ Manage Roster' : '✓ Kelola & Roster')
        : hasMembersView
        ? (isEn ? '👁️ View Roster' : '👁️ Lihat Roster')
        : (isEn ? '✗ Restricted' : '✗ Akses Dibatasi'),
      statusText: hasMembersManage 
        ? (isEn ? 'Full: add, edit, import & promote' : 'Penuh: tambah, edit, import & promosi')
        : hasMembersView
        ? (isEn ? 'Member roster and profile records' : 'Daftar nama dan profil keanggotaan')
        : (isEn ? 'Restricted to Leadership & Secretary' : 'Hanya untuk Pimpinan & Sekretaris'),
      colorClass: hasMembersManage 
        ? 'bg-blue-50 text-blue-800 border-blue-200' 
        : hasMembersView 
        ? 'bg-sky-50 text-sky-800 border-sky-200' 
        : 'bg-slate-50 text-slate-400 border-slate-200'
    },
    {
      key: 'assignments',
      title: isEn ? 'Tasks & Evaluation' : 'Tugas & Evaluasi',
      allowed: true,
      badge: hasAssignmentsCreate 
        ? (isEn ? '✓ Create & Grade' : '✓ Buat & Nilai')
        : hasAssignmentsGrade 
        ? (isEn ? '✓ Grade Tasks' : '✓ Nilai Tugas')
        : (isEn ? '✓ Submit Tasks' : '✓ Kerjakan Tugas'),
      statusText: hasAssignmentsCreate 
        ? (isEn ? 'Publish course tasks & evaluate scores' : 'Publikasi materi tugas & evaluasi nilai')
        : hasAssignmentsGrade 
        ? (isEn ? 'Evaluate & score student projects' : 'Evaluasi & grading karya siswa')
        : (isEn ? 'Access learning materials & submit tasks' : 'Akses materi & kirim tugas praktikum'),
      colorClass: (hasAssignmentsCreate || hasAssignmentsGrade) ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    {
      key: 'announcements',
      title: isEn ? 'Announcements & Notices' : 'Pengumuman & Siaran',
      allowed: hasAnnounceManage,
      badge: hasAnnounceManage 
        ? (isEn ? '✓ Broadcast Notices' : '✓ Buat & Siarkan')
        : (isEn ? '👁️ Read Notices' : '👁️ Baca Siaran'),
      statusText: hasAnnounceManage 
        ? (isEn ? 'Broadcast announcements & official updates' : 'Siarkan agenda & broadcast informasi ekskul')
        : (isEn ? 'Receive and view official notices' : 'Menerima dan membaca pengumuman'),
      colorClass: hasAnnounceManage ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200'
    },
    {
      key: 'calendar',
      title: isEn ? 'Calendar & Schedule' : 'Kalender & Jadwal',
      allowed: hasCalendarConfig,
      badge: hasCalendarConfig 
        ? (isEn ? '✓ Configure Dates' : '✓ Atur Kalender')
        : (isEn ? '👁️ View Schedule' : '👁️ Lihat Kalender'),
      statusText: hasCalendarConfig 
        ? (isEn ? 'Configure academic year & lab dates' : 'Konfigurasi tahun ajaran & jadwal workshop')
        : (isEn ? 'View workshop calendar and agenda' : 'Melihat jadwal dan agenda ekskul'),
      colorClass: hasCalendarConfig ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-slate-50 text-slate-600 border-slate-200'
    }
  ];
}

/**
 * Resolves the strictly authorized navigation tabs for a given user session.
 * Ensures that features and navigation items ONLY appear according to the user's authority.
 */
export function getAuthorizedTabs(
  session?: {
    role?: string | null;
    jabatan?: string | null;
    membershipStatus?: string | null;
    username?: string | null;
    email?: string | null;
  } | null,
  isMemberViewMode: boolean = false
): MainTabType[] {
  if (!session) {
    // Unauthenticated or Guest: only calendar and announcements
    return ['calendar', 'announcements'];
  }

  const cleanUser = (session.username || '').toLowerCase().trim();
  if (cleanUser === 'demo_tamu' || cleanUser === 'guest') {
    return ['calendar', 'announcements', 'notifications'];
  }

  const canonical = getCanonicalRole(session);
  const normRole = normalizeRole(session);

  // If student member view mode is activated (either actual student member or officer testing student view)
  if (canonical === 'member' || (canonical !== 'admin' && canonical !== 'advisor' && isMemberViewMode)) {
    return ['attendance', 'assignments', 'calendar', 'announcements', 'notifications', 'settings'];
  }

  // 1. Admin & Pembina (Advisor): Full access to all 9 tabs
  if (canonical === 'admin' || canonical === 'advisor' || normRole === 'admin' || normRole === 'pembina') {
    return ['dashboard', 'members', 'attendance', 'assignments', 'calendar', 'announcements', 'notifications', 'cash', 'settings'];
  }

  // 2. Ketua (President):
  // Dashboard, Members, Attendance, Assignments, Calendar, Announcements, Notifications, Cash (audit view), Settings
  if (normRole === 'ketua') {
    return ['dashboard', 'members', 'attendance', 'assignments', 'calendar', 'announcements', 'notifications', 'cash', 'settings'];
  }

  // 3. Wakil Ketua (BPH):
  // Dashboard, Members (view), Attendance, Assignments, Calendar, Announcements, Notifications, Settings
  if (normRole === 'bph') {
    return ['dashboard', 'members', 'attendance', 'assignments', 'calendar', 'announcements', 'notifications', 'settings'];
  }

  // 4. Sekretaris (Secretary):
  // Core focus: Attendance records, Member documentation, Official announcements, Tasks, Settings
  if (normRole === 'sekretaris') {
    return ['dashboard', 'members', 'attendance', 'assignments', 'calendar', 'announcements', 'notifications', 'settings'];
  }

  // 5. Bendahara (Treasurer):
  // Core focus: Club Treasury (Cash & Dues), Attendance for audit, Calendar, Announcements, Settings (Strictly NO Member Directory)
  if (normRole === 'bendahara') {
    return ['dashboard', 'cash', 'attendance', 'calendar', 'announcements', 'notifications', 'settings'];
  }

  // 6. Humas / PR:
  // Core focus: Public announcements, Calendar, Attendance, Notifications, Settings (Strictly NO Member Directory)
  if (normRole === 'pr') {
    return ['dashboard', 'announcements', 'attendance', 'calendar', 'notifications', 'settings'];
  }

  // Fallback for any other executive board
  if (canonical === 'executive_board') {
    const hasDirectory = canViewMemberDirectory(session);
    return hasDirectory
      ? ['dashboard', 'members', 'attendance', 'assignments', 'calendar', 'announcements', 'notifications', 'settings']
      : ['dashboard', 'attendance', 'assignments', 'calendar', 'announcements', 'notifications', 'settings'];
  }

  // Default fallback for student member
  const rawTabs = ['attendance', 'assignments', 'calendar', 'announcements', 'notifications', 'settings'] as MainTabType[];
  return rawTabs;
}

/**
 * Checks if a specific tab is authorized for the current session
 */
export function isAuthorizedForTab(
  tab: MainTabType,
  session?: {
    role?: string | null;
    jabatan?: string | null;
    membershipStatus?: string | null;
    username?: string | null;
    email?: string | null;
  } | null,
  isMemberViewMode: boolean = false
): boolean {
  if (tab === 'members' && !canViewMemberDirectory(session)) {
    return false;
  }
  // All authenticated users are authorized to access their personal settings
  if (tab === 'settings' && session) {
    return true;
  }
  const allowed = getAuthorizedTabs(session, isMemberViewMode);
  return allowed.includes(tab);
}

