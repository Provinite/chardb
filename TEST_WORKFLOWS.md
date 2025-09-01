# CharDB Test Workflows

## Overview

This document outlines comprehensive test workflows for the CharDB application to verify system functionality after major backend changes. These workflows cover all user-facing features while maintaining flexibility for future changes.

**Test Environment:** http://localhost:3000
**Test Credentials:** test@example.com / password123

## Core Test Workflows

### 1. Site Administration (Admin Users Only)

#### 1.1 Access Site Admin Dashboard

1. Log in with admin credentials (test@example.com / password123)
2. Navigate to dashboard 
3. Verify "Site Administration" card is visible
4. Click "Admin Panel" button
5. **Expected:** Redirected to `/admin` with site administration dashboard

#### 1.2 Site Invite Code Management (Card-Based Design)

1. From admin dashboard, click "Site Invite Codes" card
2. **Expected:** Redirected to `/admin/site-invite-codes` showing global invite codes in card layout

**Create Invite Code:**
1. Click "Create Invite Code" button (with plus icon)
2. **Expected:** Styled modal opens with form fields
3. Fill in optional invite code (e.g., "TESTINVITE2024") or leave blank for auto-generation
4. Set usage limit (e.g., 50) or leave blank for maximum (999,999)
5. **Expected:** Blue info box explains "Global Invite Code" functionality
6. Click "Create Invite Code" 
7. **Expected:** Modal closes, new invite code appears as card with usage stats and status badge

**Test Card-Based Display:**
1. Verify each invite code displays as a styled card with:
   - Code display in monospace font with copy button
   - Status badge (Available/Exhausted) with appropriate colors
   - Usage metrics (current/max, remaining)
   - Creation date information
   - Creator attribution ("by [username]")
   - Action buttons (copy link, edit, delete)

**Edit Invite Code:**
1. Click edit button (pencil icon) in card actions
2. **Expected:** Styled modal opens with current values pre-filled
3. Modify usage limit (must be >= current usage count)
4. Click "Update Invite Code"
5. **Expected:** Modal closes, card updates with new usage limit

**Copy Invite Link:**
1. Click copy button (link icon) in card header or actions
2. **Expected:** Invite URL copied to clipboard (format: `/signup?invite=CODE`)

**Delete Invite Code:**
1. Click delete button (trash icon) with red styling
2. Confirm deletion in browser popup
3. **Expected:** Invite code card removed from grid

**Test Dark Mode:**
1. Toggle to dark mode using theme switch
2. **Expected:** All cards, modals, and text maintain proper contrast
3. **Expected:** Invite code display uses green color (not purple) for readability

#### 1.3 Admin Permission Validation

1. Log out and log in with non-admin account
2. Navigate to `/dashboard` 
3. **Expected:** No "Site Administration" card visible
4. Try accessing `/admin` directly
5. **Expected:** Access denied or redirect (permission-based routing)

#### 1.3 Community Management System (Admin Users with canCreateCommunity Permission)

**Permission Prerequisites:**
- User must have `canCreateCommunity: true` permission
- User must have admin access to reach `/admin` dashboard
- Community management requires both site admin role AND specific community creation permissions

**Access Community Management:**
1. From admin dashboard (`/admin`), locate "Community Oversight" card
2. **Expected:** Card shows "Monitor and manage all communities" description with Database icon
3. Click "Community Oversight" card
4. **Expected:** Redirected to `/admin/communities` showing community management interface

**Test Community Management Interface:**
1. Verify page shows "Community Management" title and "Manage communities across the platform" subtitle
2. **Expected:** Search bar with magnifying glass icon for filtering communities
3. **Expected:** "Create Community" button with plus icon (primary blue styling)
4. **Expected:** Grid layout showing existing communities as cards (if any exist)

**Create New Community:**
1. Click "Create Community" button
2. **Expected:** Modal opens with title "Create Community"
3. **Expected:** Single form field: "Community Name" (required, no description field)
4. Enter community name (e.g., "Test Community 2024")
5. Click "Create Community" button
6. **Expected:** Modal closes, success toast appears, new community card appears in grid
7. **Expected:** Community card shows:
   - Community name as title
   - Creation date ("Created MM/DD/YYYY")
   - Three action buttons: "Invite Codes", "Manage", "Delete"

**Test Community Bootstrap (Automatic Role Creation and Admin Membership):**
1. After creating a new community, verify automatic bootstrap has occurred:
2. **Expected:** Three default roles automatically created in the new community:
   - **Admin Role:** All permissions enabled (canCreateSpecies, canCreateCharacter, canEditCharacter, canEditOwnCharacter, canEditSpecies, canCreateInviteCode, canListInviteCodes, canCreateRole, canEditRole)
   - **Moderator Role:** Limited permissions (canCreateCharacter, canEditCharacter, canEditOwnCharacter, canEditSpecies only)
   - **Member Role:** Basic permissions (canCreateCharacter, canEditOwnCharacter only)
3. **Expected:** Community creator automatically becomes member with Admin role
4. **Test Database Consistency:** Verify transaction completed successfully:
   - Community created
   - All three default roles exist
   - Creator has CommunityMember record with Admin role
   - If any step fails, entire operation should rollback
