/**
 * The Variable Filter class allows for quick switching between different types of Biquad filters
 * with no clipping and allows for future scheduling of filter changes.
 * @class
 */

export default class VariableFilter {
  private readonly context: AudioContext; // The parent AudioContext
  private readonly filters: Record<string, BiquadFilterNode>; // all the filters
  private readonly gains: Record<string, GainNode>; // all the filter gains
  private readonly inputGain: GainNode; // GainNode to take input
  private readonly masterGain: GainNode; // GainNode to send output

  /**
   * Creates an instance of VariableFilter
   * @param {AudioContext} context - the containing audio context for the filter.
   */
  constructor(context: AudioContext) {
    this.context = context;

    this.filters = {};
    this.gains = {};

    // Create input gain (acting as an input point)
    this.inputGain = this.context.createGain();

    // Create master gain (acting as a mixer)
    this.masterGain = this.context.createGain();

    /**
     * Types of filters available.
     * @type {BiquadFilterType[]}
     */
    const types: BiquadFilterType[] = ["lowpass", "highpass", "bandpass"];

    // create all of the filters + gains by iterating through types
    types.forEach((type) => {
      const filter = this.context.createBiquadFilter();
      filter.type = type;

      const gain = this.context.createGain();
      gain.gain.value = 0; // all gains are initially silent

      // Connect the input to each filter
      this.inputGain.connect(filter);

      filter.connect(gain); // Connect this filter through a gain node
      gain.connect(this.masterGain); // Connect the gain node to the master gain

      this.filters[type] = filter;
      this.gains[type] = gain;
    });

    // Set one of the filter gains to 1 as default so sound will pass through
    this.gains.lowpass.gain.value = 1;
    this.filters.lowpass.frequency.value = 20000; // set the init value near Nyquist
  }

  /**
   * Method to schedule the switch of the filter type being used
   * @param {BiquadFilterType} type - the new filter type
   * @param {number} audioContextTime - time to schedule change for
   */
  switchFilter(type: BiquadFilterType, audioContextTime: number) {
    // Fade out all filters
    Object.values(this.gains).forEach((gain) => {
      gain.gain.setValueAtTime(0, audioContextTime);
    });

    // Fade in the selected filter
    this.gains[type].gain.setValueAtTime(1, audioContextTime);
  }

  /**
   * Method to schedule frequency change.
   * @param {number} normalizedValue - normalized value for the degree of filter activation (0.0- 1.0).
   * @param {string} filterType - type of filter (lowpass, highpass, bandpass)
   * @param {number} audioContextTime - time to schedule frequency change
   */
  changeFrequency(
    normalizedValue: number,
    filterType: string,
    audioContextTime: number,
  ) {
    // Define the frequency range (in Hz) that the filter will operate over
    // For example: 20Hz - 20000Hz (which are common values for human hearing)
    const minFreq = 20;
    const maxFreq = 20000;
    const currentFilter = this.filters[filterType];

    // Calculate the exponential scale factor
    const scaleFactor = Math.log(maxFreq / minFreq);

    // Calculate the frequency from the normalized value
    let frequency;
    if (filterType === "lowpass") {
      // For lowpass, 1 is very low freq and 0 is very high freq
      frequency = minFreq * Math.exp(scaleFactor * (1 - normalizedValue));
    } else if (filterType === "highpass" || filterType === "bandpass") {
      // For highpass, 0 is very low freq and 1 is very high freq
      frequency = minFreq * Math.exp(scaleFactor * normalizedValue);
    } else {
      // Handle other filter types or throw an error
      throw new Error(`Unsupported filter type: ${filterType}`);
    }

    // Set the value
    currentFilter.frequency.setValueAtTime(frequency, audioContextTime);
  }

  /**
   * Method to retrieve output node for connections
   * @returns {GainNode} The GainNode used as the output.
   */
  getOutputNode() {
    return this.masterGain;
  }

  /**
   * Method to retrieve the input node for connections.
   * @returns {GainNode} - The GainNode used for the input.
   */
  getInputNode() {
    return this.inputGain;
  }
}
