import PlayButton from '@/app/components/PlayButton'
import Scene from './components/Scene'


export default function Home() {
  return (
    <main className="min-h-screen p-24 flex">
      {/* <h1>GPT House</h1> */}
      <div className='w-screen h-screen'>
      <Scene/>
      </div>
      {/* <PlayButton/> */}
    </main>
  )
}
