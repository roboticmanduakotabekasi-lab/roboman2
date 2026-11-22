/**
 * src/utils/attendanceWindow.ts
 * Smart Attendance Automation Schedule:
 * Supports:
 * 1. Specific Date Calendar Mode: Tanggal, Bulan, Hari, Tahun (e.g. Rabu, 04 November 2026 16:00 - 19:00 WIB)
 * 2. Edit & Delete / Cancel Sessions (Bisa diedit jam & tanggalnya, atau dihapus / ditiadakan saat libur)
 * 3. Multiple Scheduled Sessions List (Daftar agenda sesi yang bisa ditambah, diedit, dan dihapus)
 * 4. Full Bilingual Consistency: English and Indonesian
 */

import { canConfigureCalendar } from './rbac';

export type SchedulePreset = 'specific_date' | 'wednesday_afternoon' | 'wednesday_full' | 'wed_thu' | 'custom' | 'disabled';

export interface ScheduledSessionItem {
  id: string;
  date: string; // YYYY-MM-DD
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  title?: string;
}

export interface AttendanceScheduleConfig {
  preset: SchedulePreset;
  startHour: number; // 0 - 23 (e.g. 16 for 4 PM)
  startMinute: number; // 0 - 59
  endHour: number; // 0 - 23 (e.g. 19 for 7 PM)
  endMinute: number; // 0 - 59
  activeDays: number[]; // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
  specificDate?: string; // YYYY-MM-DD (e.g. "2026-11-04")
  customLabel?: string;
  isPaused?: boolean; // When session is cancelled / on holiday (Ditiadakan)
  scheduledSessions?: ScheduledSessionItem[]; // List of sessions that can be added, edited, or deleted
}

