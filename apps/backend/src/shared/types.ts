// Temporary shared types until we properly implement the shared package

export interface CreateUser {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface UpdateUser {
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  dateOfBirth?: string; // GraphQL will send as ISO string
}

export interface Login {
  email: string;
  password: string;
}
