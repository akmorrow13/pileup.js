/**
 * Class for features, shared between BAM and GA4GH backends.
 */

import type ContigInterval from './ContigInterval';

export type Strand = '-' | '+';

export type Dbxref = {
    accession: string;
    db: string;
}

class Feature {
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

    constructor(featureId: string, featureType: string, source: string, 
        contig: ContigInterval<string>, start: number, end: number, 
        strand: Strand, value: number, dbxrefs: Dbxref[], parentIds: string[],
        attributes: Object) {
        this.featureId = featureId;
        this.featureTyp = featureType;
        this.source = source;
        this.contig = contig;
        this.start = start;
        this.end = end;
        this.strand = strand;
        this.value = value;
        this.dbxrefs = dbxrefs;
        this.parentIds = parentIds;
        this.attributes = attributes;
    }

    getAttributes(): Object {
        return this.attributes;
    }

    getContig(): Contig {
        return this.contig;
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

    /** Feature.Builder methods
        May need to separate these */

    setAttributes(value: Object) {
        this.attributes = value;
    }

    setContig(value: number) {
        this.contig = value;
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

module.exports = Feature;

