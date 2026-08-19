'use client';

import { useState } from 'react';
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

  return (
    <div className={styles.wrapper}>
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

      <div className={styles.panel}>
        {activeTab === 'documents' && <DocumentsTab />}
        {activeTab === 'videos' && <VideosTab userId={userId} />}
        {activeTab === 'admin' && role === 'admin' && <AdminTab />}
      </div>
    </div>
  );
}
