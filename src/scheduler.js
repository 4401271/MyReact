import { UpdateQueue } from './updateQueue';
import { ELEMENT_TEXT, TAG_ROOT, TAG_HOST, TAG_TEXT, TAG_CLASS, PLACEMENT, UPDATE, DELETION } from './constants';

/* 
  从根节点开始渲染和调度，包含了三个阶段：
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

let workInProgressRootFiber = null; // 当前正在创建、渲染的fiber树的根fiber —— 渲染时用，保存的根fiber，对应着真实DOM容器container，也就是'#root'对应的真实DOM
let currentRenderRootFiber = null; // 上次渲染的fiber树的根fiber —— 渲染完成后，currentRenderRootFiber保存着当前fiber树的根fiber，将workInProgressRootFiber置空
let nextUnitOfWork = null; // 当前、下一个工作单元

let deletions = [];  // 上一棵fiber树需要删除的节点都放在这里。Effect List中标记的被删除的fiber，是当前正在渲染的fiber树中需要删除的fiber（其实操作的就是上上棵fiber树）

/**
 * scheduleRoot 作用：更新两颗fiber树根节点以及根节点alternate指向
 * @param rootFiber 根fiber
 */
export function scheduleRoot(rootFiber) {
  /* 
    双缓冲机制：减少新建对象所浪费的空间和时间
      第1次渲染时，currentRenderRootFiber为空，新建一棵fiber树
      第2次渲染，currentRenderRootFiber不为空，但是alternate属性为空，新建一棵fiber树
      第3、4、5...次渲染，currentRenderRootFiber.alternate均有值，使用上上次创建的fiber树，不再新建fiber树
  */
  if (currentRenderRootFiber && currentRenderRootFiber.alternate) { // 第3、4...次渲染
    workInProgressRootFiber = currentRenderRootFiber.alternate; // 拿到上上次创建的fiber树的根fiber节点，作为当前fiber树的根节点
    workInProgressRootFiber.alternate = currentRenderRootFiber; // 修改当前根fiber节点的alternate，指向上一次创建的fiber树的根节点

    if (rootFiber) workInProgressRootFiber.props = rootFiber.props; // 传入了fiber时才需要更新成新的props（类组件并不会传递rootFiber参数）

  } else if (currentRenderRootFiber) { // 第2次渲染
    if (rootFiber) {
      rootFiber.alternate = currentRenderRootFiber;
      workInProgressRootFiber = rootFiber;
    } else {
      // 没有传递时只需要直接更新
      workInProgressRootFiber = {
        ...currentRenderRootFiber,
        alternate: currentRenderRootFiber
      }
    }
  } else { // 第1次渲染
    workInProgressRootFiber = rootFiber;
  }

  workInProgressRootFiber.firstEffect = workInProgressRootFiber.lastEffect = workInProgressRootFiber.nextEffect = null;
  nextUnitOfWork = workInProgressRootFiber;
}


/**
 * requestIdleCallback 的作用：在浏览器一帧的剩余空闲时间内执行优先度相对较低的任务
 *   在浏览器完成自己的重要任务后，如果该时间片还有剩余时间，请求浏览器赶紧来执行 workLoop 的任务
 *   但是如果超过了 500ms 仍未执行，那么不管当前时间片是否还有剩余时间，都要强制执行 workLoop 中的任务
 * （requestIdleCallback 的 FPS只有 20, 这远远低于页面流畅度的要求！(一般 FPS 为 60 时对用户来说
 * 是感觉流程的, 即一帧时间为 16.7 ms), 这也是 React 需要自己实现 requestIdleCallback 的原因。）
 */
 requestIdleCallback(workLoop, { timeout: 500 });


/**
 * workLoop 作用：在时间片有剩余时间的情况下，循环执行任务
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
 * performUnitOfWork的作用：创建两条链表
 * 1. 借助beginWork创建fiber，构造一条由child、sibling连接的链表
 * 2. 借助completeUnitOfWork构建一条Effect List链表
 * @param {*} fiber
 * @returns
 */
