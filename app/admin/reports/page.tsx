import { AdminModule } from '../admin-module';

export default function AdminReportsPage() {
  return <AdminModule eyebrow="Analytics" title="Reports" description="Generate privacy-aware provider, booking, feedback, subscription, and business reports with date filters and export." action="Export report" stats={[{ label: 'Provider growth', value: '—' }, { label: 'Booking completion', value: '—' }, { label: 'Customer rating', value: '—' }, { label: 'Verified revenue', value: '—' }]} columns={['Report', 'Period', 'Records', 'Generated', 'Download']} />;
}