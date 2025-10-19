import React, { useState } from 'react';
import styled from 'styled-components';
import { FileText, Plus, Edit3, Copy, Trash2, Check, Star } from 'lucide-react';
import {
  Button,
  Modal,
  Input,
  Heading3,
  Heading4,
  SmallText,
  Caption,
  Card,
  Label,
} from '@chardb/ui';
import { PermissionSelector } from './PermissionSelector';

/**
 * Role Template Manager Component
 *
 * Manages predefined role templates that can be used for quick role creation.
 * Templates store common permission combinations with descriptive names.
 *
 * Features:
 * - Create custom role templates
 * - Edit existing templates
 * - Clone templates for variation
 * - Apply templates to new roles
 * - Built-in system templates
 * - Visual template previews
 * - Import/export functionality
 */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
`;

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const TemplateCard = styled(Card)`
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${({ theme }) => theme.colors.primary}20;
  }
`;

const TemplateHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const TemplateInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
`;

const TemplateName = styled(Heading4)`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SystemBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  background: ${({ theme }) => theme.colors.warning}20;
  color: ${({ theme }) => theme.colors.warning};
  border-radius: 12px;
  font-size: 0.625rem;
  font-weight: 500;
`;

const TemplateDescription = styled(SmallText)`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const TemplateActions = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.muted};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.primary}10;
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const PermissionSummary = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 0.75rem;
`;

const PermissionChip = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: ${({ theme }) => theme.colors.success}20;
  color: ${({ theme }) => theme.colors.success};
  border-radius: 12px;
  font-size: 0.625rem;
  font-weight: 500;
`;

const TemplateFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const PermissionCount = styled(Caption)`
  color: ${({ theme }) => theme.colors.text.muted};
