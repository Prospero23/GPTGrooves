"use client";

import { createDevice } from "@rnbo/js";
import { useEffect, useState } from "react";
import Instrument from "../../synth_resources/drums.export.json"

export default async function Synth() {
  const [waContext, setWaContext] = useState<undefined | AudioContext>(
    undefined
  );


  const setup = async () => {
    // let rawPatcher = await fetch("patcher.export.json");
    // let patcher = await rawPatcher.json();

    const baseInstrument = Instrument
    // We don't have options in the exported value. IPatcher.desc needs it.
    // baseInstrument.desc["options"] = {
    //     classname: "fuck",
    //     minifyOutput: false // TODO is this cool should we try this?
    // }
    baseInstrument.desc["options"] = undefined
    const fixedInstrument: IPatcher = baseInstrument
    let device = await createDevice({ waContext, patcher: fixedInstrument });

    // This connects the device to audio output, but you may still need to call context.resume()
    // from a user-initiated function.
    device.node.connect(waContext.destination);
  };

  useEffect(() => {
    //@ts-ignore
    setWaContext(window.AudioContext || window.webkitAudioContext);

    setup();
    // On dismount, clear state
    return () => {
      setWaContext(undefined);
    };
  }, []);



  //const device = await createDevice({context, patcher})
  return (
    <div className="text-white">
      <h3>TESTSTESTSTS</h3>
    </div>
  );
}
