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

### 8. Species Management System (Community Admin Users)

#### 8.1 Access Community Administration

**Permission Prerequisites:**
- User must have community admin role OR appropriate species management permissions
- Access requires membership in target community with `canCreateSpecies` or `canEditSpecies` permissions

**Access Community Admin Interface:**
1. Navigate to `/communities/{communityId}/admin` where `{communityId}` is valid community ID
2. **Expected:** Community Administration page loads showing community name ("Fantasy Realm", etc.)
3. **Expected:** Page displays administrative access message and available admin cards
4. **Expected:** "Species Management" card visible with Database icon and description
5. **Expected:** Other admin cards like "Member Management", "Roles & Permissions", "Invite Management" visible

**Species Management Access:**
1. Click "Species Management" card from community admin dashboard
2. **Expected:** Redirected to `/communities/{communityId}/species`
3. **Expected:** Page shows "Species Management" title with species count (e.g., "$0 species")
4. **Expected:** Community-scoped indicator: "Showing species for specific community only"
5. **Expected:** Search bar with magnifying glass icon present
6. **Expected:** "Create Species" button with plus icon visible

#### 8.2 Species Management Dashboard Testing

**Empty State Validation:**
1. Access species management for community with no species
2. **Expected:** Shows "No species found" message with Database icon
3. **Expected:** Helpful message: "Get started by creating your first species"
4. **Expected:** Species count displays as "$0 species"

**Search Functionality Testing:**
1. Type search query in species search box (e.g., "dragon")
2. **Expected:** Search input accepts text without errors
3. **Expected:** Empty state message updates to: "No species match your search for 'dragon'"
4. Clear search field
5. **Expected:** Returns to default empty state message
6. **Expected:** Real-time search filtering works without page refresh

**UI Component Validation:**
1. Verify search input has proper placeholder text: "Search species..."
2. **Expected:** Create Species button shows plus icon and "Create Species" text
3. **Expected:** Page layout responsive and elements properly styled
4. **Expected:** Breadcrumb or navigation context shows community information

#### 8.3 Species Creation Workflow Testing

**Modal Opening:**
1. Click "Create Species" button from species dashboard
2. **Expected:** Modal opens with title "Create Species"
3. **Expected:** Modal contains three form sections:
   - Species Name text input (required)
   - Community dropdown (pre-populated)
   - "Species has associated image" checkbox

**Form Field Validation:**
1. **Species Name Field:**
   - **Expected:** Input has placeholder "Enter species name..."
   - **Expected:** Field marked as required
   - Test empty submission
   - **Expected:** Create button disabled until name provided
   
2. **Community Dropdown:**
   - **Expected:** Shows "Select a community..." as default option
   - **Expected:** Lists available communities (e.g., "Fantasy Realm", "Sci-Fi Universe", "Modern World")
   - **Expected:** Current community pre-selected or available in list
   
3. **Image Association Checkbox:**
   - **Expected:** Checkbox defaults to unchecked
   - **Expected:** Label text: "Species has associated image"
   - Test checking/unchecking
   - **Expected:** State changes properly without errors

**Form Submission Testing:**
1. Fill out complete form:
   - Species Name: "Dragon" 
   - Community: "Fantasy Realm"
   - Image checkbox: checked
2. **Expected:** "Create Species" button becomes enabled
3. Click "Create Species" button
4. **Expected:** Form submits successfully with loading state
5. **Expected:** Success toast notification appears: "Species 'Dragon' created successfully!"
6. **Expected:** Modal closes and returns to species dashboard
7. **Expected:** New species appears in species list
8. **Expected:** Species count updates (e.g., "$0 species" → "$1 species")

**Modal Interaction Testing:**
1. Click "Cancel" button
2. **Expected:** Modal closes without saving, returns to dashboard
3. Test clicking outside modal area
4. **Expected:** Modal closes (if click-outside behavior enabled)
5. Test opening modal multiple times
6. **Expected:** Form resets to defaults on each open

#### 8.4 Species Trait Management Testing

**Access Trait Builder:**
1. Navigate directly to `/species/{speciesId}/traits` (use ID 1 for testing)
2. **Expected:** Trait Builder page attempts to load
3. **Expected:** Shows appropriate error: "Species with ID 1 not found"
4. **Expected:** Error message displays with proper styling and Error icon
5. **Expected:** Page doesn't crash or show broken layout

**Trait Builder Interface (When Species Exists):**
*Note: This section requires successful species creation first*
1. Access trait builder for valid species
2. **Expected:** Page shows "Trait Builder" title
3. **Expected:** Breadcrumb navigation: "Species Management > [Species Name] > Traits"
4. **Expected:** Species context displayed (e.g., "Configure traits for Dragon")
5. **Expected:** Empty state shows Settings icon and helpful message
6. **Expected:** "Add Trait" button with plus icon visible
7. **Expected:** "Manage Variants" button links to variant management

**Trait Creation Modal (When Available):**
1. Click "Add Trait" button
2. **Expected:** Modal opens with "Create New Trait" title
3. **Expected:** Form includes:
   - Trait Name text input
   - Value Type selection (STRING, INTEGER, TIMESTAMP, ENUM)
   - Each value type shows icon and description
4. **Expected:** Value type options display properly with icons:
   - STRING: Type icon, "Text-based traits like names, descriptions..."
   - INTEGER: Hash icon, "Numeric traits for ages, levels, stats..."
   - TIMESTAMP: Calendar icon, "Date and time traits for birthdays..."
   - ENUM: List icon, "Predefined options like colors, rarities..."

