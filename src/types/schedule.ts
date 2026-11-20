export type ShiftCode = 'TENSI' | 'IGD' | 'POLI' | 'LAPANGAN' | 'LIBUR';

export interface ShiftDefinition {
  code: ShiftCode;
  label: string;
  timeRange: string;
  badgeClass: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  active: boolean;
}

export interface DayAssignment {
  dateISO: string; // YYYY-MM-DD
  dayName: string;
  shift: ShiftCode;
  isOverridden: boolean;
  isLocked: boolean; // True khusus hari Minggu
}

export interface StaffWeeklyRow {
  staff: StaffMember;
  inBuildingCount: number; // Total hari jaga Tensi/IGD/Poli (maks. 3 hari)
  lapanganCount: number;   // Total hari tugas Lapangan
  days: DayAssignment[];
}

export interface WeeklyRoster {
  weekNumber: number;
  weekOffset: number;
  startDateISO: string;
  endDateISO: string;
  rows: StaffWeeklyRow[];
}

export interface RotationConfig {
  anchorDateISO: string; // Tanggal Senin pertama sebagai patokan Minggu ke-1
}