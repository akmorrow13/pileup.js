/**
 * A data source which implements the GA4GH protocol.
 * Currently only used to load alignments.
 * @flow
 */
'use strict';

import type {Alignment, AlignmentDataSource} from '../Alignment';

import _ from 'underscore';
import {Events} from 'backbone';
import Q from 'q';

import ContigInterval from '../ContigInterval';
import GA4GHAlignment from '../GA4GHAlignment';

var ALIGNMENTS_PER_REQUEST = 200;  // TODO: explain this choice.
var MAX_BASE_PAIRS_TO_FETCH = 40000;
var ZERO_BASED = false;


// Genome ranges are rounded to multiples of this for fetching.
// This reduces network activity while fetching.
// TODO: tune this value -- setting it close to the read length will result in
// lots of reads being fetched twice, but setting it too large will result in
// bulkier requests.
var BASE_PAIRS_PER_FETCH = 1000;

export type GA4GHSpec = {
  endpoint: string;
  readGroupId: string;
  // HACK for demo. If set, will always use this reference id.
  // This is for fetching referenceIds specified in GA4GH reference
  // server
  forcedReferenceId: ?string;
};

function create(spec: GA4GHSpec): AlignmentDataSource {
  var url = spec.endpoint;

  var reads: {[key:string]: Alignment} = {};

  // Ranges for which we have complete information -- no need to hit network.
  var coveredRanges: ContigInterval<string>[] = [];

  function addReadsFromResponse(response: Object) {
    if (response.alignments === undefined) {
      return;
    }
    response.alignments.forEach(alignment => {
      // optimization: don't bother constructing a GA4GHAlignment unless it's new.
      var key = GA4GHAlignment.keyFromGA4GHResponse(alignment);
      if (key in reads) return;
      try {
        var ga4ghAlignment = new GA4GHAlignment(alignment);
        reads[key] = ga4ghAlignment;
      } catch (e) {
        // sometimes, data from the server does not have an alignment.
        // this will catch an exception in the GA4GHAlignment constructor
      }
    });
  }

  function rangeChanged(newRange: GenomeRange) {
    var interval = new ContigInterval(newRange.contig, newRange.start, newRange.stop);
    if (interval.isCoveredBy(coveredRanges)) return;

    interval = interval.round(BASE_PAIRS_PER_FETCH, ZERO_BASED);

    // if range is too large, return immediately
    if (interval.length() > MAX_BASE_PAIRS_TO_FETCH) {
      return;
    } else {
      // select only intervals not yet loaded into coveredRangesß
      var intervals = interval.complementIntervals(coveredRanges);

      // We "cover" the interval immediately (before the reads have arrived) to
      // prevent duplicate network requests.
      coveredRanges.push(interval);
      coveredRanges = ContigInterval.coalesce(coveredRanges);

      intervals.forEach(i => {
        fetchAlignmentsForInterval(i, null, 1 /* first request */);
      });
    }
  }

  function notifyFailure(message: string) {
    o.trigger('networkfailure', message);
    o.trigger('networkdone');
    console.warn(message);
  }

  function fetchAlignmentsForInterval(range: ContigInterval<string>,
                                      pageToken: ?string,
                                      numRequests: number) {
    var startTimeMilliseconds = new Date().getTime();

    var span = range.length();
    if (span > MAX_BASE_PAIRS_TO_FETCH) {
      console.info(`Time to get alignments from cache:", ${new Date().getTime() - startTimeMilliseconds}`);
      return Q.when();  // empty promise
    }
    var xhr = new XMLHttpRequest();

    var endpoint = `${url}/${spec.readGroupId}/${range.contig}?start=${range.start()}&end=${range.stop()}`;

    xhr.open('GET', endpoint);
    xhr.responseType = 'json';
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.addEventListener('load', function(e) {
      var response = this.response;
      if (this.status != 200) {
        notifyFailure(this.status + ' ' + this.statusText + ' ' + JSON.stringify(response));
      } else {
        if (response.errorCode) {
          notifyFailure('Error from GA4GH endpoint: ' + JSON.stringify(response));
        } else {
          addReadsFromResponse(response);
          o.trigger('newdata', range);  // display data as it comes in.
          if (response.nextPageToken) {
            fetchAlignmentsForInterval(range, response.nextPageToken, numRequests + 1);
          } else {
            console.info(`Fetched alignments from server:", ${new Date().getTime() - startTimeMilliseconds}`);
            o.trigger('networkdone');
          }
        }
      }
    });
    xhr.addEventListener('error', function(e) {
      notifyFailure('Request failed with status: ' + this.status);
    });

    o.trigger('networkprogress', {numRequests});
    // hack for DEMO. force GA4GH reference ID
    var contig = range.contig;
    if (spec.forcedReferenceId !== null)
    {
      contig = spec.forcedReferenceId;
    }
    xhr.send(JSON.stringify({
      pageToken: pageToken,
      pageSize: ALIGNMENTS_PER_REQUEST,
      readGroupIds: [spec.readGroupId],
      referenceId: contig,
      start: range.start(),
      end: range.stop()
    }));
  }

  function getAlignmentsInRange(range: ContigInterval<string>): Alignment[] {
    if (!range) return [];

    range = new ContigInterval(range.contig, range.start(), range.stop());

    return _.filter(reads, read => read.intersects(range));
  }

  var o = {
    rangeChanged,
    getAlignmentsInRange,

    // These are here to make Flow happy.
    on: () => {},
    once: () => {},
    off: () => {},
    trigger: () => {}
  };
  _.extend(o, Events);  // Make this an event emitter
  return o;
}

module.exports = {
  create,
  MAX_BASE_PAIRS_TO_FETCH: MAX_BASE_PAIRS_TO_FETCH
};
