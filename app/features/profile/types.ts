import type { LucideIcon } from 'lucide-react-native';
import type { User } from '@/app/_userbase/UserContext';

export type ProfileMembershipTier = 'free' | 'premium';

export interface ProfileStats {
  savedPropertiesCount: number;
}

export interface ProfileMembershipInfo {
  tier: ProfileMembershipTier;
  upgradeAvailable: boolean;
}

export type ProfileUser = User & {
  name?: string;
  profile_picture?: string;
  is_premium?: boolean;
};

export interface ProfileMenuItem {
  icon: LucideIcon;
  label: string;
  route?: string;
  countKey?: keyof ProfileStats;
}

export interface ProfileScreenData {
  user: ProfileUser;
  stats: ProfileStats;
  membership: ProfileMembershipInfo;
  menuItems: ProfileMenuItem[];
}

