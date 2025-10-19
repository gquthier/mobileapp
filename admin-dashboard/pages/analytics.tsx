import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MonitoringService } from '../lib/monitoringService';

type TabType = 'overview' | 'users' | 'videos' | 'performance' | 'ai' | 'quality' | 'finance';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Data states
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [videoAnalytics, setVideoAnalytics] = useState<any>(null);
  const [transcriptionAnalytics, setTranscriptionAnalytics] = useState<any>(null);
  const [chapterAnalytics, setChapterAnalytics] = useState<any>(null);
  const [costAnalytics, setCostAnalytics] = useState<any>(null);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [topErrors, setTopErrors] = useState<any[]>([]);
  const [recentBugs, setRecentBugs] = useState<any[]>([]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [
        users,
        videos,
        transcriptions,
        chapters,
        costs,
        growth,
        monitoringStats,
        errors,
        bugs,
      ] = await Promise.all([
        MonitoringService.getUserAnalytics(),
        MonitoringService.getVideoAnalytics(),
        MonitoringService.getTranscriptionAnalytics(),
        MonitoringService.getChapterAnalytics(),
        MonitoringService.getCostAnalytics(),
        MonitoringService.getGrowthData(),
        MonitoringService.getMonitoringStats(),
        MonitoringService.getTopErrors(10),
        MonitoringService.getRecentBugs(20),
      ]);

      setUserAnalytics(users);
      setVideoAnalytics(videos);
      setTranscriptionAnalytics(transcriptions);
      setChapterAnalytics(chapters);
      setCostAnalytics(costs);
      setGrowthData(growth);
      setStats(monitoringStats);
      setTopErrors(errors);
      setRecentBugs(bugs);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'users', label: '👥 Utilisateurs', icon: '👥' },
    { id: 'videos', label: '🎥 Vidéos', icon: '🎥' },
    { id: 'performance', label: '⚡ Performance', icon: '⚡' },
    { id: 'ai', label: '🤖 IA & Features', icon: '🤖' },
    { id: 'quality', label: '🐛 Qualité', icon: '🐛' },
    { id: 'finance', label: '💰 Finance', icon: '💰' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 Analytics Dashboard PRO</h1>
              <p className="text-gray-600 mt-1">Vue complète de toutes les métriques</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/monitoring"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
              >
                📊 Monitoring
              </Link>
              <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 font-medium text-sm">Live</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors rounded-t-lg ${
                  activeTab === tab.id
                    ? 'bg-gray-50 text-indigo-600 border-t-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab userAnalytics={userAnalytics} videoAnalytics={videoAnalytics} transcriptionAnalytics={transcriptionAnalytics} stats={stats} growthData={growthData} />}
        {activeTab === 'users' && <UsersTab data={userAnalytics} growthData={growthData} />}
        {activeTab === 'videos' && <VideosTab data={videoAnalytics} chapterAnalytics={chapterAnalytics} growthData={growthData} />}
        {activeTab === 'performance' && <PerformanceTab stats={stats} transcriptionAnalytics={transcriptionAnalytics} />}
        {activeTab === 'ai' && <AITab transcriptionAnalytics={transcriptionAnalytics} />}
        {activeTab === 'quality' && <QualityTab topErrors={topErrors} recentBugs={recentBugs} />}
        {activeTab === 'finance' && <FinanceTab data={costAnalytics} videoAnalytics={videoAnalytics} />}
      </div>
    </div>
  );
}

// ============================================
// TAB COMPONENTS
// ============================================

