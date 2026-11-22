import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppLanguage = 'en' | 'id';

export interface Translations {
  // Navigation Tabs
  tabDashboard: string;
  tabMembers: string;
  tabAttendance: string;
  tabCash: string;
  tabCalendar: string;
  tabAssignments: string;
  myAttendance: string;
  myDues: string;
  tasksAndChallenges: string;
  activitySchedule: string;
  
  // Navigation Descriptions
  descDashboard: string;
  descMembers: string;
  descAttendance: string;
  descCash: string;
  descCalendar: string;
  descAssignments: string;

  // General & Header Actions
  sync: string;
  syncing: string;
  synced: string;
  syncNow: string;
  backupJson: string;
  configureDatabase: string;
  databaseSettings: string;
  search: string;
  filter: string;
  filters: string;
  all: string;
  actions: string;
  save: string;
  cancel: string;
  edit: string;
  delete: string;
  detail: string;
  refresh: string;
  logout: string;
  settings: string;
  notifications: string;
  printPdf: string;
  exportCsv: string;
  uploadCsv: string;
  strukWa: string;
  viewAll: string;
  viewLedger: string;
  close: string;
  back: string;

  // Greetings & Workspace Identity
  greetingMorning: string;
  greetingAfternoon: string;
  greetingEvening: string;
  greetingNight: string;
  headerSubtext: string;
  clubWorkspace: string;
  sysAdmin: string;
  cloudConnected: string;
  localStorageMode: string;

  // Member Tab & Roster
  totalMembers: string;
  activeMembers: string;
  executiveBoard: string;
  generalMembers: string;
  verifiedProfiles: string;
  studentCode: string;
  memberName: string;
  classGrade: string;
  whatsappContact: string;
  status: string;
  joinDate: string;
  active: string;
  resigned: string;
  alumni: string;
  gender: string;
  male: string;
  female: string;
  officers: string;
  students: string;
  role: string;
  roster: string;

  // Attendance Tab
  dailyAttendance: string;
  attendanceHistory: string;
  attendanceRate: string;
  markAllPresent: string;
  present: string;
  excused: string;
  sick: string;
  unexcused: string;
  sessionDate: string;
  recentAttendance: string;
  noAttendance: string;

  // Cash Tab
  treasuryLedger: string;
  weeklyDues: string;
  totalInflow: string;
  totalOutflow: string;
  currentBalance: string;
  income: string;
  expense: string;
  paid: string;
  unpaid: string;
  billingPeriod: string;
  recentTreasury: string;
  noTreasury: string;

  // Navigation Tabs & Modules
  tabAnnouncements: string;
  tabNotifications: string;
  tabSettings: string;

  // Roles & RBAC
  roleAdmin: string;
  roleAdvisor: string;
  rolePresident: string;
  roleVicePresident: string;
  roleSecretary: string;
  roleTreasurer: string;
  rolePR: string;
  roleMember: string;
  roleGuest: string;
  roleAndAuthority: string;
  viewAuthorityMatrix: string;
  activeRoleAndAuthority: string;
  toggleStudentView: string;
  executiveMode: string;
  studentViewMode: string;
  simulateRole: string;

  // Route Guard & Security
  accessDenied: string;
  accessDeniedTitle: string;
  accessDeniedMsg: string;
  sessionRequired: string;
  sessionRequiredMsg: string;
  returnToPortal: string;
  signInAsAdmin: string;
  trialSandboxMode: string;
  demoPreview: string;

  // Modals & Confirmation
  confirmLogoutTitle: string;
  confirmLogoutMsg: string;
  switchAccount: string;
  login: string;
  curriculumTasks?: string;
  grading?: string;
  quickActions?: string;
  quickActionsDesc?: string;
  addMember?: string;
  importCsv?: string;
  takeAttendance?: string;
  recordTreasury?: string;
  broadcastNotice?: string;
  manageRoles?: string;
}

