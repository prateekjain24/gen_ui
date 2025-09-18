import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/store/session';
import { createDebugger } from '@/lib/utils/debug';

const debug = createDebugger('SessionAPI');

/**
 * Session management endpoint.
 * POST: Create a new session
 * GET: Retrieve session by ID
 * PUT: Update session values
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Create new session
    const session = sessionStore.createSession({
      initialValues: body.values,
      metadata: body.metadata,
    });

    debug(`Created session ${session.id}`);

    return NextResponse.json({
      sessionId: session.id,
      session,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      {
        error: 'Failed to create session',
        status: 500,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json(
        {
          error: 'Session ID is required',
          status: 400,
        },
        { status: 400 }
      );
    }

    const session = sessionStore.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        {
          error: 'Session not found',
          status: 404,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error retrieving session:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve session',
        status: 500,
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, values, currentStep, addCompletedStep } = body;

    if (!sessionId) {
      return NextResponse.json(
        {
          error: 'Session ID is required',
          status: 400,
        },
        { status: 400 }
      );
    }

    const session = sessionStore.updateSession(sessionId, {
      values,
      currentStep,
      addCompletedStep,
    });

    if (!session) {
      return NextResponse.json(
        {
          error: 'Session not found',
          status: 404,
        },
        { status: 404 }
      );
    }

    debug(`Updated session ${sessionId}`);

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      {
        error: 'Failed to update session',
        status: 500,
      },
      { status: 500 }
    );
  }
}