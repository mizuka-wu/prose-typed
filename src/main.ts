import "./style.css";

import { DOMSerializer } from "prosemirror-model";
import { defaultMarkdownParser } from "prosemirror-markdown";
import { EditorView } from "prosemirror-view";
import { EditorState } from "prosemirror-state";
import { ProseTyped } from "./prosetyped/index.ts";
const DATA: string =
  "这是一个简单的段落文本。\n# 一级标题\n## 二级标题\n### 三级标题\n#### 四级标题\n##### 五级标题\n###### 六级标题\n**这是加粗文本** *这是斜体文本* ***这是加粗斜体文本***\n这是普通文本，包含一些 **加粗** 和 *斜体* 以及 ~~删除线~~ 文本。\n[这是一个链接](https://example.com \"链接标题\")\n- 无序列表项 1\n- 无序列表项 2\n  - 嵌套列表项 2.1\n  - 嵌套列表项 2.2\n- 无序列表项 3\n\n1. 有序列表项 1\n2. 有序列表项 2\n   1. 嵌套有序列表项 2.1\n   2. 嵌套有序列表项 2.2\n3. 有序列表项 3\n> 这是一个引用块\n> \n> 引用块可以包含多个段落\n> \n> > 这是嵌套引用块\n```javascript\nfunction example() {\n  console.log('这是代码块');\n}\n```\n\n这是行内代码 `const x = 1;`\n上面的内容\n\n---\n\n下面的内容\n# 文档标题\n这是一个包含 **加粗**、*斜体* 和 [链接](https://example.com) 的段落。\n## 列表示例\n- 项目 1\n- 项目 2\n  - 子项目 A\n  - 子项目 B\n## 代码示例\n```typescript\ninterface User {\n  name: string;\n  age: number;\n}\n```\n> 引用内容\n> 可以包含 **格式化文本**\n---\n### 图片示例\n最后一个段落，总结文档内容。";

const markdownEditorEl = document.querySelector(
  "#markdown-editor"
) as HTMLTextAreaElement;
const prosemirrorEditorEl = document.querySelector(
  "#prosemirror-editor"
) as HTMLDivElement;

// 初始化
markdownEditorEl.value = DATA;
const schema = defaultMarkdownParser.schema;
const doc = defaultMarkdownParser.parse(DATA);
const prosemirrorEditor = new EditorView(prosemirrorEditorEl, {
  state: EditorState.create({
    doc: doc,
    plugins: [],
  }),
});
