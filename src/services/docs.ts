import { Result, ok, err } from "neverthrow";
import { remark } from "remark";
import remarkHtml from "remark-html";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { parseFrontmatter } from "@/utils/docs-frontmatter";

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

      // Parse frontmatter to extract content without frontmatter
      const { content: contentWithoutFrontmatter } =
        parseFrontmatter(markdownContent);

      // Process markdown to HTML (without frontmatter)
      const processedResult = await this.processor.process(
        contentWithoutFrontmatter
      );
      const htmlContent = processedResult.toString();

      const document: Document = {
        metadata,
        content: contentWithoutFrontmatter, // Store content without frontmatter
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
   * Get all available documents for a language, using the order from manifest
   * (which is already sorted by category order from docs.config.json)
   */
  async getAllDocuments(
    locale: string
  ): Promise<Result<DocMetadata[], string>> {
    const manifestResult = await this.loadManifest(locale);
    if (manifestResult.isErr()) {
      return err(manifestResult.error);
    }

    // Return documents in the order they appear in manifest.json
    // The manifest is already sorted by category order (from docs.config.json)
    // then by order field within each category
    return ok(manifestResult.value.documents);
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
