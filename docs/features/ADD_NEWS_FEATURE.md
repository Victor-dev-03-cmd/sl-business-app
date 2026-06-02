# Add News Feature for Verified Vendors

## Overview

Implemented "Add News" functionality in the mobile app that allows verified business owners to post news updates (hiring/looking). Only verified businesses can post, and all posts require admin approval before being published.

## Implementation Date
June 2, 2026

## Features

### ✅ Verified Vendor Check
- Automatically detects if user owns verified businesses
- Only shows "Add News" button for verified vendors
- Real-time verification status check

### ✅ Floating Action Button
- Modern floating button design
- Appears in bottom-right corner
- Only visible to verified vendors
- Smooth shadow and elevation

### ✅ Full-Featured Modal
- **Business Selection** - Choose which verified business to post as
- **Post Type** - "Hiring" or "Looking" toggle
- **Title** - 10-100 characters (required)
- **Content** - 20-500 characters (required)
- **Contact Phone** - Phone number (required)
- **Category** - Select from 8 main categories
- **District** - Select from all Sri Lankan districts
- **Validation** - Real-time character counts and validation

### ✅ Admin Approval Required
- All posts submitted for admin review
- Posts not visible until approved
- Success message informs user about pending approval
- Matches web version logic

## User Flow

### For Regular Users
```
Open News Screen
  ↓
No "Add News" button visible
  ↓
Can only view and contact posts
```

### For Non-Verified Vendors
```
Open News Screen
  ↓
No "Add News" button visible
  ↓
(Must get business verified first)
```

### For Verified Vendors
```
Open News Screen
  ↓
See floating "+" button (bottom-right)
  ↓
Tap button
  ↓
Modal opens with form
  ↓
Select business (from verified businesses only)
  ↓
Fill in details:
  - Post Type (Hiring/Looking)
  - Title
  - Content
  - Contact Phone
  - Category
  - District
  ↓
Tap "Submit News Post"
  ↓
Submitted for admin approval
  ↓
Success message shown
  ↓
Modal closes
```

## Verification Logic

### Database Check
```typescript
const { data } = await supabase
  .from('businesses')
  .select('id')
  .eq('owner_id', user.id)
  .eq('is_verified', true)      // ✅ Must be verified
  .eq('status', 'approved')      // ✅ Must be approved
  .limit(1);

const hasVerifiedBusiness = !!(data && data.length > 0);
```

### Button Visibility
```typescript
{hasVerifiedBusiness && (
  <TouchableOpacity onPress={() => setShowAddModal(true)}>
    <Plus /> {/* Add News Button */}
  </TouchableOpacity>
)}
```

## Modal Features

### Business Selection
- Automatically loads all verified businesses owned by user
- Horizontal scrollable chip selector
- Visual feedback for selected business
- Defaults to first business

### Post Type Toggle
- Two options: "Hiring" or "Looking"
- Toggle button design
- Active state highlighted

### Form Fields

| Field | Type | Required | Min/Max | Description |
|-------|------|----------|---------|-------------|
| Business | Select | Yes | - | Which business to post as |
| Post Type | Toggle | Yes | - | Hiring or Looking |
| Title | Text | Yes | 10-100 | Post title |
| Content | Multiline | Yes | 20-500 | Post description |
| Contact Phone | Phone | Yes | - | Contact number |
| Category | Select | Yes | - | Business category |
| District | Select | Yes | - | Sri Lankan district |

### Validation Rules
```typescript
// Title
title.length >= 10 && title.length <= 100

// Content
content.length >= 20 && content.length <= 500

// Phone
contactPhone.trim() !== ''

// All required fields
selectedBusinessId && title && content && contactPhone
```

## Files Created

### 1. `src/components/AddNewsModal.tsx` (500 lines)
Complete modal component with:
- Business verification check
- Full form with all fields
- Validation logic
- Submission handling
- Success/error states
- "Verification Required" screen for non-verified users

## Files Modified

### 1. `src/screens/News/BusinessNewsScreen.tsx`
- Added `Plus` icon import
- Added `AddNewsModal` import
- Added state: `showAddModal`, `hasVerifiedBusiness`
- Added `checkVerifiedBusiness()` function
- Added floating action button (conditional rendering)
- Added `<AddNewsModal>` component