**Create ENUM Trait for Testing:**
1. Fill trait name (e.g., "Scale Color")
2. Select "Selection" (ENUM) value type
3. Click "Create Trait"
4. **Expected:** Toast notification "Trait 'Scale Color' created successfully!"
5. **Expected:** Trait appears in grid with ENUM type icon (List)
6. **Expected:** Trait shows "Selection" type label
7. **Expected:** Helper text indicates "(Click 'Options' to manage values)"

**ENUM Trait Management Interface:**
1. **Expected:** ENUM traits display additional "Options" button with List icon
2. **Expected:** Trait card shows all standard actions (Edit, Delete) plus Options
3. **Expected:** Options button is only visible for ENUM-type traits
4. **Expected:** Other trait types (STRING, INTEGER, TIMESTAMP) do not show Options button

#### 8.4.1 Enum Value Management (ENUM Trait Options)

**Access Enum Value Management:**
1. Create an ENUM-type trait (e.g., "Scale Color") following above steps
2. Click "Options" button on the ENUM trait card
3. **Expected:** Navigate to `/traits/{traitId}/enum-values`
4. **Expected:** Page loads "Manage Options" interface

**Enum Value Management Interface:**
1. **Expected:** Page title "Manage Options"
2. **Expected:** Breadcrumb: "Species Management > [Species] > Traits > [Trait Name] > Options"  
3. **Expected:** Context shows trait name and options count (e.g., "Configure options for 'Scale Color' trait (0 options)")
4. **Expected:** "Back to Traits" button returns to trait builder
5. **Expected:** "Add Option" button with plus icon for creating enum values

**Create Enum Values:**
1. Click "Add Option" button
2. **Expected:** Modal opens "Create New Option"
3. **Expected:** Form includes:
   - Option Name text input
   - Display Order number input with helpful text
4. Fill option name (e.g., "Red")
5. Set display order (e.g., 1)
6. Click "Create Option"
7. **Expected:** Toast "Option 'Red' created successfully!"
8. **Expected:** Option appears in list with order badge and actions

**Add Multiple Enum Values:**
1. Repeat creation for more options (e.g., "Blue", "Green", "Gold")
2. **Expected:** Each option displays as a card with:
   - Order badge (e.g., "#1", "#2")
   - Option name prominently displayed
   - Creation date metadata
   - Up/Down arrows for reordering
   - Edit and Delete action buttons

**Enum Value Ordering:**
1. **Expected:** Options display sorted by order value
2. Click "Up" arrow on second item
3. **Expected:** Item moves up in list, toast confirms update
4. Click "Down" arrow on first item  
5. **Expected:** Item moves down in list
6. **Expected:** Up button disabled on first item, Down disabled on last item

**Edit and Delete Enum Values:**
1. Click "Edit" button on an option
2. **Expected:** Modal opens with current values pre-filled
3. Modify name and/or order
4. **Expected:** Changes saved with toast confirmation
5. Click "Delete" button on an option
6. **Expected:** Confirmation dialog warns about character data deletion
7. Confirm deletion
8. **Expected:** Option removed with toast confirmation

#### 8.5 Species Variant Management Testing

**Access Variant Management:**
1. Navigate directly to `/species/{speciesId}/variants`
2. **Expected:** Species Variant Management page attempts to load
3. **Expected:** Shows same error as traits: "Species with ID 1 not found"
4. **Expected:** Consistent error styling and behavior with trait page

**Variant Management Interface (When Species Exists):**
1. Access variant management for valid species
2. **Expected:** Page shows "Species Variants" title
3. **Expected:** Breadcrumb: "Species Management > [Species Name] > Variants"
4. **Expected:** Context shows species name and variant count
5. **Expected:** Empty state explains variant concept with helpful text
6. **Expected:** "Add Variant" button with plus icon
7. **Expected:** "Manage Traits" button links back to trait builder

**Variant Creation Workflow:**
1. Click "Add Variant" button
2. **Expected:** Modal opens with "Create New Variant" title
3. **Expected:** Form includes:
   - Variant Name input with examples ("Common", "Rare", "Shiny", etc.)
   - Helpful description text about variant purpose
4. **Expected:** Form validation prevents empty submissions
5. **Expected:** Cancel and Create buttons function properly

**Create Test Variant:**
1. Create variant (e.g., "Fire Dragon")
2. **Expected:** Toast "Variant 'Fire Dragon' created successfully!"
3. **Expected:** Variant appears as card with:
   - Variant name prominently displayed
   - Creation/update metadata
   - Action buttons: "Configure Traits", "Manage Enum Settings", "Edit", "Delete"
4. **Expected:** Cards display in responsive grid layout

**Variant Action Buttons:**
1. **Expected:** Each variant card shows 4 action buttons:
   - "Configure Traits" (Database icon) - for trait inheritance settings
   - "Manage Enum Settings" (Settings icon) - for variant-specific enum value configuration
   - "Edit" (Edit icon) - for renaming variant
   - "Delete" (Trash icon) - for removing variant

#### 8.5.1 Enum Value Settings Management (Variant-Specific Enum Configuration)

**Prerequisites:**
1. Must have created species with ENUM-type traits
2. Must have created enum values for those traits (see section 8.4.1)
3. Must have created at least one species variant

