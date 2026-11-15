import React, { useId, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  Alert,
  Button,
  Cluster,
  Dialog,
  Grid,
  IconButton,
  Input,
  SearchSelect,
  Stack,
} from "@chardb/ui";
import type {
  CreatePersonalAccessTokenInput,
  PersonalAccessTokenGrantOptionsQuery,
} from "../../../generated/graphql";
import {
  PERMISSION_CATEGORIES,
  PERMISSIONS_MAP,
  type PermissionCategory,
} from "../../../lib/permissions";
import * as styles from "./CreateAccessTokenDialog.css";

type GrantOptions =
  PersonalAccessTokenGrantOptionsQuery["personalAccessTokenGrantOptions"];
type CommunityOption = GrantOptions["communities"][number];

interface DraftGrant {
  community: CommunityOption;
  member: boolean;
  permissions: string[];
}

export interface CreateAccessTokenDialogProps {
  open: boolean;
  /** Absent while it loads. */
  options?: GrantOptions;
  busy?: boolean;
  /** Why the last attempt failed. */
  error?: string | null;
  /** The new token's secret: once set, the dialog shows it and nothing else. */
  secret?: string | null;
  onSubmit: (input: CreatePersonalAccessTokenInput) => void;
  onCopy: (secret: string) => void;
  onClose: () => void;
}

const DEFAULT_LIFETIME_DAYS = 90;

const permissionInfo: Record<
  string,
  { name: string; description: string; category: PermissionCategory }
> = PERMISSIONS_MAP;

/** Mints a personal access token, then shows its secret once. */
export const CreateAccessTokenDialog: React.FC<CreateAccessTokenDialogProps> = (
  props,
) => (
  <Dialog.Root
    open={props.open}
    onClose={props.onClose}
    closeDisabled={props.busy}
    width="wide"
  >
    <Dialog.Title>
      {props.secret ? "Copy your access token" : "Create an access token"}
    </Dialog.Title>
    <Dialog.Body>
      {props.secret ? (
        <SecretView
          secret={props.secret}
          onCopy={props.onCopy}
          onDone={props.onClose}
        />
      ) : (
        <TokenForm {...props} />
      )}
    </Dialog.Body>
  </Dialog.Root>
);

const SecretView: React.FC<{
  secret: string;
  onCopy: (secret: string) => void;
  onDone: () => void;
}> = ({ secret, onCopy, onDone }) => (
  <Stack gap="md">
    <Alert variant="warning">
      This is the only time the token is shown. Store it somewhere safe before
      closing.
    </Alert>
    <code className={styles.secret} data-testid="access-token-secret">
      {secret}
    </code>
    <p className={styles.help}>
      Send it as <code>Authorization: Bearer &lt;token&gt;</code>.
    </p>
    <Cluster gap="sm" justify="flex-end">
      <Button tone="outline" onClick={() => onCopy(secret)}>
        Copy
      </Button>
      <Button onClick={onDone}>Done</Button>
    </Cluster>
  </Stack>
);

