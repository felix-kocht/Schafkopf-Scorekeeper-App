import React from 'react';

export const Testimonials: React.FC = () => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mt-6 shadow-xl border border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-100">Testimonials</h2>
      <blockquote className="italic text-gray-300 border-l-4 border-blue-500 pl-4">
        "Damit kann ja jeder Otto aufschreiben!"
        <footer className="text-gray-400 mt-2">- Elias, 2024</footer>
      </blockquote>
    </div>
  );
};