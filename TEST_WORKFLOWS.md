# CharDB Test Workflows

## Overview

This document outlines comprehensive test workflows for the CharDB application to verify system functionality after major backend changes. These workflows cover all user-facing features while maintaining flexibility for future changes.

**Test Environment:** http://localhost:3000
**Test Credentials:** test@example.com / password123

## Core Test Workflows

### 1. Authentication & Account Management

#### 1.1 User Registration

1. Navigate to the signup page
2. Fill in username, email, display name (optional), and password
3. Confirm password matches
4. Submit form
5. **Expected:** Account created successfully, redirected to dashboard

#### 1.2 User Login

1. Navigate to login page
2. Enter email and password
3. Submit form
4. **Expected:** Successfully logged in, redirected to dashboard with welcome message

#### 1.3 User Logout

1. Click the logout button from any authenticated page
2. **Expected:** Logged out successfully, redirected to public homepage

#### 1.4 Profile Management

1. Navigate to profile edit page from dashboard
2. Update display name, bio, and other profile fields
3. Save changes
4. **Expected:** Profile updated successfully, changes reflected on user profile page

### 2. Character Management Workflows

#### 2.1 Create Character - Basic

1. From dashboard, click "Create Character"
2. Fill in character name (required)
3. Add optional fields: age, gender
4. Set visibility to "Public"
5. Submit form
6. **Expected:** Character created successfully, redirected to character page

#### 2.2 Create Character - Advanced

1. Create character with full details:
   - Name, age, gender
   - Description, personality, backstory
   - Add multiple tags
   - Set as "Available for sale" with price
   - Mark as "Open to trades"
   - Set visibility to "Unlisted"
2. Submit form
3. **Expected:** Character created with all metadata, accessible via direct link only

#### 2.3 Edit Existing Character

1. Navigate to "My Characters" from dashboard
2. Select a character to edit
3. Modify character details (name, description, etc.)
4. Update tags and settings
5. Save changes
6. **Expected:** Character updated successfully, changes reflected on character page

#### 2.4 Browse Characters

1. Navigate to Characters page
2. Use search functionality to find characters by name
3. Filter by species and visibility
4. Click "Random character" button
5. **Expected:** Search returns relevant results, filters work correctly, random character displays

#### 2.5 Character Visibility Testing

1. Create characters with different visibility settings:
   - Public: Should appear in browse/search
   - Unlisted: Should be accessible via direct link only
   - Private: Should only be visible to creator
2. Test access from different user accounts
3. **Expected:** Visibility controls work as specified

### 3. Media Upload & Management Workflows

#### 3.1 Basic Image Upload

1. Navigate to Upload page, select "Upload Image"
2. Upload a test image file (PNG, JPG, or GIF)
3. Add caption and alt text
4. Keep default privacy settings
5. Submit upload
6. **Expected:** Image uploaded successfully, accessible via media library

#### 3.2 Advanced Image Upload

1. Upload image with comprehensive metadata:
   - Associate with an existing character
   - Set custom privacy settings (authorized vs public viewers)
   - Enable NSFW flags as needed
   - Add artist credit information
   - Assign to a gallery (if available)
2. Submit upload
3. **Expected:** Image uploaded with all metadata, privacy settings enforced correctly

#### 3.3 Create Text Content

1. Navigate to Upload page, select "Create Text Content"
2. Write text content with title and body
3. Associate with character if desired
4. Set visibility and privacy options
5. Submit
6. **Expected:** Text content created and accessible

#### 3.4 Character Media Association & Main Image Testing

1. Upload image and associate with existing character:
   - Select character from dropdown during upload
   - Add caption and alt text
   - Submit upload
2. Navigate to character detail page
3. Verify media appears in character's gallery
4. Verify media count updated (e.g., "0 media" → "1 media")
5. Click "Set as Main" button on uploaded media
6. Verify main image displays at top of character page
7. Refresh page (F5) to test persistence
8. Navigate to Characters listing page
9. **Expected:** Character now shows main image instead of "No main image", media count reflects uploaded content

#### 3.5 Media Privacy Controls Testing

1. Upload images with different privacy settings:
   - Full size for public/authorized viewers
   - Watermarked versions
   - No access restrictions
2. Test access from different user accounts
3. **Expected:** Privacy controls enforced correctly, watermarks applied when specified

### 4. Gallery & Organization Workflows

#### 4.1 Create Gallery

1. Navigate to "Create Gallery" from dashboard
2. Fill in gallery name and description
3. Set gallery visibility and privacy settings
4. Submit form
5. **Expected:** Gallery created successfully

#### 4.2 Add Media to Gallery

