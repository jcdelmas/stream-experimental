import FanIn, { createFanIn, FanInStage } from '../core/fan-in';
import Stream from '../core/stream';
import Source from '../core/source';

/**
 * @param {Stream[]} sources
 * @param {int} segmentSize
 * @returns {Stream}
 */
Source.interleave = (sources, segmentSize = 1) => {
  return Stream.groupStreams(sources).interleaveStreams(segmentSize);
};

/**
 * @param {int} segmentSize
 * @returns {Stream}
 */
FanIn.interleave = (size, segmentSize = 1) => {
  return createFanIn(size, () => new Interleave(size, segmentSize));
};

/**
 * @param {Stream} source
 * @param {int} segmentSize
 * @returns {Stream}
 */
Stream.prototype.interleave = function (source, segmentSize = 1) {
  return Stream.groupStreams([this, source]).fanIn(size => FanIn.interleave(size, segmentSize));
};

/**
 * @param segmentSize
 * @return {Stream}
 */
Stream.prototype.interleaveStreams = function (segmentSize = 1) {
  return this.fanIn(size => FanIn.interleave(size, segmentSize));
};

class Interleave extends FanInStage {

  constructor(size, segmentSize) {
    super(size);
    this.segmentSize = segmentSize;
  }

  completedInputs = 0;

  currentInputIndex = 0;

  count = 0;

  createDownstreamHandler(index) {
    return {
      onPush: () => {
        if (this.isOutputAvailable()) {
          this.push(this.inputs[index].grab());
          this.count++;
          if (this.count === this.segmentSize) {
            this._switchToNextInput();
          }
        }
      },
      onComplete: () => {
        this.completedInputs++;
        if (this.completedInputs >= this.inputs.length) {
          this.complete();
        } else if (this.currentInputIndex === index) {
          this._switchToNextInput();
          if (this.isOutputAvailable()) {
            this.currentInput().pull();
          }
        }
      },
      onError: e => this.error(e)
    };
  }

  _switchToNextInput() {
    this._incrementCurrentInput();
    while (this.currentInput().isClosed()) {
      this._incrementCurrentInput();
    }
    this.count = 0;
  }

  _incrementCurrentInput() {
    this.currentInputIndex = (this.currentInputIndex + 1) % this.inputs.length;
  }

  currentInput() {
    return this.inputs[this.currentInputIndex]
  }

  onPull() {
    this.currentInput().pullIfAllowed();
  }

  onCancel() {
    this.cancelAll();
  }
}
