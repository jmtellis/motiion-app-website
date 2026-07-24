export type BuyerInboxFile = {
  id: string;
  ownerId: string;
  title: string;
  fileName: string;
  contentType: string | null;
  fileUrl: string;
  storagePath: string;
  sizeBytes: number | null;
  createdAt: string;
};
