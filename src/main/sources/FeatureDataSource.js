/* @flow */
'use strict';

import type {Gene, BigBedSource} from './BigBedDataSource';
import ContigInterval from '../ContigInterval';
// import BigBed from '../data/BigBed';   
import Interval from '../Interval';
import Q from 'q';
import _ from 'underscore';
import {Events} from 'backbone';

var FEATURES_PER_REQUEST = 200; //TODO Arbitrary number for now

function parseBedFeature(f): Gene {
  var position = new ContigInterval(f.contig, f.start, f.stop),
      x = f.rest.split('\t'),
      // exons arrays sometimes have trailing commas
      exonLengths = x[7].replace(/,*$/, '').split(',').map(Number),
      exonStarts = x[8].replace(/,*$/, '').split(',').map(Number),
      exons = _.zip(exonStarts, exonLengths)
               .map(function([start, length]) {
                 return new Interval(f.start + start, f.start + start + length);
               });

  return {
    position,
    id: x[0],  // e.g. ENST00000359597
    strand: x[2],  // either + or -
    codingRegion: new Interval(Number(x[3]), Number(x[4])),
    geneId: x[9],
    name: x[10],
    exons
  };
}

function createFromFeatureEndpoint(url: string): BigBedSource{
    // Collection of genes that have already been loaded.
  var genes: {[key:string]: Gene} = {}; //TODO features

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

    coveredRanges.push(interval);
    coveredRanges = ContigInterval.coalesce(coveredRanges);

    /** Call JSON request */

    /** Modify URL */
    // url = "http://localhost:8080/" + range.contig.contig + "?start=" + range.start + "&end=" + range.stop;
    url = url + range.contig.contig + "?start=" + range.start + "&end=" + range.stop;

    var xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.responseType = 'json';
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.addEventListener('load', function(e) {
      var response = this.response;
      if (this.status >= 400) {
        notifyFailure(this.status + ' ' + this.statusText + ' ' + JSON.stringify(response));
      } else {
        if (response.errorCode) {
          notifyFailure('Error from Feature endpoint: ' + JSON.stringify(response));
        } else {
          addFeaturesFromResponse(response);
          o.trigger('newdata', interval);  // display data as it comes in.
          o.trigger('networkdone');
        }
      }
    });
    xhr.addEventListener('error', function(e) {
      notifyFailure('Request failed with status: ' + this.status);
    });

    var numRequests = 1;
    o.trigger('networkprogress', {numRequests}); //Num requests only applies to pagination
    xhr.send(JSON.stringify({
      pageSize: FEATURES_PER_REQUEST,
      // readGroupIds: [spec.readGroupId], //TODO give features an ID
      referenceName: range.contig,
      start: range.start(),
      end: range.stop()
    }));

    /** End of JSON request */
    /** replace this with modified sequence method that creates a BigBedSource */
    return remoteSource.getFeatureBlocksOverlapping(interval).then(featureBlocks => {
      featureBlocks.forEach(fb => {
        coveredRanges.push(fb.range);
        coveredRanges = ContigInterval.coalesce(coveredRanges);
        var genes = fb.rows.map(parseBedFeature);
        genes.forEach(gene => addGene(gene));
        //we have new data from our internal block range
        o.trigger('newdata', fb.range);
      });
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

  function notifyFailure(message: string) {
    o.trigger('networkfailure', message);
    o.trigger('networkdone');
    console.warn(message);
  }

  function addFeaturesFromResponse(response: Object) {
    response.features.forEach(fb => {
        coveredRanges.push(fb.range);
        coveredRanges = ContigInterval.coalesce(coveredRanges);
        var genes = fb.rows.map(parseBedFeature);
        genes.forEach(gene => addGene(gene));
        //we have new data from our internal block range
        o.trigger('newdata', fb.range);
    });
  }

  _.extend(o, Events);  // Make this an event emitter

  return o;
}

function create(data: {url: string}): BigBedSource {
      var url = data.url;
      if (!url) {
        throw new Error(`Missing URL from track: ${JSON.stringify(data)}`);
      }
      return createFromFeatureEndpoint(url);
}

module.exports = {
    create
};
