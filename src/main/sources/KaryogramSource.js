/**
 * A data source which reads genes from a GA4GH Feature protocol.
 * @flow
 */
'use strict';

import type {DataSource} from '../sources/DataSource';
import Chromosome from '../data/chromosome';

import _ from 'underscore';
import {Events} from 'backbone';

import ContigInterval from '../ContigInterval';
import type {GenomeRange} from '../types';

export type EndpointSpec = {
  endpoint: string;
};


function create(spec: EndpointSpec): DataSource<Chromosome> {
  var url = spec.endpoint;

  var chromosomes: {[key:string]: Chromosome} = {};

  // Ranges for which we have complete information -- no need to hit network.
  var coveredRanges: ContigInterval<string>[] = [];

  function addFeaturesFromResponse(response: Object) {
    if (response === undefined) {
      return;
    }

    response.forEach(chromosome => {
      var key = chromosome.name;
      if (key in chromosomes) return;
      chromosomes[key] = chromosome;
    });
  }

  function rangeChanged(newRange: GenomeRange) {
    var interval = new ContigInterval(newRange.contig, newRange.start, newRange.stop);
    if (interval.isCoveredBy(coveredRanges)) return;

    // select only intervals not yet loaded into coveredRangesß
    var intervals = interval.complementIntervals(coveredRanges);

    // We "cover" the interval immediately (before the reads have arrived) to
    // prevent duplicate network requests.
    coveredRanges.push(interval);
    coveredRanges = ContigInterval.coalesce(coveredRanges);

    intervals.forEach(i => {
      fetchFeaturesForInterval(i, null, 1);
    });
  }

  function notifyFailure(message: string) {
    o.trigger('networkfailure', message);
    o.trigger('networkdone');
    console.warn(message);
  }

  function fetchFeaturesForInterval(range: ContigInterval<string>,
                                      pageToken: ?string,
                                      numRequests: number) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.responseType = 'json';
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.addEventListener('load', function(e: any) {
      var response = this.response;
      if (this.status >= 400) {
        notifyFailure(this.status + ' ' + this.statusText + ' ' + JSON.stringify(response));
      } else {
        if (response.errorCode) {
          notifyFailure('Error from Karyogram json endpoint: ' + JSON.stringify(response));
        } else {
          addFeaturesFromResponse(response);
          o.trigger('newdata', range);  // display data as it comes in.
          if (response.nextPageToken) {
            fetchFeaturesForInterval(range, response.nextPageToken, numRequests + 1);
          } else {
            o.trigger('networkdone');
          }
        }
      }
    });
    xhr.addEventListener('error', function(e: any) {
      notifyFailure('Request failed with status: ' + this.status);
    });

    o.trigger('networkprogress', {numRequests});
    xhr.send(JSON.stringify({
      referenceName: range.contig,
      start: range.start(),
      end: range.stop()
    }));
  }

  function getFeaturesInRange(range: ContigInterval<string>): Chromosome[] {
    if (!range) return [];
    return _.filter(chromosomes, chromosome => chromosome.name == range.contig);
  }

  var o = {
    rangeChanged,
    getFeaturesInRange,

    // These are here to make Flow happy.
    on: () => {},
    once: () => {},
    off: () => {},
    trigger: (status: string, param: any) => {}
  };
  _.extend(o, Events);  // Make this an event emitter
  return o;
}

module.exports = {
  create
};
