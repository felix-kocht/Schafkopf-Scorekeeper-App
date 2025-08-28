import React from 'react';

interface LinkProps {
  href: string;
  children: React.ReactNode;
}

export const Link: React.FC<LinkProps> = ({ href, children }) => {
  return (
    <a
      href={href}
      className="hover:text-gray-200 transition-colors underline underline-offset-4"
    >
      {children}
    </a>
  );
};