export const ELEMENT_TEXT = Symbol.for('ELEMENT_TEXT');

export const TAG_ROOT = Symbol.for('TAG_ROOT');        // 根fiber
export const TAG_HOST = Symbol.for('TAG_HOST');        // 原生节点
export const TAG_TEXT = Symbol.for('TAG_TEXT');        // 文本节点
export const TAG_CLASS = Symbol.for('TAG_CLASS');      // 类式组件
export const TAG_FUNCTION = Symbol.for('TAG_FUNCTION');// 函数式组件

export const PLACEMENT = Symbol.for('PLACEMENT');
export const UPDATE = Symbol.for('UPDATE');
export const DELETION = Symbol.for('DELETION');