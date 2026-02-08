export interface UploadFileRequest {
  bucket: string;
  folder?: string;
}

export interface UploadFileResponse {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
  uploadedAt: Date;
}

export interface SignedUrlRequest {
  bucket: string;
  fileName: string;
  expiresInSeconds?: number;
}

export interface SignedUploadUrlRequest {
  bucket: string;
  fileName: string;
  contentType: string;
  expiresInSeconds?: number;
}

