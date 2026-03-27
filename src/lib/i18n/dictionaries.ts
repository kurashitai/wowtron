export type AppLocale = 'en' | 'pt-BR';

type Dictionary = Record<string, string>;

export const dictionaries: Record<AppLocale, Dictionary> = {
  en: {
    'locale.en': 'EN',
    'locale.pt-BR': 'PT-BR',
    'nav.raidAnalysis': 'Raid Analysis',
    'nav.roadmap': 'Roadmap',
    'nav.guildsMplus': 'Guilds & M+',
    'auth.login': 'Login',
    'auth.getStarted': 'Get Started Free',
    'auth.welcome': 'Welcome to WoWtron',
    'auth.subtitle': 'Sign in to manage your guild and track your progress.',
    'auth.demoMode': 'Demo Mode',
    'auth.demoDescription': 'Click any button below to explore WoWtron with demo data',
    'auth.signInDemo': 'Sign In to Demo',
    'auth.freeAccess': 'No account needed / Demo access is FREE',
    'hero.badge': 'Raid analysis first. Guild platform next.',
    'hero.title': 'Start with the hardest problem in organized PvE: turning Warcraft Logs into a clear next-pull plan. Expand later into guilds, Mythic+, recruiting, and player reliability.',
    'hero.primary': 'Open Raid Analysis',
    'hero.secondary': 'View Product Direction',
    'footer.rights': '© 2026 WoWtron. All rights reserved.',
  },
  'pt-BR': {
    'locale.en': 'EN',
    'locale.pt-BR': 'PT-BR',
    'nav.raidAnalysis': 'Análise de Raid',
    'nav.roadmap': 'Roadmap',
    'nav.guildsMplus': 'Guildas e M+',
    'auth.login': 'Entrar',
    'auth.getStarted': 'Começar Grátis',
    'auth.welcome': 'Bem-vindo ao WoWtron',
    'auth.subtitle': 'Entre para gerenciar sua guilda e acompanhar seu progresso.',
    'auth.demoMode': 'Modo Demo',
    'auth.demoDescription': 'Clique em qualquer botão abaixo para explorar o WoWtron com dados de demonstração',
    'auth.signInDemo': 'Entrar na Demo',
    'auth.freeAccess': 'Nenhuma conta é necessária / O acesso demo é GRÁTIS',
    'hero.badge': 'Análise de raids primeiro. Plataforma de guilda depois.',
    'hero.title': 'Comece pelo problema mais difícil do PvE organizado: transformar Warcraft Logs em um plano claro para o próximo pull. Expanda depois para guildas, Mythic+, recrutamento e confiabilidade de jogadores.',
    'hero.primary': 'Abrir Análise de Raid',
    'hero.secondary': 'Ver Direção do Produto',
    'footer.rights': '© 2026 WoWtron. Todos os direitos reservados.',
  },
};

export function getDictionary(locale: AppLocale): Dictionary {
  return dictionaries[locale] || dictionaries.en;
}
