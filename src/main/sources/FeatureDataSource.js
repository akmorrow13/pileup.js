/* @flow */

import type {Gene, BigBedSource} from './BigBedDataSource';
import type ContigInterval from '../ContigInterval';

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

function createFromFeatureEndpoint(url: string): BigBedSource{
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
          notifyFailure('Error from GA4GH endpoint: ' + JSON.stringify(response));
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

    o.trigger('networkprogress', {numRequests});
    xhr.send(JSON.stringify({
      pageSize: ALIGNMENTS_PER_REQUEST,
      readGroupIds: [spec.readGroupId],
      referenceName: range.contig,
      start: range.start(),
      end: range.stop()
    }));

    /** End of JSON request */

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
}
 
