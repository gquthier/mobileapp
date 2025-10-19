import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminService, AdminStats, TimeSeriesData } from '../lib/adminService';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadStats = async () => {
    try {
      const [statsData, timeData] = await Promise.all([
        AdminService.getAdminStats(),
        AdminService.getTimeSeriesData(30),
      ]);
      setStats(statsData);
      setTimeSeriesData(timeData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">Impossible de charger les statistiques</p>
      </div>
    );
  }

  const orientationData = [
    { name: 'Portrait', value: stats.videoOrientations.portrait },
    { name: 'Paysage', value: stats.videoOrientations.landscape },
  ];

  const uploadTypeData = [
    { name: 'Enregistrées', value: stats.uploadStats.totalUploaded - stats.uploadStats.totalImported },
    { name: 'Importées', value: stats.uploadStats.totalImported },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
              <p className="text-gray-600 mt-1">Vue d'ensemble de l'application mobile</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/analytics" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2 transition-colors">
                📊 Analytics
              </Link>
              <Link href="/monitoring" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 transition-colors">
                ⚙️ Monitoring
              </Link>
              <Link href="/bugs" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2 transition-colors">
                🐛 Bugs
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
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Vue d'ensemble */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Vue d'ensemble</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Utilisateurs total"
              value={formatNumber(stats.totalUsers)}
              subtitle={`${stats.activeUsers7Days} actifs (7j)`}
              icon="👥"
              color="bg-indigo-500"
            />
            <StatCard
              title="Vidéos total"
              value={formatNumber(stats.totalVideos)}
              subtitle={formatDuration(stats.totalDuration)}
              icon="🎥"
              color="bg-purple-500"
            />
            <StatCard
              title="Nouveaux aujourd'hui"
              value={stats.newUsersToday}
              subtitle={`${stats.newUsersThisWeek} cette semaine`}
              icon="✨"
              color="bg-green-500"
            />
            <StatCard
              title="Vidéos aujourd'hui"
              value={stats.videosToday}
              subtitle={`${stats.videosThisWeek} cette semaine`}
              icon="📹"
              color="bg-blue-500"
            />
          </div>
        </section>

        {/* Croissance (Graphique) */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Croissance (30 derniers jours)</h2>
          <div className="bg-white p-6 rounded-lg shadow">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="#6366f1" name="Nouveaux utilisateurs" strokeWidth={2} />
                <Line type="monotone" dataKey="videos" stroke="#8b5cf6" name="Nouvelles vidéos" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Métriques utilisateurs */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Métriques utilisateurs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Moy. vidéos/user"
              value={stats.avgVideosPerUser.toFixed(1)}
              subtitle={`Médiane: ${stats.medianVideosPerUser}`}
              icon="📊"
              color="bg-orange-500"
            />
            <StatCard
              title="Durée moy. vidéo"
              value={formatDuration(stats.avgVideoDuration)}
              subtitle="Par vidéo"
              icon="⏱️"
              color="bg-teal-500"
            />
            <StatCard
              title="Utilisateur star"
              value={stats.mostActiveUser?.videoCount || 0}
              subtitle={stats.mostActiveUser?.email.substring(0, 20) || 'N/A'}
              icon="⭐"
              color="bg-yellow-500"
            />
            <StatCard
              title="Actifs 30j"
              value={stats.activeUsers30Days}
              subtitle={`${((stats.activeUsers30Days / stats.totalUsers) * 100).toFixed(1)}% du total`}
              icon="🔥"
              color="bg-green-500"
            />
          </div>
        </section>

        {/* Transcription & IA */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Transcription & IA</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Transcriptions complètes"
              value={stats.transcriptionStats.completed}
              subtitle={`${stats.transcriptionStats.total} au total`}
              icon="📝"
              color="bg-indigo-500"
            />
            <StatCard
              title="Taux de succès"
              value={`${stats.transcriptionStats.successRate.toFixed(1)}%`}
              subtitle={`${stats.transcriptionStats.failed} échouées`}
              icon={stats.transcriptionStats.successRate >= 90 ? '✅' : '⚠️'}
              color={stats.transcriptionStats.successRate >= 90 ? 'bg-green-500' : 'bg-yellow-500'}
            />
            <StatCard
              title="En cours"
              value={stats.transcriptionStats.processing + stats.transcriptionStats.pending}
              subtitle={`${stats.transcriptionStats.pending} en attente`}
              icon="⏳"
              color="bg-blue-500"
            />
            <StatCard
              title="Highlights générés"
              value={formatNumber(stats.apiUsage.totalHighlightsGenerated)}
              subtitle="Moments clés"
              icon="⚡"
              color="bg-purple-500"
            />
          </div>
        </section>

        {/* Coûts API */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Coûts API estimés</h2>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b">
                <div>
                  <p className="font-semibold text-gray-900">AssemblyAI</p>
                  <p className="text-sm text-gray-600">
                    {stats.apiUsage.totalTranscriptionMinutes.toFixed(0)} minutes transcrites
                  </p>
                </div>
                <p className="text-2xl font-bold text-indigo-600">
                  ${stats.apiUsage.estimatedAssemblyAICost.toFixed(2)}
                </p>
              </div>
              <div className="flex justify-between items-center pb-4 border-b">
                <div>
                  <p className="font-semibold text-gray-900">OpenAI</p>
                  <p className="text-sm text-gray-600">
                    {stats.apiUsage.totalQuestionsGenerated} questions + highlights
                  </p>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  ${stats.apiUsage.estimatedOpenAICost.toFixed(2)}
                </p>
              </div>
              <div className="flex justify-between items-center pt-2">
                <div>
                  <p className="font-bold text-gray-900 text-lg">Total estimé</p>
                  <p className="text-sm text-gray-600">Tous les services</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  ${(stats.apiUsage.estimatedAssemblyAICost + stats.apiUsage.estimatedOpenAICost).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Upload & Stockage */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload & Stockage</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Vidéos uploadées"
              value={stats.uploadStats.totalUploaded - stats.uploadStats.totalImported}
              subtitle="Enregistrées dans l'app"
              icon="⬆️"
              color="bg-green-500"
            />
            <StatCard
              title="Vidéos importées"
              value={stats.uploadStats.totalImported}
              subtitle="Depuis la galerie"
              icon="⬇️"
              color="bg-blue-500"
            />
            <StatCard
              title="Échecs d'upload"
              value={stats.uploadStats.failedUploads}
              subtitle="Avec backup local"
              icon="⚠️"
              color={stats.uploadStats.failedUploads > 0 ? 'bg-red-500' : 'bg-gray-500'}
            />
            <StatCard
              title="Stockage estimé"
              value={`${stats.totalStorageGB.toFixed(2)} GB`}
              subtitle="Vidéos uniquement"
              icon="💾"
              color="bg-purple-500"
            />
          </div>
        </section>

        {/* Format des vidéos (Graphiques) */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Format & Source des vidéos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Orientation</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={orientationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {orientationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Source</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={uploadTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {uploadTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Langues populaires */}
        {stats.topLanguages.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Langues populaires</h2>
            <div className="bg-white p-6 rounded-lg shadow">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.topLanguages}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="language" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#6366f1" name="Nombre de vidéos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm text-gray-600">{title}</p>
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}
