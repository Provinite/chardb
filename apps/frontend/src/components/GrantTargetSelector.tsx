import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { UserTypeahead, SelectedUser } from '@chardb/ui';
import { RadioGroup, Radio } from '@chardb/ui';
import { Input } from '@chardb/ui';
import { Alert } from '@chardb/ui';
import { useResolveDiscordUserLazyQuery } from '../graphql/communities.graphql';

/**
 * GrantTargetSelector - Component for selecting a grant/ownership target
 *
 * Provides a unified interface for selecting who should receive an item or character.
 * Supports two modes:
 * 1. User Assignment - Assign to a specific registered user
 * 2. Pending Owner - Create orphaned with pending ownership for external account (Discord/DeviantArt)
 *
 * Features:
 * - Integrated user search via UserTypeahead
 * - Provider selection for pending ownership (Discord/DeviantArt)
 * - Discord guild context awareness for username resolution
 * - Internal validation with error messages
 * - Theme-based styling
 *
 * @example
 * ```tsx
 * // Basic usage
 * const [target, setTarget] = useState<GrantTarget | null>(null);
 *
 * <GrantTargetSelector
 *   value={target}
 *   onChange={setTarget}
 *   onUserSearch={setUserSearch}
 *   users={availableUsers}
 *   usersLoading={isLoading}
 *   allowPendingOwner={hasPermission}
 * />
 *
 * // With Discord guild context
 * <GrantTargetSelector
 *   value={target}
 *   onChange={setTarget}
 *   onUserSearch={setUserSearch}
 *   users={communityMembers}
 *   allowPendingOwner={permissions.canCreateOrphanedCharacter}
 *   discordGuildId={community.discordGuildId}
 *   discordGuildName={community.discordGuildName}
 * />
 * ```
 */

export type GrantTarget =
  | { type: 'user'; userId: string; user: SelectedUser }
  | {
      type: 'pending';
      provider: 'DISCORD' | 'DEVIANTART';
      providerAccountId: string;
    };

export interface ResolvedDiscordUser {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface GrantTargetSelectorProps {
  /** Current selected target */
  value: GrantTarget | null;

  /** Callback when target changes */
  onChange: (target: GrantTarget | null) => void;

  /** Callback for user search queries */
  onUserSearch: (query: string) => void;

  /** Available users for selection */
  users?: SelectedUser[];

  /** Whether user search is loading */
  usersLoading?: boolean;

  /** Whether to allow pending owner selection (requires permission) */
  allowPendingOwner?: boolean;

  /** Discord guild ID for username resolution */
  discordGuildId?: string | null;

  /** Discord guild name for display */
  discordGuildName?: string | null;

  /** Label for user selection mode */
  userLabel?: string;

  /** Label for pending owner mode */
  pendingOwnerLabel?: string;

  /** Whether the component is disabled */
  disabled?: boolean;