const DICTIONARY: Record<AppLanguage, Translations> = {
  en: {
    tabDashboard: 'Admin Dashboard',
    tabMembers: 'Member Directory',
    tabAttendance: 'Daily Attendance',
    tabCash: 'Club Treasury',
    tabCalendar: 'Activity Calendar',
    tabAssignments: 'Tasks & Evaluation',
    tabAnnouncements: 'Announcements',
    tabNotifications: 'Notifications',
    tabSettings: 'Settings',
    myAttendance: 'My Attendance',
    myDues: 'My Dues',
    tasksAndChallenges: 'Tasks & Challenges',
    activitySchedule: 'Activity Schedule',

    descDashboard: 'System overview & live analytics',
    descMembers: 'Student roster & user management',
    descAttendance: 'Workshop & session check-ins',
    descCash: 'Financial balance & dues ledger',
    descCalendar: 'Meeting schedules & event timeline',
    descAssignments: 'Course tasks & student evaluation',

    sync: 'Sync Cloud',
    syncing: 'Syncing...',
    synced: 'Synced',
    syncNow: 'Sync Now',
    backupJson: 'Backup JSON',
    configureDatabase: 'Configure Database',
    databaseSettings: 'Database Settings',
    search: 'Search...',
    filter: 'Filter',
    filters: 'Filters',
    all: 'All',
    actions: 'Actions',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    detail: 'Detail',
    refresh: 'Refresh',
    logout: 'Sign Out',
    settings: 'Settings',
    notifications: 'Notifications',
    printPdf: 'Print PDF',
    exportCsv: 'Export CSV',
    uploadCsv: 'Upload CSV',
    strukWa: 'WA Receipt',
    viewAll: 'View All',
    viewLedger: 'View Ledger',
    close: 'Close',
    back: 'Back',

    greetingMorning: 'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening',
    greetingNight: 'Good evening',
    headerSubtext: 'Integrated management portal for MAN 2 Kota Bekasi Robotics. Track active roster enrollment, laboratory session attendance, and financial treasury health.',
    clubWorkspace: 'Robotic Club Workspace',
    sysAdmin: 'System Administrator',
    cloudConnected: 'Cloud Connected',
    localStorageMode: 'Local Storage Mode',

    totalMembers: 'Total Members',
    activeMembers: 'Active',
    executiveBoard: 'Executive Board',
    generalMembers: 'Club Members',
    verifiedProfiles: 'Verified Profiles',
    studentCode: 'Student Code',
    memberName: 'Member Name',
    classGrade: 'Class & Grade',
    whatsappContact: 'WhatsApp Contact',
    status: 'Status',
    joinDate: 'Join Date',
    active: 'Active',
    resigned: 'Resigned',
    alumni: 'Alumni',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    officers: 'Officers',
    students: 'Students',
    role: 'Role',
    roster: 'Roster',

    dailyAttendance: 'Daily Attendance',
    attendanceHistory: 'Attendance History',
    attendanceRate: 'Attendance Rate',
    markAllPresent: 'Mark All Present',
    present: 'Present',
    excused: 'Excused',
    sick: 'Sick',
    unexcused: 'Absent',
    sessionDate: 'Session Date',
    recentAttendance: 'Recent Laboratory Attendance',
    noAttendance: 'No attendance records logged yet.',

    treasuryLedger: 'Club Treasury Ledger',
    weeklyDues: 'Weekly Member Dues',
    totalInflow: 'Total Income',
    totalOutflow: 'Total Expenses',
    currentBalance: 'Treasury Balance',
    income: 'Income',
    expense: 'Expense',
    paid: 'Paid',
    unpaid: 'Unpaid',
    billingPeriod: 'Billing Period',
    recentTreasury: 'Recent Treasury Activity',
    noTreasury: 'No treasury transactions recorded yet.',

    curriculumTasks: 'Curriculum Tasks',
    grading: 'Grading',
    quickActions: 'Administrative Quick Actions',
    quickActionsDesc: 'Direct shortcuts to everyday extracurricular management operations',
    addMember: 'Add Member',
    importCsv: 'Import CSV',
    takeAttendance: 'Take Attendance',
    recordTreasury: 'Record Treasury',
    broadcastNotice: 'Broadcast Notice',
    manageRoles: 'Manage Roles',

    roleAdmin: 'Administrator (Head Admin)',
    roleAdvisor: 'Faculty Advisor',
    rolePresident: 'Club President',
    roleVicePresident: 'Vice President',
    roleSecretary: 'Secretary',
    roleTreasurer: 'Treasurer',
    rolePR: 'Public Relations',
    roleMember: 'Club Member',
    roleGuest: 'Guest',
    roleAndAuthority: 'Role & Authority',
    viewAuthorityMatrix: 'View Authority Matrix',
    activeRoleAndAuthority: 'Active Role & Authority',
    toggleStudentView: 'Student View',
    executiveMode: 'Executive Mode',
    studentViewMode: 'Student View Mode',
    simulateRole: 'Simulate Role (Test Access)',

    accessDenied: 'Access Denied',
    accessDeniedTitle: 'Access Restricted: Officer Clearance Required',
    accessDeniedMsg: 'This area is strictly restricted to verified system administrators and executive board officers.',
    sessionRequired: 'Session Required',
    sessionRequiredMsg: 'Please sign in with verified credentials to access this area.',
    returnToPortal: 'Return to Student Portal',
    signInAsAdmin: 'Switch to Admin Login',
    trialSandboxMode: 'Trial Sandbox Mode',
    demoPreview: 'Demo Preview',

    confirmLogoutTitle: 'Confirm Sign Out',
    confirmLogoutMsg: 'Are you sure you want to sign out and return to the login screen?',
    switchAccount: 'Switch Account',
    login: 'Sign In',
  },
  id: {
    tabDashboard: 'Dasbor Utama',
    tabMembers: 'Daftar Anggota',
    tabAttendance: 'Presensi Harian',
    tabCash: 'Buku Kas',
    tabCalendar: 'Jadwal Pertemuan',
    tabAssignments: 'Tugas & Nilai',
    tabAnnouncements: 'Pengumuman',
    tabNotifications: 'Pemberitahuan',
    tabSettings: 'Pengaturan',
    myAttendance: 'Presensi Saya',
    myDues: 'Kas Saya',
    tasksAndChallenges: 'Tugas & Tantangan',
    activitySchedule: 'Jadwal Kegiatan',

    descDashboard: 'Ringkasan sistem & analisis langsung',
    descMembers: 'Daftar siswa & manajemen pengguna',
    descAttendance: 'Presensi workshop & sesi lab',
    descCash: 'Buku kas & saldo keuangan klub',
    descCalendar: 'Jadwal pertemuan & timeline kegiatan',
    descAssignments: 'Materi tugas & evaluasi siswa',

    sync: 'Sinkronisasi',
    syncing: 'Menyinkronkan...',
    synced: 'Tersinkron',
    syncNow: 'Sinkronkan Sekarang',
    backupJson: 'Cadangkan JSON',
    configureDatabase: 'Atur Database',
    databaseSettings: 'Pengaturan Database',
    search: 'Cari data...',
    filter: 'Saring',
    filters: 'Filter',
    all: 'Semua',
    actions: 'Aksi',
    save: 'Simpan',
    cancel: 'Batal',
    edit: 'Ubah',
    delete: 'Hapus',
    detail: 'Rincian',
    refresh: 'Segarkan',
    logout: 'Keluar Akun',
    settings: 'Pengaturan',
    notifications: 'Pemberitahuan',
    printPdf: 'Cetak PDF',
    exportCsv: 'Ekspor CSV',
    uploadCsv: 'Unggah CSV',
    strukWa: 'Struk WA',
    viewAll: 'Lihat Semua',
    viewLedger: 'Buka Buku Kas',
    close: 'Tutup',
    back: 'Kembali',

    greetingMorning: 'Selamat pagi',
    greetingAfternoon: 'Selamat siang',
    greetingEvening: 'Selamat sore',
    greetingNight: 'Selamat malam',
    headerSubtext: 'Portal manajemen terpadu Robotic MAN 2 Kota Bekasi. Pantau keanggotaan aktif, presensi pertemuan laboratorium, dan transparansi laporan kas bendahara secara real-time.',
    clubWorkspace: 'Ruang Kerja Klub Robotik',
    sysAdmin: 'Administrator Sistem',
    cloudConnected: 'Terkoneksi Cloud',
    localStorageMode: 'Mode Penyimpanan Lokal',

    totalMembers: 'Total Anggota',
    activeMembers: 'Aktif',
    executiveBoard: 'Pengurus Inti',
    generalMembers: 'Anggota Klub',
    verifiedProfiles: 'Profil Terverifikasi',
    studentCode: 'Kode Anggota',
    memberName: 'Nama Lengkap',
    classGrade: 'Kelas & Tingkat',
    whatsappContact: 'Nomor WhatsApp',
    status: 'Status Keanggotaan',
    joinDate: 'Tanggal Bergabung',
    active: 'Aktif',
    resigned: 'Keluar',
    alumni: 'Alumni',
    gender: 'Jenis Kelamin',
    male: 'Laki-laki',
    female: 'Perempuan',
    officers: 'Pengurus',
    students: 'Siswa',
    role: 'Peran / Jabatan',
    roster: 'Daftar',

    dailyAttendance: 'Presensi Harian',
    attendanceHistory: 'Riwayat Rekap Presensi',
    attendanceRate: 'Tingkat Kehadiran',
    markAllPresent: 'Tandai Semua Hadir',
    present: 'Hadir',
    excused: 'Izin',
    sick: 'Sakit',
    unexcused: 'Alpa',
    sessionDate: 'Tanggal Pertemuan',
    recentAttendance: 'Presensi Laboratorium Terbaru',
    noAttendance: 'Belum ada catatan presensi yang tersimpan.',

    treasuryLedger: 'Buku Kas Bendahara',
    weeklyDues: 'Iuran Kas Mingguan',
    totalInflow: 'Total Kas Masuk',
    totalOutflow: 'Total Kas Keluar',
    currentBalance: 'Saldo Akhir Kas',
    income: 'Kas Masuk',
    expense: 'Kas Keluar',
    paid: 'Lunas',
    unpaid: 'Belum Bayar',
    billingPeriod: 'Periode Iuran',
    recentTreasury: 'Aktivitas Kas Terbaru',
    noTreasury: 'Belum ada transaksi kas yang dicatat.',

    curriculumTasks: 'Tugas Kurikulum',
    grading: 'Penilaian',
    quickActions: 'Aksi Cepat Administratif',
    quickActionsDesc: 'Pintasan langsung untuk operasional ekstrakurikuler harian',
    addMember: 'Tambah Anggota',
    importCsv: 'Impor CSV',
    takeAttendance: 'Catat Presensi',
    recordTreasury: 'Catat Kas',
    broadcastNotice: 'Siarkan Pengumuman',
    manageRoles: 'Kelola Hak Akses',

    roleAdmin: 'Administrator (Head Admin)',
    roleAdvisor: 'Guru Pembina',
    rolePresident: 'Ketua Ekskul',
    roleVicePresident: 'Wakil Ketua',
    roleSecretary: 'Sekretaris',
    roleTreasurer: 'Bendahara',
    rolePR: 'Humas',
    roleMember: 'Anggota Siswa',
    roleGuest: 'Tamu',
    roleAndAuthority: 'Peran & Otoritas',
    viewAuthorityMatrix: 'Lihat Matriks Otoritas',
    activeRoleAndAuthority: 'Peran & Otoritas Aktif',
    toggleStudentView: 'Tampilan Siswa',
    executiveMode: 'Mode Pengurus',
    studentViewMode: 'Mode Tampilan Siswa',
    simulateRole: 'Coba Simulasi Peran (Cek Otoritas)',

    accessDenied: 'Akses Ditolak',
    accessDeniedTitle: 'Akses Dibatasi: Area Pengurus & Administrator',
    accessDeniedMsg: 'Area ini dilindungi dan hanya dapat diakses oleh Administrator Sistem dan Pengurus Inti.',
    sessionRequired: 'Sesi Diperlukan',
    sessionRequiredMsg: 'Silakan masuk dengan kredensial resmi untuk mengakses area ini.',
    returnToPortal: 'Kembali ke Portal Siswa',
    signInAsAdmin: 'Ganti ke Login Admin',
    trialSandboxMode: 'Mode Sandbox Percobaan',
    demoPreview: 'Pratinjau Demo',

    confirmLogoutTitle: 'Konfirmasi Keluar',
    confirmLogoutMsg: 'Apakah Anda yakin ingin keluar dari akun dan kembali ke halaman login?',
    switchAccount: 'Ganti Akun',
    login: 'Masuk Akun',
  },
};

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  toggleLanguage: () => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: DICTIONARY.en,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem('robotics_language');
      if (saved === 'en' || saved === 'id') return saved;
      // Default to English as international primary standard
      return 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('robotics_language', lang);
    } catch {}
  };

  const toggleLanguage = () => {
    const nextLang: AppLanguage = language === 'en' ? 'id' : 'en';
    setLanguage(nextLang);
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    toggleLanguage,
    t: DICTIONARY[language],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  return useContext(LanguageContext);
}
