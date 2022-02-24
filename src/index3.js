import React from './react';
import ReactDOM from './react-dom';

class ClassCounter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { number: 0 };
  }
  onClick = () => {
    this.setState(state => ({ number: state.number + 1 }));
  }

  // <div id='counter'>
  //   <h1>{this.props.name}</h1>
  //   <div style={{width: '25px', display: 'inline-block'}}>{this.state.number}</div>
  //   <button onClick={this.onClick}>戳一下 +1</button>
  // </div>

  render() {
    return (
      React.createElement("div", {id: "counter"},
        React.createElement("h1", null, this.props.name),
        React.createElement("div", {style: {width: '25px', display: 'inline-block'}}, this.state.number),
        React.createElement("button", {onClick: this.onClick}, "戳一下 +1")
      )
    );
  }
}

ReactDOM.render(
  <ClassCounter name="计数器"/>,
  document.getElementById('root')
)