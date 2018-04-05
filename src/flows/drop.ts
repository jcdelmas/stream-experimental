import { _registerFlow, Flow, FlowStage } from '../core/flow'

export function drop<A>(n: number): Flow<A, A, void> {
  return Flow.fromStageFactory<A, A, void>(() => new Drop<A>(n));
}

_registerFlow('drop', drop);

class Drop<A> extends FlowStage<A, A, void> {

  private count = 0

  constructor(private readonly nbr: number) {
    super()
  }


  onPush(): void {
    if (this.count++ < this.nbr) {
      this.pull();
    } else {
      this.push(this.grab());
    }
  }
}