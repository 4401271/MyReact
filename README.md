### 阉割版 React - 使用文档

**Note: `index.js` 需要搭配 `index.html` 使用，因为存在多个版本，所以需要保证两个文件名相同！**


配置缘故，在 index.js 中书写 `JSX`，默认使用原生 React 的 `createElement`，尽管引入的是自己的 React，也并不会使用我们自己写的 `createElement`

因此我们需要先去 [Babel](https://www.babeljs.cn/repl#?browsers=defaults%2C%20not%20ie%2011%2C%20not%20ie_mob%2011&build=&builtIns=false&corejs=3.6&spec=false&loose=false&code_lz=Q&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=true&presets=env%2Creact%2Cstage-2&prettier=false&targets=&version=7.17.6&externalPlugins=&assumptions=%7B%7D) 将JSX 编译为 JS ，这里面显式地调用了 `createElement` ，一起看个一段写在 index.js 中的代码：
```html
render() {
  return (
    <div id='counter'>
      <h1>{this.props.name}</h1>
      <div style={{width: '25px', display: 'inline-block'}}>{this.state.number}</div>
      <button onClick={this.onClick}>戳一下 +1</button>
    </div>
  )
}
```

`JSX` 部分经过 Babel 编译过后，就变成了：
```javascript
"use strict";

/*#__PURE__*/
React.createElement("div", {
  id: "counter"
}, /*#__PURE__*/React.createElement("h1", null, (void 0).props.name), /*#__PURE__*/React.createElement("div", {
  style: {
    width: '25px',
    display: 'inline-block'
  }
}, (void 0).state.number), /*#__PURE__*/React.createElement("button", {
  onClick: (void 0).onClick
}, "\u6233\u4E00\u4E0B +1"));
```

改写一下，就变成了我们需要的 JS 代码：
```javascript
render() {
  return (
    React.createElement("div", {id: "counter"},
      React.createElement("h1", null, this.props.name),
        React.createElement("div", {style: {width: '25px', display: 'inline-block'}}, this.state.number),
        React.createElement("button", {onClick: this.onClick}, "戳一下 +1")
      )
    );
  }
```
