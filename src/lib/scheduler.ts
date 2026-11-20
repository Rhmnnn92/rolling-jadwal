import {
  RotationConfig,
  ShiftCode,
  ShiftDefinition,
  StaffMember,
  StaffWeeklyRow,
  WeeklyRoster,
} from '@/types/schedule';

export const SHIFT_DEFINITIONS: Record<ShiftCode, ShiftDefinition> = {
  PAGI: {
    code: 'PAGI',
    label: 'IGD',
    timeRange: '07:45 - 14.15',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  SIANG: {
    code: 'SIANG',
    label: 'Tensi',
    timeRange: '07:45 - 14.15',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  MALAM: {
    code: 'MALAM',
    label: 'Poli Umum',
    timeRange: '07:45 - 14.15',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
  LIBUR: {
    code: 'LIBUR',
    label: 'Libur',
    timeRange: 'Nice day',
    badgeClass: 'bg-slate-100 text-slate-500 border-slate-300',
  },
};

/**
 * Pola rotasi 2 blok per minggu (masing-masing 3 hari):
 * [Senin-Rabu (3 hari), Kamis-Sabtu (3 hari)]
 * Dirancang agar:
 * 1. Tidak pernah lebih dari 3 hari di sesi shift yang sama (termasuk lintas minggu).
 * 2. Distribusi Pagi/Siang/Malam selalu seimbang setiap hari Senin-Sabtu.
 * 3. Jeda istirahat antar pergantian shift aman (minimal 8-32 jam).
 */
const SHIFT_BLOCK_PATTERNS: [
  Exclude<ShiftCode, 'LIBUR'>,
  Exclude<ShiftCode, 'LIBUR'>
][] = [
  ['PAGI', 'MALAM'],  // Pola 1: Sen-Rab Pagi, Kam-Sab Malam
  ['SIANG', 'PAGI'],  // Pola 2: Sen-Rab Siang, Kam-Sab Pagi
  ['MALAM', 'SIANG'], // Pola 3: Sen-Rab Malam, Kam-Sab Siang
];

const DAY_NAMES_ID = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
];

export function getMondayOfWeek(dateInput: Date | string): Date {
  const d =
    typeof dateInput === 'string'
      ? new Date(`${dateInput}T00:00:00Z`)
      : new Date(
          Date.UTC(
            dateInput.getFullYear(),
            dateInput.getMonth(),
            dateInput.getDate()
          )
        );

  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d;
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function calculateWeekOffset(
  targetDate: Date,
  anchorDateISO: string
): number {
  const targetMonday = getMondayOfWeek(targetDate);
  const anchorMonday = getMondayOfWeek(anchorDateISO);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.round((targetMonday.getTime() - anchorMonday.getTime()) / msPerWeek);
}

function positiveMod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Generator jadwal dinas mingguan:
 * - Senin-Rabu (3 hari) & Kamis-Sabtu (3 hari) berotasi otomatis tiap minggu
 * - Minggu selalu LIBUR dan terkunci (isLocked = true)
 */
export function generateWeeklyRoster(
  staffList: StaffMember[],
  targetDate: Date,
  config: RotationConfig,
  manualOverrides: Record<string, ShiftCode> = {}
): WeeklyRoster {
  const activeStaff = staffList.filter((s) => s.active);
  const weekStart = getMondayOfWeek(targetDate);
  const weekEnd = addDays(weekStart, 6);
  const weekOffset = calculateWeekOffset(weekStart, config.anchorDateISO);

  const rows: StaffWeeklyRow[] = activeStaff.map((staff, staffIdx) => {
    // Setiap minggu seluruh personel bergeser pola rotasinya secara siklikal
    const patternIndex = positiveMod(
      staffIdx + weekOffset,
      SHIFT_BLOCK_PATTERNS.length
    );
    const [firstBlockShift, secondBlockShift] =
      SHIFT_BLOCK_PATTERNS[patternIndex];

    const days = Array.from({ length: 7 }, (_, dayIdx) => {
      const currentDate = addDays(weekStart, dayIdx);
      const dateISO = formatDateISO(currentDate);

      // Hari Minggu (dayIdx === 6) selalu LIBUR dan DIKUNCI
      if (dayIdx === 6) {
        return {
          dateISO,
          dayName: DAY_NAMES_ID[dayIdx],
          shift: 'LIBUR' as ShiftCode,
          isOverridden: false,
          isLocked: true,
        };
      }

      // Senin-Rabu (0,1,2) = Blok 1 (3 hari) | Kamis-Sabtu (3,4,5) = Blok 2 (3 hari)
      const defaultShift: ShiftCode =
        dayIdx < 3 ? firstBlockShift : secondBlockShift;

      const overrideKey = `${staff.id}_${dateISO}`;
      const overriddenShift = manualOverrides[overrideKey];

      return {
        dateISO,
        dayName: DAY_NAMES_ID[dayIdx],
        shift: overriddenShift ?? defaultShift,
        isOverridden: Boolean(overriddenShift),
        isLocked: false,
      };
    });

    return {
      staff,
      days,
    };
  });

  return {
    weekNumber: positiveMod(weekOffset, SHIFT_BLOCK_PATTERNS.length) + 1,
    weekOffset,
    startDateISO: formatDateISO(weekStart),
    endDateISO: formatDateISO(weekEnd),
    rows,
  };
}

export function exportRosterToCSV(roster: WeeklyRoster): string {
  const headers = [
    'Nama Personel',
    'Jabatan/Unit',
    ...DAY_NAMES_ID.map((day, i) => {
      const dateStr = roster.rows[0]?.days[i]?.dateISO ?? '';
      return `${day} (${dateStr})`;
    }),
  ];

  const lines = roster.rows.map((row) => [
    `"${row.staff.name}"`,
    `"${row.staff.role}"`,
    ...row.days.map((d) => d.shift),
  ]);

  return [headers.join(','), ...lines.map((l) => l.join(','))].join('\n');
}