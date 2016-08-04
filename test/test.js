"use strict";

import 'babel-polyfill';
import should from 'should';

import {
  Source,
  Sink,
  Flow,
  FanIn,
  FanOut,
  OverflowStrategy
} from '../src/index';

const WithTime = Flow.createSimple({
  doStart() {
    this.startTime = new Date().getTime();
  },
  onPush() {
    const x = this.grab();
    this.push([x, new Date().getTime() - this.startTime])
  }
});

function timeChecker(results, expected) {
  results.map(x => {
    const rawTime = x[1];
    return [x[0], Math.floor((rawTime + 50) / 100) * 100];
  }).should.be.eql(expected);
}

describe('Source', () => {
  it('from(list)', async () => {
    const result = await Source.from([1, 2, 3]).toArray();
    result.should.be.eql([1, 2, 3]);
  });
  it('empty', async () => {
    const result = await Source.empty().toArray();
    result.should.be.eql([]);
  });
  it('single', async () => {
    const result = await Source.single(5).toArray();
    result.should.be.eql([5]);
  });
  it('repeat', async () => {
    const result = await Source.repeat(7).take(3).toArray();
    result.should.be.eql([7, 7, 7]);
  });
  it('forEach', async () => {
    const xs = [];
    await Source.from([1, 2, 3]).forEach(x => xs.push(x));
    xs.should.be.eql([1, 2, 3]);
  });
  it('to', async () => {
    const result = await Source.from([1, 2, 3]).pipe(Sink.toArray()).run();
    result.should.be.eql([1, 2, 3]);
  });

  it('no side effects', async () => {
    const src = Source.from([1, 2, 3]);
    const result1 = await src.toArray();
    const result2 = await src.toArray();
    result1.should.be.eql([1, 2, 3]);
    result1.should.be.eql(result2);
  });
});

