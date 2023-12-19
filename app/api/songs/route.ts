import { getSongs } from "@/library/db";

export async function GET(request: Request) {
  try {
    const songs = await getSongs();
    return Response.json({ songs });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Error fetching songs" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
