import logoCodex from '@/assets/logo-codex.png';
import logoClaude from '@/assets/logo-claude.png';
import logoCursor from '@/assets/logo-cursor.png';
import logoGemini from '@/assets/logo-gemini.png';
import logoCopilot from '@/assets/logo-copilot.png';
import logoWindsurf from '@/assets/logo-windsurf.png';
import logoKiro from '@/assets/logo-kiro.png';
import logoAugment from '@/assets/logo-augment.png';
import logoDevin from '@/assets/logo-devin.png';
import { ProviderId } from '@/types';

export const providerLogos: Record<ProviderId, string> = {
  codex: logoCodex,
  claude: logoClaude,
  cursor: logoCursor,
  gemini: logoGemini,
  copilot: logoCopilot,
  windsurf: logoWindsurf,
  kiro: logoKiro,
  augment: logoAugment,
  devin: logoDevin,
};
