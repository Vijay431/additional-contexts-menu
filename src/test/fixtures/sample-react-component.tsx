import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

/**
 * Custom hook for managing user data
 */
export const useUserData = (userId: number) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then((userData) => {
      setUser(userData);
      setLoading(false);
    });
  }, [userId]);

  return { user, loading };
};

/**
 * Fetches user data from API
 */
async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return (await response.json()) as User;
}

/**
 * UserProfile React component
 */
export default function UserProfile({ userId }: { userId: number }) {
  const { user, loading } = useUserData(userId);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="user-profile">
      <h1>{user?.name}</h1>
      <p>{user?.email}</p>
    </div>
  );
}

/**
 * Arrow function component
 */
export const UserCard = ({ user }: { user: User }) => {
  return (
    <div className="user-card">
      <span>{user.name}</span>
    </div>
  );
};
