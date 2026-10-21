import React, { useState } from "react";
import styled from "styled-components";
import { Button, Input } from "@chardb/ui";
import { toast } from "react-hot-toast";
import {
  useUpdateHalloweenSettingsMutation,
  type HalloweenSettingsFieldsFragment,
} from "../../generated/graphql";

/**
 * The Halloween event's settings: what `/settings set` used to change in
 * Discord. The bot's own rules (start before end, win rate 0-100%) are
 * checked by the server, whose message is shown as-is.
 */

const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Hint = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Actions = styled.div`
  grid-column: 1 / -1;
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
`;

const ErrorText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.error};
  font-size: 0.875rem;
`;

/** `2026-10-01T05:00:00.000Z` as the value a datetime-local input wants, in the viewer's time. */
const toLocalInput = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const fromLocalInput = (value: string): string | null =>
  value ? new Date(value).toISOString() : null;

/** What the bot started a guild with before anyone changed anything. */
const DEFAULTS = { knocksPerDay: 2, resetTime: 6, winRate: 0.5 };

interface HalloweenSettingsFormProps {
  communityId: string;
  /** Null until the event is set up for the first time. */
  settings: HalloweenSettingsFieldsFragment | null;
  onSaved: () => void;
  onCancel?: () => void;
}

export const HalloweenSettingsForm: React.FC<HalloweenSettingsFormProps> = ({
  communityId,
  settings,
  onSaved,
  onCancel,
}) => {
  const [startDate, setStartDate] = useState(toLocalInput(settings?.startDate));
  const [endDate, setEndDate] = useState(toLocalInput(settings?.endDate));
  const [knocksPerDay, setKnocksPerDay] = useState(
    String(settings?.knocksPerDay ?? DEFAULTS.knocksPerDay),
  );
  const [resetTime, setResetTime] = useState(
    String(settings?.resetTime ?? DEFAULTS.resetTime),
  );
  const [winRatePercent, setWinRatePercent] = useState(
    String(Math.round((settings?.winRate ?? DEFAULTS.winRate) * 10000) / 100),
  );
  const [winChannel, setWinChannel] = useState(settings?.winChannel ?? "");
  const [error, setError] = useState<string | null>(null);

  const [save, { loading }] = useUpdateHalloweenSettingsMutation();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await save({
        variables: {
          communityId,
          input: {
            startDate: fromLocalInput(startDate),
            endDate: fromLocalInput(endDate),
            knocksPerDay: Number(knocksPerDay),
            resetTime: Number(resetTime),
            winRate: Number(winRatePercent) / 100,
            winChannel: winChannel.trim() || null,
          },
        },
      });
      toast.success("Event settings saved");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    }
  };

  return (
    <Form
      onSubmit={(e) => void handleSubmit(e)}
      data-testid="halloween-settings-form"
    >
      <Field>
        <Label htmlFor="halloween-start">Starts</Label>
        <Input
          id="halloween-start"
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Hint>Your local time. Blank: not started.</Hint>
      </Field>
      <Field>
        <Label htmlFor="halloween-end">Ends</Label>
        <Input
          id="halloween-end"
          type="datetime-local"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <Hint>Your local time. Blank: runs until stopped.</Hint>
      </Field>
      <Field>
        <Label htmlFor="halloween-knocks">Knocks per day</Label>
        <Input
          id="halloween-knocks"
          type="number"
          min={1}
          step={1}
          required
          value={knocksPerDay}
          onChange={(e) => setKnocksPerDay(e.target.value)}
        />
      </Field>
      <Field>
        <Label htmlFor="halloween-reset">Reset hour (US Central, 0–23)</Label>
        <Input
          id="halloween-reset"
          type="number"
          min={0}
          max={23}
          step={1}
          required
          value={resetTime}
          onChange={(e) => setResetTime(e.target.value)}
        />
        <Hint>When everyone&apos;s knocks and gifties come back.</Hint>
      </Field>
      <Field>
        <Label htmlFor="halloween-win-rate">Win rate (%)</Label>
        <Input
          id="halloween-win-rate"
          type="number"
          min={0}
          max={100}
          step="any"
          required
          value={winRatePercent}
          onChange={(e) => setWinRatePercent(e.target.value)}
        />
        <Hint>Chance each knock wins a prize.</Hint>
      </Field>
      <Field>
        <Label htmlFor="halloween-win-channel">Win channel ID</Label>
        <Input
          id="halloween-win-channel"
          inputMode="numeric"
          value={winChannel}
          onChange={(e) => setWinChannel(e.target.value)}
          placeholder="Optional"
        />
        <Hint>Discord channel every win is also announced in.</Hint>
      </Field>
      <Actions>
        <Button type="submit" variant="primary" disabled={loading}>
          {settings ? "Save settings" : "Set up the event"}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {error && <ErrorText role="alert">{error}</ErrorText>}
      </Actions>
    </Form>
  );
};
