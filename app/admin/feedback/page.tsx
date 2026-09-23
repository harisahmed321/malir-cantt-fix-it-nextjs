import { AdminModule } from '../admin-module';
import { adminQuery } from '../../../lib/admin-data';

export default async function AdminFeedbackPage() {
  const result = await adminQuery<{ overall_rating: number; comment: string | null; created_at: string; is_moderated: boolean }>('feedback', 'overall_rating,comment,created_at,is_moderated');
  const average = result.data.length ? (result.data.reduce((sum, feedback) => sum + feedback.overall_rating, 0) / result.data.length).toFixed(1) : '—';
  return <AdminModule eyebrow="Quality & trust" title="Feedback moderation" description="Review ratings and comments, investigate suspicious submissions, and keep moderation auditable." stats={[{ label: 'Submissions', value: String(result.data.length) }, { label: 'Average rating', value: average }, { label: 'With comments', value: String(result.data.filter((feedback) => feedback.comment).length) }, { label: 'Needs review', value: String(result.data.filter((feedback) => !feedback.is_moderated).length), tone: 'text-amber-600' }]} columns={['Rating', 'Comment', 'Submitted', 'Moderation']} rows={result.data.map((feedback) => [`${feedback.overall_rating}/5`, feedback.comment || 'No comment', new Date(feedback.created_at).toLocaleDateString(), feedback.is_moderated ? 'Moderated' : 'Needs review'])} dataError={result.error} />;
}