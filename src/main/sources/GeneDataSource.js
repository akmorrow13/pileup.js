/* @flow */
'use strict';

import type {Strand} from '../Alignment';

import _ from 'underscore';
import Q from 'q';
import {Events} from 'backbone';

import ContigInterval from '../ContigInterval';
import Interval from '../Interval';
import type { BigBedSource, Gene } from './BigBedDataSource';
import RemoteRequest from '../RemoteRequest';
import GeneEndpoint from '../data/GeneEndpoint';

var BASE_PAIRS_PER_FETCH = 5000;

function expandRange(range: ContigInterval<string>) {
  var roundDown = x => x - x % BASE_PAIRS_PER_FETCH;
  var newStart = Math.max(1, roundDown(range.start())),
      newStop = roundDown(range.stop() + BASE_PAIRS_PER_FETCH - 1);

  return new ContigInterval(range.contig, newStart, newStop);
}

function createFromGeneUrl(remoteSource: GeneEndpoint): BigBedSource {
  // Collection of genes that have already been loaded.
  var genes: {[key:string]: Gene} = {};

  // Ranges for which we have complete information -- no need to hit network.
  var coveredRanges: Array<ContigInterval<string>> = [];

  function addGene(newGene) {
    if (!genes[newGene.id]) {
      genes[newGene.id] = newGene;
    }
  }

  function getGenesInRange(range: ContigInterval<string>): Gene[] {
    if (!range) return [];
    var results = [];
    _.each(genes, gene => {
      if (range.intersects(gene.position)) {
        results.push(gene);
      }
    });
    return results;
  }

  function fetch(range: GenomeRange) {
    var interval = new ContigInterval(range.contig, range.start, range.stop);

    // Check if this interval is already in the cache.
    if (interval.isCoveredBy(coveredRanges)) {
      return Q.when();
    }

    interval = expandRange(interval);

    coveredRanges.push(interval);
    coveredRanges = ContigInterval.coalesce(coveredRanges);

    return remoteSource.getGenesInRange(interval).then(genes => {
        genes.forEach(gene => addGene(gene));
        //we have new data from our internal block range
        o.trigger('newdata', interval);
    });
  }

  var o = {
    rangeChanged: function(newRange: GenomeRange) {
      fetch(newRange).done();
    },
    getGenesInRange,

    // These are here to make Flow happy.
    on: () => {},
    off: () => {},
    trigger: () => {}
  };
  _.extend(o, Events);  // Make this an event emitter

  return o;
}

function create(data: {url?:string, key?:string}): BigBedSource {
  var url = data.url;
  var key = data.key;
  if (!url) {
    throw new Error(`Missing URL from track: ${JSON.stringify(data)}`);
  }
  // verify key was correctly set
  if (!key) {
    throw new Error(`Missing key from track: ${JSON.stringify(data)}`);
  }

  var request = new RemoteRequest(url, key);
  var endpoint = new GeneEndpoint(request);
  return createFromGeneUrl(endpoint);
}

module.exports = {
  create,
  createFromGeneUrl
};
