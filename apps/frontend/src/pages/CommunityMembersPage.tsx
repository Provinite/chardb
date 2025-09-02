import React from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { Users, ArrowLeft } from 'lucide-react';
import { 
  Button,
  Heading2,
  SmallText,
  HelpText
} from '@chardb/ui';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const BackButton = styled(Button)`
  padding: 0.5rem;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
`;

const HeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
`;

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const PlaceholderContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const PlaceholderIcon = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  opacity: 0.5;
`;

export const CommunityMembersPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();

  if (!communityId) {
    return (
      <Container>
        <Heading2>Invalid Community</Heading2>
        <HelpText>Community ID is required to view members.</HelpText>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderTop>
          <BackButton
            variant="outline"
            onClick={() => window.history.back()}
            icon={<ArrowLeft size={16} />}
          >
            Back
          </BackButton>
        </HeaderTop>

        <HeaderContent>
          <HeaderInfo>
            <HeaderIcon>
              <Users size={24} />
            </HeaderIcon>
            <HeaderText>
              <Heading2>Member Management</Heading2>
              <SmallText style={{ margin: 0, color: 'muted' }}>
                Manage community members and roles
              </SmallText>
            </HeaderText>
          </HeaderInfo>
        </HeaderContent>
      </Header>

      <PlaceholderContent>
        <PlaceholderIcon>
          <Users size={48} />
        </PlaceholderIcon>
        <Heading2>Member Management</Heading2>
        <HelpText>
          This feature is under development. Community member management interface will be available soon.
          You can use the Permission Management page to view and manage member roles.
        </HelpText>
      </PlaceholderContent>
    </Container>
  );
};