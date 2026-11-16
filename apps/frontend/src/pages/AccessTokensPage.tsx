import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { Plus } from "lucide-react";
import { Alert, Button, Cluster, Stack } from "@chardb/ui";
import { usePageMeta } from "../lib/pageMeta";
import {
  PERSONAL_ACCESS_TOKENS,
  useCreatePersonalAccessTokenMutation,
  usePersonalAccessTokenGrantOptionsQuery,
  usePersonalAccessTokensQuery,
  useRevokePersonalAccessTokenMutation,
  type PersonalAccessTokenFieldsFragment,
} from "../graphql/personal-access-tokens.graphql";
import { AccessTokenListView } from "../components/admin/access-tokens/AccessTokenListView";
import { CreateAccessTokenDialog } from "../components/admin/access-tokens/CreateAccessTokenDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import * as styles from "./AccessTokensPage.css";

/** `/admin/access-tokens`: a site admin's personal access tokens. */
export const AccessTokensPage: React.FC = () => {
  usePageMeta({ title: "Access Tokens" });

  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [revoking, setRevoking] =
    useState<PersonalAccessTokenFieldsFragment | null>(null);

  const { data, loading, error } = usePersonalAccessTokensQuery({
    fetchPolicy: "cache-and-network",
  });
  // Fetched with the page, not when the dialog opens: the site permissions
  // section exists only once these arrive, and would push the form down.
  const { data: optionsData } = usePersonalAccessTokenGrantOptionsQuery();
  const [create, { loading: createBusy }] =
    useCreatePersonalAccessTokenMutation({
      // Not awaited: the secret exists only in this response, and a failed
      // refresh of the list must not lose it.
      refetchQueries: [{ query: PERSONAL_ACCESS_TOKENS }],
    });
  const [revoke, { loading: revokeBusy }] =
    useRevokePersonalAccessTokenMutation();

  const closeCreate = () => {
    setCreating(false);
    setSecret(null);
    setCreateError(null);
  };

  return (
    <Stack gap="lg" className={styles.page}>
      <Stack gap="sm">
        <h1 className={styles.title}>Access Tokens</h1>
        <p className={styles.intro}>
          A token lets a script or an agent use the API as you, with only the
          site permissions and community permissions you grant. It cannot change
          your account or manage tokens.
        </p>
      </Stack>

      <Cluster gap="sm" justify="space-between">
        <h2 className={styles.heading}>Your tokens</h2>
        <Button icon={<Plus />} onClick={() => setCreating(true)}>
          Create token
        </Button>
      </Cluster>

      {error && !data ? (
        <Alert variant="error">Your tokens could not be loaded.</Alert>
      ) : loading && !data ? (
        <Stack gap="md" aria-hidden>
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
        </Stack>
      ) : (
        <AccessTokenListView
          tokens={data?.personalAccessTokens ?? []}
          now={new Date()}
          revokingId={revokeBusy ? revoking?.id : null}
          onRevoke={setRevoking}
        />
      )}

      <CreateAccessTokenDialog
        open={creating}
        options={optionsData?.personalAccessTokenGrantOptions}
        busy={createBusy}
        error={createError}
        secret={secret}
        onClose={closeCreate}
        onCopy={(value) => {
          navigator.clipboard
            .writeText(value)
            .then(() => toast.success("Token copied"))
            .catch(() => toast.error("Could not copy. Select it and copy."));
        }}
        onSubmit={(input) => {
          setCreateError(null);
          create({ variables: { input } })
            .then(({ data: created }) => {
              setSecret(created?.createPersonalAccessToken.secret ?? null);
            })
            .catch((err: unknown) => {
              setCreateError(
                err instanceof Error ? err.message : "The token was not made.",
              );
            });
        }}
      />

      <ConfirmDialog
        open={!!revoking}
        title={`Revoke ${revoking?.name ?? "this token"}?`}
        confirmLabel="Revoke"
        destructive
        busy={revokeBusy}
        onCancel={() => setRevoking(null)}
        onConfirm={() => {
          if (!revoking) return;
          revoke({ variables: { id: revoking.id } })
            .then(() => toast.success("Token revoked"))
            .catch(() => toast.error("The token was not revoked."))
            .finally(() => setRevoking(null));
        }}
      >
        Anything using it stops working on its next request. This cannot be
        undone.
      </ConfirmDialog>
    </Stack>
  );
};
