// Re-export generated character operations and types
export {
  // Query Documents
  GetCharactersDocument as GET_CHARACTERS,
  GetCharacterDocument as GET_CHARACTER,
  GetMyCharactersDocument as GET_MY_CHARACTERS,
  
  // Mutation Documents
  CreateCharacterDocument as CREATE_CHARACTER,
  UpdateCharacterDocument as UPDATE_CHARACTER,
  DeleteCharacterDocument as DELETE_CHARACTER,
  TransferCharacterDocument as TRANSFER_CHARACTER,
  AddCharacterTagsDocument as ADD_CHARACTER_TAGS,
  RemoveCharacterTagsDocument as REMOVE_CHARACTER_TAGS,
  
  // Query Hooks
  useGetCharactersQuery,
  useGetCharacterQuery,
  useGetMyCharactersQuery,
  
  // Mutation Hooks
  useCreateCharacterMutation,
  useUpdateCharacterMutation,
  useDeleteCharacterMutation,
  useTransferCharacterMutation,
  useAddCharacterTagsMutation,
  useRemoveCharacterTagsMutation,
  
  // Types
  type Character,
  type CharacterConnection,
  type CharacterFiltersInput,
  type CreateCharacterInput,
  type UpdateCharacterInput,
  type TransferCharacterInput,
  type ManageTagsInput,
  type GetCharactersQuery,
  type GetCharactersQueryVariables,
  type GetCharacterQuery,
  type GetCharacterQueryVariables,
  type GetMyCharactersQuery,
  type GetMyCharactersQueryVariables,
  type CreateCharacterMutation,
  type CreateCharacterMutationVariables,
  type UpdateCharacterMutation,
  type UpdateCharacterMutationVariables,
  type DeleteCharacterMutation,
  type DeleteCharacterMutationVariables,
  type TransferCharacterMutation,
  type TransferCharacterMutationVariables,
  type AddCharacterTagsMutation,
  type AddCharacterTagsMutationVariables,
  type RemoveCharacterTagsMutation,
  type RemoveCharacterTagsMutationVariables,
  type Visibility,
  type Tag,
  type CharacterTag,
} from '../generated/graphql';