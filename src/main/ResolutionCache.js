/**
 * Cache for any Data Sources that rely on resolution. For example,
 * this is used by coverage to keep track of the difference resolutions
 * that have been fetched already.
 *
 * @flow
 */
'use strict';

import _ from 'underscore';
import Interval from './Interval';
import ContigInterval from './ContigInterval';


class ResolutionCache<T: Object> {
  coveredRanges: ResolutionCacheKey[];
  cache: {[resolution: number]: {[key: string]: T}};
  // used to filter out elements in the cache based on resolution.
  filterFunction: Function; // should take form (range: ContigInterval<string>, T) => boolean;
  keyFunction: Function;    // should take form (d: T) => string;

  constructor(filterFunction: Function, keyFunction: Function) {
    this.coveredRanges = [];
    this.cache = {};
    this.filterFunction = filterFunction;
    this.keyFunction = keyFunction;
  }

  // gets data from cache at the Resolution defined by the interval
  get(range: ContigInterval<string>, resolution: ?number): T[] {
    if (!range) return [];
    var res = {};
    if (!resolution) {
        res = _.filter(this.cache[1], d => this.filterFunction(range, d));
    } else {
        res = _.filter(this.cache[resolution], d => this.filterFunction(range, d));
    }

    return res;
  }

  /**
   * Find the disjoint subintervals not covered by any interval in the list with the same resolution.
   *
   * If comp = interval.complementIntervals(ranges), then this guarantees that:
   * - comp union ranges = interval
   * - a int b = 0 forall a \in comp, b in ranges
   *
   * (The input ranges need not be disjoint.)
   */
  complementInterval(range: ContigInterval<string>, resolution: ?number): ContigInterval<string>[] {
    if (!resolution) {
      resolution = ResolutionCache.getResolution(range.interval);
    }

    // filter ranges by correct resolution
    var resolutionIntervals = _.filter(this.coveredRanges, r => r.resolution == resolution)
                                .map(r => r.contigInterval);

    return range.complementIntervals(resolutionIntervals);

  }

  // puts new ranges into list of ranges covered by cache
  coverRange(range: ContigInterval<string>, resolution: ?number) {
    if (!resolution) {
      resolution = ResolutionCache.getResolution(range.interval);
    }
    var resolvedRange = new ResolutionCacheKey(range, resolution);
    this.coveredRanges.push(resolvedRange);
    // coalesce new contigIntervals
    this.coveredRanges = ResolutionCacheKey.coalesce(this.coveredRanges);
  }

  // puts data in cache
  put(value: T, resolution: ?number) {
    if (!resolution) {
      resolution = 1;
    }
    var key = this.keyFunction(value);

    // initialize cache resolution, if not already initialized
    if (!this.cache[resolution]) this.cache[resolution] = {};

    if (!this.cache[resolution][key]) {
      this.cache[resolution][key] = value;
    }
  }

  // checks weather cache contains data for the
  // specified interval and its corresponding resolution
  coversRange(range: ContigInterval<string>,
              resolution: ?number): boolean {
    if (!resolution) {
      resolution = ResolutionCache.getResolution(range.interval);
    }

    // filter ranges by correct resolution
    var resolutionRanges = _.filter(this.coveredRanges, r => r.resolution == resolution);
    if (range.isCoveredBy(resolutionRanges.map(r => r.contigInterval))) {
      return true;
    } else return false;
  }

  // clears out all content in cache
  clear() {
    this.coveredRanges = [];
    this.cache = {};
  }

  /**
   * Gets the Base Pairs per bin given a specified interval
   * This is used to bin coverage when viewing large regions
   *
   * Values were chosen based on a 1000 pixel screen (a conservative estimate):
   * - For regions < 10,000 base pairs, no binning is performed (return 1)
   * - For regions >= 10,000 and < 100,000, bin 10 bp into 1 (return 10)
   * - For regions >= 100,000 and < 1,000,000, bin 100 bp into 1 (return 100)
   * - For regions >= 1,000,000, bin 1000 bp into 1 (return 1000)
   */
  static getResolution(range: Interval): number {
    // subtract one because length() adds one
    var rangeLength = range.length() - 1;
    if (rangeLength < 10000)
      return 1;
    else if (rangeLength >= 10000 && rangeLength < 100000 )
      return 10;
    else if (rangeLength >= 100000 && rangeLength < 1000000 )
      return 100;
    else
      return 1000;
  }
}

/**
 * Class holds a ContigInterval and resolution that designates whether
 * a contig interval represents data at a certain resolution. The
 * parameters for choosing a resolution based on interval length are set
 * in getResolution.
 *
 */
class ResolutionCacheKey {
  contigInterval: ContigInterval<string>;
  resolution: number;

  constructor(contigInterval: ContigInterval<string>, resolution: number) {
    this.contigInterval = contigInterval;
    this.resolution = resolution;
  }

  clone(): ResolutionCacheKey {
    return new ResolutionCacheKey(this.contigInterval.clone(), this.resolution);
  }

  // Sort an array of intervals & coalesce adjacent/overlapping ranges.
  // NB: this may re-order the intervals parameter
  static coalesce(intervals: ResolutionCacheKey[]): ResolutionCacheKey[] {
    intervals.sort(ResolutionCacheKey.compare);

    var rs = [];
    intervals.forEach(r => {
      if (rs.length === 0) {
        rs.push(r);
        return;
      }

      var lastR: ResolutionCacheKey = rs[rs.length - 1];
      if ((r.contigInterval.intersects(lastR.contigInterval) ||
          r.contigInterval.isAdjacentTo(lastR.contigInterval)) &&
          r.resolution == lastR.resolution) {
        lastR = rs[rs.length - 1] = lastR.clone();
        lastR.contigInterval.interval.stop =
          Math.max(r.contigInterval.interval.stop, lastR.contigInterval.interval.stop);
      } else {
        rs.push(r);
      }
    });

    return rs;
  }

  // Comparator for use with Array.prototype.sort
  static compare(a: ResolutionCacheKey, b: ResolutionCacheKey): number {
    if (a.contigInterval.contig > b.contigInterval.contig) {
      return -1;
    } else if (a.contigInterval.contig < b.contigInterval.contig) {
      return +1;
    } else {
      return a.contigInterval.start() - b.contigInterval.start();
    }
  }

}

module.exports = {
  ResolutionCache
};