describe('Flow stages', () => {
  it('map', async () => {
    const result = await Source.from([1, 2, 3]).map(x => x + 1).toArray();
    result.should.be.eql([2, 3, 4]);
  });
  it('filter', async () => {
    const result = await Source.from([1, 2, 3, 4, 5]).filter(x => x > 2).toArray();
    result.should.be.eql([3, 4, 5]);
  });
  it('scan', async () => {
    const result = await Source.from([1, 1, 1]).scan((acc, x) => acc + x, 0).toArray();
    result.should.be.eql([1, 2, 3]);
  });
  it('mapConcat', async () => {
    const result = await Source.from([1, 2, 3]).mapConcat(x => [x, x]).toArray();
    result.should.be.eql([1, 1, 2, 2, 3, 3]);
  });
  it('grouped', async () => {
    const result = await Source.from([1, 2, 3, 4, 5]).grouped(2).toArray();
    result.should.be.eql([[1, 2], [3, 4], [5]]);
  });
  it('sliding', async () => {
    const result = await Source.from([1, 2, 3, 4, 5]).sliding(3).toArray();
    result.should.be.eql([[1, 2, 3], [2, 3, 4], [3, 4, 5]]);
  });
  it('sliding - 2', async () => {
    const result = await Source.from([1, 2, 3, 4]).sliding(3, 2).toArray();
    result.should.be.eql([[1, 2, 3], [3, 4]]);
  });
  describe('take', () => {
    it('simple', async () => {
      const result = await Source.from([1, 2, 3, 4]).take(2).toArray();
      result.should.be.eql([1, 2]);
    });
    it('early complete', async () => {
      const result = await Source.from([1, 2]).take(4).toArray();
      result.should.be.eql([1, 2]);
    });
  });
  describe('takeWhile', () => {
    it('simple', async () => {
      const result = await Source.from([1, 2, 3, 4]).takeWhile(x => x < 3).toArray();
      result.should.be.eql([1, 2]);
    });
    it('full completion', async () => {
      const result = await Source.from([1, 2]).takeWhile(x => x < 3).toArray();
      result.should.be.eql([1, 2]);
    });
  });
  describe('drop', () => {
    it('simple', async () => {
      const result = await Source.from([1, 2, 3, 4]).drop(2).toArray();
      result.should.be.eql([3, 4]);
    });
    it('with early complete', async () => {
      const result = await Source.from([1, 2]).drop(4).toArray();
      result.should.be.eql([]);
    });
    it('with cancel', async () => {
      const result = await Source.from([1, 2, 3, 4]).drop(2).take(1).toArray();
      result.should.be.eql([3]);
    });
  });
  describe('dropWhile', () => {
    it('simple', async () => {
      const result = await Source.from([1, 2, 3, 1]).dropWhile(x => x < 3).toArray();
      result.should.be.eql([3, 1]);
    });
    it('with early complete', async () => {
      const result = await Source.from([1, 2]).dropWhile(x => x < 3).toArray();
      result.should.be.eql([]);
    });
    it('with cancel', async () => {
      const result = await Source.from([1, 2, 3, 4]).dropWhile(x => x < 3).take(1).toArray();
      result.should.be.eql([3]);
    });
  });
  describe('distinct', () => {
    it('simple', async () => {
      const result = await Source.from([1, 1, 2, 3, 3, 4, 3, 5]).distinct().toArray();
      result.should.be.eql([1, 2, 3, 4, 3, 5]);
    });
    it('with cancel', async () => {
      const result = await Source.from([1, 1, 2, 3, 3, 4, 3, 5]).distinct().take(3).toArray();
      result.should.be.eql([1, 2, 3]);
    });
  });
  describe('mapAsync', () => {
    it('simple', async () => {
      const result = await Source.from([1, 2, 3]).mapAsync(x => delayed(100, x)).pipe(WithTime).toArray();
      timeChecker(result, [
        [1, 100],
        [2, 200],
        [3, 300]
      ]);
    });
    it('check order', async () => {
      const result = await Source.from([3, 1, 2]).mapAsync(x => delayed((x - 1) * 100, x)).pipe(WithTime).toArray();
      timeChecker(result, [
        [3, 200],
        [1, 200],
        [2, 300]
      ]);
    });
    it('check order with parallelism', async () => {
      const result = await Source.from([3, 1, 2]).mapAsync(x => delayed(x * 100, x), 2).pipe(WithTime).toArray();
      timeChecker(result, [
        [3, 300],
        [1, 300],
        [2, 500]
      ]);
    });
    it('check parallelism', async () => {
      const result = await Source.from([1, 2, 3, 4]).mapAsync(x => delayed(x * 100, x), 2).pipe(WithTime).toArray();
      timeChecker(result, [
        [1, 100],
        [2, 200],
        [3, 400],
        [4, 600]
      ]);
    });
    it('check parallelism - 2', async () => {
      const result = await Source.from([1, 2, 3, 4]).mapAsync(x => delayed(x * 100, x), 3).pipe(WithTime).toArray();
      timeChecker(result, [
        [1, 100],
        [2, 200],
        [3, 300],
        [4, 500]
      ]);
    });
    it('with cancel', async () => {
      const result = await Source.from([1, 2, 3, 4]).mapAsync(x => delayed(100, x), 2).take(3).pipe(WithTime).toArray();
      timeChecker(result, [
        [1, 100],
        [2, 100],
        [3, 200]
      ]);
    });
  });
  describe('mapAsyncUnordered', () => {
    it('simple', async () => {
      const result = await Source.from([1, 2, 3]).mapAsyncUnordered(x => delayed(100, x)).pipe(WithTime).toArray();
      timeChecker(result, [
        [1, 100],
        [2, 200],
        [3, 300]
      ]);
    });
    it('check order when parallelism is 1', async () => {
      const result = await Source.from([3, 1, 2]).mapAsyncUnordered(x => delayed((x - 1) * 100, x)).pipe(WithTime).toArray();
      timeChecker(result, [
        [3, 200],
        [1, 200],
        [2, 300]
      ]);
    });
    it('check unordered with parallelism > 1', async () => {
      const result = await Source.from([2, 1, 3]).mapAsyncUnordered(x => delayed(x * 100, x), 2).pipe(WithTime).toArray();
      timeChecker(result, [
        [1, 100],
        [2, 200],
        [3, 400]
      ]);
    });
    it('check parallelism', async () => {
      const result = await Source.from([4, 3, 2, 3]).mapAsyncUnordered(x => delayed(x * 100, x), 2).pipe(WithTime).toArray();
      timeChecker(result, [
        [3, 300],
        [4, 400],
        [2, 500],
        [3, 700]
      ]);
    });
    it('check parallelism - 2', async () => {
      const result = await Source.from([4, 3, 1, 1]).mapAsyncUnordered(x => delayed(x * 100, x), 3).pipe(WithTime).toArray();
      timeChecker(result, [
        [1, 100],
        [1, 200],
        [3, 300],
        [4, 400]
      ]);
    });
    it('with cancel', async () => {
      const result = await Source.from([4, 3, 1, 1]).mapAsyncUnordered(x => delayed(x * 100, x), 3).take(3).pipe(WithTime).toArray();
      timeChecker(result, [
        [1, 100],
        [1, 200],
        [3, 300]
      ]);
    });
  });
  describe('flatMapConcat', () => {
    it('simple', async () => {
      const result = await Source.from([1, 2, 3]).flatMapConcat(i => {
        return Source.from([1, 2, 3].map(j => j * i))
      }).toArray();
      result.should.be.eql([1, 2, 3, 2, 4, 6, 3, 6, 9]);
    });
    it('with cancel', async () => {
      const result = await Source.from([1, 2, 3]).flatMapConcat(i => {
        return Source.from([1, 2, 3].map(j => j * i))
      }).take(5).toArray();
      result.should.be.eql([1, 2, 3, 2, 4]);
    });
  });
  describe('flatMapMerge', () => {
    it('simple', async () => {
      const source = TimedSource
        .then(0, 10)
        .then(50, 20)
        .then(50, 30)
        .toSource();
      const result = await source.flatMapMerge(i => {
        return TimedSource
          .then(50, i + 1)
          .then(150, i + 2)
          .then(150, i + 3)
          .toSource();
      }).toArray();
      result.should.be.eql([11, 21, 31, 12, 22, 32, 13, 23, 33]);
    });
    it('with breadth limit', async () => {
      const source = TimedSource
        .then(0, 10)
        .then(50, 20)
        .then(50, 30)
        .toSource();
      const result = await source.flatMapMerge(i => {
        return TimedSource
          .then(0, i + 1)
          .then(150, i + 2)
          .then(150, i + 3)
          .toSource();
      }, 2).toArray();
      result.should.be.eql([11, 21, 12, 22, 13, 31, 23, 32, 33]);
    });
    it('with cancel', async () => {
      const source = TimedSource
        .then(0, 10)
        .then(50, 20)
        .then(50, 30)
        .then(200, 40)
        .toSource();
      const result = await source.flatMapMerge(i => {
        return TimedSource
          .then(50, i + 1)
          .then(150, i + 2)
          .then(150, i + 3)
          .toSource();
      }).take(5).toArray();
      result.should.be.eql([11, 21, 31, 12, 22]);
    });
  });

  describe('throttle', () => {
    it('simple', async () => {
      const startTime = new Date().getTime();
      const result = await Source.repeat(1).throttle(100).take(4).map(x => new Date().getTime() - startTime).toArray();
      result.should.have.length(4);
      result.forEach((time, i) => {
        checkTime(time, i * 100);
      });
    });
    it('with elements > 1', async () => {
      const startTime = new Date().getTime();
      const result = await Source.repeat(1).take(4)
        .throttle(200, { elements: 2 })
        .map(x => new Date().getTime() - startTime)
        .toArray();
      result.should.have.length(4);
      checkTime(result[0], 0);
      checkTime(result[1], 0);
      checkTime(result[2], 200);
      checkTime(result[3], 200);
    });
    it('with maximumBurst', async () => {
      const startTime = new Date().getTime();
      const result = await TimedSource.of([
        [0,   1],
        [100, 2],
        [300, 3],
        [0,   4],
        [0,   5],
        [0,   6]
      ])
        .throttle(100, { maximumBurst: 2 })
        .map(x => new Date().getTime() - startTime)
        .toArray();

      result.should.have.length(6);
      checkTime(result[0], 0);
      checkTime(result[1], 100);
      checkTime(result[2], 400);
      checkTime(result[3], 400);
      checkTime(result[4], 400);
      checkTime(result[5], 500);
    });
    it('with cost calculation', async () => {
      const startTime = new Date().getTime();
      const result = await Source.from([
        [1],
        [2, 3],
        [4, 5, 6, 7],
        [8, 9],
        [10, 11],
        [12, 13]
      ])
        .throttle(100, { cost: 3, maximumBurst: 6, costCalculation: xs => xs.length })
        .map(x => new Date().getTime() - startTime)
        .toArray();
      result.should.have.length(6);
      checkTime(result[0], 0);
      checkTime(result[1], 0);
      checkTime(result[2], 200);
      checkTime(result[3], 200);
      checkTime(result[4], 300);
      checkTime(result[5], 400);
    });
    it('with failOnPressure', async () => {
      TimedSource.of([
        [0,   1],
        [100, 2],
        [0,   3]
      ])
        .throttle(100, { failOnPressure: true })
        .toArray()
        .should.be.rejected();
    });
  });

  describe('buffer', () => {
    it('drop head', async () => {
      const result = await Source.from([1, 2, 3, 4, 5])
        .buffer(2, OverflowStrategy.DROP_HEAD)
        .throttle(50)
        .toArray();
      result.should.be.eql([1, 2, 4, 5]);
    });
    it('drop tail', async () => {
      const result = await Source.from([1, 2, 3, 4, 5])
        .buffer(2, OverflowStrategy.DROP_TAIL)
        .throttle(50)
        .toArray();
      result.should.be.eql([1, 2, 3, 5]);
    });
    it('drop new', async () => {
      const result = await Source.from([1, 2, 3, 4, 5])
        .buffer(2, OverflowStrategy.DROP_NEW)
        .throttle(50)
        .toArray();
      result.should.be.eql([1, 2, 3, 4]);
    });
    it('drop buffer', async () => {
      const result = await Source.from([1, 2, 3, 4, 5])
        .buffer(2, OverflowStrategy.DROP_BUFFER)
        .throttle(50)
        .toArray();
      result.should.be.eql([1, 2, 5]);
    });
    it('back pressure', async () => {
      const result = await Source.from([1, 2, 3, 4, 5])
        .buffer(2, OverflowStrategy.BACK_PRESSURE)
        .throttle(50)
        .toArray();
      result.should.be.eql([1, 2, 3, 4, 5]);
    });
    it('fail', async () => {
      Source.from([1, 2, 3, 4, 5])
        .buffer(2, OverflowStrategy.FAIL)
        .throttle(50)
        .toArray()
        .should.be.rejectedWith({ message: 'Buffer overflow' });
    });
  });
});

