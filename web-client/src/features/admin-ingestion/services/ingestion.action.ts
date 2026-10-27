'use server';

export async function triggerQdrantSyncAction(docCode: string, sha256Hash: string) {
  return {
    success: true,
    jobId: `ing-job-${Date.now()}`,
    docCode,
    sha256Hash,
    status: 'INDEXED' as const,
    syncedAt: new Date().toISOString(),
  };
}

