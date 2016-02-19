import 'babel-polyfill';
import should from 'should';

import {
  Source,
  Sink,
  Flow
} from '../lib/index';

describe('Source', () => {
  it('#from(list)', async () => {
    const result = await Source.from([1, 2, 3]).toList();
    result.should.be.eql([1, 2, 3]);
  });
  it('#forEach', async () => {
    const xs = [];
    await Source.from([1, 2, 3]).forEach(x => xs.push(x));
    xs.should.be.eql([1, 2, 3]);
  });
  it('#to', async () => {
    const result = await Source.from([1, 2, 3]).to(Sink.toList()).run();
    result.should.be.eql([1, 2, 3]);
  });
});

describe('Route', () => {
  it('#map', async () => {
    const result = await Source.from([1, 2, 3]).map(x => x + 1).toList();
    result.should.be.eql([2, 3, 4]);
  });
  it('#filter', async () => {
    const result = await Source.from([1, 2, 3, 4, 5]).filter(x => x > 2).toList();
    result.should.be.eql([3, 4, 5]);
  });
  it('#scan', async () => {
    const result = await Source.from([1, 1, 1]).scan((acc, x) => acc + x, 0).toList();
    result.should.be.eql([1, 2, 3]);
  });
  it('#mapConcat', async () => {
    const result = await Source.from([1, 2, 3]).mapConcat(x => [x, x]).toList();
    result.should.be.eql([1, 1, 2, 2, 3, 3]);
  });
});

describe('Flow', () => {
  it('simple', async () => {
    const result = await Source.from([1, 2, 3]).via(Flow.map(x => x + 1)).toList();
    result.should.be.eql([2, 3, 4]);
  });
  it('complex', async () => {
    const result = await Source.from([1, 2, 3, 4, 5])
      .via(Flow.filter(x => x > 2).map(x => x - 1))
      .toList();
    result.should.be.eql([2, 3, 4]);
  });
  it('with Sink', async () => {
    const result = await Source.from([1, 2, 3])
      .runWith(Flow.map(x => x + 1).to(Sink.toList()));
    result.should.be.eql([2, 3, 4]);
  });
});

describe('Sink', () => {
  it('#fold', async () => {
    const result = await Source.from([1, 2, 3]).reduce((acc, x) => x + acc, 0);
    result.should.be.eql(6);
  });
});
