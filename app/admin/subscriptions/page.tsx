import { AdminModule } from '../admin-module';
import { adminQuery } from '../../../lib/admin-data';

export default async function AdminSubscriptionsPage() {
  const result = await adminQuery<{ name: string; duration_days: number; price: number; currency: string; is_active: boolean }>('subscription_plans', 'name,duration_days,price,currency,is_active');
  return <AdminModule eyebrow="Revenue operations" title="Subscriptions & payments" description="Manage configurable plans and verified payment records. Prices alone never count as received revenue." action="Create plan" stats={[{ label: 'Active plans', value: String(result.data.filter((plan) => plan.is_active).length) }, { label: 'Active subscriptions', value: '—' }, { label: 'Expiring soon', value: '—', tone: 'text-amber-600' }, { label: 'Verified revenue', value: '—' }]} columns={['Plan', 'Duration', 'Price', 'Status']} rows={result.data.map((plan) => [plan.name, `${plan.duration_days} days`, `${plan.currency} ${plan.price}`, plan.is_active ? 'Active' : 'Disabled'])} dataError={result.error} />;
}