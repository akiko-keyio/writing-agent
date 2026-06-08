/** Dev：嵌入 public/settings-inspector-mockup.html（须带完整静态资源路径） */
export function SettingsInspectorMockupPage() {
  return (
    <iframe
      title="Settings Inspector Mockup"
      src="/settings-inspector-mockup.html"
      className="fixed inset-0 size-full border-0 bg-background"
    />
  )
}
