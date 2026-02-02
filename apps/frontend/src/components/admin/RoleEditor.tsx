import React, { useState, useEffect } from "react";
import styled from "styled-components";
import {
  Settings,
  Shield,
  Users,
  Database,
  Crown,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  Button,
  Input,
  ErrorMessage,
  Modal,
  Heading4,
  Heading5,
  SmallText,
  Caption,
  HelpText,
  Label,
} from "@chardb/ui";
import {
  useCreateRoleMutation,
  useUpdateRoleMutation,
  CreateRoleInput,
  UpdateRoleInput,
  RolesByCommunityDetailedDocument,
} from "../../generated/graphql";
import {
  getPermissionsByCategory,
  PERMISSION_CATEGORIES,
  ALL_PERMISSIONS,
  type PermissionKey,
} from "../../lib/permissions";

/**
 * Role Editor Component
 *
 * Comprehensive role creation and editing interface with permission management.
 * Uses shared UI components for consistency across the application.
 *
 * Features:
 * - Create new roles with permission configuration
 * - Edit existing roles and permissions
 * - Visual permission grouping by category
 * - Role templates for common configurations
 * - Permission descriptions and help text
 * - Form validation and error handling
 */

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const SectionTitleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SectionIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
`;

const PermissionGroups = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const PermissionGroup = styled.div`
  padding: 1rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
`;

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const GroupIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
`;

const GroupDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const PermissionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const PermissionItem = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }
`;

const PermissionCheckbox = styled.input.attrs({ type: "checkbox" })`
  width: 1rem;
  height: 1rem;
  margin-top: 0.125rem;
  accent-color: ${({ theme }) => theme.colors.primary};
`;

const PermissionDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
`;

const PermissionName = styled(SmallText)`
  font-weight: 500;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const PermissionDescription = styled(Caption)`
  line-height: 1.3;
`;

const RoleTemplates = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const TemplateButton = styled.button<{ $selected?: boolean }>`
  padding: 0.5rem 0.75rem;
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.primary + "20" : theme.colors.surface};
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.primary : theme.colors.text.primary};
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primary}20;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const FooterButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
`;

const InfoAlert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  background: ${({ theme }) => theme.colors.info}20;
  border: 1px solid ${({ theme }) => theme.colors.info}40;
  border-radius: 6px;
  margin-bottom: 1rem;
  
  ${Caption} {
    color: ${({ theme }) => theme.colors.text.primary} !important;
  }
`;

const InfoIcon = styled.div`
  color: ${({ theme }) => theme.colors.info};
  flex-shrink: 0;
`;

// Type for the minimum role fields needed for editing
// Uses PermissionKey to ensure all permissions are included - TypeScript will
// error if a new permission is added to the backend but not handled here
type EditableRole = {
  id: string;
  name: string;
} & Record<PermissionKey, boolean>;

interface RoleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  communityId: string;
  editingRole?: EditableRole | null;
}

// Permission groups derived from shared permissions with icons added
const PERMISSION_GROUPS = [
  {
    ...PERMISSION_CATEGORIES.content,
    icon: Database,
    permissions: getPermissionsByCategory("content"),
  },
  {
    ...PERMISSION_CATEGORIES.community,
    icon: Users,
    permissions: getPermissionsByCategory("community"),
  },
  {
    ...PERMISSION_CATEGORIES.administration,
    icon: Crown,
    permissions: getPermissionsByCategory("administration"),
  },
];

