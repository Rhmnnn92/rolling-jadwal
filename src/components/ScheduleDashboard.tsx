'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Lock,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  addDays,
  exportRosterToCSV,
  formatDateISO,
  generateWeeklyRoster,
  getMondayOfWeek,
  isInBuildingShift,
  MAX_IN_BUILDING_DAYS,
  SHIFT_DEFINITIONS,
} from '@/lib/scheduler';
import {
  DayAssignment,
  RotationConfig,
  ShiftCode,
  StaffMember,
  StaffWeeklyRow,
} from '@/types/schedule';

const INITIAL_STAFF: StaffMember[] = [
  { id: 'stf-1', name: 'Hasanudin', role: 'Perawat', active: true },
  { id: 'stf-2', name: 'Asep Suryana', role: 'Perawat', active: true },
  { id: 'stf-3', name: 'Hj. Inshafira Laura', role: 'Perawat', active: true },
  { id: 'stf-4', name: 'Riska', role: 'Perawat', active: true },
  { id: 'stf-5', name: 'Kurniawan', role: 'Perawat', active: true },
  { id: 'stf-6', name: 'Riko', role: 'Perawat', active: true },
  { id: 'stf-7', name: 'Feri', role: 'Perawat', active: true },
  { id: 'stf-8', name: 'Euis', role: 'Perawat', active: true },
  { id: 'stf-9', name: 'Entin', role: 'Perawat', active: true },
  { id: 'stf-10', name: 'Edi', role: 'Perawat', active: true },
];

const SHIFT_ORDER: ShiftCode[] = ['TENSI', 'IGD', 'POLI', 'LAPANGAN', 'LIBUR'];

