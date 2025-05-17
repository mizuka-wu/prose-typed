# ProseTyped

[English](./README.md) | 中文

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

## 事件系统

ProseTyped 使用 mitt 作为事件系统，提供以下事件：

| 事件名称 | 说明 | 参数 |
| ------- | ---- | ---- |
| `view` | 视图更新时触发 | `Fragment` - ProseMirror 文档片段 |
| `complete` | 打字效果完成时触发 | 无 |

```typescript
// 监听视图更新
proseTyped.on('view', (fragment) => {
  // 使用 fragment 更新你的视图
  const html = DOMSerializer.fromSchema(schema).serializeFragment(fragment);
  previewerEl.replaceChildren(html);
});

// 监听完成事件
proseTyped.on('complete', () => {
  console.log('打字效果完成');
});

// 移除事件监听
proseTyped.off('view', handlerFunction);
```

## 方法说明

ProseTyped 类提供以下方法：

| 方法名 | 说明 | 参数 |
| ----- | ---- | ---- |
| `start()` | 开始或继续打字效果 | 无 |
| `pause()` | 暂停打字效果 | 无 |
| `stop()` | 停止打字效果并跳到结束 | 无 |
| `updateNode(newNode, showCursor?)` | 更新节点内容 | `newNode: Node` - 新的 ProseMirror 节点  
`showCursor?: boolean` - 是否显示光标 |
| `showCursor()` | 显示光标 | 无 |
| `hideCursor()` | 隐藏光标 | 无 |
| `destroy()` | 销毁实例，清除所有计时器 | 无 |

## 属性

| 属性名 | 类型 | 说明 |
| ----- | ---- | ---- |
| `isRunning` | `boolean` | 是否正在运行打字效果 |
| `on` | `Function` | 添加事件监听器 |
| `off` | `Function` | 移除事件监听器 |

## 配置选项

```typescript
interface IOptions {
  showCursor: boolean;       // 是否显示光标
  typingSpeed: number;       // 打字速度（毫秒）
  autoStart: boolean;        // 是否自动开始
  delayStartTime: number;    // 延迟开始时间（毫秒）
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

| 选项名 | 类型 | 默认值 | 说明 |
| ----- | ---- | ------ | ---- |
| `showCursor` | `boolean` | `true` | 是否显示光标 |
| `typingSpeed` | `number` | `1000 / 30` | 打字速度（毫秒） |
| `autoStart` | `boolean` | `true` | 是否自动开始打字效果 |
| `delayStartTime` | `number` | `0` | 延迟开始时间（毫秒） |
| `blinkInterval` | `number` | `500` | 光标闪烁间隔（毫秒） |
| `cursorMark` | `string` | `undefined` | 光标使用的 mark 类型，用于自定义光标样式 |
| `ignoreAttributes` | `Array` | `[]` | 比较节点时要忽略的属性 |

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
