import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button, Input, ErrorMessage } from "@chardb/ui";
import {
  useSpeciesByIdQuery,
  useUpdateSpeciesMutation,
} from "../generated/graphql";
import { toast } from "react-hot-toast";

/**
 * Edit Species Page
 *
 * Provides an interface for editing existing species details including
 * name and image availability settings.
 *
 * Features:
 * - Load existing species data
 * - Edit species name
 * - Toggle hasImage flag
 * - Form validation
 * - Success/error handling with toast notifications
 * - Navigation back to species management
 *
 * URL Parameters:
 * - speciesId: The ID of the species to edit
 *
 * Permissions:
 * - Requires canEditSpecies permission
 *
 * @example Usage in routing:
 * ```tsx
 * <Route
 *   path="/species/:speciesId/edit"
 *   element={<ProtectedRoute><EditSpeciesPage /></ProtectedRoute>}
 * />
 * ```
 */

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const BackButton = styled(Button)`
  margin-bottom: 1rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const Form = styled.form`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 2rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: block;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 0.5rem;
`;

const CommunityDisplay = styled.div`
  padding: 0.75rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: 500;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};

  input[type="checkbox"] {
    cursor: pointer;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: ${({ theme }) => theme.colors.text.muted};
`;

interface EditSpeciesFormData {
  name: string;
  hasImage: boolean;
}

export const EditSpeciesPage: React.FC = () => {
  const navigate = useNavigate();
  const { speciesId } = useParams<{ speciesId: string }>();

  const [formData, setFormData] = useState<EditSpeciesFormData>({
    name: "",
    hasImage: false,
  });

  // Load species data
  const {
    data: speciesData,
    loading: speciesLoading,
    error: speciesError,
  } = useSpeciesByIdQuery({
    variables: { id: speciesId! },
    skip: !speciesId,
  });

  // Update mutation
  const [updateSpeciesMutation, { loading: updateLoading }] =
    useUpdateSpeciesMutation({
      onCompleted: (data) => {
        toast.success(
          `Species "${data.updateSpecies.name}" updated successfully!`
        );
        // Navigate back to the community species management page
        navigate(`/communities/${data.updateSpecies.communityId}/species`);
      },
      onError: (error) => {
        toast.error(`Failed to update species: ${error.message}`);
      },
    });

  // Populate form when species data loads
  useEffect(() => {
    if (speciesData?.speciesById) {
      setFormData({
        name: speciesData.speciesById.name,
        hasImage: speciesData.speciesById.hasImage,
      });
    }
  }, [speciesData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !speciesId) return;

    await updateSpeciesMutation({
      variables: {
        id: speciesId,
        updateSpeciesInput: {
          name: formData.name,
          hasImage: formData.hasImage,
        },
      },
    });
  };

  const handleCancel = () => {
    if (speciesData?.speciesById?.communityId) {
      navigate(`/communities/${speciesData.speciesById.communityId}/species`);
    } else {
      navigate(-1);
    }
  };

  // Loading state
  if (speciesLoading) {
    return (
      <Container>
        <LoadingContainer>Loading species data...</LoadingContainer>
      </Container>
    );
  }

  // Error state
  if (speciesError || !speciesData?.speciesById) {
    return (
      <Container>
        <Header>
          <Title>Edit Species</Title>
          <Subtitle>Species not found or error loading data</Subtitle>
        </Header>
        <ErrorMessage
          message={
            speciesError?.message ||
            "Species not found. It may have been deleted."
          }
        />
        <BackButton
          variant="secondary"
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate(-1)}
        >
          Go Back
        </BackButton>
      </Container>
    );
  }

  const species = speciesData.speciesById;

  return (
    <Container>
      <BackButton
        variant="ghost"
        icon={<ArrowLeft size={16} />}
        onClick={handleCancel}
      >
        Back to Species Management
      </BackButton>

      <Header>
        <Title>Edit Species</Title>
        <Subtitle>Update species details and settings</Subtitle>
      </Header>

      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="species-name">Species Name</Label>
          <Input
            id="species-name"
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Enter species name..."
            required
            disabled={updateLoading}
          />
        </FormGroup>

        <FormGroup>
          <Label>Community</Label>
          <CommunityDisplay>{species.community.name}</CommunityDisplay>
        </FormGroup>

        <FormGroup>
          <CheckboxLabel>
            <input
              type="checkbox"
              checked={formData.hasImage}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, hasImage: e.target.checked }))
              }
              disabled={updateLoading}
            />
            Species has associated image
          </CheckboxLabel>
        </FormGroup>

        <Actions>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={updateLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            icon={<Save size={16} />}
            disabled={updateLoading || !formData.name.trim()}
          >
            {updateLoading ? "Saving..." : "Save Changes"}
          </Button>
        </Actions>
      </Form>
    </Container>
  );
};
