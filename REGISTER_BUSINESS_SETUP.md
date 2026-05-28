# Register Business Screen - Setup & Implementation

## ✅ Implementation Complete

Created a business registration screen for the mobile app that matches the web app's functionality and replaced the Search tab in the bottom navigation.

## Changes Made

### **1. New Screen Created**
- **File:** `src/screens/RegisterBusiness/RegisterBusinessScreen.tsx`
- **Lines:** 1000+ lines of complete registration form

### **2. Navigation Updated**
- **File:** `src/navigation/MainTabNavigator.tsx`
- Replaced "Search" tab with "Register" (Add Business)
- Icon changed from `Search` to `PlusCircle`
- Label: "Add Business"

### **3. Features Implemented**

#### ✅ **Form Fields (Matching Web App)**

1. **Business Information**
   - Business Name (required)
   - Description
   - Category selector (required)

2. **Images**
   - Logo upload (square aspect ratio)
   - Cover image upload (16:9 aspect ratio)

3. **Location** (required)
   - Get current location button
   - Auto-reverse geocoding
   - Short address field
   - Detailed address field (matching web app)
   - Latitude & Longitude

4. **Contact Information**
   - Owner Name (required)
   - Contact Number (required)
   - Business Email (required)
   - Website Name
   - Website URL
   - Working Hours

5. **Registration Type** (required)
   - **Registered Company:**
     - BR Number validation (PV 1234, WP/1234 format)
   - **Unregistered Business:**
     - NIC Number validation (Old/New format)

#### ✅ **Validation Rules**

**SR Lankan BR Number:**
```
Format: PV 1234, WP/1234, C/1234, etc.
Regex: /^(PV|PB|PC|GA|GB|WP|W|CP|C|SP|S|NP|N|EP|E|NW|NC|UVA|U|SG)(\s|\/)?\d+$/i
```

**Sri Lankan NIC:**
```
Old format: 971234567V (10 chars)
New format: 199712345678 (12 chars)
Regex: /^[5-9][0-9]{8}[vVxX]$/ or /^(19|20)[0-9]{10}$/
```

#### ✅ **Database Integration**

**Insert Query:**
```typescript
await supabase.from('businesses').insert([{
  name: businessName,
  description,
  logo_url,
  image_url,
  email,
  owner_name: ownerName,
  phone: contactNumber,
  category,
  website_name: websiteName,
  website_url: websiteUrl,
  working_hours: workingHours,
  is_registered: registrationType === 'registered',
  registration_number: brNumber || nicNumber,
  owner_id: user.id,
  location: `POINT(${lng} ${lat})`,
  address,
  detailed_address,
  latitude,
  longitude,
  status: 'pending'
}]);
```

#### ✅ **User Experience Features**

1. **Authentication Check**
   - Shows "Login Required" if not logged in
   - Pre-fills owner name and email from profile

2. **Existing Business Check**
   - Shows "Business Already Registered" if user has a business
   - Displays business name and status

3. **Success Screen**
   - Shows success message after submission
   - "Back to Home" button
   - Explains approval process

4. **Image Upload**
   - Uses expo-image-picker
   - Image preview
   - Aspect ratio: 1:1 for logo, 16:9 for cover
   - Quality: 0.8
   - Upload to Supabase storage

5. **Location**
   - GPS location with highest accuracy
   - Reverse geocoding for address
   - Manual address editing

6. **Category Picker**
   - 15 predefined categories
   - Dropdown with search
   - Highlighted selection

## Installation Required

### **1. Install expo-image-picker**

```bash
cd sl-business-app
npx expo install expo-image-picker
```

### **2. Update app.json Permissions**

```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow $(PRODUCT_NAME) to access your photos to upload business images.",
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to take business photos."
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "Allow access to photo library to upload business images",
        "NSCameraUsageDescription": "Allow camera access to take business photos"
      }
    },
    "android": {
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "CAMERA"
      ]
    }
  }
}
```

### **3. Supabase Storage Setup**

