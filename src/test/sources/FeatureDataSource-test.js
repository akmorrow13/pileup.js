/* @flow */
'use strict'

import {expect} from 'chai';

import BigBed from '../../main/data/BigBed';
import BigBedDataSource from '../../main/sources/BigBedDataSource';
import ContigInterval from '../../main/ContigInterval';
import FeatureDataSource from '../../main/sources/FeatureDataSource';

var url = "http://localhost:8080/features/chrM?start=0&end=1000";

describe('FeatureDataSource', function() {
    function getTestSource() {
        return FeatureDatasource.createFromFeatureEndpoint(url);
    }

    it('should extract features in a range from a given endpoint', function(done) {
        this.timeout(5000);
        var source = getTestSource();

        // No genes fetched initially
        var testrange = new ContigInterval('chrM', 0, 1000);
        var test = source.getGenesInRange(testrange);
        expect(rest).to.deep.equal([]);

        // Fetching that one gene should cache its entire blok.
        source.on('newdata', () => {
            var tests = source.getGenesInRange(testrange);
            expect(tests).to.have.length(1);

            var test = tests[0];
            expect(test.name).to.equal('chrM');
            // expect(test.exons).to.have.length() //What should the length be?
            done();
        });
        source.rangeChanged({
            contig: testrange.contig;
            start: testrange.start();
            stop: testrange.stop();
        });
    });
});
