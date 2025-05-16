import mitt from "mitt";
import { Fragment, Slice } from "prosemirror-model";
import type { Node, Attrs, Mark } from "prosemirror-model";
import type { Emitter } from "mitt";

export type IOptions = {
  showCursor: boolean;
  typingSpeed: number;
  autoStart: boolean;
  blinkInterval: number;
  cursorMark?: string;
  /**
   * 忽略的attributes
   */
  ignoreAttributes: (
    | {
        node: string;
        attributes: string[];
      }
    | string
  )[];
};

function compareAttrs(
  attrsPrev: Attrs,
  attrsNext: Attrs,
  ignoreAttributes: string[]
): boolean {
  const keys = Array.from(Object.keys(attrsPrev)).filter(
    (key) => !ignoreAttributes.includes(key)
  );
  if (!keys.length) return true;

  if (
    keys.some((key) => {
      if (typeof attrsPrev[key] !== typeof attrsNext[key]) return true;

      if (typeof attrsPrev[key] === "object") {
        // 暂时不解析
        return false;
      }

      return attrsPrev[key] !== attrsNext[key];
    })
  ) {
    return false;
  }

  return true;
}

function findSameTextLengthFromBegin(prev: string, next: string): number {
  let index = 0;

  for (; index < prev.length; index++) {
    if (prev[index] !== next[index]) break;
  }

  return index;
}

function insertText(
  node: Node,
  text: string,
  pos: number,
  mark: null | Mark = null
): Node {
  return node.replace(
    pos,
    pos,
    new Slice(
      Fragment.from(node.type.schema.text(text, mark ? [mark] : null)),
      0,
      0
    )
  );
}

export class ProseTyped {
  private emitter: Emitter<{
    complete: void;
    view: Fragment;
  }> = mitt();
  private currentNode: Node;
  private nextNode: Node | null = null;

  // 目标位置
  private _targetPos: number = 0;
  // 当前位置
  private _currentPos: number = 0;

  private typingTimeout: number | null = null;

  // 闪烁效果
  private blinkTimeout: number | null = null;

  options: IOptions;

  constructor(node: Node, options?: Partial<IOptions>) {
    this.currentNode = node;
    this._targetPos = node.content.size;
    this.options = {
      showCursor: options?.showCursor ?? true,
      typingSpeed: options?.typingSpeed ?? 1000 / 30,
      autoStart: options?.autoStart ?? true,
      blinkInterval: options?.blinkInterval ?? 500,
      ignoreAttributes: options?.ignoreAttributes ?? [],
      cursorMark: options?.cursorMark,
    };

    if (this.options.autoStart) {
      setTimeout(() => {
        this.start();
      });
    }
  }

  get on() {
    return this.emitter.on;
  }

  get off() {
    return this.emitter.off;
  }

  get isRunning() {
    return this.typingTimeout !== null;
  }

