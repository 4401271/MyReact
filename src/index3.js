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
  render() {
    return (
      <div id='counter'>
        <span>{this.state.number}</span><br />
        <button onClick={this.onClick}>+1</button>
      </div>
    )
  }
}

ReactDOM.render(
  <ClassCounter />,
  document.getElementById('root')
)