import { AdminModule } from '../admin-module';
import { adminQuery } from '../../../lib/admin-data';

export default async function AdminCustomersPage() {
  const result = await adminQuery<{ full_name: string | null; phone: string | null; is_active: boolean }>('profiles', 'full_name,phone,is_active');
  return <AdminModule eyebrow="Customer management" title="Customers" description="Review customer accounts, booking history, and activity while protecting private contact data." stats={[{ label: 'Registered customers', value: String(result.data.length) }, { label: 'Active this month', value: '—' }, { label: 'Bookings', value: '—' }, { label: 'Flagged activity', value: '—' }]} columns={['Customer', 'Phone', 'Status']} rows={result.data.map((customer) => [customer.full_name || 'Unnamed customer', customer.phone || '—', customer.is_active ? 'Active' : 'Inactive'])} dataError={result.error} />;
}