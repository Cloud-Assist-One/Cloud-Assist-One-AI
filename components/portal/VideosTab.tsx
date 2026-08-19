'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Video } from '@/lib/portal/types';
import VideoPlayerModal from './VideoPlayerModal';
import styles from './VideosTab.module.css';

interface VideosTabProps {
  userId: string;
}

export default function VideosTab({ userId }: VideosTabProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const [
        { data: videoRows, error: videosError },
        { data: watchRows, error: watchesError },
      ] = await Promise.all([
        supabase.from('videos').select('*').order('created_at', { ascending: false }),
        supabase.from('video_watches').select('video_id').eq('user_id', userId),
      ]);

      if (cancelled) return;

      if (videosError || watchesError) {
        setLoadError('Could not load videos. Please refresh the page.');
        setLoading(false);
        return;
      }

      const rows = videoRows ?? [];
      setVideos(rows);
      setWatchedIds(new Set((watchRows ?? []).map((w: { video_id: string }) => w.video_id)));

      const urls: Record<string, string> = {};
      try {
        await Promise.all(
          rows
            .filter((v: Video) => v.thumbnail_path)
            .map(async (v: Video) => {
              const { data } = await supabase.storage
                .from('training-videos')
                .createSignedUrl(v.thumbnail_path as string, 3600);
              if (data) urls[v.id] = data.signedUrl;
            })
        );
      } catch {
        // Thumbnails are best-effort — fall back to placeholders rather than blocking the grid.
      }

      if (!cancelled) {
        setThumbnailUrls(urls);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function toggleWatched(video: Video) {
    const supabase = createClient();
    const isWatched = watchedIds.has(video.id);

    if (isWatched) {
      await supabase.from('video_watches').delete().eq('user_id', userId).eq('video_id', video.id);
      setWatchedIds((prev) => {
        const next = new Set(prev);
        next.delete(video.id);
        return next;
      });
    } else {
      await supabase.from('video_watches').insert({ user_id: userId, video_id: video.id });
      setWatchedIds((prev) => new Set(prev).add(video.id));
    }
  }

  if (loading) {
    return <p>Loading videos…</p>;
  }

  if (loadError) {
    return <p role="alert">{loadError}</p>;
  }

  if (videos.length === 0) {
    return <p>No videos available yet.</p>;
  }

  return (
    <div className={styles.grid}>
      {videos.map((video) => (
        <div key={video.id} className={styles.card}>
          <button
            type="button"
            className={styles.thumbnailButton}
            onClick={() => setPlayingVideo(video)}
            aria-label={`Play ${video.title}`}
          >
            {thumbnailUrls[video.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnailUrls[video.id]} alt="" className={styles.thumbnail} />
            ) : (
              <div className={styles.placeholder}>▶</div>
            )}
          </button>
          <div className={styles.cardFooter}>
            <span className={styles.title}>{video.title}</span>
            {watchedIds.has(video.id) && <span className={styles.badge}>Watched</span>}
          </div>
          <button type="button" className={styles.watchToggle} onClick={() => toggleWatched(video)}>
            {watchedIds.has(video.id) ? 'Mark as unwatched' : 'Mark as watched'}
          </button>
        </div>
      ))}
      {playingVideo && <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />}
    </div>
  );
}
