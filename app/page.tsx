import { getBars } from "@/library/db";
import Scene from "./components/Scene";
import PlayButton from "./components/PlayButton"
import { Play } from "next/font/google";
export default async function Home() {
  const bars = await getBars();
  const barsArray = bars.map(item => item.bar);

  return (
    <main className="p-24 flex w-screen h-screen">
       <div className="w-screen h-screen">
        <Scene bars={barsArray}/>
        {/* <PlayButton/> */}
      </div>
    </main>
  );
}
