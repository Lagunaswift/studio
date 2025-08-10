
'use server';

import { debugAuth as serverDebugFlow } from '@/utils/authDebug';

export async function debugAuthenticationFlow() {
  return await serverDebugFlow();
}
