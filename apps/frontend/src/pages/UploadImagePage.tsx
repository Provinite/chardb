import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import styled from 'styled-components';
import { Button } from '@chardb/ui';
import { useAuth } from '../contexts/AuthContext';
import { ImageUpload, ImageFile } from '../components/ImageUpload';
import { GET_MY_GALLERIES } from '../graphql/galleries';
import { GET_MY_CHARACTERS } from '../graphql/characters';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Input = styled.input`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
`;

const Label = styled.label`
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  display: block;
`;

const Select = styled.select`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  margin-right: ${({ theme }) => theme.spacing.sm};
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const LoadingMessage = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error};
  background: ${({ theme }) => `${theme.colors.error}10`};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

interface UploadFormData {
  description: string;
  altText: string;
  galleryId: string;
  characterId: string;
  isNsfw: boolean;
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
}

export const UploadImagePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<UploadFormData>({
    description: '',
    altText: '',
    galleryId: '',
    characterId: '',
    isNsfw: false,
    visibility: 'PUBLIC',
  });

  // Pre-select gallery from URL query parameter
  useEffect(() => {
    const galleryId = searchParams.get('galleryId');
    if (galleryId) {
      setFormData(prev => ({ ...prev, galleryId }));
    }
  }, [searchParams]);

  const { data: galleriesData, loading: galleriesLoading } = useQuery(GET_MY_GALLERIES, {
    variables: { filters: { limit: 100 } },
    skip: !user,
  });

  const { data: charactersData, loading: charactersLoading } = useQuery(GET_MY_CHARACTERS, {
    variables: { filters: { limit: 100 } },
    skip: !user,
  });

  const handleInputChange = (field: keyof UploadFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpload = async (uploadFiles: ImageFile[]) => {
    if (!user) {
      setError('You must be logged in to upload images');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const uploadPromises = uploadFiles.map(async (imageFile) => {
        const formDataToSend = new FormData();
        formDataToSend.append('file', imageFile.file);
        
        if (formData.description) formDataToSend.append('description', formData.description);
        if (formData.altText) formDataToSend.append('altText', formData.altText);
        if (formData.galleryId) formDataToSend.append('galleryId', formData.galleryId);
        if (formData.characterId) formDataToSend.append('characterId', formData.characterId);
        formDataToSend.append('isNsfw', formData.isNsfw.toString());
        formDataToSend.append('visibility', formData.visibility);

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/images/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: formDataToSend,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
        }

        return response.json();
      });

      await Promise.all(uploadPromises);
      
      // Navigate to the gallery if one was selected, otherwise to user's images
      if (formData.galleryId) {
        navigate(`/gallery/${formData.galleryId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (!user) {
    return (
      <Container>
        <ErrorMessage>You must be logged in to upload images.</ErrorMessage>
      </Container>
    );
  }

  if (galleriesLoading || charactersLoading) {
    return (
      <Container>
        <LoadingMessage>Loading your galleries and characters...</LoadingMessage>
      </Container>
    );
  }

  const galleries = galleriesData?.myGalleries?.galleries || [];
  const characters = charactersData?.myCharacters?.characters || [];

  return (
    <Container>
      <Header>
        <Title>Upload Images</Title>
        <Subtitle>Share your artwork with the community</Subtitle>
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <Form onSubmit={(e) => e.preventDefault()}>
        <Section>
          <SectionTitle>Select Images</SectionTitle>
          <ImageUpload
            files={files}
            onFilesChange={setFiles}
            onUpload={handleUpload}
            uploading={uploading}
            disabled={uploading}
          />
        </Section>

        {files.length > 0 && (
          <>
            <Section>
              <SectionTitle>Image Details</SectionTitle>
              <div>
                <Label>Description</Label>
                <Input
                  placeholder="Describe your image..."
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('description', e.target.value)}
                />
              </div>
              <div>
                <Label>Alt Text</Label>
                <Input
                  placeholder="Alt text for accessibility..."
                  value={formData.altText}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('altText', e.target.value)}
                />
              </div>
            </Section>

            <Section>
              <SectionTitle>Organization</SectionTitle>
              <FormRow>
                <div>
                  <Label>Gallery (Optional)</Label>
                  {galleries.length === 0 ? (
                    <div>
                      <Select disabled>
                        <option>No galleries yet</option>
                      </Select>
                      <Link to="/gallery/create" style={{ fontSize: '0.875rem', marginTop: '0.5rem', display: 'inline-block' }}>
                        Create your first gallery
                      </Link>
                    </div>
                  ) : (
                    <Select
                      value={formData.galleryId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('galleryId', e.target.value)}
                    >
                      <option value="">Select a gallery...</option>
                      {galleries.map((gallery: any) => (
                        <option key={gallery.id} value={gallery.id}>
                          {gallery.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
                <div>
                  <Label>Character (Optional)</Label>
                  <Select
                    value={formData.characterId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('characterId', e.target.value)}
                  >
                    <option value="">Select a character...</option>
                    {characters.map((character: any) => (
                      <option key={character.id} value={character.id}>
                        {character.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </FormRow>
            </Section>

            <Section>
              <SectionTitle>Settings</SectionTitle>
              <FormRow>
                <div>
                  <Label>Visibility</Label>
                  <Select
                    value={formData.visibility}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('visibility', e.target.value)}
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="UNLISTED">Unlisted</option>
                    <option value="PRIVATE">Private</option>
                  </Select>
                </div>
                <CheckboxGroup>
                  <Label>
                    <Checkbox
                      checked={formData.isNsfw}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('isNsfw', e.target.checked)}
                    />
                    Mark as NSFW
                  </Label>
                </CheckboxGroup>
              </FormRow>
            </Section>

            <Actions>
              <Button variant="ghost" onClick={handleCancel} disabled={uploading}>
                Cancel
              </Button>
            </Actions>
          </>
        )}
      </Form>
    </Container>
  );
};