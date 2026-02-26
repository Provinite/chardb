import { gql } from '@apollo/client';

export const RUN_DEVIANTART_UUID_BACKFILL = gql`
  mutation RunDeviantartUuidBackfill($jobId: String!) {
    runDeviantartUuidBackfill(jobId: $jobId)
  }
`;

export const CANCEL_DEVIANTART_UUID_BACKFILL = gql`
  mutation CancelDeviantartUuidBackfill {
    cancelDeviantartUuidBackfill
  }
`;

export const DEVIANTART_UUID_BACKFILL_PROGRESS = gql`
  subscription DeviantartUuidBackfillProgress($jobId: String!) {
    deviantartUuidBackfillProgress(jobId: $jobId) {
      jobId
      total
      processed
      succeeded
      failed
      claimed
      currentRecord {
        pendingOwnershipId
        characterId
        itemId
        oldValue
        newValue
        success
        error
        claimed
        claimedByUserId
      }
      done
      cancelled
    }
  }
`;
