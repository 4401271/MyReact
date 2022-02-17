import { ELEMENT_TEXT, TAG_ROOT, TAG_HOST, TAG_TEXT, TAG_CLASS, PLACEMENT, UPDATE, DELETION } from './constants'

/* 
  从根节点开始渲染和调度，包含了两个阶段：
  diff 阶段：对比新旧虚拟DOM进行增量更新或创建
    特点：比较花费时间，需要我们对任务进行拆分。拆分维度：虚拟DOM节点，一个DOM节点对应一个任务【此阶段可以暂停】
    （开始渲染时，浏览器先去分配时间片，在一个时间片中，执行我们的任务，执行完一个任务，看是否还有时间，有时间就去执行下一个任务，没有时间就将执行权再交给浏览器）

  render 阶段：获得一个effect list，保存着：更新、删除、增加的节点
    任务：
      1. 根据虚拟DOM生成fiber树
      2. 收集effect list

  commit 阶段：进行DOM创建、更新
    特点：【此阶段不能暂停】主要是为了保证页面渲染的连续
*/

let workInProgressRootFiber = null; // 当前正在创建、渲染的fiber树的根fiber。渲染时用，保存的根fiber，对应着真实DOM容器container，也就是'#root'对应的真实DOM
let nextUnitOfWork = null; // 当前、下一个工作单元

/**
 * scheduleRoot 作用：将虚拟 DOM Tree 的每一个节点创建出对应的 fiber 形成一个 fiber 树
 * @param rootFiber 根fiber
 */
export function scheduleRoot(rootFiber) {
  workInProgressRootFiber = rootFiber;
  nextUnitOfWork = rootFiber;
}


/**
 * 循环执行任务
 * @param deadline 截止时间
 */
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

  // TODO: expirationTime React中的优先级【重要】
  requestIdleCallback(workLoop, { timeout: 500 }); // 不论是否有任务，都去请求调度。每一帧在浏览器完成自己的任务后，如果有剩余时间，就执行一次workLoop，确保在有任务时，能够被及时执行
}


/**
 * performUnitOfWork的作用：
 * 1. 通过beginWork创建fiber，构造一条由child、sibling连接的链表
 * 2. 通过completeUnitOfWork构建Effect List
 * @param {*} fiber
 * @returns
 */
function performUnitOfWork(fiber) {
  beginWork(fiber); // 为fiber的子虚拟DOM（发生变化）创建对应的fiber，同时通过child、sibling形成一个链表

  if (fiber.child) {
    return fiber.child;
  }

  while (fiber) {
    completeUnitOfWork(fiber); // 没有子节点时，先让自己完成，也就是构建Effect List【从这里可以看出，Effect List的创建是通过深度优先遍历：左-右-根】
    if (fiber.sibling) {
      return fiber.sibling; // 然后找弟弟节点
    }
    fiber = fiber.return; // 没有弟弟，先回溯到父亲，就可以让父亲完成
  }
}

/**
 * beginWork的作用：
 * 中转站，根据不同的类型的fiber，调用不同的update
 * @param {*} fiber
 */
function beginWork(fiber) {

  if (fiber.tag === TAG_ROOT) { // 根Fiber
    updateHostRoot(fiber);
  } else if (fiber.tag === TAG_TEXT) { // 文本节点
    updateHostText(fiber);
  } else if (fiber.tag === TAG_HOST) { // 普通节点
    updateHost(fiber);
  } 

}

// --------------------------------  update*** 的任务： -------------------------------- 
// 1. 创建fiber对应的真实DOM节点，挂到fiber的stateNode属性上
// 2. 获取传入的fiber的子虚拟DOM，然后交给reconcileChildren

/**
 * RootFiber比较特殊，其不需要创建真实DOM，其对应的真实DOM就是'#root'
 * @param {*} fiber
 */
function updateHostRoot(fiber) {
  let vDOMArrOfChildrenOfFiber = fiber.props.children; // fiber的子虚拟DOM，对应上面fiber的[element]
  reconcileChildren(fiber, vDOMArrOfChildrenOfFiber); // 创建子fiber
}
function updateHostText(fiber) {
  if (!fiber.stateNode) {
    fiber.stateNode = createDOM(fiber);
  }
}
// HTML DOM元素在进行更新时，需要创建对应的真实DOM，然后同时为其子虚拟DOM创建fiber
function updateHost(fiber) {
  if (!fiber.stateNode) {
    fiber.stateNode = createDOM(fiber);
  }
  const vDOMArrOfChildrenOfFiber = fiber.props.children;
  reconcileChildren(fiber, vDOMArrOfChildrenOfFiber); // 创建子fiber
}
// ------------------------------------------------------------------------------------

/**
 * reconcileChildren的作用
 * 1. 将fiber全部的子虚拟DOM（子虚拟DOM指第一层子虚拟DOM，并非所有子虚拟DOM）转化为fiber并连接起来 ！！DOM diff的核心就在此处
 * 2. 把新元素和老元素进行比较，构建出一条effect list
 * @param {*} fiber 
 * @param {*} sonVDOMArr fiber的后代虚拟DOM数组，但是在reconcileChildren中，仅将fiber的第一层后代虚拟DOM创建出对应的fiber并连接起来
 */
