
import 'babel-polyfill';
import 'should';
import { filter, fromArray, map, toArray } from '../../src'

describe('routing', () => {
  it('simple', async() => {
    const result = await fromArray([1, 2, 3]).pipe(map(x => x + 1)).runToArray();
    result.should.be.eql([2, 3, 4]);
  });
  it('complex', async() => {
    const result = await fromArray([1, 2, 3, 4, 5])
      .pipe(filter(x => x > 2).map(x => x - 1))
      .runToArray();
    result.should.be.eql([2, 3, 4]);
  });
  it('with Sink', async() => {
    const result = await fromArray([1, 2, 3])
      .runWith(map(x => x + 1).to(toArray().key('result'))).result;
    result.should.be.eql([2, 3, 4]);
  });
});
