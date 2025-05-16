# ProseTyped

ProseTyped 是一个为 ProseMirror 设计的打字效果库，可以为你的编辑器添加打字机效果。

## 安装

```bash
npm install prose-typed
# 或者
yarn add prose-typed
```

## 使用方法

### 基本使用

```typescript
import { ProseTyped } from 'prose-typed';
import { Schema, Node } from 'prosemirror-model';

// 创建一个 ProseMirror 节点
const schema = new Schema({
  // 你的 schema 配置
});
const node = schema.node('doc', null, [
  schema.node('paragraph', null, schema.text('这是一段将会有打字效果的文本'))
]);

// 创建 ProseTyped 实例
const proseTyped = new ProseTyped(node, {
  // 可选配置
  typingSpeed: 50, // 打字速度（毫秒）
  showCursor: true, // 是否显示光标
  autoStart: true, // 是否自动开始
});

// 监听视图更新
proseTyped.on('view', (fragment) => {
  // 使用 fragment 更新你的视图
  // 例如：editorView.dispatch(tr.replaceWith(0, editorView.state.doc.content.size, fragment));
});

// 监听完成事件
proseTyped.on('complete', () => {
  console.log('打字效果完成');
});

// 控制方法
proseTyped.start(); // 开始打字效果
proseTyped.pause(); // 暂停
proseTyped.stop();  // 停止并跳到结束
proseTyped.destroy(); // 销毁实例，清除计时器
```

### 配置选项

```typescript
interface IOptions {
  showCursor: boolean;       // 是否显示光标
  typingSpeed: number;       // 打字速度（毫秒）
  autoStart: boolean;        // 是否自动开始
  blinkInterval: number;     // 光标闪烁间隔（毫秒）
  cursorMark?: string;       // 光标使用的 mark 类型
  ignoreAttributes: (        // 忽略的属性
    | {
        node: string;        // 节点类型
        attributes: string[]; // 属性名称
      }
    | string
  )[];
}
```

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建库
npm run build:lib

# 预览
npm run preview
```

## 许可证

MIT
