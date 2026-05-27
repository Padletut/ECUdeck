import AiAssistPanel from '../../workspace/components/AiAssistPanel';

export default function PluginCopilotPanel() {
  return (
    <AiAssistPanel
      surface="plugin-editor"
      title="Plugin Copilot"
      description="Copilot for plugin authoring with live firmware context, grouped found maps, ECU identity drafting, and runtime review kept close at hand."
      scopeBadge="Plugin"
      composerPlaceholder="Help me detect maps from this firmware, find ECU family or part number clues, inspect checksum-sensitive regions, or turn the current Insert selection into a cleaner plugin rule."
    />
  );
}
