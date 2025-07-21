import React, { useState, useEffect, useCallback } from 'react';

// Functional component with props
export default function UserProfile({ userId, showDetails = true }: { 
  userId: string; 
  showDetails?: boolean; 
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserData(userId);
  }, [userId]);

  const fetchUserData = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${id}`);
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <div className="error">User not found</div>;
  }

  return (
    <div className="user-profile">
      <h1>{user.name}</h1>
      {showDetails && (
        <div className="user-details">
          <p>Email: {user.email}</p>
          <p>Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      )}
    </div>
  );
}

// Arrow function component
export const UserCard: React.FC<{ user: any; onSelect?: (user: any) => void }> = ({ 
  user, 
  onSelect 
}) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(user);
    }
  };

  return (
    <div className="user-card" onClick={handleClick}>
      <div className="user-avatar">
        <img src={user.avatar || '/default-avatar.png'} alt={user.name} />
      </div>
      <div className="user-info">
        <h3>{user.name}</h3>
        <p>{user.email}</p>
      </div>
    </div>
  );
};

// Custom hook
export const useUserData = (userId: string) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const userData = await response.json();
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    user,
    loading,
    error,
    refetch
  };
};

// Component with complex state management
export function UserList({ users, onUserSelect }: {
  users: any[];
  onUserSelect: (user: any) => void;
}) {
  const [filteredUsers, setFilteredUsers] = useState(users);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    filterAndSortUsers(users, term, sortBy, sortOrder);
  };

  const handleSort = (field: 'name' | 'email' | 'date') => {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(field);
    setSortOrder(newOrder);
    filterAndSortUsers(users, searchTerm, field, newOrder);
  };

  const filterAndSortUsers = (
    userList: any[],
    search: string,
    sortField: string,
    order: string
  ) => {
    let filtered = userList;

    if (search) {
      filtered = userList.filter(user =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'date':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          return 0;
      }

      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredUsers(filtered);
  };

  useEffect(() => {
    filterAndSortUsers(users, searchTerm, sortBy, sortOrder);
  }, [users, searchTerm, sortBy, sortOrder]);

  return (
    <div className="user-list">
      <div className="user-list-controls">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <div className="sort-controls">
          <button onClick={() => handleSort('name')}>
            Sort by Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button onClick={() => handleSort('email')}>
            Sort by Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button onClick={() => handleSort('date')}>
            Sort by Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>
      <div className="user-list-items">
        {filteredUsers.map(user => (
          <UserCard
            key={user.id}
            user={user}
            onSelect={onUserSelect}
          />
        ))}
      </div>
    </div>
  );
}