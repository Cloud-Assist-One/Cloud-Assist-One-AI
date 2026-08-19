'use client';

import { useState, FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './AdminUpload.module.css';

type Status = 'idle' | 'saving' | 'error';

export default function AdminUpload() {
  const [docTitle, setDocTitle] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docStatus, setDocStatus] = useState<Status>('idle');
  const [docError, setDocError] = useState<string | null>(null);

  const [videoTitle, setVideoTitle] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoStatus, setVideoStatus] = useState<Status>('idle');
  const [videoError, setVideoError] = useState<string | null>(null);

  async function handleDocSubmit(event: FormEvent) {
    event.preventDefault();
    if (!docFile) return;
    setDocStatus('saving');
    setDocError(null);

    const supabase = createClient();
    const path = `${Date.now()}-${docFile.name}`;
    const { error: uploadError } = await supabase.storage.from('training-documents').upload(path, docFile);

    if (uploadError) {
      setDocStatus('error');
      setDocError(uploadError.message);
      return;
    }

    const { error: insertError } = await supabase.from('documents').insert({
      title: docTitle,
      storage_path: path,
      file_size: docFile.size,
      content_type: docFile.type || 'application/octet-stream',
    });

    if (insertError) {
      setDocStatus('error');
      setDocError(insertError.message);
      return;
    }

    setDocStatus('idle');
    setDocTitle('');
    setDocFile(null);
  }

  async function handleVideoSubmit(event: FormEvent) {
    event.preventDefault();
    if (!videoFile) return;
    setVideoStatus('saving');
    setVideoError(null);

    const supabase = createClient();
    const videoPath = `${Date.now()}-${videoFile.name}`;
    const { error: videoUploadError } = await supabase.storage
      .from('training-videos')
      .upload(videoPath, videoFile);

    if (videoUploadError) {
      setVideoStatus('error');
      setVideoError(videoUploadError.message);
      return;
    }

    let thumbnailPath: string | null = null;
    if (thumbnailFile) {
      thumbnailPath = `${Date.now()}-${thumbnailFile.name}`;
      const { error: thumbnailError } = await supabase.storage
        .from('training-videos')
        .upload(thumbnailPath, thumbnailFile);
      if (thumbnailError) {
        setVideoStatus('error');
        setVideoError(thumbnailError.message);
        return;
      }
    }

    const { error: insertError } = await supabase.from('videos').insert({
      title: videoTitle,
      storage_path: videoPath,
      thumbnail_path: thumbnailPath,
    });

    if (insertError) {
      setVideoStatus('error');
      setVideoError(insertError.message);
      return;
    }

    setVideoStatus('idle');
    setVideoTitle('');
    setVideoFile(null);
    setThumbnailFile(null);
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleDocSubmit} noValidate>
        <h3>Upload document</h3>
        <label htmlFor="doc-title">Title</label>
        <input id="doc-title" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} required />
        <label htmlFor="doc-file">File</label>
        <input
          id="doc-file"
          type="file"
          onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
          required
        />
        {docError && (
          <p role="alert" className={styles.error}>
            {docError}
          </p>
        )}
        <button type="submit" disabled={docStatus === 'saving'}>
          {docStatus === 'saving' ? 'Uploading…' : 'Upload document'}
        </button>
      </form>

      <form className={styles.form} onSubmit={handleVideoSubmit} noValidate>
        <h3>Upload video</h3>
        <label htmlFor="video-title">Video title</label>
        <input id="video-title" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} required />
        <label htmlFor="video-file">Video file</label>
        <input
          id="video-file"
          type="file"
          accept="video/*"
          onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
          required
        />
        <label htmlFor="video-thumbnail">Thumbnail image (optional)</label>
        <input
          id="video-thumbnail"
          type="file"
          accept="image/*"
          onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
        />
        {videoError && (
          <p role="alert" className={styles.error}>
            {videoError}
          </p>
        )}
        <button type="submit" disabled={videoStatus === 'saving'}>
          {videoStatus === 'saving' ? 'Uploading…' : 'Upload video'}
        </button>
      </form>
    </div>
  );
}