**Access Enum Value Settings:**
1. From variant management page, click "Manage Enum Settings" button on a variant card
2. **Expected:** Navigate to `/variants/{variantId}/enum-settings`
3. **Expected:** Page loads "Configure Enum Values" interface

**Enum Value Settings Interface:**
1. **Expected:** Page title "Configure Enum Values"
2. **Expected:** Breadcrumb: "Species Management > [Species] > Variants > [Variant] > Enum Settings"
3. **Expected:** Context shows variant name (e.g., "Choose which enum values are available for 'Fire Dragon' variant")
4. **Expected:** "Back to Variants" button with left arrow returns to variant management

**No ENUM Traits State:**
1. If species has no ENUM-type traits:
2. **Expected:** Empty state with Palette icon
3. **Expected:** Message "No ENUM traits found"
4. **Expected:** Helpful text about creating ENUM traits first
5. **Expected:** "Manage Traits" button links to trait builder

**ENUM Traits Display (With ENUM Traits Available):**
1. **Expected:** Each ENUM trait displays as a section:
   - Trait header with Palette icon and trait name
   - Metadata showing enabled count (e.g., "2 of 4 options enabled")
   - Grid of enum value cards within the trait section
2. **Expected:** Traits are organized by trait (e.g., "Scale Color" section, "Element Type" section)

**Enum Value Configuration Cards:**
1. **Expected:** Each enum value displays as a card with:
   - Option name prominently shown
   - Order metadata (e.g., "Order: 1")
   - Current status: enabled (green border, success styling) or disabled (default styling)
   - Toggle button: "Enabled" (with checkmark) or "Disabled" (with X)
2. **Expected:** Cards have hover effects and visual feedback

**Enable/Disable Enum Values:**
1. Click "Disabled" button on an enum value
2. **Expected:** Button changes to "Enabled" with checkmark
3. **Expected:** Card styling updates to show enabled state (green border)
4. **Expected:** Toast "Enum value enabled successfully!"
5. **Expected:** Trait header count updates (e.g., "1 of 4 options enabled")

**Disable Enum Values:**
1. Click "Enabled" button on a currently enabled enum value
2. **Expected:** Button changes to "Disabled" with X icon
3. **Expected:** Card styling reverts to disabled state
4. **Expected:** Toast "Enum value disabled successfully!"
5. **Expected:** Trait header count updates

**Multiple Trait Configuration:**
1. If species has multiple ENUM traits (e.g., "Scale Color" and "Element Type"):
2. **Expected:** Each trait displays as separate section
3. **Expected:** Settings for one trait don't affect another trait
4. **Expected:** Each trait maintains independent enabled/disabled counts
5. **Expected:** Real-time updates work across all trait sections

**Use Case Example Testing:**
*Create this scenario for comprehensive testing:*
1. Species: "Dragon" 
2. ENUM Traits: "Scale Color" (Red, Blue, Green, Gold), "Element Type" (Fire, Ice, Earth, Air)
3. Variants: "Fire Dragon", "Ice Dragon", "Forest Dragon"
4. Configure settings:
   - Fire Dragon: Scale Color (Red ✓, Gold ✓), Element Type (Fire ✓)
   - Ice Dragon: Scale Color (Blue ✓), Element Type (Ice ✓)  
   - Forest Dragon: Scale Color (Green ✓, Blue ✓), Element Type (Earth ✓, Air ✓)
5. **Expected:** Each variant shows different available options based on configuration
6. **Expected:** Settings persist across browser sessions

#### 8.6 Error Handling & Edge Cases

**Network Error Handling:**
1. Test species creation with network connectivity issues
2. **Expected:** Appropriate timeout and error messages
3. **Expected:** User can retry operations
4. **Expected:** No partial data creation on failure

**Permission Validation:**
1. Access species management URLs with insufficient permissions
2. **Expected:** Access denied or redirect with clear error message
3. **Expected:** No broken page states or exposed functionality
4. Test with user who has no community membership
5. **Expected:** Proper authorization checks prevent access

**Invalid URL Parameters:**
1. Access `/communities/999/species` (non-existent community)
2. **Expected:** 404 error or appropriate not found message
3. Access `/species/999/traits` (non-existent species)
4. **Expected:** "Species with ID 999 not found" error
5. **Expected:** Consistent error handling across all species URLs

**GraphQL Error Handling:**
1. Monitor browser console during operations
2. **Expected:** GraphQL errors logged appropriately
3. **Expected:** User-friendly error messages displayed
4. **Expected:** No GraphQL query failures that crash the UI
5. Test with invalid GraphQL operations
6. **Expected:** Proper error boundaries prevent white screen

#### 8.7 Browser Compatibility & Performance

**Cross-Browser Testing:**
1. Test species management in Chrome, Firefox, Safari
2. **Expected:** Consistent functionality across browsers
3. **Expected:** Modal interactions work properly
4. **Expected:** Form submissions function correctly

**Responsive Design Testing:**
1. Access species management on mobile/tablet sizes
2. **Expected:** Cards and layout adapt properly
3. **Expected:** Modals remain usable on smaller screens
4. **Expected:** Search and action buttons accessible
5. **Expected:** Touch interactions work on mobile

**Performance Validation:**
1. Monitor page load times for species management
2. **Expected:** Initial load under 3 seconds on fast connection
3. **Expected:** Modal open/close animations smooth
4. **Expected:** Search filtering responsive without lag
5. Test with large numbers of species (when available)
6. **Expected:** Pagination or efficient loading for large lists

