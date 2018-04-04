export var OverflowStrategy;
(function (OverflowStrategy) {
    OverflowStrategy["DROP_BUFFER"] = "DROP_BUFFER";
    OverflowStrategy["DROP_HEAD"] = "DROP_HEAD";
    OverflowStrategy["DROP_NEW"] = "DROP_NEW";
    OverflowStrategy["DROP_TAIL"] = "DROP_TAIL";
    OverflowStrategy["FAIL"] = "FAIL";
    OverflowStrategy["BACK_PRESSURE"] = "BACK_PRESSURE";
})(OverflowStrategy || (OverflowStrategy = {}));
export default class Buffer {
    constructor(maxSize = 16, overflowStrategy = OverflowStrategy.FAIL, dropCallback = () => { }) {
        this.maxSize = maxSize;
        this.overflowStrategy = overflowStrategy;
        this.dropCallback = dropCallback;
        this.buf = [];
    }
    size() {
        return this.buf.length;
    }
    isEmpty() {
        return this.buf.length === 0;
    }
    isFull() {
        return this.buf.length === this.maxSize;
    }
    push(x) {
        if (this.isFull()) {
            switch (this.overflowStrategy) {
                case OverflowStrategy.FAIL:
                    this.buf.forEach(this.dropCallback);
                    throw new Error('Buffer overflow');
                case OverflowStrategy.DROP_BUFFER:
                    this.buf.forEach(this.dropCallback);
                    this.buf = [];
                    break;
                case OverflowStrategy.DROP_HEAD:
                    this.dropCallback(this.buf.shift());
                    break;
                case OverflowStrategy.DROP_NEW:
                    this.dropCallback(x);
                    return;
                case OverflowStrategy.DROP_TAIL:
                    this.dropCallback(this.buf.pop());
                    break;
                default:
                    throw new Error('Not supported strategy: ' + this.overflowStrategy);
            }
        }
        this.buf.push(x);
    }
    pull() {
        if (this.isEmpty()) {
            throw new Error('Empty buffer');
        }
        return this.buf.shift();
    }
    head() {
        if (this.isEmpty()) {
            throw new Error('Empty buffer');
        }
        return this.buf[0];
    }
    drain() {
        const buf = this.buf;
        this.buf = [];
        return buf;
    }
}
//# sourceMappingURL=buffer.js.map