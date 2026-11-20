import {
  RotationConfig,
  ShiftCode,
  ShiftDefinition,
  StaffMember,
  StaffWeeklyRow,
  WeeklyRoster,
} from '@/types/schedule';

export const MAX_IN_BUILDING_DAYS = 3;

export const IN_BUILDING_UNITS: Exclude<ShiftCode, 'LAPANGAN' | 'LIBUR'>[] = [
  'TENSI',
  'IGD',
  'POLI',
];

export const SHIFT_DEFINITIONS: Record<ShiftCode, ShiftDefinition> = {
  TENSI: {
    code: 'TENSI',
    label: 'Tensi',
    timeRange: 'Ruang Tensi',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
  },
  IGD: {
    code: 'IGD',
    label: 'IGD',
    timeRange: 'Ruang IGD',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
  },
  POLI: {
    code: 'POLI',
    label: 'Poli',
    timeRange: 'Poli Umum',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  LAPANGAN: {
    code: 'LAPANGAN',
    label: 'Lapangan',
    timeRange: 'Tugas Lapangan',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  LIBUR: {
    code: 'LIBUR',
    label: 'Libur',
    timeRange: 'Off Duty',
    badgeClass: 'bg-slate-100 text-slate-500 border-slate-300',
  },
};

const DAY_NAMES_ID = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
];

/**
 * Pembagian jadwal 2 blok (Senin-Rabu & Kamis-Sabtu) berdasarkan slot rotasi mingguan:
 * - Slot 0 & 1 : Sen-Rab TENSI (3x)    | Kam-Sab LAPANGAN (3x)
 * - Slot 2 & 3 : Sen-Rab IGD (3x)      | Kam-Sab LAPANGAN (3x)
 * - Slot 4     : Sen-Rab POLI (3x)     | Kam-Sab LAPANGAN (3x)
 * - Slot 5 & 6 : Sen-Rab LAPANGAN (3x) | Kam-Sab TENSI (3x)
 * - Slot 7 & 8 : Sen-Rab LAPANGAN (3x) | Kam-Sab IGD (3x)
 * - Slot 9     : Sen-Rab LAPANGAN (3x) | Kam-Sab POLI (3x)
 * - Slot >= 10 : Sen-Rab LAPANGAN (3x) | Kam-Sab LAPANGAN (3x)
 */
function getBlockShiftsBySlot(
  slotIndex: number
): [Exclude<ShiftCode, 'LIBUR'>, Exclude<ShiftCode, 'LIBUR'>] {
  if (slotIndex < 2) return ['TENSI', 'LAPANGAN'];
  if (slotIndex < 4) return ['IGD', 'LAPANGAN'];
  if (slotIndex === 4) return ['POLI', 'LAPANGAN'];
  if (slotIndex < 7) return ['LAPANGAN', 'TENSI'];
  if (slotIndex < 9) return ['LAPANGAN', 'IGD'];
  if (slotIndex === 9) return ['LAPANGAN', 'POLI'];
  return ['LAPANGAN', 'LAPANGAN'];
}

export function isInBuildingShift(shift: ShiftCode): boolean {
  return (
    shift === 'TENSI' || shift === 'IGD' || shift === 'POLI'
  );
}

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
 * Generator utama jadwal dinas perawat Puskesmas:
 * - Maksimal 3 hari berturut-turut jaga di unit yang sama (Tensi / IGD / Poli)
 * - 3 hari sisanya bertugas di Lapangan (bukan libur)
 * - Kuota harian Senin-Sabtu: 2 Tensi, 2 IGD, 1 Poli, sisanya Lapangan
 * - Minggu: Semua perawat LIBUR dan terkunci (isLocked = true)
 */
export function generateWeeklyRoster(
  staffList: StaffMember[],
  targetDate: Date,
  config: RotationConfig,
  manualOverrides: Record<string, ShiftCode> = {}
): WeeklyRoster {
  const activeStaff = staffList.filter((s) => s.active);
  const totalStaff = activeStaff.length;
  const weekStart = getMondayOfWeek(targetDate);
  const weekEnd = addDays(weekStart, 6);
  const weekOffset = calculateWeekOffset(weekStart, config.anchorDateISO);

  const rows: StaffWeeklyRow[] = activeStaff.map((staff, staffIdx) => {
    const rotatedSlot =
      totalStaff > 0 ? positiveMod(staffIdx + weekOffset, totalStaff) : 0;

    const [firstBlockShift, secondBlockShift] =
      getBlockShiftsBySlot(rotatedSlot);

    let inBuildingCount = 0;
    let lapanganCount = 0;

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

      // Senin-Rabu (0,1,2) = Blok 1 | Kamis-Sabtu (3,4,5) = Blok 2
      const defaultShift: ShiftCode =
        dayIdx < 3 ? firstBlockShift : secondBlockShift;

      const overrideKey = `${staff.id}_${dateISO}`;
      const overriddenShift = manualOverrides[overrideKey];
      const finalShift = overriddenShift ?? defaultShift;

      if (isInBuildingShift(finalShift)) {
        inBuildingCount++;
      } else if (finalShift === 'LAPANGAN') {
        lapanganCount++;
      }

      return {
        dateISO,
        dayName: DAY_NAMES_ID[dayIdx],
        shift: finalShift,
        isOverridden: Boolean(overriddenShift),
        isLocked: false,
      };
    });

    return {
      staff,
      inBuildingCount,
      lapanganCount,
      days,
    };
  });

  return {
    weekNumber: totalStaff > 0 ? positiveMod(weekOffset, totalStaff) + 1 : 1,
    weekOffset,
    startDateISO: formatDateISO(weekStart),
    endDateISO: formatDateISO(weekEnd),
    rows,
  };
}

export function exportRosterToCSV(roster: WeeklyRoster): string {
  const headers = [
    'Nama Perawat',
    'Jabatan/Profesi',
    'Jaga Dalam (Hari)',
    'Lapangan (Hari)',
    ...DAY_NAMES_ID.map((day, i) => {
      const dateStr = roster.rows[0]?.days[i]?.dateISO ?? '';
      return `${day} (${dateStr})`;
    }),
  ];

  const lines = roster.rows.map((row) => [
    `"${row.staff.name}"`,
    `"${row.staff.role}"`,
    `${row.inBuildingCount} Hari`,
    `${row.lapanganCount} Hari`,
    ...row.days.map((d) => d.shift),
  ]);

  return [headers.join(','), ...lines.map((l) => l.join(','))].join('\n');
}