#### 8.8 Data Persistence & State Management

**Page Refresh Testing:**
1. Perform species management operations
2. Refresh page (F5) after each major action
3. **Expected:** Page state preserved correctly
4. **Expected:** No loss of search filters or view state
5. **Expected:** Species count and data remain accurate

**Navigation State:**
1. Navigate between species, trait, and variant pages
2. **Expected:** Proper context maintained throughout navigation
3. **Expected:** Breadcrumbs update correctly
4. **Expected:** Back button functionality works as expected
5. Return to species dashboard from sub-pages
6. **Expected:** Dashboard reflects any changes made in sub-sections

**GraphQL Cache Testing:**
1. Create species (when backend working)
2. Navigate to different pages and return
3. **Expected:** Apollo cache maintains data consistency
4. **Expected:** Optimistic updates work properly
5. **Expected:** Refetch operations work after mutations

#### 8.9 Integration with Community System

**Community Context Validation:**
1. Test species management in different communities
2. **Expected:** Species data properly scoped to community
3. **Expected:** No cross-community data leakage
4. **Expected:** Community names and contexts display correctly

**Role-Based Access Testing:**
1. Test with different community roles:
   - Community Admin (full access)
   - Moderator (limited access)
   - Member (view only or no access)
2. **Expected:** Features shown/hidden based on role permissions
3. **Expected:** Action buttons reflect available permissions
4. **Expected:** No unauthorized operations possible

**Community Membership Integration:**
1. Test species management access with various community membership states
2. **Expected:** Non-members cannot access community species
3. **Expected:** Proper membership validation throughout workflow
4. **Expected:** Community admin roles grant appropriate species permissions

### 9. Data Integrity & Error Handling

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
- Species Management System access and navigation
- Community administration interface functionality
- Species creation modal and form validation
- Permission management interface access and navigation
- Role creation with built-in templates (Member, Moderator, Admin)
- Role management tab with role cards and editing functionality
- Permission matrix display and functionality

### Medium Priority (Extended Features)

- Advanced media settings
- Gallery management
- Social features (likes, follows)
- Search and discovery
- Advanced privacy controls
- Artist credit system
- Character trading features
- Species trait builder interface and trait type management
- Species variant management and configuration
- Community-scoped species permissions and role integration
- Species search and filtering functionality
- Community invitation workflow for existing users
- Advanced permission management (bulk operations, member role assignments)
- Cross-community permission inheritance and validation

### 9. Comprehensive Trait System Testing

#### 9.1 Complete Species and Trait Setup Testing

**Prerequisites for Testing:**
- User must have community admin permissions
- Access to species management interface
- Clean test environment to create comprehensive test data

**Test Species Creation with Full Trait Types:**
1. Navigate to community admin interface (`/communities/{communityId}/admin`)
2. Click "Species Management" card to access species management
3. Create test species (e.g., "Dragon") using "Create Species" button
4. **Expected:** Species created successfully with confirmation toast

**Create All Trait Types for Comprehensive Testing:**
1. Navigate to species traits page (`/species/{speciesId}/traits`)
2. Create STRING trait:
   - Name: "Nickname" 
   - Type: "Text" (STRING value type)
   - **Expected:** Trait created with Type icon displayed
3. Create INTEGER trait:
   - Name: "Power Level"
   - Type: "Number" (INTEGER value type) 
   - **Expected:** Trait created with Hash icon displayed
4. Create TIMESTAMP trait:
   - Name: "Birth Date"
   - Type: "Date & Time" (TIMESTAMP value type)
   - **Expected:** Trait created with Calendar icon displayed
5. Create ENUM trait:
   - Name: "Primary Color"
   - Type: "Selection" (ENUM value type)
   - **Expected:** Trait created with List icon and "Options" button visible

#### 9.2 ENUM Value Configuration Testing

**Create ENUM Values for Color Trait:**
1. Click "Options" button on "Primary Color" ENUM trait
2. **Expected:** Navigate to enum value management page with proper breadcrumb navigation
3. Create multiple enum values using "Add Option":
   - "Red" (Order: 1)
   - "Blue" (Order: 2) 
   - "Green" (Order: 3)
4. **Expected:** Each option displays as card with order badge, name, and action buttons
5. **Expected:** Options automatically sort by order value
6. Test ordering functionality by using up/down arrows
7. **Expected:** Real-time reordering with toast confirmations

#### 9.3 Species Variant Creation and Configuration

**Create Multiple Species Variants:**
1. Navigate to species variants page (`/species/{speciesId}/variants`)
2. Create test variants:
   - "Fire Dragon" variant
   - "Water Dragon" variant
   - "Forest Dragon" variant
3. **Expected:** Each variant displays as card with configuration action buttons

**Configure Variant-Specific Enum Settings:**
1. Click "Manage Enum Settings" on "Water Dragon" variant
2. **Expected:** Page shows all ENUM traits with their available values
3. Configure Primary Color trait for Water Dragon:
   - Enable "Blue" option (click "Disabled" → becomes "Enabled")
   - Enable "Green" option
   - Leave "Red" option disabled
4. **Expected:** Real-time updates with success toasts
5. **Expected:** Trait header shows count (e.g., "2 of 3 options enabled")
6. **Expected:** Visual distinction between enabled (green border) and disabled options

**Test Different Variant Configurations:**
1. Configure "Fire Dragon" variant:
   - Enable only "Red" for Primary Color
2. Configure "Forest Dragon" variant:
   - Enable "Green" and "Blue" for Primary Color