function performUnitOfWork(fiber) {
  beginWork(fiber); // 每执行一次，就会将一个fiber节点下的一层的虚拟DOM转化为fiber并借助child、sibling将所有的fiber连接起来
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

/**
 * beginWork的作用：通过层层函数调用，最终可实现将一层的虚拟DOM转化为fiber，并借助child、sibling连接起来
 * 中转站，根据不同的类型的fiber，调用不同的update
 * @param {*} fiber
 */
function beginWork(fiber) {

  if (fiber.tag === TAG_ROOT) {        // 根Fiber
    updateHostRoot(fiber);
  } else if (fiber.tag === TAG_TEXT) { // 文本节点
    updateHostText(fiber);
  } else if (fiber.tag === TAG_HOST) { // 普通节点
    updateHost(fiber);
  } else if (fiber.tag === TAG_CLASS) {// 类式组件
    updateClassComponent(fiber);
  }

}

// -------------------------------------  update*** 的任务： -------------------------------------↓
// 1. 创建fiber对应的真实DOM节点，挂到fiber的stateNode属性上
// 2. 获取fiber的子虚拟DOM，一并交给reconcileChildren

/**
 * RootFiber比较特殊，其不需要创建真实DOM，其对应的真实DOM就是'#root'
 * @param {*} fiber
 */
function updateHostRoot(fiber) {
  let vDOMArrOfChildrenOfFiber = fiber.props.children; // fiber的子虚拟DOM，对应上面fiber的[element]
  reconcileChildren(fiber, vDOMArrOfChildrenOfFiber);
}
function updateHostText(fiber) {
  if (!fiber.stateNode) {
    fiber.stateNode = createDOM(fiber);
  }
}
function updateHost(fiber) {
  if (!fiber.stateNode) {
    fiber.stateNode = createDOM(fiber);
  }
  const vDOMArrOfChildrenOfFiber = fiber.props.children;
  reconcileChildren(fiber, vDOMArrOfChildrenOfFiber);
}
function updateClassComponent(fiber) {
  if (!fiber.stateNode) { // 原生DOM的fiber.stateNode对应真实DOM，类式组件对应组件实例化对象

    // fiber.stateNode指向组件实例，组件实例的internalFiber指向fiber对象
    fiber.stateNode = new fiber.type(fiber.props);
    fiber.stateNode.internalFiber = fiber;

    fiber.updateQueue = new UpdateQueue();
  }
  
  fiber.stateNode.state = fiber.updateQueue.forceUpdate(fiber.stateNode.state); // 根据updateQueue，对传入的现有状态进行更新，然后将更新后的状态赋给类组件
  
  let newElement = fiber.stateNode.render(); // 重新走render，即找到新的Children，然后DOM diff比较，来进行重新渲染
  const vDOMArrOfChildrenOfFiber = [newElement];
  reconcileChildren(fiber, vDOMArrOfChildrenOfFiber);
}
// ----------------------------------------------------------------------------------------------↑

/**
 * reconcileChildren的作用   ！！DOM diff的核心就在此处
 * 1. 将fiber全部的“子”虚拟DOM转化为fiber，用child、sibling连接起来（每次调用reconcileChildren，只处理子虚拟DOM这一层，并不处理孙、重孙...的虚拟DOM）
 * 2. 将老fiber树中被删除fiber汇集到数组“deletions”中
 * @param {*} fiber 
 * @param {*} vDOMArrOfChildrenOfFiber fiber的后代虚拟DOM数组，但是在reconcileChildren中，仅将fiber的第一层后代虚拟DOM创建出对应的fiber并连接起来
 */
function reconcileChildren(fiber, vDOMArrOfChildrenOfFiber) {
  let arrIndex = 0; // 子虚拟DOM下标
  let preFiber; // 存储上一次传递进来的fiber（while循环中使用）
  let oldSonFiber = fiber.alternate && fiber.alternate.child; // oldSonFiber表示fiber在上次渲染的currentFiber Tree中对应的“子节点”（和当前渲染对应的Fiber Tree并非同一棵树）
  if (oldSonFiber) oldSonFiber.firstEffect = oldSonFiber.lastEffect = oldSonFiber.nextEffect = null; // oldSonFiber在后面会被复用，因此需要先将其指针清空，避免在后面被污染

  // 遍历vDOMArrOfChildrenOfFiber第一层的虚拟DOM
  while (arrIndex < vDOMArrOfChildrenOfFiber.length || oldSonFiber) {
    let sonVDOM = vDOMArrOfChildrenOfFiber[arrIndex];
    let newFiber; // 有虚拟DOM构建出来的新fiber
    let tag;

    // 这里单独写上sonVDOM，是因为在删除一个节点时，sonVDOM为null，再取type就会报错
    if (sonVDOM && sonVDOM.type === ELEMENT_TEXT) {  // 我们在创建虚拟DOM时，文本节点的type会被指定为ELEMENT_TEXT
      tag = TAG_TEXT;
    } else if (sonVDOM && typeof sonVDOM.type === 'string') {
      tag = TAG_HOST; // 原生DOM节点sonVDOM.type: 'div'、'li'、'ul'
    } else if (sonVDOM && typeof sonVDOM.type === 'function' && sonVDOM.type.prototype.isReactComponent) {
      tag = TAG_CLASS;
    }

    const sameType = oldSonFiber && sonVDOM && oldSonFiber.type === sonVDOM.type; // 判断老fiber的标签和虚拟DOM的标签是否相同，相同则可以复用

    // 更新（复用）、创建fiber
    if (sameType) { // 虚拟DOM和上次渲染时对应的fiber类型相同时，大部分属性都可以沿用之前的，只需更新props属性和effectTag
      /** 
       * “双缓冲机制”：已经两次更新时，直接复用“上上次的fiber”
       * 
       * 问题1：为什么用上上次的fiber，而不是用上次的fiber？
       *   假如我们没有复用fiber，而是新建一个fiber对象
       *   在建立之前，会先拿虚拟DOM和上次的fiber做比较，看是更新还是删除还是新建等
       *   这样来实现最小化更新
       * 
       *   当然，复用了fiber，最小化更新的目标依旧需要实现，所以对照的依旧是上次的fiber，来实现减少对DOM的操作
       *   因此，我们不能拿上次的fiber进行操作
       * 
       *   我们拿当前的虚拟DOM和上次的fiber做对比，sameType为true
       *   以前的做法是新建一个fiber对象，现在就只需要将上上次的fiber拿过来，对fiber的部分数据进行一个更新即可
       * 
       * 问题2：上上次的fiber一定和当前的虚拟DOM对应吗？
       *   当然的，我们在比较时，如果想要使用上上次的fiber，sameType就必须为true
       *   为true就可以告诉我们上次的fiber和当前的虚拟DOM是相对应的
       *   alternate属性也sameType为true才能绑定上去的
       *   所以，上上次的fiber（fiber.alternate.child.alternate）也就和当前的虚拟DOM（newChildren[arrIndex]）对应起来了
       */
      if (oldSonFiber.alternate) {  // 复用“上上次的fiber”
        newFiber = oldSonFiber.alternate;
        newFiber.props = sonVDOM.props;
        newFiber.alternate = oldSonFiber;
        newFiber.effectTag = UPDATE; // 上上次，effectTag保存的就不一定是UPDATE，有可能是PLACEMENT
        newFiber.updateQueue = oldSonFiber.updateQueue || new UpdateQueue();
        newFiber.nextEffect = null;
      } else { // 初次更新或已经更新了一次
        newFiber = {
          tag: oldSonFiber.tag,
          type: oldSonFiber.type,
          props: sonVDOM.props, // 这里必须使用新的虚拟DOM的props
          stateNode: oldSonFiber.stateNode,
          return: fiber,
          effectTag: UPDATE,
          updateQueue: oldSonFiber.updateQueue || new UpdateQueue(),
          alternate: oldSonFiber, // 让新fiber的alternate属性指向老的fiber
          nextEffect: null
        }
      }
    } else {  // 类型不相同时，需要重新创建fiber
      if (sonVDOM) {  // 标签的位置可能被写了一个{null}
        newFiber = {
          tag, // ELEMENT_HOST
          type: sonVDOM.type, // 'div'
          props: sonVDOM.props,  // {id="A1" style={style}}
          stateNode: null, // 此时div节点还没有创建真实DOM
          return: fiber, // 每个fiber的return都指向它们的父fiber
          updateQueue: new UpdateQueue(),
          effectTag: PLACEMENT, // 副作用标识，render阶段我们会收集增加PLACEMENT、删除DELETE、更新UPDATE的fiber，其实只有NOWORK的不作处理

          nextEffect: null // effect list是一个单链表，该链表上保存着所有的 “发生了变化” 的fiber【连接方式对应深度优先遍历】
        }
      }
      if (oldSonFiber) {
        oldSonFiber.effectTag = DELETION; // 将老的fiber树中的对应节点标记为删除
        deletions.push(oldSonFiber);
      }
    }

    // 借助child、sibling将全部的fiber组成一个链表
    if (newFiber) {
      if (arrIndex == 0) {
        fiber.child = newFiber; // 索引为0时，表示newFiber是父fiber的第一个子fiber，此时让父fiber的child属性指向该newFiber
      } else {
        preFiber.sibling = newFiber; // 索引不为0时，就表示该newFiber是父fiber的第2、3...个子fiber，需要借助sibling让该fiber挂到上一个子fiber的后面
      }
      preFiber = newFiber;
    }

    /* 
      现在的移动方式其实并不完善
      例如：
        1. 当老fiber tree中有一个节点在虚拟DOM中不存在，该节点被标记为删除，那么就可能出现下一个fiber与当前虚拟DOM刚好对应上，此时就只需要让fiber向后移动，而虚拟DOM不需要移动，在标记删除的情况下，移动也本应如此
        2. 新增同理，fiber tree中没有，而虚拟DOM中有，此时就只需让虚拟DOM的下标+1，而不需要让fiber链表后移
        ...
    */
    // 移动链表
    if (oldSonFiber) {
      oldSonFiber = oldSonFiber.sibling;
    }
    // 移动虚拟DOM下标
    arrIndex++;
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
  if (DOM.setAttribute){
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
 * 借助firstEffect、nextEffect、lastEffect，将所有的产生变化的fiber组成一条Effect List，Effect List的创建是通过深度优先遍历：左-右-根
 * @param {*} fiber 
 */
function completeUnitOfWork(fiber) {
  let returnFiber = fiber.return;
  if (returnFiber) {
    if (!returnFiber.firstEffect) {
      // 把当前节点的“first子节点”挂到父节点的first指针上
      returnFiber.firstEffect = fiber.firstEffect;
    }
    // 
    if (fiber.lastEffect) {
      if (returnFiber.lastEffect) {
        // 
        returnFiber.lastEffect.nextEffect = fiber.firstEffect;
      }
      // 把当前节点的“last子节点”挂到父节点的last指针上(→6)
      returnFiber.lastEffect = fiber.lastEffect;
      
    }

    // 把自己挂到父fiber上
    const effectTag = fiber.effectTag;
    if (effectTag) {
      if (returnFiber.lastEffect) {
        // 更改当前节点last子节点的nextEffect指针指向当前节点
        returnFiber.lastEffect.nextEffect = fiber;
      } else {
        returnFiber.firstEffect = fiber;
      }
      // 同时更改父节点的last指针也指向当前节点
      returnFiber.lastEffect = fiber;
    }
  }
}

/**
 * 从根节点的 firstEffect 开始遍历 Effect 链表
 */
function commitRoot() {
  deletions.forEach(commitWork); // 执行Effect List之前先把，先把该删除的元素删除掉

  let fiber = workInProgressRootFiber.firstEffect; // 取出根节点的 firstEffect
  while (fiber) {
    commitWork(fiber); // 根据副作用操作DOM
    fiber = fiber.nextEffect;
  }
  deletions.length = 0;
  currentRenderRootFiber = workInProgressRootFiber;
  workInProgressRootFiber = null;
}


/**
 * commitWork作用：将所有产生变化的fiber进行对应的操作：
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

  // 当父节点是自定义的类式组件或函数式组件时，我们需要获取最近的一个不是自定义类型的fiber
  while (returnFiber.tag !== TAG_HOST && returnFiber.tag !== TAG_ROOT && returnFiber.tag !== TAG_TEXT) {
    returnFiber = returnFiber.return;
  }

  let domReturn = returnFiber.stateNode;

  if (fiber.effectTag === PLACEMENT) { // 增加元素
    let nextFiber = fiber;
    if (fiber.tag === TAG_CLASS) return; // 类式组件在循环子元素时，最外层的元素发现上一层的元素是个类式组件，会向上挂载一次，类式组件自身也会挂载一次，虽然会挂载两次，但是React可以优化掉一次，我们可以手动取消一次挂载
    // 如果要挂载的节点不是原生DOM节点或者文本节点的fiber，比如类组件、函数式组件，就需要一直找第一个儿子，直到找到一个真实DOM为止
    while (nextFiber.tag !== TAG_HOST && nextFiber.tag !== TAG_TEXT) {
      nextFiber = fiber.child;
    }
    domReturn.appendChild(nextFiber.stateNode);
  } else if (fiber.effectTag === DELETION) {  // 删除元素（只考虑DOM节点，暂不考虑函数式组件与类式组件）
    return commitDeletion(fiber, domReturn); // 删除元素不再需要往下走
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
 * 如果子元素是一个HTML DOM元素、文本，直接从父DOM删除该元素，如果是类式组件或者函数式组件，则需要删除组件对应fiber的第一个"非组件"元素
 * @param {*} fiber 
 * @param {*} domReturn 
 */
function commitDeletion(fiber, domReturn) {
  if (fiber.tag == TAG_HOST || fiber.tag == TAG_TEXT) {
    domReturn.removeChild(fiber.stateNode);
  } else {
    commitDeletion(fiber.child, domReturn);
  }
}