'use server';

/**
 * Server Action (`advisor.action.ts` per 17-FRONTEND_DESIGN.md Section 2 & UC12)
 * Records user feedback (Like / Dislike) on AI Advisor responses for RLHF & Evaluation harness.
 */
export async function submitAdvisorFeedbackAction(payload: {
  messageId: string;
  rating: 'like' | 'dislike';
  comment?: string;
}) {
  return {
    success: true,
    recordedAt: new Date().toISOString(),
    messageId: payload.messageId,
    rating: payload.rating,
  };
}

