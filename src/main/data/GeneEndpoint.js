/**
 * This module defines a parser for the 2bit file format.
 * See http://genome.ucsc.edu/FAQ/FAQformat.html#format7
 * @flow
 */
'use strict';

// import Q from 'q';
import type RemoteRequest from '../RemoteRequest';
import Interval from '../Interval';
import ContigInterval from '../../main/ContigInterval';

function extractGenes(genes: Object): Gene[] {
  var mapped = genes.map(g => extractGene(g));
  return mapped;
}

function extractGene(f: Object): Gene {
  var pos = new ContigInterval(f.position.referenceName, Number(f.position.start), Number(f.position.end));
  // parse out exon intervals
  var exons = f.exons
           .map(ex => new Interval(ex.region.start, ex.region.end));

  // parse strand to positive or negative boolean
  var strand;
  if (f.strand === false) {
    strand = "-";
  } else {
    strand = "+";
  }
  return {
    position: pos,
    id: f.id,
    strand: strand,  // either + or -
    codingRegion: new Interval(Number(f.codingRegion.start), Number(f.codingRegion.end)),
    geneId: f.geneId,
    name: f.name,
    exons
  };
}


class GeneEndpoint {
  remoteRequest: RemoteRequest;

  constructor(remoteRequest: RemoteRequest) {
    this.remoteRequest = remoteRequest;
  }

  getGenesInRange(range: ContigInterval<string>): Q.Promise<Gene[]> {
     var contig = range.contig;
     var start = range.interval.start;
     var stop = range.interval.stop;

    return this.remoteRequest.get(contig, start, stop).then(object => {
      var d = extractGenes(object);
      return d;
    });
  }
}

module.exports = GeneEndpoint;