function OverviewTab({ userAnalytics, videoAnalytics, transcriptionAnalytics, stats, growthData }: any) {
  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Utilisateurs"
          value={userAnalytics?.totalUsers || 0}
          subtitle={`${userAnalytics?.activeUsers30d || 0} actifs (30j)`}
          icon="👥"
          color="bg-blue-500"
        />
        <MetricCard
          title="Total Vidéos"
          value={videoAnalytics?.totalVideos || 0}
          subtitle={`${videoAnalytics?.videosMonth || 0} ce mois`}
          icon="🎥"
          color="bg-purple-500"
        />
        <MetricCard
          title="Transcriptions"
          value={transcriptionAnalytics?.completed || 0}
          subtitle={`${transcriptionAnalytics?.successRate?.toFixed(0) || 0}% succès`}
          icon="📝"
          color="bg-green-500"
        />
        <MetricCard
          title="Taux d'activation"
          value={`${userAnalytics?.activationRate?.toFixed(0) || 0}%`}
          subtitle="Users avec vidéos"
          icon="✅"
          color="bg-orange-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="📈 Croissance (30 jours)">
          <SimpleLineChart
            data={growthData}
            xKey="date"
            yKey="videos"
            color="rgb(99, 102, 241)"
            label="Vidéos"
          />
        </ChartCard>

        <ChartCard title="👥 Nouveaux Utilisateurs (30j)">
          <SimpleLineChart
            data={growthData}
            xKey="date"
            yKey="users"
            color="rgb(34, 197, 94)"
            label="Users"
          />
        </ChartCard>
      </div>

      {/* Distribution Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatsCard title="🌍 Distribution Langues">
          {userAnalytics?.languageDistribution && (
            <div className="space-y-2">
              {Object.entries(userAnalytics.languageDistribution).map(([lang, count]: any) => (
                <div key={lang} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 uppercase">{lang}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${(count / userAnalytics.totalUsers) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StatsCard>

        <StatsCard title="⏱️ Distribution Durées">
          {videoAnalytics?.durationDistribution && (
            <div className="space-y-2">
              {Object.entries(videoAnalytics.durationDistribution).map(([range, count]: any) => (
                <div key={range} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">{formatDurationRange(range)}</span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          )}
        </StatsCard>

        <StatsCard title="📊 Status Transcriptions">
          <div className="space-y-3">
            <StatusRow label="Completed" count={transcriptionAnalytics?.completed || 0} color="text-green-600" />
            <StatusRow label="Processing" count={transcriptionAnalytics?.processing || 0} color="text-blue-600" />
            <StatusRow label="Pending" count={transcriptionAnalytics?.pending || 0} color="text-yellow-600" />
            <StatusRow label="Failed" count={transcriptionAnalytics?.failed || 0} color="text-red-600" />
          </div>
        </StatsCard>
      </div>
    </div>
  );
}

function UsersTab({ data, growthData }: any) {
  if (!data) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* User Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Utilisateurs"
          value={data.totalUsers}
          subtitle="Inscrits sur la plateforme"
          icon="👥"
          color="bg-blue-500"
        />
        <MetricCard
          title="Users Actifs (30j)"
          value={data.activeUsers30d}
          subtitle={`${((data.activeUsers30d / data.totalUsers) * 100).toFixed(0)}% du total`}
          icon="🔥"
          color="bg-green-500"
        />
        <MetricCard
          title="Taux d'Activation"
          value={`${data.activationRate.toFixed(0)}%`}
          subtitle={`${data.usersWithVideos} users avec vidéos`}
          icon="✅"
          color="bg-purple-500"
        />
      </div>

      {/* Acquisition Metrics */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">📈 Acquisition</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Aujourd'hui</p>
            <p className="text-2xl font-bold text-gray-900">{data.newUsersToday}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">7 derniers jours</p>
            <p className="text-2xl font-bold text-gray-900">{data.newUsers7d}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">30 derniers jours</p>
            <p className="text-2xl font-bold text-gray-900">{data.newUsers30d}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Users Zombies</p>
            <p className="text-2xl font-bold text-red-600">{data.zombieUsers}</p>
            <p className="text-xs text-gray-500">0 vidéos</p>
          </div>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Engagement</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">DAU (Daily Active Users)</p>
            <p className="text-2xl font-bold text-gray-900">{data.dau}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">WAU (Weekly Active Users)</p>
            <p className="text-2xl font-bold text-gray-900">{data.wau}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">MAU (Monthly Active Users)</p>
            <p className="text-2xl font-bold text-gray-900">{data.mau}</p>
          </div>
        </div>
      </div>

      {/* Growth Chart */}
      <ChartCard title="📈 Croissance Utilisateurs (30 jours)">
        <SimpleLineChart
          data={growthData}
          xKey="date"
          yKey="users"
          color="rgb(34, 197, 94)"
          label="Nouveaux Users"
        />
      </ChartCard>
    </div>
  );
}