1. Upload images and assign to existing gallery during upload
2. Alternatively, edit existing media to add to gallery
3. **Expected:** Media properly organized in gallery, accessible via gallery page

#### 4.3 Gallery Management

1. Navigate to "My Galleries"
2. Edit gallery details and settings
3. Reorder or remove media from gallery
4. **Expected:** Gallery changes saved successfully

### 5. Social Features & Discovery

#### 5.1 Like Content

1. Browse characters, galleries, and media
2. Like various content types
3. Navigate to liked content pages from dashboard
4. **Expected:** Likes recorded correctly, liked content appears in personal collections

#### 5.2 Follow Users

1. Navigate to user profiles
2. Follow/unfollow other users
3. Check followers/following lists
4. **Expected:** Follow relationships created correctly

#### 5.3 Activity Feed

1. Navigate to feed from dashboard
2. Verify activity from followed users appears
3. **Expected:** Feed shows relevant activity and updates

#### 5.4 User Profile Viewing

1. Navigate to other user profiles
2. View their public characters, galleries, and media
3. **Expected:** Public content displays correctly, private content hidden

### 6. Search & Discovery Workflows

#### 6.1 Character Search

1. Use search bar on characters page
2. Test searching by character name and description
3. Apply species filters
4. **Expected:** Search returns relevant results, filters work correctly

#### 6.2 Tag-based Discovery

1. Create characters and media with various tags
2. Test tag search functionality
3. Browse content by tags
4. **Expected:** Tag system enables content discovery

#### 6.3 Browse Public Content

1. Navigate through public characters, galleries, and media
2. Test pagination and sorting options
3. **Expected:** Public content browseable by all users

### 7. Advanced Feature Testing

#### 7.1 Character Trading/Selling

1. Create character marked as sellable with price
2. Create character marked as tradeable
3. Verify these options display correctly on character pages
4. **Expected:** Trading/selling status visible to other users

#### 7.2 NSFW Content Handling

1. Upload media with NSFW flags enabled
2. Test different NSFW categories (nudity, gore, sensitive content)
3. Verify content filtering works correctly
4. **Expected:** NSFW content properly flagged and filtered

#### 7.3 Artist Credit System

1. Upload media with artist credits (both on-site and off-site)
2. Verify credits display correctly
3. Test multiple artist credits per piece
4. **Expected:** Artist attribution displayed prominently

### 8. Data Integrity & Error Handling

#### 8.1 Form Validation

1. Test all forms with invalid data:
   - Empty required fields
   - Invalid email formats
   - Mismatched passwords
   - Overly long text inputs
2. **Expected:** Appropriate error messages displayed, invalid data rejected

#### 8.2 File Upload Limits

1. Test uploading files exceeding size limits
2. Test uploading unsupported file types
3. **Expected:** Appropriate error messages, uploads rejected gracefully

#### 8.3 Permission Testing

1. Attempt to edit other users' content
2. Try accessing private content without permission
3. **Expected:** Permission errors handled gracefully, unauthorized access blocked

## Regression Testing Priority

### High Priority (Core Functionality)

- Authentication flows (login/logout)
- Character creation and editing
- Basic media upload
- Character media association and main image setting
- User dashboard functionality
- NSFW filtering

### Medium Priority (Extended Features)

- Advanced media settings
- Gallery management
- Social features (likes, follows)
- Search and discovery
- Advanced privacy controls
- Artist credit system
- Character trading features

## Notes for Test Execution

1. **Database State:** These tests assume a clean or well-known database state. Some workflows may need existing test data.

2. **Browser Compatibility:** Test primarily in a modern browser (Chrome/Firefox). Cross-browser testing can be secondary.

3. **Performance:** Note any significant performance issues, especially with media uploads and large content listings.

4. **Page Refresh Testing:** Always test page refresh stability (F5) after creating/editing content to verify data persistence and prevent GraphQL serialization issues.

5. **Console Monitoring:** Keep browser console open during testing. Look for errors and warnings.

6. **Field Rendering Validation:** After any backend schema changes, verify ALL fields render correctly on character detail pages, especially:
   - Species/speciesVariant relationships
   - JSON fields (customFields, traitValues)
   - Computed fields (likesCount, media counts)
   - Date fields and formatting

## Test Data Management

### Required Test Data

- Test user account (test@example.com / password123)
- Sample images for upload testing (various formats and sizes)
- Test character data with various field combinations
- Sample text content for testing

### Data Cleanup

After testing, consider cleaning up test data to avoid database bloat, or maintain dedicated test datasets for consistent testing.

## Common Issues & Troubleshooting

### Type Safety Issues

**Problem:** `Promise<any>` return types masking errors
**Solution:** Use specific entity types like `Promise<CharacterEntity>` for better compile-time checking