export const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const ENGLISH_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function getNextWednesdayDateString(from: Date = new Date(), weekOffset: number = 0): string {
  const d = new Date(from);
  const day = d.getDay();
  // 3 is Wednesday
  const diff = (3 - day + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 && weekOffset === 0 ? 0 : diff + weekOffset * 7));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dt = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dt}`;
}

export interface DateBreakdown {
  year: number;
  monthNumber: number; // 1-12
  monthNameId: string;
  monthNameEn: string;
  dayNumber: number;
  dayNameId: string;
  dayNameEn: string;
  formattedId: string; // e.g. "Rabu, 04 November 2026"
  formattedEn: string; // e.g. "Wednesday, November 04, 2026"
}

export function parseDateBreakdown(dateStr: string): DateBreakdown {
  if (!dateStr || !dateStr.includes('-')) {
    dateStr = getNextWednesdayDateString();
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  const dayIdx = isNaN(dateObj.getTime()) ? 3 : dateObj.getDay();
  const dayNameId = INDONESIAN_DAYS[dayIdx] || 'Rabu';
  const dayNameEn = ENGLISH_DAYS[dayIdx] || 'Wednesday';
  const monthNameId = INDONESIAN_MONTHS[(m || 1) - 1] || 'November';
  const monthNameEn = ENGLISH_MONTHS[(m || 1) - 1] || 'November';

  return {
    year: y || new Date().getFullYear(),
    monthNumber: m || 11,
    monthNameId,
    monthNameEn,
    dayNumber: d || 1,
    dayNameId,
    dayNameEn,
    formattedId: `${dayNameId}, ${String(d || 1).padStart(2, '0')} ${monthNameId} ${y}`,
    formattedEn: `${dayNameEn}, ${monthNameEn} ${String(d || 1).padStart(2, '0')}, ${y}`,
  };
}

export const DEFAULT_SCHEDULED_SESSIONS: ScheduledSessionItem[] = [
  {
    id: 'session-sample-1',
    date: getNextWednesdayDateString(new Date(), 0),
    startHour: 16,
    startMinute: 0,
    endHour: 19,
    endMinute: 0,
    title: 'Pertemuan Rutin Robotik',
  },
  {
    id: 'session-sample-2',
    date: getNextWednesdayDateString(new Date(), 1),
    startHour: 16,
    startMinute: 0,
    endHour: 19,
    endMinute: 0,
    title: 'Workshop Mikrokontroler & IoT',
  }
];

export const DEFAULT_SCHEDULE_CONFIG: AttendanceScheduleConfig = {
  preset: 'wednesday_afternoon',
  startHour: 16,
  startMinute: 0,
  endHour: 19,
  endMinute: 0,
  activeDays: [3], // Rabu
  specificDate: getNextWednesdayDateString(),
  customLabel: 'Hari Rabu, 16:00 - 19:00 WIB (4 Sore - 7 Malam)',
  isPaused: false,
  scheduledSessions: DEFAULT_SCHEDULED_SESSIONS,
};

export const ATTENDANCE_SCHEDULE_STORAGE_KEY = 'robotics_attendance_schedule_config';
export const BYPASS_ATTENDANCE_STORAGE_KEY = 'robotics_attendance_bypass_schedule';

export interface AttendanceScheduleStatus {
  isOpen: boolean;
  dayIndex: number;
  dayName: string;
  dayNameId: string;
  timeString: string;
  scheduleDescription: string;
  scheduleDescriptionId: string;
  scheduleDescriptionEn: string;
  remainingTimeText?: string;
  remainingTimeTextEn?: string;
  remainingTimeTextId?: string;
  statusBadge: {
    label: string;
    labelEn: string;
    labelId: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
  };
  reasonText: string;
  reasonTextEn: string;
  reasonTextId: string;
  nextSessionInfo: string;
  nextSessionInfoEn: string;
  nextSessionInfoId: string;
  isTestingBypass: boolean;
  config: AttendanceScheduleConfig;
  deadlineTimeString: string; // e.g. "19:00:00"
  dateBreakdown?: DateBreakdown;
  isPaused?: boolean;
}

/**
 * Retrieve current schedule config from localStorage or defaults
 */
export function getAttendanceScheduleConfig(): AttendanceScheduleConfig {
  try {
    const saved = localStorage.getItem(ATTENDANCE_SCHEDULE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && parsed.preset) {
        return {
          preset: parsed.preset,
          startHour: typeof parsed.startHour === 'number' ? parsed.startHour : 16,
          startMinute: typeof parsed.startMinute === 'number' ? parsed.startMinute : 0,
          endHour: typeof parsed.endHour === 'number' ? parsed.endHour : 19,
          endMinute: typeof parsed.endMinute === 'number' ? parsed.endMinute : 0,
          activeDays: Array.isArray(parsed.activeDays) && parsed.activeDays.length > 0 ? parsed.activeDays : [3],
          specificDate: parsed.specificDate || getNextWednesdayDateString(),
          customLabel: parsed.customLabel || '',
          isPaused: Boolean(parsed.isPaused),
          scheduledSessions: Array.isArray(parsed.scheduledSessions) && parsed.scheduledSessions.length > 0
            ? parsed.scheduledSessions
            : DEFAULT_SCHEDULED_SESSIONS,
        };
      }
    }
  } catch {}
  return DEFAULT_SCHEDULE_CONFIG;
}

/**
 * Persist schedule configuration and dispatch event for immediate reactivity
 */
export function saveAttendanceScheduleConfig(config: AttendanceScheduleConfig): void {
  try {
    localStorage.setItem(ATTENDANCE_SCHEDULE_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('robotics-attendance-schedule-change', { detail: config }));
  } catch {}
}

/**
 * Checks if the attendance bypass is enabled.
 */
export function isBypassScheduleEnabled(userSession?: { role?: string; username?: string; jabatan?: string } | null): boolean {
  try {
    const rawVal = localStorage.getItem(BYPASS_ATTENDANCE_STORAGE_KEY) === 'true';
    if (!rawVal) return false;

    let session = userSession;
    if (!session && typeof localStorage !== 'undefined') {
      try {
        const savedAuth = localStorage.getItem('robotics_auth');
        if (savedAuth) session = JSON.parse(savedAuth);
      } catch {}
    }

    return canConfigureCalendar(session);
  } catch {
    return false;
  }
}

export function setBypassScheduleEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(BYPASS_ATTENDANCE_STORAGE_KEY, String(enabled));
    window.dispatchEvent(new CustomEvent('robotics-attendance-bypass-change', { detail: enabled }));
  } catch {}
}

function pad(num: number): string {
  return String(num).padStart(2, '0');
}

export function formatTimeRange(startH: number, startM: number, endH: number, endM: number): string {
  return `${pad(startH)}:${pad(startM)} - ${pad(endH)}:${pad(endM)} WIB`;
}

function getCurrentAppLanguage(): 'en' | 'id' {
  try {
    const saved = localStorage.getItem('robotics_language');
    if (saved === 'en' || saved === 'id') return saved;
  } catch {}
  return 'en';
}

/**
 * Checks whether the current time is within the official attendance window
 */
export function checkAttendanceSchedule(
  targetDate: Date = new Date(),
  overrideTestingMode?: boolean,
  customConfig?: AttendanceScheduleConfig,
  forcedLanguage?: 'en' | 'id'
): AttendanceScheduleStatus {
  const isOverrideActive = overrideTestingMode !== undefined ? overrideTestingMode : isBypassScheduleEnabled();
  const config = customConfig || getAttendanceScheduleConfig();
  const currentLang = forcedLanguage || getCurrentAppLanguage();
  const isEn = currentLang === 'en';

  // Attempt to resolve exact time and date string in WIB timezone (Asia/Jakarta, UTC+7)
  let dayIdx = targetDate.getDay();
  let currentHours = targetDate.getHours();
  let currentMinutes = targetDate.getMinutes();
  let currentSeconds = targetDate.getSeconds();
  let todayWibStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;

  try {
    const wibFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });
    const parts = wibFormatter.formatToParts(targetDate);
    const wibWeekday = parts.find((p) => p.type === 'weekday')?.value;
    const wibYear = parts.find((p) => p.type === 'year')?.value;
    const wibMonth = parts.find((p) => p.type === 'month')?.value;
    const wibDay = parts.find((p) => p.type === 'day')?.value;
    const wibHour = parseInt(parts.find((p) => p.type === 'hour')?.value || '', 10);
    const wibMinute = parseInt(parts.find((p) => p.type === 'minute')?.value || '', 10);
    const wibSecond = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);

    if (wibYear && wibMonth && wibDay) {
      todayWibStr = `${wibYear}-${wibMonth}-${wibDay}`;
    }

    if (wibWeekday && !isNaN(wibHour) && !isNaN(wibMinute)) {
      const weekdayMap: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };
      if (weekdayMap[wibWeekday] !== undefined) {
        dayIdx = weekdayMap[wibWeekday];
        currentHours = wibHour;
        currentMinutes = wibMinute;
        currentSeconds = isNaN(wibSecond) ? 0 : wibSecond;
      }
    }
  } catch {
    // Fallback to local system time
  }

  const currentDayNameEn = ENGLISH_DAYS[dayIdx] || 'Today';
  const currentDayNameId = INDONESIAN_DAYS[dayIdx] || 'Hari Ini';
  const timeFormatted = `${pad(currentHours)}:${pad(currentMinutes)}:${pad(currentSeconds)} WIB`;
  const deadlineTimeString = `${pad(config.endHour)}:${pad(config.endMinute)}:00`;

  // =========================================================================
  // 0. DIHAPUS / DITIADAKAN / LIBUR (PAUSED OR DISABLED)
  // =========================================================================
  if (config.isPaused || config.preset === 'disabled') {
    const labelEn = isOverrideActive ? 'Attendance Active (Testing Bypass)' : 'Session Cancelled (Holiday)';
    const labelId = isOverrideActive ? 'Presensi Aktif (Bypass Pengujian)' : 'Sesi Pertemuan Ditiadakan (Libur)';
    const reasonEn = isOverrideActive
      ? 'Session was cancelled, but opened because Testing Mode (Bypass) is active.'
      : 'Robotics session check-in is currently paused by Advisor / Administrator (Holiday / No meeting). Students do not need to check in.';
    const reasonId = isOverrideActive
      ? 'Sesi jadwal sedang ditiadakan/dihapus, namun dibuka karena Mode Pengujian (Bypass) aktif.'
      : 'Sesi presensi saat ini ditiadakan / dinonaktifkan oleh Pembina atau Administrator (Libur atau tidak ada pertemuan). Siswa tidak perlu melakukan presensi.';
    const nextEn = 'Next session schedule will be updated by the Advisor / Administrator.';
    const nextId = 'Jadwal sesi pertemuan berikutnya akan diperbarui oleh Pembina / Administrator.';
    const remEn = isOverrideActive ? 'Testing Bypass Active' : 'Session cancelled / Holiday';
    const remId = isOverrideActive ? 'Bypass Pengujian Aktif' : 'Pertemuan ditiadakan (Libur)';

    return {
      isOpen: isOverrideActive,
      dayIndex: dayIdx,
      dayName: currentDayNameEn,
      dayNameId: currentDayNameId,
      timeString: timeFormatted,
      scheduleDescription: isEn ? 'Session Cancelled / Holiday' : 'Pertemuan Ditiadakan / Libur',
      scheduleDescriptionEn: 'Session Cancelled / Holiday',
      scheduleDescriptionId: 'Pertemuan Ditiadakan / Libur',
      remainingTimeText: isEn ? remEn : remId,
      remainingTimeTextEn: remEn,
      remainingTimeTextId: remId,
      statusBadge: {
        label: isEn ? labelEn : labelId,
        labelEn,
        labelId,
        bgColor: isOverrideActive ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-50 text-amber-900 border-amber-300',
        textColor: 'text-amber-900',
        borderColor: 'border-amber-300',
      },
      reasonText: isEn ? reasonEn : reasonId,
      reasonTextEn: reasonEn,
      reasonTextId: reasonId,
      nextSessionInfo: isEn ? nextEn : nextId,
      nextSessionInfoEn: nextEn,
      nextSessionInfoId: nextId,
      isTestingBypass: isOverrideActive,
      config,
      deadlineTimeString,
      isPaused: true,
    };
  }

  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  const startTotalMinutes = config.startHour * 60 + config.startMinute;
  const endTotalMinutes = config.endHour * 60 + config.endMinute;

  // =========================================================================
  // 1. SPECIFIC DATE CALENDAR MODE (Tanggal, Bulan, Hari, Tahun Spesifik)
  // =========================================================================
  if (config.preset === 'specific_date') {
    const targetDateStr = config.specificDate || getNextWednesdayDateString();
    const dateBreakdown = parseDateBreakdown(targetDateStr);
    const timeRangeStr = formatTimeRange(config.startHour, config.startMinute, config.endHour, config.endMinute);

    const scheduleDescEn = `${dateBreakdown.formattedEn} (${timeRangeStr})`;
    const scheduleDescId = `${dateBreakdown.formattedId} (${timeRangeStr})`;

    if (isOverrideActive) {
      const labelEn = 'Attendance Active (Testing Bypass)';
      const labelId = 'Presensi Aktif (Bypass Jadwal)';
      const reasonEn = `Session unlocked via Testing Mode. Official calendar schedule: ${scheduleDescEn}.`;
      const reasonId = `Sesi dibuka via mode pengujian (Bypass Jadwal). Jadwal kalender: ${scheduleDescId}.`;
      const nextEn = `Official schedule: ${scheduleDescEn}.`;
      const nextId = `Jadwal resmi: ${scheduleDescId}.`;
      const remEn = 'Testing Mode Active (Schedule Bypass)';
      const remId = 'Mode Pengujian Aktif (Bypass Jadwal)';

      return {
        isOpen: true,
        dayIndex: dayIdx,
        dayName: currentDayNameEn,
        dayNameId: currentDayNameId,
        timeString: timeFormatted,
        scheduleDescription: isEn ? scheduleDescEn : scheduleDescId,
        scheduleDescriptionEn: scheduleDescEn,
        scheduleDescriptionId: scheduleDescId,
        remainingTimeText: isEn ? remEn : remId,
        remainingTimeTextEn: remEn,
        remainingTimeTextId: remId,
        statusBadge: {
          label: isEn ? labelEn : labelId,
          labelEn,
          labelId,
          bgColor: 'bg-amber-100 text-amber-900 border-amber-300',
          textColor: 'text-amber-900',
          borderColor: 'border-amber-300',
        },
        reasonText: isEn ? reasonEn : reasonId,
        reasonTextEn: reasonEn,
        reasonTextId: reasonId,
        nextSessionInfo: isEn ? nextEn : nextId,
        nextSessionInfoEn: nextEn,
        nextSessionInfoId: nextId,
        isTestingBypass: true,
        config,
        deadlineTimeString,
        dateBreakdown,
      };
    }

    // A. Hari ini adalah persis tanggal yang dijadwalkan!
    if (todayWibStr === targetDateStr) {
      if (currentTotalMinutes < startTotalMinutes) {
        const minsUntilOpen = startTotalMinutes - currentTotalMinutes;
        const hUntilOpen = Math.floor(minsUntilOpen / 60);
        const mUntilOpen = minsUntilOpen % 60;
        const timeWaitTextEn = hUntilOpen > 0 ? `${hUntilOpen}h ${mUntilOpen}m` : `${mUntilOpen} minutes`;
        const timeWaitTextId = hUntilOpen > 0 ? `${hUntilOpen} jam ${mUntilOpen} menit` : `${mUntilOpen} menit`;

        const labelEn = `Opens Today at ${pad(config.startHour)}:${pad(config.startMinute)} WIB`;
        const labelId = `Dibuka Hari Ini Pukul ${pad(config.startHour)}:${pad(config.startMinute)} WIB`;
        const remEn = `Opens at ${pad(config.startHour)}:${pad(config.startMinute)} WIB (in ${timeWaitTextEn})`;
        const remId = `Dibuka ${pad(config.startHour)}:${pad(config.startMinute)} WIB (dalam ${timeWaitTextId})`;
        const reasonEn = `Today is the scheduled meeting session (${dateBreakdown.formattedEn}). Check-in opens at ${pad(config.startHour)}:${pad(config.startMinute)} WIB (in ${timeWaitTextEn}).`;
        const reasonId = `Hari ini adalah tanggal sesi pertemuan ekskul yang dijadwalkan (${dateBreakdown.formattedId}). Presensi mandiri akan dibuka tepat pukul ${pad(config.startHour)}:${pad(config.startMinute)} WIB (${timeWaitTextId} lagi).`;
        const nextEn = `Active session today: ${timeRangeStr}.`;
        const nextId = `Sesi presensi aktif hari ini pukul ${timeRangeStr}.`;

        return {
          isOpen: false,
          dayIndex: dayIdx,
          dayName: currentDayNameEn,
          dayNameId: currentDayNameId,
          timeString: timeFormatted,
          scheduleDescription: isEn ? scheduleDescEn : scheduleDescId,
          scheduleDescriptionEn: scheduleDescEn,
          scheduleDescriptionId: scheduleDescId,
          remainingTimeText: isEn ? remEn : remId,
          remainingTimeTextEn: remEn,
          remainingTimeTextId: remId,
          statusBadge: {
            label: isEn ? labelEn : labelId,
            labelEn,
            labelId,
            bgColor: 'bg-amber-50 text-amber-900 border-amber-300',
            textColor: 'text-amber-900',
            borderColor: 'border-amber-300',
          },
          reasonText: isEn ? reasonEn : reasonId,
          reasonTextEn: reasonEn,
          reasonTextId: reasonId,
          nextSessionInfo: isEn ? nextEn : nextId,
          nextSessionInfoEn: nextEn,
          nextSessionInfoId: nextId,
          isTestingBypass: false,
          config,
          deadlineTimeString,
          dateBreakdown,
        };
      }

      if (currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes) {
        const minsLeft = endTotalMinutes - currentTotalMinutes;
        const hLeft = Math.floor(minsLeft / 60);
        const mLeft = minsLeft % 60;
        const remTextEn = hLeft > 0 ? `${hLeft}h ${mLeft}m remaining` : `${mLeft}m remaining`;
        const remTextId = hLeft > 0 ? `${hLeft}j ${mLeft}m tersisa` : `${mLeft}m tersisa`;

        const labelEn = `Attendance Active (Closes at ${pad(config.endHour)}:${pad(config.endMinute)} WIB • ${remTextEn})`;
        const labelId = `Presensi Aktif (Tutup ${pad(config.endHour)}:${pad(config.endMinute)} WIB • ${remTextId})`;
        const remEn = `${remTextEn} (Closes ${pad(config.endHour)}:${pad(config.endMinute)} WIB)`;
        const remId = `${remTextId} (Tutup ${pad(config.endHour)}:${pad(config.endMinute)} WIB)`;
        const reasonEn = `Scheduled meeting for ${dateBreakdown.formattedEn} is ACTIVE. Students can check in until ${pad(config.endHour)}:${pad(config.endMinute)} WIB (${remTextEn}).`;
        const reasonId = `Sesi presensi kalender ${dateBreakdown.formattedId} sedang AKTIF. Siswa dapat mengisi absensi hingga batas waktu pukul ${pad(config.endHour)}:${pad(config.endMinute)} WIB (${remTextId}).`;
        const nextEn = `Submission deadline: Today at ${pad(config.endHour)}:${pad(config.endMinute)} WIB.`;
        const nextId = `Batas pengisian presensi: Hari ini pukul ${pad(config.endHour)}:${pad(config.endMinute)} WIB.`;

        return {
          isOpen: true,
          dayIndex: dayIdx,
          dayName: currentDayNameEn,
          dayNameId: currentDayNameId,
          timeString: timeFormatted,
          scheduleDescription: isEn ? scheduleDescEn : scheduleDescId,
          scheduleDescriptionEn: scheduleDescEn,
          scheduleDescriptionId: scheduleDescId,
          remainingTimeText: isEn ? remEn : remId,
          remainingTimeTextEn: remEn,
          remainingTimeTextId: remId,
          statusBadge: {
            label: isEn ? labelEn : labelId,
            labelEn,
            labelId,
            bgColor: 'bg-emerald-50 text-emerald-900 border-emerald-300',
            textColor: 'text-emerald-900',
            borderColor: 'border-emerald-300',
          },
          reasonText: isEn ? reasonEn : reasonId,
          reasonTextEn: reasonEn,
          reasonTextId: reasonId,
          nextSessionInfo: isEn ? nextEn : nextId,
          nextSessionInfoEn: nextEn,
          nextSessionInfoId: nextId,
          isTestingBypass: false,
          config,
          deadlineTimeString,
          dateBreakdown,
        };
      }

      const labelEn = `Session Concluded (${pad(config.endHour)}:${pad(config.endMinute)} WIB)`;
      const labelId = `Sesi Hari Ini Selesai (${pad(config.endHour)}:${pad(config.endMinute)} WIB)`;
      const remEn = `Today's session closed (${pad(config.endHour)}:${pad(config.endMinute)} WIB)`;
      const remId = `Sesi hari ini selesai (Tutup ${pad(config.endHour)}:${pad(config.endMinute)} WIB)`;
      const reasonEn = `Attendance session for ${dateBreakdown.formattedEn} ended at ${pad(config.endHour)}:${pad(config.endMinute)} WIB. Check-in is automatically locked.`;
      const reasonId = `Sesi presensi tanggal ${dateBreakdown.formattedId} telah berakhir pada pukul ${pad(config.endHour)}:${pad(config.endMinute)} WIB. Pengisian absensi ditutup secara otomatis.`;
      const nextEn = `Meeting for ${dateBreakdown.formattedEn} has concluded.`;
      const nextId = `Sesi pertemuan tanggal ${dateBreakdown.formattedId} telah selesai dilaksanakan.`;

      return {
        isOpen: false,
        dayIndex: dayIdx,
        dayName: currentDayNameEn,
        dayNameId: currentDayNameId,
        timeString: timeFormatted,
        scheduleDescription: isEn ? scheduleDescEn : scheduleDescId,
        scheduleDescriptionEn: scheduleDescEn,
        scheduleDescriptionId: scheduleDescId,
        remainingTimeText: isEn ? remEn : remId,
        remainingTimeTextEn: remEn,
        remainingTimeTextId: remId,
        statusBadge: {
          label: isEn ? labelEn : labelId,
          labelEn,
          labelId,
          bgColor: 'bg-rose-50 text-rose-800 border-rose-200',
          textColor: 'text-rose-800',
          borderColor: 'border-rose-200',
        },
        reasonText: isEn ? reasonEn : reasonId,
        reasonTextEn: reasonEn,
        reasonTextId: reasonId,
        nextSessionInfo: isEn ? nextEn : nextId,
        nextSessionInfoEn: nextEn,
        nextSessionInfoId: nextId,
        isTestingBypass: false,
        config,
        deadlineTimeString,
        dateBreakdown,
      };
    }

    // B. Tanggal sesi kalender masih di masa depan
    if (todayWibStr < targetDateStr) {
      const todayDateObj = new Date(todayWibStr);
      const targetDateObj = new Date(targetDateStr);
      const diffMs = targetDateObj.getTime() - todayDateObj.getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

      const labelEn = `Scheduled: ${dateBreakdown.dayNameEn}, ${dateBreakdown.monthNameEn} ${dateBreakdown.dayNumber}`;
      const labelId = `Jadwal: ${dateBreakdown.dayNameId}, ${dateBreakdown.dayNumber} ${dateBreakdown.monthNameId}`;
      const remEn = `Opens in ${diffDays} day${diffDays > 1 ? 's' : ''} (${dateBreakdown.formattedEn})`;
      const remId = `Dibuka ${diffDays} hari lagi (${dateBreakdown.formattedId})`;
      const reasonEn = `Attendance is currently closed (${currentDayNameEn}, ${timeFormatted}). Next session is scheduled on ${dateBreakdown.formattedEn} at ${timeRangeStr}.`;
      const reasonId = `Presensi mandiri saat ini terkunci (${currentDayNameId}, ${timeFormatted}). Sesi berikutnya dijadwalkan pada ${dateBreakdown.formattedId} pukul ${timeRangeStr}.`;
      const nextEn = `Check-in opens on ${dateBreakdown.formattedEn} at ${pad(config.startHour)}:${pad(config.startMinute)} WIB (${diffDays} day${diffDays > 1 ? 's' : ''} remaining).`;
      const nextId = `Sesi presensi akan dibuka pada ${dateBreakdown.formattedId} pukul ${pad(config.startHour)}:${pad(config.startMinute)} WIB (${diffDays} hari lagi).`;

      return {
        isOpen: false,
        dayIndex: dayIdx,
        dayName: currentDayNameEn,
        dayNameId: currentDayNameId,
        timeString: timeFormatted,
        scheduleDescription: isEn ? scheduleDescEn : scheduleDescId,
        scheduleDescriptionEn: scheduleDescEn,
        scheduleDescriptionId: scheduleDescId,
        remainingTimeText: isEn ? remEn : remId,
        remainingTimeTextEn: remEn,
        remainingTimeTextId: remId,
        statusBadge: {
          label: isEn ? labelEn : labelId,
          labelEn,
          labelId,
          bgColor: 'bg-indigo-50 text-indigo-900 border-indigo-200',
          textColor: 'text-indigo-900',
          borderColor: 'border-indigo-200',
        },
        reasonText: isEn ? reasonEn : reasonId,
        reasonTextEn: reasonEn,
        reasonTextId: reasonId,
        nextSessionInfo: isEn ? nextEn : nextId,
        nextSessionInfoEn: nextEn,
        nextSessionInfoId: nextId,
        isTestingBypass: false,
        config,
        deadlineTimeString,
        dateBreakdown,
      };
    }

    // C. Tanggal sesi kalender sudah berlalu
    const labelEn = `Session Past (${dateBreakdown.monthNameEn} ${dateBreakdown.dayNumber})`;
    const labelId = `Sesi Berlalu (${dateBreakdown.dayNumber} ${dateBreakdown.monthNameId})`;
    const remEn = `Session on ${dateBreakdown.formattedEn} ended`;
    const remId = `Sesi tanggal ${dateBreakdown.formattedId} telah selesai`;
    const reasonEn = `Attendance session for ${dateBreakdown.formattedEn} has already ended.`;
    const reasonId = `Sesi presensi untuk tanggal ${dateBreakdown.formattedId} telah selesai dilaksanakan.`;
    const nextEn = 'Administrator or Advisor can schedule the next session in the Attendance Calendar.';
    const nextId = 'Admin atau Guru Pembina dapat memilih atau mengedit tanggal sesi berikutnya melalui panel Kalender Jadwal Presensi.';

    return {
      isOpen: false,
      dayIndex: dayIdx,
      dayName: currentDayNameEn,
      dayNameId: currentDayNameId,
      timeString: timeFormatted,
      scheduleDescription: isEn ? scheduleDescEn : scheduleDescId,
      scheduleDescriptionEn: scheduleDescEn,
      scheduleDescriptionId: scheduleDescId,
      remainingTimeText: isEn ? remEn : remId,
      remainingTimeTextEn: remEn,
      remainingTimeTextId: remId,
      statusBadge: {
        label: isEn ? labelEn : labelId,
        labelEn,
        labelId,
        bgColor: 'bg-slate-100 text-slate-700 border-slate-300',
        textColor: 'text-slate-700',
        borderColor: 'border-slate-300',
      },
      reasonText: isEn ? reasonEn : reasonId,
      reasonTextEn: reasonEn,
      reasonTextId: reasonId,
      nextSessionInfo: isEn ? nextEn : nextId,
      nextSessionInfoEn: nextEn,
      nextSessionInfoId: nextId,
      isTestingBypass: false,
      config,
      deadlineTimeString,
      dateBreakdown,
    };
  }

  // =========================================================================
  // 2. RECURRING PRESETS (Rabu Sore 16-19, Rabu Seharian, Rabu s/d Kamis, dsb.)
  // =========================================================================
  let scheduleDescEn = 'Wednesdays 16:00 to 19:00 WIB (4 PM - 7 PM)';
  let scheduleDescId = 'Hari Rabu pukul 16:00 s/d 19:00 WIB (4 Sore - 7 Malam)';

  if (config.preset === 'wednesday_afternoon') {
    scheduleDescEn = 'Wednesdays 16:00 to 19:00 WIB (4 PM - 7 PM)';
    scheduleDescId = 'Hari Rabu pukul 16:00 s/d 19:00 WIB (4 Sore - 7 Malam)';
  } else if (config.preset === 'wednesday_full') {
    scheduleDescEn = 'Wednesdays 00:00 to 23:59 WIB';
    scheduleDescId = 'Hari Rabu 00:00 s/d 23:59 WIB';
  } else if (config.preset === 'wed_thu') {
    scheduleDescEn = 'Wednesdays 00:00 to Thursdays 23:59 WIB';
    scheduleDescId = 'Rabu 00:00 s/d Kamis 23:59 WIB';
  } else if (config.customLabel) {
    scheduleDescEn = config.customLabel;
    scheduleDescId = config.customLabel;
  } else {
    const daysStrEn = config.activeDays.map((d) => ENGLISH_DAYS[d]).join(', ');
    const daysStrId = config.activeDays.map((d) => INDONESIAN_DAYS[d]).join(', ');
    const rangeStr = formatTimeRange(config.startHour, config.startMinute, config.endHour, config.endMinute);
    scheduleDescEn = `${daysStrEn} (${rangeStr})`;
    scheduleDescId = `${daysStrId} (${rangeStr})`;
  }

  if (isOverrideActive) {
    const labelEn = 'Attendance Active (Testing Bypass)';
    const labelId = 'Presensi Aktif (Bypass Jadwal)';
    const remEn = 'Testing Mode Active (Schedule Bypass)';
    const remId = 'Mode Pengujian Aktif (Bypass Jadwal)';
    const reasonEn = 'Session unlocked via Testing Mode. Administrator can test recording attendance anytime.';
    const reasonId = 'Sesi dibuka via mode pengujian (Bypass Jadwal). Administrator / Pembina dapat menguji absensi kapan saja.';
    const nextEn = `Official schedule: ${scheduleDescEn}.`;
    const nextId = `Jadwal resmi: ${scheduleDescId}.`;

    return {
      isOpen: true,
      dayIndex: dayIdx,
      dayName: currentDayNameEn,
      dayNameId: currentDayNameId,
      timeString: timeFormatted,
      scheduleDescription: isEn ? scheduleDescEn : scheduleDescId,
      scheduleDescriptionEn: scheduleDescEn,
      scheduleDescriptionId: scheduleDescId,
      remainingTimeText: isEn ? remEn : remId,
      remainingTimeTextEn: remEn,
      remainingTimeTextId: remId,
      statusBadge: {
        label: isEn ? labelEn : labelId,
        labelEn,
        labelId,
        bgColor: 'bg-amber-100 text-amber-900 border-amber-300',
        textColor: 'text-amber-900',
        borderColor: 'border-amber-300',
      },
      reasonText: isEn ? reasonEn : reasonId,
      reasonTextEn: reasonEn,
      reasonTextId: reasonId,
      nextSessionInfo: isEn ? nextEn : nextId,
      nextSessionInfoEn: nextEn,
      nextSessionInfoId: nextId,
      isTestingBypass: true,
      config,
      deadlineTimeString,
    };
  }

  if (config.preset === 'wed_thu') {
    const isWednesday = dayIdx === 3;
    const isThursday = dayIdx === 4;
    const isWithinWindow = isWednesday || isThursday;

    if (isWithinWindow) {
      let remainingMinutes = 0;
      if (isWednesday) {
        remainingMinutes = (23 - currentHours) * 60 + (59 - currentMinutes) + 24 * 60;
      } else {
        remainingMinutes = Math.max(0, (23 - currentHours) * 60 + (59 - currentMinutes));
      }
      const remHours = Math.floor(remainingMinutes / 60);
      const remMins = remainingMinutes % 60;
      const remTextEn = `${remHours}h ${remMins}m remaining`;
      const remTextId = `${remHours}j ${remMins}m tersisa`;

      const labelEn = isThursday
        ? `Final Day (Closes Tonight 23:59 WIB • ${remTextEn})`
        : `Attendance Window Open (Closes Thu 23:59 WIB • ${remTextEn})`;
      const labelId = isThursday
        ? `Hari Terakhir (Tutup Malam Ini 23:59 WIB • ${remTextId})`
        : `Presensi Dibuka (Tutup Kamis 23:59 WIB • ${remTextId})`;

      const reasonEn = isThursday
        ? `Today is Thursday (${timeFormatted}). Attendance window is active through 23:59 WIB (${remTextEn}).`
        : `Today is Wednesday (${timeFormatted}). Attendance window is active through Thursday 23:59 WIB (${remTextEn}).`;
      const reasonId = isThursday
        ? `Hari ini hari Kamis (${timeFormatted}). Presensi mandiri aktif dan akan otomatis ditutup pukul 23:59 WIB (${remTextId}).`
        : `Hari ini hari Rabu (${timeFormatted}). Presensi mandiri aktif hingga Kamis pukul 23:59 WIB (${remTextId}).`;

      const nextEn = `Submission deadline: Thursday at 23:59 WIB (${remTextEn}).`;
      const nextId = `Batas pengisian: Kamis pukul 23:59 WIB (${remTextId}).`;

      return {
        isOpen: true,
        dayIndex: dayIdx,
        dayName: currentDayNameEn,
        dayNameId: currentDayNameId,
        timeString: timeFormatted,
        scheduleDescription: isEn ? scheduleDescEn : scheduleDescId,
        scheduleDescriptionEn: scheduleDescEn,
        scheduleDescriptionId: scheduleDescId,
        remainingTimeText: isEn ? remTextEn : remTextId,
        remainingTimeTextEn: remTextEn,
        remainingTimeTextId: remTextId,
        statusBadge: {
          label: isEn ? labelEn : labelId,
          labelEn,
          labelId,
          bgColor: isThursday ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-emerald-50 text-emerald-900 border-emerald-300',
          textColor: isThursday ? 'text-amber-900' : 'text-emerald-900',
          borderColor: isThursday ? 'border-amber-300' : 'border-emerald-300',
        },
        reasonText: isEn ? reasonEn : reasonId,
        reasonTextEn: reasonEn,
        reasonTextId: reasonId,
        nextSessionInfo: isEn ? nextEn : nextId,
        nextSessionInfoEn: nextEn,
        nextSessionInfoId: nextId,
        isTestingBypass: false,
        config,
        deadlineTimeString: '23:59:59',
      };
    }

    let daysUntilWed = (3 - dayIdx + 7) % 7;
    if (daysUntilWed === 0) daysUntilWed = 7;
    const hoursUntilWed = (daysUntilWed - 1) * 24 + (24 - currentHours);
    const countdownEn = `${daysUntilWed} day${daysUntilWed > 1 ? 's' : ''} (${hoursUntilWed} hours)`;
    const countdownId = `${daysUntilWed} hari (${hoursUntilWed} jam)`;

    const labelEn = 'Attendance Window Closed';
    const labelId = 'Jendela Presensi Ditutup';
    const remEn = `Opens in ${countdownEn}`;
    const remId = `Buka dalam ${countdownId}`;
    const reasonEn = `Attendance is currently closed (${currentDayNameEn}, ${timeFormatted}). Official window opens every Wednesday 00:00 through Thursday 23:59 WIB.`;
    const reasonId = `Presensi mandiri saat ini terkunci (${currentDayNameId}, ${timeFormatted}). Jadwal resmi dibuka setiap Rabu 00:00 s/d Kamis 23:59 WIB.`;
    const nextEn = `Next session opens next Wednesday at 00:00 WIB (${countdownEn}).`;
    const nextId = `Sesi presensi berikutnya dibuka hari Rabu pukul 00:00 WIB (${countdownId}).`;

    return {
      isOpen: false,
      dayIndex: dayIdx,
      dayName: currentDayNameEn,
      dayNameId: currentDayNameId,
      timeString: timeFormatted,
      scheduleDescription: isEn ? scheduleDescEn : scheduleDescId,
      scheduleDescriptionEn: scheduleDescEn,
      scheduleDescriptionId: scheduleDescId,
      remainingTimeText: isEn ? remEn : remId,
      remainingTimeTextEn: remEn,
      remainingTimeTextId: remId,
      statusBadge: {
        label: isEn ? labelEn : labelId,
        labelEn,
        labelId,
        bgColor: 'bg-rose-50 text-rose-800 border-rose-200',
        textColor: 'text-rose-800',
        borderColor: 'border-rose-200',
      },
      reasonText: isEn ? reasonEn : reasonId,
      reasonTextEn: reasonEn,
      reasonTextId: reasonId,
      nextSessionInfo: isEn ? nextEn : nextId,
      nextSessionInfoEn: nextEn,
      nextSessionInfoId: nextId,
      isTestingBypass: false,
      config,
      deadlineTimeString: '23:59:59',
      isPaused: false,
    };
  }

  const isTargetDay = config.activeDays.includes(dayIdx);

  if (isTargetDay) {
    if (currentTotalMinutes < startTotalMinutes) {
      const minsUntilOpen = startTotalMinutes - currentTotalMinutes;
      const hUntilOpen = Math.floor(minsUntilOpen / 60);
      const mUntilOpen = minsUntilOpen % 60;
      const timeWaitTextEn = hUntilOpen > 0 ? `${hUntilOpen}h ${mUntilOpen}m` : `${mUntilOpen} minutes`;
      const timeWaitTextId = hUntilOpen > 0 ? `${hUntilOpen} jam ${mUntilOpen} menit` : `${mUntilOpen} menit`;

      const labelEn = `Opens Today at ${pad(config.startHour)}:${pad(config.startMinute)} WIB`;
      const labelId = `Dibuka Hari Ini Pukul ${pad(config.startHour)}:${pad(config.startMinute)} WIB`;
      const remEn = `Opens at ${pad(config.startHour)}:${pad(config.startMinute)} WIB (in ${timeWaitTextEn})`;
      const remId = `Dibuka ${pad(config.startHour)}:${pad(config.startMinute)} WIB (dalam ${timeWaitTextId})`;
      const reasonEn = `Today is ${currentDayNameEn} (${timeFormatted}). Robotics attendance opens at ${pad(config.startHour)}:${pad(config.startMinute)} WIB until ${pad(config.endHour)}:${pad(config.endMinute)} WIB (${timeWaitTextEn} remaining).`;
      const reasonId = `Hari ini adalah ${currentDayNameId} (${timeFormatted}). Presensi ekskul Robotic akan dibuka tepat pukul ${pad(config.startHour)}:${pad(config.startMinute)} WIB sampai ${pad(config.endHour)}:${pad(config.endMinute)} WIB (${timeWaitTextId} lagi).`;
      const nextEn = `Active session today: ${pad(config.startHour)}:${pad(config.startMinute)} to ${pad(config.endHour)}:${pad(config.endMinute)} WIB.`;
      const nextId = `Sesi presensi aktif mulai pukul ${pad(config.startHour)}:${pad(config.startMinute)} s/d ${pad(config.endHour)}:${pad(config.endMinute)} WIB.`;

      return {
        isOpen: false,
        dayIndex: dayIdx,
        dayName: currentDayNameEn,
        dayNameId: currentDayNameId,
        timeString: timeFormatted,
        scheduleDescription: isEn ? scheduleDescEn : scheduleDescId,
        scheduleDescriptionEn: scheduleDescEn,
        scheduleDescriptionId: scheduleDescId,
        remainingTimeText: isEn ? remEn : remId,
        remainingTimeTextEn: remEn,
        remainingTimeTextId: remId,
        statusBadge: {
          label: isEn ? labelEn : labelId,
          labelEn,
          labelId,
          bgColor: 'bg-amber-50 text-amber-900 border-amber-300',
          textColor: 'text-amber-900',
          borderColor: 'border-amber-300',
        },
        reasonText: isEn ? reasonEn : reasonId,
        reasonTextEn: reasonEn,
        reasonTextId: reasonId,
        nextSessionInfo: isEn ? nextEn : nextId,
        nextSessionInfoEn: nextEn,
        nextSessionInfoId: nextId,
        isTestingBypass: false,
        config,
        deadlineTimeString,
      };
    }

    if (currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes) {
      const minsLeft = endTotalMinutes - currentTotalMinutes;
      const hLeft = Math.floor(minsLeft / 60);
      const mLeft = minsLeft % 60;
      const remTextEn = hLeft > 0 ? `${hLeft}h ${mLeft}m remaining` : `${mLeft}m remaining`;
      const remTextId = hLeft > 0 ? `${hLeft}j ${mLeft}m tersisa` : `${mLeft}m tersisa`;

      const labelEn = `Attendance Active (Closes at ${pad(config.endHour)}:${pad(config.endMinute)} WIB • ${remTextEn})`;
      const labelId = `Presensi Aktif (Tutup ${pad(config.endHour)}:${pad(config.endMinute)} WIB • ${remTextId})`;
      const remEn = `${remTextEn} (Closes ${pad(config.endHour)}:${pad(config.endMinute)} WIB)`;
      const remId = `${remTextId} (Tutup ${pad(config.endHour)}:${pad(config.endMinute)} WIB)`;
      const reasonEn = `Today is ${currentDayNameEn} (${timeFormatted}). Robotics club check-in is ACTIVE until ${pad(config.endHour)}:${pad(config.endMinute)} WIB (${remTextEn}).`;
      const reasonId = `Hari ini hari ${currentDayNameId} (${timeFormatted}). Presensi mandiri kegiatan ekskul Robotic sedang DIBUKA dan akan ditutup tepat pukul ${pad(config.endHour)}:${pad(config.endMinute)} WIB (${remTextId}).`;
      const nextEn = `Submission deadline: Today at ${pad(config.endHour)}:${pad(config.endMinute)} WIB (${remTextEn}).`;
      const nextId = `Batas waktu pengisian presensi: Hari ini pukul ${pad(config.endHour)}:${pad(config.endMinute)} WIB (${remTextId}).`;

      return {
        isOpen: true,
        dayIndex: dayIdx,
        dayName: currentDayNameEn,
        dayNameId: currentDayNameId,
        timeString: timeFormatted,
        scheduleDescription: isEn ? scheduleDescEn : scheduleDescId,
        scheduleDescriptionEn: scheduleDescEn,
        scheduleDescriptionId: scheduleDescId,
        remainingTimeText: isEn ? remEn : remId,
        remainingTimeTextEn: remEn,
        remainingTimeTextId: remId,
        statusBadge: {
          label: isEn ? labelEn : labelId,
          labelEn,
          labelId,
          bgColor: 'bg-emerald-50 text-emerald-900 border-emerald-300',
          textColor: 'text-emerald-900',
          borderColor: 'border-emerald-300',
        },
        reasonText: isEn ? reasonEn : reasonId,
        reasonTextEn: reasonEn,
        reasonTextId: reasonId,
        nextSessionInfo: isEn ? nextEn : nextId,
        nextSessionInfoEn: nextEn,
        nextSessionInfoId: nextId,
        isTestingBypass: false,
        config,
        deadlineTimeString,
      };
    }

    const primaryActiveDay = config.activeDays[0] ?? 3;
    let daysUntilNext = (primaryActiveDay - dayIdx + 7) % 7;
    if (daysUntilNext === 0) daysUntilNext = 7;
    const countdownEn = `${daysUntilNext} day${daysUntilNext > 1 ? 's' : ''}`;
    const countdownId = `${daysUntilNext} hari`;

    const labelEn = `Session Concluded (${pad(config.endHour)}:${pad(config.endMinute)} WIB)`;
    const labelId = `Sesi Hari Ini Selesai (${pad(config.endHour)}:${pad(config.endMinute)} WIB)`;
    const remEn = `Today's session closed (${pad(config.endHour)}:${pad(config.endMinute)} WIB)`;
    const remId = `Sesi hari ini selesai (Tutup ${pad(config.endHour)}:${pad(config.endMinute)} WIB)`;
    const reasonEn = `Attendance for ${currentDayNameEn} concluded at ${pad(config.endHour)}:${pad(config.endMinute)} WIB. Check-in is locked.`;
    const reasonId = `Sesi presensi hari ${currentDayNameId} telah berakhir pada pukul ${pad(config.endHour)}:${pad(config.endMinute)} WIB. Pengisian absensi ditutup secara otomatis.`;
    const nextEn = `Next session opens next ${ENGLISH_DAYS[primaryActiveDay]} at ${pad(config.startHour)}:${pad(config.startMinute)} WIB (${countdownEn}).`;
    const nextId = `Sesi presensi berikutnya akan dibuka ${INDONESIAN_DAYS[primaryActiveDay]} depan pukul ${pad(config.startHour)}:${pad(config.startMinute)} WIB (${countdownId}).`;

    return {
      isOpen: false,
      dayIndex: dayIdx,
      dayName: currentDayNameEn,
      dayNameId: currentDayNameId,
      timeString: timeFormatted,
      scheduleDescription: isEn ? scheduleDescEn : scheduleDescId,
      scheduleDescriptionEn: scheduleDescEn,
      scheduleDescriptionId: scheduleDescId,
      remainingTimeText: isEn ? remEn : remId,
      remainingTimeTextEn: remEn,
      remainingTimeTextId: remId,
      statusBadge: {
        label: isEn ? labelEn : labelId,
        labelEn,
        labelId,
        bgColor: 'bg-rose-50 text-rose-800 border-rose-200',
        textColor: 'text-rose-800',
        borderColor: 'border-rose-200',
      },
      reasonText: isEn ? reasonEn : reasonId,
      reasonTextEn: reasonEn,
      reasonTextId: reasonId,
      nextSessionInfo: isEn ? nextEn : nextId,
      nextSessionInfoEn: nextEn,
      nextSessionInfoId: nextId,
      isTestingBypass: false,
      config,
      deadlineTimeString,
    };
  }

  const primaryActiveDay = config.activeDays[0] ?? 3;
  let daysUntilTarget = (primaryActiveDay - dayIdx + 7) % 7;
  if (daysUntilTarget === 0) daysUntilTarget = 7;
  const hoursUntilTarget = (daysUntilTarget - 1) * 24 + (24 - currentHours) + config.startHour;
  const countdownEn = `${daysUntilTarget} day${daysUntilTarget > 1 ? 's' : ''} (${hoursUntilTarget} hours)`;
  const countdownId = `${daysUntilTarget} hari (${hoursUntilTarget} jam)`;

  const labelEn = 'Attendance Window Closed';
  const labelId = 'Jendela Presensi Ditutup';
  const remEn = `Opens ${ENGLISH_DAYS[primaryActiveDay]} ${pad(config.startHour)}:${pad(config.startMinute)} WIB (${countdownEn})`;
  const remId = `Buka ${INDONESIAN_DAYS[primaryActiveDay]} ${pad(config.startHour)}:${pad(config.startMinute)} WIB (${countdownId})`;
  const reasonEn = `Attendance is currently locked (${currentDayNameEn}, ${timeFormatted}). Session opens on ${scheduleDescEn}.`;
  const reasonId = `Presensi mandiri saat ini terkunci (${currentDayNameId}, ${timeFormatted}). Sesi presensi ekskul Robotic dibuka khusus pada ${scheduleDescId}.`;
  const nextEn = `Next session opens ${ENGLISH_DAYS[primaryActiveDay]} at ${pad(config.startHour)}:${pad(config.startMinute)} WIB (${countdownEn}).`;
  const nextId = `Sesi presensi berikutnya dibuka hari ${INDONESIAN_DAYS[primaryActiveDay]} pukul ${pad(config.startHour)}:${pad(config.startMinute)} WIB (${countdownId}).`;

  return {
    isOpen: false,
    dayIndex: dayIdx,
    dayName: currentDayNameEn,
    dayNameId: currentDayNameId,
    timeString: timeFormatted,
    scheduleDescription: isEn ? scheduleDescEn : scheduleDescId,
    scheduleDescriptionEn: scheduleDescEn,
    scheduleDescriptionId: scheduleDescId,
    remainingTimeText: isEn ? remEn : remId,
    remainingTimeTextEn: remEn,
    remainingTimeTextId: remId,
    statusBadge: {
      label: isEn ? labelEn : labelId,
      labelEn,
      labelId,
      bgColor: 'bg-rose-50 text-rose-800 border-rose-200',
      textColor: 'text-rose-800',
      borderColor: 'border-rose-200',
    },
    reasonText: isEn ? reasonEn : reasonId,
    reasonTextEn: reasonEn,
    reasonTextId: reasonId,
    nextSessionInfo: isEn ? nextEn : nextId,
    nextSessionInfoEn: nextEn,
    nextSessionInfoId: nextId,
    isTestingBypass: false,
    config,
    deadlineTimeString,
  };
}

/**
 * Validates whether an attendance submission is allowed under the smart schedule window
 */
export function validateAttendanceSubmission(isTestingMode?: boolean, lang?: 'en' | 'id'): { allowed: boolean; reason: string } {
  const currentLang = lang || getCurrentAppLanguage();
  const status = checkAttendanceSchedule(new Date(), isTestingMode, undefined, currentLang);
  if (status.isOpen) {
    return { allowed: true, reason: status.reasonText };
  }
  return {
    allowed: false,
    reason: currentLang === 'en'
      ? `Submission locked: Outside active attendance window (${status.scheduleDescriptionEn}). ${status.nextSessionInfoEn}`
      : `Pengisian terkunci: Di luar jadwal presensi aktif (${status.scheduleDescriptionId}). ${status.nextSessionInfoId}`,
  };
}
