import React from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { Settings, ArrowLeft } from 'lucide-react';
import { Button, Heading2, SmallText, HelpText } from '@chardb/ui';

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

export const CommunitySettingsPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();

  if (!communityId) {
    return (
      <Container>
        <Heading2>Invalid Community</Heading2>
        <HelpText>Community ID is required to manage settings.</HelpText>
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
              <Settings size={24} />
            </HeaderIcon>
            <HeaderText>
              <Heading2>Community Settings</Heading2>
              <SmallText style={{ margin: 0, color: 'muted' }}>
                Configure community information and preferences
              </SmallText>
            </HeaderText>
          </HeaderInfo>
        </HeaderContent>
      </Header>

      <PlaceholderContent>
        <PlaceholderIcon>
          <Settings size={48} />
        </PlaceholderIcon>
        <Heading2>Community Settings</Heading2>
        <HelpText>
          This feature is under development. Community settings interface will
          be available soon. You can configure basic community information,
          appearance, and general settings here.
        </HelpText>
      </PlaceholderContent>
    </Container>
  );
};