// Role templates for quick configuration
// Uses Record<PermissionKey, boolean> to ensure all permissions are defined
const ROLE_TEMPLATES: Array<{
  name: string;
  description: string;
  permissions: Record<PermissionKey, boolean>;
}> = [
  {
    name: "Member",
    description: "Basic member with character creation rights",
    permissions: {
      canCreateCharacter: true,
      canCreateOrphanedCharacter: false,
      canEditOwnCharacter: true,
      canEditCharacter: false,
      canEditOwnCharacterRegistry: false,
      canEditCharacterRegistry: false,
      canCreateSpecies: false,
      canEditSpecies: false,
      canManageItems: false,
      canGrantItems: false,
      canUploadOwnCharacterImages: true,
      canUploadCharacterImages: false,
      canCreateInviteCode: false,
      canListInviteCodes: false,
      canCreateRole: false,
      canEditRole: false,
      canRemoveCommunityMember: false,
      canManageMemberRoles: false,
    },
  },
  {
    name: "Moderator",
    description: "Trusted member with content moderation abilities",
    permissions: {
      canCreateCharacter: true,
      canCreateOrphanedCharacter: false,
      canEditOwnCharacter: true,
      canEditCharacter: true,
      canEditOwnCharacterRegistry: true,
      canEditCharacterRegistry: true,
      canCreateSpecies: false,
      canEditSpecies: true,
      canManageItems: false,
      canGrantItems: true,
      canUploadOwnCharacterImages: true,
      canUploadCharacterImages: true,
      canCreateInviteCode: true,
      canListInviteCodes: true,
      canCreateRole: false,
      canEditRole: false,
      canRemoveCommunityMember: false,
      canManageMemberRoles: false,
    },
  },
  {
    name: "Admin",
    description: "Full administrative access to all features",
    permissions: {
      canCreateCharacter: true,
      canCreateOrphanedCharacter: true,
      canEditOwnCharacter: true,
      canEditCharacter: true,
      canEditOwnCharacterRegistry: true,
      canEditCharacterRegistry: true,
      canCreateSpecies: true,
      canEditSpecies: true,
      canManageItems: true,
      canGrantItems: true,
      canUploadOwnCharacterImages: true,
      canUploadCharacterImages: true,
      canCreateInviteCode: true,
      canListInviteCodes: true,
      canCreateRole: true,
      canEditRole: true,
      canRemoveCommunityMember: true,
      canManageMemberRoles: true,
    },
  },
];

