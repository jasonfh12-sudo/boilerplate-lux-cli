import { NextRequest, NextResponse } from 'next/server';
import { executeGlobalQuery } from '@/lib/turso-global';
import { executeOrgQuery } from '@/lib/turso-org';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  try {
    const { flowId: token } = await params; // This is actually the webhook token

    // 1. Get webhook token data from global database (query by token, not flow_id)
    const { data: webhookData, error: webhookError } = await executeGlobalQuery(
      'SELECT * FROM webhook_tokens WHERE token = ?',
      [token]
    );

    if (webhookError) {
      console.error('[Flow Info] Error fetching webhook token:', webhookError);
      return NextResponse.json(
        { error: 'Failed to fetch webhook token data' },
        { status: 500 }
      );
    }

    if (!webhookData || webhookData.length === 0) {
      return NextResponse.json(
        { error: 'Webhook token not found' },
        { status: 404 }
      );
    }

    const webhookToken = webhookData[0];
    const clerkOrgId = webhookToken.clerk_org_id;
    const flowId = webhookToken.flow_id; // Get the actual flow_id from the token record

    // 2. Get workflow name from org-specific database
    const { data: workflowData, error: workflowError } = await executeOrgQuery(
      clerkOrgId,
      'SELECT name FROM "system.flows" WHERE id = ?',
      [flowId]
    );

    if (workflowError) {
      console.error('[Flow Info] Error fetching workflow:', workflowError);
      // Don't fail completely - return with auto-generated name
    }

    const workflowName = workflowData && workflowData.length > 0
      ? workflowData[0].name
      : 'Unknown Workflow';

    // 3. Parse webhook schema if available
    let schema = null;
    if (webhookToken.webhook_schema) {
      try {
        schema = JSON.parse(webhookToken.webhook_schema);
      } catch (e) {
        console.error('[Flow Info] Error parsing webhook schema:', e);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        flowId,
        workflowName,
        schema,
        clerkOrgId,
        draftWebhookTrigger: webhookToken.draft_webhook_trigger === 1,
        deployedWebhookTrigger: webhookToken.deployed_webhook_trigger === 1,
      },
    });
  } catch (error) {
    console.error('[Flow Info] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