describe('Fan in stages', () => {
  describe('concat', () => {
    it('with source', async () => {
      const result = await Source.from([1, 2]).concat(Source.from([3, 4])).toArray();
      result.should.be.eql([1, 2, 3, 4]);
    });
    it('with multiple sources', async () => {
      const result = await Source.concat(
        Source.from([1, 2]),
        Source.from([3, 4]),
        Source.from([5, 6])
      ).toArray();
      result.should.be.eql([1, 2, 3, 4, 5, 6]);
    });

    it('with flow', async () => {
      const result = await Source.from([1, 2]).pipe(Flow.concat(Source.from([3, 4]))).toArray();
      result.should.be.eql([1, 2, 3, 4]);
    });

    it('with flow 2', async () => {
      const result = await Source.from([3, 4]).pipe(Flow.map(x => x - 2).concat(Source.from([3, 4]))).toArray();
      result.should.be.eql([1, 2, 3, 4]);
    });
  });

  describe('zip', () => {
    it('with source', async () => {
      const result = await Source.from([1, 2]).zip(Source.from([3, 4])).toArray();
      result.should.be.eql([[1, 3], [2, 4]]);
    });
    it('with multiple sources', async () => {
      const result = await Source.zip(
        Source.from([1, 2]),
        Source.from([3, 4]),
        Source.from([5, 6])
      ).toArray();
      result.should.be.eql([[1, 3, 5], [2, 4, 6]]);
    });

    it('with flow', async () => {
      const result = await Source.from([1, 2]).pipe(Flow.zip(Source.from([3, 4]))).toArray();
      result.should.be.eql([[1, 3], [2, 4]]);
    });

    it('with flow 2', async () => {
      const result = await Source.from([3, 4]).pipe(Flow.map(x => x - 2).zip(Source.from([3, 4]))).toArray();
      result.should.be.eql([[1, 3], [2, 4]]);
    });

    it('with different sizes', async () => {
      const result = await Source.from([1, 2, 3, 4]).zip(Source.from([3, 4])).toArray();
      result.should.be.eql([[1, 3], [2, 4]]);
    });
  });

  describe('merge', () => {
    it('simple', async () => {
      const source1 = TimedSource
        .then(0, 1)
        .then(150, 4)
        .then(100, 6)
        .toSource();
      const source2 = TimedSource
        .then(50, 2)
        .then(50, 3)
        .then(100, 5)
        .toSource();
      const result = await Source.merge(source1, source2).toArray();
      result.should.be.eql([1, 2, 3, 4, 5, 6]);
    });
  });

  describe('interleave', () => {
    it('simple', async () => {
      const result = await Source.from([1, 2, 3]).interleave(Source.from([4, 5, 6, 7, 8])).toArray();
      result.should.be.eql([1, 4, 2, 5, 3, 6, 7, 8]);
    });
    it('with segment size > 1', async () => {
      const result = await Source.from([1, 2, 3]).interleave(Source.from([4, 5, 6, 7, 8]), 2).toArray();
      result.should.be.eql([1, 2, 4, 5, 3, 6, 7, 8]);
    });
    it('with cancel', async () => {
      const result = await Source.from([1, 2, 3]).interleave(Source.from([4, 5, 6, 7, 8])).take(6).toArray();
      result.should.be.eql([1, 4, 2, 5, 3, 6]);
    });
    it('with more than 2 sources', async () => {
      const result = await Source.interleave([
        Source.from([1, 2, 3]),
        Source.from([4, 5, 6]),
        Source.from([7, 8, 9])
      ]).toArray();
      result.should.be.eql([1, 4, 7, 2, 5, 8, 3, 6, 9]);
    });
    it('with broadcast', async () => {
      const result = await Source.from([1, 2, 3]).broadcast(
        Flow.map(x => x).buffer(1, OverflowStrategy.BACK_PRESSURE),
        Flow.map(x => x * 2).buffer(1, OverflowStrategy.BACK_PRESSURE),
        Flow.map(x => x * 3).buffer(1, OverflowStrategy.BACK_PRESSURE)
      ).interleaveStreams().toArray();
      result.should.be.eql([1, 2, 3, 2, 4, 6, 3, 6, 9]);
    });
  })
});

