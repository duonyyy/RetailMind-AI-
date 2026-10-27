export interface CitationItem {
  title?: string;
  statute?: string;
  page?: number;
  snippet?: string;
  content?: string;
  docHash?: string;
}

export interface SuggestedProductCard {
  sku: string;
  name: string;
  priceFormatted: string;
  ramGb: number;
  branchStock: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: CitationItem[];
  groundingScore?: number;
  suggestedProducts?: SuggestedProductCard[];
  feedback?: 'like' | 'dislike' | null;
  timestamp: string;
}

export interface HitlTaskItem {
  task_id: string;
  query: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp?: string;
}

