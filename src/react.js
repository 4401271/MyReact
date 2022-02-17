import { ELEMENT_TEXT } from './constants'


// 创建虚拟DOM
function createElement(type, config, ...children) {
  delete config._self;
  delete config._source;
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

const React = {
  createElement
}

export default React;