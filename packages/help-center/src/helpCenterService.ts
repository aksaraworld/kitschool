/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import {
  Category,
  Subcategory,
  Article,
  ArticleFilters,
  ArticleSearchResult,
  ArticleFeedback,
  ArticleView,
  HelpCenterSettings,
  HelpCenterConfig
} from './types';

/**
 * Help Center Service
 * Generic help center and FAQ system with multi-level categorization
 */
export class HelpCenterService {
  private database: HelpCenterConfig['database'];
  private defaultTopic?: string;
  private logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';

  constructor(config: HelpCenterConfig) {
    this.database = config.database;
    this.defaultTopic = config.options?.defaultTopic;
    this.logLevel = config.options?.logLevel ?? 'info';
  }

  // ==================== CATEGORIES ====================

  /**
   * Get all categories
   */
  async getCategories(activeOnly: boolean = true): Promise<Category[]> {
    try {
      return await this.database.getCategories({ isActive: activeOnly ? true : undefined });
    } catch (error) {
      this.log('error', 'Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  async getCategory(id: string): Promise<Category | null> {
    try {
      return await this.database.getCategory(id);
    } catch (error) {
      this.log('error', 'Error fetching category:', error);
      throw error;
    }
  }

  /**
   * Create category
   */
  async createCategory(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    try {
      const category = await this.database.createCategory({
        ...data,
        isActive: data.isActive ?? true
      });
      this.log('info', `✅ Created category: ${category.name}`);
      return category;
    } catch (error) {
      this.log('error', 'Error creating category:', error);
      throw error;
    }
  }

  /**
   * Update category
   */
  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    try {
      const category = await this.database.updateCategory(id, updates);
      this.log('info', `✅ Updated category: ${category.name}`);
      return category;
    } catch (error) {
      this.log('error', 'Error updating category:', error);
      throw error;
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      await this.database.deleteCategory(id);
      this.log('info', `✅ Deleted category: ${id}`);
    } catch (error) {
      this.log('error', 'Error deleting category:', error);
      throw error;
    }
  }

  // ==================== SUBCATEGORIES ====================

  /**
   * Get subcategories by category
   */
  async getSubcategories(categoryId: string): Promise<Subcategory[]> {
    try {
      return await this.database.getSubcategories(categoryId);
    } catch (error) {
      this.log('error', 'Error fetching subcategories:', error);
      throw error;
    }
  }

  /**
   * Get subcategory by ID
   */
  async getSubcategory(id: string): Promise<Subcategory | null> {
    try {
      return await this.database.getSubcategory(id);
    } catch (error) {
      this.log('error', 'Error fetching subcategory:', error);
      throw error;
    }
  }

  /**
   * Create subcategory
   */
  async createSubcategory(data: Omit<Subcategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subcategory> {
    try {
      const subcategory = await this.database.createSubcategory({
        ...data,
        isActive: data.isActive ?? true
      });
      this.log('info', `✅ Created subcategory: ${subcategory.name}`);
      return subcategory;
    } catch (error) {
      this.log('error', 'Error creating subcategory:', error);
      throw error;
    }
  }

  /**
   * Update subcategory
   */
  async updateSubcategory(id: string, updates: Partial<Subcategory>): Promise<Subcategory> {
    try {
      const subcategory = await this.database.updateSubcategory(id, updates);
      this.log('info', `✅ Updated subcategory: ${subcategory.name}`);
      return subcategory;
    } catch (error) {
      this.log('error', 'Error updating subcategory:', error);
      throw error;
    }
  }

  /**
   * Delete subcategory
   */
  async deleteSubcategory(id: string): Promise<void> {
    try {
      await this.database.deleteSubcategory(id);
      this.log('info', `✅ Deleted subcategory: ${id}`);
    } catch (error) {
      this.log('error', 'Error deleting subcategory:', error);
      throw error;
    }
  }

  // ==================== ARTICLES ====================

  /**
   * Get articles with filters
   */
  async getArticles(filters: ArticleFilters = {}): Promise<ArticleSearchResult> {
    try {
      return await this.database.getArticles(filters);
    } catch (error) {
      this.log('error', 'Error fetching articles:', error);
      throw error;
    }
  }

  /**
   * Get article by ID
   */
  async getArticle(id: string): Promise<Article | null> {
    try {
      return await this.database.getArticle(id);
    } catch (error) {
      this.log('error', 'Error fetching article:', error);
      throw error;
    }
  }

  /**
   * Create article
   */
  async createArticle(data: Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'helpful' | 'notHelpful'>): Promise<Article> {
    try {
      const article = await this.database.createArticle({
        ...data,
        status: data.status || 'draft',
        categories: data.categories || (data.category ? [data.category] : []),
        views: 0,
        helpful: 0,
        notHelpful: 0
      });
      this.log('info', `✅ Created article: ${article.title}`);
      return article;
    } catch (error) {
      this.log('error', 'Error creating article:', error);
      throw error;
    }
  }

  /**
   * Update article
   */
  async updateArticle(id: string, updates: Partial<Article>): Promise<Article> {
    try {
      // Handle legacy category field
      if (updates.category && !updates.categories) {
        updates.categories = [updates.category];
      }
      
      const article = await this.database.updateArticle(id, updates);
      this.log('info', `✅ Updated article: ${article.title}`);
      return article;
    } catch (error) {
      this.log('error', 'Error updating article:', error);
      throw error;
    }
  }

  /**
   * Delete article
   */
  async deleteArticle(id: string): Promise<void> {
    try {
      await this.database.deleteArticle(id);
      this.log('info', `✅ Deleted article: ${id}`);
    } catch (error) {
      this.log('error', 'Error deleting article:', error);
      throw error;
    }
  }

  /**
   * Search articles
   */
  async searchArticles(query: string, limit: number = 10): Promise<Article[]> {
    try {
      return await this.database.searchArticles(query, limit);
    } catch (error) {
      this.log('error', 'Error searching articles:', error);
      throw error;
    }
  }

  // ==================== FEEDBACK ====================

  /**
   * Submit article feedback
   */
  async submitFeedback(feedback: Omit<ArticleFeedback, 'id' | 'createdAt'>): Promise<ArticleFeedback> {
    try {
      const result = await this.database.createFeedback(feedback);
      
      // Update article helpful/notHelpful counts
      if (feedback.helpful) {
        const article = await this.getArticle(feedback.articleId);
        if (article) {
          await this.updateArticle(feedback.articleId, {
            helpful: (article.helpful || 0) + 1
          });
        }
      } else {
        const article = await this.getArticle(feedback.articleId);
        if (article) {
          await this.updateArticle(feedback.articleId, {
            notHelpful: (article.notHelpful || 0) + 1
          });
        }
      }
      
      return result;
    } catch (error) {
      this.log('error', 'Error submitting feedback:', error);
      throw error;
    }
  }

  /**
   * Get article feedback
   */
  async getArticleFeedback(articleId: string): Promise<ArticleFeedback[]> {
    try {
      return await this.database.getArticleFeedback(articleId);
    } catch (error) {
      this.log('error', 'Error fetching article feedback:', error);
      throw error;
    }
  }

  // ==================== VIEWS ====================

  /**
   * Track article view
   */
  async trackArticleView(view: Omit<ArticleView, 'id' | 'createdAt'>): Promise<ArticleView> {
    try {
      const result = await this.database.trackArticleView(view);
      
      // Update article view count
      const article = await this.getArticle(view.articleId);
      if (article) {
        await this.updateArticle(view.articleId, {
          views: (article.views || 0) + 1
        });
      }
      
      return result;
    } catch (error) {
      this.log('error', 'Error tracking article view:', error);
      throw error;
    }
  }

  /**
   * Get article view count
   */
  async getArticleViews(articleId: string): Promise<number> {
    try {
      return await this.database.getArticleViews(articleId);
    } catch (error) {
      this.log('error', 'Error fetching article views:', error);
      throw error;
    }
  }

  // ==================== SETTINGS ====================

  /**
   * Get help center settings
   */
  async getSettings(): Promise<HelpCenterSettings> {
    try {
      return await this.database.getSettings();
    } catch (error) {
      this.log('error', 'Error fetching settings:', error);
      return {};
    }
  }

  /**
   * Update help center settings
   */
  async updateSettings(settings: Partial<HelpCenterSettings>): Promise<HelpCenterSettings> {
    try {
      return await this.database.updateSettings(settings);
    } catch (error) {
      this.log('error', 'Error updating settings:', error);
      throw error;
    }
  }

  /**
   * Internal logging method
   */
  private log(level: 'error' | 'warn' | 'info' | 'debug', ...args: any[]): void {
    const levels: Record<string, number> = {
      none: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4
    };

    const currentLevel = levels[this.logLevel] || 0;
    const messageLevel = levels[level] || 0;

    if (messageLevel <= currentLevel) {
      if (level === 'error') {
        console.error(...args);
      } else if (level === 'warn') {
        console.warn(...args);
      } else if (level === 'info') {
        console.log(...args);
      } else if (level === 'debug') {
        console.debug(...args);
      }
    }
  }
}
