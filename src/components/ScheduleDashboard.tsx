'use client';

import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  Users,
} from 'lucide-react';
import {
  addDays,
  exportRosterToCSV,
  formatDateISO,
  generateWeeklyRoster,
  getMondayOfWeek,
  SHIFT_DEFINITIONS,
} from '@/lib/scheduler';
import { RotationConfig, ShiftCode, StaffMember } from '@/types/schedule';

const INITIAL_STAFF: StaffMember[] = [
  { id: 'stf-1', name: 'Andi Pratama', role: 'Perawat', active: true },
  { id: 'stf-2', name: 'Budi Santoso', role: 'Perawat', active: true },
  { id: 'stf-3', name: 'Citra Lestari', role: 'Perawat', active: true },
  { id: 'stf-4', name: 'Dewi Anggraini', role: 'Perawat', active: true },
  { id: 'stf-5', name: 'Eko Wijaya', role: 'Perawat', active: true },
  { id: 'stf-6', name: 'Fajar Nugroho', role: 'Perawat', active: true },
];

const SHIFT_ORDER: ShiftCode[] = ['PAGI', 'SIANG', 'MALAM', 'LIBUR'];

export default function ScheduleDashboard() {
  const todayMondayISO = useMemo(() => formatDateISO(getMondayOfWeek(new Date())), []);

  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [selectedMonday, setSelectedMonday] = useState<Date>(() =>
    getMondayOfWeek(new Date())
  );
  const [config, setConfig] = useState<RotationConfig>({
    anchorDateISO: todayMondayISO,
    daysOffPerWeek: 1,
  });
  const [overrides, setOverrides] = useState<Record<string, ShiftCode>>({});

  // State form tambah personel
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');

  const roster = useMemo(
    () => generateWeeklyRoster(staffList, selectedMonday, config, overrides),
    [staffList, selectedMonday, config, overrides]
  );

  // Navigasi minggu
  const handlePrevWeek = () => setSelectedMonday((prev) => addDays(prev, -7));
  const handleNextWeek = () => setSelectedMonday((prev) => addDays(prev, 7));
  const handleTodayWeek = () => setSelectedMonday(getMondayOfWeek(new Date()));

  // Klik sel untuk siklus manual override (Pagi -> Siang -> Malam -> Libur)
  const handleCycleCellShift = (
    staffId: string,
    dateISO: string,
    currentShift: ShiftCode
  ) => {
    const nextIdx = (SHIFT_ORDER.indexOf(currentShift) + 1) % SHIFT_ORDER.length;
    const nextShift = SHIFT_ORDER[nextIdx];
    const key = `${staffId}_${dateISO}`;

    setOverrides((prev) => ({
      ...prev,
      [key]: nextShift,
    }));
  };

  // Tambah & hapus personel
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newMember: StaffMember = {
      id: `stf-${Date.now()}`,
      name: newName.trim(),
      role: newRole.trim() || 'Staf Operasional',
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
    a.download = `jadwal-dinas-${roster.startDateISO}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Hitung rekap jumlah personel aktif per hari per shift untuk validasi operasional
  const dailyCoverage = useMemo(() => {
    return Array.from({ length: 7 }, (_, dayIdx) => {
      const counts = { PAGI: 0, SIANG: 0, MALAM: 0, LIBUR: 0 };
      roster.rows.forEach((row) => {
        const shift = row.days[dayIdx]?.shift;
        if (shift) counts[shift]++;
      });
      return counts;
    });
  }, [roster]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Action Bar */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Jadwal Dinas Otomatis
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                Siklus Rotasi Minggu ke-{roster.weekNumber}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Periode: <strong className="text-slate-700">{roster.startDateISO}</strong> s/d{' '}
              <strong className="text-slate-700">{roster.endDateISO}</strong> • Rotasi
              otomatis setiap Senin
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {Object.keys(overrides).length > 0 && (
              <button
                onClick={() => setOverrides({})}
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

          <div className="lg:col-span-6 flex flex-wrap items-center justify-start lg:justify-end gap-4 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-slate-600">Libur / Minggu:</span>
              <select
                value={config.daysOffPerWeek}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    daysOffPerWeek: Number(e.target.value) as 1 | 2,
                  }))
                }
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium"
              >
                <option value={1}>1 Hari</option>
                <option value={2}>2 Hari</option>
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="text-slate-600">Tanggal Patokan Rotasi:</span>
              <input
                type="date"
                value={config.anchorDateISO}
                onChange={(e) =>
                  e.target.value &&
                  setConfig((prev) => ({
                    ...prev,
                    anchorDateISO: formatDateISO(getMondayOfWeek(e.target.value)),
                  }))
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
                  <th className="py-3.5 px-4 font-semibold min-w-[200px]">
                    Personel
                  </th>
                  {roster.rows[0]?.days.map((day) => (
                    <th
                      key={day.dateISO}
                      className="py-3.5 px-3 font-semibold text-center min-w-[115px]"
                    >
                      <div>{day.dayName}</div>
                      <div className="text-[11px] font-normal text-slate-500">
                        {day.dateISO.slice(5)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {roster.rows.map((row) => (
                  <tr key={row.staff.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {row.staff.name}
                      </div>
                      <div className="text-xs text-slate-500">{row.staff.role}</div>
                    </td>
                    {row.days.map((day) => {
                      const def = SHIFT_DEFINITIONS[day.shift];
                      return (
                        <td key={day.dateISO} className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleCycleCellShift(
                                row.staff.id,
                                day.dateISO,
                                day.shift
                              )
                            }
                            title="Klik untuk mengubah shift secara manual"
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
                ))}
              </tbody>
              {/* Footer Validasi Kekuatan Personel Harian */}
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 text-xs">
                  <td colSpan={1} className="py-3 px-4 font-semibold text-slate-700">
                    Rekap Kekuatan Jaga (I / P / T)
                  </td>
                  {dailyCoverage.map((cov, idx) => (
                    <td key={idx} className="py-3 px-2 text-center font-mono">
                      <span className="text-emerald-700 font-bold">{cov.PAGI}</span> /{' '}
                      <span className="text-amber-700 font-bold">{cov.SIANG}</span> /{' '}
                      <span className="text-indigo-700 font-bold">{cov.MALAM}</span>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap justify-between gap-2 print:hidden">
            <span>
              Tips: Klik pada kotak shift mana pun untuk melakukan penyesuaian manual
              (tukar dinas).
            </span>
            <span>I = IGD • P = Poli Umum • T = Tensi</span>
          </div>
        </section>

        {/* Panel Manajemen Personel */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900">
              Manajemen Personel ({staffList.length} Orang)
            </h2>
          </div>

          <form
            onSubmit={handleAddStaff}
            className="flex flex-col sm:flex-row gap-3 mb-5"
          >
            <input
              type="text"
              placeholder="Nama lengkap personel..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Jabatan / Unit (opsional)"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="sm:w-64 border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Tambah Personel
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
                  title="Hapus Personel"
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