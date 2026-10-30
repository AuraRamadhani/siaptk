'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import PortalOrangTua from '@/components/PortalOrangTua';

export default function ShellOrangTua() {
  const router = useRouter();
  const [activeChildId, setActiveChildId] = useState('c1');

  const keluar = async () => {
    await fetch('/api/auth/keluar', { method: 'POST' });
    router.push('/masuk');
    router.refresh();
  };

  return (
    <PortalOrangTua
      childrenData={[]}
      activeChildId={activeChildId}
      setActiveChildId={setActiveChildId}
      onRegisterClick={() => {}}
      onLogout={keluar}
      setCurrentView={() => {}}
    />
  );
}