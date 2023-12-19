import { getSongs } from "@/library/db";

export async function GET(request: Request) {
  try {
    const songs = await getSongs();
    return new Response(JSON.stringify({ songs }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Error fetching songs" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