describe('Fan out stages', () => {
  describe('broadcast', () => {
    it('with source', async () => {
      const result = await Source.from([1, 2, 3]).broadcast(
        Flow.map(x => x + 1).pipe(Sink.toArray()),
        Flow.map(x => x + 2).pipe(Sink.toArray())
      ).run();
      result.should.be.eql([[2, 3, 4], [3, 4, 5]]);
    });
    it('with early cancel', async () => {
      const result = await Source.from([1, 2, 3]).broadcast(
        Flow.take(2).pipe(Sink.toArray()),
        Flow.map(x => x + 1).pipe(Sink.toArray())
      ).run();
      result.should.be.eql([[1, 2], [2, 3, 4]]);
    });
    it('with flow', async () => {
      const sink = Flow.map(x => x + 1).broadcast(
        Flow.map(x => x + 1).pipe(Sink.toArray()),
        Flow.map(x => x + 2).pipe(Sink.toArray())
      );
      const result = await Source.from([1, 2, 3]).runWith(sink);
      result.should.be.eql([[3, 4, 5], [4, 5, 6]]);
    });
    it('with sink', async () => {
      const sink = FanOut.broadcast(
        Flow.map(x => x + 1).pipe(Sink.toArray()),
        Flow.map(x => x + 2).pipe(Sink.toArray())
      );
      const result = await Source.from([1, 2, 3]).map(x => x + 1).runWith(sink);
      result.should.be.eql([[3, 4, 5], [4, 5, 6]]);
    });
  });

  describe('balance', () => {
    const DELAY = 50;
    it('with source', async () => {
      const result = await Source.from([1, 2, 3, 4]).throttle(10).balance(
        delayedFlow(DELAY).map(x => "A" + x),
        delayedFlow(DELAY).map(x => "B" + x)
      ).merge().toArray();
      result.should.be.eql(["A1", "B2", "A3", "B4"]);
    });
    it('with early cancel', async () => {
      const result = await Source.from([1, 2, 3, 4]).throttle(10).balance(
        Flow.take(1).pipe(delayedFlow(DELAY)).map(x => "A" + x),
        delayedFlow(DELAY).map(x => "B" + x)
      ).merge().toArray();
      result.should.be.eql(["A1", "B2", "B3", "B4"]);
    });
    it('with flow', async () => {
      const sink = Flow.map(x => x + 1).balance(
        delayedFlow(DELAY).map(x => "A" + x),
        delayedFlow(DELAY).map(x => "B" + x)
      ).merge().pipe(Sink.toArray());
      const result = await Source.from([1, 2, 3, 4]).throttle(10).runWith(sink);
      result.should.be.eql(["A2", "B3", "A4", "B5"]);
    });
    it('with sink', async () => {
      const sink = FanOut.balance(
        delayedFlow(DELAY).map(x => "A" + x),
        delayedFlow(DELAY).map(x => "B" + x)
      ).merge().pipe(Sink.toArray());
      const result = await Source.from([1, 2, 3, 4]).throttle(10).runWith(sink);
      result.should.be.eql(["A1", "B2", "A3", "B4"]);
    });
  });
});

