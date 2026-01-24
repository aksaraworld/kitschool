/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

/**
 * Base user role enum - can be extended by applications
 */
export enum BaseUserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  USER = "user",
}

/**
 * Base user interface - can be extended by applications
 */
export interface BaseUser {
  id?: string;
  _id?: string;
  uid?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  profilePicture?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Permission interface for Role-Based Access Control
 */
export interface Permission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  skip?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Date range filter
 */
export interface DateRange {
  startDate?: string | Date;
  endDate?: string | Date;
}

/**
 * Location coordinates
 */
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

/**
 * File upload result
 */
export interface FileUploadResult {
  url: string;
  filename: string;
  size: number;
  type: string;
}


