# 【精简版 React】解析
**Note: `index.js` 需要搭配 `index.html` 使用，因为存在多个版本，所以需要保证两个文件名相同！**

## 一、JSX 编译
以最基本的使用：index1.js 与 index1.html 为例

&ensp;&ensp;&ensp;&ensp;配置缘故，**在 index.js 中写 JSX，默认使用原生 React 的 `createElement`**，尽管引入的是自己的 React，但是并不会使用我们自己写的 `createElement`

&ensp;&ensp;&ensp;&ensp;因此我们需要先借助 [Babel](https://www.babeljs.cn/repl#?browsers=defaults%2C%20not%20ie%2011%2C%20not%20ie_mob%2011&build=&builtIns=false&corejs=3.6&spec=false&loose=false&code_lz=Q&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=true&presets=env%2Creact%2Cstage-2&prettier=false&targets=&version=7.17.6&externalPlugins=&assumptions=%7B%7D) 将 JSX 编译为 JS ，这样，就可以显式地调用我们自己写的 `createElement` ，一起看个一段写在 index1.js 中的代码：
```html
let style = {border: '2px solid skyblue', margin: '5px', borderRadius: '7px'}

// JSX语法  先转化为JS语法，然后通过JS的createElement转化为虚拟DOM —— 使用JSX语法并不会调用我们自己在React中写的createElement方法
let element = (
  <div id='A1' style={style}>A1
    <div id='B1' style={style}>B1
      <div id='C1' style={style}>C1</div>
      <div id='C2' style={style}>C2</div>
    </div>
    <div id='B2' style={style}>B2</div>
  </div>
)
```
JSX 部分经过 `Babel` 编译过后，变成了下面的样子
```javascript
"use strict";

/*#__PURE__*/
React.createElement("div", {
  id: "A1",
  style: style
}, "A1", /*#__PURE__*/React.createElement("div", {
  id: "B1",
  style: style
}, "B1", /*#__PURE__*/React.createElement("div", {
  id: "C1",
  style: style
}, "C1"), /*#__PURE__*/React.createElement("div", {
  id: "C2",
  style: style
}, "C2")), /*#__PURE__*/React.createElement("div", {
  id: "B2",
  style: style
}, "B2"));
```
&ensp;&ensp;&ensp;&ensp;可以很明显地看到，我们向 `React.createElement` 中传递的参数，既是标签的各种参数
整理一下，就变成了我们需要的 JS 代码：
```javascript
let element = React.createElement("div", {id: "A1",style: style}, "A1", 
  React.createElement("div", {id: "B1",style: style}, "B1", 
    React.createElement("div", {id: "C1",style: style}, "C1"), 
    React.createElement("div", {id: "C2",style: style}, "C2")
  ), 
  React.createElement("div", {id: "B2",style: style}, "B2")
);
```
### 1. createElement 的作用
根据传递的参数，创建一个 `虚拟DOM`
```javascript
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
          child :  // 虚拟 DOM 对应着一个对象
          {        // TEXT 对应着一个字符串
            type: ELEMENT_TEXT,
            props: { text: child, children: [] }
          }
      })
    }
  }
}
```
该 `虚拟 DOM` 包括：
1. type: 标签名
2. props: 标签处倘若写了一个{null}，那么 props 就为 null
1 . style: 样式
2 . onClick: 绑定的事件
3 . ... （标签属性）
4 . children: [  `子虚拟DOM1` 、 `子虚拟DOM2`、... 、标签文本 ]

&ensp;&ensp;&ensp;&ensp;可以看到，调用 `createElement` 时，传入的第 2~n 个参数，最终都被整合到了 props 中
其中，标签文本也被作为 children 属性值保存了起来。


## 二、render
组件创建完成后，将组件和组件所挂载的 DOM 容器传递到 `render` 函数中去，像这样：
```javascript
ReactDOM.render(
  element,
  document.getElementById('root')
)
```
首先，我们需要先明确
### 1. [为什么需要引入 fiber？](https://zhuanlan.zhihu.com/p/26027085)
&ensp;&ensp;&ensp;&ensp;v16 之前，更新过程是**同步**的，从调用各个组件的生命周期函数、计算、比对虚拟 DOM，到最后更新 DOM 树，整个过程必须要**一气呵成**。
&ensp;&ensp;&ensp;&ensp;随着时间的流逝，页面变得日益复杂，有时更新完页面中的所有组件，甚至需要花上数百毫秒的时间。这期间，用户与页面的任何交互将不会有任何反馈。这样的体验必然是很不友好的。
&ensp;&ensp;&ensp;&ensp;我们知道 JavaScript 是**单线程**语言，一个任务花费太长的时间，就为导致其他任务无响应。因此，解决这个问题就显得尤为突出！
&ensp;&ensp;&ensp;&ensp;解决 JavaScript 中同步操作时间过长的方法——**分片**。片，也就是 **fiber**。
### 2. fiber 是什么？
`fiber` 是一个用来描述节点的对象，相较于虚拟 DOM，它包含的节点信息更加丰富。一起来看一下初次渲染时创建的 `fiber` 对象：
```javascript
newFiber = {
  tag,
  type: sonVDOM.type,
  props: sonVDOM.props,
  stateNode: null,
  return: fiber,
  updateQueue: new UpdateQueue(),
  effectTag: PLACEMENT,
  nextEffect: null
}
```
 - **tag**： 节点类型，值包括为：
	- TAG_TEXT：文本类型，标签之间的文本即为该类型
	- TAG_HOST：原生节点类型，例如：div 标签、span 标签等
	- TAG_CLASS：类式组件
	- TAG_FUNCTION：函数式组件
 - **type**：调用 createElement 时传入的第一个参数：'div'、'span'、'h1'... 
 - **props**：标签属性：{id="A1" style={style} onClick=()=>{} ...} 
 - **stateNode**：`fiber` 对应的真实 DOM
 - **return**：指向 `fiber` 的 `父fiber`
 - **updateQueue**: 更新队列。每一个 `fiber` 都有一个 `updateQueue`。该属性只在 “类式组件” 与 “类式组件” 中有实际意义（下文会详细介绍）
 - **effectTag**：副作用标识，标识 DOM 发生了什么样的变化，值包括：
 	- PLACEMENT：新增
 	- DELETE：删除
 	- UPDATE：更新
 - **nextEffect**：`effect list` 是一个单链表，该链表上保存着所有的 “发生了变化” 的 DOM 对应的 `fiber`。我们知道，React 并不会在每遇到一个变化，就去更新一次页面。而是将所有变化的 DOM 对应的 `fiber` 收集起来，最终只做一次更新（暂不考虑 offsetLeft、clientTop 等需要实时获取最新数据的属性），来降低由于频繁重绘重排来带的巨大性能开销
 - **alternate**：指向上一次渲染时的 `fiber树` 中对之应的 `fiber` 节点
 - **child**：指向 `fiber` 的第一个 `子fiber`，与 **sibling、return** 属性一同用于构建 `fiber树`
 - **sibling**：指向 `fiber` 的 `弟弟fiber`
### 3. fiber 树是什么样的结构？
&ensp;&ensp;&ensp;&ensp;所有借助 createElement 创建的虚拟 DOM，都会对应一个 `fiber` 节点；每个组件也会对应一个根 `fiber`。根据层级关系，借助`child`、`sibling`、`return` 将所有的 `fiber` 连接起来，形成了最终的 `fiber树`。所以说 `fiber树` 是一个链表结构，但并非单链表。
### 4. render 函数有什么作用？
1. 创建一个根 fiber：`rootFiber`
1	. 将 id 为 root 的真实 DOM 通过 `stateNode` 属性绑定在 `rootFiber` 上
2	. 将 createElement 创建出来的虚拟 DOM 通过 props 属性绑定在 `rootFiber` 上
2. 将 `rootFiber` 做为参数调用函数 `scheduleRoot`

## 三、scheduleRoot
页面可能会被无限次重新渲染，但维护的 fiber 树，就只有两棵：
 - 一棵为此次渲染正在构建的 fiber 树，其根节点用**全局变量** `workInProgressRootFiber` 来保存
 - 另一棵为页面上次渲染时构建的 fiber 树，根节点用**全局变量** `currentRenderRootFiber` 来保存

&ensp;&ensp;&ensp;&ensp;自第二次渲染结束后，页面再次重新渲染，便开始复用这两棵 fiber 树，可以同时节省创建大量的 fiber 对象所消耗的时间与存储空间。

这就是 React 优化核心之一的：**双缓冲机制**

> 整体的流程大概就是这样：
> 第一、二次渲染，各**构建**一棵新的 fiber 树；
> 第三次渲染，直接拿第一次**构建**的 fiber 树来用，同时让 fiber 节点的 alternate 属性，指向第二次**构建**的 fiber 树中的对应节点；
> 第四次渲染时，拿来第二次**构建**的 fiber 树，修改 fiber 节点的 alternate 属性，让其指向第三次渲染时**更新**的 fiber 树的对应节点；
> 第五次渲染，拿第三次渲染**更新**的 fiber 树来用 ...

```javascript
export function scheduleRoot(rootFiber) {
  if (currentRenderRootFiber && currentRenderRootFiber.alternate) { // 第3、4、5 ... 次渲染
    workInProgressRootFiber = currentRenderRootFiber.alternate;
    workInProgressRootFiber.alternate = currentRenderRootFiber;

    if (rootFiber) workInProgressRootFiber.props = rootFiber.props;

  } else if (currentRenderRootFiber) { // 第2次渲染
    if (rootFiber) {
      rootFiber.alternate = currentRenderRootFiber;
      workInProgressRootFiber = rootFiber;
    } else {
      workInProgressRootFiber = {
        ...currentRenderRootFiber,
        alternate: currentRenderRootFiber
      }
    }
  } else { // 第1次渲染
    workInProgressRootFiber = rootFiber;
  }

  workInProgressRootFiber.firstEffect = workInProgressRootFiber.lastEffect = workInProgressRootFiber.nextEffect = null;
  currentFiber = workInProgressRootFiber;
}
```
**scheduleRoot 的任务：**

 - **第 1 次渲染** 标志 ：`currentRenderRootFiber ` 为空

&ensp;&ensp;&ensp;&ensp;让 `workInProgressRootFiber` 指向传入的第一个根 fiber；渲染过后，把 `workInProgressRootFiber` 的值赋给 `currentRenderRootFiber `（操作位于 commitRoot 中）。**`currentRenderRootFiber` 也就指向了第一个根 fiber。**

 - **第 2 次渲染** 标志：`currentRenderRootFiber ` 非空，但 `currentRenderRootFiber ` 上并不存在 alternate 属性

&ensp;&ensp;&ensp;&ensp;把 `currentRenderRootFiber` 指向的第一个根 fiber，赋给刚传进来的第二个根 fiber 的 **alternate** 属性；然后把第二个根 fiber 赋给 `workInProgressRootFiber`，此时，`workInProgressRootFiber.alternate` 指向第一个根 fiber；渲染过后，把 `workInProgressRootFiber` 的值赋给 `currentRenderRootFiber `（操作位于 commitRoot 中）。这样 **`currentRenderRootFiber.alternate` 也就指向第一棵 fiber 树的根 fiber。**

 - **第 3、4... 次渲染** 标志：`currentRenderRootFiber ` 非空，且 `currentRenderRootFiber.alternate` 属性也非空。

&ensp;&ensp;&ensp;&ensp;此时只需要将 `currentRenderRootFiber.alternate` 指向的上上一个根 fiber（也就是第一个根 fiber）拿过来，然后赋给 `workInProgressRootFiber`，这样就完成了对第一个根 fiber 的复用；然后再把 `currentRenderRootFiber` 中保存的上一棵 fiber 树的根 fiber，赋给当前 fiber 树的 alternate 属性，就完成了与上一棵 fiber 树的关联。

&ensp;&ensp;&ensp;&ensp;可以看到，**其实 `scheduleRoot` 始终在做一件事情：更新 `workInProgressRootFiber`、`currentRenderRootFiber` 存储的根节点，及其 **alternate** 属性的指向。**
## 四、workLoop
&ensp;&ensp;&ensp;&ensp;阅读代码可以发现，scheduleRoot 像一座孤岛一般。我们调用了 scheduleRoot 函数，但 scheduleRoot 并没有调用 `scheduler.js` 中的其余函数，那其他函数是怎么被使用的呢？

&ensp;&ensp;&ensp;&ensp;梳理一下代码的逻辑，可以看到，其余函数的调用起点在 `workLoop`，该函数只在 `requestIdleCallback` 中被调用了：
```javascript
requestIdleCallback(workLoop, { timeout: 500 });
```
因此，问题就变成了：

 **`requestIdleCallback` 函数是做什么的？它在什么时候被调用？**

答：在浏览器一帧的剩余空闲时间内，执行优先度相对较低的任务

&ensp;&ensp;&ensp;&ensp;简单来说，在当前的场景中，就是让浏览器执行完别的任务时，判断时间片是否还有剩余的时间，如果有，就执行传入的  `workLoop` 任务。假如连续 500ms 都没有执行 `workLoop`，就强制执行该任务。

&ensp;&ensp;&ensp;&ensp;但是原生的 `requestIdleCallback` 每秒只有 20 帧。

（20帧 / 1000ms = 1帧 / 50ms、60帧 / 1000ms = 1帧 / 16.7ms）

&ensp;&ensp;&ensp;&ensp;也就是说，每个时间片是 50ms，隔 50ms 才会刷新一次，远比我们感觉流畅的每 16.7ms 刷新一次的频率要低很多。所以，在 React 的源码中，需要实现了一个更加流畅的 `requestIdleCallback`。（该函数不是我们关注的重点，暂时就不实现了）
```javascript
function workLoop(deadline) {

  let shouldYield = false; // false表示不需要让出时间片/控制权

  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork); // performUnitOfWork: 执行一个任务，返回下一个任务
    shouldYield = deadline.timeRemaining() < 1; // 剩余时间小于1ms时，没有剩余时间，shouldYield置为true，表示需要让出控制权
  }
  if (!nextUnitOfWork && workInProgressRootFiber) { // 时间片到期后，还有任务还尚未完成，就需要请求浏览器再次调度
    console.log('render阶段结束');
    commitRoot();
  }

  requestIdleCallback(workLoop, { timeout: 500 }); // 不论是否有任务，都去请求调度。每一帧在浏览器完成自己的任务后，如果有剩余时间，就执行一次workLoop，确保在有任务时，能够被及时执行
}
```
我们来一起梳理一下 **`workLoop` 的任务：**
1. 调用 `performUnitOfWork` 执行一个 **“任务”**，返回它的下一个 **“任务”**（可中断的 “任务”，即为该 “任务”）
2. 判断是否存在下一个 **“任务”**，并且当前时间片还有剩余的时间
1 . 如果二者都满足，就循环地执行 **“任务”**，返回下一个 **“任务”**，执行 **“任务”**，返回下一个 **“任务”**...
2 . 如果是 **“任务”** 执行完毕，没有了下一个 **“任务”**，就表示 `rereconcileChildren阶段` 结束，接下来就开始调用 `commitRoot` 去修改 DOM
3 . 如果是时间片的时间被使用完毕，就再次调用 `requestIdleCallback`，下次执行 workLoop 函数，会延续上次被搁置的 **“任务”**，继续循环执行，直到所有的 **“任务”** 都被执行完毕

---
下面，我们就需要用倒叙的方式，来梳理其余函数的职能

---

首先，我们需要了解一个关键的函数，reconcileChildren
## 五、reconcileChildren
```javascript
function reconcileChildren(fiber, vDOMArrOfChildrenOfFiber) 
```
该函数接收两个参数
 - 第一个参数为一个 fiber 节点，也就是下面说的父 fiber
 - 第二个参数为该 fiber 节点的子虚拟 DOM 组成的数组

### reconcileChildren 的功能：

> 创建出所有的**子虚拟 DOM** 对应的 fiber 节点，父 fiber （reconcileChildren 的第一个参数）通过 child 属性与第一个子 fiber 相连接，每一个子 fiber 再通过 sibling 属性与下一个子 fiber 连接。
#### 1. 为虚拟 DOM 创建对应的 fiber
我们一起来看一下具体过程：

&ensp;&ensp;&ensp;&ensp;首先，借助 `fiber.alternate`，找到 fiber 节点在上一棵 fiber 树中，与之对应的 `oldFiber`。然后通过 child 属性获得 oldFiber 的第一个子 fiber：`oldSonFiber`，`oldSonFiber` 与 vDOMArrOfChildrenOfFiber 的第一个子虚拟 DOM 相对应。
 
&ensp;&ensp;&ensp;&ensp;在 scheduleRoot 中，我们已经知道了如何区分一个节点是第1、2、3 ... 次渲染。
```javascript
const sameType = oldSonFiber && sonVDOM && oldSonFiber.type === sonVDOM.type;
```
`sameType` 为 true：
 - 判断 `oldSonFiber` 上是否存在 `alternate` 属性，若存在，就表示该节点已经是**第 3、4、5...次渲染**了，那么我们就可以直接将上上次被渲染的节点拿过来使用（可复用）。**复用 fiber 时，并没有为 fiber 的 stateNode 属性重新赋值，这就表示其对应的真实 DOM 节点也是可以复用的。**
 - `oldSonFiber` 上不存在 `alternate` 属性，这时一定是**第 2 次渲染**，也需要重新创建一个 fiber，注意：第二次渲染一个节点时，我们需要为该节点添加 `alternate` 属性，并让其指向 `oldSonFiber`（不可复用）

（原生的 React 对是否可复用的判定逻辑及处理，会更加复杂一些，比如还会添加对 `key` 的判断等等）

`sameType` 为 false：

 - 可能是由于不存在 `oldSonFiber`，也就是说：在此之前不存在与之对应的 fiber 节点，此时可以确定当前节点一定是**第 1 次渲染**（不可复用）
 - 为 false 也有可能由于 `oldSonFiber` 与 `sonVDOM` 所指向的节点**标签名不同**，此时只能确定**该节点至少已经渲染过一次**，这两种情况都需要创建新的 fiber（不可复用）
 - `sonVDOM` 为 null 时 `sameType` 也为 false，这种情况不需要新建 fiber（不可复用）

&ensp;&ensp;&ensp;&ensp;到这里，我们就成功地**为一个虚拟 DOM 创建出其对应的 fiber 节点**，`reconcileChildren` 的第一个任务完成。

#### 2. 收集被删除的 fiber
&ensp;&ensp;&ensp;&ensp;`sameType` 为 false 的三种情况，因为都不存在对 fiber 的复用，还需要将 `oldSonFiber` 的 `effectTag` 属性标记为删除，同时将其推入删除数组 `deletions` 中。在渲染前，会先遍历该数组，将上一棵 fiber 树中对应的节点进行删除。这样在下次复用该树时，就可以避免一些干扰了。

#### 3. 将子 fiber 进行连接
&ensp;&ensp;&ensp;&ensp;接下来，需要确定该 fiber 是父 fiber 的第几个子 fiber，通过 vDOMArrOfChildrenOfFiber 的下标 `arrIndex` 就可以直接判断出来
 - arrIndex === 0 表示第一个子 fiber，为父 fiber 添加 `child` 属性，将其挂载到父 fiber 的 `child` 属性上
 - 否则表示不是第一个子 fiber，为前一个子 fiber 添加 `sibling` 属性，并将其挂载到前一个子 fiber 的 `sibling` 属性上

&ensp;&ensp;&ensp;&ensp;成功处理完了一个虚拟 DOM，借助 `oldSonFiber = oldSonFiber.sibling; ` 取出 oldSonFiber 的兄弟节点；同时让 `arrIndex` +1，取出下一个虚拟 DOM，再次执行上述方法，继续为虚拟 DOM 创建或复用 fiber。直到成功处理完 vDOMArrOfChildrenOfFiber 中所有的虚拟 DOM。

## 六、beginWork
fiber 的 tag 标识着 fiber 的种类，beginWork 的任务：

> 根据不同的种类的不同，为 fiber 创建出对应的真实 DOM，挂载到 fiber 的 stateNode 属性上。
> 取出 fiber 的子虚拟 DOM 数组，借助 reconcileChildren 将所有虚拟 DOM 转化为 fiber 并通过 child、sibling 连接起来。

### 1. `TAG_ROOT`：根 fiber（`rootFiber`）：
&ensp;&ensp;&ensp;&ensp;这种情况下，fiber 对应的真是 DOM 其实已经存在了，也就是 id 为 root 的真实 DOM 容器。我们已经在 render 中将其挂载到了 `rootFiber` 的 stateNode 上了。那么在这里，我们就只需要取出其子虚拟 DOM 数组，由 reconcileChildren 将虚拟 DOM 转化为 fiber 并连接起来。
### 2. `TAG_TEXT`：文本节点
&ensp;&ensp;&ensp;&ensp;文本节点不存在后代，也就不需要调用 reconcileChildren。只需要根据文本内容，借助`document.createTextNode(fiber.props.text)` 创建出对应的文本节点，然后绑定到 fiber 的 stateNode 属性上即可。
### 3. `TAG_HOST`：标签节点
&ensp;&ensp;&ensp;&ensp;标签节点需要借助 `document.createElement(fiber.type)` 创建出对应的标签。标签还有可能包含一些属性，如 style、onClick 以及一些一般属性，他们都存储在 fiber 的 props 属性上。
```javascript
function updateDOM(DOM, oldProps, newProps) {
  if (DOM && DOM.setAttribute){
    for (let key in oldProps) {
      if (key !== 'children') {
        if (newProps.hasOwnProperty(key)) { // 1. 原来有，现在也有 - 更新
          setProps(DOM, key, newProps[key]);
        } else {
          DOM.removeAttribute(key); // 2. 原来有，现在没 - 删除
        }
      }
    }
    for (let key in newProps) {
      if (key !== 'children') {
        if (!oldProps.hasOwnProperty(key)) { // 3. 原来没，现在有 - 增加
          setProps(DOM, key, newProps[key]);
        }
      }
    }
  }
}
function setProps(DOM, key, value) {
  if (/^on/.test(key)) { // 事件
    DOM[key.toLowerCase()] = value;
  } else if (key === 'style') { // 样式
    if (value) {
      for (let styleName in value) {
        DOM.style[styleName] = value[styleName];
      }
    }
  } else { // 一般属性
    DOM.setAttribute(key, value);
  }
}
```
我们就需要判断一个属性在 fiber 复用前，是不是已经存在了
 - 原来没有该属性
 	- 现在有
	 	- 属性是事件：借助 `DOM[key.toLowerCase()] = value;` 为 DOM 添加一个事件名同名的属性，值为事件对应的函数体
	 	- 属性是样式：借助 `DOM.style[styleName] = value[styleName];` 将属性添加到 DOM 的 style 属性中
	 	- 一般属性：借助 `DOM.setAttribute(key, value);` 将属性添加到 stateNode 指向的标签中
 - 原来有该属性
 	- 现在也有，只需要再走一遍 “原来没有，现在有” 时，对属性类型的判断逻辑，将属性值更新一下即可
 	- 现在没有，借助 `DOM.removeAttribute(key);` 删除属性

&ensp;&ensp;&ensp;&ensp;此时，我们已经将 DOM 的属性更新完成，下一步就是将 DOM 挂载到 fiber 的 stateNode 属性上。

&ensp;&ensp;&ensp;&ensp;最后依旧是拿出 fiber.props.children 存储的虚拟 DOM 数组，然后交给 reconcileChildren。

### 4. `TAG_CLASS`：类式组件

&ensp;&ensp;&ensp;&ensp;在类式组件中，需要我们实例化一个 `组件实例`，在实例化时，将组件参数作为实例化时的参数，传入 constructor 的 props 中，虚拟 DOM 就可以直接通过 this.props.xxx 获取到这些属性。
```javascript
// fiber.stateNode指向组件实例，组件实例的internalFiber指向fiber对象
fiber.stateNode = new fiber.type(fiber.props);
fiber.stateNode.internalFiber = fiber;
```
&ensp;&ensp;&ensp;&ensp;然后将 `组件实例` 绑定到 fiber 的 stateNode 属性上，再将 fiber 绑定到 `组件实例` 的 `internalFiber` 属性上。
```javascript
setState(payload) { // payload可能是对象，也可能是函数
  let update = new Update(payload);  // 将payload挂载到update对象上
  this.internalFiber.updateQueue.addUpdate(update); // updateQueue放在类组件的fiber节点internalFiber上
  scheduleRoot();
}
```
&ensp;&ensp;&ensp;&ensp;我们调用 `setState` 更新状态时，就是通过 `组件实例.internalFiber` 先拿到 fiber，然后就可以通过 `fiber.updateQueue.addUpdate(update)` 将封装好的 state 放入更新队列中。

这里就可以解释，**为什么 setState 会异步地更新 state？**

&ensp;&ensp;&ensp;&ensp;其实就是因为我们在调用 `setState` 时，并没有立即对 state 进行更新。而是先通过 `new Update(payload);` 将更新的 state 封装进一个对象中。然后将这个对象通过 `addUpdate` 添加至 fiber 的 `updateQueue` 也就是 `更新队列` 中。
```javascript
export class Update {
  constructor(payload) {
    this.payload = payload;
  }
}
```
&ensp;&ensp;&ensp;&ensp;我们与页面进行一次交互，可能会多次触发 `setState`，所有的 `setState` 参数在封装过后，都会被添加至 `更新队列` 中。`更新队列` 是一个链表结构。最后在我们为类式组件构建 fiber 时，执行一次 `fiber.stateNode.state = fiber.updateQueue.forceUpdate(fiber.stateNode.state);`，就可以通过遍历链表，一次性的将所有的 `setState` 执行完毕，然后将最新的 state 赋值给 `组件实例` 的 state 对象。
#### 总结：类式组件的执行逻辑
&ensp;&ensp;&ensp;&ensp;在 `index3.js` 中，我们调用了 `ReactDOM.render`，参数分别为类式组件和容器 DOM。

&ensp;&ensp;&ensp;&ensp;此时类式组件并没有被执行，紧接着就进入到了 `react-dom.js` 的 `render` 方法，创建 `rootFiber`，stateNode 当然关联的依旧是容器 DOM，`props.children` 中存储着类式组件。

&ensp;&ensp;&ensp;&ensp;注意！只有调用类组件实例的 `render` 方法，才会将虚拟 DOM 返回！因此我们在判定组件为类式组件时，虚要手动调用 `fiber.stateNode.render();` 方法，为的就是拿到类式组件 调用 render 函数后，return 的虚拟 DOM，这样才能再去执行 reconcileChildren 函数。

&ensp;&ensp;&ensp;&ensp;类式组件 return 的虚拟 DOM 是一个对象，而 reconcileChildren 处理的是虚拟 DOM 数组，所以我们还需要将其放至一个数组中，然后再传入 reconcileChildren。
### 5. `TAG_FUNCTION`：函数式组件
&ensp;&ensp;&ensp;&ensp;首先，我们需要指定两个全局变量：`funComponentFiber`、`hookIndex`，作用我们后面再讨论。

&ensp;&ensp;&ensp;&ensp;函数式组件不需要为其实例化对象，所以由 begin 进入对应处理函数 `updateFunctionComponent` 时，需要做的事情也就很少。只需要将 **“函数组件对应的 fiber”** 赋给 `funComponentFiber`。

&ensp;&ensp;&ensp;&ensp;其次，需要为每个函数式组件添加一个 `hooks` 属性，用来存储组件中添加的一个个 hook。

&ensp;&ensp;&ensp;&ensp;紧接着需要初始化 `hookIndex`，`hooks` 是一个数组，里面的每一个 hook 都和 `hookIndex` 相对应。下次渲染时都需要先对 `hookIndex` 初始化，才能依次拿到初次渲染时创建的 hook。

&ensp;&ensp;&ensp;&ensp;我们知道，**调用函数式组件中的函数，即可拿到被返回的虚拟 DOM。** 调用的同时，将函数组件的参数传递到函数中，这样虚拟 DOM 就可以通过 props.xxx 拿到对应的参数值。

&ensp;&ensp;&ensp;&ensp;拿到了被返回的虚拟 DOM，剩下的任务依旧是交给 reconcileChildren。
#### 核心：hooks
&ensp;&ensp;&ensp;&ensp;分析完了函数式组件，不如趁热打铁，顺带分析一下 hooks 中的 `useReducer` 是如何工作的。

`useState` 基于 `useReducer`，这里我们就重点分析一下 `useReducer`。

我们一起来回忆一下 **`useReducer` 的用法：**
```javascript
const ADD = 'ADD';
function reducer(state, action) {
  switch (action.type) {
    case ADD:
      return {count: state.count+1};
  
    default:
      return state;
  }
}

function FunctionCounter(props){
  const [countState, dispatch] = React.useReducer(reducer, {count: 0});
  return (
    <div>
	  <div>{countState.number}</div>
      <button onClick={dispatch({ type: ADD })}>戳一下 +1</button>
    </div>
  )
}
ReactDOM.render(
  <FunctionCounter name="计数器"/>,
  document.getElementById('root')
)
```
`useReducer` 接收两个参数：
 - 能够根据 “行为” 对 state 进行处理的 `reducer`
 - 初始状态 `initialValue`

从使用来看，可以知道 `useReducer` 返回了一个数组，数组中一定包含这两个数据：
 - **状态**
 - 能够改变状态的 **dispatch** 函数

拿到 dispatch 后，可以通过向 dispatch 传递指定的 “行为”，来改变 countState 的值。

我们来分析一下 `useReducer` 具体是如何**实现**的：
```javascript
let hook = funComponentFiber.alternate && // 第一次渲染时 hook 值为 undefined
  funComponentFiber.alternate.hooks && 
  funComponentFiber.alternate.hooks[hookIndex];

if (hook) { // 第2、3...次渲染
  hook.state = hook.updateQueue.forceUpdate(hook.state); 
} else { // 第1次渲染
  hook = {
    state: initialValue,
    updateQueue: new UpdateQueue()
  }
}
```
&ensp; &ensp; &ensp;第一次渲染时，用 `funComponentFiber` 存储：为函数式组件创建的第一个 fiber，此时的 `funComponentFiber` 并没有 alternate 属性；
&ensp; &ensp; &ensp;第二次渲染时，`funComponentFiber` 存储为函数式组件创建的第二个 fiber，此时 `funComponentFiber.alternate` 指向了在第一次渲染时，为函数式组件创建的第一个 fiber。
这样，通过 alternate 属性我们就可以知道当前是否为第一次渲染。

**假设我们在组件中调用了两次 useReducer，为组件添加了两个 hook**
```javascript
const [countState1, dispatch] = React.useReducer(reducer, {count1: 0}); // 第一个 hook
const [countState2, dispatch] = React.useReducer(reducer, {count2: 0}); // 第二个 hook
```
&ensp;&ensp;&ensp;&ensp;页面初次渲染，执行至组件第一次调用 `React.useReducer`，于是进入 `useReducer` 函数，通过 alternate 判定为组件第一次被渲染。首先新建一个 `updateQueue` `更新队列`，与初始的 state 一并封装进一个名为 `hook` 的对象中。
&ensp;&ensp;&ensp;&ensp;然后通过 `funComponentFiber.hooks[hookIndex++] = hook;` 将该 `hook` 对象添加至函数式组件对应 fiber 的 hooks 属性中，同时让 `hookIndex +1`。此时 `hookIndex = 0` 就与第一个 `hook` 绑定。
&ensp;&ensp;&ensp;&ensp;最后返回一个数组，数组第一个元素即为我们需要的 state，此时它里面存储着初始化的 state：{count1: 0}；第二个元素为函数 `dispatch`。

&ensp;&ensp;&ensp;&ensp;紧接着，由于我们又调用了一次 `React.useReducer`，进入 `useReducer` 函数后，通过 alternate 发现组件依旧是第一次被渲染，那么再创建一个 `hook` 对象。
&ensp;&ensp;&ensp;&ensp;此时 `hookIndex` = 1，通过 `funComponentFiber.hooks[hookIndex++] = hook;` 将第二个 `hook` 对象添加至函数式组件的 hooks 属性中。`hookIndex = 1` 就与第二个 `hook` 绑定。
```javascript
const dispatch = action => { // action: {type: ADD}
  // reducer:
  // function reducer(state, action) {
  //   switch (action.type) {
  //     case ADD:
  //       return {count: state.count+1};
  //     default:
  //       return state;
  //   }
  // }
  let payload = reducer ? reducer(hook.state, action) : action; // 传入reducer时，就根据reducer和对应的action计算出对应的state
  hook.updateQueue.addUpdate(
    new Update(payload)
  );
  scheduleRoot();
}
```
&ensp;&ensp;&ensp;&ensp;点击第二个 `hook` 关联的按钮，触发点击事件。首先，向 `dispatch` 传入一个 “行为” { type: ADD } 并调用该函数，函数首先通过 `reducer` 根据 “行为” 计算出更改后的 state，保存在变量 `payload` 中。然后借助 `addUpdate` 将该 state 添加至 `更新队列` 中，同时让第二个 `hook` 的 `firstUpdate`、`lastUpdate` 均指向该 state。最后借助 `scheduleRoot();` 重新渲染一下页面。

**进入第二次渲染**

&ensp;&ensp;&ensp;&ensp;调用 `scheduleRoot` 函数会更新 `workInProgressRootFiber` 与 `nextUnitOfWork` 的值。
&ensp;&ensp;&ensp;&ensp;`requestIdleCallback(workLoop, { timeout: 500 });` 调用 `workLoop` 时发现存在 `nextUnitOfWork`，于是开始通过 `performUnitOfWork` 调用 `beginWork`。
&ensp;&ensp;&ensp;&ensp;当前组件为函数式组件，于是通过 `beginWork` 进入 `updateFunctionComponent` 函数，在该函数中**将 hookIndex 置为 0**，执行到 `const vDOMArrOfChildrenOfFiber = [fiber.type(fiber.props)];` 时，开始**调用函数式组件**。

&ensp;&ensp;&ensp;&ensp;注意！虽然我们只点击了绑定第二个 `hook` 的按钮，似乎与第一个 `useReducer` 无关，但由于触发第二次渲染时，执行的是 **“调用函数式组件”**，所以依旧会走两遍 `React.useReducer`。

**首次调用 React.useReducer**

&ensp;&ensp;&ensp;&ensp;在 `useReducer` 中，通过 alternate 发现当前并非第一次渲染，于是，先借助 `funComponentFiber.alternate.hooks[0];` 拿到上一次为函数式组件创建的 fiber，其 hooks 属性中存储的第一个 `hook`。用 hook 变量存储。
&ensp;&ensp;&ensp;&ensp;那么 hook.state 就表示上次渲染时的 state，将其传入 `forceUpdate` 函数。我们并未点击第一个 `useReducer` 对应的按钮，所以不会触发第一个 `hook` 的 `addUpdate` 方法，因此其 `firstUpdate` 属性为 null。那么在 `forceUpdate` 函数中就会直接借助 return state; 将老的 state 返回，并将其存储在 `hook` 的 state 属性中。
&ensp;&ensp;&ensp;&ensp;然后借助 `funComponentFiber.hooks[hookIndex++] = hook;` 将上面处理好的 `hook` 放到：第二次渲染为函数式组件创建的 fiber 的 hooks 中，同时让 hookIndex + 1，然后 return。
&ensp;&ensp;&ensp;&ensp;注意！此时仅仅改变了第一个 `useReducer` 中的 state。

**第二次调用 React.useReducer**

&ensp;&ensp;&ensp;&ensp;第二次调用 `React.useReducer` 时 hookIndex 已从 0 变为 1，因此获取的就是第二个 `hook`。执行 `forceUpdate` 时发现 `hook.firstUpdate` 并不为空，其次，我们知道 `payload` 是一个对象，其内部存储着点击按钮时，计算出的最新的 state，此时就需要将 state 赋给 nextState，然后借助 `state = { ...state, ...nextState }` 对点击按钮前后的 state 进行一个合并，return 出去后赋给 hook.state，最后将 hook 存放至：第二次渲染时，为函数式组件创建的 fiber，其 hooks 下标为 1 的位置。

> 总结： 
> 函数式组件被初次渲染时，并不会执行 useReducer 函数中的 dispatch 函数。 
> 触发点击事件，首先执行 dispatch 函数，该函数末尾的 scheduleRoot(); 导致函数式组件被再次渲染。 
> 再次渲染时会和初次渲染一样，将 useReducer 整个函数除 dispatch 都走一遍，而非有些文章说的：再次渲染时不执行 useReducer 函数！

分析完了 `useReducer`，`useState` 的实现就显得十分简单了：
```javascript
export function useState(initialValue) {
  return useReducer(null, initialValue); 
}
```
`useState` 在初次、再次渲染时的执行流程，就作为一道思考题留给大家了，相信屏幕前的你一定可以完美地分析出来~
## 八、performUnitOfWork
&ensp;&ensp;&ensp;&ensp;上面我们讲，由 `performUnitOfWork` 来完成一个**任务**，然后返回下一个**任务**。到这里我们就明白了，**一个任务，其实就是指：先为传入的 fiber 创建其对应的真实 DOM，然后将其所有的子虚拟 DOM 转化为 fiber 并连接起来，最后将第一个子 fiber 返回。**
&ensp;&ensp;&ensp;&ensp;严格来说，我们应该这么概述这一过程：传入一个 fiber 即分片，处理完该分片后返回下一个分片。
```javascript
function workLoop(deadline) {
  let shouldYield = false; // false表示不需要让出时间片/控制权
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork); // performUnitOfWork: 执行一个任务，返回下一个任务
    shouldYield = deadline.timeRemaining() < 1; // 剩余时间小于1ms时，没有剩余时间，shouldYield置为true，表示需要让出控制权
  }
  ...
}

function performUnitOfWork(fiber) {
  beginWork(fiber); // beginWork每执行一次，就会将一个fiber的子虚拟DOM全部转化为fiber并借助child、sibling将所有的fiber连接起来
  if (fiber.child) {
    return fiber.child;
  }
  while (fiber) {
    completeUnitOfWork(fiber); // 将产生了变化的fiber用firstEffect、nextEffect、lastEffect连接起来
    if (fiber.sibling) {
      return fiber.sibling; // 然后找弟弟节点
    }
    fiber = fiber.return; // 没有弟弟，先回溯到父亲，就可以让父亲完成
  }
}
```
通过截取的这两段代码可以看的出来
### 1. `performUnitOfWork` 的第一个任务
&ensp;&ensp;&ensp;&ensp;借助 `beginWork` 为传入的 fiber 创建其对应的真实 DOM，然后将其所有的子虚拟 DOM 转化为 fiber 并连接起来，然后将第一个子 fiber 返回。
&ensp;&ensp;&ensp;&ensp;`workLoop` 的 while 循环会一直通过 `performUnitOfWork` 遍历获取 fiber 的第一个子 fiber，直到遇到某个 fiber 其不存在子元素，第一个任务结束！
### 2. `performUnitOfWork` 的第二个任务
&ensp;&ensp;&ensp;&ensp;接下来就需要进入到 `performUnitOfWork` 的 while 循环中，交由 `completeUnitOfWork` 将 fiber 正确地添加进 `Effect List` 链表中，具体的添加方式在 `九、completeUnitOfWork` 会详细介绍。while 循环在 fiber 存在弟弟节点时，返回弟弟节点，被返回的弟弟节点会先进入到 `performUnitOfWork` 的 `beginWork` 中，为其创建真实 DOM 及连接子 fiber；如果没有弟弟节点，就先回溯到父节点，将父节点通过 `completeUnitOfWork` 链入 `Effect List`，然后判断父节点是否存在弟弟节点，没有继续向上回溯...
## 九、completeUnitOfWork
> 任务：调整节点的 firstEffect、lastEffect、nextEffect 指向
> （调用一次 completeUnitOfWork，可能同时涉及到对多个节点的调整）
> firstEffect：指向以该节点为root，所在树的第一个child为null的节点
> lastEffect：指向以该节为root，所在树下一层的最后一个节点
> nextEffect：指向以深度优先遍历方式，遍历整棵树时，其遍历的下一个节点。注意，nextEffect 不会连接根节点

&ensp;&ensp;&ensp;&ensp;举个例子，以 D 节点为 root，这棵树就包括 D、G、H，`D.firstEffect` 指向这棵树中第一个 child 为 null 的 G，`D.lastEffect` 指向下一层最后一个节点 H。以 A 节点为 root，这棵树包括 A、C、D、E、F、G、H，`A.firstEffect` 指向这棵树中第一个 child 为 null 的 E，`A.lastEffect` 指向下一层最后一个节点 D。
```javascript
function completeUnitOfWork(fiber) {
  let returnFiber = fiber.return;
  // ①
  if (returnFiber) {
    // ②
    if (!returnFiber.firstEffect) {
      returnFiber.firstEffect = fiber.firstEffect;
    }
    // ③
    if (fiber.lastEffect) {
      // ④
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = fiber.firstEffect;
      }
      // ⑤
      returnFiber.lastEffect = fiber.lastEffect;
      
    }

    const effectTag = fiber.effectTag;
    // ⑥
    if (effectTag) {
      // ⑦
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = fiber;
      // ⑧
      } else {
        returnFiber.firstEffect = fiber;
      }
      // ⑨
      returnFiber.lastEffect = fiber;
    }
  }
}
```
该函数绝对是我认为最漂亮的一个设计！

以下图的几个节点为例，当前状态是发现 fiber E 的 child 为 null，于是开始进入 `performUnitOfWork` 的 while 循环，E 首先被传入 `completeUnitOfWork`
![在这里插入图片描述](https://img-blog.csdnimg.cn/581eef3ebd664967a1ef5a3ee4fe12d4.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ouv5pWR5LiW55WM55qE5YWJ5aSq6YOO,size_20,color_FFFFFF,t_70,g_se,x_16)
 -  ① E 存在父 fiber C
 - ② C 不存在 firstEffect，将 A 的 firstEffect undefined 赋给 C 的 firstEffect
 - ⑥ E 发生变化
 - ⑧ C 不存在 lastEffect，C 的 firstEffect 指向 E
 - ⑨ C 的 lastEffect 指向 E

`completeUnitOfWork` 执行完毕：
![在这里插入图片描述](https://img-blog.csdnimg.cn/585d6cd3e5124092add46c0c8f6c1c29.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ouv5pWR5LiW55WM55qE5YWJ5aSq6YOO,size_20,color_FFFFFF,t_70,g_se,x_16)
**E 存在弟弟节点 F，F 被返回**。

F 作为 `performUnitOfWork` 的参数，因为不存在子元素，所以 `beginWork` 为其创建了一个真实 DOM 后，就完成了工作。F 的 child属性为 null，于是进入 while 循环，将 F 作为参数执行 `completeUnitOfWork`：
 - ① F 存在父 fiber C
 - ⑥ E 发生变化
 - ⑦ C 的 lastEffect 指向 E，让 E 的 nextEffect 指向 F
 - ⑨ C 的 lastEffect 指向 F

`completeUnitOfWork` 执行完毕：
![在这里插入图片描述](https://img-blog.csdnimg.cn/0666158aeae24cd581e88f442d1a29f6.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ouv5pWR5LiW55WM55qE5YWJ5aSq6YOO,size_20,color_FFFFFF,t_70,g_se,x_16)
F 不存在弟弟节点，回溯到F的父节点C
将 C 传入`completeUnitOfWork`：
 - ① C 存在父 fiber A
 - ② A 不存在 firstEffect 属性，让 A 的 firstEffect 指向 C 的 firstEffect 指向的 E
 - ③ C 存在 lastEffect 属性
 - ⑤ 让 A 的 lastEffect 指向 C 的 lastEffect 指向的 F
 - ⑥ C 发生更改
 - ⑦ A 的 lastEffect 指向 F，让 F 的 nextEffect 指向 C
 - ⑨ 让 A 的 lastEffect 指向 C

`completeUnitOfWork` 完成：
![在这里插入图片描述](https://img-blog.csdnimg.cn/ee56d25adf794ce6b7f30a306ead1591.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ouv5pWR5LiW55WM55qE5YWJ5aSq6YOO,size_20,color_FFFFFF,t_70,g_se,x_16)
**C 存在弟弟节点 D，于是将 D 返回。**

将 D 作为参数传递到 `performUnitOfWork` 中，`beginWork` 将 D 的子虚拟 DOM G、H 创建出对应的 fiber，并借助 child、sibling 连接起来。

D 的 child 指向 G，将 G 返回，为 G 创建真实 DOM 后，发现其 child 为 null，再次进入 `performUnitOfWork` 的 while 循环，首先将 G 传入 `completeUnitOfWork`：
① G 存在父 fiber D
② D 不存在 firstEffect 属性，让其 firstEffect 指向 G 的 firstEffect undefined
⑧ D 不存在 lastEffect 属性，让 D 的 firstEffect 指向 G
⑨ 让 D 的 lastEffect 指向 G
`completeUnitOfWork(G)` 完成，**G存在弟弟节点H，返回H。**

H 进入 `beginWork`，创建完真实 DOM 后，发现其 child 为 null，进入 `performUnitOfWork` 的 while 循环，首先将 G 传入`completeUnitOfWork`：
① H 存在父节点 D，
⑦ D 的 lastEffect 指向 G，让 G 的 nextEffect 指向 H
⑨ 让 D 的 lastEffect 指向 H
`completeUnitOfWork(H)` 完成，H 不存在弟弟节点，回溯到父亲节点 D。

将 D 传入 `completeUnitOfWork`：
① D 存在父 fiber A
③ D 的 lastEffect 指向 H
④ A 的 lastEffect 指向 C，让 C 的 nextEffect 指向 D 的 firstEffect G
⑤ 让 A 的 lastEffect 指向 D 的 lastEffect H
⑦ A 的 lastEffect 指向 H，让 H 的 nextEffect 指向 D
⑨ 让 A 的 lastEffect 指向 D
`completeUnitOfWork(D)` 完成，D 不存在弟弟节点，回溯到父亲节点 A。

将 A 传入 `completeUnitOfWork`：
① A 存在父节点 R
② R 不存在 firstEffect，让 R 的 firstEffect 指向 A 的 firstEffect 指向的 E
③ A 存在 lastEffect
⑤ 让 R 的 lastEffect 指向 A.lastEffect 指向的 D
⑦ R 的 lastEffect 指向 D，让 D 的 nextEffect 指向A
⑨ 让 R 的 lastEffect 指向A
`completeUnitOfWork(A)` 完成，A 不存在弟弟节点，回溯到父亲节点 R。

将 R 传入 `completeUnitOfWork`：
由于 R 不存在父节点，函数执行完毕。
最终得到了一个这样的 `Effect List ` 链表：
![在这里插入图片描述](https://img-blog.csdnimg.cn/fcf3c03a1cdb4277b81457f17f24ca38.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ouv5pWR5LiW55WM55qE5YWJ5aSq6YOO,size_20,color_FFFFFF,t_70,g_se,x_16)
删除一些不必要的线，就得到了真正的 `Effect List` 链表：
![在这里插入图片描述](https://img-blog.csdnimg.cn/61a4ab9178c24a409199d19134bc2542.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ouv5pWR5LiW55WM55qE5YWJ5aSq6YOO,size_20,color_FFFFFF,t_70,g_se,x_16)

fiber.return 为 undefined，退出 `performUnitOfWork` 的 while 循环，`performUnitOfWork` 执行完毕，此次执行完毕并没有返回任何 fiber，于是退出 `workLoop` 的 while 循环，打印 “render 阶段结束”，开始执行 `commitRoot`。
## 九、commitRoot
首先遍历 `deletions` 数组，删除上一棵 fiber 中所有 `effectTag` 被标记 `DELETION` 的 fiber 节点。

从根节点 firstEffect 指向的节点开始，根据 fiber.type 即 DOM 操作方式，更新 DOM 树。

完成！

