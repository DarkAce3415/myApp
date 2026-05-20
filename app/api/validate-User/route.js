import { adminAuth } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    const { token } = await req.json();

    const decodedToken =
      await adminAuth.verifyIdToken(token);

    return Response.json({
      success: true,
      uid: decodedToken.uid,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}