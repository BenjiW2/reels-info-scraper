declare module "wavefile" {
  class WaveFile {
    constructor(buffer: Buffer | Uint8Array);
    toBitDepth(bitDepth: string): void;
    toSampleRate(sampleRate: number): void;
    getSamples(): Float32Array | Float32Array[];
  }
  const wavefile: { WaveFile: typeof WaveFile };
  export default wavefile;
}
