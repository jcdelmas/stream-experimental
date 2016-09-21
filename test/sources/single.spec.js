"use strict";

import 'babel-polyfill';
import { Source } from '../../src/index';

describe('single', () => {
  it('simple', async() => {
    const result = await Source.single(5).toArray();
    expect(result).toEqual([5]);
  });
});
