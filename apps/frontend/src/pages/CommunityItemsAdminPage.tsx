import React, { useState } from "react";
import styled from "styled-components";
import { useParams } from "react-router-dom";
import { Package, Plus, Edit2, Trash2, Gift } from "lucide-react";
import { Button, Card } from "@chardb/ui";
import { GrantTargetSelector, GrantTarget } from "../components/GrantTargetSelector";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ColorSelector, ColorPip } from "../components/colors";
import { useQuery, useMutation } from "@apollo/client";
import { toast } from "react-hot-toast";
import {
  GET_ITEM_TYPES,
  CREATE_ITEM_TYPE,
  UPDATE_ITEM_TYPE,
  DELETE_ITEM_TYPE,
  GRANT_ITEM,
} from "../graphql/items.graphql";
import {
  useCommunityByIdQuery,
  useGetCommunityMembersQuery,
} from "../graphql/communities.graphql";

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const Section = styled.div`
  margin-bottom: 3rem;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const ItemTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const ItemTypeCard = styled(Card)`
  position: relative;
`;

const ItemTypeHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ItemTypeIcon = styled.div<{ color?: string }>`
  width: 3rem;
  height: 3rem;
  border-radius: 8px;
  background: ${({ color, theme }) => color || theme.colors.primary}20;
  border: 2px solid ${({ color, theme }) => color || theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ItemTypeImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
`;

const ItemTypeInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemTypeName = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.25rem 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ItemTypeCategory = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ItemTypeDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 1rem 0;
  line-height: 1.5;
  font-size: 0.875rem;
`;

const ItemTypeProperties = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const PropertyBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const ItemTypeActions = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

const Modal = styled.div<{ isOpen: boolean }>`
  display: ${({ isOpen }) => (isOpen ? "flex" : "none")};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.colors.background};
  padding: 2rem;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 1.5rem 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.surface};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.surface};
  min-height: 100px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Checkbox = styled.input.attrs({ type: "checkbox" })`
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const FormActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

export const CommunityItemsAdminPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<any>(null);

  const { data: communityData, loading: communityLoading } =
    useCommunityByIdQuery({
      variables: { id: communityId! },
      skip: !communityId,
    });

  const {
    data: itemTypesData,
    loading: itemTypesLoading,
    refetch: refetchItemTypes,
  } = useQuery(GET_ITEM_TYPES, {
    variables: { filters: { communityId } },
    skip: !communityId,
  });

  const [createItemType] = useMutation(CREATE_ITEM_TYPE);
  const [updateItemType] = useMutation(UPDATE_ITEM_TYPE);
  const [deleteItemType] = useMutation(DELETE_ITEM_TYPE);
  const [grantItem] = useMutation(GRANT_ITEM);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    isStackable: true,
    maxStackSize: "",
    isTradeable: true,
    isConsumable: false,
    imageUrl: "",
    iconUrl: "",
    colorId: null as string | null,
  });

  const [grantFormData, setGrantFormData] = useState({
    itemTypeId: "",
    quantity: "1",
  });

  const [grantTarget, setGrantTarget] = useState<GrantTarget | null>(null);
  const [isGrantTargetValid, setIsGrantTargetValid] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const { data: membersData, loading: membersLoading } =
    useGetCommunityMembersQuery({
      variables: {
        communityId: communityId!,
        search: userSearch,
        limit: 10,
      },
      skip: !communityId || !userSearch || userSearch.length < 2,
    });

  const handleCreateItemType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createItemType({
        variables: {
          input: {
            ...formData,
            communityId,
            maxStackSize: formData.maxStackSize
              ? parseInt(formData.maxStackSize)
              : null,
          },
        },
      });
      setIsCreateModalOpen(false);
      setFormData({
        name: "",
        description: "",
        category: "",
        isStackable: true,
        maxStackSize: "",
        isTradeable: true,
        isConsumable: false,
        imageUrl: "",
        iconUrl: "",
        colorId: null,
      });
      refetchItemTypes();
    } catch (error) {
      console.error("Failed to create item type:", error);
    }
  };

  const handleUpdateItemType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemType) return;

    try {
      await updateItemType({
        variables: {
          id: selectedItemType.id,
          input: {
            ...formData,
            maxStackSize: formData.maxStackSize
              ? parseInt(formData.maxStackSize)
              : null,
          },
        },
      });
      setIsEditModalOpen(false);
      setSelectedItemType(null);
      refetchItemTypes();
    } catch (error) {
      console.error("Failed to update item type:", error);
    }
  };

  const handleDeleteItemType = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item type?"))
      return;

    try {
      await deleteItemType({ variables: { id } });
      toast.success("Item type deleted successfully");
      refetchItemTypes();
    } catch (error) {
      console.error("Failed to delete item type:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete item type",
      );
    }
  };

  const handleGrantItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!grantTarget) {
      toast.error("Please select a grant target");
      return;
    }

    if (grantTarget.type === 'pending' && !isGrantTargetValid) {
      toast.error("Please verify the Discord account before granting");
      return;
    }

    try {
      // Build mutation input based on target type
      const input: any = {
        itemTypeId: grantFormData.itemTypeId,
        quantity: parseInt(grantFormData.quantity),
      };

      if (grantTarget.type === 'user') {
        input.userId = grantTarget.userId;
      } else if (grantTarget.type === 'pending') {
        input.userId = null; // Orphaned item
        input.pendingOwner = {
          provider: grantTarget.provider,
          providerAccountId: grantTarget.providerAccountId,
        };
      }

      await grantItem({
        variables: { input },
      });
      toast.success("Item granted successfully!");
      setIsGrantModalOpen(false);
      setGrantFormData({
        itemTypeId: "",
        quantity: "1",
      });
      setGrantTarget(null);
    } catch (error) {
      console.error("Failed to grant item:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to grant item",
      );
    }
  };

  const openEditModal = (itemType: any) => {
    setSelectedItemType(itemType);
    setFormData({
      name: itemType.name,
      description: itemType.description || "",
      category: itemType.category || "",
      isStackable: itemType.isStackable,
      maxStackSize: itemType.maxStackSize?.toString() || "",
      isTradeable: itemType.isTradeable,
      isConsumable: itemType.isConsumable,
      imageUrl: itemType.imageUrl || "",
      iconUrl: itemType.iconUrl || "",
      colorId: itemType.colorId || null,
    });
    setIsEditModalOpen(true);
  };

  const openGrantModal = (itemType: any) => {
    setGrantFormData({
      ...grantFormData,
      itemTypeId: itemType.id,
    });
    setIsGrantModalOpen(true);
  };

  if (communityLoading || itemTypesLoading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
      </LoadingContainer>
    );
  }

  const itemTypes = itemTypesData?.itemTypes?.itemTypes || [];

  return (
    <Container>
      <Header>
        <Title>Item Types Administration</Title>
        <Subtitle>
          Manage item types and grant items to users in{" "}
          {communityData?.community?.name}
        </Subtitle>
      </Header>

      <Section>
        <SectionHeader>
          <SectionTitle>Item Types</SectionTitle>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={16} /> Create Item Type
          </Button>
        </SectionHeader>

        {itemTypes.length === 0 ? (
          <EmptyState>
            <Package
              size={48}
              style={{ margin: "0 auto 1rem", opacity: 0.5 }}
            />
            <p>No item types yet. Create one to get started!</p>
          </EmptyState>
        ) : (
          <ItemTypeGrid>
            {itemTypes.map((itemType: any) => (
              <ItemTypeCard key={itemType.id}>
                <ItemTypeHeader>
                  <ItemTypeIcon color={itemType.color?.hexCode}>
                    {itemType.iconUrl ? (
                      <ItemTypeImage
                        src={itemType.iconUrl}
                        alt={itemType.name}
                      />
                    ) : (
                      <Package size={24} />
                    )}
                  </ItemTypeIcon>
                  <ItemTypeInfo>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ItemTypeName title={itemType.name}>{itemType.name}</ItemTypeName>
                      {itemType.color && (
                        <ColorPip color={itemType.color.hexCode} size="sm" />
                      )}
                    </div>
                    {itemType.category && (
                      <ItemTypeCategory>{itemType.category}</ItemTypeCategory>
                    )}
                  </ItemTypeInfo>
                </ItemTypeHeader>

                {itemType.description && (
                  <ItemTypeDescription>
                    {itemType.description}
                  </ItemTypeDescription>
                )}

                <ItemTypeProperties>
                  {itemType.isStackable && (
                    <PropertyBadge>Stackable</PropertyBadge>
                  )}
                  {itemType.maxStackSize && (
                    <PropertyBadge>Max: {itemType.maxStackSize}</PropertyBadge>
                  )}
                  {itemType.isTradeable && (
                    <PropertyBadge>Tradeable</PropertyBadge>
                  )}
                  {itemType.isConsumable && (
                    <PropertyBadge>Consumable</PropertyBadge>
                  )}
                </ItemTypeProperties>

                <ItemTypeActions>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openGrantModal(itemType)}
                  >
                    <Gift size={14} /> Grant
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEditModal(itemType)}
                  >
                    <Edit2 size={14} /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDeleteItemType(itemType.id)}
                  >
                    <Trash2 size={14} /> Delete
                  </Button>
                </ItemTypeActions>
              </ItemTypeCard>
            ))}
          </ItemTypeGrid>
        )}
      </Section>

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen}>
        <ModalContent>
          <ModalTitle>Create Item Type</ModalTitle>
          <Form onSubmit={handleCreateItemType}>
            <FormGroup>
              <Label>Name *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </FormGroup>

            <FormGroup>
              <Label>Description</Label>
              <TextArea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </FormGroup>

            <FormGroup>
              <Label>Category</Label>
              <Input
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              />
            </FormGroup>

            <FormGroup>
              <CheckboxLabel>
                <Checkbox
                  checked={formData.isStackable}
                  onChange={(e) =>
                    setFormData({ ...formData, isStackable: e.target.checked })
                  }
                />
                Stackable
              </CheckboxLabel>
            </FormGroup>

            {formData.isStackable && (
              <FormGroup>
                <Label>Max Stack Size</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.maxStackSize}
                  onChange={(e) =>
                    setFormData({ ...formData, maxStackSize: e.target.value })
                  }
                />
              </FormGroup>
            )}

            <FormGroup>
              <CheckboxLabel>
                <Checkbox
                  checked={formData.isTradeable}
                  onChange={(e) =>
                    setFormData({ ...formData, isTradeable: e.target.checked })
                  }
                />
                Tradeable
              </CheckboxLabel>
            </FormGroup>

            <FormGroup>
              <CheckboxLabel>
                <Checkbox
                  checked={formData.isConsumable}
                  onChange={(e) =>
                    setFormData({ ...formData, isConsumable: e.target.checked })
                  }
                />
                Consumable
              </CheckboxLabel>
            </FormGroup>

            <FormGroup>
              <Label>Icon URL</Label>
              <Input
                type="url"
                value={formData.iconUrl}
                onChange={(e) =>
                  setFormData({ ...formData, iconUrl: e.target.value })
                }
              />
            </FormGroup>

            <ColorSelector
              communityId={communityId!}
              value={formData.colorId}
              onChange={(colorId) => setFormData({ ...formData, colorId })}
              label="Color (optional)"
              placeholder="No color"
            />

            <FormActions>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </FormActions>
          </Form>
        </ModalContent>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen}>
        <ModalContent>
          <ModalTitle>Edit Item Type</ModalTitle>
          <Form onSubmit={handleUpdateItemType}>
            <FormGroup>
              <Label>Name *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </FormGroup>

            <FormGroup>
              <Label>Description</Label>
              <TextArea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </FormGroup>

            <FormGroup>
              <Label>Category</Label>
              <Input
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              />
            </FormGroup>

            <FormGroup>
              <CheckboxLabel>
                <Checkbox
                  checked={formData.isStackable}
                  onChange={(e) =>
                    setFormData({ ...formData, isStackable: e.target.checked })
                  }
                />
                Stackable
              </CheckboxLabel>
            </FormGroup>

            {formData.isStackable && (
              <FormGroup>
                <Label>Max Stack Size</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.maxStackSize}
                  onChange={(e) =>
                    setFormData({ ...formData, maxStackSize: e.target.value })
                  }
                />
              </FormGroup>
            )}

            <FormGroup>
              <CheckboxLabel>
                <Checkbox
                  checked={formData.isTradeable}
                  onChange={(e) =>
                    setFormData({ ...formData, isTradeable: e.target.checked })
                  }
                />
                Tradeable
              </CheckboxLabel>
            </FormGroup>

            <FormGroup>
              <CheckboxLabel>
                <Checkbox
                  checked={formData.isConsumable}
                  onChange={(e) =>
                    setFormData({ ...formData, isConsumable: e.target.checked })
                  }
                />
                Consumable
              </CheckboxLabel>
            </FormGroup>

            <FormGroup>
              <Label>Icon URL</Label>
              <Input
                type="url"
                value={formData.iconUrl}
                onChange={(e) =>
                  setFormData({ ...formData, iconUrl: e.target.value })
                }
              />
            </FormGroup>

            <ColorSelector
              communityId={communityId!}
              value={formData.colorId}
              onChange={(colorId) => setFormData({ ...formData, colorId })}
              label="Color (optional)"
              placeholder="No color"
            />

            <FormActions>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </FormActions>
          </Form>
        </ModalContent>
      </Modal>

      {/* Grant Item Modal */}
      <Modal isOpen={isGrantModalOpen}>
        <ModalContent>
          <ModalTitle>Grant Item</ModalTitle>
          <Form onSubmit={handleGrantItem}>
            <FormGroup>
              <GrantTargetSelector
                value={grantTarget}
                onChange={setGrantTarget}
                onUserSearch={setUserSearch}
                users={membersData?.community?.members || []}
                usersLoading={membersLoading}
                allowPendingOwner={true}
                allowUnassigned={false}
                discordGuildId={communityData?.community?.discordGuildId}
                discordGuildName={communityData?.community?.discordGuildName}
                userLabel="Assign to User"
                pendingOwnerLabel="Orphaned with Pending Owner"
                communityId={communityId!}
                onValidationChange={setIsGrantTargetValid}
              />
            </FormGroup>

            <FormGroup>
              <Label>Quantity *</Label>
              <Input
                required
                type="number"
                min="1"
                value={grantFormData.quantity}
                onChange={(e) =>
                  setGrantFormData({
                    ...grantFormData,
                    quantity: e.target.value,
                  })
                }
              />
            </FormGroup>

            <FormActions>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsGrantModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={grantTarget?.type === 'pending' && !isGrantTargetValid}
              >
                Grant Item
              </Button>
            </FormActions>
          </Form>
        </ModalContent>
      </Modal>
    </Container>
  );
};
