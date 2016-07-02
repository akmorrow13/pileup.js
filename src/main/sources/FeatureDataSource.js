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

import ContigInterval from '../ContigInterval';
import RemoteRequest from '../RemoteRequest';
import FeatureEndpoint from '../data/FeatureEndpoint';
import type {Feature} from '../data/FeatureEndPoint';

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
var BASE_PAIRS_PER_FETCH = 1000;

function expandRange(range: ContigInterval<string>) {
  var roundDown = x => x - x % BASE_PAIRS_PER_FETCH;
  var newStart = Math.max(1, roundDown(range.start())),
      newStop = roundDown(range.stop() + BASE_PAIRS_PER_FETCH - 1);

  return new ContigInterval(range.contig, newStart, newStop);
}

function featureKey(f: Feature): string {
  return `${f.contig}:${f.start}`;
}


function createFromFeatureUrl(remoteSource: FeatureEndpoint): FeatureDataSource {
  var features: {[key: string]: Feature} = {};

  // Ranges for which we have complete information -- no need to hit network.
  var coveredRanges: ContigInterval<string>[] = [];

  function addFeature(f: Feature) {
    var key = featureKey(f);
    if (!features[key]) {
      features[key] = f;
    }
  }

  function fetch(range: GenomeRange) {
    var interval = new ContigInterval(range.contig, range.start, range.stop);

    // Check if this interval is already in the cache.
    if (interval.isCoveredBy(coveredRanges)) {
      return Q.when();
    }

    interval = expandRange(interval);

    // "Cover" the range immediately to prevent duplicate fetches.
    coveredRanges.push(interval);
    coveredRanges = ContigInterval.coalesce(coveredRanges);
    return remoteSource.getFeaturesInRange(interval).then(features => {
      features.forEach(feature => addFeature(feature));
      o.trigger('newdata', interval);
    });
  }

  function getFeaturesInRange(range: ContigInterval<string>): Feature[] {
    if (!range) return [];  // XXX why would this happen?
    var x = _.filter(features, f => range.chrContainsLocus(f.contig, f.start));
    return x;
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

function create(data: {url?:string, key?:string}): FeatureDataSource {
  var {url, key} = data;
  if (!url) {
    throw new Error(`Missing URL from track: ${JSON.stringify(data)}`);
  }
  // verify key was correctly set
  if (!key) {
    throw new Error(`Missing key from track: ${JSON.stringify(data)}`);
  }
  var request = new RemoteRequest(url, key);
  var endpoint = new FeatureEndpoint(request);
  return createFromFeatureUrl(endpoint);
}


module.exports = {
  create,
  createFromFeatureUrl
};
