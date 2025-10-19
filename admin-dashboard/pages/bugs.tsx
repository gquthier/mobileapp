import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BugService, BugReport, BugStats } from '../lib/bugService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function BugsPage() {
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [stats, setStats] = useState<BugStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);

  useEffect(() => {
    loadBugs();
  }, [selectedStatus, selectedSeverity]);

  const loadBugs = async () => {
    setLoading(true);
    const filters: any = {};

    if (selectedStatus !== 'all') {
      filters.status = selectedStatus;
    }

    if (selectedSeverity !== 'all') {
      filters.severity = selectedSeverity;
    }

    const [bugsData, statsData] = await Promise.all([
      BugService.getAllBugs(filters),
      BugService.getBugStats(),
    ]);

    setBugs(bugsData);
    setStats(statsData);
    setLoading(false);
  };

  const handleUpdateStatus = async (bugId: string, status: BugReport['status']) => {
    const success = await BugService.updateBugStatus(bugId, status);
    if (success) {
      loadBugs();
      setSelectedBug(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-red-100 text-red-800';
      case 'investigating': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'ignored': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'crash': return '💥';
      case 'network': return '🌐';
      case 'ui': return '🎨';
      case 'api': return '🔌';
      default: return '🐛';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des bugs...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">🐛 Rapports de bugs</h1>
              <p className="text-gray-600 mt-1">Tous les bugs remontés automatiquement depuis l'app mobile</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/monitoring" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors">
                📊 Monitoring
              </Link>
              <Link href="/" className="text-indigo-600 hover:text-indigo-800 font-medium">
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total bugs" value={stats.total} icon="🐛" color="bg-gray-500" />
            <StatCard title="Nouveaux" value={stats.byStatus.new} icon="🆕" color="bg-red-500" />
            <StatCard title="Critiques" value={stats.bySeverity.critical} icon="🔥" color="bg-red-600" />
            <StatCard title="Aujourd'hui" value={stats.today} icon="📅" color="bg-blue-500" />
          </div>
        )}

        {/* Stats by Category */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Par statut</h3>
              <div className="space-y-2">
                <StatRow label="Nouveaux" value={stats.byStatus.new} color="text-red-600" />
                <StatRow label="En investigation" value={stats.byStatus.investigating} color="text-blue-600" />
                <StatRow label="Résolus" value={stats.byStatus.resolved} color="text-green-600" />
                <StatRow label="Ignorés" value={stats.byStatus.ignored} color="text-gray-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Par sévérité</h3>
              <div className="space-y-2">
                <StatRow label="Critique" value={stats.bySeverity.critical} color="text-red-600" />
                <StatRow label="Haute" value={stats.bySeverity.high} color="text-orange-600" />
                <StatRow label="Moyenne" value={stats.bySeverity.medium} color="text-yellow-600" />
                <StatRow label="Basse" value={stats.bySeverity.low} color="text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Par type</h3>
              <div className="space-y-2">
                <StatRow label="💥 Crash" value={stats.byType.crash} color="text-red-600" />
                <StatRow label="🌐 Réseau" value={stats.byType.network} color="text-blue-600" />
                <StatRow label="🔌 API" value={stats.byType.api} color="text-purple-600" />
                <StatRow label="🎨 UI" value={stats.byType.ui} color="text-pink-600" />
                <StatRow label="🐛 Autre" value={stats.byType.other} color="text-gray-600" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tous</option>
              <option value="new">Nouveaux</option>
              <option value="investigating">En investigation</option>
              <option value="resolved">Résolus</option>
              <option value="ignored">Ignorés</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sévérité</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Toutes</option>
              <option value="critical">Critique</option>
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Basse</option>
            </select>
          </div>
        </div>

        {/* Bugs List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Erreur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sévérité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bugs.map((bug) => (
                <tr key={bug.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      <span className="text-2xl mr-3">{getTypeIcon(bug.error_type)}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{bug.error_message}</p>
                        {bug.screen_name && (
                          <p className="text-xs text-gray-500 mt-1">📍 {bug.screen_name}</p>
                        )}
                        {bug.action && (
                          <p className="text-xs text-gray-500">👉 {bug.action}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {bug.user_email || 'Anonyme'}
                    {bug.app_version && (
                      <p className="text-xs text-gray-400">v{bug.app_version}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {bug.error_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(bug.severity)}`}>
                      {bug.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bug.status)}`}>
                      {bug.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {format(new Date(bug.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => setSelectedBug(bug)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {bugs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucun bug trouvé</p>
            </div>
          )}
        </div>
      </div>

      {/* Bug Detail Modal */}
      {selectedBug && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Détails du bug</h2>
                <button
                  onClick={() => setSelectedBug(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Message d'erreur</h3>
                  <p className="mt-1 text-base text-gray-900">{selectedBug.error_message}</p>
                </div>

                {selectedBug.error_stack && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Stack trace</h3>
                    <pre className="mt-1 text-xs bg-gray-100 p-4 rounded overflow-auto max-h-40">
                      {selectedBug.error_stack}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Utilisateur</h3>
                    <p className="mt-1">{selectedBug.user_email || 'Anonyme'}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Date</h3>
                    <p className="mt-1">{format(new Date(selectedBug.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}</p>
                  </div>

                  {selectedBug.screen_name && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Écran</h3>
                      <p className="mt-1">{selectedBug.screen_name}</p>
                    </div>
                  )}

                  {selectedBug.component_name && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Composant</h3>
                      <p className="mt-1">{selectedBug.component_name}</p>
                    </div>
                  )}
                </div>

                {selectedBug.device_info && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Informations appareil</h3>
                    <pre className="mt-1 text-xs bg-gray-100 p-4 rounded">
                      {JSON.stringify(selectedBug.device_info, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedBug.metadata && Object.keys(selectedBug.metadata).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Métadonnées</h3>
                    <pre className="mt-1 text-xs bg-gray-100 p-4 rounded">
                      {JSON.stringify(selectedBug.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  {selectedBug.status === 'new' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedBug.id, 'investigating')}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Marquer en investigation
                    </button>
                  )}
                  {selectedBug.status !== 'resolved' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedBug.id, 'resolved')}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Marquer comme résolu
                    </button>
                  )}
                  {selectedBug.status !== 'ignored' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedBug.id, 'ignored')}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Ignorer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}
