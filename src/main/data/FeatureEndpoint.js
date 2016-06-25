/**
 * This module defines a parser for the 2bit file format.
 * See http://genome.ucsc.edu/FAQ/FAQformat.html#format7
 * @flow
 */
'use strict';

// import Q from 'q';
import type RemoteRequest from '../RemoteRequest';
//TODO import bedrow here

export type FeatureRecord = {
    featureId: string;
    featureType: string;
    start: number;
    end: number;
    range: ContigInterval<string>
}

function unpackFeatures(dataView: DataView, start: number, end: number): Array<string> {
  // TODO: use jBinary bitfield for this
  var features: Array<string> = [];
  // basePairs.length = dataView.byteLength * 4;  // pre-allocate
  for (var i = 0; i < dataView.byteLength; i++) {
    var packed = dataView.getUint8(i);
    features[i] = String.fromCharCode(packed);
  }
  // Remove base pairs from the end if the sequence terminated mid-byte.
  // features.length = numBasePairs; //TODO Determine length
  return features;
}

class FeatureEndpoint {
    remoteRequest: RemoteRequest;
    contigList: FeatureRecord[];

    constructor(remoteRequest: RemoteRequest, contigList: FeatureRecord[]) {
        this.remoteRequest = remoteRequest;
        this.contigList = contigList;
    }

    getContigList(): string[] {
        return this.contigList.map(seq => seq.name);
    }

    /**
   * Returns the Features in contig:start-stop.
   * The range is inclusive and zero-based.
   * Returns empty string if no data is available on this range.
   */
  
    getFeaturesInRange(contig: string, start: number, stop: number): Q.Promise<BedRow[]> {
    if (start > stop) {
      throw `Requested a range with start > stop (${start}, ${stop})`;
    }
    return this.remoteRequest.get(contig, start, stop).then(buffer => {
        var dataView = new DataView(buffer);
        var d = unpackFeatures(dataView, start, stop).join('');
        return d;
    });
    }
}
