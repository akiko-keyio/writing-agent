# Markdown 渲染测试

这是一段普通的正文文本，用于测试基本排版效果。Lorem ipsum dolor sit amet, consectetur adipiscing elit. 中英文混排测试：React 是一个用于构建用户界面的 JavaScript 库。

## 二级标题

### 三级标题

#### 四级标题

##### 五级标题

###### 六级标题

---

## 文本样式

普通文本、**加粗文本**、*斜体文本*、~~删除线文本~~、`内联代码`。

混合使用：这是 **加粗中包含 `代码`** 的测试，以及 *斜体中包含 **加粗** 的嵌套*。

## 列表

### 无序列表

- 第一项
- 第二项
  - 嵌套项 A
  - 嵌套项 B
    - 更深层嵌套
- 第三项

### 有序列表

1. 步骤一：初始化项目
2. 步骤二：安装依赖
3. 步骤三：配置环境
   1. 子步骤 A
   2. 子步骤 B

### 任务列表

- [x] 完成字体配置
- [x] 完成图标替换
- [ ] 修复间距问题

## 引用

> 这是一段引用文本。设计是一种思维方式，不仅仅是美学。
>
> — 某位设计师

> 多层引用测试：
>> 嵌套引用的内容
>>> 更深层的引用

## 代码块

### JavaScript

```javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(`Fibonacci(10) = ${result}`);
```

### TypeScript

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

### CSS

```css
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 0.625rem;
  background: var(--background);
}
```

### Python

```python
class MarkdownRenderer:
    def __init__(self, config: dict):
        self.config = config
        self.plugins = []
    
    def render(self, content: str) -> str:
        for plugin in self.plugins:
            content = plugin.process(content)
        return self._parse(content)
```

## 表格

| 功能 | 状态 | 优先级 | 负责人 |
|------|------|--------|--------|
| 字体配置 | 完成 | P0 | Agent |
| 图标替换 | 完成 | P0 | Agent |
| 间距修复 | 完成 | P1 | Agent |
| 暗色模式 | 进行中 | P2 | - |
| 国际化 | 待定 | P3 | - |

### 复杂表格

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `variant` | `"default" \| "outline" \| "ghost"` | `"default"` | 按钮样式变体 |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | 按钮尺寸 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `loading` | `boolean` | `false` | 是否显示加载状态 |

## 链接

链接测试：访问 [GitHub](https://github.com) 或 [coss UI](https://coss.com/ui)。

## 混合内容

### 完整段落

在现代 Web 开发中，**组件化** 是核心思想。我们使用 `React` 框架，配合 [TypeScript](https://www.typescriptlang.org/) 提供类型安全。

以下是一个典型的组件结构：

```tsx
interface ButtonProps {
  variant: "primary" | "secondary";
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant, children, onClick }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
}
```

### 长文本测试

这是一段较长的文本，用于测试在窄屏幕下的换行效果。Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

## 特殊字符

- 中文标点：，。！？、；：""''【】（）
- 日文：こんにちは世界
- 韩文：안녕하세요 세계
- 特殊符号：© ® ™ € £ ¥ § ¶ † ‡ • … ‰
- 箭头：← → ↑ ↓ ↔ ⇒ ⇐

---

*测试完成*
