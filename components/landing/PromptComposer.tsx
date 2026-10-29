'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STARTER_PROMPTS, buildStudioHref } from '@/lib/design-tokens';

export { STARTER_PROMPTS, buildStudioHref };

export function PromptComposer({ compact = false }: { compact?: boolean }) {
  const [prompt, setPrompt] = useState('');
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) return;
    router.push(buildStudioHref(prompt));
  }

  function handleSelectChip(starterPrompt: string) {
    router.push(buildStudioHref(starterPrompt));
  }

  return (
    <div className={`prompt-composer ${compact ? 'prompt-composer--compact' : ''}`}>
      <form onSubmit={submit} className="prompt-form" aria-label="Describe a world">
        <label htmlFor={compact ? 'studio-prompt' : 'world-prompt'} className="sr-only">
          Describe what you love
        </label>
        <textarea
          id={compact ? 'studio-prompt' : 'world-prompt'}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Miles Davis + Brutalist concrete"
          rows={compact ? 2 : 3}
          aria-label="Describe cultural signals or aesthetic combinations"
        />
        <button
          suppressHydrationWarning
          type="submit"
          disabled={!prompt.trim()}
          className="signal-button"
        >
          <span>{compact ? 'Enter the studio' : 'Design my world'}</span>
          <span aria-hidden="true">↗</span>
        </button>
      </form>
      <div className="prompt-examples" aria-label="Example prompts">
        <span className="prompt-examples__label">Try this</span>
        {STARTER_PROMPTS.map((example) => (
          <button
            suppressHydrationWarning
            key={example}
            type="button"
            onClick={() => handleSelectChip(example)}
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