  clearTypingTimeout() {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  clearBlinkTimeout() {
    if (this.blinkTimeout) {
      clearTimeout(this.blinkTimeout);
      this.blinkTimeout = null;
    }
  }

  // 输出
  typing() {
    this.clearBlinkTimeout();
    this.clearTypingTimeout();

    if (this._currentPos === this._targetPos) {
      // 如果有新的内容，则切换到新的内容继续输出
      if (this.nextNode && this.nextNode.nodeSize) {
        this.currentNode = this.nextNode;
        this.nextNode = null;
        this._targetPos = this.currentNode.content.size;

        if (this._targetPos === this._currentPos) {
          this.generateView();
          this.emitter.emit("complete");
          return;
        }
      } else {
        this.generateView();
        this.emitter.emit("complete");
        return;
      }
    }

    if (this._currentPos < this._targetPos) {
      this._currentPos += 1;
    } else {
      this._currentPos -= 1;
    }

    this.typingTimeout = setTimeout(() => {
      this.typing();
    }, this.options.typingSpeed);

    this.generateView(); // 生成内容
  }

  generateView() {
    const slice = this.currentNode.slice(0, this._currentPos);
    // 如果是无内容，还需要填补一个零宽字符
    let docNode = this.currentNode.type.schema.topNodeType.createAndFill(
      null,
      slice.content
    )!;

    const isEmpty = !slice.content.textBetween(0, slice.content.size);
    if (isEmpty) docNode = insertText(docNode, "\u200B", docNode.childCount);
    console.log(docNode);

    if (this.options.showCursor) {
      if (!this.isRunning) {
        // 闪烁, 即下一次再返回一次没有cursor的状态
        const blinkContent = docNode.cut(0).content; // 重新创建一个slice
        this.blinkTimeout = setTimeout(() => {
          this.blinkTimeout = null;
          this.emitter.emit("view", blinkContent);
          this.blinkTimeout = setTimeout(() => {
            this.generateView();
          }, this.options.blinkInterval);
        }, this.options.blinkInterval);
      }

      // 插入光标
      let pos = 0;
      docNode.descendants((node, _pos) => {
        if (node.isTextblock) {
          pos = _pos + node.nodeSize - 1;
        }
      });
      if (pos) {
        const cursorMarkType = this.options.cursorMark
          ? this.currentNode.type.schema.marks[this.options.cursorMark]
          : null;
        const cursorMark = cursorMarkType ? cursorMarkType.create() : null;
        this.emitter.emit(
          "view",
          insertText(docNode, "|", pos, cursorMark).content
        );
      }
    } else {
      this.emitter.emit("view", slice.content);
    }
  }

  showCursor() {
    if (this.options.showCursor) return;
    this.options.showCursor = true;
    this.generateView();
  }

  hideCursor() {
    if (!this.options.showCursor) return;
    this.options.showCursor = false;
    this.generateView();
  }

  start() {
    if (this.isRunning) return;
    this.clearTypingTimeout();
    this.typing();
  }

  stop() {
    this.clearTypingTimeout();
    if (this._targetPos !== this.currentNode.content.size) {
      this._targetPos = this.currentNode.content.size;
      this.generateView();
      this.emitter.emit("complete");
    }
  }

  pause() {
    this.clearTypingTimeout();
  }

  updateNode(newNode: Node, showCursor?: boolean) {
    this.nextNode = newNode;

    let samePos = 0;
    this.currentNode.descendants((_node, pos, _parent, index) => {
      if (newNode.content.size < pos) return true; // 超过距离
      const samePosResolve = newNode.resolve(pos); // 没有同层的resolve
      if (!samePosResolve.parent) return true; // 找不到parent
      if (samePosResolve.parent.childCount <= index) return true; // 没有同样index的node
      const samePosNode = samePosResolve.parent.child(index);

      // 比较是否一致
      if (samePosNode.type !== _node.type) return true;

      // attr是否一致
      const ignoreAttributes = Array.from(
        new Set(
          this.options.ignoreAttributes.flatMap((ignoreAttribute) => {
            if (typeof ignoreAttribute === "string") return ignoreAttribute;
            if (ignoreAttribute.node === _node.type.name)
              return ignoreAttribute.attributes;
            return "";
          })
        )
      ).filter((item) => item);

      if (!compareAttrs(_node.attrs, samePosNode.attrs, ignoreAttributes))
        return true;

      const nodeSize = _node.isTextblock
        ? findSameTextLengthFromBegin(
            _node.textContent,
            samePosNode.textContent
          )
        : _node.nodeSize;

      samePos = pos + nodeSize;
    });

    // 这里需要计算两个Node的差异，不过暂时先不管了
    if (this._currentPos > samePos) {
      this._targetPos = samePos;
    }
    if (!this.isRunning) {
      if (showCursor) this.showCursor();
      this.start();
    }
  }

  destroy() {
    // 清除计时器
    this.clearTypingTimeout();
    if (this.blinkTimeout) {
      clearTimeout(this.blinkTimeout);
      this.blinkTimeout = null;
    }
  }
}
