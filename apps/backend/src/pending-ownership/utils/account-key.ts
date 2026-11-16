/** Identifies one external account across providers. */
export const accountKey = (provider: string, providerAccountId: string) =>
  `${provider}:${providerAccountId}`;