export const RoleEditor: React.FC<RoleEditorProps> = ({
  isOpen,
  onClose,
  onSuccess,
  communityId,
  editingRole,
}) => {
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [createRole, { loading: creating }] = useCreateRoleMutation();
  const [updateRole, { loading: updating }] = useUpdateRoleMutation();

  const isEditing = !!editingRole;
  const isLoading = creating || updating;

  // Initialize form when editing
  // Uses ALL_PERMISSIONS to dynamically build permissions object, ensuring
  // new permissions are automatically included without manual updates
  useEffect(() => {
    if (editingRole) {
      setRoleName(editingRole.name);
      setPermissions(
        ALL_PERMISSIONS.reduce(
          (acc, perm) => {
            acc[perm.key] = editingRole[perm.key as PermissionKey];
            return acc;
          },
          {} as Record<string, boolean>
        )
      );
    } else {
      // Reset form for new role
      setRoleName("");
      setPermissions({});
      setSelectedTemplate("");
    }
    setError("");
  }, [editingRole, isOpen]);

  const handleTemplateSelect = (templateName: string) => {
    const template = ROLE_TEMPLATES.find((t) => t.name === templateName);
    if (template) {
      setSelectedTemplate(templateName);
      setPermissions(template.permissions);
      if (!isEditing && !roleName) {
        setRoleName(templateName);
      }
    }
  };

  const handlePermissionChange = (permissionKey: string, checked: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [permissionKey]: checked,
    }));
    // Clear template selection when manually changing permissions
    setSelectedTemplate("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!roleName.trim()) {
      setError("Role name is required");
      return;
    }

    try {
      if (isEditing && editingRole) {
        const updateInput: UpdateRoleInput = {
          name: roleName,
          ...permissions,
        };

        await updateRole({
          variables: {
            id: editingRole.id,
            input: updateInput,
          },
          refetchQueries: [
            {
              query: RolesByCommunityDetailedDocument,
              variables: { communityId, first: 50, after: null },
            },
          ],
        });
      } else {
        const createInput: CreateRoleInput = {
          name: roleName,
          communityId,
          ...permissions,
        };

        await createRole({
          variables: {
            input: createInput,
          },
          refetchQueries: [
            {
              query: RolesByCommunityDetailedDocument,
              variables: { communityId, first: 50, after: null },
            },
          ],
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to save role:", err);
      setError(err.message || "Failed to save role");
    }
  };

  const modalTitle = isEditing ? "Edit Role" : "Create New Role";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit}>
        <FormContainer>
          <FormSection>
            <SectionTitleContainer>
              <SectionIcon>
                <Settings size={16} />
              </SectionIcon>
              <Heading4>Basic Information</Heading4>
            </SectionTitleContainer>
            <Label htmlFor="role-name">Role Name</Label>
            <Input
              id="role-name"
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="Enter role name (e.g., Member, Moderator, Admin)"
              required
              disabled={isLoading}
            />
          </FormSection>

          {!isEditing && (
            <FormSection>
              <SectionTitleContainer>
                <SectionIcon>
                  <Shield size={16} />
                </SectionIcon>
                <Heading4>Role Templates</Heading4>
              </SectionTitleContainer>
              <HelpText>
                Quick-start with a pre-configured role template, then customize
                as needed.
              </HelpText>
              <RoleTemplates>
                {ROLE_TEMPLATES.map((template) => (
                  <TemplateButton
                    key={template.name}
                    type="button"
                    $selected={selectedTemplate === template.name}
                    onClick={() => handleTemplateSelect(template.name)}
                    disabled={isLoading}
                  >
                    {template.name}
                  </TemplateButton>
                ))}
              </RoleTemplates>
              {selectedTemplate && (
                <InfoAlert>
                  <InfoIcon>
                    <Info size={14} />
                  </InfoIcon>
                  <Caption>
                    {
                      ROLE_TEMPLATES.find((t) => t.name === selectedTemplate)
                        ?.description
                    }
                  </Caption>
                </InfoAlert>
              )}
            </FormSection>
          )}

          <FormSection>
            <SectionTitleContainer>
              <SectionIcon>
                <Shield size={16} />
              </SectionIcon>
              <Heading4>Permissions</Heading4>
            </SectionTitleContainer>
            <HelpText>
              Configure what actions members with this role can perform in the
              community.
            </HelpText>

            <PermissionGroups>
              {PERMISSION_GROUPS.map((group) => (
                <PermissionGroup key={group.id}>
                  <GroupHeader>
                    <GroupIcon>
                      <group.icon size={14} />
                    </GroupIcon>
                    <GroupDetails>
                      <Heading5>{group.title}</Heading5>
                      <Caption>{group.description}</Caption>
                    </GroupDetails>
                  </GroupHeader>

                  <PermissionList>
                    {group.permissions.map((permission) => (
                      <PermissionItem key={permission.key}>
                        <PermissionCheckbox
                          checked={!!permissions[permission.key]}
                          onChange={(e) =>
                            handlePermissionChange(
                              permission.key,
                              e.target.checked
                            )
                          }
                          disabled={isLoading}
                        />
                        <PermissionDetails>
                          <PermissionName>{permission.name}</PermissionName>
                          <PermissionDescription>
                            {permission.description}
                          </PermissionDescription>
                        </PermissionDetails>
                      </PermissionItem>
                    ))}
                  </PermissionList>
                </PermissionGroup>
              ))}
            </PermissionGroups>
          </FormSection>

          {error && <ErrorMessage message={error} />}

          <InfoAlert>
            <InfoIcon>
              <AlertCircle size={14} />
            </InfoIcon>
            <Caption>
              Changes to role permissions will apply to all members with this
              role.
            </Caption>
          </InfoAlert>

          <FooterButtons>
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading || !roleName.trim()}
              loading={isLoading}
            >
              {isEditing ? "Update Role" : "Create Role"}
            </Button>
          </FooterButtons>
        </FormContainer>
      </form>
    </Modal>
  );
};