import React, { useState } from "react";
import styled from "styled-components";
import { useParams } from "react-router-dom";
import { Palette, Plus, Edit2, Trash2, X, Check } from "lucide-react";
import { Button, Card } from "@chardb/ui";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { toast } from "react-hot-toast";
import {
  useGetCommunityColorsQuery,
  useCreateCommunityColorMutation,
  useUpdateCommunityColorMutation,
  useDeleteCommunityColorMutation,
} from "../generated/graphql";

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
  display: flex;
  align-items: center;
  gap: 0.75rem;
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

const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
`;

const ColorCard = styled(Card)`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ColorPreview = styled.div<{ $color: string }>`
  width: 100%;
  height: 80px;
  background-color: ${({ $color }) => $color};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const ColorInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ColorName = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const ColorHex = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
  font-family: monospace;
`;

const ColorActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
`;

const Modal = styled.div<{ $isOpen: boolean }>`
  display: ${({ $isOpen }) => ($isOpen ? "flex" : "none")};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled(Card)`
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
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
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  background-color: ${({ theme }) => theme.colors.background};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ColorInputGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
`;

const ColorInputWrapper = styled.div`
  flex: 1;
`;

const ColorPicker = styled.input`
  width: 60px;
  height: 42px;
  padding: 0.25rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  background-color: ${({ theme }) => theme.colors.background};
`;

const FormActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

interface ColorFormData {
  name: string;
  hexCode: string;
}

export const CommunityColorPalettePage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<{ id: string; name: string; hexCode: string } | null>(null);
  const [formData, setFormData] = useState<ColorFormData>({
    name: "",
    hexCode: "#000000",
  });

  const { data, loading, refetch } = useGetCommunityColorsQuery({
    variables: { communityId: communityId! },
    skip: !communityId,
  });

  const [createColor, { loading: creating }] = useCreateCommunityColorMutation({
    onCompleted: () => {
      toast.success("Color created successfully");
      setIsModalOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Error creating color: ${error.message}`);
    },
  });

  const [updateColor, { loading: updating }] = useUpdateCommunityColorMutation({
    onCompleted: () => {
      toast.success("Color updated successfully");
      setIsModalOpen(false);
      setEditingColor(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Error updating color: ${error.message}`);
    },
  });

  const [deleteColor] = useDeleteCommunityColorMutation({
    onCompleted: () => {
      toast.success("Color deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error deleting color: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", hexCode: "#000000" });
  };

  const handleOpenCreateModal = () => {
    setEditingColor(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (color: { id: string; name: string; hexCode: string }) => {
    setEditingColor(color);
    setFormData({ name: color.name, hexCode: color.hexCode });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingColor(null);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Color name is required");
      return;
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(formData.hexCode)) {
      toast.error("Invalid hex color code");
      return;
    }

    if (editingColor) {
      updateColor({
        variables: {
          id: editingColor.id,
          input: formData,
        },
      });
    } else {
      createColor({
        variables: {
          input: {
            ...formData,
            communityId: communityId!,
          },
        },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this color?")) {
      deleteColor({ variables: { id } });
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner />
      </Container>
    );
  }

  const colors = data?.communityColors || [];

  return (
    <Container>
      <Header>
        <Title>
          <Palette size={32} />
          Color Palette
        </Title>
        <Subtitle>
          Manage your community's color palette for traits, variants, and items
        </Subtitle>
      </Header>

      <Section>
        <SectionHeader>
          <SectionTitle>{colors.length} Colors</SectionTitle>
          <Button onClick={handleOpenCreateModal}>
            <Plus size={18} />
            New Color
          </Button>
        </SectionHeader>

        {colors.length === 0 ? (
          <EmptyState>
            <Palette size={48} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
            <p>No colors yet. Create your first color to get started!</p>
          </EmptyState>
        ) : (
          <ColorGrid>
            {colors.map((color) => (
              <ColorCard key={color.id}>
                <ColorPreview $color={color.hexCode} />
                <ColorInfo>
                  <ColorName>{color.name}</ColorName>
                  <ColorHex>{color.hexCode}</ColorHex>
                </ColorInfo>
                <ColorActions>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenEditModal(color)}
                  >
                    <Edit2 size={14} />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(color.id)}
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </ColorActions>
              </ColorCard>
            ))}
          </ColorGrid>
        )}
      </Section>

      <Modal $isOpen={isModalOpen} onClick={handleCloseModal}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>
              {editingColor ? "Edit Color" : "Create New Color"}
            </ModalTitle>
            <Button variant="ghost" size="sm" onClick={handleCloseModal}>
              <X size={20} />
            </Button>
          </ModalHeader>

          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="name">Color Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Midnight Blue"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="hexCode">Hex Code</Label>
              <ColorInputGroup>
                <ColorInputWrapper>
                  <Input
                    id="hexCode"
                    type="text"
                    value={formData.hexCode}
                    onChange={(e) =>
                      setFormData({ ...formData, hexCode: e.target.value })
                    }
                    placeholder="#000000"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    required
                  />
                </ColorInputWrapper>
                <ColorPicker
                  type="color"
                  value={formData.hexCode}
                  onChange={(e) =>
                    setFormData({ ...formData, hexCode: e.target.value })
                  }
                />
              </ColorInputGroup>
            </FormGroup>

            <FormGroup>
              <Label>Preview</Label>
              <ColorPreview $color={formData.hexCode} />
            </FormGroup>

            <FormActions>
              <Button type="button" variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || updating}>
                <Check size={18} />
                {editingColor ? "Update" : "Create"} Color
              </Button>
            </FormActions>
          </Form>
        </ModalContent>
      </Modal>
    </Container>
  );
};
