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

let workInProgressRootFiber = null; // 当前正在创建、渲染的fiber树的根fiber —— 在渲染时用，保存的根fiber，对应着真实DOM容器container，也就是'#root'对应的真实DOM
let currentRenderRootFiber = null; // 上次渲染的fiber树的根fiber —— 渲染过后，currentRenderRootFiber保存着当前fiber树的根fiber，将workInProgressRootFiber置空
let nextUnitOfWork = null; // 当前、下一个工作单元

let deletions = [];  //删除的节点都放在这里，而不放在Effect List内

/**
 * scheduleRoot 作用：将虚拟 DOM Tree 的每一个节点创建出对应的 fiber 形成一个 fiber 树
 * @param rootFiber 根fiber
 */
export function scheduleRoot(rootFiber) {
  /* 
    双缓冲机制：减少新建对象所浪费的空间和时间
      第1次渲染时，currentRenderRootFiber为空
      第2次渲染，currentRenderRootFiber不为空，但是alternate属性为空
      第3、4...次渲染，currentRenderRootFiber.alternate均有值
  */
  if (currentRenderRootFiber && currentRenderRootFiber.alternate) { // 第3、4...次渲染
    workInProgressRootFiber = currentRenderRootFiber.alternate;
    workInProgressRootFiber.props = rootFiber.props;
    workInProgressRootFiber.alternate = currentRenderRootFiber;
  } else if (currentRenderRootFiber) { // 第2次渲染
    rootFiber.alternate = currentRenderRootFiber;
    workInProgressRootFiber = rootFiber;
  } else { // 第1次渲染
    workInProgressRootFiber = rootFiber;
  }

  workInProgressRootFiber.firstEffect = workInProgressRootFiber.lastEffect = workInProgressRootFiber.nextEffect = null;
  nextUnitOfWork = workInProgressRootFiber;
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
 * reconcileChildren的作用   ！！DOM diff的核心就在此处
 * 1. 将fiber全部的子虚拟DOM（子虚拟DOM指第一层子虚拟DOM，并非所有子虚拟DOM）转化为fiber并连接起来
 * 2. 把新元素和老元素进行比较，构建出一条汇集了增、改fiber的链表“effect list”与被保存了老fiber树中被删除fiber的“deletions”
 * @param {*} fiber 
 * @param {*} sonVDOMArr fiber的后代虚拟DOM数组，但是在reconcileChildren中，仅将fiber的第一层后代虚拟DOM创建出对应的fiber并连接起来
 */
function reconcileChildren(fiber, sonVDOMArr) {
  let sonVDOMArrIndex = 0; // 子虚拟DOM下标
  let preFiber; // 保存上一次传递进来的fiber（和形参fiber属于同一棵树）
  let oldSonFiber = fiber.alternate && fiber.alternate.child; // oldSonFiber表示fiber在上次渲染的currentFiber Tree中对应的“子节点”（和当前渲染对应的Fiber Tree并非同一棵树）

  // 遍历sonVDOMArr第一层的虚拟DOM
  while (sonVDOMArrIndex < sonVDOMArr.length || oldSonFiber) {
    let sonVDOM = sonVDOMArr[sonVDOMArrIndex];
    let newFiber; // 新的fiber
    let tag;

    // 这里单独写上sonVDOM，是因为在删除一个节点时，sonVDOM为null，再取type就会报错
    if (sonVDOM && sonVDOM.type === ELEMENT_TEXT) {  // 我们在创建虚拟DOM时，文本节点的type会被指定为ELEMENT_TEXT
      tag = TAG_TEXT;
    } else if (sonVDOM && typeof sonVDOM.type === 'string') {
      tag = TAG_HOST; // 原生DOM节点sonVDOM.type: 'div'、'li'、'ul'
    }

    const sameType = oldSonFiber && sonVDOM && oldSonFiber.type === sonVDOM.type; // 判断老fiber的标签和虚拟DOM的标签是否相同，相同则可以复用

    // 更新（复用）、创建fiber
    if (sameType) { // 虚拟DOM和上次渲染时对应的fiber类型相同时，大部分属性都可以沿用之前的，只需更新props属性和effectTag
      newFiber = {
        tag: oldSonFiber.tag,
        type: oldSonFiber.type,
        props: sonVDOM.props, // 这里必须使用新的虚拟DOM的props
        stateNode: oldSonFiber.stateNode,
        return: fiber,
        effectTag: UPDATE,
        alternate: oldSonFiber, // 让新fiber的alternate属性指向老的fiber
        nextEffect: null
      }
    } else {  // 类型不相同时，需要重新创建fiber
      if (sonVDOM) {  // 避免sonVDOM的值为null
        newFiber = {
          tag, // ELEMENT_HOST
          type: sonVDOM.type, // 'div'
          props: sonVDOM.props,  // {id="A1" style={style}}
          stateNode: null, // 此时div节点还没有创建真实DOM
          return: fiber, // 每个fiber的return都指向它们的父fiber
          // updateQueue: new UpdateQueue(),
          effectTag: PLACEMENT, // 副作用标识，render阶段我们会收集增加PLACEMENT、删除DELETE、更新UPDATE的fiber，其实只有NOWORK的不作处理

          nextEffect: null // effect list是一个单链表，该链表上保存着所有的 “发生了变化” 的fiber【连接方式对应深度优先遍历】
        }
      }
      if (oldSonFiber) {
        oldSonFiber.effectTag = DELETION; // 将老的fiber树中的对应节点标记为删除
        deletions.push(oldSonFiber);
      }
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

    /* 
      现在的移动方式其实并不完善
      例如：
        1. 当老fiber tree中有一个节点在虚拟DOM中不存在，该节点被标记为删除，那么就可能出现下一个fiber与当前虚拟DOM刚好对应上，此时就只需要让fiber向后移动，而虚拟DOM不需要移动，在标记删除的情况下，移动也本应如此
        2. 新增同理，fiber tree中没有，而虚拟DOM中有，此时就只需让虚拟DOM的下标+1，而不需要让fiber链表后移
        ...
        当前仅仅是可共用（例如只改了标签属性，或者标签中的文本）时，指针以及下标的移动方式
    */
    // 移动链表
    if (oldSonFiber) {
      oldSonFiber = oldSonFiber.sibling;
    }
    // 移动虚拟DOM下标
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
 * 遍历保存属性的oldProps、newProps，将遍历出来的属性更新（增、删、改）到对应的DOM上
 * @param {*} DOM 
 * @param {*} oldProps 
 * @param {*} newProps 
 * @returns 
 */
function updateDOM(DOM, oldProps, newProps) {
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
  deletions.forEach(commitWork); // 执行Effect List之前先把，先把该删除的元素删除掉

  let fiber = workInProgressRootFiber.firstEffect; // 取出根节点的 firstEffect 指向的节点
  while (fiber) {
    commitWork(fiber); // 根据副作用操作DOM
    fiber = fiber.nextEffect;
  }
  deletions.length = 0;
  currentRenderRootFiber = workInProgressRootFiber;
  workInProgressRootFiber = null;
}


/**
 * commitWork作用：将所有产生副作用的fiber进行对应的操作：
 *   · 新增的节点创建DOM并挂载到父DOM上
 *   · 需要删除的节点直接从父元素上清除对应的子元素
 *   · 更新对应DOM
 * 最终需要将当前节点的effectTag置为空
 * @param {*} fiber 
 * @returns 
 */
function commitWork(fiber) {
  if (!fiber) return;
  let returnFiber = fiber.return;
  let returnDOM = returnFiber.stateNode;

  if (fiber.effectTag === PLACEMENT) { // 增加元素
    returnDOM.appendChild(fiber.stateNode); // returnDOM.appendChild(nextFiber.stateNode);
  } else if (fiber.effectTag === DELETION) {  // 删除元素（只考虑DOM节点，暂不考虑函数式组件与类式组件）
    returnDOM.removeChild(fiber.stateNode);
    // return commitDeletion(fiber, returnDOM);
  } else if (fiber.effectTag === UPDATE) {  // 更新元素（只考虑HTML元素）
    if (fiber.type === ELEMENT_TEXT) {
      if (fiber.alternate.props.text !== fiber.props.text) {
        fiber.stateNode.textContent = fiber.props.text;
      }
    } else {
      updateDOM(fiber.stateNode, fiber.alternate.props, fiber.props);
    }
  }

  fiber.effectTag = null;
}


/**
 * 在浏览器完成自己的重要任务后，如果该时间片还有剩余时间，请求浏览器赶紧来执行workLoop的任务
 * 但是如果超过了500ms仍未执行，那么不管当前时间片是否还有剩余时间，都要执行workLoop中的任务
 */
requestIdleCallback(workLoop, { timeout: 500 });