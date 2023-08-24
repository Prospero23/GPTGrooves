import Synth from "./components/Synth"


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>GPT House</h1>
      <Synth/>
    </main>
  )
}
