'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useLocale } from '@/components/providers/locale-provider';
import { 
  Sword, Shield, Users, Calendar, Target, Trophy, Clock, MapPin, Zap, 
  TrendingUp, Award, Star, Bell, Search, Settings, LogOut, User, 
  Castle, ChevronRight, ExternalLink, Play, CheckCircle, XCircle,
  AlertCircle, Info, Heart, Flame, Crown, Gift, Activity, BarChart3,
  Upload, FileText, Briefcase, MessageSquare, Globe, Skull, Timer,
  ChevronDown, ChevronUp, Minus, Maximize2, Eye, Download
} from 'lucide-react';
import { 
  mockGuild, mockCharacters, mockRaids, mockMPlusRuns, 
  mockLogAnalysis, mockRecruitmentListings, mockPlayerCards,
  mockActivityFeed, mockStats, mockDungeonProgress, 
  currentWeekAffixes, mockNotifications, weeklyResetTime
} from '@/lib/mock-data';
import { 
  WOW_CLASSES, GUILD_RANKS, ROLES, getClassColor, getRoleColor, getRankColor
} from '@/lib/wow-data';
import LogAnalysis from '@/components/log-analysis';

// Types
type View = 'landing' | 'dashboard' | 'guild' | 'raids' | 'mplus' | 'recruitment' | 'logs' | 'playercards';
type AuthState = 'guest' | 'login' | 'authenticated';

