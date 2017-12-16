/**
 * The "glue" between TwoBit.js and GenomeTrack.js.
 *
 * GenomeTrack is pure view code -- it renders data which is already in-memory
 * in the browser.
 *
 * TwoBit is purely for data parsing and fetching. It only knows how to return
 * promises for various genome features.
 *
 * This code acts as a bridge between the two. It maintains a local version of
 * the data, fetching remote data and informing the view when it becomes
 * available.
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

export type Feature = {
  id: string;
  featureType: string;
  contig: string;
  start: number;
  stop: number;
  score: number;
}

// Flow type for export.
export type FeatureDataSource = {
  rangeChanged: (newRange: GenomeRange) => void;
  getFeaturesInRange: (range: ContigInterval<string>) => Feature[];
  on: (event: string, handler: Function) => void;
  off: (event: string) => void;
  trigger: (event: string, ...args:any) => void;
}


// Requests for 2bit ranges are expanded to begin & end at multiples of this
// constant. Doing this means that panning typically won't require
// additional network requests.
var BASE_PAIRS_PER_FETCH = 10000;

function expandRange(range: ContigInterval<string>): ContigInterval<string> {
  var roundDown = x => x - x % BASE_PAIRS_PER_FETCH;
  var newStart = Math.max(0, roundDown(range.start())),
      newStop = roundDown(range.stop() + BASE_PAIRS_PER_FETCH - 1);

  return new ContigInterval(range.contig, newStart, newStop);
}

function keyFunction(f: Feature): string {
  return `${f.contig}:${f.start}`;
}

function filterFunction(range: ContigInterval<string>, f: Feature): boolean {
  return range.intersects(new ContigInterval(f.contig, f.start, f.stop));
}


function createFromFeatureUrl(remoteSource: RemoteRequest): FeatureDataSource {
  var cache: ResolutionCache<Feature> =
    new ResolutionCache(filterFunction, keyFunction);

  function fetch(range: GenomeRange) {
    var startTimeMilliseconds = new Date().getTime();
    var interval = new ContigInterval(range.contig, range.start, range.stop);

    // Check if this interval is already in the cache.
    if (cache.coversRange(interval)) {
      console.info(`Time to get features from cache:", ${new Date().getTime() - startTimeMilliseconds}`);
      return Q.when();
    }

    // modify endpoint to calculate coverage using binning
    var resolution = ResolutionCache.getResolution(interval.interval);
    var endpointModifier = `binning=${resolution}`;

    interval = expandRange(interval);
    var newRanges = cache.complementInterval(interval, resolution);

    // "Cover" the range immediately to prevent duplicate fetches.
    // Because interval is expanded, make sure to use original resolution
    cache.coverRange(interval, resolution);

    o.trigger('networkprogress', newRanges.length);
    return Q.all(newRanges.map(range =>
        remoteSource.getFeaturesInRange(range, endpointModifier)
          .then(e => {
            var features = e.response;
            if (features !== null) {
              features.forEach(feature => cache.put(feature, resolution));
            }
            console.info(`Fetched features from server:", ${new Date().getTime() - startTimeMilliseconds}`);
            o.trigger('networkdone');
            o.trigger('newdata', range);
      })));
  }

  function getFeaturesInRange(range: ContigInterval<string>, resolution: ?number): Feature[] {
    if (!range) return [];  // XXX why would this happen?
    var data = cache.get(range, resolution);
    var sorted = data.sort((a, b) => a.start - b.start);
    return sorted;
  }

  var o = {
    rangeChanged: function(newRange: GenomeRange) {
      fetch(newRange).done();
    },
    getFeaturesInRange,

    // These are here to make Flow happy.
    on: () => {},
    off: () => {},
    trigger: () => {}
  };
  _.extend(o, Events);  // Make this an event emitter

  return o;
}

function create(data: {url?:string}): FeatureDataSource {
  if (!data.url) {
    throw new Error(`Missing URL from track: ${JSON.stringify(data)}`);
  }
  var endpoint = new RemoteRequest(data.url);
  return createFromFeatureUrl(endpoint);
}


module.exports = {
  create,
  createFromFeatureUrl
};
