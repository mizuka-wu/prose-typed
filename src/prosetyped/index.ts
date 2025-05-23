import mitt from "mitt";
import type { Node, Attrs, Mark, Fragment } from "prosemirror-model";
import type { Emitter } from "mitt";

export type IOptions = {
  showCursor: boolean;
  typingSpeed: number;
  autoStart: boolean;
  delayStartTime: number;
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

// const ZERO_WIDTH_TEXT = "\u200B";
const EMPTY_TEXT = "\u2003";

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
  const textNode = node.type.schema.text(text, mark ? [mark] : null);
  return node.replace(
    pos,
    pos,
    node.type.schema.topNodeType.create(null, textNode).slice(0)
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

  private typingTimeout: ReturnType<typeof setTimeout> | null = null;

  // 闪烁效果
  private blinkTimeout: ReturnType<typeof setTimeout> | null = null;

  private createdTime = Date.now();

  private isComplete = false;

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
      delayStartTime: options?.delayStartTime ?? 0,
    };

    if (this.options.autoStart) {
      setTimeout(() => {
        this.start();
      }, this.options.delayStartTime);
    } else {
      // 模拟输出
      setTimeout(() => {
        this.generateView();
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
          this.isComplete = true;
          this.emitter.emit("complete");
          return;
        }
      } else {
        this.generateView();
        this.isComplete = true;
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
    const docNode = this.currentNode.type.schema.topNodeType.createAndFill(
      null,
      slice.content
    )!;

    // const isEmpty = !slice.content.textBetween(0, slice.content.size);
    // if (isEmpty) {
    //   docNode = insertText(docNode, ZERO_WIDTH_TEXT, docNode.childCount);
    // }

    if (this.options.showCursor) {
      // 插入光标
      let pos = 0;
      docNode.descendants((node, _pos) => {
        if (node.isTextblock) {
          pos = _pos + node.nodeSize - 1;
        }
      });

      if (!this.isRunning) {
        this.blinkTimeout = setTimeout(() => {
          this.blinkTimeout = null;

          if (this.options.showCursor) {
            // 这里加一个占位字符
            if (pos) {
              this.emitter.emit(
                "view",
                insertText(docNode, EMPTY_TEXT, pos).content
              );
            } else {
              const blinkContent = docNode.cut(0).content; // 重新创建一个slice
              this.emitter.emit("view", blinkContent);
            }

            this.blinkTimeout = setTimeout(() => {
              this.generateView();
            }, this.options.blinkInterval);
          }
        }, this.options.blinkInterval);
      }

      if (pos) {
        const cursorMarkType = this.options.cursorMark
          ? this.currentNode.type.schema.marks[this.options.cursorMark]
          : null;

        const cursorMark = cursorMarkType ? cursorMarkType.create() : null;
        this.emitter.emit(
          "view",
          insertText(docNode, "｜", pos, cursorMark).content
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
      this.isComplete = true;
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
      if (newNode.content.size < pos) return false; // 超过距离
      const samePosResolve = newNode.resolve(pos); // 没有同层的resolve
      if (!samePosResolve.parent) return false; // 找不到parent
      if (samePosResolve.parent.childCount <= index) return false; // 没有同样index的node
      const samePosNode = samePosResolve.parent.child(index);

      // 比较是否一致
      if (samePosNode.type !== _node.type) return false;

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
        return false;

      if (_node.isTextblock) {
        const sameTextSize = findSameTextLengthFromBegin(
          _node.textContent,
          samePosNode.textContent
        );
        samePos = pos + sameTextSize;

        // 如果不是全匹配，可以停止了
        if (sameTextSize !== samePosNode.textContent.length) return false;
      } else {
        samePos = pos + _node.nodeSize;
      }
      return true;
    });

    // 这里需要计算两个Node的差异，不过暂时先不管了
    if (this._currentPos > samePos) {
      this._targetPos = samePos;
    }
    if (!this.isRunning) {
      if (showCursor) this.showCursor();

      if (this.isComplete) {
        this.isComplete = false;
        this.start();
      } else if (this.options.autoStart) {
        // 剩余还剩的启动时间
        const startRestTime =
          Math.max(
            0,
            this.createdTime + Math.max(this.options.delayStartTime, 0)
          ) - Date.now();
        setTimeout(() => {
          this.isComplete = false;
          this.start();
        }, startRestTime);
      }
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
