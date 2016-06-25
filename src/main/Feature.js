/**
 * Class for features
 * @flow
 */
 'use strict';

import ContigInterval from './ContigInterval';

export type Strand = '-' | '+';

export type Dbxref = {
    accession: string;
    db: string;
}

export type attribute = {
    key: string;
    value: string;
}

class Feature {
    featureId: string;
    featureType: string;
    source: string;
    range: ContigInterval<string>;
    start: number;
    end: number;
    strand: Strand;
    value: number;
    dbxrefs: Dbxref[];
    parentIds: string[];
    attributes: attribute[]; //Or use array of attribute objects with key, value

    constructor(input: Object) {
        this.featureId = input.featureId;
        this.featureType = input.featureType;
        // this.source = input.source;
        this.start = input.start;
        this.end = input.end;
        // this.strand = input.strand;
        // this.value = input.value;
        // this.dbxrefs = input.dbxrefs;
        // this.parentIds = input.parentIds;
        // this.attributes = input.attributes;
        this.range = input.range;
    }

    getAttributes(): Object {
        return this.attributes;
    }

    getContig(): ContigInterval {
        return this.range;
    }

    getDbxrefs(): Dbxref[] {
        return this.dbxrefs;
    }

    getEnd(): number {
        return this.end;
    }

    getFeatureId(): string {
        return this.featureId;
    }

    getFeatureType(): string {
        return this.featureType;
    }

    getParentIds(): string {
        return this.parentIds;
    }

    getSource(): string {
        return this.source;
    }

    getStart(): number {
        return this.start;
    }

    getStrand(): Strand {
        return this.alignment.alignment.position.reverseStrand ? '-' : '+';
    }

    getValue(): number {
        return this.value;
    }

    setAttributes(value: Object) {
        this.attributes = value;
    }

    setContig(value: ContigInterval) {
        this.range = value;
    }

    setDbxrefs(value: List<Dbxref>) {
        this.dbxrefs = value;
    }

    setEnd(value: number) {
        this.end = value;
    }

    setFeatureId(value: string) {
        this.featureId = value;
    }

    setFeatureType(value: string) {
        this.featureType = value;
    }

    setParentIds(value: List<string>) {
        this.parentIds = value;
    }

    setSource(value: string) {
        this.source = value;
    }

    setStart(value: number) {
        this.start = value;
    }

    setStrand(value: Strand) {
        this.strand = value;
    }

    setValue(value: number) {
        this.value = value;
    }

}

export type FeatureDataSource = {
  rangeChanged: (newRange: GenomeRange) => void;
  getFeaturesInRange: (range: ContigInterval<string>) => Feature[];
  on: (event: string, handler: Function) => void;  // really => FeatureDataSource
  once: (event: string, handler: Function) => void;
  off: (event: string) => void;
};

module.exports = Feature;