## Component Structure

```
BusinessNewsScreen
├── Header
├── Filters
├── News Posts List
├── Floating Add Button (✅ Only if verified)
└── AddNewsModal
    ├── Header
    ├── Business Selection
    ├── Post Type Toggle
    ├── Title Input
    ├── Content Input
    ├── Contact Phone Input
    ├── Category Chips
    ├── District Chips
    ├── Info Box
    └── Submit Button
```

## Database Interaction

### Check Verified Business
```sql
SELECT id FROM businesses
WHERE owner_id = $user_id
  AND is_verified = true
  AND status = 'approved'
LIMIT 1;
```

### Fetch User's Verified Businesses
```sql
SELECT id, name, is_verified FROM businesses
WHERE owner_id = $user_id
  AND is_verified = true
  AND status = 'approved';
```

### Submit News Post
```sql
INSERT INTO business_news (
  business_id,
  owner_id,
  title,
  content,
  contact_phone,
  category,
  district,
  post_type,
  images
) VALUES (...);
```

## Admin Approval Workflow

```
User submits post
  ↓
Saved to business_news table
  ↓
Post status: Pending (default)
  ↓
Admin reviews in admin panel
  ↓
Admin approves or rejects
  ↓
If approved: Post visible to all users
If rejected: Not visible
```

## UI/UX Details

### Floating Button
```typescript
Position: bottom-right (24px from edges)
Size: 64x64 pixels
Color: Brand blue
Icon: Plus (28px, white)
Shadow: 8px radius, 0.3 opacity
Elevation: 8 (Android)
```

### Modal
```typescript
Presentation: Page sheet (iOS) / Full screen (Android)
Keyboard: Avoid with KeyboardAvoidingView
Background: Theme aware (light/dark)
Animation: Slide from bottom
```

### Form Elements
```typescript
Inputs: Rounded-xl (16px radius)
Chips: Horizontal scroll
Toggle: Full-width with 2 options
Colors: Theme aware
Feedback: Character counts, validation messages
```

## Error Handling

### No Verified Business
```typescript
// Shows in modal
<View>
  <AlertCircle />
  <Text>Verification Required</Text>
  <Text>Only verified businesses can post news</Text>
  <Button onPress={onClose}>Close</Button>
</View>
```

### Validation Errors
```typescript
if (title.length < 10) {
  Alert.alert('Error', 'Title must be at least 10 characters');
  return;
}

if (content.length < 20) {
  Alert.alert('Error', 'Content must be at least 20 characters');
  return;
}
```

### Submission Errors
```typescript
try {
  await supabase.from('business_news').insert(...);
  Alert.alert('Success', 'Post submitted for approval');
} catch (error) {
  Alert.alert('Error', 'Failed to submit news post');
}
```

## Testing

### Test Cases

#### Test 1: Regular User
```
1. Login as regular user (no businesses)
2. Go to News screen
3. ✓ No floating "+" button should appear
```

#### Test 2: Non-Verified Vendor
```
1. Login as vendor with unverified business
2. Go to News screen
3. ✓ No floating "+" button should appear
```

#### Test 3: Verified Vendor
```
1. Login as vendor with verified business
2. Go to News screen
3. ✓ Floating "+" button appears bottom-right
```

#### Test 4: Open Modal
```
1. As verified vendor, tap "+" button
2. ✓ Modal slides up
3. ✓ Shows list of verified businesses
4. ✓ All form fields visible
```

#### Test 5: Submit Post
```
1. Fill all required fields
2. Tap "Submit News Post"
3. ✓ Loading indicator shows
4. ✓ Success message appears
5. ✓ Modal closes
6. ✓ News list refreshes
```

#### Test 6: Validation
```
Test each validation:
- Empty title → Error
- Title < 10 chars → Error
- Empty content → Error
- Content < 20 chars → Error
- Empty phone → Error
- All valid → Success
```

### Manual Testing

