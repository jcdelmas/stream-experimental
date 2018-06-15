import { _registerFlow, Flow, FlowStage, createFlow } from '../core/flow'

export function distinct<A>(): Flow<A, A> {
  return createFlow<A, A>(() => new Distinct<A>())
}

_registerFlow('distinct', distinct);

export class Distinct<A> extends FlowStage<A, A> {

  last?: A = null

  onPush(): void {
    const x = this.grab();
    if (x != this.last) {
      this.push(x);
      this.last = x;
    } else {
      this.pull();
    }
  }
}
