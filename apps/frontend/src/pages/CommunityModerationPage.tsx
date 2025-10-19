import React from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { FileText, ArrowLeft } from 'lucide-react';
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

export const CommunityModerationPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();

  if (!communityId) {
    return (
      <Container>
        <Heading2>Invalid Community</Heading2>
        <HelpText>
          Community ID is required to access moderation tools.
        </HelpText>
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
              <FileText size={24} />
            </HeaderIcon>
            <HeaderText>
              <Heading2>Content Moderation</Heading2>
              <SmallText style={{ margin: 0, color: 'muted' }}>
                Review and manage community content
              </SmallText>
            </HeaderText>
          </HeaderInfo>
        </HeaderContent>
      </Header>

      <PlaceholderContent>
        <PlaceholderIcon>
          <FileText size={48} />
        </PlaceholderIcon>
        <Heading2>Content Moderation</Heading2>
        <HelpText>
          This feature is under development. Content moderation tools will be
          available soon. You can review reported content, manage character
          approvals, and maintain community standards here.
        </HelpText>
      </PlaceholderContent>
    </Container>
  );
};