describe('routing', () => {
  it('simple', async () => {
    const result = await Source.from([1, 2, 3]).pipe(Flow.map(x => x + 1)).toArray();
    result.should.be.eql([2, 3, 4]);
  });
  it('complex', async () => {
    const result = await Source.from([1, 2, 3, 4, 5])
      .pipe(Flow.filter(x => x > 2).map(x => x - 1))
      .toArray();
    result.should.be.eql([2, 3, 4]);
  });
  it('with Sink', async () => {
    const result = await Source.from([1, 2, 3])
      .runWith(Flow.map(x => x + 1).pipe(Sink.toArray()));
    result.should.be.eql([2, 3, 4]);
  });
});

describe('Sink', () => {
  it('fold', async () => {
    const result = await Source.from([1, 2, 3]).reduce((acc, x) => x + acc, 0);
    result.should.be.eql(6);
  });
});

describe('Complex routing', () => {
  it('scatter and gather', async () => {
    const result = await Source.from([1, 2, 3])
        .broadcast(
          Flow.map(x => x + 1),
          Flow.map(x => x * 2)
        )
        .zipWith((x, y) => x + y)
        .toArray();
    result.should.be.eql([4, 7, 10]);
  });

  it('balance and concat', async () => {
    const DELAY = 50;
    const workers = [1, 2, 3].map(x => delayedFlow(DELAY * x).map(x => x + 1));

    const result = await Source.from([1, 2, 3, 4, 5, 6])
        .balance(...workers)
        .merge()
        .toArray();
    result.sort().should.be.eql([2, 3, 4, 5, 6, 7]);
  });
});

