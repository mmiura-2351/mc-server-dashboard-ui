import { Result, ok, err } from "neverthrow";
import { remark } from "remark";
import remarkHtml from "remark-html";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export interface DocMetadata {
  slug: string;
  title: string;
  description: string;
  lastUpdated: string;
  category: string;
  order: number;
}

export interface DocManifest {
  documents: DocMetadata[];
}

export interface Document {
  metadata: DocMetadata;
  content: string;
  htmlContent: string;
}

class DocsService {
  private processor = remark()
    .use(remarkGfm)
    .use(remarkHtml)
    .use(rehypeHighlight);

  /**
   * Load the document manifest for a specific language
   */
  async loadManifest(locale: string): Promise<Result<DocManifest, string>> {
    try {
      const response = await fetch(`/docs/${locale}/manifest.json`);

      if (!response.ok) {
        return err(`Failed to load manifest: ${response.statusText}`);
      }

      const manifest: DocManifest = await response.json();
      return ok(manifest);
    } catch (error) {
      return err(
        `Error loading manifest: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Load a specific document by slug and language
   */
  async loadDocument(
    slug: string,
    locale: string
  ): Promise<Result<Document, string>> {
    try {
      // First, load the manifest to get metadata
      const manifestResult = await this.loadManifest(locale);
      if (manifestResult.isErr()) {
        return err(manifestResult.error);
      }

      const manifest = manifestResult.value;
      const metadata = manifest.documents.find((doc) => doc.slug === slug);

      if (!metadata) {
        return err(`Document not found: ${slug}`);
      }

      // Load the markdown content
      const response = await fetch(`/docs/${locale}/${slug}.md`);

      if (!response.ok) {
        return err(`Failed to load document: ${response.statusText}`);
      }

      const markdownContent = await response.text();

      // Process markdown to HTML
      const processedResult = await this.processor.process(markdownContent);
      const htmlContent = processedResult.toString();

      const document: Document = {
        metadata,
        content: markdownContent,
        htmlContent,
      };

      return ok(document);
    } catch (error) {
      return err(
        `Error loading document: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get all available documents for a language, sorted by category and order
   */
  async getAllDocuments(
    locale: string
  ): Promise<Result<DocMetadata[], string>> {
    const manifestResult = await this.loadManifest(locale);
    if (manifestResult.isErr()) {
      return err(manifestResult.error);
    }

    const documents = manifestResult.value.documents.sort((a, b) => {
      // Sort by category first, then by order
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.order - b.order;
    });

    return ok(documents);
  }

  /**
   * Search documents by title or description
   */
  async searchDocuments(
    query: string,
    locale: string
  ): Promise<Result<DocMetadata[], string>> {
    const documentsResult = await this.getAllDocuments(locale);
    if (documentsResult.isErr()) {
      return err(documentsResult.error);
    }

    const searchTerm = query.toLowerCase();
    const filteredDocuments = documentsResult.value.filter(
      (doc) =>
        doc.title.toLowerCase().includes(searchTerm) ||
        doc.description.toLowerCase().includes(searchTerm)
    );

    return ok(filteredDocuments);
  }
}

export const docsService = new DocsService();