3. **Expected:** Each variant maintains independent enum value configurations

#### 9.4 Character Creation with Full Trait Integration

**Access Enhanced Character Creation:**
1. Navigate to character creation page
2. Select species "Dragon" from dropdown
3. **Expected:** Species variants appear in second dropdown
4. Select "Water Dragon" variant
5. **Expected:** Trait value editors appear for all configured traits

**Test All Trait Type Inputs:**
1. **STRING Trait (Nickname):**
   - **Expected:** Text input with placeholder "Enter nickname..."
   - **Expected:** Type icon displayed in trait label
   - **Expected:** Helper text: "Enter text (e.g., name, description, or any text value)"
   - Enter value: "Splash"

2. **INTEGER Trait (Power Level):**
   - **Expected:** Number input with step="1" 
   - **Expected:** Hash icon displayed in trait label
   - **Expected:** Helper text: "Enter a whole number (e.g., age, level, count)"
   - **Expected:** Validation hint: "Enter whole numbers only (no decimals)"
   - Enter value: "85"

3. **TIMESTAMP Trait (Birth Date):**
   - **Expected:** datetime-local input type
   - **Expected:** Calendar icon displayed in trait label  
   - **Expected:** Helper text: "Select a date and time"
   - Enter value: "2023-01-15T10:30"

4. **ENUM Trait (Primary Color):**
   - **Expected:** Dropdown select with List icon in trait label
   - **Expected:** Helper text: "Choose from available options • Available options are filtered based on the selected variant"
   - **Expected:** Only "Blue" and "Green" options available (Red filtered out for Water variant)
   - **Expected:** Options sorted by order value
   - Select value: "Blue"

#### 9.5 Variant-Specific Filtering Validation

**Test Variant Switching Behavior:**
1. With traits filled out, change variant from "Water Dragon" to "Fire Dragon"
2. **Expected:** Primary Color dropdown updates to show only "Red" option
3. **Expected:** Previously selected "Blue" value cleared if not available for new variant
4. **Expected:** Other trait values (STRING, INTEGER, TIMESTAMP) remain unchanged
5. Change variant to "Forest Dragon" 
6. **Expected:** Primary Color shows "Blue" and "Green" options (Red filtered out)

**Test Empty Variant State:**
1. Create variant with no enum value settings configured
2. Select variant in character creation
3. **Expected:** ENUM trait shows "No options available for this variant" 
4. **Expected:** Disabled dropdown with helpful message
5. **Expected:** Validation hint: "This trait has no available options for the selected variant"

#### 9.6 Complete Character Creation Validation

**Submit Character with All Trait Types:**
1. Fill character creation form:
   - Name: "Test Dragon Character"
   - Species: "Dragon"
   - Variant: "Water Dragon" 
   - Nickname: "Splash"
   - Power Level: "85"
   - Birth Date: "2023-01-15T10:30"
   - Primary Color: "Blue"
2. Submit form
3. **Expected:** Character created successfully
4. **Expected:** Redirected to character detail page
5. **Expected:** All trait values display correctly on character page

#### 9.7 Character Display and Trait Value Rendering

**Verify Trait Values on Character Page:**
1. Navigate to created character detail page
2. **Expected:** Character shows species as "Dragon" and variant as "Water Dragon"
3. **Expected:** Trait values display in organized section:
   - Nickname: "Splash" (STRING trait)
   - Power Level: "85" (INTEGER trait) 
   - Birth Date: "January 15, 2023 at 10:30 AM" (TIMESTAMP trait formatted)
   - Primary Color: "Blue" (ENUM trait showing enum value name)
4. **Expected:** All trait types render with appropriate formatting
5. **Expected:** No missing or undefined values

#### 9.8 Multiple Variant Testing Scenarios

**Create Characters for Each Variant:**
1. Create "Fire Dragon" character:
   - Primary Color: "Red" (only available option)
   - Other traits: varied values
2. Create "Forest Dragon" character:
   - Primary Color: "Green" (from available Blue/Green options)
   - Other traits: varied values  
3. **Expected:** Each character respects variant-specific enum filtering
4. **Expected:** All characters display correctly on browse/listing pages

**Test Cross-Variant Consistency:**
1. Verify STRING, INTEGER, and TIMESTAMP traits work identically across all variants
2. **Expected:** Only ENUM traits show variant-specific filtering
3. **Expected:** Non-ENUM traits maintain same behavior regardless of variant selection

#### 9.9 Error Handling and Edge Cases

**Test Required Trait Validation:**
1. Attempt to create character without filling required trait values
2. **Expected:** Form validation prevents submission
3. **Expected:** Error messages appear for missing required traits
4. **Expected:** Form highlights which trait inputs need attention

**Test Invalid Value Handling:**
1. Enter non-numeric value in INTEGER trait
2. **Expected:** Input validation prevents invalid characters
3. **Expected:** Helpful error message for invalid number format
4. Test future/past date limits for TIMESTAMP traits (if configured)
5. **Expected:** Date validation works according to trait constraints

#### 9.10 Data Persistence and State Management

**Test Form State Preservation:**
1. Fill out character creation form partially
2. Navigate away and return using browser back button
3. **Expected:** Form values preserved during session
4. Test form auto-save or warning on navigation (if implemented)

**Test Character Edit with Traits:**
1. Navigate to character edit page for trait-enabled character
2. **Expected:** All current trait values pre-populated correctly
3. Modify trait values and save
4. **Expected:** Updates saved successfully with confirmation
5. **Expected:** Character page reflects changes immediately

