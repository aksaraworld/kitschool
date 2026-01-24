/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

/**
 * Article status
 */
export type ArticleStatus = 'draft' | 'published' | 'archived';

/**
 * Help center category
 */
export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order?: number;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string;
}

/**
 * Help center subcategory
 */
export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  order?: number;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Help center article
 */
export interface Article {
  id: string;
  title: string;
  content: string;
  categories: string[]; // Array of category IDs (supports multiple categories)
  category?: string; // Legacy single category support
  subcategory?: string;
  topic?: string;
  status: ArticleStatus;
  isFeatured?: boolean;
  views?: number;
  helpful?: number;
  notHelpful?: number;
  order?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string;
  metadata?: Record<string, any>;
}

/**
 * Article search filters
 */
export interface ArticleFilters {
  category?: string;
  categories?: string[];
  subcategory?: string;
  topic?: string;
  status?: ArticleStatus;
  isFeatured?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Article search result
 */
export interface ArticleSearchResult {
  articles: Article[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Article feedback
 */
export interface ArticleFeedback {
  id?: string;
  articleId: string;
  helpful: boolean;
  comment?: string;
  userId?: string;
  createdAt?: string | Date;
}

/**
 * Article view tracking
 */
export interface ArticleView {
  id?: string;
  articleId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string | Date;
}

/**
 * Help center settings
 */
export interface HelpCenterSettings {
  whatsappNumber?: string;
  email?: string;
  customFields?: Record<string, any>;
}

/**
 * Database adapter interface
 */
export interface HelpCenterDatabaseAdapter {
  // Categories
  getCategories(filters?: { isActive?: boolean }): Promise<Category[]>;
  getCategory(id: string): Promise<Category | null>;
  createCategory(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category>;
  updateCategory(id: string, updates: Partial<Category>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Subcategories
  getSubcategories(categoryId: string): Promise<Subcategory[]>;
  getSubcategory(id: string): Promise<Subcategory | null>;
  createSubcategory(data: Omit<Subcategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subcategory>;
  updateSubcategory(id: string, updates: Partial<Subcategory>): Promise<Subcategory>;
  deleteSubcategory(id: string): Promise<void>;

  // Articles
  getArticles(filters: ArticleFilters): Promise<ArticleSearchResult>;
  getArticle(id: string): Promise<Article | null>;
  createArticle(data: Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'helpful' | 'notHelpful'>): Promise<Article>;
  updateArticle(id: string, updates: Partial<Article>): Promise<Article>;
  deleteArticle(id: string): Promise<void>;
  searchArticles(query: string, limit?: number): Promise<Article[]>;

  // Feedback
  createFeedback(feedback: Omit<ArticleFeedback, 'id' | 'createdAt'>): Promise<ArticleFeedback>;
  getArticleFeedback(articleId: string): Promise<ArticleFeedback[]>;

  // Views
  trackArticleView(view: Omit<ArticleView, 'id' | 'createdAt'>): Promise<ArticleView>;
  getArticleViews(articleId: string): Promise<number>;

  // Settings
  getSettings(): Promise<HelpCenterSettings>;
  updateSettings(settings: Partial<HelpCenterSettings>): Promise<HelpCenterSettings>;
}

/**
 * Help center service configuration
 */
export interface HelpCenterConfig {
  database: HelpCenterDatabaseAdapter;
  options?: {
    defaultTopic?: string;
    logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
  };
}
