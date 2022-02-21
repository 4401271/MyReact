import React from './react';
import ReactDOM from './react-dom';

let style = {border: '2px solid skyblue', margin: '5px', borderRadius: '7px'}

// JSX语法  先转化为JS语法，然后通过JS的createElement转化为虚拟DOM —— 使用JSX语法并不会调用我们自己在React中写的createElement方法
// let element = (
//   <div id='A1' style={style}>A1
//     <div id='B1' style={style}>B1
//       <div id='C1' style={style}>C1</div>
//       <div id='C2' style={style}>C2</div>
//     </div>
//     <div id='B2' style={style}>B2</div>
//   </div>
// )

// 通过AST抽象语法树将JSX转换为JS

// React.createElement(type, props, ...children)

// JS
let element = React.createElement(
  "div", 
  {
    id: "A1",
    style: style
  }, 
  "A1", 
  React.createElement(
    "div", 
    {
      id: "B1",
      style: style
    }, 
    "B1", 
    React.createElement(
      "div", 
      {
        id: "C1",
        style: style
      }, 
      "C1"
    ), 
    React.createElement(
      "div", 
      {
        id: "C2",
        style: style
      }, 
      "C2"
    )
  ), 
  React.createElement(
    "div", 
    {
      id: "B2",
        style: style
    }, 
    "B2"
  )
);

// 由createElemen创建出来的 “虚拟DOM”：
// child = {
//   type: 'div', 
//   props: {
//     id: 'A1', 
//     children: [child1, child2...]
//   }
// }

console.log('element: ', element);

ReactDOM.render(
  element,
  document.getElementById('root')
)