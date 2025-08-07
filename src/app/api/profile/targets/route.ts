
import { NextRequest, NextResponse } from 'next/server';
import { updateUserProfile } from '@/app/(main)/profile/actions';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace('Bearer ', '');
    const body = await request.json();

    const result = await updateUserProfile(idToken, body);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to update profile' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Profile targets API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}