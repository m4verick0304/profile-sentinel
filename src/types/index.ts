export type AppRole = 'admin' | 'user';
export type RiskLabel = 'real' | 'suspicious' | 'fake';

export interface TopFactor {
  factor: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface UsernameFlags {
  numbers_heavy?: boolean;
  no_profile_pic?: boolean;
  random_characters?: boolean;
  very_short?: boolean;
}

export interface AnalysisResult {
  id: string;
  user_id: string;
  username: string;
  account_age: number;
  posts_count: number;
  followers_count: number;
  following_count: number;
  bio_length: number;
  username_flags: UsernameFlags;
  risk_score: number;
  label: RiskLabel;
  top_factors: TopFactor[];
  created_at: string;
}
