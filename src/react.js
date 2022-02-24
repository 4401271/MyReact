import { Update } from './updateQueue';
import { scheduleRoot, useReducer, useState } from './scheduler';
import { ELEMENT_TEXT } from './constants'


// 创建虚拟DOM
function createElement(type, config, ...children) {
  // 标签没有属性时，config为null
  if (config) {
    delete config._self;
    delete config._source;
  }
  return {
    type,
    props: {
      ...config,
      children: children.map(child => {
        return typeof child === 'object' ?
          child :  // 虚拟DOM对应着一个对象
          {        // TEXT对应着一个字符串
            type: ELEMENT_TEXT,
            props: { text: child, children: [] }
          }
      })
    }
  }
}

class Component {
  constructor(props) {
    this.props = props;
  }
  setState(payload) { // payload可能是对象，也可能是函数
    let update = new Update(payload);  // 将payload挂载到update对象上
    this.internalFiber.updateQueue.addUpdate(update); // updateQueue放在类组件的fiber节点internalFiber上
    scheduleRoot();
  }
}
// 用该属性标明这是一个类组件（用于区分函数式组件）
Component.prototype.isReactComponent = {}; 

const React = {
  createElement,
  Component,
  useReducer,
  useState
}

export default React;