'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import DocumentsTab from './DocumentsTab';
import VideosTab from './VideosTab';
import AdminTab from './AdminTab';
import styles from './PortalTabs.module.css';

type TabKey = 'documents' | 'videos' | 'admin';

interface PortalTabsProps {
  userId: string;
  role: 'admin' | 'user';
}

export default function PortalTabs({ userId, role }: PortalTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('documents');
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.homeLink}>
          ← Back to site
        </Link>
        <div className={styles.tabList} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'documents'}
            onClick={() => setActiveTab('documents')}
          >
            Documents
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'videos'}
            onClick={() => setActiveTab('videos')}
          >
            Videos
          </button>
          {role === 'admin' && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'admin'}
              onClick={() => setActiveTab('admin')}
            >
              Admin
            </button>
          )}
        </div>
        <button type="button" className={styles.signOut} onClick={handleSignOut}>
          Sign out
        </button>
      </div>

      <div className={styles.panel}>
        {activeTab === 'documents' && <DocumentsTab />}
        {activeTab === 'videos' && <VideosTab userId={userId} />}
        {activeTab === 'admin' && role === 'admin' && <AdminTab />}
      </div>
    </div>
  );
}
