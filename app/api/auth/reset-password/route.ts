import { NextRequest, NextResponse } from "next/server";

const CC_CLOUD_URL = process.env.CC_CLOUD_URL || process.env.NEXT_PUBLIC_CC_CLOUD_URL || "http://localhost:8000";
const ORG_ID = process.env.CLERK_ORG_ID;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: "token and password are required" },
        { status: 400 }
      );
    }

    // Call cc_cloud API
    const response = await fetch(`${CC_CLOUD_URL}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        password,
        orgId: ORG_ID,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[RESET-PASSWORD] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
