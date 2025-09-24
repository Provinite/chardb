# Sidebar Navigation Proof of Concept

## Overview
Building a proof of concept for the contextual sidebar navigation system outlined in Issue 61. This will serve as a testing ground before implementing the full solution.

## Current Progress

### ✅ Completed
1. **Base Page Setup**
   - Created `SidebarNavPage` component
   - Added route `/sidebar` to App.tsx for testing

2. **Base Component**
   - Created `SidebarNav` stub component in `/components/SidebarNav.tsx`

### 🚧 In Progress
3. **Child Components for Navigation Items**
   - Need to create reusable sidebar item components
   - Items should link statically for POC testing
   - Focus on layout and styling, not dynamic functionality

### 📋 Next Steps
4. **Static Navigation Structure**
   - Community header/switcher area
   - Navigation groups (Overview, Community, Species, Admin)
   - Individual navigation items with icons and labels

5. **Dynamic Linking via Props**
   - Convert static links to props-based system
   - Pass navigation data down through components
   - Prepare for real route integration

6. **Styling & Layout**
   - Responsive sidebar layout
   - Visual hierarchy for navigation groups
   - Active/hover states for items

## File Structure
```
apps/frontend/src/
├── pages/
│   └── SidebarNavPage.tsx          # POC test page
├── components/
│   ├── SidebarNav.tsx              # Main sidebar container
│   ├── SidebarNavItem.tsx          # Individual nav items (to create)
│   ├── SidebarNavGroup.tsx         # Navigation sections (to create)
│   └── SidebarNavHeader.tsx        # Community header (to create)
└── SIDEBAR_POC.md                  # This documentation
```

## POC Goals
- Test sidebar layout and responsive behavior
- Validate navigation hierarchy and grouping
- Experiment with styling and visual design
- Create reusable component patterns for full implementation

## Static Navigation Items (for POC)
- **Header**: "Tunnel Snakes" community
- **Overview**: Link to community overview
- **Community**
  - Members
  - Invite Codes
  - Settings
- **Species & Characters**
  - Species Management
  - Tunnel Snake species
- **Administration**
  - Dashboard
  - Permissions
  - Moderation
- **Back to Global**