function reconcileChildren(fiber, sonVDOMArr) {
  let sonVDOMArrIndex = 0; // 子虚拟DOM下标
  let preFiber; // 保存上一次传递进来的fiber（和形参fiber属于同一棵树）

  // 遍历sonVDOMArr第一层的虚拟DOM
  while (sonVDOMArrIndex < sonVDOMArr.length) {
    let sonVDOM = sonVDOMArr[sonVDOMArrIndex];
    let tag;

    if (sonVDOM.type === ELEMENT_TEXT) {  // 我们在创建虚拟DOM时，文本节点的type会被指定为ELEMENT_TEXT
      tag = TAG_TEXT;
    } else if (typeof sonVDOM.type === 'string') {
      tag = TAG_HOST; // 原生DOM节点sonVDOM.type: 'div'、'li'、'ul'
    }

    let newFiber = {
      tag, // ELEMENT_HOST
      type: sonVDOM.type, // 'div'
      props: sonVDOM.props,  // {id="A1" style={style}}
      stateNode: null, // 此时div节点还没有创建真实DOM
      return: fiber, // 每个fiber的return都指向它们的父fiber
      // updateQueue: new UpdateQueue(),
      effectTag: PLACEMENT, // 副作用标识，render阶段我们会收集增加PLACEMENT、删除DELETE、更新UPDATE的fiber，其实只有NOWORK的不作处理

      nextEffect: null // effect list是一个单链表，该链表上保存着所有的 “发生了变化” 的fiber【连接方式对应深度优先遍历】
    }

    // 创建一条由child、sibling构建的链表
    if (newFiber) {
      if (sonVDOMArrIndex == 0) {
        fiber.child = newFiber; // 索引为0时，表示newFiber是父fiber的第一个子fiber，此时让父fiber的child属性指向该newFiber
      } else {
        preFiber.sibling = newFiber; // 索引不为0时，就表示该newFiber是父fiber的第2、3...个子fiber，需要让该fiber挂到上一个子fiber的后面
      }
      preFiber = newFiber;
    }

    sonVDOMArrIndex++;
  }
}

/**
 * 根据“文本”或者是“标签”创建对应的 TEXT文本 或者是 DOM节点
 * @param {*} fiber 
 * @returns 
 */
function createDOM(fiber) {
  if (fiber.tag === TAG_TEXT) {
    return document.createTextNode(fiber.props.text);
  } else if (fiber.tag === TAG_HOST) { // 'div'
    let stateNode = document.createElement(fiber.type);
    updateDOM(stateNode, {}, fiber.props);
    return stateNode;
  }
}

/**
 * 遍历保存属性的newProps，通过setProps方法将遍历出来的属性添加到对应的DOM上
 * @param {*} DOM 
 * @param {*} oldProps 
 * @param {*} newProps 
 * @returns 
 */
function updateDOM(DOM, oldProps, newProps) {
  for (let key in newProps) {
    if (key !== 'children') {
      setProps(DOM, key, newProps[key]);
    }
  }
}

/**
 * 将属性创建添加到DOM上
 * @param {*} DOM 
 * @param {*} key 
 * @param {*} value 
 */
function setProps(DOM, key, value) {
  if (/^on/.test(key)) { // 点击事件
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

/**
 * 收集有副作用的fiber，组成Effect List
 * @param {*} fiber 
 */
function completeUnitOfWork(fiber) {
  let returnFiber = fiber.return;
  
  if (returnFiber) {
    if (!returnFiber.firstEffect) {
      // 1. 把当前节点的“first子节点”挂到父节点的first指针上(→5)
      returnFiber.firstEffect = fiber.firstEffect;
    }
    if (fiber.lastEffect) {
      if (returnFiber.lastEffect) {
        // 5.(→9)
        returnFiber.lastEffect.nextEffect = fiber.firstEffect;
      }
      // 2. 把当前节点的“last子节点”挂到父节点的last指针上(→6)
      returnFiber.lastEffect = fiber.lastEffect;
      
    }

    const effectTag = fiber.effectTag;
    if (effectTag) {
      if (returnFiber.lastEffect) {
        // 3. 更改当前节点last子节点的nextEffect指针指向当前节点(→7)
        returnFiber.lastEffect.nextEffect = fiber;
      } else {
        returnFiber.firstEffect = fiber;
      }
      // 4. 同时更改父节点的last指针也指向当前节点(→8)
      returnFiber.lastEffect = fiber;
    }
  }
}

/**
 * 从根节点的 firstEffect 开始遍历 Effect 链表
 */
function commitRoot() {

  let fiber = workInProgressRootFiber.firstEffect; // 取出根节点的 firstEffect 指向的节点
  while (fiber) {
    console.log('fiber: ', fiber);
    commitWork(fiber);
    fiber = fiber.nextEffect;
  }

  workInProgressRootFiber = null;
}

// 将所有产生副作用的fiber进行对应的操作：新增的节点创建DOM并挂载到父DOM上、需要删除的节点直接从父元素上清除对应的子元素、更新对应DOM，最终需要将当前节点的effectTag置为空
/**
 * 将 fiber 对应的真实 DOM 映射到 DOM 树上（增、删、改）
 * @param {*} fiber 
 * @returns 
 */
function commitWork(fiber) {
  if (!fiber) return;
  let returnFiber = fiber.return;

  let returnDOM = returnFiber.stateNode;

  if (fiber.effectTag === PLACEMENT) { // 增加元素
    returnDOM.appendChild(fiber.stateNode); // returnDOM.appendChild(nextFiber.stateNode);
  } 

  fiber.effectTag = null;
}

/**
 * 在浏览器完成自己的重要任务后，如果该时间片还有剩余时间，请求浏览器赶紧来执行workLoop的任务
 * 但是如果超过了500ms仍未执行，那么不管当前时间片是否还有剩余时间，都要执行workLoop中的任务
 */
requestIdleCallback(workLoop, { timeout: 500 });