  /** Community ID (required for Discord resolution) */
  communityId: string;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const HelpText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const ErrorText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.error};
  margin: 0;
`;

const InputRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: flex-start;
`;

const InputWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const CheckButton = styled.button`
  padding: 0.5rem 1rem;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  align-self: flex-start;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primary};
    color: white;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ResolvedUserCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 6px;
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const Avatar = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  flex: 1;
`;

const Username = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const UserId = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  font-family: monospace;
`;

export const GrantTargetSelector: React.FC<GrantTargetSelectorProps> = ({
  value,
  onChange,
  onUserSearch,
  users,
  usersLoading,
  allowPendingOwner = false,
  discordGuildId,
  discordGuildName,
  userLabel = 'Assign to User',
  pendingOwnerLabel = 'Orphaned with Pending Owner',
  disabled = false,
  communityId,
}) => {
  // GraphQL hook for Discord resolution
  const [resolveDiscordUser] = useResolveDiscordUserLazyQuery();

  // Component state
  const [selectionMode, setSelectionMode] = useState<'user' | 'pending'>('user');
  const [provider, setProvider] = useState<'DISCORD' | 'DEVIANTART'>('DISCORD');
  const [accountId, setAccountId] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resolvedUser, setResolvedUser] = useState<ResolvedDiscordUser | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  // Initialize state from value
  useEffect(() => {
    if (!value) {
      // Only clear provider and account fields, preserve selectionMode
      // This allows provider switching to work without resetting the entire mode
      setProvider('DISCORD');
      setAccountId('');
      setValidationError(null);
    } else if (value.type === 'user') {
      setSelectionMode('user');
    } else if (value.type === 'pending') {
      setSelectionMode('pending');
      setProvider(value.provider);
      setAccountId(value.providerAccountId);
    }
  }, [value]);

  // Handle user selection
  const handleUserChange = (userId: string | null, user: SelectedUser | null) => {
    setValidationError(null);
    if (userId && user) {
      onChange({ type: 'user', userId, user });
    } else {
      onChange(null);
    }
  };

  // Handle provider change
  const handleProviderChange = (newProvider: string) => {
    setValidationError(null);
    setCheckError(null);
    setResolvedUser(null);
    setProvider(newProvider as 'DISCORD' | 'DEVIANTART');
    // Clear account ID when switching providers
    setAccountId('');
    onChange(null);
  };

  // Handle account ID change with validation
  const handleAccountIdChange = (value: string) => {
    setAccountId(value);
    setValidationError(null);
    setCheckError(null);
    setResolvedUser(null);

    const trimmed = value.trim();
    if (!trimmed) {
      onChange(null);
      return;
    }

    // Validate Discord numeric ID format if provided
    if (provider === 'DISCORD') {
      const isNumeric = /^\d{17,19}$/.test(trimmed);
      const hasAtSign = trimmed.startsWith('@');

      if (!isNumeric && !hasAtSign && !discordGuildId) {
        setValidationError(
          'Discord numeric ID (17-19 digits) required when Discord server is not connected'
        );
        onChange(null);
        return;
      }
    }

    // Valid input
    onChange({
      type: 'pending',
      provider,
      providerAccountId: trimmed,
    });
  };

  // Handle Check button click
  const handleCheckDiscordUser = async () => {
    if (!accountId.trim() || !communityId) {
      return;
    }

    setIsChecking(true);
    setCheckError(null);
    setResolvedUser(null);

    try {
      const result = await resolveDiscordUser({
        variables: { identifier: accountId.trim(), communityId },
      });

      if (!result.data?.resolveDiscordUser) {
        throw new Error('Failed to resolve Discord user');
      }

      const user = result.data.resolveDiscordUser;
      setResolvedUser({
        userId: user.userId,
        username: user.username,
        displayName: user.displayName || undefined,
        avatarUrl: user.avatarUrl || undefined,
      });
      setCheckError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve Discord user';
      setCheckError(errorMessage);
      setResolvedUser(null);
    } finally {
      setIsChecking(false);
    }
  };

  // Handle selection mode change
  const handleModeChange = (mode: string) => {
    setSelectionMode(mode as 'user' | 'pending');
    setValidationError(null);
    setCheckError(null);
    setResolvedUser(null);
    onChange(null);
  };

  return (
    <Container>
      {/* Selection Mode */}
      <Section>
        <Label>Grant Target</Label>
        <RadioGroup value={selectionMode} onChange={handleModeChange}>
          <Radio value="user" disabled={disabled}>
            {userLabel}
          </Radio>
          {allowPendingOwner && (
            <Radio value="pending" disabled={disabled}>
              {pendingOwnerLabel}
            </Radio>
          )}
        </RadioGroup>
      </Section>

      {/* User Selection */}
      {selectionMode === 'user' && (
        <Section>
          <UserTypeahead
            value={value?.type === 'user' ? value.userId : null}
            onChange={handleUserChange}
            onSearch={onUserSearch}
            users={users}
            loading={usersLoading}
            placeholder="Search for a user..."
            disabled={disabled}
          />
        </Section>
      )}

      {/* Pending Owner Selection */}
      {selectionMode === 'pending' && (
        <>
          <Section>
            <Label>Account Provider</Label>
            <RadioGroup value={provider} onChange={handleProviderChange}>
              <Radio value="DISCORD" disabled={disabled}>
                Discord Account
              </Radio>
              <Radio value="DEVIANTART" disabled={disabled}>
                DeviantArt Account
              </Radio>
            </RadioGroup>
          </Section>

          <Section>
            <Label>
              {provider === 'DISCORD'
                ? 'Search Discord Account'
                : 'Search DeviantArt Account'}
            </Label>
            <InputRow>
              <InputWrapper>
                <Input
                  type="text"
                  value={accountId}
                  onChange={(e) => handleAccountIdChange(e.target.value)}
                  placeholder={
                    provider === 'DISCORD'
                      ? discordGuildId
                        ? 'Search by @handle or numeric ID'
                        : 'Numeric Discord ID (17-19 digits)'
                      : 'Search by account name'
                  }
                  autoComplete="off"
                  disabled={disabled}
                  hasError={!!validationError || !!checkError}
                />
                {validationError && <ErrorText>{validationError}</ErrorText>}
                {checkError && <ErrorText>{checkError}</ErrorText>}
                <HelpText>
                  {provider === 'DISCORD'
                    ? discordGuildId
                      ? `Enter Discord username (with @) or numeric user ID. Server: ${discordGuildName || 'Connected'}`
                      : 'Enter numeric Discord user ID (17-19 digits). No Discord server connected to this community.'
                    : 'Enter DeviantArt username'}
                </HelpText>
              </InputWrapper>
              {provider === 'DISCORD' && (
                <CheckButton
                  onClick={handleCheckDiscordUser}
                  disabled={disabled || isChecking || !accountId.trim()}
                  type="button"
                >
                  {isChecking ? 'Checking...' : 'Check'}
                </CheckButton>
              )}
            </InputRow>

            {resolvedUser && (
              <ResolvedUserCard>
                {resolvedUser.avatarUrl && (
                  <Avatar src={resolvedUser.avatarUrl} alt={resolvedUser.username} />
                )}
                <UserInfo>
                  <Username>
                    {resolvedUser.displayName || resolvedUser.username}
                  </Username>
                  <UserId>Resolved to ID: {resolvedUser.userId}</UserId>
                </UserInfo>
              </ResolvedUserCard>
            )}
          </Section>

          {!discordGuildId && provider === 'DISCORD' && (
            <Alert variant="warning">
              No Discord server is linked to this community. You must use numeric
              Discord user IDs. Username resolution requires a connected Discord
              server.
            </Alert>
          )}
        </>
      )}
    </Container>
  );
};
