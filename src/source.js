import { Stage, SourceStage, wire } from './stage';
import Flow, { FlowOps, Concat, Zip } from './flow';
import Sink from './sink';
import RunnableGraph from './runnable-graph';

export default class Source extends FlowOps {

  /**
   * @param items
   * @returns {Source}
   */
  static from(items) {
    return new Source(new ListSource(items));
  }

  /**
   * @returns {Source}
   */
  static empty() {
    return new Source(new SourceStage({
      onPull() {
        this.complete();
      }
    }));
  }

  /**
   * @returns {Source}
   */
  static single(x) {
    return new Source(new SourceStage({
      onPull() {
        this.pushAndComplete(x);
      }
    }));
  }

  /**
   * @param {Source[]} sources
   */
  static concat(...sources) {
    const concat = new Concat();
    sources.forEach(s => wire(s, concat));
    return new Source(concat);
  }

  /**
   * @param {Source[]|SourceStage[]} sources
   * @returns {Flow}
   */
  static zip(...sources) {
    const zip = new Zip();
    sources.forEach(s => wire(s, zip));
    return new Source(zip);
  }

  /**
   * @param {Stage} first
   * @param {Stage?} last
   */
  constructor(first, last) {
    super(first, last || first);
  }

  /**
   * @param {Source|SourceStage} source
   * @returns {Source}
   */
  concat(source) {
    return Source.concat(this, source);
  }

  /**
   * @param {Source|SourceStage} source
   * @returns {Source}
   */
  zip(source) {
    return Source.zip(this, source);
  }

  /**
   * @param {GraphInterface} flow
   * @returns {Source}
   */
  via(flow) {
    return this._wire(flow, Source);
  }

  /**
   * @param {GraphInterface} sink
   * @returns {RunnableGraph}
   */
  to(sink) {
    return this._wire(sink, RunnableGraph);
  }

  forEach(cb) {
    return this.runWith(Sink.forEach(cb));
  }

  toList() {
    return this.runWith(Sink.toList());
  }

  reduce(fn, zero) {
    return this.runWith(Sink.reduce(fn, zero));
  }

  /**
   * @param {Sink} sink
   */
  runWith(sink) {
    return this.to(sink).run();
  }

  _nextInput() {
    throw new Error('Not allowed on runnable graph');
  }
}

class ListSource extends SourceStage {
  constructor(items) {
    super();
    this.index = 0;
    this.items = items;
  }

  onPull() {
    if (this.index < this.items.length) {
      this.push(this.items[this.index++]);
    }
    if (this.index == this.items.length) {
      this.complete();
    }
  }
}
