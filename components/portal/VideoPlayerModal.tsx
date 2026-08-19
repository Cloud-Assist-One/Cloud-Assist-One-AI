'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Video } from '@/lib/portal/types';
import styles from './VideoPlayerModal.module.css';

interface VideoPlayerModalProps {
  video: Video;
  onClose: () => void;
}

export default function VideoPlayerModal({ video, onClose }: VideoPlayerModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUrl() {
      const supabase = createClient();
      const { data, error: signError } = await supabase.storage
        .from('training-videos')
        .createSignedUrl(video.storage_path, 3600);

      if (cancelled) return;

      if (signError || !data) {
        setError('Could not load this video. Please try again.');
        return;
      }

      setSignedUrl(data.signedUrl);
    }

    loadUrl();
    return () => {
      cancelled = true;
    };
  }, [video.storage_path]);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={video.title}>
      <div className={styles.content}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2>{video.title}</h2>
        {error && <p role="alert">{error}</p>}
        {signedUrl && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={signedUrl} controls autoPlay className={styles.video} />
        )}
      </div>
    </div>
  );
}
