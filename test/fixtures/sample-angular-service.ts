import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = '/api/users';

  constructor(private http: HttpClient) {}

  /**
   * Get all users
   */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  /**
   * Get user by ID
   */
  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new user
   */
  createUser(user: Omit<User, 'id'>): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }

  /**
   * Update existing user
   */
  updateUser(id: number, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user);
  }

  /**
   * Delete user
   */
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

/**
 * Utility function for validation
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper class for user management
 */
export class UserHelper {
  static formatUserName(user: User): string {
    return `${user.name} (${user.email})`;
  }

  static isValidUser(user: Partial<User>): boolean {
    return !!(user.name && user.email && validateEmail(user.email));
  }
}
