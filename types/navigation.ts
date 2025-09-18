export interface NavigationAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'primary' | 'secondary' | 'ghost';
  mobile?: boolean; // Show on mobile
  desktop?: boolean; // Show on desktop
}

export interface PageActions {
  primary?: NavigationAction; // Main floating action button on mobile
  secondary?: NavigationAction[]; // Additional actions
}

export interface NavigationItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  active?: boolean;
}