function VideosTab({ data, chapterAnalytics, growthData }: any) {
  if (!data) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Video Volume Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Vidéos"
          value={data.totalVideos}
          subtitle="Sur toute la plateforme"
          icon="🎥"
          color="bg-purple-500"
        />
        <MetricCard
          title="Ce Mois"
          value={data.videosMonth}
          subtitle={`${data.videosWeek} cette semaine`}
          icon="📅"
          color="bg-blue-500"
        />
        <MetricCard
          title="Aujourd'hui"
          value={data.videosToday}
          subtitle="Vidéos uploadées"
          icon="🆕"
          color="bg-green-500"
        />
        <MetricCard
          title="Durée Totale"
          value={`${data.totalDurationHours.toFixed(0)}h`}
          subtitle={`${(data.avgDuration / 60).toFixed(1)} min moy.`}
          icon="⏱️"
          color="bg-orange-500"
        />
      </div>

      {/* Content Types */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">📹 Types de Contenu</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Vidéos Enregistrées</p>
            <p className="text-3xl font-bold text-blue-600">{data.recordedVideos}</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${data.recordedImportedRatio}%` }}
              />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Vidéos Importées</p>
            <p className="text-3xl font-bold text-green-600">{data.importedVideos}</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${100 - data.recordedImportedRatio}%` }}
              />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Ratio Recorded/Imported</p>
            <p className="text-3xl font-bold text-gray-900">{data.recordedImportedRatio.toFixed(0)}%</p>
            <p className="text-xs text-gray-500 mt-2">de vidéos enregistrées</p>
          </div>
        </div>
      </div>

      {/* Duration Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatsCard title="⏱️ Distribution Durées">
          <div className="space-y-3">
            {Object.entries(data.durationDistribution).map(([range, count]: any) => (
              <div key={range} className="flex justify-between items-center">
                <span className="text-sm text-gray-700">{formatDurationRange(range)}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${(count / data.totalVideos) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </StatsCard>

        <StatsCard title="📚 Chapitres">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-sm text-gray-700">Total Chapitres</span>
              <span className="text-2xl font-bold text-gray-900">{chapterAnalytics?.totalChapters || 0}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-sm text-gray-700">Chapitres Actifs</span>
              <span className="text-2xl font-bold text-green-600">{chapterAnalytics?.activeChapters || 0}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-sm text-gray-700">Vidéos par Chapitre</span>
              <span className="text-2xl font-bold text-blue-600">{chapterAnalytics?.avgVideosPerChapter?.toFixed(1) || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Sans Chapitre</span>
              <span className="text-2xl font-bold text-orange-600">{chapterAnalytics?.percentWithoutChapter?.toFixed(0) || 0}%</span>
            </div>
          </div>
        </StatsCard>
      </div>

      {/* Growth Chart */}
      <ChartCard title="📈 Croissance Vidéos (30 jours)">
        <SimpleLineChart
          data={growthData}
          xKey="date"
          yKey="videos"
          color="rgb(168, 85, 247)"
          label="Vidéos"
        />
      </ChartCard>
    </div>
  );
}