const TokenForm: React.FC<CreateAccessTokenDialogProps> = ({
  options,
  busy,
  error,
  onSubmit,
  onClose,
}) => {
  const nameId = useId();
  const lifetimeId = useId();
  const [name, setName] = useState("");
  const [lifetime, setLifetime] = useState(DEFAULT_LIFETIME_DAYS);
  const [grants, setGrants] = useState<DraftGrant[]>([]);
  const [search, setSearch] = useState("");

  const unpicked = useMemo(() => {
    const picked = new Set(grants.map((grant) => grant.community.id));
    const needle = search.trim().toLowerCase();
    return (options?.communities ?? []).filter(
      (community) =>
        !picked.has(community.id) &&
        community.name.toLowerCase().includes(needle),
    );
  }, [options, grants, search]);

  const byCategory = useMemo(() => {
    const groups = new Map<PermissionCategory, string[]>();
    for (const permission of options?.permissions ?? []) {
      const category = permissionInfo[permission]?.category ?? "content";
      groups.set(category, [...(groups.get(category) ?? []), permission]);
    }
    return groups;
  }, [options]);

  const update = (communityId: string, change: Partial<DraftGrant>) =>
    setGrants((current) =>
      current.map((grant) =>
        grant.community.id === communityId ? { ...grant, ...change } : grant,
      ),
    );

  const complete =
    name.trim().length > 0 &&
    grants.length > 0 &&
    grants.every((grant) => grant.member || grant.permissions.length > 0);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!complete) return;
    onSubmit({
      name: name.trim(),
      expiresInDays: lifetime,
      communities: grants.map((grant) => ({
        communityId: grant.community.id,
        member: grant.member,
        permissions: grant.permissions,
      })),
    });
  };

  return (
    <Stack as="form" gap="lg" onSubmit={submit} noValidate>
      <Stack gap="xs">
        <label htmlFor={nameId} className={styles.label}>
          Name
        </label>
        <Input
          id={nameId}
          value={name}
          maxLength={100}
          placeholder="What will use it"
          onChange={(event) => setName(event.target.value)}
          data-autofocus
        />
      </Stack>

      <Stack gap="xs">
        <label htmlFor={lifetimeId} className={styles.label}>
          Expires after
        </label>
        <select
          id={lifetimeId}
          className={styles.select}
          value={lifetime}
          onChange={(event) => setLifetime(Number(event.target.value))}
        >
          {(options?.lifetimesDays ?? [DEFAULT_LIFETIME_DAYS]).map((days) => (
            <option key={days} value={days}>
              {days} days
            </option>
          ))}
        </select>
      </Stack>

      <Stack gap="sm">
        <SearchSelect
          label="Add a community"
          placeholder="Search communities"
          value={null}
          options={unpicked}
          minSearchLength={0}
          loading={!options}
          emptyText="No community matches"
          onSearch={setSearch}
          onChange={(community) => {
            if (!community) return;
            setGrants((current) => [
              ...current,
              { community, member: true, permissions: [] },
            ]);
          }}
        />
        <p className={styles.help}>
          The token can act only in the communities added here, with only the
          permissions checked.
        </p>
      </Stack>

      {grants.map((grant) => (
        <fieldset key={grant.community.id} className={styles.grant}>
          <legend className={styles.legend}>{grant.community.name}</legend>
          <Stack gap="sm">
            <Cluster gap="sm" justify="space-between">
              <Checkbox
                label="Member"
                checked={grant.member}
                onChange={(member) => update(grant.community.id, { member })}
              />
              <IconButton
                label={`Remove ${grant.community.name}`}
                icon={<X />}
                onClick={() =>
                  setGrants((current) =>
                    current.filter(
                      (other) => other.community.id !== grant.community.id,
                    ),
                  )
                }
              />
            </Cluster>
            {[...byCategory].map(([category, permissions]) => (
              <Stack gap="xs" key={category}>
                <p className={styles.category}>
                  {PERMISSION_CATEGORIES[category].title}
                </p>
                <Grid min="lg" gap="xs">
                  {permissions.map((permission) => (
                    <Checkbox
                      key={permission}
                      label={permissionInfo[permission]?.name ?? permission}
                      checked={grant.permissions.includes(permission)}
                      onChange={(checked) =>
                        update(grant.community.id, {
                          permissions: checked
                            ? [...grant.permissions, permission]
                            : grant.permissions.filter(
                                (other) => other !== permission,
                              ),
                        })
                      }
                    />
                  ))}
                </Grid>
              </Stack>
            ))}
          </Stack>
        </fieldset>
      ))}

      <p className={styles.message} role="alert">
        {error ?? ""}
      </p>

      <Cluster gap="sm" justify="flex-end">
        <Button tone="outline" type="button" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={!complete} busy={busy}>
          Create token
        </Button>
      </Cluster>
    </Stack>
  );
};

const Checkbox: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className={styles.checkbox}>
    <input
      type="checkbox"
      className={styles.checkboxInput}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
    {label}
  </label>
);
