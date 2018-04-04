import { _registerFlow, Flow, FlowStage } from '../core/flow';
import { SinkStage } from '../core/sink';
export function flatMapMerge(fn, breadth = 16) {
    return Flow.fromStageFactory(() => new FlatMapMerge(fn, breadth));
}
_registerFlow('flatMapMerge', flatMapMerge);
class FlatMapMerge extends FlowStage {
    constructor(fn, breadth = 16) {
        super();
        this.fn = fn;
        this.breadth = breadth;
        this.stages = [];
        this.completePending = false;
    }
    onPush() {
        const source = this.fn(this.grab());
        const stage = new FlatMapSink(this);
        this.stages.push(stage);
        source.runWithLastStage(stage);
        if (this.stages.length < this.breadth) {
            this.pull();
        }
    }
    onPull() {
        if (this.stages.length > 0) {
            const availableStage = this.stages.find(stage => stage.isInputAvailable());
            if (availableStage) {
                this.push(availableStage.grab());
            }
            this.stages.forEach(stage => stage.pullIfAllowed());
        }
        else {
            this.pull();
        }
    }
    onCancel() {
        this.stages.forEach(stage => stage.cancel());
        this.cancel();
    }
    onComplete() {
        if (this.stages.length === 0) {
            this.complete();
        }
        else {
            this.completePending = true;
        }
    }
}
class FlatMapSink extends SinkStage {
    constructor(parent) {
        super();
        this.parent = parent;
    }
    onPush() {
        this.parent.push(this.grab());
    }
    onComplete() {
        const i = this.parent.stages.indexOf(this);
        this.parent.stages.splice(i, 1);
        if (this.parent.completePending && this.parent.stages.length === 0) {
            this.parent.complete();
        }
        else if (!this.parent.isInputClosed()) {
            this.parent.pull();
        }
    }
    onStart() {
        this.pull();
    }
}
//# sourceMappingURL=flat-map-merge.js.map