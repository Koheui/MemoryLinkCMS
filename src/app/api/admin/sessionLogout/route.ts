'use server';

import { cookies } from "next/headers";

export async function POST() {
  cookies().set({ name: "__session", value: "", maxAge: 0, path: "/" });
  return new Response("Session cookie cleared", { status: 200 });
}
