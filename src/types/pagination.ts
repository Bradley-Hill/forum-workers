export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PostsPaginationMetadata extends PaginationMetadata {
  totalPosts: number;
}

export interface ThreadsPaginationMetadata extends PaginationMetadata {
  totalThreads: number;
}
