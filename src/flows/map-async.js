import { _registerFlow, Flow, FlowStage } from '../core/flow';
export function mapAsync(fn, parallelism = 1) {
    return Flow.fromStageFactory(() => new MapAsync(fn, parallelism));
}
export function mapAsyncUnordered(fn, parallelism = 1) {
    return Flow.fromStageFactory(() => new MapAsyncUnordered(fn, parallelism));
}
_registerFlow('mapAsync', mapAsync);
_registerFlow('mapAsyncUnordered', mapAsyncUnordered);
class MapAsyncUnordered extends FlowStage {
    constructor(fn, parallelism = 1) {
        super();
        this.fn = fn;
        this.buffer = [];
        this.maxWorkers = parallelism;
        this.availableWorkers = parallelism;
    }
    onStart() {
        this.pull();
    }
    onPush() {
        if (this.availableWorkers === 0) {
            throw new Error('No available worker');
        }
        this.availableWorkers--;
        this._execute(this.grab());
        if (this.availableWorkers > 0) {
            this.pull();
        }
    }
    _execute(x) {
        this.fn(x).then(y => {
            if (this.isOutputAvailable()) {
                this.fullPush(y);
            }
            else {
                this.buffer.push(y);
            }
        }).catch(err => this.error(err));
    }
    fullPush(x) {
        this.push(x);
        this.availableWorkers++;
        if (!this.hasPendingJobs() && this.isInputClosed()) {
            this.complete();
        }
        else {
            this.pullIfAllowed();
        }
    }
    onPull() {
        if (this.buffer.length) {
            this.fullPush(this.buffer.shift());
        }
    }
    onComplete() {
        if (!this.hasPendingJobs()) {
            this.complete();
        }
    }
    hasPendingJobs() {
        return this.availableWorkers < this.maxWorkers;
    }
}
class MapAsync extends MapAsyncUnordered {
    constructor(fn, parallelism = 1) {
        super(fn, parallelism);
        this.runningJobs = [];
    }
    _execute(x) {
        const job = new Job(() => this.fn(x));
        this.runningJobs.push(job);
        job.run().then(() => {
            while (this.runningJobs.length && this.runningJobs[0].completed) {
                const y = this.runningJobs.shift().result;
                if (this.isOutputAvailable()) {
                    this.fullPush(y);
                }
                else {
                    this.buffer.push(y);
                }
            }
        }).catch(err => this.error(err));
    }
}
class Job {
    constructor(job) {
        this.job = job;
        this.completed = false;
    }
    run() {
        return this.job().then(x => {
            this.result = x;
            this.completed = true;
        });
    }
}
//# sourceMappingURL=map-async.js.map