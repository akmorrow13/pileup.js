var sources = [

  { viz: pileup.viz.genome(),
   data: pileup.formats.ADAMAlignment({
    {        
      // endpoint:"/test-data/adam-alignments.json",
      endpoint: '/v0.5.1', 
      readGroupId: 'some-group-set:some-read-group', 
      killChr: false 
    }  
   }),
   name: 'Alignments'
  },
 {
 viz: pileup.viz.location(),
 name: 'Location'
 },
 {
   viz: pileup.viz.scale(),
   name: 'Scale'
 } 
];

var range = {contig: 'chrM', start: 0, stop: 7512644};
