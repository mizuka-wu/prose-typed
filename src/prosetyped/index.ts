import mitt from "mitt";
import type { Node } from "prosemirror-model";
import { Fragment, Slice } from "prosemirror-model";
import type { Emitter } from "mitt";

export type IOptions = {
  showCursor: boolean;
  typingSpeed: number;
  autoStart: boolean;
  blinkInterval: number;
};

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
    const docNode = this.currentNode.type.schema.topNodeType.createAndFill(
      null,
      slice.content
    )!;

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
        const newDocNode = docNode.replace(
          pos,
          pos,
          new Slice(Fragment.from(this.currentNode.type.schema.text("|")), 0, 0)
        );

        this.emitter.emit("view", newDocNode.content);
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

  updateNode(node: Node, showCursor?: boolean) {
    this.nextNode = node;

    // 这里需要计算两个Node的差异，不过暂时先不管了
    if (this._currentPos > node.content.size) {
      this._targetPos = node.content.size;
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
