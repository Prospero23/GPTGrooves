import { getSongs } from "@/library/db";
import Scene from "./components/Scene";
// import PlayButton from "./components/PlayButton";
export default async function Home() {
  let result;
  try {
    result = await getSongs();
  } catch (e) {
    throw Error("Error fetching songs");
  }
  const bars = result;
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
        <Scene songs={songsArray} dates={datesArray} />
      </div>
    </main>
  );
}

export const dynamic = "force dynamic";

// bars={barsArray}
