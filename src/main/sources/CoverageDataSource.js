/**
 * Remote Endpoint for coverage.
 *
 * CoverageDataSource is purely for data parsing and fetching.
 * Coverage for CoverageDataSource can be calculated from any source,
 * including, but not limited to, Alignment Records,
 * variants or features.
 *
 * @flow
 */
'use strict';

import Q from 'q';
import _ from 'underscore';
import {Events} from 'backbone';
import {ResolutionCache} from '../ResolutionCache';
import ContigInterval from '../ContigInterval';
import {RemoteRequest} from '../RemoteRequest';

export type CoverageDataSource = {
  maxCoverage: (range: ContigInterval<string>) => number;
  rangeChanged: (newRange: GenomeRange) => void;
  getCoverageInRange: (range: ContigInterval<string>) => PositionCount[];
  on: (event: string, handler: Function) => void;
  off: (event: string) => void;
  trigger: (event: string, ...args:any) => void;
};

var BASE_PAIRS_PER_FETCH = 5000;

export type PositionCount = {
  contig: string;
  start: number;
  end: number;
  count: number;
}

function keyFunction(p: PositionCount): string {
  return `${p.contig}:${p.start}-${p.end}`;
}

function filterFunction(range: ContigInterval<string>, p: PositionCount): boolean {
  return range.intersects(new ContigInterval(p.contig, p.start, p.end));
}

function createFromCoverageUrl(remoteSource: RemoteRequest): CoverageDataSource {
  var cache: ResolutionCache<PositionCount> =
    new ResolutionCache(filterFunction, keyFunction);

  function notifyFailure(message: string) {
    o.trigger('networkfailure', message);
    o.trigger('networkdone');
    console.warn(message);
  }

  function maxCoverage(range: ContigInterval<string>, resolution: ?number): number {
    var positions: number[] = cache.get(range, resolution).map(r => r.count);
    var maxCoverage = Math.max.apply(Math, positions);
    return maxCoverage;
  }

  function fetch(range: GenomeRange) {
    var startTimeMilliseconds = new Date().getTime();
    var interval = new ContigInterval(range.contig, range.start, range.stop);

    // Check if this interval is already in the cache.
    if (cache.coversRange(interval)) {
      console.info(`Time to get coverage from cache:", ${new Date().getTime() - startTimeMilliseconds}`);
      return Q.when();
    }

    // modify endpoint to calculate coverage using binning
    var resolution = ResolutionCache.getResolution(interval.interval);
    var endpointModifier = `binning=${resolution}`;

    // get all smaller intervals not yet covered in cache
    var newRanges = cache.complementInterval(interval, resolution);

    // Cover the range immediately to prevent duplicate fetches.
    cache.coverRange(interval);
    o.trigger('networkprogress', newRanges.length);
    return Q.all(newRanges.map(range =>
      remoteSource.getFeaturesInRange(range, endpointModifier).then(json => {
        var response = json.response;
        if (json.status >= 400) {
          notifyFailure(json.status + ' ' + json.statusText + ' ' + JSON.stringify(response));
        } else {
          if (response.errorCode) {
            notifyFailure('Error from CoverageDataSource: ' + JSON.stringify(response));
          } else {
            // add new data to cache
            response.forEach(p => cache.put({
                                              "contig": range.contig,
                                              "start": p.start,
                                              "end": p.end,
                                              "count": p.count
                                             }, resolution));
            o.trigger('newdata', interval);
          }
        }
        console.info(`Fetched coverage from server:", ${new Date().getTime() - startTimeMilliseconds}`);
        o.trigger('networkdone');
    })));
  }

  function getCoverageInRange(range: ContigInterval<string>,
            resolution: ?number): PositionCount[] {
    if (!range) return [];
    var data = cache.get(range, resolution);
    var sorted = data.sort((a, b) => a.start - b.start);
    return sorted;
  }

  var o = {
    maxCoverage,
    rangeChanged: function(newRange: GenomeRange) {
      fetch(newRange).done();
    },
    getCoverageInRange,

    // These are here to make Flow happy.
    on: () => {},
    off: () => {},
    trigger: () => {}
  };
  _.extend(o, Events);

  return o;
}

function create(data: {url?:string}): CoverageDataSource {
  if (!data.url) {
    throw new Error(`Missing URL from track: ${JSON.stringify(data)}`);
  }

  var endpoint = new RemoteRequest(data.url, BASE_PAIRS_PER_FETCH);
  return createFromCoverageUrl(endpoint);
}


module.exports = {
  create,
  createFromCoverageUrl
};
