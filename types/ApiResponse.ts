export interface ApiResponse<T> {
  statuscode: string;
  message: string;
  data: T;
}
