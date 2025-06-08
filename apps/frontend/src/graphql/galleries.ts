// Re-export generated gallery operations and types
export {
  // Query Documents
  GetGalleriesDocument as GET_GALLERIES,
  GetGalleryDocument as GET_GALLERY,
  GetMyGalleriesDocument as GET_MY_GALLERIES,
  GetUserGalleriesDocument as GET_USER_GALLERIES,
  GetCharacterGalleriesDocument as GET_CHARACTER_GALLERIES,
  
  // Mutation Documents
  CreateGalleryDocument as CREATE_GALLERY,
  UpdateGalleryDocument as UPDATE_GALLERY,
  DeleteGalleryDocument as DELETE_GALLERY,
  AddImageToGalleryDocument as ADD_IMAGE_TO_GALLERY,
  RemoveImageFromGalleryDocument as REMOVE_IMAGE_FROM_GALLERY,
  ReorderGalleriesDocument as REORDER_GALLERIES,
  
  // Query Hooks
  useGetGalleriesQuery,
  useGetGalleryQuery,
  useGetMyGalleriesQuery,
  useGetUserGalleriesQuery,
  useGetCharacterGalleriesQuery,
  
  // Mutation Hooks
  useCreateGalleryMutation,
  useUpdateGalleryMutation,
  useDeleteGalleryMutation,
  useAddImageToGalleryMutation,
  useRemoveImageFromGalleryMutation,
  useReorderGalleriesMutation,
  
  // Types
  type Gallery,
  type GalleryConnection,
  type GalleryFiltersInput,
  type CreateGalleryInput,
  type UpdateGalleryInput,
  type GalleryImageOperationInput,
  type ReorderGalleriesInput,
  type GetGalleriesQuery,
  type GetGalleriesQueryVariables,
  type GetGalleryQuery,
  type GetGalleryQueryVariables,
  type GetMyGalleriesQuery,
  type GetMyGalleriesQueryVariables,
  type GetUserGalleriesQuery,
  type GetUserGalleriesQueryVariables,
  type GetCharacterGalleriesQuery,
  type GetCharacterGalleriesQueryVariables,
  type CreateGalleryMutation,
  type CreateGalleryMutationVariables,
  type UpdateGalleryMutation,
  type UpdateGalleryMutationVariables,
  type DeleteGalleryMutation,
  type DeleteGalleryMutationVariables,
  type AddImageToGalleryMutation,
  type AddImageToGalleryMutationVariables,
  type RemoveImageFromGalleryMutation,
  type RemoveImageFromGalleryMutationVariables,
  type ReorderGalleriesMutation,
  type ReorderGalleriesMutationVariables,
  type Image,
} from '../generated/graphql';