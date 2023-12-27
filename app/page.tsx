import Scene from "./components/Scene";

// import PlayButton from "./components/PlayButton";
export default async function Home() {
  let result;

  // Use VERCEL_URL if available, otherwise default to a development URL
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const apiUrl = `${baseUrl}/api/songs`;

  try {
    // Fetch data from the API endpoint
    result = await fetch(apiUrl);
    if (!result.ok) {
      // Handle non-2xx responses
      throw new Error(`Error fetching songs: ${result.statusText}`);
    }
  } catch (e: any) {
    // Handle any errors that occurred during the fetch
    console.error("Error fetching songs:", e.message);
    throw new Error("Error fetching songs");
  }

  const body = await result.json();
  const bars = body.songs;

  const songsArray = bars.map((item: any) => item.song);
  const markupArray = bars.map((item: any) => item.markup);
  const datesArray = bars.map((item: any) => {
    const utcDate = new Date(item.created_at_utc);
    const day = utcDate.getUTCDate();
    const month = utcDate.toLocaleString("default", { month: "long" });
    const year = utcDate.getFullYear(); // +1 to make 0-11 -> 1-12
    return { month, day, year };
  });
  return (
    <main className="flex w-screen h-screen bg-white">
      <div className="w-screen h-screen">
        <Scene songs={songsArray} dates={datesArray} markups={markupArray} />
      </div>
    </main>
  );
}
