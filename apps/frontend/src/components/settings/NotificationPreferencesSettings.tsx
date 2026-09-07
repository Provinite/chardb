import styled from "styled-components";
import toast from "react-hot-toast";
import { NotificationKind } from "../../graphql/notifications.graphql";
import {
  NotificationChannel,
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferenceMutation,
  type NotificationPreferenceFieldsFragment,
} from "../../graphql/notification-preferences.graphql";

/**
 * What each kind is called on the settings page.
 *
 * The copy lives here rather than on the server for the same reason
 * `notification-display.ts` holds the feed's wording: these are words a person
 * reads, and the server has no business owning them. A kind with no entry falls
 * back to its enum name, so a newer server listing a kind this build has not
 * heard of degrades to something ugly but honest rather than blank.
 */
const KIND_COPY: Partial<
  Record<NotificationKind, { label: string; description: string }>
> = {
  [NotificationKind.ImageApproved]: {
    label: "Image approved",
    description: "One of your uploads cleared moderation.",
  },
  [NotificationKind.ImageRejected]: {
    label: "Image not approved",
    description: "One of your uploads was rejected, with a reason.",
  },
  [NotificationKind.CommentReceived]: {
    label: "Comments",
    description: "Somebody commented on something of yours.",
  },
  [NotificationKind.FollowReceived]: {
    label: "New followers",
    description: "Somebody followed you.",
  },
  [NotificationKind.ItemGranted]: {
    label: "Items received",
    description: "Staff gave you an item.",
  },
  [NotificationKind.ItemRevoked]: {
    label: "Items taken back",
    description: "Staff removed an item from your inventory.",
  },
  [NotificationKind.CurrencyReceived]: {
    label: "Currency received",
    description: "Currency reached your balance.",
  },
  [NotificationKind.TradeOffered]: {
    label: "Trade offers",
    description: "Somebody offered you a trade.",
  },
  [NotificationKind.TradeAccepted]: {
    label: "Trades accepted",
    description: "A trade you proposed settled.",
  },
  [NotificationKind.TradeDeclined]: {
    label: "Trades declined",
    description: "A trade you proposed was turned down.",
  },
};

export function NotificationPreferencesSettings() {
  const { data, loading, error } = useNotificationPreferencesQuery();
  const [updatePreference] = useUpdateNotificationPreferenceMutation();

  const preferences = data?.notificationPreferences ?? [];

  const toggle = async (
    row: NotificationPreferenceFieldsFragment,
    channel: NotificationChannel,
    enabled: boolean,
  ) => {
    try {
      await updatePreference({
        variables: { input: { kind: row.kind, channel, enabled } },
        // The mutation answers with the whole matrix, so the switch moves as
        // soon as the click lands and snaps back on its own if the write fails.
        optimisticResponse: {
          updateNotificationPreference: preferences.map((pref) =>
            pref.kind === row.kind
              ? {
                  ...pref,
                  inApp:
                    channel === NotificationChannel.InApp
                      ? enabled
                      : pref.inApp,
                  email:
                    channel === NotificationChannel.Email
                      ? enabled
                      : pref.email,
                }
              : pref,
          ),
        },
      });
    } catch {
      toast.error("Could not save that setting. Please try again.");
    }
  };

  if (loading) {
    return <Muted>Loading your notification settings…</Muted>;
  }

  if (error) {
    return <Muted>Your notification settings could not be loaded.</Muted>;
  }

  return (
    <div data-testid="notification-preferences">
      <Matrix>
        <ColumnHeadings aria-hidden="true">
          <span />
          <ChannelHeading>In app</ChannelHeading>
          <ChannelHeading>Email</ChannelHeading>
        </ColumnHeadings>

        {preferences.map((row) => {
          const copy = KIND_COPY[row.kind];
          const label = copy?.label ?? row.kind;

          return (
            <Row
              key={row.kind}
              data-testid="preference-row"
              data-kind={row.kind}
            >
              <Details>
                <RowLabel>{label}</RowLabel>
                {copy ? (
                  <RowDescription>{copy.description}</RowDescription>
                ) : null}
              </Details>

              <Cell>
                <Checkbox
                  checked={row.inApp}
                  aria-label={`${label} in app`}
                  onChange={(event) =>
                    toggle(row, NotificationChannel.InApp, event.target.checked)
                  }
                />
              </Cell>

              <Cell>
                {row.emailSupported ? (
                  <Checkbox
                    checked={row.email}
                    aria-label={`${label} by email`}
                    onChange={(event) =>
                      toggle(
                        row,
                        NotificationChannel.Email,
                        event.target.checked,
                      )
                    }
                  />
                ) : (
                  // No template behind this kind yet, so there is nothing to
                  // switch. A disabled box would read as "off", which is a
                  // different and wrong claim.
                  <NotApplicable title="This kind is not emailed">
                    —
                  </NotApplicable>
                )}
              </Cell>
            </Row>
          );
        })}
      </Matrix>

      <AlwaysSent>
        <AlwaysSentTitle>Always sent</AlwaysSentTitle>
        <RowDescription>
          Password resets and password-change confirmations are security email
          and cannot be turned off.
        </RowDescription>
      </AlwaysSent>
    </div>
  );
}

const Matrix = styled.div`
  display: flex;
  flex-direction: column;
`;

const gridColumns = "1fr 5rem 5rem";

const ColumnHeadings = styled.div`
  display: grid;
  grid-template-columns: ${gridColumns};
  align-items: center;
  padding: 0 0.5rem 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const ChannelHeading = styled.span`
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: ${gridColumns};
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.5rem;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const Details = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const RowLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const RowDescription = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const Cell = styled.div`
  display: flex;
  justify-content: center;
`;

const Checkbox = styled.input.attrs({ type: "checkbox" })`
  width: 1rem;
  height: 1rem;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.colors.primary};
`;

const NotApplicable = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const AlwaysSent = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const AlwaysSentTitle = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const Muted = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
`;
