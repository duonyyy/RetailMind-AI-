export interface KnowledgeDocItem {
  id: string;
  code: string;
  title: string;
  collection: string;
  chunks: number;
  vectorDim: number;
  sha256Hash: string;
  status: 'INDEXED' | 'SYNCING' | 'DRAFT';
  lastSynced: string;
}

