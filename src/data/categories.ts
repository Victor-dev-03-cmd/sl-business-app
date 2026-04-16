import { 
  Users, 
  HeartPulse, 
  Briefcase, 
  Construction, 
  Cpu, 
  PartyPopper, 
  Plane, 
  ShoppingBag,
  LucideIcon 
} from 'lucide-react-native';

export interface CategoryGroup {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  subcategories: string[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'manpower',
    name: 'Manpower Services',
    icon: Users,
    color: '#3b82f6',
    subcategories: ['Mason', 'Painter', 'Plumber', 'Carpenter', 'Welder', 'Electrician', 'Cleaner', 'Laborer / Helper']
  },
  {
    id: 'care-lifestyle',
    name: 'Care & Lifestyle',
    icon: HeartPulse,
    color: '#ef4444',
    subcategories: ['Health & Medical', 'Baby Care', 'Pet Care', 'Beauty & Health', 'Religious Organization']
  },
  {
    id: 'professional-finance',
    name: 'Professional & Finance',
    icon: Briefcase,
    color: '#10b981',
    subcategories: ['Banking & Finance', 'Insurance Services', 'Financial Services', 'Legal, Government & Services', 'Media & Advertising', 'Professional Services']
  },
  {
    id: 'construction-industrial',
    name: 'Construction & Industrial',
    icon: Construction,
    color: '#f59e0b',
    subcategories: ['Construction Services', 'Hardware Equipment', 'Industry & Manufacturing', 'Interior Design Services', 'Office Equipment & Services']
  },
  {
    id: 'technical-electronics',
    name: 'Technical & Electronics',
    icon: Cpu,
    color: '#6366f1',
    subcategories: ['Electronic Peripherals', 'Electrical Equipment & Services', 'Repairing & Services', 'Media & Communications']
  },
  {
    id: 'events-food-leisure',
    name: 'Events Food & Leisure',
    icon: PartyPopper,
    color: '#ec4899',
    subcategories: ['Event Planner', 'Weddings Services', 'Food & Dining', 'Arts, Entertainment & Leisure', 'Hotels & Restaurants']
  },
  {
    id: 'travel-transport',
    name: 'Travel & Transport',
    icon: Plane,
    color: '#06b6d4',
    subcategories: ['Travel & Tourism', 'Travel & Transportation', 'Vehicles & Automotive', 'Telecommunication Services']
  },
  {
    id: 'retail-others',
    name: 'Retail & Others',
    icon: ShoppingBag,
    color: '#8b5cf6',
    subcategories: ['Shopping & Retail', 'Agriculture Products', 'Sports & Recreation', 'Home Appliances & Services', 'Educational Institutes & Services']
  }
];