export default function WoWtronApp() {
  const { locale, setLocale, t } = useLocale();
  const [currentView, setCurrentView] = useState<View>('landing');
  const [authState, setAuthState] = useState<AuthState>('guest');
  const [userName] = useState('GuildLeader');
  const [userAvatar] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotifications] = useState(2);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  // Handlers
  const handleLogin = () => {
    setAuthState('authenticated');
    setCurrentView('logs');
    setLoginOpen(false);
    toast({ title: 'Welcome to WoWtron', description: 'Opening the raid analysis workspace.' });
  };

  const handleLogout = () => {
    setAuthState('guest');
    setCurrentView('landing');
    toast({ title: 'Logged out', description: 'See you next time!' });
  };

  const navigateTo = (view: View) => {
    if (authState !== 'authenticated' && view !== 'landing') {
      setLoginOpen(true);
      return;
    }
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  // Landing Page
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <header className="relative overflow-hidden hero-gradient">
          {/* Navigation */}
          <nav className="relative z-10 flex items-center justify-between p-4 lg:px-8">
            <div className="flex items-center gap-3">
              <Image src="/wowtron-logo.png" alt="WoWtron" width={192} height={48} className="h-12 w-auto" />
              <span className="font-display text-2xl font-bold text-wow-gold hidden sm:block" style={{ fontFamily: 'Cinzel, serif' }}>
                WoWtron
              </span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => navigateTo('logs')} className="text-tron-silver-300 hover:text-wow-gold transition-colors font-medium">
                {t('nav.raidAnalysis')}
              </button>
              <button className="text-tron-silver-300 hover:text-wow-gold transition-colors font-medium">
                {t('nav.roadmap')}
              </button>
              <button className="text-tron-silver-300 hover:text-wow-gold transition-colors font-medium">
                {t('nav.guildsMplus')}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Select value={locale} onValueChange={(value) => setLocale(value as 'en' | 'pt-BR')}>
                <SelectTrigger className="w-[92px] border-dark-700 bg-dark-900/70 text-tron-silver-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-dark-900 border-dark-700">
                  <SelectItem value="en">{t('locale.en')}</SelectItem>
                  <SelectItem value="pt-BR">{t('locale.pt-BR')}</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={() => setLoginOpen(true)} 
                variant="outline"
                className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 font-medium"
              >
                {t('auth.login')}
              </Button>
              <Button 
                onClick={() => setLoginOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold shadow-lg shadow-amber-500/20"
              >
                {t('auth.getStarted')}
              </Button>
            </div>
          </nav>

          {/* Hero Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 lg:py-32">
            <div className="text-center">
              <Badge className="mb-6 bg-shadow-purple/20 text-shadow-purple border-shadow-purple">
                {t('hero.badge')}
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6" style={{ fontFamily: 'Cinzel, serif' }}>
                <span className="text-wow-gold text-shadow-gold">WoW</span>
                <span className="text-tron-silver">tron</span>
              </h1>
              <p className="text-xl sm:text-2xl text-tron-silver-300 mb-8 max-w-3xl mx-auto">
                {t('hero.title')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg"
                  onClick={() => setLoginOpen(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-lg px-8 py-6 shadow-lg shadow-amber-500/30"
                >
                  <Play className="mr-2 h-5 w-5" />
                  {t('hero.primary')}
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => setLoginOpen(true)}
                  className="border-slate-500 text-slate-300 hover:bg-slate-800 hover:border-amber-500 hover:text-amber-400 text-lg px-8 py-6"
                >
                  {t('hero.secondary')}
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: '<30s', label: 'Time To First Insight' },
                { value: 'Top 3', label: 'Next Pull Actions' },
                { value: 'Phase-aware', label: 'Wipe Diagnosis' },
                { value: 'WCL+', label: 'Decision Layer' },
              ].map((stat, i) => (
                <div key={i} className="text-center p-6 rounded-lg bg-dark-900/50 border border-dark-700 backdrop-blur">
                  <div className="text-3xl font-bold text-wow-gold">{stat.value}</div>
                  <div className="text-tron-silver-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-64 h-64 bg-shadow-purple/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-wow-gold/10 rounded-full blur-3xl" />
        </header>

        {/* Features Section */}
        <section className="py-20 px-4 bg-gradient-to-b from-background to-dark-900">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
                <span className="text-wow-gold">Start Narrow.</span> Scale Intentionally.
              </h2>
              <p className="text-tron-silver-400 text-lg max-w-2xl mx-auto">
                WoWtron can grow into a broader PvE platform, but the wedge is raid leaders who need fast, useful answers from logs.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: BarChart3, title: 'Raid Log Briefs', desc: 'Turn a wipe into a root cause, top 3 actions, and a clear next-pull briefing.', color: 'text-wow-gold' },
                { icon: Timer, title: 'Progression Reviews', desc: 'Compare pulls, phase failures, and repeated mistakes without digging through WCL for hours.', color: 'text-shadow-purple' },
                { icon: Shield, title: 'Responsibility Mapping', desc: 'Separate player execution problems from raid strategy and cooldown coverage issues.', color: 'text-sapphire-blue' },
                { icon: Castle, title: 'Guild Hub Later', desc: 'Roster, recruiting, scheduling, and operations stay in the product vision, but not ahead of the wedge.', color: 'text-tron-silver' },
                { icon: Target, title: 'M+ Reliability Later', desc: 'Long term, score players by execution quality instead of only public rating systems.', color: 'text-green-500' },
                { icon: Users, title: 'Global Audience', desc: 'English-first product, with secondary localization for Portuguese and other regions later.', color: 'text-red-500' },
              ].map((feature, i) => (
                <Card key={i} className="card-wow card-wow-gold group cursor-pointer hover:scale-[1.02] transition-all">
                  <CardHeader>
                    <feature.icon className={`h-10 w-10 ${feature.color} mb-2 group-hover:scale-110 transition-transform`} />
                    <CardTitle className="text-tron-silver-200">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-tron-silver-400 text-base">{feature.desc}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 px-4 bg-dark-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
                Product <span className="text-wow-gold">Phases</span>
              </h2>
              <p className="text-tron-silver-400 text-lg">The platform can grow wide later, but it needs a sharp wedge first.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { name: 'Now', price: '1', features: ['Raid log analysis', 'Wipe diagnosis', 'Next-pull actions', 'Discord-ready briefings'], popular: true },
                { name: 'Next', price: '2', features: ['Guild workflow', 'Player reliability', 'Recruiting context', 'Progress tracking'], popular: false },
                { name: 'Later', price: '3', features: ['M+ execution model', 'Broader PvE hub', 'Cross-mode reputation', 'Deeper automation'], popular: false },
              ].map((plan, i) => (
                <Card key={i} className={`relative ${plan.popular ? 'border-wow-gold shadow-epic' : 'border-dark-700'} bg-dark-900/50`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-wow-gold text-dark-900 font-bold">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pt-8">
                    <CardTitle className="text-tron-silver-200">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-wow-gold">{plan.price}</span>
                      <span className="text-tron-silver-400"> / phase</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {plan.features.map((feature, j) => (
                      <div key={j} className="flex items-center gap-2 text-tron-silver-300">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-gradient-to-r from-wow-gold to-yellow-500 text-dark-900 font-bold hover:shadow-epic' : 'bg-dark-800 text-tron-silver-300 hover:bg-dark-700'}`}
                      onClick={() => setLoginOpen(true)}
                    >
                      Open Workspace
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-r from-void-purple-dark via-void-purple to-void-purple-dark">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6" style={{ fontFamily: 'Cinzel, serif' }}>
              Build the <span className="text-wow-gold">Raid Wedge</span> First
            </h2>
            <p className="text-tron-silver-300 text-lg mb-8">
              If the raid product becomes indispensable, the broader platform becomes much easier to earn.
            </p>
            <Button 
              size="lg"
              onClick={() => setLoginOpen(true)}
              className="bg-gradient-to-r from-wow-gold to-yellow-500 text-dark-900 font-bold text-lg px-10 py-6 hover:shadow-epic transition-all"
            >
              Open Raid Analysis
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 bg-dark-950 border-t border-dark-800">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Image src="/wowtron-logo.png" alt="WoWtron" width={128} height={32} className="h-8 w-auto" />
                  <span className="font-display text-xl font-bold text-wow-gold" style={{ fontFamily: 'Cinzel, serif' }}>WoWtron</span>
                </div>
                <p className="text-tron-silver-400 text-sm">
                  Raid-first analysis for World of Warcraft progression teams.
                </p>
              </div>
              {[
                { title: 'Product', links: ['Features', 'Pricing', 'API', 'Integrations'] },
                { title: 'Resources', links: ['Documentation', 'Guides', 'Blog', 'Community'] },
                { title: 'Company', links: ['About', 'Contact', 'Privacy', 'Terms'] },
              ].map((section, i) => (
                <div key={i}>
                  <h4 className="font-semibold text-tron-silver-200 mb-4">{section.title}</h4>
                  <ul className="space-y-2">
                    {section.links.map((link, j) => (
                      <li key={j}>
                        <a href="#" className="text-tron-silver-400 hover:text-wow-gold transition-colors text-sm">{link}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-12 pt-8 border-t border-dark-800 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-tron-silver-500 text-sm">{t('footer.rights')}</p>
              <div className="flex gap-4">
                <a href="#" className="text-tron-silver-400 hover:text-wow-gold transition-colors"><MessageSquare className="h-5 w-5" /></a>
                <a href="#" className="text-tron-silver-400 hover:text-wow-gold transition-colors"><Globe className="h-5 w-5" /></a>
                <a href="#" className="text-tron-silver-400 hover:text-wow-gold transition-colors"><Globe className="h-5 w-5" /></a>
              </div>
            </div>
          </div>
        </footer>

        {/* Login Modal */}
        <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-amber-400 text-2xl font-bold text-center" style={{ fontFamily: 'Cinzel, serif' }}>
                {t('auth.welcome')}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-center">
                {t('auth.subtitle')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Demo Access Info */}
              <div className="bg-violet-900/30 border border-violet-500/50 rounded-lg p-4 text-center">
                <p className="text-violet-300 text-sm font-medium mb-2">{t('auth.demoMode')}</p>
                <p className="text-slate-400 text-xs">{t('auth.demoDescription')}</p>
              </div>

              <Button 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-6 text-lg"
                onClick={handleLogin}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                Continue with Battle.net
              </Button>
              
              <Button 
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-6 text-lg"
                onClick={handleLogin}
              >
                <MessageSquare className="mr-2 h-5 w-5" />
                Continue with Discord
              </Button>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-900 text-slate-500">or use email</span>
                </div>
              </div>
              
              <Input 
                placeholder="demo@wowtron.gg" 
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 py-3" 
              />
              <Input 
                type="password" 
                placeholder="••••••••" 
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 py-3" 
              />
              
              <Button 
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-6 text-lg"
                onClick={handleLogin}
              >
                {t('auth.signInDemo')}
              </Button>
              
              <p className="text-center text-slate-500 text-sm">
                {t('auth.freeAccess')}
              </p>
            </div>
          </DialogContent>
        </Dialog>

        <Toaster />
      </div>
    );
  }

  // Authenticated Views
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Nav */}
            <div className="flex items-center gap-8">
              <button onClick={() => navigateTo('dashboard')} className="flex items-center gap-2">
                <Image src="/wowtron-logo.png" alt="WoWtron" width={128} height={32} className="h-8 w-auto" />
                <span className="font-display text-xl font-bold text-wow-gold hidden sm:block" style={{ fontFamily: 'Cinzel, serif' }}>WoWtron</span>
              </button>
              
              <nav className="hidden lg:flex items-center gap-1">
                {[
                  { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
                  { id: 'guild', icon: Castle, label: 'Guild' },
                  { id: 'raids', icon: Calendar, label: 'Raids' },
                  { id: 'mplus', icon: Target, label: 'M+ Tracker' },
                  { id: 'recruitment', icon: Briefcase, label: 'Recruitment' },
                  { id: 'logs', icon: FileText, label: 'Log Analysis' },
                  { id: 'playercards', icon: Users, label: 'Player Cards' },
                ].map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    onClick={() => navigateTo(item.id as View)}
                    className={`text-tron-silver-400 hover:text-wow-gold hover:bg-wow-gold/10 ${currentView === item.id ? 'text-wow-gold bg-wow-gold/10' : ''}`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                ))}
              </nav>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              <Select value={locale} onValueChange={(value) => setLocale(value as 'en' | 'pt-BR')}>
                <SelectTrigger className="hidden md:flex w-[92px] border-dark-700 bg-dark-800 text-tron-silver-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-dark-900 border-dark-700">
                  <SelectItem value="en">{t('locale.en')}</SelectItem>
                  <SelectItem value="pt-BR">{t('locale.pt-BR')}</SelectItem>
                </SelectContent>
              </Select>
              {/* Search */}
              <div className="hidden md:flex items-center relative">
                <Search className="absolute left-3 h-4 w-4 text-tron-silver-500" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9 w-48 lg:w-64 bg-dark-800 border-dark-700 text-tron-silver-200 placeholder:text-tron-silver-500"
                />
              </div>

              {/* Notifications */}
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="text-tron-silver-400 hover:text-wow-gold relative"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                      {unreadNotifications}
                    </span>
                  )}
                </Button>
                
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50">
                    <div className="p-3 border-b border-slate-700 bg-slate-800 rounded-t-lg">
                      <h3 className="font-semibold text-slate-200">Notifications</h3>
                    </div>
                    <ScrollArea className="h-64 bg-slate-900">
                      {mockNotifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-3 border-b border-slate-800 hover:bg-slate-800 cursor-pointer ${!notif.read ? 'bg-violet-900/20' : ''}`}
                        >
                          <p className="text-sm text-slate-200">{notif.title}</p>
                          <p className="text-xs text-slate-400 mt-1">{notif.message}</p>
                          <p className="text-xs text-slate-500 mt-1">{notif.time}</p>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border-2 border-wow-gold">
                  <AvatarImage src={userAvatar} />
                  <AvatarFallback className="bg-shadow-purple text-white text-sm">{userName[0]}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-tron-silver-200">{userName}</p>
                  <p className="text-xs text-tron-silver-400">Guild Leader</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-tron-silver-400 hover:text-red-400">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden text-tron-silver-400"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav className="lg:hidden py-4 border-t border-dark-700">
              {[
                { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
                { id: 'guild', icon: Castle, label: 'Guild' },
                { id: 'raids', icon: Calendar, label: 'Raids' },
                { id: 'mplus', icon: Target, label: 'M+ Tracker' },
                { id: 'recruitment', icon: Briefcase, label: 'Recruitment' },
                { id: 'logs', icon: FileText, label: 'Log Analysis' },
                { id: 'playercards', icon: Users, label: 'Player Cards' },
              ].map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => navigateTo(item.id as View)}
                  className={`w-full justify-start text-tron-silver-400 hover:text-wow-gold hover:bg-wow-gold/10 ${currentView === item.id ? 'text-wow-gold bg-wow-gold/10' : ''}`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Welcome Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
                Welcome back, <span className="text-wow-gold">{userName}</span>
              </h1>
              <p className="text-tron-silver-400 mt-1">Here&apos;s what&apos;s happening with your guild today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="card-wow card-wow-gold">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-tron-silver-400 text-sm">Active Members</p>
                      <p className="text-3xl font-bold text-wow-gold">{mockStats.activeMembers}/{mockStats.maxMembers}</p>
                    </div>
                    <Users className="h-10 w-10 text-wow-gold/50" />
                  </div>
                  <Progress value={(mockStats.activeMembers / mockStats.maxMembers) * 100} className="mt-3 h-1" />
                </CardContent>
              </Card>

              <Card className="card-wow card-wow-blue">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-tron-silver-400 text-sm">Next Raid</p>
                      <p className="text-xl font-bold text-sapphire-blue">{mockStats.nextRaid}</p>
                    </div>
                    <Calendar className="h-10 w-10 text-sapphire-blue/50" />
                  </div>
                  <p className="text-tron-silver-500 text-sm mt-3">80% confirmed</p>
                </CardContent>
              </Card>

              <Card className="card-wow card-wow-purple">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-tron-silver-400 text-sm">Raid Progress</p>
                      <p className="text-xl font-bold text-shadow-purple">{mockStats.raidProgress}</p>
                    </div>
                    <Trophy className="h-10 w-10 text-shadow-purple/50" />
                  </div>
                  <p className="text-tron-silver-500 text-sm mt-3">Last boss: 45%</p>
                </CardContent>
              </Card>

              <Card className="card-wow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-tron-silver-400 text-sm">M+ Score Avg</p>
                      <p className="text-3xl font-bold text-tron-silver-200">{mockStats.mPlusAvg.toLocaleString()}</p>
                    </div>
                    <Target className="h-10 w-10 text-tron-silver-500" />
                  </div>
                  <p className="text-green-500 text-sm mt-3">+120 this season</p>
                </CardContent>
              </Card>
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Upcoming Raids */}
              <Card className="card-wow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-tron-silver-200">Upcoming Raids</CardTitle>
                    <Button variant="outline" size="sm" className="border-dark-600 text-tron-silver-400 hover:text-wow-gold hover:border-wow-gold">
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockRaids.map((raid) => (
                    <div key={raid.id} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${raid.difficulty === 'Mythic' ? 'bg-wow-gold/20' : raid.difficulty === 'Heroic' ? 'bg-shadow-purple/20' : 'bg-sapphire-blue/20'}`}>
                          <Calendar className={`h-5 w-5 ${raid.difficulty === 'Mythic' ? 'text-wow-gold' : raid.difficulty === 'Heroic' ? 'text-shadow-purple' : 'text-sapphire-blue'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-tron-silver-200">{raid.name}</p>
                          <p className="text-sm text-tron-silver-400">{raid.difficulty} • {raid.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-wow-gold">{raid.signups}/{raid.maxPlayers}</p>
                        <p className="text-sm text-tron-silver-400">signed up</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Activity Feed */}
              <Card className="card-wow">
                <CardHeader>
                  <CardTitle className="text-tron-silver-200">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {mockActivityFeed.map((activity, i) => (
                        <div key={i} className="flex items-start gap-3 p-2">
                          <div className={`p-2 rounded-lg ${
                            activity.type === 'raid' ? 'bg-wow-gold/20' : 
                            activity.type === 'member' ? 'bg-sapphire-blue/20' : 
                            activity.type === 'mplus' ? 'bg-shadow-purple/20' :
                            activity.type === 'loot' ? 'bg-green-500/20' :
                            'bg-tron-silver/20'
                          }`}>
                            {activity.type === 'raid' && <Trophy className="h-4 w-4 text-wow-gold" />}
                            {activity.type === 'member' && <Users className="h-4 w-4 text-sapphire-blue" />}
                            {activity.type === 'mplus' && <Target className="h-4 w-4 text-shadow-purple" />}
                            {activity.type === 'loot' && <Gift className="h-4 w-4 text-green-500" />}
                            {activity.type === 'achievement' && <Award className="h-4 w-4 text-tron-silver" />}
                          </div>
                          <div>
                            <p className="text-sm text-tron-silver-200">{activity.message}</p>
                            <p className="text-xs text-tron-silver-500">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Roster Highlights */}
            <Card className="card-wow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-tron-silver-200">Roster Highlights</CardTitle>
                  <Button variant="outline" size="sm" className="border-dark-600 text-tron-silver-400 hover:text-wow-gold hover:border-wow-gold" onClick={() => navigateTo('guild')}>
                    View Full Roster
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {mockCharacters.slice(0, 8).map((char) => (
                    <div key={char.id} className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg hover:bg-dark-800 transition-colors cursor-pointer">
                      <Avatar className="h-10 w-10 border-2" style={{ borderColor: getClassColor(char.class) }}>
                        <AvatarFallback style={{ backgroundColor: getClassColor(char.class) + '20', color: getClassColor(char.class) }}>
                          {char.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-tron-silver-200 truncate">{char.name}</p>
                        <p className="text-xs text-tron-silver-400" style={{ color: getClassColor(char.class) }}>{char.class}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-wow-gold">{char.itemLevel}</p>
                        <p className="text-xs text-tron-silver-400">ilvl</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Guild View */}
        {currentView === 'guild' && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Guild Header */}
            <Card className="card-wow card-wow-gold mb-8 overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-void-purple via-shadow-purple/50 to-void-purple relative">
                <div className="absolute inset-0 bg-pattern-dots opacity-30" />
              </div>
              <CardContent className="relative pt-0">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 relative z-10">
                  <Image src={mockGuild.logo} alt={mockGuild.name} width={80} height={80} className="w-20 h-20 rounded-lg border-4 border-dark-900 bg-dark-900" />
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-wow-gold" style={{ fontFamily: 'Cinzel, serif' }}>{mockGuild.name}</h1>
                    <p className="text-tron-silver-400">{mockGuild.realm} • {mockGuild.faction} • {mockGuild.progress}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button className="btn-wow-primary">Edit Guild</Button>
                    <Button variant="outline" className="border-dark-600 text-tron-silver-400 hover:text-wow-gold hover:border-wow-gold">
                      Invite Members
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guild Tabs */}
            <Tabs defaultValue="roster" className="space-y-6">
              <TabsList className="bg-dark-900 border border-dark-700">
                <TabsTrigger value="roster" className="data-[state=active]:bg-wow-gold/20 data-[state=active]:text-wow-gold">
                  <Users className="h-4 w-4 mr-2" /> Roster
                </TabsTrigger>
                <TabsTrigger value="events" className="data-[state=active]:bg-wow-gold/20 data-[state=active]:text-wow-gold">
                  <Calendar className="h-4 w-4 mr-2" /> Events
                </TabsTrigger>
                <TabsTrigger value="progress" className="data-[state=active]:bg-wow-gold/20 data-[state=active]:text-wow-gold">
                  <Trophy className="h-4 w-4 mr-2" /> Progress
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-wow-gold/20 data-[state=active]:text-wow-gold">
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="roster">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tron-silver-500" />
                    <Input placeholder="Search members..." className="pl-9 bg-dark-900 border-dark-700" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-full sm:w-40 bg-dark-900 border-dark-700">
                      <SelectValue placeholder="Rank" />
                    </SelectTrigger>
                    <SelectContent className="bg-dark-900 border-dark-700">
                      <SelectItem value="all">All Ranks</SelectItem>
                      {GUILD_RANKS.map((rank) => (
                        <SelectItem key={rank.id} value={rank.id}>{rank.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-full sm:w-40 bg-dark-900 border-dark-700">
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent className="bg-dark-900 border-dark-700">
                      <SelectItem value="all">All Classes</SelectItem>
                      {WOW_CLASSES.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Roster Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {mockCharacters.map((char) => (
                    <Card key={char.id} className="card-wow hover:border-dark-600 cursor-pointer transition-all hover:scale-[1.02]" onClick={() => setSelectedCharacter(char.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="h-12 w-12 border-2" style={{ borderColor: getClassColor(char.class) }}>
                            <AvatarFallback style={{ backgroundColor: getClassColor(char.class) + '20', color: getClassColor(char.class) }}>
                              {char.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-tron-silver-200 truncate">{char.name}</p>
                              <div className={`w-2 h-2 rounded-full ${char.status === 'online' ? 'bg-green-500' : 'bg-tron-silver-500'}`} />
                            </div>
                            <p className="text-sm" style={{ color: getClassColor(char.class) }}>{char.spec} {char.class}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <Badge className={`${char.rank === 'leader' ? 'badge-leader' : char.rank === 'officer' ? 'badge-officer' : char.rank === 'raider' ? 'badge-raider' : 'badge-trial'}`}>
                            {GUILD_RANKS.find(r => r.id === char.rank)?.name}
                          </Badge>
                          <div className="flex gap-3">
                            <span className="text-tron-silver-400"><span className="text-wow-gold font-medium">{char.itemLevel}</span> ilvl</span>
                            <span className="text-tron-silver-400"><span className="text-sapphire-blue font-medium">{char.mPlusScore}</span> M+</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="events">
                <Card className="card-wow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Upcoming Events</CardTitle>
                      <Button className="btn-wow-primary">
                        <Calendar className="h-4 w-4 mr-2" /> Create Event
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockRaids.map((raid) => (
                        <div key={raid.id} className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${raid.difficulty === 'Mythic' ? 'bg-wow-gold/20' : raid.difficulty === 'Heroic' ? 'bg-shadow-purple/20' : 'bg-sapphire-blue/20'}`}>
                              <Calendar className={`h-6 w-6 ${raid.difficulty === 'Mythic' ? 'text-wow-gold' : raid.difficulty === 'Heroic' ? 'text-shadow-purple' : 'text-sapphire-blue'}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-tron-silver-200">{raid.name}</h3>
                              <p className="text-sm text-tron-silver-400">{raid.type} • {raid.difficulty}</p>
                              <p className="text-sm text-tron-silver-500">{new Date(raid.scheduledFor).toLocaleDateString()} at {raid.time}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-wow-gold">{raid.confirmed}/{raid.maxPlayers}</p>
                            <p className="text-sm text-tron-silver-400">confirmed</p>
                            <Button variant="outline" size="sm" className="mt-2 border-dark-600 text-tron-silver-400 hover:text-wow-gold hover:border-wow-gold">
                              Manage
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="progress">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="card-wow">
                    <CardHeader>
                      <CardTitle>Raid Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {['LFR', 'Normal', 'Heroic', 'Mythic'].map((diff) => (
                          <div key={diff} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className={diff === 'Mythic' ? 'text-wow-gold' : 'text-tron-silver-400'}>{diff}</span>
                              <span className="text-tron-silver-300">{diff === 'Mythic' ? '7/9' : diff === 'Heroic' ? '9/9' : '9/9'}</span>
                            </div>
                            <Progress value={diff === 'Mythic' ? 78 : 100} className={`h-2 ${diff === 'Mythic' ? '[&>div]:bg-wow-gold' : '[&>div]:bg-shadow-purple'}`} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-wow">
                    <CardHeader>
                      <CardTitle>Guild Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-dark-800/50 rounded-lg text-center">
                          <p className="text-3xl font-bold text-wow-gold">{mockStats.activeMembers}</p>
                          <p className="text-sm text-tron-silver-400">Active Members</p>
                        </div>
                        <div className="p-4 bg-dark-800/50 rounded-lg text-center">
                          <p className="text-3xl font-bold text-sapphire-blue">{mockStats.mPlusAvg.toLocaleString()}</p>
                          <p className="text-sm text-tron-silver-400">Avg M+ Score</p>
                        </div>
                        <div className="p-4 bg-dark-800/50 rounded-lg text-center">
                          <p className="text-3xl font-bold text-shadow-purple">{mockStats.attendanceRate}%</p>
                          <p className="text-sm text-tron-silver-400">Attendance</p>
                        </div>
                        <div className="p-4 bg-dark-800/50 rounded-lg text-center">
                          <p className="text-3xl font-bold text-green-500">487</p>
                          <p className="text-sm text-tron-silver-400">Avg ilvl</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="settings">
                <Card className="card-wow">
                  <CardHeader>
                    <CardTitle>Guild Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-tron-silver-400 mb-1 block">Guild Name</label>
                          <Input defaultValue={mockGuild.name} className="bg-dark-800 border-dark-700" />
                        </div>
                        <div>
                          <label className="text-sm text-tron-silver-400 mb-1 block">Realm</label>
                          <Input defaultValue={mockGuild.realm} className="bg-dark-800 border-dark-700" />
                        </div>
                        <div>
                          <label className="text-sm text-tron-silver-400 mb-1 block">Description</label>
                          <textarea 
                            defaultValue={mockGuild.description} 
                            className="w-full h-24 bg-dark-800 border border-dark-700 rounded-md p-3 text-tron-silver-200 resize-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-tron-silver-400 mb-1 block">Discord URL</label>
                          <Input defaultValue={mockGuild.discordUrl} className="bg-dark-800 border-dark-700" />
                        </div>
                        <div>
                          <label className="text-sm text-tron-silver-400 mb-1 block">Website</label>
                          <Input defaultValue={mockGuild.website} className="bg-dark-800 border-dark-700" />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                          <div>
                            <p className="text-tron-silver-200">Recruiting</p>
                            <p className="text-sm text-tron-silver-400">Show your guild in recruitment listings</p>
                          </div>
                          <input type="checkbox" defaultChecked={mockGuild.recruiting} className="w-5 h-5 accent-wow-gold" />
                        </div>
                      </div>
                    </div>
                    <Button className="btn-wow-primary">Save Changes</Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Raids View */}
        {currentView === 'raids' && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
                  <span className="text-wow-gold">Raid</span> Management
                </h1>
                <p className="text-tron-silver-400 mt-1">Schedule and manage your raid events</p>
              </div>
              <Button className="btn-wow-primary">
                <Calendar className="h-4 w-4 mr-2" /> Create Raid
              </Button>
            </div>

            {/* Calendar Preview */}
            <Card className="card-wow mb-8">
              <CardHeader>
                <CardTitle>March 2026</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 text-center">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-tron-silver-400 text-sm font-medium py-2">{day}</div>
                  ))}
                  {Array.from({ length: 35 }, (_, i) => {
                    const day = i - 5;
                    const hasRaid = [4, 6, 11, 13, 18, 20, 25, 27].includes(day);
                    return (
                      <div 
                        key={i} 
                        className={`aspect-square flex items-center justify-center rounded-lg text-sm cursor-pointer transition-colors
                          ${day < 1 || day > 31 ? 'text-tron-silver-600' : 'text-tron-silver-300 hover:bg-dark-800'}
                          ${hasRaid ? 'bg-wow-gold/20 text-wow-gold font-bold hover:bg-wow-gold/30' : ''}`}
                      >
                        {day > 0 && day <= 31 ? day : ''}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Raid List */}
            <div className="space-y-4">
              {mockRaids.map((raid) => (
                <Card key={raid.id} className="card-wow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-xl ${raid.difficulty === 'Mythic' ? 'bg-gradient-to-br from-wow-gold/30 to-yellow-600/30' : raid.difficulty === 'Heroic' ? 'bg-gradient-to-br from-shadow-purple/30 to-purple-700/30' : 'bg-gradient-to-br from-sapphire-blue/30 to-blue-700/30'}`}>
                          <Calendar className={`h-8 w-8 ${raid.difficulty === 'Mythic' ? 'text-wow-gold' : raid.difficulty === 'Heroic' ? 'text-shadow-purple' : 'text-sapphire-blue'}`} />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-tron-silver-200">{raid.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge className={`${raid.difficulty === 'Mythic' ? 'badge-leader' : raid.difficulty === 'Heroic' ? 'badge-officer' : 'badge-raider'}`}>
                              {raid.difficulty}
                            </Badge>
                            <span className="text-tron-silver-400">{raid.type}</span>
                            <span className="text-tron-silver-500">•</span>
                            <span className="text-tron-silver-400">
                              {new Date(raid.scheduledFor).toLocaleDateString()} at {raid.time}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-wow-gold">{raid.confirmed}</p>
                          <p className="text-sm text-tron-silver-400">Confirmed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-sapphire-blue">{raid.signups - raid.confirmed}</p>
                          <p className="text-sm text-tron-silver-400">Tentative</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-tron-silver-300">{raid.maxPlayers - raid.signups}</p>
                          <p className="text-sm text-tron-silver-400">Spots Left</p>
                        </div>
                        <Button className="btn-wow-secondary">
                          Manage
                        </Button>
                      </div>
                    </div>

                    {/* Composition Preview */}
                    <div className="mt-6 pt-6 border-t border-dark-700">
                      <p className="text-sm text-tron-silver-400 mb-3">Current Composition</p>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-sapphire-blue" />
                          <span className="text-tron-silver-300">2 Tanks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Heart className="h-5 w-5 text-green-500" />
                          <span className="text-tron-silver-300">4 Healers</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Sword className="h-5 w-5 text-red-500" />
                          <span className="text-tron-silver-300">16 DPS</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* M+ Tracker View */}
        {currentView === 'mplus' && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
                <span className="text-sapphire-blue">Mythic+</span> Tracker
              </h1>
              <p className="text-tron-silver-400 mt-1">Track your M+ progress and find groups</p>
            </div>

            {/* Weekly Affixes */}
            <Card className="card-wow card-wow-blue mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-sapphire-blue" />
                    Weekly Affixes
                  </CardTitle>
                  <Badge className="bg-sapphire-blue/20 text-sapphire-blue border-sapphire-blue">
                    <Clock className="h-3 w-3 mr-1" />
                    Resets in 3d 14h
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  {currentWeekAffixes.map((affix, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-dark-800/50 rounded-lg">
                      <div className={`p-3 rounded-lg ${i === 0 ? 'bg-red-500/20' : i === 1 ? 'bg-orange-500/20' : 'bg-purple-500/20'}`}>
                        {i === 0 ? <Crown className={`h-6 w-6 ${i === 0 ? 'text-red-400' : 'text-orange-400'}`} /> : 
                         i === 1 ? <Flame className="h-6 w-6 text-orange-400" /> : 
                         <Activity className="h-6 w-6 text-purple-400" />}
                      </div>
                      <div>
                        <p className="font-semibold text-tron-silver-200">{affix.name}</p>
                        <p className="text-sm text-tron-silver-400 line-clamp-2">{affix.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Dungeon Progress */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="card-wow">
                <CardHeader>
                  <CardTitle>Dungeon Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {mockDungeonProgress.map((dungeon, i) => (
                      <div key={i} className={`p-3 rounded-lg ${dungeon.completed ? 'bg-green-500/10 border border-green-500/30' : 'bg-dark-800/50 border border-dark-700'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-tron-silver-200 text-sm">{dungeon.abbreviation}</p>
                          {dungeon.completed && <CheckCircle className="h-4 w-4 text-green-500" />}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-lg font-bold ${dungeon.completed ? 'text-wow-gold' : 'text-tron-silver-400'}`}>
                            +{dungeon.bestKey}
                          </span>
                          <span className="text-sm text-tron-silver-400">{dungeon.score} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="card-wow">
                <CardHeader>
                  <CardTitle>Recent Runs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockMPlusRuns.slice(0, 6).map((run, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Target className={`h-5 w-5 ${run.completed ? 'text-green-500' : 'text-red-500'}`} />
                          <div>
                            <p className="font-medium text-tron-silver-200">{run.dungeon}</p>
                            <p className="text-sm text-tron-silver-400">+{run.level}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-tron-silver-200">{run.time}</p>
                          <p className="text-sm text-sapphire-blue">+{run.score} pts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Character Scores */}
            <Card className="card-wow mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Guild M+ Scores</CardTitle>
                  <Select defaultValue="current">
                    <SelectTrigger className="w-40 bg-dark-900 border-dark-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-dark-900 border-dark-700">
                      <SelectItem value="current">Current Season</SelectItem>
                      <SelectItem value="previous">Previous Season</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dark-700">
                        <th className="text-left p-3 text-tron-silver-400 font-medium">Character</th>
                        <th className="text-left p-3 text-tron-silver-400 font-medium">Class</th>
                        <th className="text-right p-3 text-tron-silver-400 font-medium">Score</th>
                        <th className="text-right p-3 text-tron-silver-400 font-medium">Best Run</th>
                        <th className="text-right p-3 text-tron-silver-400 font-medium">Runs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockCharacters.slice(0, 10).sort((a, b) => b.mPlusScore - a.mPlusScore).map((char, i) => (
                        <tr key={char.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-lg font-bold ${i < 3 ? 'text-wow-gold' : 'text-tron-silver-400'}`}>#{i + 1}</span>
                              <span className="text-tron-silver-200">{char.name}</span>
                            </div>
                          </td>
                          <td className="p-3" style={{ color: getClassColor(char.class) }}>{char.class}</td>
                          <td className="p-3 text-right font-bold text-sapphire-blue">{char.mPlusScore.toLocaleString()}</td>
                          <td className="p-3 text-right text-tron-silver-300">+22</td>
                          <td className="p-3 text-right text-tron-silver-300">92</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recruitment View */}
        {currentView === 'recruitment' && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
                <span className="text-wow-gold">Recruitment</span> Marketplace
              </h1>
              <p className="text-tron-silver-400 mt-1">Find guilds or players that match your needs</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-8">
              <Select defaultValue="all">
                <SelectTrigger className="w-40 bg-dark-900 border-dark-700">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent className="bg-dark-900 border-dark-700">
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="us">US</SelectItem>
                  <SelectItem value="eu">EU</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="w-40 bg-dark-900 border-dark-700">
                  <SelectValue placeholder="Faction" />
                </SelectTrigger>
                <SelectContent className="bg-dark-900 border-dark-700">
                  <SelectItem value="all">Both Factions</SelectItem>
                  <SelectItem value="horde">Horde</SelectItem>
                  <SelectItem value="alliance">Alliance</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="w-40 bg-dark-900 border-dark-700">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="bg-dark-900 border-dark-700">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="tank">Tank</SelectItem>
                  <SelectItem value="healer">Healer</SelectItem>
                  <SelectItem value="dps">DPS</SelectItem>
                </SelectContent>
              </Select>
              <Button className="btn-wow-primary">Search</Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="guilds" className="space-y-6">
              <TabsList className="bg-dark-900 border border-dark-700">
                <TabsTrigger value="guilds" className="data-[state=active]:bg-wow-gold/20 data-[state=active]:text-wow-gold">
                  <Castle className="h-4 w-4 mr-2" /> Guilds Recruiting
                </TabsTrigger>
                <TabsTrigger value="players" className="data-[state=active]:bg-wow-gold/20 data-[state=active]:text-wow-gold">
                  <Users className="h-4 w-4 mr-2" /> Players LFG
                </TabsTrigger>
              </TabsList>

              <TabsContent value="guilds">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mockRecruitmentListings.map((listing) => (
                    <Card key={listing.id} className="card-wow card-wow-gold">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-tron-silver-200">{listing.guildName}</CardTitle>
                          <Badge className={listing.faction === 'Horde' ? 'bg-red-500/20 text-red-400 border-red-500' : 'bg-blue-500/20 text-blue-400 border-blue-500'}>
                            {listing.faction}
                          </Badge>
                        </div>
                        <CardDescription>{listing.realm} • {listing.progress}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-tron-silver-400">Min ilvl:</span>
                            <span className="text-wow-gold">{listing.requirements.itemLevel}+</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-tron-silver-400">M+ Score:</span>
                            <span className="text-sapphire-blue">{listing.requirements.mPlusScore}+</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-tron-silver-400">Attendance:</span>
                            <span className="text-tron-silver-300">{listing.requirements.attendance}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-tron-silver-400">Schedule:</span>
                            <span className="text-tron-silver-300">{listing.requirements.days.join(', ')}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {listing.roles.map((role) => (
                            <Badge key={role} className={`${role === 'Tank' ? 'bg-sapphire-blue/20 text-sapphire-blue' : role === 'Healer' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} border-current`}>
                              {role}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-tron-silver-400">{listing.description}</p>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full btn-wow-primary">Apply Now</Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="players">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mockPlayerCards.map((player) => (
                    <Card key={player.id} className="card-wow">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-14 w-14 border-2" style={{ borderColor: getClassColor(player.class) }}>
                            <AvatarFallback style={{ backgroundColor: getClassColor(player.class) + '20', color: getClassColor(player.class) }}>
                              {player.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-tron-silver-200">{player.name}</CardTitle>
                            <p className="text-sm" style={{ color: getClassColor(player.class) }}>{player.spec} {player.class}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="p-2 bg-dark-800/50 rounded text-center">
                            <p className="text-wow-gold font-bold">{player.itemLevel}</p>
                            <p className="text-tron-silver-400 text-xs">ilvl</p>
                          </div>
                          <div className="p-2 bg-dark-800/50 rounded text-center">
                            <p className="text-sapphire-blue font-bold">{player.mPlusScore}</p>
                            <p className="text-tron-silver-400 text-xs">M+ Score</p>
                          </div>
                        </div>

                        {/* Anti-Booster Metrics */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-tron-silver-400 text-sm">Parse Avg</span>
                            <div className="flex items-center gap-2">
                              <Progress value={player.parseAvg || 0} className="w-20 h-1.5" />
                              <span className={`text-sm font-medium ${player.parseAvg && player.parseAvg > 80 ? 'text-green-500' : player.parseAvg && player.parseAvg > 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                {player.parseAvg}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-tron-silver-400 text-sm">Death Rate</span>
                            <span className={`text-sm font-medium ${player.deathRate < 20 ? 'text-green-500' : player.deathRate < 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {player.deathRate}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-tron-silver-400 text-sm">Buff Uptime</span>
                            <span className={`text-sm font-medium ${player.buffUptime > 90 ? 'text-green-500' : player.buffUptime > 75 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {player.buffUptime}%
                            </span>
                          </div>
                        </div>

                        {/* AI Summary */}
                        <div className="p-3 bg-shadow-purple/10 border border-shadow-purple/30 rounded-lg">
                          <p className="text-xs text-tron-silver-400 mb-1 flex items-center gap-1">
                            <Zap className="h-3 w-3 text-shadow-purple" /> AI Summary
                          </p>
                          <p className="text-sm text-tron-silver-200">{player.autoMemo}</p>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full btn-wow-primary">Invite to Guild</Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Log Analysis View */}
        {currentView === 'logs' && (
          <div className="w-full px-4 lg:px-6 py-4">
            <LogAnalysis />
          </div>
        )}

        {/* Player Cards View */}
        {currentView === 'playercards' && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
                <span className="text-wow-gold">Player</span> Cards
              </h1>
              <p className="text-tron-silver-400 mt-1">Detailed player profiles with performance metrics</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {mockPlayerCards.map((player) => (
                <Card key={player.id} className="card-wow">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2" style={{ borderColor: getClassColor(player.class) }}>
                        <AvatarFallback className="text-2xl" style={{ backgroundColor: getClassColor(player.class) + '20', color: getClassColor(player.class) }}>
                          {player.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-xl text-tron-silver-200">{player.name}</CardTitle>
                        <p className="text-base" style={{ color: getClassColor(player.class) }}>{player.spec} {player.class}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-wow-gold font-medium">{player.itemLevel} ilvl</span>
                          <span className="text-sapphire-blue font-medium">{player.mPlusScore.toLocaleString()} M+</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Performance Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-dark-800/50 rounded-lg text-center">
                        <p className={`text-xl font-bold ${player.parseAvg && player.parseAvg > 80 ? 'text-green-500' : 'text-yellow-500'}`}>
                          {player.parseAvg}%
                        </p>
                        <p className="text-xs text-tron-silver-400">Parse Avg</p>
                      </div>
                      <div className="p-3 bg-dark-800/50 rounded-lg text-center">
                        <p className={`text-xl font-bold ${player.deathRate < 20 ? 'text-green-500' : player.deathRate < 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {player.deathRate}%
                        </p>
                        <p className="text-xs text-tron-silver-400">Death Rate</p>
                      </div>
                      <div className="p-3 bg-dark-800/50 rounded-lg text-center">
                        <p className={`text-xl font-bold ${player.buffUptime > 90 ? 'text-green-500' : 'text-yellow-500'}`}>
                          {player.buffUptime}%
                        </p>
                        <p className="text-xs text-tron-silver-400">Buff Uptime</p>
                      </div>
                    </div>

                    {/* Additional Metrics */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between p-2 bg-dark-800/50 rounded">
                        <span className="text-tron-silver-400">Avoidable Damage</span>
                        <span className={player.avoidableDamage < 10 ? 'text-green-500' : 'text-orange-400'}>{player.avoidableDamage}%</span>
                      </div>
                      <div className="flex justify-between p-2 bg-dark-800/50 rounded">
                        <span className="text-tron-silver-400">Mechanic Errors</span>
                        <span className={player.mechanicErrors < 5 ? 'text-green-500' : 'text-orange-400'}>{player.mechanicErrors}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-dark-800/50 rounded">
                        <span className="text-tron-silver-400">Raids Attended</span>
                        <span className="text-tron-silver-200">{player.raidsAttended}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-dark-800/50 rounded">
                        <span className="text-tron-silver-400">Reliability</span>
                        <span className={player.reliability > 90 ? 'text-green-500' : 'text-yellow-500'}>{player.reliability}%</span>
                      </div>
                    </div>

                    {/* Strengths */}
                    <div>
                      <p className="text-sm text-tron-silver-400 mb-2">Strengths</p>
                      <div className="flex flex-wrap gap-2">
                        {player.strengths.map((strength, i) => (
                          <Badge key={i} className="bg-green-500/20 text-green-400 border-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" /> {strength}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Improvements */}
                    {player.improvements.length > 0 && (
                      <div>
                        <p className="text-sm text-tron-silver-400 mb-2">Areas to Improve</p>
                        <div className="flex flex-wrap gap-2">
                          {player.improvements.map((improvement, i) => (
                            <Badge key={i} className="bg-orange-500/20 text-orange-400 border-orange-500">
                              <AlertCircle className="h-3 w-3 mr-1" /> {improvement}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Memo */}
                    <div className="p-4 bg-gradient-to-r from-shadow-purple/20 to-transparent border-l-2 border-shadow-purple rounded-r-lg">
                      <p className="text-xs text-shadow-purple mb-1 flex items-center gap-1">
                        <Zap className="h-3 w-3" /> AI-Generated Summary
                      </p>
                      <p className="text-sm text-tron-silver-200">{player.autoMemo}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-dark-800 bg-dark-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Image src="/wowtron-logo.png" alt="WoWtron" width={96} height={24} className="h-6 w-auto" />
            <span className="text-tron-silver-400 text-sm">{t('footer.rights')}</span>
            
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="text-tron-silver-400 hover:text-wow-gold text-sm transition-colors">Privacy</a>
            <a href="#" className="text-tron-silver-400 hover:text-wow-gold text-sm transition-colors">Terms</a>
            <a href="#" className="text-tron-silver-400 hover:text-wow-gold text-sm transition-colors">Support</a>
          </div>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}



