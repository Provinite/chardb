import React, { useState } from "react";
import { Button, Cluster, Dialog, Stack } from "@chardb/ui";
import {
  DEFAULT_BOARD_IMAGE_OPTIONS,
  type BoardImageOptions,
} from "./boardImage";
import * as styles from "./DownloadDialog.css";

interface DownloadDialogProps {
  open: boolean;
  /** The picture is being drawn: Download spins and the dialog stays. */
  busy: boolean;
  onClose: () => void;
  onDownload: (options: BoardImageOptions) => void;
}

/** What of the board goes in its picture, chosen before it is drawn. */
export const DownloadDialog: React.FC<DownloadDialogProps> = ({
  open,
  ...body
}) => (
  <Dialog.Root open={open} onClose={body.onClose} closeDisabled={body.busy}>
    <Dialog.Title>Download picture</Dialog.Title>
    <Dialog.Body>
      {/* Mounted afresh each opening, so it starts with everything in. */}
      <DialogBody {...body} />
    </Dialog.Body>
  </Dialog.Root>
);

const DialogBody: React.FC<Omit<DownloadDialogProps, "open">> = ({
  busy,
  onClose,
  onDownload,
}) => {
  const [options, setOptions] = useState(DEFAULT_BOARD_IMAGE_OPTIONS);
  const toggle = (key: keyof BoardImageOptions) => () =>
    setOptions((o) => ({ ...o, [key]: !o[key] }));

  return (
    <Stack>
      <label className={styles.choice}>
        <input
          type="checkbox"
          className={styles.box}
          checked={options.background}
          onChange={toggle("background")}
          disabled={busy}
        />
        <span>
          Background
          <span className={styles.hint}>
            Off makes the PNG transparent behind the candies.
          </span>
        </span>
      </label>
      <label className={styles.choice}>
        <input
          type="checkbox"
          className={styles.box}
          checked={options.shadows}
          onChange={toggle("shadows")}
          disabled={busy}
        />
        Shadows
      </label>
      <Cluster justify="flex-end">
        <Button tone="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button busy={busy} onClick={() => onDownload(options)}>
          Download
        </Button>
      </Cluster>
    </Stack>
  );
};