#### 9.11 Performance and User Experience Validation

**Test Loading States:**
1. Monitor trait value editor loading during variant selection
2. **Expected:** Smooth transitions without loading delays
3. **Expected:** No flickering or UI jumps during enum option updates
4. Test with large number of enum values (if available)
5. **Expected:** Dropdown remains responsive with many options

**Test Real-Time Updates:**
1. Verify enum value settings changes reflect immediately in character creation
2. **Expected:** No page refresh required for variant filter updates
3. **Expected:** Smooth user experience during species/variant selection changes

#### 9.12 Integration with Existing Character System

**Test Backward Compatibility:**
1. Create characters without species/variant selection (if still supported)
2. **Expected:** Character creation still works for basic characters
3. **Expected:** Existing characters without traits display normally
4. Test migration of existing characters to trait system (if applicable)

**Test Character Listing Integration:**
1. Browse characters page with trait-enabled characters
2. **Expected:** Characters display species and variant information
3. **Expected:** Search and filter functionality includes trait-based characters
4. **Expected:** Character cards show trait information appropriately

### 10. Community Invitation for Existing Users

#### 9.1 Access Join Community Interface

**Prerequisites:**
- User must be logged in (test@example.com / password123)
- Valid community invite codes must exist (created via admin/community admin interfaces)

**Access Join Community Page:**
1. Log in with user credentials
2. Navigate to dashboard (`/dashboard`)
3. Locate "Quick Actions" section 
4. Click "Join Community" button
5. **Expected:** Redirected to `/join-community` with community invitation form

#### 9.2 Community Invite Code Validation and Entry

**Test Invite Code Form Interface:**
1. Verify page shows:
   - "Join Community" title
   - "Enter an invite code to join a community" subtitle
   - Single input field labeled "Invite Code"
   - "Join Community" button (initially disabled)

**Test Real-Time Invite Code Validation:**
1. Enter short invite code (e.g., "te")
2. **Expected:** No validation message appears (minimum 2 characters required)
3. Enter valid-length invite code (e.g., "test123")
4. **Expected:** Real-time GraphQL query triggers validation
5. **For invalid codes:** Red X icon with "Invalid invite code" message
6. **For exhausted codes:** Red X icon with "This invite code has been exhausted" message
7. **For valid codes:** Green checkmark with "Valid invite code (X uses remaining)" message

**Test Community Preview Display:**
1. Enter valid community invite code with role assignment
2. **Expected:** Blue preview box appears showing:
   - Community name in primary color
   - Role assignment text: "as [Role Name]"
   - Description: "You'll be joining this community and assigned the [Role Name] role."
3. For site-wide invite codes (no community):
4. **Expected:** Preview shows: "Site Registration: This code will give you platform access."

**Test Form Validation:**
1. Enter invite code with invalid characters (e.g., "test123!")
2. **Expected:** Form validation prevents submission
3. Enter valid invite code format
4. **Expected:** "Join Community" button becomes enabled when code is valid and available

#### 9.3 Community Invite Code Claiming Process

**Test Successful Community Joining:**
1. Enter valid community invite code
2. Wait for green validation checkmark
3. Click "Join Community" button
4. **Expected:** Button shows loading state ("Joining Community...")
5. **Expected:** Success toast: "Successfully joined [Community Name] as [Role Name]!"
6. **Expected:** User redirected to `/communities/[communityId]` 

**Test Site-Wide Invite Code Claiming:**
1. Enter valid site-wide invite code (no community assignment)
2. Click "Join Community" button
3. **Expected:** Success toast: "Successfully claimed invite code!"
4. **Expected:** User redirected to `/dashboard`

**Test Error Handling:**
1. Attempt to claim already exhausted invite code
2. **Expected:** Error toast with appropriate message
3. Test network error scenarios (if possible)
4. **Expected:** Graceful error handling with user-friendly messages

#### 9.4 Integration with Dashboard Navigation

**Test Dashboard Navigation:**
1. From dashboard, verify "Join Community" button in Quick Actions section
2. **Expected:** Button positioned between "Create Media" and "Browse Characters"
3. Click button to navigate to join community page
4. **Expected:** Smooth navigation without errors

**Test User Authentication Requirements:**
1. Navigate to `/join-community` while logged out
2. **Expected:** Page shows login requirement message
3. **Expected:** "Go to Login" button redirects to `/login`
4. After login, user should be able to access join community functionality

#### 9.5 Community Membership Verification

**Test Community Membership Integration:**
1. Successfully join a community using invite code
2. Navigate to community-specific pages (if available)
3. **Expected:** User has appropriate community role permissions
4. Verify user appears in community member lists (if accessible)
5. **Expected:** Community membership records created correctly

**Test Invite Code Usage Tracking:**
1. After successful claim, return to invite code management
2. **Expected:** Usage count incremented correctly
3. **Expected:** Remaining claims decremented
4. If last use, verify invite code marked as exhausted

#### 9.6 Error Prevention and Edge Cases

**Test Duplicate Community Membership:**
1. Join a community using an invite code
2. Attempt to use another invite code for the same community
3. **Expected:** Error message preventing duplicate membership attempt

**Test Invalid User State:**
1. Test with user accounts in various states
2. **Expected:** Consistent behavior regardless of user community membership status

