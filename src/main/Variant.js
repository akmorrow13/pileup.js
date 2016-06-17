/**
 * Class for Variants, shared between BAM and GA4GH backends.
 */

import type ContigInterval from './ContigInterval';

export type Strand = '-' | '+';

class Variant {
    contig: ContigInterval;
    start: number;
    end: number;
    referenceAllele: string;
    alternateAllele: string;
    svAllele: StructuralVariant;
    isSomatic: boolean;

    constructor(contig: ContigInterval, start: number, end: number
        referenceAllele: string, alternateAllele: string,
        svAllele: StructuralVariant, isSomatic: boolean) {
        this.contig = contig;
        this.start = start;
        this.end = end;
        this.referenceAllele = referenceAllele;
        this.alternateAllele = alternateAllele;
        this.svAllele = svAllele;
        this.isSomatic = isSomatic;
    }

    getAlternativeAllele(): string {
        return this.alternateAllele;
    }

    getContig(): ContigInterval {
        return this.contig;
    }

    getEnd(): number {
        return this.end;
    }

    getIsSomatic(): boolean {
        return this.isSomatic;
    }

    getReferenceAllele(): string {
        return this.referenceAllele;
    }

    getStart(): number {
        return this.start;
    }

    getSvAlelle(): StructuralVariant {
        return this.svAllele;
    }

    setAlternatieAllele(value: string) {
        this.alternateAllele = value;
    }

    setContig(value: Contig) {
        this.contig = value;
    }

    setEnd(value: number) {
        this.end = value;
    }

    setIsSomatic(value: boolean) {
        this.isSomatic = value;
    }

    setReferenceAllele(value: string) {
        this.referenceAllele = value;
    }

    setStart(value: number) {
        this.start = value;
    }

    setSvAllel(value: StructuralVariant) {
        this.svAllele = value; 
    }

}

module.exports = Variant;