Ensure the `business-logos` bucket exists in Supabase:

```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE name = 'business-logos';

-- Create if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true);

-- Set policies
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-logos');

CREATE POLICY "Allow public access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-logos');
```

## Navigation Structure

### **Before:**
```
┌────────────────────────────────────┐
│  [Home]  [Map]  [Search]  [Account]│
└────────────────────────────────────┘
```

### **After:**
```
┌────────────────────────────────────────┐
│  [Home]  [Map]  [Add Business]  [Account]│
└────────────────────────────────────────┘
```

**Tab Icon:** Changed from `Search` (🔍) to `PlusCircle` (➕)

## Comparison: Web vs Mobile

### **Web App** (`sl_business_index/app/register-business/page.tsx`)
- ✅ Next.js page with React
- ✅ Uses AddressAutocomplete component
- ✅ Uses CategorySelector component
- ✅ File upload via HTML input
- ✅ Google Maps integration

### **Mobile App** (`sl-business-app/src/screens/RegisterBusiness`)
- ✅ React Native screen
- ✅ Manual address entry + GPS location
- ✅ Built-in category picker
- ✅ expo-image-picker for uploads
- ✅ Native location services

### **Matching Features:**
| Feature | Web | Mobile |
|---------|-----|--------|
| Business Name | ✅ | ✅ |
| Description | ✅ | ✅ |
| Category | ✅ | ✅ |
| Logo | ✅ | ✅ |
| Cover Image | ✅ | ✅ |
| Location | ✅ | ✅ |
| Owner Name | ✅ | ✅ |
| Contact Number | ✅ | ✅ |
| Email | ✅ | ✅ |
| Website | ✅ | ✅ |
| Working Hours | ✅ | ✅ |
| BR Number | ✅ | ✅ |
| NIC Number | ✅ | ✅ |
| Address | ✅ | ✅ |
| Detailed Address | ✅ | ✅ |
| Validation | ✅ | ✅ |
| Database Insert | ✅ | ✅ |
| Status: pending | ✅ | ✅ |

## Testing Checklist

### ✅ **Authentication**
- [ ] Shows "Login Required" when not logged in
- [ ] Pre-fills owner name from profile
- [ ] Pre-fills email from profile

### ✅ **Existing Business Check**
- [ ] Shows "Already Registered" if user has business
- [ ] Displays business name and status

### ✅ **Form Validation**
- [ ] Business name required
- [ ] Category required
- [ ] Location required
- [ ] Owner name required
- [ ] Contact number required
- [ ] Email required
- [ ] BR number required (registered type)
- [ ] BR number format validation
- [ ] NIC number required (unregistered type)
- [ ] NIC number format validation

### ✅ **Image Upload**
- [ ] Logo picker opens
- [ ] Logo preview shows
- [ ] Cover image picker opens
- [ ] Cover image preview shows
- [ ] Images upload to Supabase storage
- [ ] Public URLs generated

### ✅ **Location**
- [ ] "Get Current Location" button works
- [ ] GPS accuracy is high
- [ ] Reverse geocoding populates address
- [ ] Short address editable
- [ ] Detailed address editable
- [ ] Latitude/longitude captured

### ✅ **Category Picker**
- [ ] Opens on tap
- [ ] Shows all 15 categories
- [ ] Highlights selected
- [ ] Closes after selection

### ✅ **Registration Type**
- [ ] Registered/Unregistered toggle works
- [ ] Shows BR field for registered
- [ ] Shows NIC field for unregistered
- [ ] Validation applies correctly

### ✅ **Submission**
- [ ] Loading state shows
- [ ] Success screen appears
- [ ] Data saved to database
- [ ] Status is "pending"
- [ ] Images uploaded
- [ ] Location saved as POINT geometry

### ✅ **UI/UX**
- [ ] Form scrolls smoothly
- [ ] Keyboard doesn't hide inputs
- [ ] All fields accessible
- [ ] Error messages clear
- [ ] Success message clear
- [ ] Theme colors applied
- [ ] Dark mode works

