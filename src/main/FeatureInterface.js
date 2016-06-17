/** 
 * Interface for features
 * @flow
 */

import type ContigInterval from './ContigInterval';

export type Strand = '-' | '+';

export type Feature = {
    featureId: string;
    featureType: string;
    source: string;
    contig: ContigInterval<string>;
    start: number;
    end: number;
    strand: Strand;
    value: number;
    dbxrefs: Dbxref[];
    parentIds: string[];
    attributes: Object;

    getAttributes(): Object;
    getContig(): ContigInterval;
    getDbxrefs(): Dbxref[];
    getEnd(): number;
    getFeatureId(): string;
    getFeatureType(): string;
    getParentsIds(): string;
    getSource(): string;
    getStart(): number;
    getStrand(): Strand;
    getValue(): number;
    
    setAttributes();
    setContig();
    setDbxrefs();
    setEnd();
    setFeatureId();
    setParentIds();
    setSource();
    setStart();
    setStrand();
    setValue();
}

export type FeatureDataSource = {
      rangeChanged: (newRange: GenomeRange) => void;
      getFeaturesInRange: (range: ContigInterval<string>) => Feature[];
      on: (event: string, handler: Function) => void;  // really => FeatureDataSource
      once: (event: string, handler: Function) => void;
      off: (event: string) => void;
}
