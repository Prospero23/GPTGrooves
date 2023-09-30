import { getSongs } from "@/library/db";
import Scene from "./components/Scene";
// import PlayButton from "./components/PlayButton";
export default async function Home() {
  const bars = await getSongs();
  const songsArray = bars.map((item) => item.song);

  return (
    <main className="flex w-screen h-screen bg-white">
      <div className="w-screen h-screen">
        <Scene songs={songsArray} />
      </div>
    </main>
  );
}

// bars={barsArray}
