export default class Drums {
  audioContext: AudioContext;
  kickSample: AudioBuffer | undefined;
  snareSample: AudioBuffer | undefined;
  hatSample: AudioBuffer | undefined;
  private readonly destinations: AudioNode[];

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.kickSample = undefined;
    this.snareSample = undefined;
    this.hatSample = undefined;
    this.destinations = [];
  }

  static async create(audioContext: AudioContext) {
    const drums = new Drums(audioContext);
    await drums.loadSamples();
    return drums;
  }

  private async loadSamples() {
    this.kickSample = await this.loadSample("export/drums/media/kick.wav");
    this.snareSample = await this.loadSample("export/drums/media/snare.wav");
    this.hatSample = await this.loadSample("export/drums/media/hi-hat.wav");
  }

  private async loadSample(url: string) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (e) {
      if (e instanceof Error) {
        throw Error(`${e.message} ${url}`);
      }
    }
  }

  private playSample(sample: AudioBuffer | null, time: number) {
    if (sample == null) {
      throw new Error("Sample is not loaded");
    }

    const sampleSource = new AudioBufferSourceNode(this.audioContext, {
      buffer: sample,
      playbackRate: 1,
    });

    for (const destination of this.destinations) {
      sampleSource.connect(destination);
    }

    sampleSource.start(time);
    sampleSource.onended = () => {
      sampleSource.disconnect(); // prevent memory leaks
    };
    return sampleSource;
  }

  playHat(time: number) {
    return this.playSample(this.hatSample, time);
  }

  playKick(time: number) {
    return this.playSample(this.kickSample, time);
  }

  playSnare(time: number) {
    return this.playSample(this.snareSample, time);
  }

  connect(destination: AudioNode) {
    // Add a new destination only if it's not the default destination
    if (destination !== this.audioContext.destination) {
      this.destinations.push(destination);
    }
  }
}
