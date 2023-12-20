import { getSongs } from "@/library/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const songs = await getSongs();
    return NextResponse.json({ songs });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Error fetching songs" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// export async function GET(request: Request) {
//   const songs = await getSongs();
//   return NextResponse.json({ songs });
// }
