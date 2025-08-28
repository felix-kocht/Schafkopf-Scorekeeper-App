import React from 'react';
import { Link } from './Link';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-8 pb-4 text-center text-sm text-gray-400">
      <div className="flex justify-center gap-4">
        <Link href="/imprint">Imprint</Link>
        <Link href="/privacy.html">Privacy Policy</Link>
      </div>
    </footer>
  );
};