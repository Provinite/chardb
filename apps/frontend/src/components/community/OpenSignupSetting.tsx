import React, { useId } from "react";
import { Stack } from "@chardb/ui";
import * as styles from "./OpenSignupSetting.css";

export interface OpenSignupSettingProps {
  /** The community's roles, any of which anyone could be let in as. */
  roles: ReadonlyArray<{ id: string; name: string }>;
  /** The role anyone joins with, or null when joining takes an invite. */
  roleId: string | null;
  /** True while a change is saving, or when the viewer cannot change it. */
  disabled?: boolean;
  onChange: (roleId: string | null) => void;
}

/** Whether a community takes anyone, and as which role. */
export const OpenSignupSetting: React.FC<OpenSignupSettingProps> = ({
  roles,
  roleId,
  disabled,
  onChange,
}) => {
  const id = useId();
  return (
    <Stack gap="xs" className={styles.setting}>
      <label htmlFor={id} className={styles.label}>
        Who can join
      </label>
      <select
        id={id}
        className={styles.select}
        value={roleId ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">People with an invite code</option>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            Anyone, as {role.name}
          </option>
        ))}
      </select>
    </Stack>
  );
};