```bash
# Start app
npx expo start

# Test as verified vendor:
1. Login with vendor account
2. Ensure business is verified in database
3. Navigate to News screen
4. Check floating button appears
5. Tap button and test form
6. Submit post
7. Check admin panel for pending post

# Test as regular user:
1. Login with regular account (no businesses)
2. Navigate to News screen
3. Confirm no floating button
```

## Matching Web Version

### Web Implementation
Location: `sl_business_index/app/business-news/page.tsx`

### Matching Features
✅ Verified business check: `.eq('is_verified', true)`  
✅ Admin approval required: Posts pending by default  
✅ Same form fields: Business, type, title, content, phone, category, district  
✅ Same validation: Min/max lengths  
✅ Same categories: 8 main category groups  
✅ Same districts: 25 Sri Lankan districts  
✅ Same post types: "Hiring" and "Looking"  

### Differences (Mobile Adaptations)
- **Modal instead of page:** Mobile uses modal, web uses full page
- **Floating button:** Mobile has FAB, web has button in sidebar
- **Horizontal scrolling:** Mobile uses chips for categories/districts
- **No image upload:** Mobile version simplified (Phase 1)

## Configuration

### Categories
```typescript
const MAIN_CATEGORY_GROUPS = [
  'Manpower Services',
  'Care & Lifestyle',
  'Professional & Finance',
  'Construction & Industrial',
  'Technical & Electronics',
  'Events, Food & Leisure',
  'Travel & Transport',
  'Retail & Others',
];
```

### Districts
```typescript
const SRI_LANKAN_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', ...
  // All 25 districts
];
```

### Field Limits
```typescript
const LIMITS = {
  title: { min: 10, max: 100 },
  content: { min: 20, max: 500 },
};
```

## Future Enhancements

### Phase 2 Features
- [ ] Image upload (multiple images)
- [ ] Draft saving
- [ ] Edit existing posts
- [ ] Delete posts
- [ ] View post analytics
- [ ] Push notifications on approval

### Phase 3 Features
- [ ] Rich text editor
- [ ] Location picker (map)
- [ ] Scheduled posts
- [ ] Post templates
- [ ] Boost/promote posts

## Troubleshooting

### Button Not Showing
**Issue:** Floating button not visible

**Solutions:**
1. Check user is logged in
2. Verify business exists in database
3. Confirm `is_verified = true`
4. Confirm `status = 'approved'`
5. Check console for errors

### Modal Not Opening
**Issue:** Tapping button does nothing

**Solutions:**
1. Check `showAddModal` state updates
2. Verify `AddNewsModal` component imported
3. Check for JS errors in console

### Submission Fails
**Issue:** Post not submitting

**Solutions:**
1. Check all required fields filled
2. Verify validation passes
3. Check Supabase connection
4. Confirm user authenticated
5. Check RLS policies allow insert

### No Businesses in Modal
**Issue:** "Verification Required" shown but user has verified business

**Solutions:**
1. Check database: `is_verified = true`
2. Check database: `status = 'approved'`
3. Verify `owner_id` matches user ID
4. Force refresh by logging out/in

## Database Requirements

### business_news Table
```sql
CREATE TABLE business_news (
  id uuid PRIMARY KEY,
  business_id uuid REFERENCES businesses(id),
  owner_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  content text NOT NULL,
  contact_phone text NOT NULL,
  category text NOT NULL,
  district text NOT NULL,
  post_type text CHECK (post_type IN ('hiring', 'looking')),
  images text[],
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending'
);
```

### Required Business Fields
```sql
businesses.is_verified = true
businesses.status = 'approved'
```

## Summary

✅ **Files Created:** 1 component  
✅ **Files Modified:** 1 screen  
✅ **Verification:** Automatic check  
✅ **Admin Approval:** Required  
✅ **Web Parity:** Matching logic  
✅ **Theme Support:** Light/dark modes  
✅ **Validation:** Comprehensive  
✅ **UX:** Smooth and intuitive  

Feature complete and ready for testing!

---

**Implementation Status:** ✅ Complete  
**Testing Status:** ⚠️ Pending manual testing  
**Documentation:** ✅ Complete
