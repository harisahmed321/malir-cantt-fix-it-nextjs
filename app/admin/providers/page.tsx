import { AdminModule } from '../admin-module';
import { adminQuery } from '../../../lib/admin-data';

export default async function AdminProvidersPage() {
  const result = await adminQuery<{ business_name: string; provider_name: string; status: string; phone: string }>('service_providers', 'business_name,provider_name,status,phone');
  const pending = result.data.filter((provider) => provider.status === 'pending_verification').length;
  return <AdminModule eyebrow="Provider management" title="Providers & approvals" description="Review applications, inspect verification documents, activate providers, and manage provider status." action="Export providers" stats={[{ label: 'Total providers', value: String(result.data.length) }, { label: 'Pending review', value: String(pending), tone: 'text-amber-600' }, { label: 'Active', value: String(result.data.filter((provider) => provider.status === 'active').length), tone: 'text-emerald-600' }, { label: 'Expired', value: String(result.data.filter((provider) => provider.status === 'expired').length) }]} columns={['Provider', 'Contact', 'Status']} rows={result.data.map((provider) => [provider.business_name, `${provider.provider_name} · ${provider.phone}`, provider.status])} dataError={result.error} />;
}