import { DOMSerializer } from "prosemirror-model";
import { defaultMarkdownParser } from "prosemirror-markdown";
import { ProseTyped } from "./prosetyped/index.ts";
const DATA: string[] = [
  // 基本段落
  `这是一个简单的段落文本。`,

  // 标题示例
  `# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题`,

  // 文本格式化
  `**这是加粗文本** *这是斜体文本* ***这是加粗斜体文本***
这是普通文本，包含一些 **加粗** 和 *斜体* 以及 ~~删除线~~ 文本。`,

  // 链接和图片
  `[这是一个链接](https://example.com "链接标题")
![这是一张图片](https://example.com/image.jpg "图片标题")`,

  // 列表
  `- 无序列表项 1
- 无序列表项 2
  - 嵌套列表项 2.1
  - 嵌套列表项 2.2
- 无序列表项 3

1. 有序列表项 1
2. 有序列表项 2
   1. 嵌套有序列表项 2.1
   2. 嵌套有序列表项 2.2
3. 有序列表项 3`,

  // 引用块
  `> 这是一个引用块
> 
> 引用块可以包含多个段落
> 
> > 这是嵌套引用块`,

  // 代码
  "```javascript\nfunction example() {\n  console.log('这是代码块');\n}\n```\n\n这是行内代码 `const x = 1;`",

  // 水平分割线
  `上面的内容

---

下面的内容`,

  // 复杂混合示例 - 拆分为多个小片段模拟AI连续输出
  // 片段1 - 标题和开始
  `# 文档标题`,

  // 片段2 - 第一段内容
  `这是一个包含 **加粗**、*斜体* 和 [链接](https://example.com) 的段落。`,

  // 片段3 - 列表标题
  `## 列表示例`,

  // 片段4 - 列表内容第一部分
  `- 项目 1
- 项目 2`,

  // 片段5 - 列表内容第二部分（嵌套）
  `  - 子项目 A
  - 子项目 B`,

  // 片段6 - 代码示例标题
  `## 代码示例`,

  // 片段7 - 代码块
  "```typescript\ninterface User {\n  name: string;\n  age: number;\n}\n```",

  // 片段8 - 引用块
  `> 引用内容
> 可以包含 **格式化文本**`,

  // 片段9 - 分隔线
  `---`,

  // 片段10 - 图片标题
  `### 图片示例`,

  // 片段11 - 图片
  `![示例图片](https://example.com/image.jpg "图片描述")`,

  // 片段12 - 结束段落
  `最后一个段落，总结文档内容。`,
];

export function setupApplication(
  element: HTMLButtonElement,
  viewElement: HTMLDivElement
) {
  let index = 0;
  const emptyNode = defaultMarkdownParser.schema.topNodeType.createAndFill();
  const proseTyped = new ProseTyped(emptyNode!);

  proseTyped.on("view", (view) => {
    const dom = DOMSerializer.fromSchema(
      defaultMarkdownParser.schema
    ).serializeFragment(view);
    viewElement.innerHTML = "";
    viewElement.appendChild(dom);
  });

  proseTyped.on("complete", () => {
    if (index === DATA.length - 1) {
      proseTyped.hideCursor();
    }
  });

  const next = () => {
    index++;

    if (typeof DATA[index - 1] !== "string") {
      index = 0;
    }
    element.innerHTML = `index is ${index}`;

    const data = DATA.slice(0, index).join("\n");
    const node = defaultMarkdownParser.parse(data);
    console.log("加载新的node", node);
    proseTyped!.updateNode(node);
  };
  element.addEventListener("click", () => next());
}
