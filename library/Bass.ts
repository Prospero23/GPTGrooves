export default class Bass {
  audioContext: AudioContext;
  attackTime: number;
  decayTime: number;
  sustainLevel: number;
  releaseTime: number;
  private readonly destinations: AudioNode[];
  private readonly activeNotes: Map<
    number,
    { oscillator: OscillatorNode; gainNode: GainNode }
  >;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;

    // ADSR settings
    this.attackTime = 0.01; // in seconds TODO: potentially change. longer values fuck with time feel
    this.decayTime = 0.1; // in seconds
    this.sustainLevel = 0.8; // volume level, 0 to 1
    this.releaseTime = 0.3; // in seconds

    this.destinations = [];
    this.activeNotes = new Map();
  }

  playNote(midi: number, time: number) {
    // Stop the note if it's already playing
    if (this.activeNotes.has(midi)) {
      this.noteOff(midi, time);
    }

    const frequency = 440 * Math.pow(2, (midi - 69) / 12);
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = "sawtooth";
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(1, time + this.attackTime);
    gainNode.gain.linearRampToValueAtTime(
      this.sustainLevel,
      time + this.attackTime + this.decayTime,
    );

    oscillator.connect(gainNode);
    for (const destination of this.destinations) {
      gainNode.connect(destination);
    }

    oscillator.start(time);

    this.activeNotes.set(midi, { oscillator, gainNode });
  }

  noteOff(midi: number, time: number) {
    const note = this.activeNotes.get(midi);
    if (note == null) return;

    const { oscillator, gainNode } = note;

    gainNode.gain.cancelScheduledValues(time);
    gainNode.gain.setValueAtTime(gainNode.gain.value, time);
    gainNode.gain.linearRampToValueAtTime(0, time + this.releaseTime);

    oscillator.stop(time + this.releaseTime);

    // Remove the note from the active notes
    this.activeNotes.delete(midi);
  }

  connect(destination: AudioNode) {
    if (destination !== this.audioContext.destination) {
      this.destinations.push(destination);
    }
  }
}
