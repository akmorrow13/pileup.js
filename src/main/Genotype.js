/**
 * Class for Genotypes, shared between BAM and GA4GH backends.
 * @flow
 */

import type ContigInterval from './ContigInterval';
import type Variant from './Variant';

export type Strand = '-' | '+';

// class Genotype {
//     variant: Variant;
//     sampleId: string;
//     sampleDescription: string;
//     processingDescription: string;
//     //alleles: List<GenotypeAllele>
//     expectedAlleleDosage: number;
//     referenceReadDepth: number;
//     alternativeReadDepth: number;
//     readDepth: number;
//     minReadDepth: number;
//     genotypeQuality: number;
//     genotypeLikelihoods: List<number>;
//     nonReferenceLikelihoods: List<number>;
//     strandBiasComponents: List<number>;
//     splitFromMultiAllelic: boolean;
//     isPhased: boolean;
//     phaseSetId: number;
//     phaseQuality: number;
// }