`;

const UseButton = styled(Button)`
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
`;

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

interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface RoleTemplateManagerProps {
  onTemplateApply?: (template: RoleTemplate) => void;
  allowEditing?: boolean;
}

// Default system templates
const SYSTEM_TEMPLATES: RoleTemplate[] = [
  {
    id: 'template-member',
    name: 'Basic Member',
    description: 'Standard community member with character creation rights',
    permissions: ['canCreateCharacter', 'canEditOwnCharacter'],
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'template-moderator',
    name: 'Moderator',
    description: 'Trusted member with content moderation abilities',
    permissions: [
      'canCreateCharacter',
      'canEditOwnCharacter',
      'canEditCharacter',
      'canEditSpecies',
      'canCreateInviteCode',
      'canListInviteCodes',
    ],
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'template-admin',
    name: 'Administrator',
    description: 'Full administrative access to all community features',
    permissions: [
      'canCreateCharacter',
      'canEditOwnCharacter',
      'canEditCharacter',
      'canCreateSpecies',
      'canEditSpecies',
      'canCreateInviteCode',
      'canListInviteCodes',
      'canCreateRole',
      'canEditRole',
    ],
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'template-content-creator',
    name: 'Content Creator',
    description: 'Focused on species and character content creation',
    permissions: [
      'canCreateCharacter',
      'canEditOwnCharacter',
      'canCreateSpecies',
      'canEditSpecies',
    ],
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Permission labels for display
const PERMISSION_LABELS: Record<string, string> = {
  canCreateSpecies: 'Create Species',
  canCreateCharacter: 'Create Characters',
  canEditCharacter: 'Edit Characters',
  canEditOwnCharacter: 'Edit Own Characters',
  canEditSpecies: 'Edit Species',
  canCreateInviteCode: 'Create Invites',
  canListInviteCodes: 'View Invites',
  canCreateRole: 'Create Roles',
  canEditRole: 'Edit Roles',
};

export const RoleTemplateManager: React.FC<RoleTemplateManagerProps> = ({
  onTemplateApply,
  allowEditing = true,
}) => {
  const [templates, setTemplates] = useState<RoleTemplate[]>(SYSTEM_TEMPLATES);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RoleTemplate | null>(
    null,
  );

  // Form state
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const handleCreateTemplate = () => {
    setTemplateName('');
    setTemplateDescription('');
    setSelectedPermissions([]);
    setEditingTemplate(null);
    setShowCreateModal(true);
  };

  const handleEditTemplate = (template: RoleTemplate) => {
    if (template.isSystem && !allowEditing) return;

    setTemplateName(template.name);
    setTemplateDescription(template.description);
    setSelectedPermissions(template.permissions);
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleCloneTemplate = (template: RoleTemplate) => {
    setTemplateName(`${template.name} (Copy)`);
    setTemplateDescription(template.description);
    setSelectedPermissions(template.permissions);
    setEditingTemplate(null);
    setShowCreateModal(true);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      setTemplates(templates.filter((t) => t.id !== templateId));
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim() || selectedPermissions.length === 0) return;

    const now = new Date();

    if (editingTemplate) {
      // Update existing template
      setTemplates(
        templates.map((t) =>
          t.id === editingTemplate.id
            ? {
                ...t,
                name: templateName,
                description: templateDescription,
                permissions: selectedPermissions,
                updatedAt: now,
              }
            : t,
        ),
      );
    } else {
      // Create new template
      const newTemplate: RoleTemplate = {
        id: `template-${Date.now()}`,
        name: templateName,
        description: templateDescription,
        permissions: selectedPermissions,
        isSystem: false,
        createdAt: now,
        updatedAt: now,
      };

      setTemplates([...templates, newTemplate]);
    }

    setShowCreateModal(false);
  };

  const handleApplyTemplate = (template: RoleTemplate) => {
    onTemplateApply?.(template);
  };

  const getPermissionChips = (permissions: string[]) => {
    return permissions.slice(0, 3).map((perm) => (
      <PermissionChip key={perm}>
        <Check size={10} />
        {PERMISSION_LABELS[perm] || perm}
      </PermissionChip>
    ));
  };

  return (
    <Container>
      <Header>
        <HeaderContent>
          <HeaderIcon>
            <FileText size={20} />
          </HeaderIcon>
          <div>
            <Heading3>Role Templates</Heading3>
            <SmallText style={{ margin: 0, color: 'muted' }}>
              Predefined role configurations for quick setup
            </SmallText>
          </div>
        </HeaderContent>

        {allowEditing && (
          <Button
            variant="primary"
            onClick={handleCreateTemplate}
            icon={<Plus size={16} />}
          >
            Create Template
          </Button>
        )}
      </Header>

      <TemplateGrid>
        {templates.map((template) => (
          <TemplateCard key={template.id}>
            <TemplateHeader>
              <TemplateInfo>
                <TemplateName>
                  {template.name}
                  {template.isSystem && (
                    <SystemBadge>
                      <Star size={10} />
                      System
                    </SystemBadge>
                  )}
                </TemplateName>
                <TemplateDescription>
                  {template.description}
                </TemplateDescription>
              </TemplateInfo>

              <TemplateActions>
                {allowEditing && (
                  <>
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloneTemplate(template);
                      }}
                      title="Clone template"
                    >
                      <Copy size={12} />
                    </ActionButton>

                    {(!template.isSystem || allowEditing) && (
                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTemplate(template);
                        }}
                        title="Edit template"
                      >
                        <Edit3 size={12} />
                      </ActionButton>
                    )}

                    {!template.isSystem && (
                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        title="Delete template"
                        style={{ color: 'var(--colors-danger)' }}
                      >
                        <Trash2 size={12} />
                      </ActionButton>
                    )}
                  </>
                )}
              </TemplateActions>
            </TemplateHeader>

            <PermissionSummary>
              {getPermissionChips(template.permissions)}
              {template.permissions.length > 3 && (
                <PermissionChip>
                  +{template.permissions.length - 3} more
                </PermissionChip>
              )}
            </PermissionSummary>

            <TemplateFooter>
              <PermissionCount>
                {template.permissions.length} permissions
              </PermissionCount>

              {onTemplateApply && (
                <UseButton
                  variant="outline"
                  onClick={() => handleApplyTemplate(template)}
                >
                  Use Template
                </UseButton>
              )}
            </TemplateFooter>
          </TemplateCard>
        ))}
      </TemplateGrid>

      {/* Create/Edit Template Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
      >
        <FormContainer>
          <FormSection>
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter template name"
              required
            />
          </FormSection>

          <FormSection>
            <Label htmlFor="template-description">Description</Label>
            <Input
              id="template-description"
              type="text"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Describe this role template"
            />
          </FormSection>

          <FormSection>
            <PermissionSelector
              selectedPermissions={selectedPermissions}
              onPermissionChange={setSelectedPermissions}
              label="Template Permissions"
              helpText="Select the permissions that should be included in this template"
            />
          </FormSection>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
            }}
          >
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveTemplate}
              disabled={
                !templateName.trim() || selectedPermissions.length === 0
              }
            >
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </FormContainer>
      </Modal>
    </Container>
  );
};
