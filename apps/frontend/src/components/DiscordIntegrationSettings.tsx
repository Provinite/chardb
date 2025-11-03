import React, { useState } from "react";
import styled from "styled-components";
import {
  ExternalLink,
  Link as LinkIcon,
  Unlink,
  AlertCircle,
  CheckCircle,
  Loader,
} from "lucide-react";
import { Button, Input, HelpText, Heading3 } from "@chardb/ui";
import {
  useDiscordBotInviteUrlQuery,
  useValidateDiscordGuildQuery,
  useLinkDiscordGuildMutation,
  useUnlinkDiscordGuildMutation,
  type Community,
} from "../graphql/communities.graphql";
import { toast } from "react-hot-toast";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const StatusBadge = styled.div<{ status: "connected" | "disconnected" }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};

  ${({ status, theme }) =>
    status === "connected"
      ? `
        background: ${theme.colors.success}20;
        color: ${theme.colors.success};
      `
      : `
        background: ${theme.colors.text.muted}20;
        color: ${theme.colors.text.secondary};
      `}
`;

const GuildInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const GuildName = styled.div`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const GuildId = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: "Courier New", monospace;
`;

const LinkButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};

  &:hover {
    text-decoration: underline;
  }
`;

const ValidationMessage = styled.div<{ type: "success" | "error" | "info" }>`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};

  ${({ type, theme }) => {
    if (type === "success") {
      return `
        background: ${theme.colors.success}20;
        color: ${theme.colors.success};
      `;
    } else if (type === "error") {
      return `
        background: ${theme.colors.error}20;
        color: ${theme.colors.error};
      `;
    } else {
      return `
        background: ${theme.colors.primary}20;
        color: ${theme.colors.primary};
      `;
    }
  }}
`;

const InputRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
`;

const InputGroup = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

interface DiscordIntegrationSettingsProps {
  community: Pick<
    Community,
    "id" | "name" | "discordGuildId" | "discordGuildName"
  >;
  onUpdate?: () => void;
}

export const DiscordIntegrationSettings: React.FC<
  DiscordIntegrationSettingsProps
> = ({ community, onUpdate }) => {
  const [guildIdInput, setGuildIdInput] = useState("");
  const [validationAttempted, setValidationAttempted] = useState(false);

  // Fetch bot invite URL
  const { data: inviteData } = useDiscordBotInviteUrlQuery();

  // Validate guild (only when user clicks validate)
  const {
    data: validationData,
    loading: validating,
    refetch: validateGuild,
  } = useValidateDiscordGuildQuery({
    variables: { communityId: community.id, guildId: guildIdInput },
    skip: !validationAttempted || !guildIdInput,
  });

  // Mutations
  const [linkGuild, { loading: linking }] = useLinkDiscordGuildMutation({
    onCompleted: () => {
      toast.success("Discord server linked successfully!");
      setGuildIdInput("");
      setValidationAttempted(false);
      onUpdate?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to link Discord server");
    },
  });

  const [unlinkGuild, { loading: unlinking }] = useUnlinkDiscordGuildMutation({
    onCompleted: () => {
      toast.success("Discord server unlinked successfully");
      onUpdate?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to unlink Discord server");
    },
  });

  const handleValidate = async () => {
    if (!guildIdInput.trim()) {
      toast.error("Please enter a Discord Server ID");
      return;
    }
    setValidationAttempted(true);
    await validateGuild();
  };

  const handleLink = async () => {
    if (!guildIdInput.trim()) {
      toast.error("Please enter a Discord Server ID");
      return;
    }

    if (!validationData?.validateDiscordGuild?.botHasAccess) {
      toast.error(
        "Bot does not have access to this server. Please validate first.",
      );
      return;
    }

    await linkGuild({
      variables: {
        communityId: community.id,
        guildId: guildIdInput,
      },
    });
  };

  const handleUnlink = async () => {
    if (
      window.confirm(
        "Are you sure you want to unlink this Discord server? Users will no longer be able to use Discord usernames when creating orphaned characters or items.",
      )
    ) {
      await unlinkGuild({
        variables: {
          communityId: community.id,
        },
      });
    }
  };

  const isConnected = !!community.discordGuildId;
  const botInviteUrl = inviteData?.discordBotInviteUrl;

  return (
    <Container>
      <Section>
        <Heading3>Discord Integration</Heading3>
        <HelpText>
          Link a Discord server to your community to enable username-based
          character and item creation.
        </HelpText>
      </Section>

      <Section>
        <Row>
          <StatusBadge status={isConnected ? "connected" : "disconnected"}>
            {isConnected ? (
              <>
                <CheckCircle size={16} />
                Connected
              </>
            ) : (
              <>
                <AlertCircle size={16} />
                Not Connected
              </>
            )}
          </StatusBadge>
        </Row>

        {isConnected && community.discordGuildName && (
          <GuildInfo>
            <GuildName>{community.discordGuildName}</GuildName>
            <GuildId>Server ID: {community.discordGuildId}</GuildId>
          </GuildInfo>
        )}
      </Section>

      {!isConnected ? (
        <>
          <Section>
            <Heading3>Step 1: Add Bot to Your Server</Heading3>
            <HelpText>
              First, add the CharDB Bot to your Discord server using the invite
              link below. The bot needs to be in your server to look up
              usernames.
            </HelpText>
            {botInviteUrl ? (
              <LinkButton
                href={botInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={16} />
                Open Bot Invite Link
              </LinkButton>
            ) : (
              <HelpText style={{ color: "error" }}>
                Failed to load bot invite URL
              </HelpText>
            )}
          </Section>

          <Section>
            <Heading3>Step 2: Link Your Server</Heading3>
            <HelpText>
              After adding the bot, enter your Discord Server ID below. You can
              find this by right-clicking your server icon in Discord (with
              Developer Mode enabled) and selecting "Copy Server ID".
            </HelpText>

            <InputRow>
              <InputGroup>
                <Label htmlFor="guildId">Discord Server ID</Label>
                <Input
                  id="guildId"
                  type="text"
                  placeholder="e.g., 1234567890123456789"
                  value={guildIdInput}
                  onChange={(e) => setGuildIdInput(e.target.value)}
                  disabled={linking || validating}
                />
              </InputGroup>
              <Button
                variant="outline"
                onClick={handleValidate}
                disabled={!guildIdInput.trim() || validating || linking}
                icon={
                  validating ? <Loader size={16} className="spin" /> : undefined
                }
              >
                {validating ? "Validating..." : "Validate"}
              </Button>
            </InputRow>

            {validationAttempted && validationData && (
              <>
                {validationData.validateDiscordGuild?.botHasAccess ? (
                  <ValidationMessage type="success">
                    <CheckCircle size={16} />
                    <div>
                      Bot has access to server "
                      {validationData.validateDiscordGuild.name}". You can now
                      link this server to your community.
                    </div>
                  </ValidationMessage>
                ) : (
                  <ValidationMessage type="error">
                    <AlertCircle size={16} />
                    <div>
                      Bot does not have access to this server. Please make sure
                      you've added the bot to your server using the invite link
                      above.
                    </div>
                  </ValidationMessage>
                )}
              </>
            )}

            {validationData?.validateDiscordGuild?.botHasAccess && (
              <Row>
                <Button
                  variant="primary"
                  onClick={handleLink}
                  disabled={linking}
                  icon={
                    linking ? (
                      <Loader size={16} className="spin" />
                    ) : (
                      <LinkIcon size={16} />
                    )
                  }
                >
                  {linking ? "Linking..." : "Link Server"}
                </Button>
              </Row>
            )}
          </Section>
        </>
      ) : (
        <Section>
          <HelpText>
            This Discord server is currently linked to your community. This
            allows enhanced integrations with discord features.
          </HelpText>
          <Row>
            <Button
              variant="outline"
              onClick={handleUnlink}
              disabled={unlinking}
              icon={<Unlink size={16} />}
            >
              {unlinking ? "Unlinking..." : "Unlink Server"}
            </Button>
          </Row>
        </Section>
      )}
    </Container>
  );
};
