'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Document, Video } from '@/lib/portal/types';
import styles from './AdminContentList.module.css';

export default function AdminContentList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const [{ data: docRows, error: docsError }, { data: videoRows, error: videosError }] = await Promise.all([
        supabase.from('documents').select('*').order('created_at', { ascending: false }),
        supabase.from('videos').select('*').order('created_at', { ascending: false }),
      ]);

      if (cancelled) return;

      if (docsError || videosError) {
        setLoadError('Could not load content. Please refresh the page.');
        setLoading(false);
        return;
      }

      setDocuments(docRows ?? []);
      setVideos(videoRows ?? []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRenameDocument(doc: Document) {
    const newTitle = window.prompt('New title', doc.title);
    if (!newTitle || !newTitle.trim() || newTitle === doc.title) return;

    setActionError(null);
    const supabase = createClient();
    const { error } = await supabase.from('documents').update({ title: newTitle }).eq('id', doc.id);

    if (error) {
      setActionError(`Could not rename "${doc.title}". Please try again.`);
      return;
    }

    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, title: newTitle } : d)));
  }

  async function handleDeleteDocument(doc: Document) {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;

    setActionError(null);
    const supabase = createClient();
    await supabase.storage.from('training-documents').remove([doc.storage_path]);
    const { error } = await supabase.from('documents').delete().eq('id', doc.id);

    if (error) {
      setActionError(`Could not delete "${doc.title}". Please try again.`);
      return;
    }

    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  }

  async function handleRenameVideo(video: Video) {
    const newTitle = window.prompt('New title', video.title);
    if (!newTitle || !newTitle.trim() || newTitle === video.title) return;

    setActionError(null);
    const supabase = createClient();
    const { error } = await supabase.from('videos').update({ title: newTitle }).eq('id', video.id);

    if (error) {
      setActionError(`Could not rename "${video.title}". Please try again.`);
      return;
    }

    setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, title: newTitle } : v)));
  }

  async function handleDeleteVideo(video: Video) {
    if (!window.confirm(`Delete "${video.title}"? This cannot be undone.`)) return;

    setActionError(null);
    const supabase = createClient();
    const pathsToRemove = video.thumbnail_path
      ? [video.storage_path, video.thumbnail_path]
      : [video.storage_path];
    await supabase.storage.from('training-videos').remove(pathsToRemove);
    const { error } = await supabase.from('videos').delete().eq('id', video.id);

    if (error) {
      setActionError(`Could not delete "${video.title}". Please try again.`);
      return;
    }

    setVideos((prev) => prev.filter((v) => v.id !== video.id));
  }

  if (loading) {
    return <p>Loading content…</p>;
  }

  if (loadError) {
    return <p role="alert">{loadError}</p>;
  }

  return (
    <div className={styles.wrapper}>
      {actionError && (
        <p role="alert" className={styles.error}>
          {actionError}
        </p>
      )}

      <h3>Documents</h3>
      {documents.length === 0 ? (
        <p>No documents yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.title}</td>
                <td>
                  <button type="button" onClick={() => handleRenameDocument(doc)}>
                    Rename
                  </button>
                  <button type="button" onClick={() => handleDeleteDocument(doc)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Videos</h3>
      {videos.length === 0 ? (
        <p>No videos yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.id}>
                <td>{video.title}</td>
                <td>
                  <button type="button" onClick={() => handleRenameVideo(video)}>
                    Rename
                  </button>
                  <button type="button" onClick={() => handleDeleteVideo(video)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
