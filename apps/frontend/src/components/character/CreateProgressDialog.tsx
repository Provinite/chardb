import React, { useId } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import styled, { css, keyframes } from "styled-components";
import type { CreateProgress, Step, StepKey } from "../../lib/createWithImage";

/**
 * Walks a character's creation step by step (#424).
 *
 * Create, upload, set as main: three requests, and a large image makes the
 * middle one slow. The dialog stands in front of the form for all of it, so
 * nobody wanders off mid-upload, and when it ends it says what happened and
 * what can be done next -- without sending anyone anywhere they did not
 * choose.
 */

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const popIn = keyframes`
  0% { opacity: 0; transform: scale(0.85); }
  60% { opacity: 1; transform: scale(1.03); }
  100% { transform: scale(1); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const draw = keyframes`
  to { stroke-dashoffset: 0; }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(15, 12, 30, 0.55);
  animation: ${fadeIn} 0.15s ease-out;
`;

const Card = styled.div`
  width: min(440px, 100%);
  padding: ${({ theme }) => theme.spacing.xl};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background};
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
  animation: ${popIn} 0.3s ease-out;
`;

type Tone = "running" | "success" | "warning" | "error";

const toneColor = (tone: Tone) => css`
  color: ${({ theme }) =>
    tone === "success"
      ? theme.colors.success
      : tone === "warning"
        ? theme.colors.warning
        : tone === "error"
          ? theme.colors.error
          : theme.colors.primary};
`;

const BigIcon = styled.svg<{ $tone: Tone }>`
  width: 88px;
  height: 88px;
  margin: 0 auto ${({ theme }) => theme.spacing.lg};
  display: block;
  ${({ $tone }) => toneColor($tone)}

  circle {
    fill: none;
    stroke: currentColor;
    stroke-width: 4;
    opacity: 0.25;
  }

  .ring {
    opacity: 1;
    stroke-dasharray: 60 180;
    transform-origin: 50% 50%;
    animation: ${spin} 0.9s linear infinite;
  }

  .mark {
    fill: none;
    stroke: currentColor;
    stroke-width: 5;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 60;
    stroke-dashoffset: 60;
    animation: ${draw} 0.45s 0.1s ease-out forwards;
  }
`;

const Title = styled.h2`
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Detail = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Steps = styled.ol`
  list-style: none;
  margin: 0 0 ${({ theme }) => theme.spacing.lg};
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  text-align: left;
`;

const StepRow = styled.li<{ $status: Step["status"] }>`
  display: grid;
  grid-template-columns: 24px 1fr;
  align-items: center;
  column-gap: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme, $status }) =>
    $status === "todo" ? theme.colors.text.muted : theme.colors.text.primary};
  transition: color 0.2s;
`;

const StepIcon = styled.span<{ $status: Step["status"] }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: white;
  ${({ theme, $status }) =>
    $status === "done"
      ? css`
          background: ${theme.colors.success};
          animation: ${popIn} 0.25s ease-out;
        `
      : $status === "failed"
        ? css`
            background: ${theme.colors.error};
            animation: ${popIn} 0.25s ease-out;
          `
        : $status === "running"
          ? css`
              border: 2px solid ${theme.colors.primary}40;
              border-top-color: ${theme.colors.primary};
              animation: ${spin} 0.8s linear infinite;
            `
          : css`
              border: 2px solid ${theme.colors.border};
            `}
`;

const Bar = styled.div`
  grid-column: 2;
  margin-top: ${({ theme }) => theme.spacing.xs};
  height: 6px;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
`;

const BarFill = styled.div`
  height: 100%;
  background: ${({ theme }) => theme.colors.primary};
  transition: width 0.2s;
`;

const Percent = styled.span`
  margin-left: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: center;
  flex-wrap: wrap;
`;

const action = css<{ $primary?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-decoration: none;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $primary }) =>
      $primary ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $primary }) =>
    $primary ? theme.colors.primary : theme.colors.background};
  color: ${({ theme, $primary }) =>
    $primary ? "white" : theme.colors.text.primary};

  &:hover {
    filter: brightness(0.95);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const ActionLink = styled(Link)<{ $primary?: boolean }>`
  ${action}
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
  ${action}
