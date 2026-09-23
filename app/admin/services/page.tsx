import { AdminModule } from '../admin-module';
import { adminQuery } from '../../../lib/admin-data';

export default async function AdminServicesPage() {
  const [categories, providerServices] = await Promise.all([
    adminQuery<{ name: string; slug: string; is_active: boolean }>('service_categories', 'name,slug,is_active'),
    adminQuery<{ service_name: string | null; service_description: string | null; starting_price: number | null; provider_id: string; category_id: string; service_categories: { name: string } | null; service_providers: { business_name: string; status: string } | null }>('provider_services', 'service_name,service_description,starting_price,provider_id,category_id,service_categories(name),service_providers(business_name,status)'),
  ]);
  const active = categories.data.filter((category) => category.is_active).length;
  const rows = providerServices.data.map((service) => [
    service.service_name || 'Unnamed service',
    service.service_categories?.name || 'Uncategorized',
    service.service_providers?.business_name || 'Unknown provider',
    service.service_description || '—',
    service.starting_price == null ? '—' : `PKR ${service.starting_price}`,
    service.service_providers?.status || 'Unknown',
  ]);
  const dataError = categories.error || providerServices.error;
  return <AdminModule eyebrow="Catalog management" title="Services & categories" description="Configure categories and review every service offered by each provider, including multiple services in the same category." action="Add category" stats={[{ label: 'Categories', value: String(categories.data.length) }, { label: 'Active', value: String(active), tone: 'text-emerald-600' }, { label: 'Provider services', value: String(providerServices.data.length) }, { label: 'Disabled', value: String(categories.data.length - active) }]} columns={['Service', 'Category', 'Provider', 'Description', 'Starting price', 'Provider status']} rows={rows} dataError={dataError} />;
}