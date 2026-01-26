import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  Check,
  ChevronDown,
  Search,
  Shield,
  Users,
  Database,
  Crown,
  X
} from 'lucide-react';
import {
  Heading5,
  Caption,
  HelpText,
  SmallText
} from '@chardb/ui';
import type { Role } from '../../generated/graphql';

/**
 * Permission Selector Component
 * 
 * Multi-select component for choosing permissions with categorization and search.
 * Provides bulk operations and visual grouping for better user experience.
 * 
 * Features:
 * - Multi-select with checkboxes
 * - Permission categorization
 * - Search and filter functionality  
 * - Select all/none operations
 * - Visual permission grouping
 * - Keyboard navigation support
 */

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
`;

const Header = styled.div<{ $expanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ $expanded }) => $expanded ? '8px 8px 0 0' : '8px'};
  border-bottom: ${({ theme, $expanded }) => 
    $expanded ? `1px solid ${theme.colors.border}` : 'none'};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
`;

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const SelectedCount = styled(Caption)`
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ExpandIcon = styled.div<{ $expanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.muted};
  transform: ${({ $expanded }) => $expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.2s ease;
`;

const DropdownContent = styled.div<{ $expanded: boolean }>`
  max-height: ${({ $expanded }) => $expanded ? '400px' : '0'};
  overflow: ${({ $expanded }) => $expanded ? 'visible' : 'hidden'};
  transition: max-height 0.2s ease;
`;

const SearchContainer = styled.div`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary}20;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.muted};
  pointer-events: none;
`;

const BulkActions = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const BulkButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primary}10;
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const PermissionGroups = styled.div`
  max-height: 250px;
  overflow-y: auto;
`;

const PermissionGroup = styled.div`
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem 0.5rem 1rem;
  background: ${({ theme }) => theme.colors.background}80;
`;

const GroupIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
`;

const GroupTitle = styled(Heading5)`
  margin: 0;
`;

const PermissionList = styled.div`
  padding: 0 1rem 0.75rem 1rem;
`;

const PermissionItem = styled.label<{ $filtered?: boolean }>`
  display: ${({ $filtered }) => $filtered ? 'none' : 'flex'};
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const PermissionCheckbox = styled.input.attrs({ type: 'checkbox' })`
  width: 1rem;
  height: 1rem;
  accent-color: ${({ theme }) => theme.colors.primary};
`;

const PermissionDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
`;

const PermissionName = styled(SmallText)`
  margin: 0;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const PermissionDescription = styled(Caption)`
  line-height: 1.3;
`;

/**
 * Extract all permission keys (can* boolean fields) from the Role type.
 * This ensures type safety - if a new permission is added to the backend,
 * TypeScript will error until it's added to PERMISSIONS_MAP.
 */
type PermissionKey = {
  [K in keyof Role]-?: K extends `can${string}`
    ? NonNullable<Role[K]> extends boolean ? K : never
    : never
}[keyof Role];

type PermissionCategory = 'content' | 'community' | 'administration';

interface PermissionInfo {
  name: string;
  description: string;
  category: PermissionCategory;
}

interface Permission extends PermissionInfo {
  key: string; // Use string for runtime compatibility, type safety enforced via PERMISSIONS_MAP
}

interface PermissionSelectorProps {
  selectedPermissions: string[];
  onPermissionChange: (permissions: string[]) => void;
  label?: string;
  helpText?: string;
  disabled?: boolean;
}

/**
 * Permission definitions map - uses Record<PermissionKey, ...> with satisfies
 * to ensure ALL permission keys from the Role type are included.
 * TypeScript will error if any permission is missing.
 */
const PERMISSIONS_MAP = {
  // Content Management
  canCreateSpecies: {
    name: 'Create Species',
    description: 'Allow creation of new species and their configuration',
    category: 'content'
  },
  canEditSpecies: {
    name: 'Edit Species',
    description: 'Allow editing existing species, traits, and variants',
    category: 'content'
  },
  canCreateCharacter: {
    name: 'Create Characters',
    description: 'Allow creation of new characters in the community',
    category: 'content'
  },
  canCreateOrphanedCharacter: {
    name: 'Create Orphaned Characters',
    description: 'Allow creation of characters without an owner (community/orphaned characters)',
    category: 'content'
  },
  canEditCharacter: {
    name: 'Edit Any Character',
    description: "Allow editing any community member's characters",
    category: 'content'
  },
  canEditOwnCharacter: {
    name: 'Edit Own Characters',
    description: 'Allow editing only characters owned by the member',
    category: 'content'
  },
  canManageItems: {
    name: 'Manage Items',
    description: 'Allow creation, editing, and deletion of item types',
    category: 'content'
  },
  canGrantItems: {
    name: 'Grant Items',
    description: 'Allow granting items to community members',
    category: 'content'
  },
  canUploadOwnCharacterImages: {
    name: 'Upload Own Character Images',
    description: 'Allow uploading images to characters owned by the member',
    category: 'content'
  },
  canUploadCharacterImages: {
    name: 'Upload Any Character Images',
    description: 'Allow uploading images to any character in the community',
    category: 'content'
  },
  // Community Management
  canCreateInviteCode: {
    name: 'Create Invite Codes',
    description: 'Allow creation of community invitation codes',
    category: 'community'
  },
  canListInviteCodes: {
    name: 'View Invite Codes',
    description: 'Allow viewing and managing existing invite codes',
    category: 'community'
  },
  canRemoveCommunityMember: {
    name: 'Remove Members',
    description: 'Allow removal of community members',
    category: 'community'
  },
  canManageMemberRoles: {
    name: 'Manage Member Roles',
    description: "Allow changing roles of community members",
    category: 'community'
  },
  // Role Administration
  canCreateRole: {
    name: 'Create Roles',
    description: 'Allow creation of new community roles',
    category: 'administration'
  },
  canEditRole: {
    name: 'Edit Roles',
    description: 'Allow editing existing community roles and permissions',
    category: 'administration'
  },
} as const satisfies Record<PermissionKey, PermissionInfo>;

