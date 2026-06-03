Situation

An LLM agent collaborates with a human author on their document to achieve a communicative goal with the intended reader.

**Limitation**

2. LLM 
A. 推理时参数冻结，上下文是影响输出的唯一变量。
模型的权重在推理阶段不可更新。Agent 无法从交互中学习或积累经验。一切任务相关信息——作者意图、读者画像、风格偏好、领域知识——必须在每次推理时通过上下文显式提供，否则等同于不存在。
B. 上下文窗口存在，且有效利用率随信息量递减。
窗口长度有固定上限。即便在上限内，模型对上下文中各位置信息的注意力分配不均匀，关键信息可能因位置或周围噪声被稀释。信息在场不等于信息被有效利用。
C. 输出是对真实分布的不完美近似，且模型无法可靠地标定自身输出的正确性。
模型的每一次输出都可能包含事实错误、逻辑缺陷、或不忠实于输入的内容。且模型表达出的置信度与实际正确率之间不存在可靠的对应关系——它可以在错误输出上表现得与正确输出一样自信。

2. Human（认知特征，无法消除）：

D. 作者的时间和精力有限
E. 作者的意图可能不完整或模糊（意图层面）
F. 作者对自身文本存在认知盲区（评估层面）



Therefore, a good writing agent should:

- **Comprehend:** Understand before change; Ask when uncertain
- **Insightful:** Show me what I don't see
- **Grounded:** Verify every claim
- **Transparent:** Show what changed and why
- **Control:** Propose freely, change on approval
- **Authentic:** Preserve your voice
- **Learning:** Tell me once


**全局公理 (Objective)：** 帮助用户梳理和传递信息。

| 设计锚点 (Design Anchor) | 行为准则 (Tenet) | 对抗的底层限制 (Addressed Limitation) | 核心系统设计 (System UI/UX) |
| :--- | :--- | :--- | :--- |
| **Comprehend (理解)** | 谋定后动，遇疑则问 | **人类/LLM** 易出错<br>**文本** 是有损压缩 | **阻断式交互：** 信息缺失时强制触发提问，拒绝盲目猜测。 |
| **Insightful (洞察)** | 提供认知盲区视角 | **人类** 注意力有限 | **旁注系统：** 在主工作区外，异步提供逻辑补全或反向视角。 |
| **Grounded (依据)** | 无验证，不输出 | **LLM** 易出错 (概率特性) | **知识挂载：** 强制挂载事实上下文，锁定 LLM 生成空间。 |
| **Transparent (透明)** | 解释修改及原因 | **人类** 注意力与时间有限 | **差异高亮 (Diff)：** 严禁静默重写，更改处必须具备高对比度视觉反馈。 |
| **Control (控制)** | 自由提议，待批更改 | **LLM** 易出错 (概率特性) | **权限隔离：** 剥夺 AI 的正文写入权，所有更改必须经用户 `Accept`。 |
| **Authentic (真实)** | 留存作者原始风格 | **文本** 有损耗<br>**LLM** 输出受限于上下文 | **风格注入：** 后台强制挂载特征上下文，对抗均值化“AI 味”。 |
| **Learning (学习)** | 只教一次，系统记住 | **人类** 时间有限<br>**LLM** Token 昂贵 | **持久化记忆：** 建立全局设定库，避免重复输入，降低算力与时间耗散。 |

LLM 同步作者意图，弥补用户局限，避免自身缺陷