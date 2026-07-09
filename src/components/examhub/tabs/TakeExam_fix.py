import re

with open('/home/claude/examhub-vite/src/components/examhub/tabs/TakeExam.tsx', 'r') as f:
    content = f.read()

# Fix api.xxx calls to direct function imports
replacements = [
    ('api.listExams', 'listExams'),
    ('api.getExam', 'getExam'),
    ('api.submitExam', 'submitExam'),
    ("from '@/lib/api'", "from '@/lib/api'"),
    ("import { api } from '@/lib/api'", "import { listExams, getExam, submitExam } from '@/lib/api'"),
]
for old, new in replacements:
    content = content.replace(old, new)

# Fix useStore import
content = content.replace("import { useExamHub } from \"../store\"", "import { useStore } from '@/lib/store'")
content = content.replace("import { useExamHub, type TabId } from \"../store\"", "import { useStore } from '@/lib/store'")
content = content.replace("useExamHub(", "useStore(")

# fix cn and type imports
content = content.replace(
    "import { cn } from \"@/lib/utils\"",
    "import { cn } from '@/lib/utils'"
)

with open('/home/claude/examhub-vite/src/components/examhub/tabs/TakeExam.tsx', 'w') as f:
    f.write(content)
print("TakeExam fixed")
