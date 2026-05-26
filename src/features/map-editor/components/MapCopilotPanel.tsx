import AiAssistPanel from '../../workspace/components/AiAssistPanel';

export default function MapCopilotPanel() {
  return (
    <AiAssistPanel
      surface="map-editor"
      title="Map Copilot"
      description="Copilot for the active hex or map workflow, grounded in the current firmware context."
      scopeBadge="Map"
      composerPlaceholder="Explain the active map region, compare this pattern to a known layout, or plan the next safe analysis step."
    />
  );
}
