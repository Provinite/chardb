-- Revokes every live personal access token of an account the moment it stops
-- being a site admin.
--
-- No application path sets is_admin; a demotion is a direct database edit, so
-- only the database can see it happen. Revoking rather than relying on the
-- check at use means reinstating the account restores none of its tokens: an
-- admin demoted because their account may be compromised gets no leaked token
-- back. The backend also revokes them when one is used by an owner who is no
-- admin, in case this is ever bypassed.
CREATE FUNCTION revoke_access_tokens_on_demotion() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE personal_access_tokens
     SET revoked_at = CURRENT_TIMESTAMP
   WHERE user_id = NEW.id
     AND revoked_at IS NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER revoke_access_tokens_on_demotion
AFTER UPDATE OF is_admin ON users
FOR EACH ROW
WHEN (OLD.is_admin AND NOT NEW.is_admin)
EXECUTE FUNCTION revoke_access_tokens_on_demotion();
