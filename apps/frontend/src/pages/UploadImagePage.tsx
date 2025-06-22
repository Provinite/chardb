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
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: ${({ theme }) => theme.spacing.xl};
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing.lg};
  }
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  
  @media (max-width: 1024px) {
    order: -1;
  }
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
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const SidebarSection = styled(Section)`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  padding-bottom: ${({ theme }) => theme.spacing.xs};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;


const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const UploadButton = styled(Button)`
  width: 100%;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 600;
`;

const CancelButton = styled(Button)`
  width: 100%;
`;

const Input = styled.input`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  width: 100%;
  box-sizing: border-box;
  
  &[as="textarea"] {
    resize: vertical;
    min-height: 100px;
  }
`;

const Label = styled.label`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  display: block;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
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

const CharacterCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  border: 2px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.surface};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => `${theme.colors.primary}e6`};
    background: ${({ theme }) => `${theme.colors.surface}f0`};
  }
`;

const CharacterAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 14px;
  min-width: 32px;
`;

const CharacterInfo = styled.div`
  flex: 1;
`;

const CharacterName = styled.div`
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CharacterMeta = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ArtistToggle = styled.div`
  display: flex;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const ArtistToggleButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.sm};
  border: none;
  background: ${({ theme, active }) => active ? theme.colors.primary : theme.colors.surface};
  color: ${({ theme, active }) => active ? 'white' : theme.colors.text.primary};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme, active }) => active ? `${theme.colors.primary}e6` : `${theme.colors.primary}15`};
  }
  
  &:first-child {
    border-radius: ${({ theme }) => theme.borderRadius.md} 0 0 ${({ theme }) => theme.borderRadius.md};
  }
  
  &:last-child {
    border-radius: 0 ${({ theme }) => theme.borderRadius.md} ${({ theme }) => theme.borderRadius.md} 0;
  }
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

const SuccessContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid ${({ theme }) => theme.colors.success};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SuccessTitle = styled.h2`
  color: ${({ theme }) => theme.colors.success};
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const SuccessMessage = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
`;

const UploadedImagesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const UploadedImageCard = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const UploadedImagePreview = styled.img`
  width: 100%;
  height: 120px;
  object-fit: cover;
  display: block;
`;

const UploadedImageInfo = styled.div`
  padding: ${({ theme }) => theme.spacing.sm};
`;

const UploadedImageName = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SuccessActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SuccessNavLinks = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: center;
  flex-wrap: wrap;
  
  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

interface UploadFormData {
  description: string;
  altText: string;
  galleryId: string;
  characterId: string;
  isNsfw: boolean;
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  // Privacy settings
  authorizedViewers: 'full-size' | 'watermarked' | 'no-access';
  publicViewers: 'full-size' | 'watermarked' | 'no-access';
  watermark: 'url-fileside' | 'url-only' | 'none';
  // NSFW categories
  nsfwNudity: boolean;
  nsfwGore: boolean;
  nsfwSensitive: boolean;
  sensitiveContentDescription: string;
  // Artist credits
  artistType: 'onsite' | 'offsite';
  artistLink: string;
  artistLabel: string;
}

interface UploadedImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  altText?: string;
}