**Test Code Validation Edge Cases:**
1. Test very long invite codes (approach character limits)
2. Test codes with edge-case characters within allowed set
3. **Expected:** Proper validation and error messages

#### 9.7 Complete Community Invitation Workflow Testing

**Test Full Invitation Flow End-to-End:**
1. Log in with test user credentials
2. Navigate to dashboard and click "Join Community" in Quick Actions
3. **Expected:** Redirected to join community page with invite code form
4. Enter a valid community invite code (obtain from admin invite code management)
5. **Expected:** Real-time validation shows code status and remaining uses
6. **Expected:** Community preview displays showing community name and assigned role
7. Click "Join Community" button
8. **Expected:** Success notification appears confirming community membership
9. **Expected:** User redirected to joined community page
10. Verify user can access community-specific features based on assigned role

**Test Invalid Invite Code Handling:**
1. Access join community page while logged in
2. Enter non-existent invite code
3. **Expected:** Error message indicates invalid code
4. **Expected:** Submit button remains disabled
5. Enter exhausted invite code (if available)
6. **Expected:** Error message indicates code is exhausted
7. **Expected:** Form prevents submission of invalid codes

**Test Authentication Requirements:**
1. Navigate to `/join-community` while logged out
2. **Expected:** Authentication required message displayed
3. **Expected:** Login prompt or redirect to login page
4. Complete login flow and return to join community page
5. **Expected:** Full invite code functionality available after authentication

**Test Multiple Community Memberships:**
1. Successfully join first community using invite code
2. Return to join community page
3. Use different invite code for second community
4. **Expected:** User can join multiple communities
5. **Expected:** Each community membership tracked independently
6. Verify user has appropriate roles in each joined community

### 11. Permission Management System (Community Admin Users)

#### 11.1 Access Permission Management Interface

**Permission Prerequisites:**
- User must have community admin role OR appropriate permission management permissions
- Access requires membership in target community with `canCreateRole` or `canEditRole` permissions

**Access Permission Management Interface:**
1. Navigate to `/communities/{communityId}/permissions` where `{communityId}` is valid community ID
2. **Expected:** Permission Management page loads showing community name in header
3. **Expected:** Page displays "Permission Management" title with role count (e.g., "Community • 0 roles")
4. **Expected:** Two main tabs visible: "Member Overview" and "Role Management"
5. **Expected:** "Create Role" button with plus icon in header actions
6. **Expected:** Back button for navigation

#### 11.2 Permission Matrix Testing (Member Overview Tab)

**Access Member Overview:**
1. Click "Member Overview" tab (should be default active tab)
2. **Expected:** Permission Matrix component loads with grid layout
3. **Expected:** Search functionality available with "Search members by name, email, or role..." placeholder
4. **Expected:** Statistics section showing "Total Members: 0" (for empty community)
5. **Expected:** Matrix table with headers: Member, Role, and all permission columns:
   - Create Species, Create Character, Edit Characters, Edit Own Characters
   - Edit Species, Create Invites, List Invites, Create Roles, Edit Roles

**Test Matrix Features:**
1. **Expected:** Sticky header rows remain visible during scroll
2. **Expected:** Member column shows user avatars, names, and email addresses
3. **Expected:** Role column displays role selection dropdowns
4. **Expected:** Permission columns show checkmark/X icons indicating granted permissions
5. **Expected:** Search input filters members in real-time
6. Test with empty state: **Expected:** Empty table body with no member rows

#### 11.3 Role Management Tab Testing

**Access Role Management:**
1. Click "Role Management" tab
2. **Expected:** Tab becomes active with role management interface
3. **Expected:** Shows grid layout of existing community roles as cards
4. **Expected:** Each role card displays:
   - Role name with shield icon
   - Permission count and member count statistics
   - List of all permissions with granted/denied status
   - Edit and Delete action buttons (Delete disabled for testing)
5. **Expected:** Empty state shows "No Roles Yet" message with create role guidance when no roles exist
6. **Expected:** "Create Role" button available in header or empty state

**Test Role Card Features:**
1. **Expected:** Permission list shows all permissions with clear granted/denied indicators
2. **Expected:** Statistics section shows permission count and member count
3. **Expected:** Edit button opens role editor with current values pre-populated
4. **Expected:** Role cards have hover effects and are visually appealing
5. **Expected:** All community roles displayed with consistent styling

#### 11.4 Role Creation and Editing Testing

**Access Role Creation:**
1. Click "Create Role" button from header or role management tab
2. **Expected:** Modal opens with "Create New Role" title
3. **Expected:** Modal contains three main sections:
   - Basic Information (Settings icon)
   - Role Templates (Shield icon) - only shown for new role creation
   - Permissions (Shield icon)

**Test Basic Information Section:**
1. **Expected:** "Role Name" text input with placeholder "Enter role name (e.g., Member, Moderator, Admin)"
2. **Expected:** Input marked as required
3. **Expected:** Create Role button disabled until name provided

**Test Built-in Role Templates Section (New Roles Only):**
1. **Expected:** Three built-in template buttons: Member, Moderator, Admin
2. **Expected:** Help text: "Quick-start with a pre-configured role template, then customize as needed."
3. Click "Moderator" template button
4. **Expected:** Button becomes selected/active state
5. **Expected:** Info alert appears with template description
6. **Expected:** Permission checkboxes automatically update to match template
7. **Expected:** Template selection is informational only - no custom template creation functionality