5. **Test Immediate Access:** Creator should be able to immediately:
   - Access community settings
   - Create and manage roles  
   - Create community invite codes
   - Invite other users to the community

**Search Communities:**
1. If multiple communities exist, test search functionality
2. Type partial community name in search field
3. **Expected:** Real-time filtering of community cards based on name match
4. Clear search field
5. **Expected:** All communities visible again

**Community Actions Testing:**
1. Click "Invite Codes" button on a community card
2. **Expected:** Navigate to `/communities/{communityId}/invite-codes` (community-specific invite code management)
3. **Expected:** Page shows community-scoped invite codes with role selection functionality
4. Return to community management page
5. Click "Delete" button on a community card
6. **Expected:** Browser confirmation dialog: "Are you sure you want to delete '[Community Name]'? This action cannot be undone."
7. Click "Cancel" to test cancellation
8. **Expected:** No changes, community remains
9. Click delete again, then "OK" to confirm deletion
10. **Expected:** Success toast, community card removed from grid

**Error Handling Tests:**
1. Try creating community with empty name
2. **Expected:** Form validation prevents submission
3. Test network error scenarios (if possible)
4. **Expected:** Error toast with meaningful message

**Permission Validation Tests:**
1. Log in with user account that has admin access but `canCreateCommunity: false`
2. Navigate to `/admin`
3. **Expected:** "Community Oversight" card should either be hidden OR
4. If card is visible, clicking should show access denied message
5. Try accessing `/admin/communities` directly with insufficient permissions
6. **Expected:** Access denied or redirect with appropriate error message

**Community-Specific Invite Code Integration:**
1. Create a new community
2. Click "Invite Codes" on the community card
3. **Expected:** Navigate to community invite code management page
4. **Expected:** Page shows community name and scoped invite codes
5. Create a new invite code with role selection
6. **Expected:** Community invite code created with role assignment capability
7. Test invite code usage in signup flow (if user can test signup)
8. **Expected:** New user gets assigned to community with specified role

**Loading States & Error Handling:**
1. Refresh community management page
2. **Expected:** Loading spinner displays while fetching communities
3. Test with slow/failed network connection (if possible)
4. **Expected:** Error message component displays with retry option
5. **Expected:** All loading states show appropriate feedback

**Responsive Design Testing:**
1. Test community management page on different screen sizes
2. **Expected:** Cards adjust to grid layout properly on mobile/tablet
3. **Expected:** Modal remains usable on smaller screens
4. **Expected:** Action buttons remain accessible

**Data Persistence Testing:**
1. Create several communities
2. Refresh page (F5)
3. **Expected:** All created communities persist and display correctly
4. Navigate away and return to page
5. **Expected:** Community list remains accurate

### 2. Authentication & Account Management

#### 2.1 User Registration with Invite Codes (Required)

**IMPORTANT:** All user registration now requires valid invite codes. No signup is possible without them.

**Test Valid Site Invite Code:**
1. Navigate to `/signup` or `/signup?invite=TESTINVITE2024`
2. Enter valid site invite code (e.g., "TESTINVITE2024")
3. **Expected:** Green checkmark with "Valid invite code (X uses remaining)" 
4. **Expected:** Blue preview box: "Site Registration: This code will give you access to the platform"
5. Fill in username, email, display name (optional), password, and confirm password
6. Submit form
7. **Expected:** Account created successfully, redirected to dashboard, invite code usage incremented

**Test Invalid Invite Code:**
1. Navigate to signup page
2. Enter invalid invite code (e.g., "INVALIDCODE")
3. **Expected:** Red X icon with "Invalid invite code" message
4. Try to submit form with invalid code
5. **Expected:** Form validation prevents submission

**Test Exhausted Invite Code:**
1. Use an invite code that has reached its usage limit
2. **Expected:** Red X icon with "This invite code has been exhausted" message

**Test Community Invite Code Preview:**
1. Enter a community invite code (when available)
2. **Expected:** Blue preview showing "You'll be joining [Community Name] and assigned the [Role Name] role"
3. Complete signup
4. **Expected:** User automatically becomes member of community with specified role

**Test URL Parameter Auto-Population:**
1. Navigate to `/signup?invite=TESTINVITE2024`
2. **Expected:** Invite code field pre-filled with "TESTINVITE2024"
3. **Expected:** Real-time validation shows as valid immediately

**Test Atomic Transaction Behavior:**
1. Monitor database during signup failures (invalid username/email)
2. **Expected:** If signup fails after invite code validation, invite code usage count remains unchanged
3. **Expected:** No partial user accounts created on any failure

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

#### 2.2 Community-Specific Invite Code Management (Admin/Community Admin Users)

**Permission Prerequisites:**
- User must have access to `/communities/{communityId}/invite-codes` (typically community admins)
- Community must exist (created via admin community management)
- User must have `canCreateInviteCode` permission for the specific community role context

