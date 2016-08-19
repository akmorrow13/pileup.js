/**
 * Controls for filtering variants.
 * @flow
 */
'use strict';

import type {MenuItem} from '../../Menu';
import React from 'react';

type Props = {
  filters: VcfFilter;
  onChange: (filter: VcfFilter) => void;
};

export type VcfFilter = {
  transEffects: Array<MenuItem>;
  readDepth: number;
  alleleCount: number;
  alleleFreq: number;
}

class VariantFilter extends React.Component {
  props: Props;
  state: void;  // no state

  constructor(props: Object) {
    super(props);
  }

  handleFilterSubmit(e: SyntheticEvent) {
    e.preventDefault();
    this.props.onChange(this.props.filters);
  }

  /*******************************************
  * Functions handling change in filter values
  *******************************************/

  transEffButtonClick(index: number) {
    this.props.filters.transEffects[index].checked = true;
  }

  readDepthChange(e: SyntheticEvent) {
    e.preventDefault();
    this.props.filters.readDepth = this.refs.readDepth.value;
  }

  alleleCountChange(e: SyntheticEvent) {
    e.preventDefault();
    this.props.filters.alleleCount = this.refs.alleleCount.value;
  }

  alleleFreqChange(e: SyntheticEvent) {
    e.preventDefault();
    console.log(this.props.filters);
    console.log(this.refs.alleleFreq.value);
    this.props.filters.alleleFreq = this.refs.alleleFreq.value;
  }

  render(): any {
    var elems = [];

    var res = this.props.filters.transEffects.map((item, i)=>{
    	return <label><input ref="transEff" class="transEff" type="checkbox" id={item.key} onClick={this.transEffButtonClick.bind(i)}>{item.label}</input></label>;
    });
    elems.push(<div><h4>Transcript Effect</h4>{res}</div>);
    elems.push(<div><h4>Read Depth</h4><input type="number" class="form-control"  min ="0" max ="200" id="readDepth"
				ref='readDepth' onChange={this.readDepthChange.bind(this)}></input></div>);
    elems.push(<div><h4>Allele Count</h4><input  type="number" class="form-control"  min ="0" max ="1000" step="100" id="alleleCount"
    			ref='alleleCount'  onChange={this.alleleCountChange.bind(this)}></input></div>);
    elems.push(<div><h4>Allele Frequency</h4><input  type="number" class="form-control"  min ="0" max ="1000" step="100" id="alleleFreq"
          ref='alleleFreq'  onChange={this.alleleFreqChange.bind(this)}></input></div>);
    elems.push(<button id="submit" class="btn btn-primary btn-md"
    			onClick={this.handleFilterSubmit.bind(this)}>Submit</button>);
    return (
      <form className='vcfFilter' class="btn btn-primary" onSubmit={this.handleFilterSubmit.bind(this)}>
        {elems}
      </form>
    );
    
  }
}

module.exports = VariantFilter;