`;

const STEP_LABEL: Record<StepKey, (isMyo: boolean) => string> = {
  create: (isMyo) => (isMyo ? "Redeeming ticket" : "Creating character"),
  upload: () => "Uploading image",
  setMain: () => "Setting as profile image",
};

const StatusGlyph: React.FC<{ status: Step["status"] }> = ({ status }) => (
  <StepIcon $status={status} aria-hidden="true">
    {status === "done" ? "✓" : status === "failed" ? "✕" : null}
  </StepIcon>
);

const Icon: React.FC<{ tone: Tone }> = ({ tone }) => (
  <BigIcon viewBox="0 0 88 88" $tone={tone} aria-hidden="true">
    <circle cx="44" cy="44" r="38" />
    {tone === "running" && <circle className="ring" cx="44" cy="44" r="38" />}
    {tone === "success" && <path className="mark" d="M27 45 l11 11 l23 -24" />}
    {tone === "error" && (
      <path className="mark" d="M31 31 l26 26 M57 31 l-26 26" />
    )}
    {tone === "warning" && <path className="mark" d="M44 26 v24 M44 60 v2" />}
  </BigIcon>
);

interface CreateProgressDialogProps {
  /** Null until Create is pressed; the dialog is shown from then on. */
  progress: CreateProgress | null;
  characterName: string;
  /** A spent ticket has nothing to "create another" from. */
  isMyo: boolean;
  /** Clear the form for the next character, and close. */
  onCreateAnother: () => void;
  /** Close and leave the form as it was, to try again. */
  onBackToForm: () => void;
}

export const CreateProgressDialog: React.FC<CreateProgressDialogProps> = ({
  progress,
  characterName,
  isMyo,
  onCreateAnother,
  onBackToForm,
}) => {
  const titleId = useId();
  if (!progress) return null;

  const { outcome, failedStep, characterId, mediaId, error } = progress;
  const name = characterName || "Your character";
  const characterHref = `/character/${characterId}`;

  let tone: Tone = "running";
  let title = isMyo ? `Making ${name}…` : `Creating ${name}…`;
  let detail: string | undefined;

  if (outcome === "done") {
    tone = "success";
    title = `${name} is ready`;
    // A ticket's character is the member's at once, but its traits are not
    // settled until staff have looked.
    if (isMyo) detail = "Its traits are with staff for review.";
  } else if (outcome === "failed" && failedStep === "create") {
    tone = "error";
    title = `${name} wasn't created`;
    detail = error ?? "Something went wrong. Your form is just as you left it.";
  } else if (outcome === "failed") {
    tone = "warning";
    title = `${name} was created`;
    detail =
      failedStep === "upload"
        ? "Its image couldn't be uploaded."
        : "Its image uploaded, but couldn't be set as its profile image.";
  }

  return createPortal(
    <Overlay>
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="create-progress-dialog"
      >
        <Icon tone={tone} />
        <Title id={titleId} aria-live="polite">
          {title}
        </Title>
        {detail && <Detail>{detail}</Detail>}

        <Steps>
          {progress.steps.map((step) => (
            <StepRow
              key={step.key}
              $status={step.status}
              data-status={step.status}
              aria-label={`${STEP_LABEL[step.key](isMyo)}: ${step.status}`}
            >
              <StatusGlyph status={step.status} />
              <span>
                {STEP_LABEL[step.key](isMyo)}
                {step.key === "upload" && step.status === "running" && (
                  <Percent>{Math.round((step.progress ?? 0) * 100)}%</Percent>
                )}
              </span>
              {step.key === "upload" && step.status === "running" && (
                <Bar>
                  <BarFill
                    style={{ width: `${(step.progress ?? 0) * 100}%` }}
                  />
                </Bar>
              )}
            </StepRow>
          ))}
        </Steps>

        {outcome !== "running" && (
          <Actions>
            {outcome === "done" && (
              <>
                <ActionLink to={characterHref} $primary>
                  View character
                </ActionLink>
                {isMyo ? (
                  <ActionLink to="/inventory">Back to inventory</ActionLink>
                ) : (
                  <ActionButton type="button" onClick={onCreateAnother}>
                    Create another
                  </ActionButton>
                )}
              </>
            )}

            {outcome === "failed" && failedStep === "create" && (
              <ActionButton type="button" onClick={onBackToForm} $primary>
                Back to form
              </ActionButton>
            )}

            {outcome === "failed" && failedStep !== "create" && (
              <>
                <ActionLink to={characterHref} $primary>
                  Go to character
                </ActionLink>
                {failedStep === "upload" ? (
                  <ActionLink to={`/image/upload?character=${characterId}`}>
                    Upload again
                  </ActionLink>
                ) : (
                  <ActionLink to={`/media/${mediaId}`}>
                    Open the image
                  </ActionLink>
                )}
              </>
            )}
          </Actions>
        )}
      </Card>
    </Overlay>,
    document.body,
  );
};
