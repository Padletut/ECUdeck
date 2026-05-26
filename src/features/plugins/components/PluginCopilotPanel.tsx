import AiAssistPanel from '../../workspace/components/AiAssistPanel';

export default function PluginCopilotPanel() {
  return (
    <AiAssistPanel
      surface="plugin-editor"
      title="Plugin Copilot"
      description="Copilot for plugin authoring, validation, and contract work on the active project surface."
      scopeBadge="Plugin"
      composerPlaceholder="Explain this contract, help me fix the current validation issues, or plan the next safe authoring step."
    />
  );
}
