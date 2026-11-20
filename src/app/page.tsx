import ScheduleDashboard from '@/components/ScheduleDashboard';

export const metadata = {
  title: 'AutoRoster — Sistem Penjadwalan Dinas Otomatis',
  description: 'Aplikasi web penjadwalan shift kerja otomatis dengan rotasi mingguan.',
};

export default function HomePage() {
  return <ScheduleDashboard />;
}