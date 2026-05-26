import type { PluginReferenceOwnership } from '../../../shared/types/plugins';

export default function PluginValidationScopePanel({
  draftOwnership,
  canApplyScope,
  setDraftField,
  applyScope,
}: Readonly<{
  draftOwnership: PluginReferenceOwnership;
  canApplyScope: boolean;
  setDraftField: (field: keyof PluginReferenceOwnership, value: string) => void;
  applyScope: () => void;
}>) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyScope();
  };

  return (
    <section className="mb-8 overflow-hidden rounded-lg border border-gridlines-grey bg-steel-grey">
      <div className="border-b border-gridlines-grey px-6 py-4">
        <h2 className="text-section-title font-bold">Plugin Validation Scope</h2>
        <p className="mt-1 text-sm text-alloy-silver">
          Set the workspace, project, and session ownership that keys persisted plugin references.
        </p>
      </div>

      <form className="grid gap-4 px-6 py-6 lg:grid-cols-4" onSubmit={handleSubmit}>
        <ScopeField
          id="plugin-validation-workspace"
          label="Workspace ID"
          value={draftOwnership.workspaceId}
          onChange={(value) => setDraftField('workspaceId', value)}
          placeholder="local-workspace"
          required
        />
        <ScopeField
          id="plugin-validation-project"
          label="Project ID"
          value={draftOwnership.projectId ?? ''}
          onChange={(value) => setDraftField('projectId', value)}
          placeholder="dashboard-plugin-validation"
        />
        <ScopeField
          id="plugin-validation-session"
          label="Session ID"
          value={draftOwnership.sessionId ?? ''}
          onChange={(value) => setDraftField('sessionId', value)}
          placeholder="dashboard-session"
        />
        <div className="flex items-end">
          <button
            type="submit"
            disabled={!canApplyScope}
            className="w-full rounded-lg border border-electric-blue px-5 py-3 font-semibold text-electric-blue transition hover:bg-electric-blue hover:text-carbon-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply Scope
          </button>
        </div>
      </form>
    </section>
  );
}

function ScopeField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}>) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-alloy-silver"
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gridlines-grey bg-carbon-black px-4 py-3 font-mono text-sm text-soft-white outline-none transition focus:border-electric-blue"
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}
