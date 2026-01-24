# @aksara/help-center

Help center and FAQ system for Aksara Framework with multi-level categorization and search functionality.

## Features

- ✅ Multi-level categorization (category → subcategory → article)
- ✅ Multiple categories per article
- ✅ Topic-based organization
- ✅ Article search functionality
- ✅ Article feedback system
- ✅ View tracking
- ✅ Settings management
- ✅ Legacy category support (backward compatible)

## Installation

```bash
npm install @aksara/help-center
```

## Usage

### Basic Setup

```typescript
import { HelpCenterService } from '@aksara/help-center';
import type { HelpCenterDatabaseAdapter } from '@aksara/help-center';

// Implement database adapter
class MyDatabaseAdapter implements HelpCenterDatabaseAdapter {
  async getCategories(filters) {
    // Fetch categories from database
  }
  
  async getArticles(filters) {
    // Fetch articles from database
  }
  
  // ... implement other methods
}

// Initialize service
const helpCenterService = new HelpCenterService({
  database: new MyDatabaseAdapter(),
  options: {
    defaultTopic: 'general',
    logLevel: 'info'
  }
});
```

### Categories

```typescript
// Get all categories
const categories = await helpCenterService.getCategories(true); // active only

// Create category
const category = await helpCenterService.createCategory({
  name: 'Getting Started',
  description: 'Articles for new users',
  icon: 'book',
  order: 1,
  isActive: true
});

// Update category
await helpCenterService.updateCategory(categoryId, {
  name: 'Getting Started Guide'
});

// Delete category
await helpCenterService.deleteCategory(categoryId);
```

### Subcategories

```typescript
// Get subcategories
const subcategories = await helpCenterService.getSubcategories(categoryId);

// Create subcategory
const subcategory = await helpCenterService.createSubcategory({
  categoryId: 'cat-123',
  name: 'Account Setup',
  description: 'How to set up your account',
  order: 1
});
```

### Articles

```typescript
// Get articles with filters
const result = await helpCenterService.getArticles({
  category: 'cat-123',
  status: 'published',
  page: 1,
  limit: 10
});

// Create article
const article = await helpCenterService.createArticle({
  title: 'How to Reset Password',
  content: 'Step-by-step guide...',
  categories: ['cat-123'], // Multiple categories supported
  subcategory: 'subcat-456',
  topic: 'account',
  status: 'published',
  isFeatured: true
});

// Update article
await helpCenterService.updateArticle(articleId, {
  title: 'Updated Title',
  categories: ['cat-123', 'cat-456'] // Update categories
});

// Search articles
const searchResults = await helpCenterService.searchArticles('password reset', 10);
```

### Feedback

```typescript
// Submit feedback
await helpCenterService.submitFeedback({
  articleId: 'article-123',
  helpful: true,
  comment: 'This was very helpful!',
  userId: 'user-456'
});

// Get article feedback
const feedback = await helpCenterService.getArticleFeedback('article-123');
```

### View Tracking

```typescript
// Track article view
await helpCenterService.trackArticleView({
  articleId: 'article-123',
  userId: 'user-456',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});

// Get view count
const views = await helpCenterService.getArticleViews('article-123');
```

### Settings

```typescript
// Get settings
const settings = await helpCenterService.getSettings();

// Update settings
await helpCenterService.updateSettings({
  whatsappNumber: '+6281234567890',
  email: 'support@example.com'
});
```

## Types

```typescript
interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order?: number;
  isActive: boolean;
}

interface Article {
  id: string;
  title: string;
  content: string;
  categories: string[]; // Array of category IDs
  subcategory?: string;
  topic?: string;
  status: 'draft' | 'published' | 'archived';
  isFeatured?: boolean;
  views?: number;
  helpful?: number;
  notHelpful?: number;
}
```

## Database Adapter

You need to implement the `HelpCenterDatabaseAdapter` interface to provide database access. The adapter should handle:

- CRUD operations for categories, subcategories, and articles
- Search functionality
- Feedback and view tracking
- Settings management

## License

Proprietary - Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
