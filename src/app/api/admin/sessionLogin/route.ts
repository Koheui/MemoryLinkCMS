'use server';

import { cookies } from "next/headers";
import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}

export async function POST(req: Request) {
  const { idToken } = await req.json();
  if (!idToken) {
    return new Response("No token", { status: 400 });
  }
  
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    if (decoded.role !== "admin") {
      return new Response("Forbidden: User is not an admin", { status: 403 });
    }

    const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
    
    cookies().set({ 
      name: "__session", 
      value: sessionCookie, 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: "lax", 
      path: "/", 
      maxAge: expiresIn / 1000 
    });
    
    return new Response("Session cookie created", { status: 200 });

  } catch (error) {
    console.error("Error verifying ID token or creating session cookie:", error);
    return new Response("Unauthorized", { status: 401 });
  }
}
