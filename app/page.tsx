import { type SongType } from "@/library/musicData";
import Scene from "./components/Scene";

// import PlayButton from "./components/PlayButton";
export default async function Home() {
  let result;
  try {
    result = await fetch(`${process.env.BASE_URL}/api/songs`);
  } catch (e) {
    throw Error("Error fetching songs");
  }
  const body = await result.json();
  const bars: SongType[] = body.songs;
  console.log(bars);

  const songsArray = bars.map((item) => item.song);
  const datesArray = bars.map((item) => {
    const utcDate = new Date(item.created_at_utc);
    const day = utcDate.getUTCDate();
    const month = utcDate.toLocaleString("default", { month: "long" });
    const year = utcDate.getFullYear(); // +1 to make 0-11 -> 1-12
    return { month, day, year };
  });
  return (
    <main className="flex w-screen h-screen bg-white">
      <div className="w-screen h-screen">
        <p>{"hi"}</p>
        <Scene songs={songsArray} dates={datesArray} />
      </div>
    </main>
  );
}