export const UploadImagePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [formData, setFormData] = useState<UploadFormData>({
    description: '',
    altText: '',
    galleryId: '',
    characterId: '',
    isNsfw: false,
    visibility: 'PUBLIC',
    // Privacy settings
    authorizedViewers: 'full-size',
    publicViewers: 'watermarked',
    watermark: 'url-fileside',
    // NSFW categories
    nsfwNudity: false,
    nsfwGore: false,
    nsfwSensitive: false,
    sensitiveContentDescription: '',
    // Artist credits
    artistType: 'onsite',
    artistLink: '',
    artistLabel: '',
  });

  // Pre-select gallery and character from URL query parameters
  useEffect(() => {
    const galleryId = searchParams.get('galleryId');
    const characterId = searchParams.get('character');
    
    if (galleryId) {
      setFormData(prev => ({ ...prev, galleryId }));
    }
    
    if (characterId) {
      setFormData(prev => ({ ...prev, characterId }));
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
        // Handle NSFW flags
        const hasNsfwContent = formData.nsfwNudity || formData.nsfwGore || formData.nsfwSensitive;
        formDataToSend.append('isNsfw', hasNsfwContent.toString());
        if (formData.nsfwNudity) formDataToSend.append('nsfwNudity', 'true');
        if (formData.nsfwGore) formDataToSend.append('nsfwGore', 'true');
        if (formData.nsfwSensitive) {
          formDataToSend.append('nsfwSensitive', 'true');
          if (formData.sensitiveContentDescription) {
            formDataToSend.append('sensitiveContentDescription', formData.sensitiveContentDescription);
          }
        }
        
        // Handle privacy settings
        formDataToSend.append('authorizedViewers', formData.authorizedViewers);
        formDataToSend.append('publicViewers', formData.publicViewers);
        formDataToSend.append('watermark', formData.watermark);
        
        // Handle artist credits
        if (formData.artistLink) {
          formDataToSend.append('artistType', formData.artistType);
          formDataToSend.append('artistLink', formData.artistLink);
          if (formData.artistLabel) formDataToSend.append('artistLabel', formData.artistLabel);
        }
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

      const uploadResults = await Promise.all(uploadPromises);
      
      // Convert upload results to UploadedImage format
      const images: UploadedImage[] = uploadResults.map((result) => ({
        id: result.id,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        filename: result.filename || result.originalFilename,
        altText: result.altText,
      }));
      
      // Show success state instead of navigating away
      setUploadedImages(images);
      setUploadSuccess(true);
      setFiles([]); // Clear the files for next upload
      
      // Reset form data except character/gallery selection for convenience
      setFormData(prev => ({
        ...prev,
        description: '',
        altText: '',
        nsfwNudity: false,
        nsfwGore: false,
        nsfwSensitive: false,
        sensitiveContentDescription: '',
        artistLink: '',
        artistLabel: '',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleUploadMore = () => {
    setUploadSuccess(false);
    setUploadedImages([]);
    setError('');
  };

  const renderSuccessState = () => {
    const selectedCharacter = characters.find((c: any) => c.id === formData.characterId);
    const selectedGallery = galleries.find((g: any) => g.id === formData.galleryId);
    
    return (
      <SuccessContainer>
        <SuccessTitle>
          ✅ Upload Successful!
        </SuccessTitle>
        <SuccessMessage>
          {uploadedImages.length === 1 
            ? 'Your image has been uploaded successfully.'
            : `${uploadedImages.length} images have been uploaded successfully.`
          }
        </SuccessMessage>
        
        <UploadedImagesGrid>
          {uploadedImages.map((image) => (
            <UploadedImageCard key={image.id}>
              <Link to={`/image/${image.id}`}>
                <UploadedImagePreview
                  src={image.thumbnailUrl || image.url}
                  alt={image.altText || image.filename}
                />
              </Link>
              <UploadedImageInfo>
                <UploadedImageName title={image.filename}>
                  {image.filename}
                </UploadedImageName>
              </UploadedImageInfo>
            </UploadedImageCard>
          ))}
        </UploadedImagesGrid>
        
        <SuccessActions>
          <Button variant="primary" onClick={handleUploadMore}>
            Upload More Images
          </Button>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </SuccessActions>
        
        <SuccessNavLinks>
          {uploadedImages.length === 1 && (
            <Link to={`/image/${uploadedImages[0].id}`}>
              View Image
            </Link>
          )}
          {selectedCharacter && (
            <Link to={`/character/${selectedCharacter.id}`}>
              View {selectedCharacter.name}
            </Link>
          )}
          {selectedGallery && (
            <Link to={`/gallery/${selectedGallery.id}`}>
              View {selectedGallery.name} Gallery
            </Link>
          )}
        </SuccessNavLinks>
      </SuccessContainer>
    );
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

      {uploadSuccess ? (
        renderSuccessState()
      ) : (
        <MainLayout>
        <MainContent>
          <Form onSubmit={(e) => e.preventDefault()}>
            <Section>
              <SectionTitle>Basics</SectionTitle>
              <ImageUpload
                files={files}
                onFilesChange={setFiles}
                onUpload={handleUpload}
                uploading={uploading}
                disabled={uploading}
              />
            </Section>

            <Section>
              <Label>Caption (optional)</Label>
              <Input
                as="textarea"
                rows={4}
                placeholder="Describe your image..."
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
              />
            </Section>

            <Section>
              <SectionTitle>Privacies</SectionTitle>
              <div>
                <Label>Authorized Viewers</Label>
                <Select 
                  value={formData.authorizedViewers}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('authorizedViewers', e.target.value)}
                >
                  <option value="full-size">Full Size</option>
                  <option value="watermarked">Watermarked</option>
                  <option value="no-access">No Access</option>
                </Select>
              </div>
              <div>
                <Label>Public Viewers</Label>
                <Select 
                  value={formData.publicViewers}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('publicViewers', e.target.value)}
                >
                  <option value="full-size">Full Size</option>
                  <option value="watermarked">Watermarked</option>
                  <option value="no-access">No Access</option>
                </Select>
              </div>
              <div>
                <Label>Watermark</Label>
                <Select 
                  value={formData.watermark}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('watermark', e.target.value)}
                >
                  <option value="url-fileside">URL, Fileside</option>
                  <option value="url-only">URL Only</option>
                  <option value="none">None</option>
                </Select>
              </div>
            </Section>

            <Section>
              <SectionTitle>NSFW Settings</SectionTitle>
              <CheckboxGroup>
                <Label>
                  <Checkbox 
                    type="checkbox"
                    checked={formData.nsfwNudity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('nsfwNudity', e.target.checked)}
                  />
                  Nudity
                </Label>
                <Label>
                  <Checkbox 
                    type="checkbox"
                    checked={formData.nsfwGore}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('nsfwGore', e.target.checked)}
                  />
                  Gore
                </Label>
                <Label>
                  <Checkbox 
                    type="checkbox"
                    checked={formData.nsfwSensitive}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('nsfwSensitive', e.target.checked)}
                  />
                  Sensitive Content
                </Label>
              </CheckboxGroup>
              {formData.nsfwSensitive && (
                <div>
                  <Label>Describe the sensitive content</Label>
                  <Input
                    as="textarea"
                    rows={2}
                    placeholder="Briefly describe the sensitive content..."
                    value={formData.sensitiveContentDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('sensitiveContentDescription', e.target.value)}
                  />
                </div>
              )}
            </Section>

            <Actions style={{ justifyContent: 'center' }}>
              <UploadButton
                onClick={() => handleUpload(files)}
                disabled={uploading || files.length === 0}
                variant="primary"
              >
                {uploading ? 'Uploading...' : 'Upload Image'}
              </UploadButton>
            </Actions>
          </Form>
        </MainContent>

        <Sidebar>
          <SidebarSection>
            <SectionTitle>Characters</SectionTitle>
            {formData.characterId && (
              <CharacterCard>
                <CharacterAvatar>
                  {characters.find((c: any) => c.id === formData.characterId)?.name?.charAt(0) || '?'}
                </CharacterAvatar>
                <CharacterInfo>
                  <CharacterName>
                    {characters.find((c: any) => c.id === formData.characterId)?.name || 'Unknown'}
                  </CharacterName>
                  <CharacterMeta>
                    {characters.find((c: any) => c.id === formData.characterId)?.species || 'Unknown species'}
                  </CharacterMeta>
                </CharacterInfo>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleInputChange('characterId', '')}
                >
                  ×
                </Button>
              </CharacterCard>
            )}
            <div>
              <Select
                value={formData.characterId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('characterId', e.target.value)}
              >
                <option value="">Select a character...</option>
                {characters.map((character: any) => (
                  <option key={character.id} value={character.id}>
                    {character.name} ({character.species || 'Unknown'})
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="ghost" size="sm">
              + Add Character
            </Button>
          </SidebarSection>

          <SidebarSection>
            <SectionTitle>Artist Credits</SectionTitle>
            <ArtistToggle>
              <ArtistToggleButton 
                type="button"
                active={formData.artistType === 'onsite'}
                onClick={() => handleInputChange('artistType', 'onsite')}
              >
                On-site Artist
              </ArtistToggleButton>
              <ArtistToggleButton 
                type="button"
                active={formData.artistType === 'offsite'}
                onClick={() => handleInputChange('artistType', 'offsite')}
              >
                Off-site Artist
              </ArtistToggleButton>
            </ArtistToggle>
            <div>
              <Label>Link to Artist</Label>
              <Input 
                placeholder={formData.artistType === 'onsite' ? 'Username or profile...' : 'Artist website or profile...'}
                value={formData.artistLink}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('artistLink', e.target.value)}
              />
            </div>
            <div>
              <Label>Label (optional)</Label>
              <Input 
                placeholder="Artist name or description..."
                value={formData.artistLabel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('artistLabel', e.target.value)}
              />
            </div>
            <Button variant="ghost" size="sm">
              + Add another artist
            </Button>
          </SidebarSection>

          <SidebarSection>
            <SectionTitle>Organization</SectionTitle>
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
              <Label>Alt Text</Label>
              <Input
                placeholder="Alt text for accessibility..."
                value={formData.altText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('altText', e.target.value)}
              />
            </div>
          </SidebarSection>

          <div style={{ padding: '0 16px' }}>
            <CancelButton variant="ghost" onClick={handleCancel} disabled={uploading}>
              Cancel
            </CancelButton>
          </div>
        </Sidebar>
      </MainLayout>
      )}
    </Container>
  );
};