export class Update {
  constructor(payload) {
    this.payload = payload;
  }
}

// 数据结构是一个单链表
export class UpdateQueue {
  constructor() {
    this.firstUpdate = null; // 头指针
    this.lastUpdate = null; // 尾指针
  }

  // 增加更新
  addUpdate(update) {
    if (this.lastUpdate === null) {
      this.firstUpdate = this.lastUpdate = update; // 首次更新，firstUpdate、lastUpdate均指向update
    } else {
      this.lastUpdate.nextUpdate = update; //先让最后一个节点的next指针指向该节点
      this.lastUpdate = update; // 再让根节点的last指向该节点
    }
  }

  // 更新state（只考虑state为对象的情况）
  forceUpdate(state) {
    let currentUpdate = this.firstUpdate;

    while (currentUpdate) {
      let nextState = typeof currentUpdate.payload === 'function' ?
        currentUpdate.payload(state) :
        currentUpdate.payload;
      state = { ...state, ...nextState }; // 暂定state就是一个对象
      currentUpdate = currentUpdate.nextUpdate;
    }

    this.firstUpdate = this.lastUpdate = null; // 只在类式组件中有实际作用
    return state;
  }
}