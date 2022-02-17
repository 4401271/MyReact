import { scheduleRoot } from './scheduler';
import { TAG_ROOT } from './constants'

/**
 * 将虚拟 DOM Tree 标记到 fiber 的 props 属性上，创建出 #root 对应的 fiber
 * @param element 对应调用 ReactDOM.render 时传递的第一个参数 element，也就是一个虚拟 DOM
 * @param container id 为 root 的真实 DOM
 */
function render(element, container) {

  // fiber和虚拟DOM一样，也是一个对象，但是这个对象拥有更多的属性，用于实现更强的功能
  /* 
    两条重要的链表：
      1. 由firstEffect、lastEffect、nextEffect 形成的由所有发生变化的fiber组成的Effect List
      2. 由child、sibling 将所有的fiber进行连接形成的链表
  */
  let rootFiber = {
    tag: TAG_ROOT, // 节点类型：根节点、原生节点、文本节点
    stateNode: container, // 绑定真实DOM
    props: { children: [element] }  // 所有后代元素对应的虚拟DOM
  }

  // 从根节点开始遍历
  scheduleRoot(rootFiber);
}

const ReactDOM = {
  render
}

export default ReactDOM;