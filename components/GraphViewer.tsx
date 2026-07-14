'use client';

import dynamic from 'next/dynamic';

const GraphViewerClient = dynamic(() => import('./GraphViewerClient'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }}></div>
    </div>
  )
});

export default GraphViewerClient;