**Access Community Invite Code Management:**
1. Navigate to `/admin/communities` (site admin) OR access community-specific admin area
2. Click "Invite Codes" button on any community card
3. **Expected:** Redirected to `/communities/{communityId}/invite-codes`
4. **Expected:** Page shows community name in header/context
5. **Expected:** Page shows community-scoped invite codes (separate from global/site codes)

**Test Community Context Display:**
1. Verify page header shows community name and context
2. **Expected:** Clear indication this is community-specific (not site-wide) invite code management
3. **Expected:** Breadcrumb or navigation indicating community context
4. **Expected:** Any existing community invite codes display in card layout

**Create Community Invite Code with Role Assignment:**
1. Click "Create Invite Code" button
2. **Expected:** Modal opens with community-specific invite code creation form
3. **Expected:** Form includes role selection dropdown
4. **Expected:** Role dropdown shows only roles available for this community
5. Select a role from dropdown (e.g., "Member", "Moderator", "Admin")
6. Fill in optional invite code string (or leave blank for auto-generation)
7. Set usage limit (or leave blank for maximum)
8. **Expected:** Help text explains "New members will be assigned this role when they use the invite code"
9. Click "Create Invite Code"
10. **Expected:** Modal closes, success toast, new community invite code appears
11. **Expected:** Code card shows role assignment information prominently

**Test Community Invite Code Card Display:**
1. Verify each community invite code card shows:
   - Invite code string with copy functionality
   - Role assignment badge/indicator ("Assigns: [Role Name]")
   - Community context (community name or icon)
   - Usage statistics (used/max)
   - Creation and expiration dates
   - Creator information
   - Status (Available/Exhausted)
   - Action buttons (edit, delete, copy link)

**Role Selection Validation:**
1. Try creating invite code without selecting a role
2. **Expected:** Form validation prevents submission with clear error message
3. **Expected:** Role field marked as required
4. Test role dropdown population
5. **Expected:** Only roles that belong to current community appear in dropdown
6. **Expected:** Roles show appropriate permissions/descriptions if available

**Community Invite Code Usage Testing:**
1. Create community invite code with specific role (e.g., "Editor" role)
2. Copy the invite code URL
3. Log out or use incognito/different browser
4. Navigate to signup page with community invite code
5. **Expected:** Signup form shows community preview: "You'll be joining [Community Name] and assigned the [Role Name] role"
6. Complete user registration with community invite code
7. **Expected:** New user account created successfully
8. **Expected:** User automatically becomes member of specified community
9. **Expected:** User assigned specified role within community
10. Log in as new user and verify community membership and role assignment

**Community Permission Integration Testing:**
1. Log in as user with community member role (not admin)
2. Try accessing `/communities/{communityId}/invite-codes` directly
3. **Expected:** Access denied OR limited view based on role permissions
4. **Expected:** Users without `canCreateInviteCode` permission cannot create codes
5. Test different community roles and their access levels
6. **Expected:** Permission system respects community-specific role hierarchies

**Community vs Site Invite Code Differentiation:**
1. Compare community invite codes with site-level invite codes
2. **Expected:** Clear visual distinction between community and site codes
3. **Expected:** Community codes show community context prominently
4. **Expected:** Site codes show global/platform context
5. **Expected:** Usage tracking separate between community and site codes
6. Test that community codes only work for that specific community
7. **Expected:** Community invite codes cannot be used for site-wide registration without community assignment

**Role-Based Invite Code Limits:**
1. Test invite code creation with different community roles
2. **Expected:** Higher privileged roles can create more powerful invite codes
3. **Expected:** Lower privileged roles have restricted invite code capabilities
4. Try creating invite code that assigns higher role than creator possesses
5. **Expected:** System prevents privilege escalation via invite codes
6. **Expected:** Users cannot create invite codes for roles they don't have permission to assign

**Community Invite Code Editing:**
1. Click edit button on existing community invite code
2. **Expected:** Modal opens with current values pre-filled including role selection
3. Modify role assignment to different community role
4. **Expected:** Role dropdown still shows only community-appropriate roles
5. Update usage limits or other settings
6. Save changes
7. **Expected:** Invite code updated with new role assignment
8. **Expected:** Existing unused codes now assign new role when claimed

**Bulk Community Invite Code Management:**
1. Create multiple community invite codes with different roles
2. **Expected:** Each code clearly shows its role assignment
3. Test filtering or sorting codes by role (if available)
4. **Expected:** Easy management of multiple role-specific codes
5. Test usage tracking across different role-based codes
6. **Expected:** Analytics show which roles are most commonly assigned via invites

**Community Integration Error Handling:**
1. Test community invite code creation when community is deleted
2. **Expected:** Appropriate error handling and cleanup
3. Test role changes that affect existing invite codes
4. **Expected:** System handles role modifications gracefully
5. Test invalid community ID in URL
6. **Expected:** 404 or access denied with helpful error message

### 3. Character Management Workflows

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

#### 3.5 Media Type Counting Validation

1. Upload at least 3 media items to a character (mix of images and text)
2. Verify ALL media type counts update correctly in character gallery
3. Test filtering functionality by clicking each media type filter
4. **Expected:** All counters display accurate numbers, filtering works correctly

#### 3.6 Media Privacy Controls Testing

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
- Media type counting and filtering
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