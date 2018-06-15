
import { _registerFlow, FlowStage, Flow , createFlow } from '../core/flow'

export function filter<A>(fn: (x: A) => boolean): Flow<A, A> {
  return createFlow(() => new Filter(fn))
}

_registerFlow('filter', filter)

class Filter<A> extends FlowStage<A, A> {
  
  constructor (private readonly fn: (x: A) => boolean) {
    super()
  }
  
  onPush() {
    const x = this.grab();
    if (this.fn(x)) {
      this.push(x)
    } else {
      this.pull();
    }
  }
}
