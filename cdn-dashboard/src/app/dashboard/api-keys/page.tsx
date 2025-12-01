'use client';

import { redirect } from 'next/navigation';

// API Keys are managed in the Settings page
export default function APIKeysPage() {
  redirect('/dashboard/settings');
}
