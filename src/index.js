import React from './react';
import ReactDOM from './react-dom';

let style = {border: '2px solid skyblue', margin: '5px', borderRadius: '7px'}

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

ReactDOM.render(
  element,
  document.getElementById('root')
)

// 增加并修改节点
let btn1 = document.getElementById('btn1');
btn1.addEventListener('click', () => {
  let element1 = React.createElement(
    "div", 
    {
      id: "A1-a",
      style: style
    }, 
    "A1-a", 
    React.createElement(
      "div", 
      {
        id: "B1-a",
        style: style
      }, 
      "B1-a", 
      React.createElement(
        "div", 
        {
          id: "C1-a",
          style: style
        }, 
        "C1-a"
      ), 
      React.createElement(
        "div", 
        {
          id: "C2-a",
          style: style
        }, 
        "C2-a"
      )
    ), 
    React.createElement(
      "div", 
      {
        id: "B2-a",
          style: style
      }, 
      "B2-a"
    ),
    React.createElement(
      "div", 
      {
        id: "B3",
          style: style
      }, 
      "B3"
    )
  );
  
  ReactDOM.render(
    element1,
    document.getElementById('root')
  )
});

// 增加并删除节点
let btn2 = document.getElementById('btn2');
btn2.addEventListener('click', () => {
  let element2 = React.createElement(
    "div", 
    {
      id: "A1-b",
      style: style
    }, 
    "A1-b", 
    React.createElement(
      "div", 
      {
        id: "B1-b",
        style: style
      }, 
      "B1-b", 
      React.createElement(
        "div", 
        {
          id: "C1-b",
          style: style
        }, 
        "C1-b"
      ), 
      React.createElement(
        "div", 
        {
          id: "C2-b",
          style: style
        }, 
        "C2-b"
      )
    ), 
    React.createElement(
      "div", 
      {
        id: "B2-b",
          style: style
      }, 
      "B2-b"
    )
  );
  
  ReactDOM.render(
    element2,
    document.getElementById('root')
  )
});