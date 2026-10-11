import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home, LayoutDashboard } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFoundPage = () => {
  return (
    <div className="py-16 text-center max-w-md mx-auto space-y-6">
      <div className="inline-flex p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
        <FileQuestion className="w-12 h-12 text-emerald-500" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">404 - Page Not Found</h1>
        <p className="text-sm text-slate-400">
          The requested route does not exist or has been relocated.
        </p>
      </div>
      <div className="flex items-center justify-center gap-3 pt-2">
        <Link to="/">
          <Button variant="secondary" size="md">
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
        </Link>
        <Link to="/dashboard">
          <Button variant="primary" size="md">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
