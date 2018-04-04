import 'babel-polyfill'
import 'should'
import { fromArray } from '../../src/index'

describe('map', () => {
  it('simple', async() => {
    const result = await fromArray([1, 2, 3]).map(x => x + 1).runToArray();
    result.should.be.eql([2, 3, 4]);
  });
});
