
import { Source, SourceStage } from '../core/source'

export function fromArray<O>(items: O[]): Source<O> {
  return Source.fromStageFactory(() => new ArraySourceStage(items))
}

class ArraySourceStage<O> extends SourceStage<O> {

  index = 0

  constructor(private items: O[]) {
    super()
  }

  onPull(): void {
    if (this.index < this.items.length) {
      this.push(this.items[this.index++])
    }
    if (this.index == this.items.length) {
      this.complete()
    }
  }
}