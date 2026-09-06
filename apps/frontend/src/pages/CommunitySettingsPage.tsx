import React from "react";
import styled from "styled-components";
import { Settings, ArrowLeft } from "lucide-react";
import {
  Button,
  Heading2,
  SmallText,
  HelpText,
  ErrorMessage,
} from "@chardb/ui";
import { DiscordIntegrationSettings } from "../components/DiscordIntegrationSettings";
import {
  useCommunityHost,
  useCommunityId,
} from "../contexts/CommunityHostContext";

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

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const CommunitySettingsPage: React.FC = () => {
  const communityId = useCommunityId();

  // The host context already holds this community; querying it back by id
  // fetched the same record a second time on every page load.
  const { community, refetch } = useCommunityHost();

  if (!communityId) {
    return (
      <Container>
        <Heading2>Invalid Community</Heading2>
        <HelpText>Community ID is required to manage settings.</HelpText>
      </Container>
    );
  }

  // No loading branch: the host resolved this community before the page
  // mounted, so it is either here or the address names none.
  if (!community) {
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
        </Header>
        <ErrorMessage message="Community not found" />
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
              <Heading2>{community.name} Settings</Heading2>
              <SmallText style={{ margin: 0, color: "muted" }}>
                Configure community information and preferences
              </SmallText>
            </HeaderText>
          </HeaderInfo>
        </HeaderContent>
      </Header>

      <Content>
        <DiscordIntegrationSettings
          community={community}
          onUpdate={() => refetch()}
        />
      </Content>
    </Container>
  );
};
