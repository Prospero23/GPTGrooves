export default async function setup() {
    const patchExportURL = "export/drums/drums.export.json";
    const patchExportURL_bass = "export/bass/bass.export.json";
    const patchExportURL_synth = "export/synth/synth.export.json";

    // Create AudioContext
    const WAContext = window.AudioContext || window.webkitAudioContext;
    const context = new WAContext();

    // Create gain node and connect it to audio output
    const outputNode = context.createGain();
    outputNode.connect(context.destination);

    // Fetch the exported patcher
    let response, patcher, responseBass, patcherBass, responseSynth, patcherSynth;
    try {
        response = await fetch(patchExportURL);
        patcher = await response.json();

        responseBass = await fetch(patchExportURL_bass)
        patcherBass = await responseBass.json();

        responseSynth = await fetch(patchExportURL_synth)
        patcherSynth = await responseSynth.json()

        if (!window.RNBO) {
            // Load RNBO script dynamically
            // Note that you can skip this by knowing the RNBO version of your patch
            // beforehand and just include it using a <script> tag
            await loadRNBOScript(patcher.desc.meta.rnboversion);
        }

    } catch (err) {
        const errorContext = {
            error: err
        };
        if (response && (response.status >= 300 || response.status < 200)) {
            errorContext.header = `Couldn't load patcher export bundle`,
            errorContext.description = `Check app.js to see what file it's trying to load. Currently it's` +
            ` trying to load "${patchExportURL}". If that doesn't` +
            ` match the name of the file you exported from RNBO, modify` +
            ` patchExportURL in app.js.`;
        }
        // if (typeof guardrails === "function") {
        //     guardrails(errorContext);
        // } else {
        //     throw err;
        // }
        return;
    }

    // (Optional) Fetch the dependencies
    let dependencies = [];
    try {
        const dependenciesResponse = await fetch("export/drums/dependencies.json");
        dependencies = await dependenciesResponse.json();

        // Prepend "export" to any file dependenciies
        dependencies = dependencies.map(d => d.file ? Object.assign({}, d, { file: "export/" + d.file }) : d);
    } catch (e) {}

    // Create the device
    let device, deviceBass, deviceSynth;
    try {
        device = await RNBO.createDevice({ context, patcher:patcher });
        deviceBass = await RNBO.createDevice({ context, patcher:patcherBass });
        deviceSynth = await RNBO.createDevice({ context, patcher:patcherSynth });
    } catch (err) {
        if (typeof guardrails === "function") {
            guardrails({ error: err });
        } else {
            throw err;
        }
        return;
    }

    // (Optional) Load the samples
    if (dependencies.length)
        await device.loadDataBufferDependencies(dependencies);

    // Connect the device to the web audio graph
    device.node.connect(outputNode);
    deviceBass.node.connect(outputNode);
    deviceSynth.node.connect(outputNode);

    // // (Optional) Create a form to send messages to RNBO inputs
    // makeInportForm(device);

    // // (Optional) Attach listeners to outports so you can log messages from the RNBO patcher
    // attachOutports(device);

    // // (Optional) Load presets, if any
    // loadPresets(device, patcher);

    // // (Optional) Connect MIDI inputs
    // makeMIDIKeyboard(device);

    document.body.onclick = () => {
        context.resume();
    }

//     // Skip if you're not using guardrails.js
//     if (typeof guardrails === "function")
//         guardrails();
//   }

  function loadRNBOScript(version) {
    return new Promise((resolve, reject) => {
        if (/^\d+\.\d+\.\d+-dev$/.test(version)) {
            throw new Error("Patcher exported with a Debug Version!\nPlease specify the correct RNBO version to use in the code.");
        }
        const el = document.createElement("script");
        el.src = "https://c74-public.nyc3.digitaloceanspaces.com/rnbo/" + encodeURIComponent(version) + "/rnbo.min.js";
        el.onload = resolve;
        el.onerror = function(err) {
            console.log(err);
            reject(new Error("Failed to load rnbo.js v" + version));
        };
        document.body.append(el);
    });
  }


  return {context, device, deviceBass, deviceSynth}
}

//setup();
