const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether an id from a client is a uuid, checked before it reaches a `::uuid`
 * cast or a uuid column, where anything else is a database error.
 */
export const isUuid = (id: string): boolean => UUID.test(id);
