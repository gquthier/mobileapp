import { supabase } from '../lib/supabase';

export interface UserQuestion {
  id: string;
  user_id: string;
  question_text: string;
  batch_number: number;
  order_index: number;
  is_used: boolean;
  created_at: string;
}

export class UserQuestionsService {
  /**
   * Récupère toutes les questions non épuisées pour l'utilisateur courant
   * Triées par batch et order_index
   */
  static async getUnusedQuestions(): Promise<UserQuestion[]> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('❌ No authenticated user for questions:', authError);
        return [];
      }

      const { data, error } = await supabase
        .from('user_questions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_used', false)
        .order('batch_number', { ascending: true })
        .order('order_index', { ascending: true });

      if (error) {
        console.error('❌ Error fetching unused questions:', error);
        return [];
      }

      console.log(`✅ Found ${data?.length || 0} unused questions`);
      return data || [];
    } catch (error) {
      console.error('❌ Error in getUnusedQuestions:', error);
      return [];
    }
  }

  /**
   * Récupère la prochaine question disponible (la première non épuisée)
   */
  static async getNextQuestion(): Promise<UserQuestion | null> {
    try {
      const questions = await this.getUnusedQuestions();

      if (questions.length === 0) {
        console.log('⚠️ No unused questions available');
        return null;
      }

      return questions[0];
    } catch (error) {
      console.error('❌ Error in getNextQuestion:', error);
      return null;
    }
  }

  /**
   * Marque une question comme épuisée (utilisée)
   */
  static async markQuestionAsUsed(questionId: string): Promise<boolean> {
    try {
      console.log('🔄 Marking question as used:', questionId);

      const { error } = await supabase
        .from('user_questions')
        .update({ is_used: true })
        .eq('id', questionId);

      if (error) {
        console.error('❌ Error marking question as used:', error);
        return false;
      }

      console.log('✅ Question marked as used');
      return true;
    } catch (error) {
      console.error('❌ Error in markQuestionAsUsed:', error);
      return false;
    }
  }

  /**
   * Compte le nombre de questions non épuisées
   */
  static async countUnusedQuestions(): Promise<number> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('❌ No authenticated user for counting:', authError);
        return 0;
      }

      // Utiliser la fonction SQL pour compter
      const { data, error } = await supabase
        .rpc('count_unused_questions', { p_user_id: user.id });

      if (error) {
        console.error('❌ Error counting unused questions:', error);
        return 0;
      }

      console.log(`📊 Unused questions count: ${data || 0}`);
      return data || 0;
    } catch (error) {
      console.error('❌ Error in countUnusedQuestions:', error);
      return 0;
    }
  }

  /**
   * Vérifie si on a besoin de générer de nouvelles questions
   * Retourne true si ≤ 5 questions restantes
   */
  static async needsNewQuestions(): Promise<boolean> {
    try {
      const count = await this.countUnusedQuestions();
      const needsNew = count <= 5;

      if (needsNew) {
        console.log(`⚠️ Only ${count} questions left - need to generate more`);
      }

      return needsNew;
    } catch (error) {
      console.error('❌ Error in needsNewQuestions:', error);
      return false;
    }
  }

  /**
   * Déclenche la génération de nouvelles questions via l'Edge Function
   * Cette fonction est asynchrone et ne bloque pas
   */
  static async generateNewQuestions(): Promise<boolean> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('❌ No authenticated user for generation:', authError);
        return false;
      }

      console.log('🚀 Triggering question generation for user:', user.id);

      const { data, error } = await supabase.functions.invoke('generate-user-questions', {
        body: { userId: user.id }
      });

      if (error) {
        console.error('❌ Error invoking generate-user-questions:', error);
        return false;
      }

      if (!data.success) {
        console.error('❌ Question generation failed:', data.error);
        return false;
      }

      console.log(`✅ Generated batch #${data.batchNumber} with ${data.questionCount} questions`);
      return true;
    } catch (error) {
      console.error('❌ Error in generateNewQuestions:', error);
      return false;
    }
  }

  /**
   * Vérifie et génère de nouvelles questions si nécessaire
   * À appeler après avoir marqué une question comme utilisée
   */
  static async checkAndGenerateIfNeeded(): Promise<void> {
    try {
      const needsNew = await this.needsNewQuestions();

      if (needsNew) {
        console.log('🔄 Triggering automatic question generation...');
        // Générer en arrière-plan sans attendre
        this.generateNewQuestions().catch(err => {
          console.error('❌ Background question generation failed:', err);
        });
      }
    } catch (error) {
      console.error('❌ Error in checkAndGenerateIfNeeded:', error);
    }
  }

  /**
   * Initialise le système de questions pour un nouvel utilisateur
   * ou pour un utilisateur qui n'a pas encore de questions
   */
  static async initializeQuestionsIfNeeded(): Promise<void> {
    try {
      const count = await this.countUnusedQuestions();

      if (count === 0) {
        console.log('🆕 No questions found - initializing question system');
        await this.generateNewQuestions();
      }
    } catch (error) {
      console.error('❌ Error in initializeQuestionsIfNeeded:', error);
    }
  }

  /**
   * Récupère toutes les questions (utilisées et non utilisées) pour debug
   */
  static async getAllQuestions(): Promise<UserQuestion[]> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('❌ No authenticated user:', authError);
        return [];
      }

      const { data, error } = await supabase
        .from('user_questions')
        .select('*')
        .eq('user_id', user.id)
        .order('batch_number', { ascending: true })
        .order('order_index', { ascending: true });

      if (error) {
        console.error('❌ Error fetching all questions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getAllQuestions:', error);
      return [];
    }
  }
}