## Screen States

### **1. Not Logged In**
```
┌─────────────────────────┐
│      [⚠️ Icon]          │
│   Login Required        │
│   Please login to       │
│   register business     │
│   [Go to Account]       │
└─────────────────────────┘
```

### **2. Already Has Business**
```
┌─────────────────────────┐
│      [✅ Icon]          │
│   Business Already      │
│   Registered            │
│   Pizza Hut Colombo     │
│   Status: pending       │
└─────────────────────────┘
```

### **3. Registration Form**
```
┌─────────────────────────┐
│ Register Your Business  │
│ Fill in the details...  │
├─────────────────────────┤
│ Business Information    │
│ [Business Name*]        │
│ [Description]           │
│ [Select Category*]      │
│                         │
│ Images                  │
│ [Logo]  [Cover]         │
│                         │
│ Location*               │
│ [Get Current Location]  │
│ [Address]               │
│ [Detailed Address]      │
│                         │
│ Contact Information     │
│ [Owner Name*]           │
│ [Contact Number*]       │
│ [Email*]                │
│ [Website Name]          │
│ [Website URL]           │
│ [Working Hours]         │
│                         │
│ Registration Type*      │
│ [Registered] [Unregistered]│
│ [BR/NIC Number*]        │
│                         │
│ [Submit for Review]     │
└─────────────────────────┘
```

### **4. Success Screen**
```
┌─────────────────────────┐
│      [✅ Icon]          │
│   Submitted             │
│   Successfully!         │
│   Your business has     │
│   been submitted for    │
│   review. We'll notify  │
│   you once approved.    │
│   [Back to Home]        │
└─────────────────────────┘
```

## Categories Available

1. Food & Dining
2. Shopping & Retail
3. Health & Wellness
4. Professional Services
5. Home & Garden
6. Automotive
7. Entertainment
8. Education
9. Technology
10. Beauty & Personal Care
11. Travel & Tourism
12. Real Estate
13. Finance & Insurance
14. Sports & Fitness
15. Others

## Database Schema

### **businesses table:**
```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  image_url TEXT,
  email TEXT,
  owner_name TEXT,
  phone TEXT,
  category TEXT,
  website_name TEXT,
  website_url TEXT,
  working_hours TEXT,
  is_registered BOOLEAN DEFAULT true,
  registration_number TEXT,
  location GEOMETRY(POINT, 4326),
  address TEXT,
  detailed_address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### **Status Values:**
- `pending` - Awaiting approval
- `approved` - Active listing
- `rejected` - Not approved
- `suspended` - Temporarily disabled

## Future Enhancements

1. **Multiple Images**
   - Add gallery upload (up to 5 images)

2. **Map Preview**
   - Show selected location on map

3. **Category Search**
   - Add search in category picker

4. **Draft Save**
   - Auto-save form as draft
   - Resume later

5. **Social Media**
   - Add Facebook, Instagram links

6. **Business Hours Picker**
   - Visual time picker
   - Different hours per day

7. **Facilities/Amenities**
   - Parking, WiFi, Cards accepted, etc.

8. **Photo Guidelines**
   - Show example images
   - Size/format requirements

9. **Progress Indicator**
   - Show completion percentage
   - Step-by-step wizard

10. **Email Verification**
    - Verify business email
    - Send confirmation code

## Summary

✅ **Complete business registration form** - Matches web app functionality  
✅ **Replaced Search tab** - Now "Add Business" with ➕ icon  
✅ **All validation rules** - BR number, NIC, email, phone  
✅ **Image uploads** - Logo + cover image to Supabase storage  
✅ **GPS location** - Highest accuracy with reverse geocoding  
✅ **Detailed address** - Matching web app structure  
✅ **User-friendly** - Auth check, existing business check, success screen  
✅ **Database integration** - Saves to businesses table with status: pending  

Users can now register their business directly from the mobile app! 🎯
