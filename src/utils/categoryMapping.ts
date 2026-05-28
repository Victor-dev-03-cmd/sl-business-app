/**
 * Maps existing database categories to the 8 main category groups
 * This creates a hierarchical structure from flat categories
 */

export const CATEGORY_MAPPING: Record<string, string[]> = {
  'Manpower Services': [
    'Mason',
    'Painter',
    'Plumber',
    'Carpenter',
    'Welder',
    'Electrician',
    'Cleaner',
    'Laborer / Helper'
  ],
  'Care & Lifestyle': [
    'Health & Medical',
    'Baby Care',
    'Pet Care',
    'Beauty & Health',
    'Religious Organization'
  ],
  'Professional & Finance': [
    'Banking & Finance',
    'Insurance Services',
    'Financial Services',
    'Professional Services',
    'Legal, Government & Services',
    'Media & Advertising',
    'Government & Services'
  ],
  'Construction & Industrial': [
    'Construction Services',
    'Hardware Equipment',
    'Industry & Manufacturing',
    'Interior Design Services',
    'Office Equipment & Services'
  ],
  'Technical & Electronics': [
    'Electronic Pheripherals',
    'Electrical Equipment and Services',
    'Repairing & Services',
    'Media & Communications'
  ],
  'Events, Food & Leisure': [
    'Event Planner',
    'Weddings Services',
    'Food & Dining',
    'Arts, Entertainment & Leisure',
    'Hotels & Restaurants'
  ],
  'Travel & Transport': [
    'Travel & Tourism',
    'Travel & Transportation',
    'Vehicles & Automative',
    'Telecommunication Services'
  ],
  'Retail & Others': [
    'Shopping & Retail',
    'Agriculture Products',
    'Sports & Recreation',
    'Home Appliances & Services',
    'Educational institutes & Services'
  ]
};

/**
 * Groups database categories by the 8 main groups
 * @param categories - All categories from database
 * @returns Mapping of main group IDs to their subcategories
 */
export function groupCategoriesByMainGroups(
  categories: any[]
): Record<string, any[]> {
  const groupMapping: Record<string, any[]> = {};

  // First, try to find categories with parent_id (hierarchical structure)
  const mainCategories = categories.filter(c => !c.parent_id);
  const hasHierarchy = mainCategories.length > 0 && mainCategories.length < categories.length;

  if (hasHierarchy) {
    // Use database hierarchy
    mainCategories.forEach(mainCat => {
      const subcats = categories.filter(c => c.parent_id === mainCat.id);
      if (subcats.length > 0) {
        groupMapping[mainCat.id] = subcats;
      }
    });
  } else {
    // Use manual mapping for flat structure
    Object.entries(CATEGORY_MAPPING).forEach(([groupName, subcategoryNames]) => {
      const matchedCategories = categories.filter(cat =>
        subcategoryNames.some(subName =>
          cat.name.toLowerCase().includes(subName.toLowerCase()) ||
          subName.toLowerCase().includes(cat.name.toLowerCase())
        )
      );
      groupMapping[groupName] = matchedCategories;
    });
  }

  return groupMapping;
}

/**
 * Gets the main group name for a given category
 * @param categoryName - Name of the category
 * @returns The main group name or null
 */
export function getMainGroupForCategory(categoryName: string): string | null {
  for (const [groupName, subcategories] of Object.entries(CATEGORY_MAPPING)) {
    if (subcategories.some(sub =>
      categoryName.toLowerCase().includes(sub.toLowerCase()) ||
      sub.toLowerCase().includes(categoryName.toLowerCase())
    )) {
      return groupName;
    }
  }
  return null;
}
