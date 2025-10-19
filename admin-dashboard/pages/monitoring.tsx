import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  MonitoringService,
  UploadMonitorItem,
  MonitoringStats,
  ErrorSummary,
  UploadError,
} from '../lib/monitoringService';

type ErrorTab = 'upload' | 'transcription' | 'network';

export default function MonitoringPage() {
  const [uploads, setUploads] = useState<UploadMonitorItem[]>([]);
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [topErrors, setTopErrors] = useState<ErrorSummary[]>([]);
  const [recentBugs, setRecentBugs] = useState<any[]>([]);
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
  const [transcriptionErrors, setTranscriptionErrors] = useState<UploadError[]>([]);
  const [networkErrors, setNetworkErrors] = useState<UploadError[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedErrorTab, setSelectedErrorTab] = useState<ErrorTab>('upload');
  const [selectedUpload, setSelectedUpload] = useState<UploadMonitorItem | null>(null);

  const loadData = async () => {
    try {
      const [
        uploadsData,
        statsData,
        topErrorsData,
        recentBugsData,
        uploadErrorsData,
        transcriptionErrorsData,
        networkErrorsData,
      ] = await Promise.all([
        MonitoringService.getActiveUploadsFromQueue(), // Use queue method with fallback
        MonitoringService.getMonitoringStats(),
        MonitoringService.getTopErrors(5),
        MonitoringService.getRecentBugs(20),
        MonitoringService.getUploadErrors(),
        MonitoringService.getTranscriptionErrors(),
        MonitoringService.getNetworkErrors(),
      ]);

      setUploads(uploadsData);
      setStats(statsData);
      setTopErrors(topErrorsData);
      setRecentBugs(recentBugsData);
      setUploadErrors(uploadErrorsData);
      setTranscriptionErrors(transcriptionErrorsData);
      setNetworkErrors(networkErrorsData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStopUpload = async (uploadId: string) => {
    if (!confirm('Voulez-vous vraiment arrêter cet upload?')) {
      return;
    }

    const success = await MonitoringService.stopUpload(uploadId);
    if (success) {
      alert('Upload arrêté avec succès!');
      loadData(); // Refresh data
    } else {
      alert('Erreur lors de l\'arrêt de l\'upload');
    }
  };

  const handleStopAllUploads = async () => {
    if (!confirm('⚠️ ATTENTION: Voulez-vous vraiment arrêter TOUS les uploads en cours?\n\nCeci arrêtera tous les uploads de tous les utilisateurs!')) {
      return;
    }

    const count = await MonitoringService.stopAllUploads();
    alert(`${count} upload(s) arrêté(s) avec succès!`);
    loadData(); // Refresh data
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'uploading':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'retrying':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'stopped':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '🟡';
      case 'uploading':
        return '🔵';
      case 'retrying':
        return '🔄';
      case 'completed':
        return '🟢';
      case 'failed':
        return '🔴';
      case 'stopped':
        return '⏹️';
      default:
        return '⚪';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'crash':
        return '💥';
      case 'network':
        return '🌐';
      case 'ui':
        return '🎨';
      case 'api':
        return '🔌';
      default:
        return '🐛';
    }
  };

  const getSeverityColor = (severity: string) => {
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
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatElapsedTime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du monitoring...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 Monitoring Temps Réel</h1>
              <p className="text-gray-600 mt-1">Uploads, logs et bugs en direct</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/analytics"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
              >
                📊 Analytics
              </Link>
              <Link
                href="/bugs"
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
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
        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <StatCard
              title="Uploads actifs"
              value={stats.uploadsInProgress}
              icon="⬆️"
              color="bg-blue-500"
              subtitle={`${stats.uploadsPending} en attente`}
            />
            <StatCard
              title="Complétés (24h)"
              value={stats.uploadsCompletedToday}
              icon="✅"
              color="bg-green-500"
              subtitle={`${stats.successRate.toFixed(0)}% succès`}
            />
            <StatCard
              title="Échecs (24h)"
              value={stats.uploadsFailedToday}
              icon="❌"
              color="bg-red-500"
              subtitle={
                stats.uploadsCompletedToday + stats.uploadsFailedToday > 0
                  ? `${((stats.uploadsFailedToday / (stats.uploadsCompletedToday + stats.uploadsFailedToday)) * 100).toFixed(1)}% des uploads`
                  : '0% des uploads'
              }
            />
            <StatCard
              title="Vitesse moy."
              value={`${stats.avgUploadSpeed.toFixed(1)} MB/s`}
              icon="⚡"
              color="bg-purple-500"
              subtitle="Derniers uploads"
            />
            <StatCard
              title="Bugs nouveaux"
              value={stats.newBugsToday}
              icon="🐛"
              color="bg-orange-500"
              subtitle={`${stats.criticalBugsToday} critiques`}
            />
          </div>
        )}

        {/* Top Errors Table */}
        {topErrors.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-3">🔥 Erreurs les plus fréquentes (24h)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="pb-2 font-medium">Erreur</th>
                    <th className="pb-2 text-right font-medium">Occurrences</th>
                    <th className="pb-2 text-right font-medium">Utilisateurs</th>
                    <th className="pb-2 text-right font-medium">% Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topErrors.map((error, idx) => (
                    <tr key={idx} className="border-t hover:bg-gray-50">
                      <td className="py-2 font-medium text-gray-900">{error.message}</td>
                      <td className="py-2 text-right text-gray-700">{error.count}</td>
                      <td className="py-2 text-right text-gray-700">{error.uniqueUsers}</td>
                      <td className="py-2 text-right">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
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

        {/* Main Content: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN: Uploads (60% - 2 cols) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">⬆️ Uploads en cours</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{uploads.length} uploads</span>
                  {uploads.filter(u => u.status === 'uploading' || u.status === 'retrying').length > 0 && (
                    <button
                      onClick={handleStopAllUploads}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors flex items-center gap-2"
                    >
                      ⏹️ STOP ALL
                    </button>
                  )}
                </div>
              </div>

              {uploads.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Aucun upload récent (24h)</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {uploads.map(upload => (
                    <UploadCard
                      key={upload.id}
                      upload={upload}
                      onDetails={setSelectedUpload}
                      onStop={handleStopUpload}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
                      formatFileSize={formatFileSize}
                      formatElapsedTime={formatElapsedTime}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Logs & Bugs (40% - 1 col) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Bugs Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">🐛 Bugs récents</h2>
              {recentBugs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">Aucun bug récent</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {recentBugs.slice(0, 10).map(bug => (
                    <BugListItem
                      key={bug.id}
                      bug={bug}
                      getTypeIcon={getTypeIcon}
                      getSeverityColor={getSeverityColor}
                    />
                  ))}
                </div>
              )}
              <Link
                href="/bugs"
                className="block text-center text-indigo-600 hover:text-indigo-800 text-sm font-medium mt-4"
              >
                Voir tous les bugs →
              </Link>
            </div>

            {/* Errors Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">⚠️ Erreurs</h2>

              {/* Tabs */}
              <div className="flex gap-2 mb-4 border-b">
                <button
                  onClick={() => setSelectedErrorTab('upload')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    selectedErrorTab === 'upload'
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🚫 Upload ({uploadErrors.length})
                </button>
                <button
                  onClick={() => setSelectedErrorTab('transcription')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    selectedErrorTab === 'transcription'
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🔴 Transcription ({transcriptionErrors.length})
                </button>
                <button
                  onClick={() => setSelectedErrorTab('network')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    selectedErrorTab === 'network'
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ⚠️ Réseau ({networkErrors.length})
                </button>
              </div>

              {/* Error List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selectedErrorTab === 'upload' &&
                  (uploadErrors.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">Aucune erreur d'upload</p>
                  ) : (
                    uploadErrors.map(error => (
                      <ErrorListItem key={error.id} error={error} />
                    ))
                  ))}

                {selectedErrorTab === 'transcription' &&
                  (transcriptionErrors.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      Aucune erreur de transcription
                    </p>
                  ) : (
                    transcriptionErrors.map(error => (
                      <ErrorListItem key={error.id} error={error} />
                    ))
                  ))}

                {selectedErrorTab === 'network' &&
                  (networkErrors.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">Aucune erreur réseau</p>
                  ) : (
                    networkErrors.map(error => (
                      <ErrorListItem key={error.id} error={error} />
                    ))
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Detail Modal */}
      {selectedUpload && (
        <UploadDetailModal
          upload={selectedUpload}
          onClose={() => setSelectedUpload(null)}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
      )}
    </div>
  );
}

// ============================================
// COMPONENTS
// ============================================

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
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

function UploadCard({
  upload,
  onDetails,
  onStop,
  getStatusColor,
  getStatusIcon,
  formatFileSize,
  formatElapsedTime,
}: {
  upload: UploadMonitorItem;
  onDetails: (upload: UploadMonitorItem) => void;
  onStop: (uploadId: string) => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => string;
  formatFileSize: (bytes?: number) => string;
  formatElapsedTime: (seconds?: number) => string;
}) {
  const isRecorded = upload.metadata?.isRecorded;
  const isImported = upload.metadata?.isImported;
  const canStop = upload.status === 'uploading' || upload.status === 'retrying';

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-semibold text-indigo-700">
            {upload.userEmail.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{upload.userEmail}</p>
            <p className="text-xs text-gray-500">{upload.videoTitle}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(upload.status)}`}>
            {getStatusIcon(upload.status)} {upload.status}
          </span>
          {upload.retryCount && upload.retryCount > 0 && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
              Retry {upload.retryCount}/3
            </span>
          )}
        </div>
      </div>

      {/* Video Info */}
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-600">
        <span>{isRecorded ? '📹 Recorded' : isImported ? '📸 Imported' : '🎥 Video'}</span>
        <span>{formatFileSize(upload.fileSize)}</span>
        <span>{formatElapsedTime(upload.elapsedTime)}</span>
      </div>

      {/* Progress Bar */}
      {(upload.status === 'uploading' || upload.status === 'retrying') && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">
              {upload.status === 'retrying' ? 'Retry en cours...' : 'Progression'}
            </span>
            <span className="text-xs font-medium text-gray-900">{upload.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                upload.status === 'retrying' ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${upload.progress}%` }}
            />
          </div>
          {upload.uploadSpeed && (
            <p className="text-xs text-gray-500 mt-1">{upload.uploadSpeed.toFixed(1)} MB/s</p>
          )}
        </div>
      )}

      {/* Error Message */}
      {upload.status === 'failed' && upload.errorMessage && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {upload.errorMessage}
        </div>
      )}

      {/* Stopped Message */}
      {upload.status === 'stopped' && (
        <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
          Upload arrêté manuellement
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onDetails(upload)}
          className="px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors"
        >
          Détails
        </button>
        {canStop && (
          <button
            onClick={() => onStop(upload.id)}
            className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 rounded hover:bg-red-50 transition-colors"
          >
            ⏹️ Stop
          </button>
        )}
        {upload.status === 'failed' && (
          <button className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
}

function BugListItem({
  bug,
  getTypeIcon,
  getSeverityColor,
}: {
  bug: any;
  getTypeIcon: (type: string) => string;
  getSeverityColor: (severity: string) => string;
}) {
  return (
    <div className="border-b border-gray-100 py-2 hover:bg-gray-50 cursor-pointer transition-colors">
      <div className="flex items-start gap-2">
        <span className="text-lg">{getTypeIcon(bug.error_type)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-900 truncate">{bug.error_message}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">{bug.user_email || 'Anonyme'}</span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${getSeverityColor(bug.severity)}`}>
              {bug.severity}
            </span>
          </div>
        </div>
        <span className="text-xs text-gray-400">
          {formatDistanceToNow(new Date(bug.created_at), { locale: fr, addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

function ErrorListItem({ error }: { error: UploadError }) {
  return (
    <div className="border-b border-gray-100 py-2 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {error.videoTitle && (
            <p className="text-xs font-medium text-gray-900 truncate">{error.videoTitle}</p>
          )}
          <p className="text-xs text-gray-600 truncate">{error.errorMessage}</p>
          <p className="text-xs text-gray-500 mt-1">{error.userEmail}</p>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {formatDistanceToNow(new Date(error.createdAt), { locale: fr, addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

function UploadDetailModal({
  upload,
  onClose,
  getStatusColor,
  getStatusIcon,
}: {
  upload: UploadMonitorItem;
  onClose: () => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => string;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Détails de l'upload</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Statut</h3>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border mt-1 ${getStatusColor(upload.status)}`}>
                  {getStatusIcon(upload.status)} {upload.status}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Utilisateur</h3>
                <p className="mt-1 text-base">{upload.userEmail}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Titre vidéo</h3>
                <p className="mt-1 text-base">{upload.videoTitle}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Fichier</h3>
                <p className="mt-1 text-base truncate">{upload.filename}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Taille</h3>
                <p className="mt-1 text-base">
                  {upload.fileSize ? `${(upload.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Progression</h3>
                <p className="mt-1 text-base">{upload.progress}%</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Démarré</h3>
                <p className="mt-1 text-base">
                  {format(new Date(upload.startedAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>

              {upload.completedAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Complété</h3>
                  <p className="mt-1 text-base">
                    {format(new Date(upload.completedAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>
              )}

              {upload.transcriptionStatus && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Transcription</h3>
                  <p className="mt-1 text-base">{upload.transcriptionStatus}</p>
                </div>
              )}
            </div>

            {upload.errorMessage && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Message d'erreur</h3>
                <pre className="mt-1 text-xs bg-red-50 p-4 rounded border border-red-200 text-red-700 overflow-auto">
                  {upload.errorMessage}
                </pre>
              </div>
            )}

            {upload.metadata && Object.keys(upload.metadata).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Métadonnées</h3>
                <pre className="mt-1 text-xs bg-gray-100 p-4 rounded overflow-auto max-h-60">
                  {JSON.stringify(upload.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
