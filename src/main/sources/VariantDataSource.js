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

import type {Variant} from '../data/vcf';

import Q from 'q';
import _ from 'underscore';
import {Events} from 'backbone';
import {ResolutionCache} from '../ResolutionCache';

import ContigInterval from '../ContigInterval';
import type {VcfDataSource} from './VcfDataSource';
import {RemoteRequest} from '../RemoteRequest';
import VariantEndpoint from '../data/VariantEndpoint';

var BASE_PAIRS_PER_FETCH = 10000;

function expandRange(range: ContigInterval<string>) {
  var roundDown = x => x - x % BASE_PAIRS_PER_FETCH;
  var newStart = Math.max(1, roundDown(range.start())),
      newStop = roundDown(range.stop() + BASE_PAIRS_PER_FETCH - 1);

  return new ContigInterval(range.contig, newStart, newStop);
}

function keyFunction(v: Variant): string {
  return `${v.contig}:${v.position}`;
}

function filterFunction(range: ContigInterval<string>, v: Variant): boolean {
  return range.chrContainsLocus(v.contig, v.position);
}

function createFromVariantUrl(remoteSource: RemoteRequest): VcfDataSource {
  var cache: ResolutionCache<Variant> =
    new ResolutionCache(filterFunction, keyFunction);

  function fetch(range: GenomeRange) {
    var interval = new ContigInterval(range.contig, range.start, range.stop);

    // Check if this interval is already in the cache.
    if (cache.coversRange(interval)) {
      return Q.when();
    }

    // modify endpoint to calculate coverage using binning
    var resolution = ResolutionCache.getResolution(interval.interval);
    var endpointModifier = `binning=${resolution}`;


    interval = expandRange(interval);

    // get all smaller intervals not yet covered in cache
    var newRanges = cache.complementInterval(interval, resolution);

    // "Cover" the range immediately to prevent duplicate fetches.
    // Because interval is expanded, make sure to use original resolution
    cache.coverRange(interval, resolution);
    o.trigger('networkprogress', newRanges.length);
    return Q.all(newRanges.map(range =>
      remoteSource.getFeaturesInRange(range, endpointModifier).then(e => {
      var variants = e.response;
      if (variants !== null)
        variants.forEach(v => cache.put(v, resolution));
      o.trigger('networkdone');
      o.trigger('newdata', interval);
    })));
  }

  function getFeaturesInRange(range: ContigInterval<string>, resolution: ?number): Variant[] {
    if (!range) return [];  // XXX why would this happen?
    var data = cache.get(range, resolution);
    var sorted = data.sort((a, b) => a.position - b.position);
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

function create(data: {url?:string}): VcfDataSource {
  if (!data.url) {
    throw new Error(`Missing URL from track: ${JSON.stringify(data)}`);
  }
  var endpoint = new RemoteRequest(data.url, BASE_PAIRS_PER_FETCH);
  return createFromVariantUrl(endpoint);
}


module.exports = {
  create,
  createFromVariantUrl
};
