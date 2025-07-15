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

export interface CategoryTranslation {
  order: number;
  en: string;
  ja: string;
}

export interface CategoryOrder {
  categories: string[] | CategoryTranslation[];
}