**Test Permission Configuration:**
1. **Expected:** Permissions organized into three groups with icons:
   - Content Management (Database icon): 5 permissions
   - Community Management (Users icon): 2 permissions  
   - Role Administration (Crown icon): 2 permissions
2. **Expected:** Each permission shows checkbox, name, and description
3. **Expected:** Template selection automatically checks appropriate permissions
4. Test manual permission changes:
   - Check/uncheck individual permissions
   - **Expected:** Template selection clears when manually modifying permissions

**Test Permission Categories:**
1. **Content Management permissions:**
   - Create Species: "Allow creation of new species and their configuration"
   - Edit Species: "Allow editing existing species, traits, and variants"
   - Create Characters: "Allow creation of new characters in the community"
   - Edit Any Character: "Allow editing any community member's characters"
   - Edit Own Characters: "Allow editing only characters owned by the member"

2. **Community Management permissions:**
   - Create Invite Codes: "Allow creation of community invitation codes"
   - View Invite Codes: "Allow viewing and managing existing invite codes"

3. **Role Administration permissions:**
   - Create Roles: "Allow creation of new community roles"
   - Edit Roles: "Allow editing existing community roles and permissions"

**Test Role Editing:**
1. Click "Edit" button on any role card in Role Management tab
2. **Expected:** Modal opens with "Edit Role" title
3. **Expected:** Role name and all permissions pre-populated with current values
4. **Expected:** No role templates section shown (only for new role creation)
5. **Expected:** All permission checkboxes reflect current role configuration
6. Modify permissions and save
7. **Expected:** Role updates successfully with confirmation

**Test Form Submission:**
1. Fill role name: "Test Moderator"
2. Select "Moderator" template or configure permissions manually
3. **Expected:** Create Role button becomes enabled
4. **Expected:** Info alert shows: "Changes to role permissions will apply to all members with this role."
5. Click "Create Role" button
6. **Expected:** Button shows loading state (if backend connected)
7. **Expected:** Form handles submission (success/error feedback)
8. **Expected:** New role appears in Role Management tab after creation

**Test Form Cancellation:**
1. Click "Cancel" button
2. **Expected:** Modal closes without saving
3. **Expected:** Returns to previous tab state
4. **Expected:** Form resets on next open

#### 11.5 Integration and Navigation Testing

**Test Tab Navigation:**
1. Click between the two tabs: Member Overview and Role Management
2. **Expected:** Active tab state changes correctly
3. **Expected:** Content switches without page reload
4. **Expected:** URLs remain stable during tab switching
5. **Expected:** Tab state preserved during modal interactions

**Test Modal Integration:**
1. Open Create Role modal from any tab
2. **Expected:** Modal renders over current tab content
3. **Expected:** Background tab content remains accessible after modal close
4. **Expected:** Modal doesn't interfere with tab navigation

**Test Responsive Design:**
1. Resize browser window to mobile/tablet sizes
2. **Expected:** Permission matrix adapts with horizontal scrolling
3. **Expected:** Role template cards reflow to single column
4. **Expected:** Modal remains usable on smaller screens
5. **Expected:** Tab navigation accessible on mobile

#### 11.6 Error Handling and Edge Cases

**Test Permission Validation:**
1. Access permission management with insufficient community permissions
2. **Expected:** Access denied or redirect with clear error message
3. **Expected:** No broken page states or exposed functionality
4. Test with user who has no community membership
5. **Expected:** Proper authorization checks prevent access

**Test Loading States:**
1. Navigate to permission management page
2. **Expected:** Loading states display during data fetch
3. **Expected:** Loading indicators for member data, role data
4. **Expected:** Graceful handling of loading failures

**Test Network Error Handling:**
1. Test permission management with network connectivity issues
2. **Expected:** Appropriate timeout and error messages
3. **Expected:** User can retry operations
4. **Expected:** No partial data states on failure

**Test GraphQL Error Handling:**
1. Monitor browser console during operations
2. **Expected:** GraphQL errors logged appropriately
3. **Expected:** User-friendly error messages displayed
4. **Expected:** No GraphQL query failures that crash the UI

#### 11.7 Community Context and Integration

**Test Community Context:**
1. Navigate to permission management for different communities
2. **Expected:** Page title and content properly scoped to community
3. **Expected:** Role and member data specific to selected community
4. **Expected:** No cross-community data leakage

**Test Community Admin Integration:**
1. Access from community admin dashboard
2. **Expected:** Proper navigation context maintained
3. **Expected:** Breadcrumb or back navigation available
4. **Expected:** Integration with other community management features

#### 11.8 Performance and Usability Testing

**Test Performance:**
1. Monitor page load times for permission management
2. **Expected:** Initial load under 3 seconds on fast connection
3. **Expected:** Tab switching responsive without lag
4. **Expected:** Modal open/close animations smooth
5. **Expected:** Search filtering responsive in real-time

**Test User Experience:**
1. **Expected:** Clear visual hierarchy between sections
2. **Expected:** Consistent styling with application theme
3. **Expected:** Intuitive icon usage throughout interface
4. **Expected:** Helpful placeholder text and descriptions
5. **Expected:** Logical workflow from templates to role creation
6. **Expected:** Clear feedback for all user actions

**Test Accessibility:**
1. **Expected:** Proper heading structure (H1, H2, H3, H4, H5)
2. **Expected:** Form labels associated with inputs
3. **Expected:** Keyboard navigation functional
4. **Expected:** Screen reader friendly content structure
5. **Expected:** Focus management in modals

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