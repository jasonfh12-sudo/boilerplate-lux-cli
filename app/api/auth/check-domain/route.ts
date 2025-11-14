import { NextRequest, NextResponse } from "next/server";

const CC_CLOUD_URL = process.env.CC_CLOUD_URL || process.env.NEXT_PUBLIC_CC_CLOUD_URL || "http://localhost:8000";
const ORG_ID = process.env.CLERK_ORG_ID;
const INTERFACE_ID = process.env.INTERFACE_ID;
const MULTI_TENANT = process.env.MULTI_TENANT === "true";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "email is required" },
        { status: 400 }
      );
    }

    // Call cc_cloud API
    const response = await fetch(`${CC_CLOUD_URL}/auth/check-domain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        interfaceId: INTERFACE_ID,
        orgId: ORG_ID,
        multiTenant: MULTI_TENANT,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[CHECK-DOMAIN] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
