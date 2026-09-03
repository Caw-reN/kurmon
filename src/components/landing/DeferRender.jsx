import React, { useState, useEffect } from 'react';

export default function DeferRender({ children, delay = 100, fallback = <div style={{ minHeight: '50vh' }} /> }) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Gunakan requestIdleCallback jika tersedia agar rendering tidak memblokir main thread
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = requestIdleCallback(() => {
        setTimeout(() => setShouldRender(true), delay);
      });
      return () => cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  return shouldRender ? children : fallback;
}
