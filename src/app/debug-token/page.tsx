// src/app/debug-token/page.tsx
'use client';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { useState } from 'react';
import { auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DebugToken() {
  const [uid, setUid] = useState<string|undefined>();
  const [token, setToken] = useState<string|undefined>();
  const [result, setResult] = useState<string|undefined>();
  const [loading, setLoading] = useState(false);

  async function getToken() {
    try {
      setLoading(true);
      await signInAnonymously(auth);
      const user = auth.currentUser!;
      setUid(user.uid);
      const t = await user.getIdToken(true);
      setToken(t);
    } catch(e: any) {
       setResult(`Token retrieval failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function callApi() {
    try {
       setLoading(true);
       const res = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          name: 'debug.jpg',
          type: 'image',
          url: 'https://example.com/debug.jpg',
          storagePath: 'debug/dummy.jpg',
          projectId: 'debug-project',
          size: 1234,
        }),
      });
      setResult(`${res.status} ${await res.text()}`);
    } catch (e: any) {
       setResult(`API call failed: ${e.message}`);
    } finally {
       setLoading(false);
    }
  }

  return (
    <div style={{padding:16, fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px', margin: 'auto' }}>
      <h1 style={{fontSize: '2rem', fontWeight: 'bold' }}>Auth Debug Page</h1>
      <p>Use this page to verify your Firebase Auth setup front-to-back.</p>
      
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Button onClick={getToken} disabled={loading}>{loading ? 'Getting Token...' : '1. Get Anonymous Token'}</Button>
        <Button onClick={callApi} disabled={!token || loading}>{loading ? 'Calling API...' : '2. Call /api/media'}</Button>
      </div>

      <div>
        <h2 style={{fontWeight: 'bold'}}>UID:</h2>
        <pre style={{padding: '8px', background: '#eee', borderRadius: '4px'}}>{uid || 'N/A'}</pre>
      </div>
      
      <div>
        <h2 style={{fontWeight: 'bold'}}>ID Token (first 60 chars):</h2>
        <pre style={{padding: '8px', background: '#eee', borderRadius: '4px', whiteSpace:'pre-wrap',wordBreak:'break-all'}}>{token ? `${token.slice(0,60)}...` : 'N/A'}</pre>
      </div>
      
      <div>
        <h2 style={{fontWeight: 'bold'}}>API Call Result:</h2>
        <pre style={{padding: '8px', background: '#eee', borderRadius: '4px', minHeight: '50px'}}>{result || 'Not called yet'}</pre>
      </div>
    </div>
  );
}
