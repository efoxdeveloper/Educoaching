import { NextResponse } from "next/server";
import dns from "dns";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email?.trim();

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { validFormat: false, mxValid: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    const domain = email.split("@")[1];
    if (!domain) {
      return NextResponse.json(
        { validFormat: false, mxValid: false, error: "Invalid domain" },
        { status: 400 }
      );
    }

    try {
      const records = await dns.promises.resolveMx(domain);
      const mxValid = Array.isArray(records) && records.length > 0;
      return NextResponse.json({ validFormat: true, mxValid, domain });
    } catch {
      // DNS resolution failed or no MX records found
      return NextResponse.json({ validFormat: true, mxValid: false, domain });
    }
  } catch (err) {
    console.error("Error in check-email API:", err);
    return NextResponse.json(
      { validFormat: false, mxValid: false, error: "Validation failed" },
      { status: 500 }
    );
  }
}
