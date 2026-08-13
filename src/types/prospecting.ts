export const PROSPECT_STATUSES = [
  "New",
  "Called",
  "No Answer",
  "Left Voicemail",
  "Demo Offered",
  "Demo Sent",
  "Interested",
  "Follow Up",
  "Booked Call",
  "Won",
  "Lost",
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export interface ProspectSearchResult {
  placeId: string;
  businessName: string;
  category: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  mapsUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  leadScore: number;
}

export interface ProspectingFolder {
  id: string;
  name: string;
  search_query: string | null;
  created_at: string;
  updated_at: string;
  lead_count: number;
}

export interface ProspectingLead {
  id: string;
  google_place_id: string;
  business_name: string;
  category: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  google_maps_url: string | null;
  rating: number | null;
  review_count: number | null;
  lead_score: number;
  status: ProspectStatus;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  folder_id: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
}
