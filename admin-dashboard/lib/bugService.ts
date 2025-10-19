import { supabase } from './supabase';

export interface BugReport {
  id: string;
  created_at: string;
  user_id?: string;
  user_email?: string;
  error_message: string;
  error_stack?: string;
  error_type: 'crash' | 'network' | 'ui' | 'api' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  screen_name?: string;
  action?: string;
  component_name?: string;
  device_info?: any;
  app_version?: string;
  metadata?: any;
  status: 'new' | 'investigating' | 'resolved' | 'ignored';
  resolved_at?: string;
  resolved_by?: string;
  notes?: string;
}

export interface BugStats {
  total: number;
  byStatus: {
    new: number;
    investigating: number;
    resolved: number;
    ignored: number;
  };
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byType: {
    crash: number;
    network: number;
    ui: number;
    api: number;
    other: number;
  };
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export class BugService {
  /**
   * Get all bug reports
   */
  static async getAllBugs(filters?: {
    status?: string;
    severity?: string;
    error_type?: string;
    limit?: number;
  }): Promise<BugReport[]> {
    let query = supabase
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters?.error_type) {
      query = query.eq('error_type', filters.error_type);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bugs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get bug statistics
   */
  static async getBugStats(): Promise<BugStats> {
    const { data: bugs } = await supabase
      .from('bug_reports')
      .select('*');

    if (!bugs || bugs.length === 0) {
      return {
        total: 0,
        byStatus: { new: 0, investigating: 0, resolved: 0, ignored: 0 },
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        byType: { crash: 0, network: 0, ui: 0, api: 0, other: 0 },
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    const thisMonth = new Date();
    thisMonth.setDate(thisMonth.getDate() - 30);

    const byStatus = bugs.reduce((acc, bug) => {
      acc[bug.status] = (acc[bug.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = bugs.reduce((acc, bug) => {
      acc[bug.severity] = (acc[bug.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = bugs.reduce((acc, bug) => {
      acc[bug.error_type] = (acc[bug.error_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const todayBugs = bugs.filter(bug => new Date(bug.created_at) >= today).length;
    const weekBugs = bugs.filter(bug => new Date(bug.created_at) >= thisWeek).length;
    const monthBugs = bugs.filter(bug => new Date(bug.created_at) >= thisMonth).length;

    return {
      total: bugs.length,
      byStatus: {
        new: byStatus.new || 0,
        investigating: byStatus.investigating || 0,
        resolved: byStatus.resolved || 0,
        ignored: byStatus.ignored || 0,
      },
      bySeverity: {
        low: bySeverity.low || 0,
        medium: bySeverity.medium || 0,
        high: bySeverity.high || 0,
        critical: bySeverity.critical || 0,
      },
      byType: {
        crash: byType.crash || 0,
        network: byType.network || 0,
        ui: byType.ui || 0,
        api: byType.api || 0,
        other: byType.other || 0,
      },
      today: todayBugs,
      thisWeek: weekBugs,
      thisMonth: monthBugs,
    };
  }

  /**
   * Update bug status
   */
  static async updateBugStatus(
    bugId: string,
    status: BugReport['status'],
    notes?: string
  ): Promise<boolean> {
    const updates: any = { status };

    if (notes) {
      updates.notes = notes;
    }

    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('bug_reports')
      .update(updates)
      .eq('id', bugId);

    if (error) {
      console.error('Error updating bug:', error);
      return false;
    }

    return true;
  }

  /**
   * Delete a bug report
   */
  static async deleteBug(bugId: string): Promise<boolean> {
    const { error } = await supabase
      .from('bug_reports')
      .delete()
      .eq('id', bugId);

    if (error) {
      console.error('Error deleting bug:', error);
      return false;
    }

    return true;
  }

  /**
   * Get bugs grouped by user
   */
  static async getBugsByUser(): Promise<Array<{ user_email: string; count: number }>> {
    const { data: bugs } = await supabase
      .from('bug_reports')
      .select('user_email');

    if (!bugs) return [];

    const grouped = bugs.reduce((acc, bug) => {
      const email = bug.user_email || 'Anonymous';
      acc[email] = (acc[email] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([user_email, count]) => ({ user_email, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}