export default function ScheduleDashboard() {
  const todayMondayISO = useMemo(
    () => formatDateISO(getMondayOfWeek(new Date())),
    []
  );

  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [selectedMonday, setSelectedMonday] = useState<Date>(() =>
    getMondayOfWeek(new Date())
  );
  const [config, setConfig] = useState<RotationConfig>({
    anchorDateISO: todayMondayISO,
  });
  const [overrides, setOverrides] = useState<Record<string, ShiftCode>>({});
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // State form tambah perawat
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');

  const roster = useMemo(
    () => generateWeeklyRoster(staffList, selectedMonday, config, overrides),
    [staffList, selectedMonday, config, overrides]
  );

  // Navigasi minggu
  const handlePrevWeek = () => {
    setWarningMessage(null);
    setSelectedMonday((prev) => addDays(prev, -7));
  };
  const handleNextWeek = () => {
    setWarningMessage(null);
    setSelectedMonday((prev) => addDays(prev, 7));
  };
  const handleTodayWeek = () => {
    setWarningMessage(null);
    setSelectedMonday(getMondayOfWeek(new Date()));
  };

  // Klik sel untuk siklus manual override dengan penjagaan maks. 3x jaga dalam gedung/minggu
  const handleCycleCellShift = (row: StaffWeeklyRow, day: DayAssignment) => {
    if (day.isLocked) return;

    const nextIdx = (SHIFT_ORDER.indexOf(day.shift) + 1) % SHIFT_ORDER.length;
    const nextShift = SHIFT_ORDER[nextIdx];

    // Cegah penambahan jaga dalam (Tensi/IGD/Poli) jika sudah mencapai batas 3 hari
    if (
      !isInBuildingShift(day.shift) &&
      isInBuildingShift(nextShift) &&
      row.inBuildingCount >= MAX_IN_BUILDING_DAYS
    ) {
      setWarningMessage(
        `${row.staff.name} sudah mencapai batas maksimal ${MAX_IN_BUILDING_DAYS} hari jaga (Tensi/IGD/Poli) dalam minggu ini. Ubah salah satu jadwal jaganya menjadi Lapangan terlebih dahulu.`
      );
      return;
    }

    setWarningMessage(null);
    const key = `${row.staff.id}_${day.dateISO}`;

    setOverrides((prev) => ({
      ...prev,
      [key]: nextShift,
    }));
  };

  // Tambah & hapus perawat
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newMember: StaffMember = {
      id: `stf-${Date.now()}`,
      name: newName.trim(),
      role: newRole.trim() || 'Perawat',
      active: true,
    };
    setStaffList((prev) => [...prev, newMember]);
    setNewName('');
    setNewRole('');
  };

  const handleRemoveStaff = (id: string) => {
    setStaffList((prev) => prev.filter((s) => s.id !== id));
  };

  // Download CSV
  const handleDownloadCSV = () => {
    const csvContent = exportRosterToCSV(roster);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jadwal-perawat-puskesmas-${roster.startDateISO}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Rekap jumlah perawat per hari per unit
  const dailyCoverage = useMemo(() => {
    return Array.from({ length: 7 }, (_, dayIdx) => {
      const counts = { TENSI: 0, IGD: 0, POLI: 0, LAPANGAN: 0, LIBUR: 0 };
      roster.rows.forEach((row) => {
        const shift = row.days[dayIdx]?.shift;
        if (shift) counts[shift]++;
      });
      return counts;
    });
  }, [roster]);

  const activeCount = staffList.filter((s) => s.active).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Action Bar */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Jadwal Dinas Perawat Puskesmas
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                Siklus Rotasi Minggu ke-{roster.weekNumber}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Periode:{' '}
              <strong className="text-slate-700">{roster.startDateISO}</strong> s/d{' '}
              <strong className="text-slate-700">{roster.endDateISO}</strong> •
              3 Hari Jaga Unit + 3 Hari Lapangan • Minggu Libur
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {Object.keys(overrides).length > 0 && (
              <button
                onClick={() => {
                  setOverrides({});
                  setWarningMessage(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Override ({Object.keys(overrides).length})
              </button>
            )}
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition"
            >
              <Printer className="w-4 h-4" />
              Cetak Jadwal
            </button>
          </div>
        </header>

        {/* Peringatan Validasi Override */}
        {warningMessage && (
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-sm print:hidden">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{warningMessage}</span>
            </div>
            <button
              onClick={() => setWarningMessage(null)}
              className="p-1 text-rose-500 hover:text-rose-700 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Peringatan jika total perawat kurang dari 10 */}
        {activeCount < 10 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm print:hidden">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              Jumlah perawat aktif saat ini <strong>{activeCount} orang</strong>.
              Dengan pola 3 hari jaga dalam + 3 hari Lapangan per orang,
              dibutuhkan minimal <strong>10 perawat</strong> agar kuota harian
              (2 Tensi, 2 IGD, 1 Poli) terpenuhi penuh dari Senin hingga Sabtu.
            </span>
          </div>
        )}

        {/* Control Bar: Navigasi Minggu & Parameter Rotasi */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
          <div className="lg:col-span-6 flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition"
              title="Minggu Sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleTodayWeek}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <CalendarIcon className="w-4 h-4" />
              Minggu Ini
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition"
              title="Minggu Berikutnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="text-xs text-slate-500 ml-2">
              {roster.weekOffset === 0
                ? '(Minggu berjalan)'
                : roster.weekOffset > 0
                ? `(+${roster.weekOffset} minggu ke depan)`
                : `(${roster.weekOffset} minggu lalu)`}
            </span>
          </div>

          <div className="lg:col-span-6 flex flex-wrap items-center justify-start lg:justify-end gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 text-xs font-medium border border-blue-200">
              Pola: 3x Jaga Unit + 3x Lapangan
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              Minggu: Libur
            </span>

            <label className="flex items-center gap-2">
              <span className="text-slate-600">Patokan Rotasi:</span>
              <input
                type="date"
                value={config.anchorDateISO}
                onChange={(e) =>
                  e.target.value &&
                  setConfig({
                    anchorDateISO: formatDateISO(getMondayOfWeek(e.target.value)),
                  })
                }
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium"
              />
            </label>
          </div>
        </section>

        {/* Tabel Utama Jadwal Dinas */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-xs uppercase text-slate-600">
                  <th className="py-3.5 px-4 font-semibold min-w-[240px]">
                    Nama Perawat
                  </th>
                  {Array.from({ length: 7 }, (_, i) => {
                    const dayDate = addDays(selectedMonday, i);
                    const dateISO = formatDateISO(dayDate);
                    const dayNames = [
                      'Senin',
                      'Selasa',
                      'Rabu',
                      'Kamis',
                      'Jumat',
                      'Sabtu',
                      'Minggu',
                    ];
                    const isSunday = i === 6;
                    return (
                      <th
                        key={dateISO}
                        className={`py-3.5 px-3 font-semibold text-center min-w-[115px] ${
                          isSunday ? 'bg-slate-200/70 text-slate-700' : ''
                        }`}
                      >
                        <div className="inline-flex items-center justify-center gap-1">
                          {dayNames[i]}
                          {isSunday && (
                            <Lock className="w-3 h-3 text-slate-500" />
                          )}
                        </div>
                        <div className="text-[11px] font-normal text-slate-500">
                          {dateISO.slice(5)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {roster.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-slate-500 text-sm"
                    >
                      Belum ada data perawat. Silakan tambahkan perawat melalui
                      form di bawah.
                    </td>
                  </tr>
                ) : (
                  roster.rows.map((row) => (
                    <tr
                      key={row.staff.id}
                      className="hover:bg-slate-50/80 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {row.staff.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                              row.inBuildingCount > MAX_IN_BUILDING_DAYS
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            Jaga: {row.inBuildingCount}/{MAX_IN_BUILDING_DAYS} hari
                          </span>
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-700">
                            Lapangan: {row.lapanganCount} hari
                          </span>
                        </div>
                      </td>
                      {row.days.map((day) => {
                        const def = SHIFT_DEFINITIONS[day.shift];

                        if (day.isLocked) {
                          return (
                            <td
                              key={day.dateISO}
                              className="py-2.5 px-2 text-center bg-slate-50/80"
                            >
                              <div
                                title="Libur hari Minggu dikunci"
                                className="w-full py-1.5 px-2 rounded-lg border border-slate-300 bg-slate-200/70 text-slate-600 text-xs font-semibold cursor-not-allowed select-none"
                              >
                                <div className="inline-flex items-center justify-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  {def.label}
                                </div>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={day.dateISO}
                            className="py-2.5 px-2 text-center"
                          >
                            <button
                              type="button"
                              onClick={() => handleCycleCellShift(row, day)}
                              title="Klik untuk tukar unit tugas secara manual"
                              className={`w-full py-1.5 px-2 rounded-lg border text-xs font-semibold transition transform active:scale-95 ${
                                def.badgeClass
                              } ${
                                day.isOverridden
                                  ? 'ring-2 ring-blue-500 ring-offset-1'
                                  : ''
                              }`}
                            >
                              <div>{def.label}</div>
                              <div className="text-[10px] font-normal opacity-80">
                                {def.timeRange}
                              </div>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
              {/* Footer Validasi Kekuatan Perawat Harian */}
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 text-xs">
                  <td
                    colSpan={1}
                    className="py-3 px-4 font-semibold text-slate-700"
                  >
                    Rekap Jaga (T / I / P / L)
                  </td>
                  {dailyCoverage.map((cov, idx) => (
                    <td
                      key={idx}
                      className={`py-3 px-2 text-center font-mono ${
                        idx === 6 ? 'bg-slate-200/50 text-slate-500' : ''
                      }`}
                    >
                      {idx === 6 ? (
                        <span className="font-sans font-semibold text-slate-500">
                          LIBUR SEMUA
                        </span>
                      ) : (
                        <>
                          <span className="text-sky-700 font-bold">
                            {cov.TENSI}
                          </span>{' '}
                          /{' '}
                          <span className="text-rose-700 font-bold">
                            {cov.IGD}
                          </span>{' '}
                          /{' '}
                          <span className="text-emerald-700 font-bold">
                            {cov.POLI}
                          </span>{' '}
                          /{' '}
                          <span className="text-amber-700 font-bold">
                            {cov.LAPANGAN}
                          </span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap justify-between gap-2 print:hidden">
            <span>
              Aturan: 3 hari berturut-turut di unit yang sama + 3 hari di
              Lapangan. Minggu terkunci libur.
            </span>
            <span>
              T = Tensi (2) • I = IGD (2) • P = Poli Umum (1) • L = Lapangan
              (Sisa)
            </span>
          </div>
        </section>

        {/* Panel Manajemen Perawat */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900">
              Manajemen Perawat Puskesmas ({staffList.length} Orang)
            </h2>
          </div>

          <form
            onSubmit={handleAddStaff}
            className="flex flex-col sm:flex-row gap-3 mb-5"
          >
            <input
              type="text"
              placeholder="Nama lengkap & gelar perawat..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Jabatan / Keterangan (default: Perawat)"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="sm:w-64 border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Tambah Perawat
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {staffList.map((stf, index) => (
              <div
                key={stf.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    <span className="text-slate-400 mr-1.5">#{index + 1}</span>
                    {stf.name}
                  </div>
                  <div className="text-xs text-slate-500">{stf.role}</div>
                </div>
                <button
                  onClick={() => handleRemoveStaff(stf.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                  title="Hapus Perawat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}