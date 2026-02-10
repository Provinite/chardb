export const MUTATIONS = {
  login: `
    mutation Login($input: LoginInput!) {
      login(input: $input) {
        accessToken
        refreshToken
      }
    }
  `,

  createCharacter: `
    mutation CreateCharacter($input: CreateCharacterInput!) {
      createCharacter(input: $input) {
        id
        name
        registryId
        ownerId
      }
    }
  `,
};
