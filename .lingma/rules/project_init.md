---
trigger: always_on
---

## 生成 react 组件、样式
- 当前项目为使用 next.js、react、antd、tailwindcss
- next.js 使用 App Route 模式
- 数据交互使用 server action 形式，server action 方法名称后带 Action 关键词。
- 文件名、文件夹名称使用中横线进行划分
- 注意 ant@6.x.x 的 bodyStyl 等组件 props 已经切换为了 styles: { body: {}} 内。
- 注意 ant 的 message 需要使用 const {message} =  App.useApp(); 获取。