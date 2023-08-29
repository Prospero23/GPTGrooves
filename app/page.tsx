import PlayButton from '@/app/components/PlayButton'
import Scene from './components/Scene'


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col p-24">
      <h1>GPT House</h1>
      <div className=' h-96'>
      <Scene/>
      </div>
      <PlayButton/>
    </main>
  )
}
