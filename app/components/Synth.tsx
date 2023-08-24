'use client'

import { createDevice } from "@rnbo/js";
import { useEffect, useState } from "react";

export default async function Synth() {

    const [waContext, setWaContext] = useState<undefined | AudioContext>(undefined)

    useEffect(() => {
        //@ts-ignore
        setWaContext(window.AudioContext || window.webkitAudioContext)
        // On dismount, clear state
        return () => { setWaContext(undefined) }
    }, [])



    //const device = await createDevice({context, patcher})
  return (
    <div className="text-white">
    <h3>TESTSTESTSTS</h3>
    </div>
  );
}
