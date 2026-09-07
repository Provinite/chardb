import { gql } from "@apollo/client";

export const NOTIFICATION_PREFERENCE_FIELDS = gql`
  fragment NotificationPreferenceFields on NotificationPreference {
    kind
    inApp
    email
    emailSupported
  }
`;

export const NOTIFICATION_PREFERENCES = gql`
  ${NOTIFICATION_PREFERENCE_FIELDS}
  query NotificationPreferences {
    notificationPreferences {
      ...NotificationPreferenceFields
    }
  }
`;

// Returns the whole matrix rather than the one row that changed, so a toggle
// never has to merge a response into the cache by hand.
export const UPDATE_NOTIFICATION_PREFERENCE = gql`
  ${NOTIFICATION_PREFERENCE_FIELDS}
  mutation UpdateNotificationPreference(
    $input: UpdateNotificationPreferenceInput!
  ) {
    updateNotificationPreference(input: $input) {
      ...NotificationPreferenceFields
    }
  }
`;

export {
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferenceMutation,
  NotificationChannel,
  type NotificationPreferenceFieldsFragment,
  type NotificationPreferencesQuery,
  type UpdateNotificationPreferenceMutation,
} from "../generated/graphql";
