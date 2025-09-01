import React, { useState } from 'react';
import styled from 'styled-components';
import { Plus, Settings, Trash2, ExternalLink, Search } from 'lucide-react';
import { 
  useCommunitiesQuery, 
  useCreateCommunityMutation, 
  useRemoveCommunityMutation,
  type Community,
  type CreateCommunityInput,
} from '../graphql/communities.graphql';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Button, ErrorMessage, Modal, Input } from '@chardb/ui';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: center;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: stretch;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SearchInput = styled(Input)`
  padding-left: 40px;
  max-width: 400px;
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.secondary};
  width: 18px;
  height: 18px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const CommunityCard = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.lg};
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const CommunityName = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
`;


const CommunityStats = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const CardActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  
  &.danger {
    color: ${({ theme }) => theme.colors.error};
    border-color: ${({ theme }) => theme.colors.error};
    
    &:hover {
      background: ${({ theme }) => theme.colors.error};
      color: white;
    }
  }
`;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;


const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.secondary};
`;


export function CommunityManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data, loading, error, refetch } = useCommunitiesQuery({
    variables: { first: 50 },
  });

  const [createCommunity, { loading: creating }] = useCreateCommunityMutation({
    onCompleted: () => {
      toast.success('Community created successfully');
      setIsCreateModalOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create community');
    },
  });

  const [removeCommunity] = useRemoveCommunityMutation({
    onCompleted: () => {
      toast.success('Community deleted successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete community');
    },
  });

  const communities = data?.communities.nodes || [];
  const filteredCommunities = communities.filter(community =>
    community.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCommunity = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const input: CreateCommunityInput = {
      name: formData.get('name') as string,
    };

    createCommunity({ variables: { createCommunityInput: input } });
  };

  const handleDeleteCommunity = (community: Community) => {
    if (window.confirm(`Are you sure you want to delete "${community.name}"? This action cannot be undone.`)) {
      removeCommunity({ variables: { id: community.id } });
    }
  };

  if (loading) {
    return (
      <Container>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <LoadingSpinner size="lg" />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage message={error.message} />
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderContent>
          <Title>Community Management</Title>
          <Subtitle>Manage communities across the platform</Subtitle>
        </HeaderContent>
        <Actions>
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus size={16} />}
          >
            Create Community
          </Button>
        </Actions>
      </Header>

      <SearchContainer>
        <SearchIcon />
        <SearchInput
          type="text"
          placeholder="Search communities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </SearchContainer>

      {filteredCommunities.length === 0 ? (
        <EmptyState>
          {searchTerm ? 'No communities match your search.' : 'No communities created yet.'}
        </EmptyState>
      ) : (
        <Grid>
          {filteredCommunities.map((community) => (
            <CommunityCard key={community.id}>
              <CardHeader>
                <div>
                  <CommunityName>{community.name}</CommunityName>
                </div>
              </CardHeader>
              
              <CommunityStats>
                <div>
                  Created {new Date(community.createdAt).toLocaleDateString()}
                </div>
              </CommunityStats>
              
              <CardActions>
                <ActionButton
                  as={Link}
                  to={`/communities/${community.id}/invite-codes`}
                >
                  <ExternalLink size={14} />
                  Invite Codes
                </ActionButton>
                <ActionButton>
                  <Settings size={14} />
                  Manage
                </ActionButton>
                <ActionButton
                  className="danger"
                  onClick={() => handleDeleteCommunity(community)}
                >
                  <Trash2 size={14} />
                  Delete
                </ActionButton>
              </CardActions>
            </CommunityCard>
          ))}
        </Grid>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Community"
      >
        <form onSubmit={handleCreateCommunity}>
          <FormGroup>
            <Label>Community Name</Label>
            <Input
              name="name"
              type="text"
              required
              placeholder="Enter community name"
            />
          </FormGroup>
          
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={creating}
            >
              Create Community
            </Button>
          </div>
        </form>
      </Modal>
    </Container>
  );
}