describe('push only sources', () => {
  it('simple case', async () => {
    const result = await Source.createPushOnly({
      doStart() {
        this.push(1);
        this.push(2);
        this.push(3);
        this.pushAndComplete(4);
      }
    }).map(x => x + 1).toArray();
    result.should.be.eql([2, 3, 4, 5]);
  });

  describe('from callback source', () => {
    it('simple', async () => {
      const result = await Source.fromCallback((push, done) => {
        push(1);
        push(2);
        push(3);
        done();
      }).toArray();
      result.should.be.eql([1, 2, 3]);
    });
    it('with interval', async () => {
      const result = await TimedSource.then(50, 1).then(50, 2).then(50, 3).toSource().toArray();
      result.should.be.eql([1, 2, 3]);
    });
    it('with cancel', async () => {
      const result = await TimedSource
        .then(50, 1)
        .then(50, 2)
        .then(50, 3)
        .then(50, 4)
        .then(50, 5)
        .toSource()
        .take(3)
        .toArray();
      result.should.be.eql([1, 2, 3]);
    });
  })
});

class TimedSource {

  sequence = [];

  static of(sequence) {
    return new TimedSource(sequence.map(([duration, value]) => ({ duration, value }))).toSource();
  }

  /**
   * @param {int} duration
   * @param value
   * @return {TimedSource}
   */
  static then(duration, value) {
    return new TimedSource().then(duration, value)
  }

  constructor(sequence = []) {
    this.sequence = sequence;
  }

  /**
   * @param {int} duration
   * @param value
   * @return {TimedSource}
   */
  then(duration, value) {
    this.sequence.push({ duration, value });
    return this;
  }

  /**
   * @return {Stream}
   */
  toSource() {
    return Source.fromCallback((push, done) => {
      const seq = new TimeSequence();
      this.sequence.forEach(({ duration, value }) => {
        seq.then(duration, () => push(value));
      });
      seq.run(done);
    })
  }
}

class TimeSequence {

  events = [];

  static then(duration, action) {
    return new TimeSequence().then(duration, action);
  }

  then(duration, action) {
    this.events.push({ duration, action });
    return this;
  }

  run(callback = () => {}) {
    this.events.reverse().reduce((acc, event) => () => {
      setTimeout(() => {
        event.action();
        acc();
      }, event.duration)
    }, callback)();
  }
}

function delayed(duration, result) {
  return new Promise(resolve => setTimeout(() => resolve(result), duration));
}

function delayedFlow(duration) {
  return Flow.mapAsync(x => delayed(duration, x));
}

function checkTime(time, expectedTime) {
  time.should.be.above(expectedTime - 30);
  time.should.be.below(expectedTime + 30);
}
