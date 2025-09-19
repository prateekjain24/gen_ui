import type { PromptSignalsPartial } from '../types';

import globalSaas from './global-saas.json';
import multilingualExpansion from './multilingual-expansion.json';
import partialSentenceBrief from './partial-sentence-brief.json';
import regulatedHealthcare from './regulated-healthcare.json';
import toolingOverlap from './tooling-overlap.json';

export interface PromptFixture {
  id: string;
  prompt: string;
  llm?: PromptSignalsPartial;
}

const fixtures = [
  globalSaas,
  multilingualExpansion,
  partialSentenceBrief,
  regulatedHealthcare,
  toolingOverlap,
] as PromptFixture[];

export default fixtures;
