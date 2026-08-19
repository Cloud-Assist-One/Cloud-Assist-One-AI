'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Document } from '@/lib/portal/types';
import styles from './DocumentsTab.module.css';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsTab() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      const supabase = createClient();
      const { data } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (!cancelled) {
        setDocuments(data ?? []);
        setLoading(false);
      }
    }

    loadDocuments();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDownload(doc: Document) {
    setDownloadError(null);
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from('training-documents')
      .createSignedUrl(doc.storage_path, 60);

    if (error || !data) {
      setDownloadError(`Could not download "${doc.title}". Please try again.`);
      return;
    }

    const link = document.createElement('a');
    link.href = data.signedUrl;
    link.download = doc.title;
    link.click();
  }

  if (loading) {
    return <p>Loading documents…</p>;
  }

  if (documents.length === 0) {
    return <p>No documents available yet.</p>;
  }

  return (
    <div className={styles.wrapper}>
      {downloadError && (
        <p role="alert" className={styles.error}>
          {downloadError}
        </p>
      )}
      <ul className={styles.list}>
        {documents.map((doc) => (
          <li key={doc.id} className={styles.row}>
            <span className={styles.title}>{doc.title}</span>
            <span className={styles.meta}>{formatFileSize(doc.file_size)}</span>
            <span className={styles.meta}>{new Date(doc.created_at).toLocaleDateString()}</span>
            <button type="button" onClick={() => handleDownload(doc)}>
              Download
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
