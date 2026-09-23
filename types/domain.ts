export type ProviderStatus =
  | 'pending_verification'
  | 'under_review'
  | 'approved'
  | 'active'
  | 'suspended'
  | 'rejected'
  | 'expired';

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type ServiceCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
};

export type ProviderCard = {
  id: string;
  business_name: string;
  business_slug: string;
  provider_name: string;
  description: string | null;
  initial_price: number | null;
  currency: string;
  status: ProviderStatus;
  profile_image_url: string | null;
  average_rating?: number;
  review_count?: number;
  distance_km?: number;
};
