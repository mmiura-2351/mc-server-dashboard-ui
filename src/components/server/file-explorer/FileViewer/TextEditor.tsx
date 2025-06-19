"use client";

import styles from "../../file-explorer.module.css";

interface TextEditorProps {
  fileName: string;
  content: string;
  editedContent: string;
  isEditing: boolean;
  isSaving: boolean;
  onContentChange: (content: string) => void;
}

export function TextEditor({
  fileName: _fileName,
  content,
  editedContent,
  isEditing,
  isSaving,
  onContentChange,
}: TextEditorProps) {
  if (isEditing) {
    return (
      <textarea
        value={editedContent}
        onChange={(e) => onContentChange(e.target.value)}
        className={styles.fileEditor}
        disabled={isSaving}
      />
    );
  }

  return <pre className={styles.fileContentDisplay}>{content}</pre>;
}
