export interface DATokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface DAFolder {
  folderid: string;
  name: string;
  size: number;
}

export interface DAFoldersResponse {
  results: DAFolder[];
  has_more: boolean;
  next_offset: number;
}

export interface DADeviation {
  deviationid: string;
  url: string;
  title: string;
  author: {
    username: string;
    userid: string;
  };
  published_time: string;
  thumbs?: Array<{
    src: string;
    height: number;
    width: number;
  }>;
}

export interface DAGalleryResponse {
  results: DADeviation[];
  has_more: boolean;
  next_offset: number;
}

export interface DADeviationContent {
  html: string;
}
