import { getSongs } from "@/library/db";
import Scene from "./components/Scene";

export default async function Home() {
  const bars = await getSongs();
  const songsArray = bars.map(item => item.song);

  return (
    <main className="min-h-screen p-24 flex">
      <h1>GPT House</h1>
       <div className="w-screen h-screen">
        <Scene songs={songsArray}/>
      </div>
      {/* <div className="absolute bg-transparent">
        {bars.map((bar) => {
          return (
            <div key={bar._id.toString()}>
              <h1>{bar._id.toString()}</h1>
              <p>{bar.created_at_utc}</p>
              <p>{JSON.stringify(bar.bar)}</p>
            </div>
          );
        })}
      </div> */}

    </main>
  );
}
