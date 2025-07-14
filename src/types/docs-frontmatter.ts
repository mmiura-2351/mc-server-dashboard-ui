export interface DocsFrontmatter {
  slug: string;
  title: string;
  description: string;
  category: string;
  order: number;
  lastUpdated: string;
  draft?: boolean;
}

export interface DocsManifest {
  documents: DocsFrontmatter[];
}

export interface CategoryOrder {
  categories: string[];
}