function PerformanceTab({ stats, transcriptionAnalytics }: any) {
  return (
    <div className="space-y-6">
      {/* Upload Performance */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">⬆️ Performance Uploads</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Uploads Actifs</p>
            <p className="text-3xl font-bold text-blue-600">{stats?.uploadsInProgress || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Complétés (24h)</p>
            <p className="text-3xl font-bold text-green-600">{stats?.uploadsCompletedToday || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Échecs (24h)</p>
            <p className="text-3xl font-bold text-red-600">{stats?.uploadsFailedToday || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Taux de Succès</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.successRate?.toFixed(0) || 0}%</p>
          </div>
        </div>
      </div>

      {/* Transcription Performance */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">📝 Performance Transcriptions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Jobs</p>
            <p className="text-3xl font-bold text-gray-900">{transcriptionAnalytics?.totalJobs || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-3xl font-bold text-green-600">{transcriptionAnalytics?.completed || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Failed</p>
            <p className="text-3xl font-bold text-red-600">{transcriptionAnalytics?.failed || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Taux de Succès</p>
            <p className="text-3xl font-bold text-gray-900">{transcriptionAnalytics?.successRate?.toFixed(0) || 0}%</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Temps Moyen</p>
              <p className="text-2xl font-bold text-gray-900">
                {transcriptionAnalytics?.avgTranscriptionTime ?
                  `${(transcriptionAnalytics.avgTranscriptionTime / 60).toFixed(1)} min` :
                  'N/A'
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">En Attente</p>
              <p className="text-2xl font-bold text-yellow-600">{transcriptionAnalytics?.pending || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">En Traitement</p>
              <p className="text-2xl font-bold text-blue-600">{transcriptionAnalytics?.processing || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Speed Stats */}
      {stats && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">⚡ Vitesse d'Upload</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Vitesse Moyenne</p>
              <p className="text-5xl font-bold text-purple-600">{stats.avgUploadSpeed?.toFixed(1) || 0}</p>
              <p className="text-lg text-gray-700 mt-2">MB/s</p>
            </div>
            <div className="flex flex-col justify-center space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">Uploads Rapides (&gt;10 MB/s)</span>
                <span className="text-lg font-semibold text-green-600">Good!</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">Network Performance</span>
                <span className="text-lg font-semibold text-blue-600">Optimal</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AITab({ transcriptionAnalytics }: any) {
  if (!transcriptionAnalytics) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Transcription Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Transcriptions"
          value={transcriptionAnalytics.totalJobs}
          subtitle="Jobs traités"
          icon="📝"
          color="bg-blue-500"
        />
        <MetricCard
          title="Mots Transcrits"
          value={transcriptionAnalytics.totalWords.toLocaleString()}
          subtitle={`${transcriptionAnalytics.avgWords.toFixed(0)} mots/vidéo`}
          icon="📄"
          color="bg-purple-500"
        />
        <MetricCard
          title="Taux de Succès"
          value={`${transcriptionAnalytics.successRate.toFixed(0)}%`}
          subtitle={`${transcriptionAnalytics.completed} complétées`}
          icon="✅"
          color="bg-green-500"
        />
        <MetricCard
          title="Temps Moyen"
          value={`${(transcriptionAnalytics.avgTranscriptionTime / 60).toFixed(1)} min`}
          subtitle="Par transcription"
          icon="⏱️"
          color="bg-orange-500"
        />
      </div>

      {/* Language Distribution */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">🌍 Distribution Langues Transcrites</h3>
        <div className="space-y-3">
          {transcriptionAnalytics.languageDistribution &&
            Object.entries(transcriptionAnalytics.languageDistribution).map(([lang, count]: any) => (
              <div key={lang} className="flex justify-between items-center">
                <span className="text-sm text-gray-700 uppercase font-medium">{lang}</span>
                <div className="flex items-center gap-2">
                  <div className="w-64 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-indigo-600 h-3 rounded-full"
                      style={{ width: `${(count / transcriptionAnalytics.totalJobs) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-12 text-right">{count}</span>
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {((count / transcriptionAnalytics.totalJobs) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* AI Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm p-6">
          <div className="text-4xl mb-3">🎯</div>
          <h4 className="text-lg font-semibold mb-2">Highlights IA</h4>
          <p className="text-sm text-gray-600">
            Extraction automatique des moments clés avec GPT-4.1 Nano
          </p>
          <p className="text-3xl font-bold text-indigo-600 mt-4">
            {transcriptionAnalytics.completed}
          </p>
          <p className="text-xs text-gray-500">Vidéos avec highlights</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-sm p-6">
          <div className="text-4xl mb-3">💬</div>
          <h4 className="text-lg font-semibold mb-2">Questions Personnalisées</h4>
          <p className="text-sm text-gray-600">
            50 questions générées par batch selon l'historique
          </p>
          <p className="text-3xl font-bold text-purple-600 mt-4">Active</p>
          <p className="text-xs text-gray-500">Système opérationnel</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-sm p-6">
          <div className="text-4xl mb-3">🤖</div>
          <h4 className="text-lg font-semibold mb-2">AssemblyAI</h4>
          <p className="text-sm text-gray-600">
            Transcription jusqu'à 5GB / 10h par fichier
          </p>
          <p className="text-3xl font-bold text-green-600 mt-4">
            {((transcriptionAnalytics.totalWords / 150) / 60).toFixed(0)}h
          </p>
          <p className="text-xs text-gray-500">Audio transcrit</p>
        </div>
      </div>
    </div>
  );
}

function QualityTab({ topErrors, recentBugs }: any) {
  return (
    <div className="space-y-6">
      {/* Bug Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Bugs"
          value={recentBugs.length}
          subtitle="Bugs remontés"
          icon="🐛"
          color="bg-red-500"
        />
        <MetricCard
          title="Critiques"
          value={recentBugs.filter((b: any) => b.severity === 'critical').length}
          subtitle="Nécessitent attention"
          icon="🚨"
          color="bg-orange-500"
        />
        <MetricCard
          title="Erreurs Fréquentes"
          value={topErrors.length}
          subtitle="Types différents"
          icon="⚠️"
          color="bg-yellow-500"
        />
        <MetricCard
          title="Taux de Bugs"
          value={`${((recentBugs.length / 100) * 100).toFixed(1)}%`}
          subtitle="Par 100 users"
          icon="📊"
          color="bg-blue-500"
        />
      </div>

      {/* Top Errors Table */}
      {topErrors.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">🔥 Erreurs les plus fréquentes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b-2">
                  <th className="pb-3 font-semibold">Erreur</th>
                  <th className="pb-3 text-right font-semibold">Occurrences</th>
                  <th className="pb-3 text-right font-semibold">Utilisateurs</th>
                  <th className="pb-3 text-right font-semibold">% Total</th>
                </tr>
              </thead>
              <tbody>
                {topErrors.map((error: any, idx: number) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{error.message}</td>
                    <td className="py-3 text-right text-gray-700 font-semibold">{error.count}</td>
                    <td className="py-3 text-right text-gray-700">{error.uniqueUsers}</td>
                    <td className="py-3 text-right">
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                        {error.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Bugs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">🐛 Bugs Récents</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {recentBugs.map((bug: any) => (
            <div
              key={bug.id}
              className="border-b border-gray-100 pb-3 mb-3 last:border-0 hover:bg-gray-50 p-2 rounded transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{bug.error_message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{bug.user_email || 'Anonyme'}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(bug.severity)}`}>
                      {bug.severity}
                    </span>
                    <span className="text-xs text-gray-400">{bug.error_type}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                  {new Date(bug.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FinanceTab({ data, videoAnalytics }: any) {
  if (!data) return <div>Loading...</div>;

  const totalUsers = videoAnalytics?.totalVideos ? videoAnalytics.totalVideos / 10 : 1; // Rough estimate

  return (
    <div className="space-y-6">
      {/* Cost Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Coût Total Mensuel"
          value={`$${data.totalMonthlyCost.toFixed(2)}`}
          subtitle="API + Stockage"
          icon="💰"
          color="bg-green-500"
        />
        <MetricCard
          title="Coût AssemblyAI"
          value={`$${data.assemblyAICost.toFixed(2)}`}
          subtitle={`${data.totalMinutesTranscribed.toFixed(0)} minutes`}
          icon="🎙️"
          color="bg-blue-500"
        />
        <MetricCard
          title="Coût OpenAI"
          value={`$${data.openAICost.toFixed(2)}`}
          subtitle="Highlights + Questions"
          icon="🤖"
          color="bg-purple-500"
        />
        <MetricCard
          title="Coût Stockage"
          value={`$${data.storageCost.toFixed(2)}`}
          subtitle={`${data.totalStorageGB.toFixed(1)} GB`}
          icon="💾"
          color="bg-orange-500"
        />
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Répartition des Coûts</h3>
        <div className="space-y-4">
          <CostBar
            label="AssemblyAI (Transcription)"
            amount={data.assemblyAICost}
            total={data.totalAPICost + data.storageCost}
            color="bg-blue-500"
          />
          <CostBar
            label="OpenAI (IA - Highlights & Questions)"
            amount={data.openAICost}
            total={data.totalAPICost + data.storageCost}
            color="bg-purple-500"
          />
          <CostBar
            label="Supabase Storage"
            amount={data.storageCost}
            total={data.totalAPICost + data.storageCost}
            color="bg-orange-500"
          />
        </div>
      </div>

      {/* Cost Per Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-sm text-gray-600 mb-2">Coût par Vidéo</h4>
          <p className="text-4xl font-bold text-gray-900">${data.costPerVideo.toFixed(3)}</p>
          <p className="text-xs text-gray-500 mt-2">Transcription + IA</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-sm text-gray-600 mb-2">Coût par Minute</h4>
          <p className="text-4xl font-bold text-gray-900">
            ${(data.assemblyAICost / data.totalMinutesTranscribed).toFixed(4)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Transcription uniquement</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-sm text-gray-600 mb-2">Coût par GB</h4>
          <p className="text-4xl font-bold text-gray-900">
            ${(data.storageCost / data.totalStorageGB).toFixed(3)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Stockage mensuel</p>
        </div>
      </div>

      {/* Storage Info */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">💾 Stockage Supabase</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">Espace Utilisé</p>
            <p className="text-5xl font-bold text-indigo-600">{data.totalStorageGB.toFixed(1)}</p>
            <p className="text-lg text-gray-700 mt-1">GB</p>
          </div>
          <div className="flex flex-col justify-center">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Coût mensuel</span>
                <span className="font-semibold text-gray-900">${data.storageCost.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full"
                  style={{ width: `${Math.min((data.totalStorageGB / 100) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">Limite recommandée: 100 GB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function MetricCard({ title, value, subtitle, icon, color }: any) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm text-gray-600 font-medium">{title}</p>
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}

function ChartCard({ title, children }: any) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function StatsCard({ title, children }: any) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function StatusRow({ label, count, color }: any) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-700">{label}</span>
      <span className={`text-xl font-bold ${color}`}>{count}</span>
    </div>
  );
}

function SimpleLineChart({ data, xKey, yKey, color, label }: any) {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-gray-500">Pas de données</div>;
  }

  const maxValue = Math.max(...data.map((d: any) => d[yKey]));
  const points = data.map((d: any, i: number) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (d[yKey] / maxValue) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative h-64">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />
        <polyline
          fill={color}
          fillOpacity="0.1"
          stroke="none"
          points={`0,100 ${points} 100,100`}
        />
      </svg>
      <div className="absolute top-0 left-0 text-xs text-gray-600 font-medium">
        {maxValue}
      </div>
      <div className="absolute bottom-0 left-0 text-xs text-gray-600">
        {data[0][xKey]}
      </div>
      <div className="absolute bottom-0 right-0 text-xs text-gray-600">
        {data[data.length - 1][xKey]}
      </div>
    </div>
  );
}

function CostBar({ label, amount, total, color }: any) {
  const percentage = (amount / total) * 100;

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">${amount.toFixed(2)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}% du total</p>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDurationRange(range: string): string {
  const ranges: Record<string, string> = {
    'under1min': '< 1 min',
    '1to3min': '1-3 min',
    '3to5min': '3-5 min',
    '5to10min': '5-10 min',
    'over10min': '> 10 min',
  };
  return ranges[range] || range;
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}
