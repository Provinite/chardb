import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import {
  useRunDeviantartUuidBackfillMutation,
  useDeviantartUuidBackfillProgressSubscription,
  type DeviantartUuidBackfillRecordResult,
} from '../generated/graphql';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
`;

const Description = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
`;

const RunButton = styled.button<{ $disabled?: boolean }>`
  background: ${({ theme, $disabled }) => $disabled ? theme.colors.text.muted : theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  transition: opacity 0.2s;

  &:hover {
    opacity: ${({ $disabled }) => $disabled ? 1 : 0.9};
  }
`;

const ProgressSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const ProgressBarContainer = styled.div`
  background: ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  height: 24px;
  overflow: hidden;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ProgressBarFill = styled.div<{ $percent: number }>`
  background: ${({ theme }) => theme.colors.primary};
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  transition: width 0.3s ease;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const ProgressLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  text-align: center;
`;

const StatsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  flex-wrap: wrap;
`;

const StatBadge = styled.div<{ $color: string }>`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const StatDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

const StatLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const StatValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const LogContainer = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  max-height: 400px;
  overflow-y: auto;
  font-family: monospace;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const LogEntry = styled.div`
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.md}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const LogEntryHeader = styled.div<{ $success: boolean }>`
  color: ${({ theme, $success }) => $success ? theme.colors.success : theme.colors.error};
`;

const LogLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  margin-left: ${({ theme }) => theme.spacing.sm};
`;

const LogError = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  padding-left: ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  word-break: break-word;
`;

const CharLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  margin-left: ${({ theme }) => theme.spacing.sm};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const DoneMessage = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.success};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.success};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`;

const ErrorMessage = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.error};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.error};
`;

export function DeviantArtBackfillPage() {
  const { user } = useAuth();
  const [jobId, setJobId] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [records, setRecords] = useState<DeviantartUuidBackfillRecordResult[]>([]);
  const [stats, setStats] = useState({ total: 0, processed: 0, succeeded: 0, failed: 0, claimed: 0 });
  const logRef = useRef<HTMLDivElement>(null);

  const [runBackfill, { error: mutationError }] = useRunDeviantartUuidBackfillMutation();

  useDeviantartUuidBackfillProgressSubscription({
    variables: { jobId: jobId! },
    skip: !jobId,
    onData: ({ data: { data } }) => {
      if (!data) return;
      const progress = data.deviantartUuidBackfillProgress;
      setStats({
        total: progress.total,
        processed: progress.processed,
        succeeded: progress.succeeded,
        failed: progress.failed,
        claimed: progress.claimed,
      });
      if (progress.currentRecord) {
        setRecords(prev => [...prev, progress.currentRecord!]);
        // Auto-scroll to bottom
        requestAnimationFrame(() => {
          logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
        });
      }
      if (progress.done) {
        setIsDone(true);
        setJobId(null);
      }
    },
  });

  const handleRun = useCallback(async () => {
    const newJobId = crypto.randomUUID();
    setJobId(newJobId);
    setIsDone(false);
    setRecords([]);
    setStats({ total: 0, processed: 0, succeeded: 0, failed: 0, claimed: 0 });

    try {
      await runBackfill({ variables: { jobId: newJobId } });
    } catch {
      setJobId(null);
    }
  }, [runBackfill]);

  if (!user?.isAdmin) {
    return (
      <Container>
        <Title>Access Denied</Title>
        <Description>You must be a site admin to access this page.</Description>
      </Container>
    );
  }

  const isRunning = !!jobId;
  const percent = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;

  return (
    <Container>
      <Header>
        <Title>DeviantArt UUID Backfill</Title>
        <Description>
          Resolves DeviantArt usernames stored in pending ownership records to their corresponding
          DeviantArt UUIDs. Records that match a linked DeviantArt account will be automatically
          claimed by the account owner.
        </Description>
      </Header>

      <RunButton $disabled={isRunning} onClick={handleRun} disabled={isRunning}>
        {isRunning ? 'Running...' : isDone ? 'Run Again' : 'Run Backfill'}
      </RunButton>

      {mutationError && (
        <ErrorMessage>{mutationError.message}</ErrorMessage>
      )}

      {(isRunning || isDone) && (
        <ProgressSection>
          <ProgressLabel>{stats.processed} / {stats.total} records processed ({percent}%)</ProgressLabel>
          <ProgressBarContainer>
            <ProgressBarFill $percent={percent} />
          </ProgressBarContainer>

          <StatsRow>
            <StatBadge $color="success">
              <StatDot $color="#10b981" />
              <StatLabel>Succeeded</StatLabel>
              <StatValue>{stats.succeeded}</StatValue>
            </StatBadge>
            <StatBadge $color="error">
              <StatDot $color="#ef4444" />
              <StatLabel>Failed</StatLabel>
              <StatValue>{stats.failed}</StatValue>
            </StatBadge>
            <StatBadge $color="info">
              <StatDot $color="#8b5cf6" />
              <StatLabel>Auto-claimed</StatLabel>
              <StatValue>{stats.claimed}</StatValue>
            </StatBadge>
          </StatsRow>

          {records.length > 0 && (
            <LogContainer ref={logRef}>
              {records.map((record) => (
                <LogEntry key={record.pendingOwnershipId}>
                  <LogEntryHeader $success={record.success}>
                    {record.success ? '✓' : '✗'}{' '}
                    {record.oldValue}
                    {record.success && <> → {record.newValue}</>}
                    {record.claimed && <LogLabel>(auto-claimed)</LogLabel>}
                    {record.characterId && (
                      <CharLink to={`/character/${record.characterId}`}>view</CharLink>
                    )}
                  </LogEntryHeader>
                  {record.error && <LogError>{record.error}</LogError>}
                </LogEntry>
              ))}
            </LogContainer>
          )}

          {isDone && (
            <DoneMessage>
              Backfill complete — {stats.succeeded} succeeded, {stats.failed} failed, {stats.claimed} auto-claimed
            </DoneMessage>
          )}
        </ProgressSection>
      )}
    </Container>
  );
}
