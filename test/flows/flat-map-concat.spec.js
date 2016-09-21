"use strict";

import 'babel-polyfill';
import { Source } from '../../src/index';

describe('flatMapConcat', () => {
  it('simple', async() => {
    const result = await Source.from([1, 2, 3]).flatMapConcat(i => {
      return Source.from([1, 2, 3].map(j => j * i))
    }).toArray();
    expect(result).toEqual([1, 2, 3, 2, 4, 6, 3, 6, 9]);
  });
  it('with cancel', async() => {
    const result = await Source.from([1, 2, 3]).flatMapConcat(i => {
      return Source.from([1, 2, 3].map(j => j * i))
    }).take(5).toArray();
    expect(result).toEqual([1, 2, 3, 2, 4]);
  });
});
