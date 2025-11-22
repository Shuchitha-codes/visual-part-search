
export interface PartRecord {
  id: string;
  name: string; // The User defined Part Name
  modelName: string; // The CAD File Name (e.g. "Gear")
  sku: string;
  description: string;
  category: string;
  views: PartView[];
}

export interface PartView {
  id: string;
  angleName: string;
  imageUrl: string;
  embedding: number[];
}

export interface SearchResult {
  part: PartRecord;
  score: number;
  matchedView: PartView;
}

export enum AppMode {
  INGEST = 'INGEST',
  SEARCH = 'SEARCH',
}
