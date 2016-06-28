/* @flow */
'use strict';

import {expect} from 'chai';

import sinon from 'sinon';

import ContigInterval from '../../main/ContigInterval';
import FeatureDataSource from '../../main/sources/FeatureDataSource';
import RemoteFile from '../../main/RemoteFile';
import sample from '../../main/samplefeature';

var url = "http://localhost:8080/features/chrM?start=0&end=1000";

describe('FeatureDataSource', function() {
    var server: any = null, response;

    before(function () {
        return new RemoteFile('../../main/samplefeature').getAllString().then(data => {
            response = data;
            server = sinon.fakeServer.create();
            server.respondWith('GET', '/features/chrM?start=1011&end=1012', [200, { "Content-Type": "application/json" }, response]);
            server.respondWith('GET', '/features/chrM?start=1107&end=1200', [200, { "Content-Type": "application/json" }, response]);
        });
    });

    after(function () {
        server.restore();
    })

    function getTestSource() {
        var source = FeatureDataSource.create({
            url: '/features',
            contigList: [{
                name:"chrM",
                length: 93
            }, {
                name:"chrM",
                length: 1
            }]
        });
        return source;
    }

    it('should fetch contigs', function() {
        var source = getTestSource();
        var contigs = source.contigList();
        expect(contigs).to.deep.equal(['chrM','93'])
    });

    it('should normalize range', function() {
        var source = getTestSource();
        var range = {contig: 'chrM', start: x, stop: y};
        source.normalizeRange(range).then(normalized => {
            expect(normalized.to.deep.equal(range));
        }).done();
    });

    it('should extract features in a range from a given endpoint', function(done) {
        this.timeout(5000);
        var source = getTestSource();

        // No features fetched initially
        var testrange = new ContigInterval('chrM', 1011, 1012);
        var test = source.getFeaturesInRange(testrange[0], testrange[1], testrange[2]);
        expect(test).to.deep.equal([]);

        // Fetching that one feature should cache its entire block.
        source.on('newdata', () => {
            var tests = source.getFeaturesInRange(testrange[0], testrange[1], testrange[2]);
            expect(tests).to.have.length(1);

            var test = tests[0];
            expect(test.name).to.equal('chrM');
            done();
        });
        source.rangeChanged({
            contig: testrange.contig,
            start: testrange.start(),
            stop: testrange.stop()
        });
    });
});
