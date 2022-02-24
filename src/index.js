import React from './react';
import ReactDOM from './react-dom';

const ADD = 'ADD';

function reducer(state, action) {
  switch (action.type) {
    case ADD:
      return {count: state.count+1};
  
    default:
      return state;
  }
}

//<div id='counter'>
//  <h1>{this.props.name}</h1>
//  <div style={{width: '25px', display: 'inline-block'}}>{this.state.number}</div>
//  <button onClick={this.onClick}>戳一下 +1</button>
//</div>

function FunctionCounter(props){
  const [numberState, setNumberState] = React.useState({number: 0});
  const [countState, dispatch] = React.useReducer(reducer, {count: 0});
  return (
    React.createElement("div", null,
      React.createElement("div", {id: "counter1"},
        React.createElement("h1", null, props.name+"1"),
        React.createElement("div", {style: {width: '25px', display: 'inline-block'}}, numberState.number),
        React.createElement("button", {onClick: () => setNumberState({ number: numberState.number + 1 })}, "戳一下 +1")
      ),
      React.createElement("div", {id: "counter2"},
        React.createElement("h1", null, props.name+"2"),
        React.createElement("div", {style: {width: '25px', display: 'inline-block'}}, countState.count),
        React.createElement("button", {onClick: () => dispatch({ type: ADD })}, "戳一下 +1")
      )
    )
  );
}

ReactDOM.render(
  <FunctionCounter name="计数器"/>,
  document.getElementById('root')
)