// Derive the array from the map for use in the component
const ALL_PERMISSIONS: Permission[] = Object.entries(PERMISSIONS_MAP).map(
  ([key, info]) => ({
    key,
    ...info,
  })
);

const PERMISSION_CATEGORIES = {
  content: {
    title: 'Content Management',
    icon: Database,
    description: 'Permissions for managing community content and species'
  },
  community: {
    title: 'Community Management', 
    icon: Users,
    description: 'Permissions for managing community members and invitations'
  },
  administration: {
    title: 'Role Administration',
    icon: Crown,
    description: 'Permissions for managing community roles and permissions'
  }
};

export const PermissionSelector: React.FC<PermissionSelectorProps> = ({
  selectedPermissions,
  onPermissionChange,
  label = 'Permissions',
  helpText,
  disabled = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    ALL_PERMISSIONS.forEach(permission => {
      if (!grouped[permission.category]) {
        grouped[permission.category] = [];
      }
      grouped[permission.category].push(permission);
    });
    return grouped;
  }, []);

  // Filter permissions based on search
  const filteredPermissions = useMemo(() => {
    if (!searchTerm.trim()) return permissionsByCategory;
    
    const term = searchTerm.toLowerCase();
    const filtered: Record<string, Permission[]> = {};
    
    Object.entries(permissionsByCategory).forEach(([category, permissions]) => {
      const filteredPerms = permissions.filter(perm =>
        perm.name.toLowerCase().includes(term) ||
        perm.description.toLowerCase().includes(term) ||
        PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES]?.title.toLowerCase().includes(term)
      );
      
      if (filteredPerms.length > 0) {
        filtered[category] = filteredPerms;
      }
    });
    
    return filtered;
  }, [permissionsByCategory, searchTerm]);

  const handlePermissionToggle = (permissionKey: string) => {
    if (disabled) return;
    
    const newPermissions = selectedPermissions.includes(permissionKey)
      ? selectedPermissions.filter(p => p !== permissionKey)
      : [...selectedPermissions, permissionKey];
    
    onPermissionChange(newPermissions);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    
    const allVisiblePermissions = Object.values(filteredPermissions)
      .flat()
      .map(p => p.key);
    
    onPermissionChange([...new Set([...selectedPermissions, ...allVisiblePermissions])]);
  };

  const handleSelectNone = () => {
    if (disabled) return;
    
    const allVisiblePermissions = Object.values(filteredPermissions)
      .flat()
      .map(p => p.key);
    
    const newPermissions = selectedPermissions.filter(p => 
      !allVisiblePermissions.includes(p)
    );
    
    onPermissionChange(newPermissions);
  };

  const selectedCount = selectedPermissions.length;
  const totalCount = ALL_PERMISSIONS.length;

  return (
    <div>
      {label && <Heading5>{label}</Heading5>}
      {helpText && <HelpText>{helpText}</HelpText>}
      
      <Container>
        <Header $expanded={expanded} onClick={() => setExpanded(!expanded)}>
          <HeaderContent>
            <HeaderIcon>
              <Shield size={16} />
            </HeaderIcon>
            <HeaderText>
              <SmallText style={{ margin: 0, fontWeight: 500 }}>
                Select Permissions
              </SmallText>
              <SelectedCount>
                {selectedCount} of {totalCount} selected
              </SelectedCount>
            </HeaderText>
          </HeaderContent>
          <ExpandIcon $expanded={expanded}>
            <ChevronDown size={16} />
          </ExpandIcon>
        </Header>

        <DropdownContent $expanded={expanded}>
          <SearchContainer>
            <SearchIcon>
              <Search size={14} />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={disabled}
            />
          </SearchContainer>

          <BulkActions>
            <BulkButton onClick={handleSelectAll} disabled={disabled}>
              <Check size={12} />
              Select All Visible
            </BulkButton>
            <BulkButton onClick={handleSelectNone} disabled={disabled}>
              <X size={12} />
              Clear Visible
            </BulkButton>
          </BulkActions>

          <PermissionGroups>
            {Object.entries(filteredPermissions).map(([categoryKey, permissions]) => {
              const category = PERMISSION_CATEGORIES[categoryKey as keyof typeof PERMISSION_CATEGORIES];
              
              return (
                <PermissionGroup key={categoryKey}>
                  <GroupHeader>
                    <GroupIcon>
                      <category.icon size={12} />
                    </GroupIcon>
                    <GroupTitle>{category.title}</GroupTitle>
                  </GroupHeader>
                  
                  <PermissionList>
                    {permissions.map(permission => (
                      <PermissionItem key={permission.key}>
                        <PermissionCheckbox
                          checked={selectedPermissions.includes(permission.key)}
                          onChange={() => handlePermissionToggle(permission.key)}
                          disabled={disabled}
                        />
                        <PermissionDetails>
                          <PermissionName>{permission.name}</PermissionName>
                          <PermissionDescription>{permission.description}</PermissionDescription>
                        </PermissionDetails>
                      </PermissionItem>
                    ))}
                  </PermissionList>
                </PermissionGroup>
              );
            })}
          </PermissionGroups>
        </DropdownContent>
      </Container>
    </div>
  );
};