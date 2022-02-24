import React from './react';
import ReactDOM from './react-dom';

//<div id='counter'>
//  <h1>{this.props.name}</h1>
//  <div style={{width: '25px', display: 'inline-block'}}>{this.state.number}</div>
//  <button onClick={this.onClick}>戳一下 +1</button>
//</div>

function FunctionCounter(props){
  return (
    React.createElement("div", {id: "counter"},
      React.createElement("h1", null),
      React.createElement("div", {style: {width: '25px', display: 'inline-block'}}, 0),
      React.createElement("button", null, "戳一下 +1")
    )
  );
}

ReactDOM.render(
  <FunctionCounter name="计数器"/>,
  document.getElementById('root')
)